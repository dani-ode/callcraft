"""Explicit backend execution, independent of provider inference."""
import asyncio
import ipaddress
import json
import os
import socket
from urllib.parse import urlsplit

import httpx
from jsonschema import Draft202012Validator, SchemaError
from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Literal


class ToolExecutionError(ValueError):
    def __init__(self, code: str, unknown: bool = False):
        self.code = code
        self.unknown = unknown
        super().__init__(code)


class HttpBinding(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    schemaVersion: Literal['1']
    type: Literal['http']
    url: str
    timeoutSeconds: float = Field(gt=0, allow_inf_nan=False)
    maxResponseBytes: int = Field(gt=0)
    requiresIdempotency: bool
    credentialEnv: str
    reconciliationUrl: str | None = None


def check_schema(schema: dict[str, Any]) -> None:
    # Never resolve external references over the network.
    def check(node: Any) -> None:
        if isinstance(node, dict):
            for key, item in node.items():
                if key in ('$ref', '$dynamicRef') and (not isinstance(item, str) or not item.startswith('#')):
                    raise ToolExecutionError('EXTERNAL_SCHEMA_REFERENCE_DENIED')
                check(item)
        elif isinstance(node, list):
            for item in node:
                check(item)
    check(schema)
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError:
        raise ToolExecutionError('TOOL_SCHEMA_INVALID') from None


def validate_schema(schema: dict[str, Any], value: Any) -> None:
    check_schema(schema)
    if not Draft202012Validator(schema).is_valid(value):
        raise ToolExecutionError('TOOL_SCHEMA_VALIDATION_FAILED')


def validate_binding(config: dict[str, Any], request_schema: Any,
                     response_schema: Any, project_id: str) -> None:
    if 'execution' not in config:
        return
    binding = HttpBinding.model_validate(config['execution'])
    url = urlsplit(binding.url)
    if (url.scheme != 'https' or not url.hostname or url.username or url.password
            or url.fragment or url.query or not binding.credentialEnv.strip()):
        raise ToolExecutionError('TOOL_URL_INVALID')
    if not isinstance(request_schema, dict) or not isinstance(response_schema, dict):
        raise ToolExecutionError('TOOL_SCHEMA_REQUIRED')
    check_schema(request_schema)
    check_schema(response_schema)
    try:
        policy = json.loads(os.environ['CALLCRAFT_HTTP_TOOL_ORIGINS'])
        permitted = policy.get(project_id, {}).get(f'{url.scheme}://{url.netloc}')
    except (KeyError, ValueError, AttributeError):
        raise ToolExecutionError('TOOL_CONFIGURATION_INVALID') from None
    if permitted != binding.credentialEnv:
        raise ToolExecutionError('TOOL_ORIGIN_DENIED')
    if binding.reconciliationUrl:
        lookup = urlsplit(binding.reconciliationUrl)
        if (lookup.scheme, lookup.netloc) != (url.scheme, url.netloc) or lookup.query or lookup.fragment or lookup.username:
            raise ToolExecutionError('RECONCILIATION_URL_INVALID')


def backend_status(result: Any) -> str:
    """A received response is not evidence of a successful domain mutation."""
    if isinstance(result, dict) and result.get('status') == 'failed':
        return 'failed'
    return 'succeeded'


async def execute_http_tool(binding_data: dict[str, Any], arguments: dict[str, Any],
                            request_schema: dict[str, Any], response_schema: dict[str, Any],
                            request_id: str, idempotency_key: str | None,
                            execution_token: str | None, project_id: str) -> Any:
    binding = HttpBinding.model_validate(binding_data)
    validate_schema(request_schema, arguments)
    if binding.requiresIdempotency and not idempotency_key:
        raise ToolExecutionError('IDEMPOTENCY_KEY_REQUIRED')
    validate_binding({'execution': binding_data}, request_schema, response_schema, project_id)
    url = urlsplit(binding.url)
    origin = f'{url.scheme}://{url.netloc}'
    try:
        # Map origins to permitted credential names: a spec cannot select another
        # project's credential even when its origin is otherwise allowed.
        policy = json.loads(os.environ['CALLCRAFT_HTTP_TOOL_ORIGINS'])
        if policy.get(project_id, {}).get(origin) != binding.credentialEnv:
            raise ToolExecutionError('TOOL_ORIGIN_DENIED')
        secret = os.environ[binding.credentialEnv]
    except ToolExecutionError:
        raise
    except (KeyError, ValueError, AttributeError):
        raise ToolExecutionError('TOOL_CONFIGURATION_INVALID') from None
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.fragment or url.query or not secret:
        raise ToolExecutionError('TOOL_URL_INVALID')
    try:
        addresses = await asyncio.get_running_loop().getaddrinfo(
            url.hostname, url.port or 443, type=socket.SOCK_STREAM,
        )
    except OSError:
        raise ToolExecutionError('TOOL_DNS_FAILED') from None
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ToolExecutionError('TOOL_ADDRESS_DENIED')
    # Pin the checked address while preserving TLS SNI and HTTP Host.
    ip = addresses[0][4][0]
    pinned = httpx.URL(binding.url).copy_with(host=ip)
    headers = {'Host': url.netloc, 'Authorization': f'Bearer {secret}',
               'X-Request-ID': request_id, 'Accept': 'application/json'}
    if idempotency_key:
        headers['Idempotency-Key'] = idempotency_key
    if execution_token:
        headers['X-Execution-Token'] = execution_token
    try:
        async with httpx.AsyncClient(timeout=binding.timeoutSeconds, trust_env=False,
                                     follow_redirects=False) as client:
            async with client.stream('POST', pinned, headers=headers, json=arguments,
                                     extensions={'sni_hostname': url.hostname}) as response:
                if not 200 <= response.status_code < 300:
                    raise ToolExecutionError('TOOL_BACKEND_REJECTED', unknown=True)
                body = bytearray()
                async for part in response.aiter_bytes():
                    body.extend(part)
                    if len(body) > binding.maxResponseBytes:
                        raise ToolExecutionError('TOOL_RESPONSE_TOO_LARGE', unknown=True)
        result = json.loads(body)
        try:
            validate_schema(response_schema, result)
        except ToolExecutionError:
            raise ToolExecutionError('TOOL_RESPONSE_INVALID', unknown=True) from None
        return result
    except httpx.HTTPError:
        raise ToolExecutionError('TOOL_OUTCOME_UNKNOWN', unknown=True) from None
    except (ValueError, UnicodeError) as error:
        if isinstance(error, ToolExecutionError):
            raise
        raise ToolExecutionError('TOOL_RESPONSE_INVALID', unknown=True) from None

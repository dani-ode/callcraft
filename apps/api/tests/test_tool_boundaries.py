"""Isolated transport/repository doubles; no vendor compatibility claims."""
import asyncio
import json
import socket
from unittest.mock import AsyncMock

import httpx
import pytest

from callcraft_api.services.http_tool import execute_http_tool, ToolExecutionError, validate_schema
from callcraft_api.services.mcp_contract import redact_secrets, enforce_project


@pytest.fixture(scope='session', autouse=True)
def ensure_db_initialized():
    """This module tests boundaries without a database; override parent seed fixture."""
    return None


def test_secret_redaction_preserves_schema():
    result = redact_secrets({'externalApiKey': 'secret', 'spec': {'external_api_key': 'secret'},
                             'requestSchema': {'properties': {'key': {'type': 'string'}}}})
    assert 'secret' not in json.dumps(result)
    assert result['requestSchema']['properties']['key']['type'] == 'string'


@pytest.mark.asyncio
async def test_project_cannot_be_overridden():
    repo = AsyncMock()
    with pytest.raises(ValueError):
        await enforce_project(repo, None, 'user', 'project-a', 'callcraft_list_specs', {'project_id': 'project-b'})
    repo.get_call_spec.assert_not_called()


@pytest.mark.asyncio
async def test_same_user_other_project_spec_is_denied():
    repo = AsyncMock()
    repo.get_call_spec.return_value = {'projectId': 'project-b'}
    with pytest.raises(ValueError):
        await enforce_project(repo, None, 'user', 'project-a', 'callcraft_delete_spec', {'spec_id': 'spec-b'})


def test_schema_rejects_external_refs_and_wrong_types():
    with pytest.raises(ToolExecutionError):
        validate_schema({'$ref': 'https://example.com/schema'}, {})
    with pytest.raises(ToolExecutionError):
        validate_schema({'type': 'integer'}, '42')


def binding():
    return {'schemaVersion': '1', 'type': 'http', 'url': 'https://tools.example.com/save',
            'timeoutSeconds': 2.0, 'maxResponseBytes': 128, 'requiresIdempotency': True,
            'credentialEnv': 'TEST_TOOL_SECRET'}


@pytest.mark.asyncio
async def test_http_tool_returns_backend_result_and_pins_dns(monkeypatch):
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    monkeypatch.setenv('TEST_TOOL_SECRET', 'service-secret')
    monkeypatch.setattr(asyncio.get_running_loop(), 'getaddrinfo', AsyncMock(return_value=[
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34', 443))]))
    seen = []
    def handle(request):
        seen.append(request)
        assert request.url.host == '93.184.216.34'
        assert request.headers['host'] == 'tools.example.com'
        assert request.extensions['sni_hostname'] == 'tools.example.com'
        assert request.headers['idempotency-key'] == 'same-key'
        assert request.headers['x-execution-token'] == 'signed-context'
        assert json.loads(request.content) == {'lemma': 'hello'}
        return httpx.Response(200, json={'id': 'actual-backend-id'})
    client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: client(transport=httpx.MockTransport(handle), **kw))
    result = await execute_http_tool(binding(), {'lemma': 'hello'}, {'type': 'object'},
                                    {'type': 'object', 'required': ['id']}, 'req', 'same-key', 'signed-context', 'project-a')
    assert result == {'id': 'actual-backend-id'}
    assert len(seen) == 1


@pytest.mark.asyncio
async def test_missing_idempotency_fails_before_network():
    with pytest.raises(ToolExecutionError, match='IDEMPOTENCY_KEY_REQUIRED'):
        await execute_http_tool(binding(), {}, {}, {}, 'req', None, None, 'project-a')


@pytest.mark.asyncio
async def test_private_dns_denied(monkeypatch):
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    monkeypatch.setenv('TEST_TOOL_SECRET', 'service-secret')
    monkeypatch.setattr(asyncio.get_running_loop(), 'getaddrinfo', AsyncMock(return_value=[
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 443))]))
    with pytest.raises(ToolExecutionError, match='TOOL_ADDRESS_DENIED'):
        await execute_http_tool(binding(), {}, {}, {}, 'req', 'key', None, 'project-a')


@pytest.mark.asyncio
async def test_mcp_auth_rejects_identifier_only():
    from starlette.requests import Request
    from fastapi import HTTPException
    from callcraft_api.routers.mcp import resolve_mcp_context
    with pytest.raises(HTTPException) as exc:
        await resolve_mcp_context(Request({'type': 'http', 'headers': []}),
            x_user_id='user', x_project_id=None, user_id=None, project_id=None,
            authorization=None, x_call_public_key=None, db=None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_mcp_credential_project_binding(monkeypatch):
    from starlette.requests import Request
    from fastapi import HTTPException
    from callcraft_api.routers import public, mcp
    monkeypatch.setattr(public, 'authenticate_customer_credential', AsyncMock(return_value=(
        {'user_id': 'user', 'project_id': 'project-a'}, None)))
    args = dict(request=Request({'type': 'http', 'headers': []}), x_user_id='user',
                x_project_id=None, user_id=None, project_id=None, authorization='Bearer secret',
                x_call_public_key='public', db=None)
    assert (await mcp.resolve_mcp_context(**args)).project_id == 'project-a'
    args['x_project_id'] = 'project-b'
    with pytest.raises(HTTPException) as exc:
        await mcp.resolve_mcp_context(**args)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_mcp_discovery_and_invalid_arguments():
    from callcraft_api.routers.mcp import handle_jsonrpc_request
    result = await handle_jsonrpc_request({'jsonrpc': '2.0', 'id': 1,
        'method': 'resources/read', 'params': {'uri': 'callcraft://integration'}}, 'user', None, 'project-a')
    guide = json.loads(result['result']['contents'][0]['text'])
    assert 'X-CALL-PUBLIC-KEY' in guide['authentication']['requiredHeaders']
    result = await handle_jsonrpc_request({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call',
        'params': {'name': 'callcraft_get_spec', 'arguments': {}}}, 'user', None, 'project-a')
    assert result['error']['code'] == -32602


@pytest.mark.asyncio
async def test_http_timeout_is_unknown_without_retry(monkeypatch):
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    monkeypatch.setenv('TEST_TOOL_SECRET', 'service-secret')
    monkeypatch.setattr(asyncio.get_running_loop(), 'getaddrinfo', AsyncMock(return_value=[
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34', 443))]))
    calls = []
    def handle(request):
        calls.append(request)
        raise httpx.ReadTimeout('secret upstream details', request=request)
    client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: client(transport=httpx.MockTransport(handle), **kw))
    with pytest.raises(ToolExecutionError) as exc:
        await execute_http_tool(binding(), {}, {}, {}, 'req', 'key', None, 'project-a')
    assert exc.value.unknown
    assert 'secret' not in str(exc.value)
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_public_http_dispatch_never_resolves_provider(monkeypatch):
    from starlette.requests import Request
    from callcraft_api.routers import public
    from callcraft_api.services import durable_http
    monkeypatch.setattr(public, 'authenticate_customer_credential', AsyncMock(return_value=(
        {'user_id': 'user', 'project_id': 'project-a'}, None)))
    monkeypatch.setattr(public.Repository, 'get_call_spec', AsyncMock(return_value={
        'projectId': 'project-a', 'toolsConfig': {'execution': binding()},
        'requestSchema': {'type': 'object'}, 'responseSchema': {'type': 'object'}}))
    execution = AsyncMock(return_value={'status': 'succeeded', 'result': {'saved': True}})
    monkeypatch.setattr(durable_http, 'execute', execution)
    provider = AsyncMock(side_effect=AssertionError('Must not resolve provider'))
    monkeypatch.setattr(public, 'get_adapter', provider)
    response = await public.execute_callcraft(
        public.CallRequestPayload(arguments={'lemma': 'hello'}),
        Request({'type': 'http', 'headers': [(b'idempotency-key', b'key')]}),
        authorization='Bearer secret', x_user_id='user', x_call_spec_id='spec',
        x_call_public_key='public', x_call_provider=None, x_ai_api_key=None,
        x_ai_model_name=None, x_ai_base_url=None, x_call_show_prompt=None, db=AsyncMock())
    assert json.loads(response.body)['result'] == {'saved': True}
    execution.assert_awaited_once()
    provider.assert_not_called()


def test_binding_validation_checks_schema_before_deployment(monkeypatch):
    from callcraft_api.services.http_tool import validate_binding
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    validate_binding({'execution': binding()}, {'type': 'object'}, {'type': 'object'}, 'project-a')
    with pytest.raises(ToolExecutionError, match='TOOL_SCHEMA_INVALID'):
        validate_binding({'execution': binding()}, {'type': 'invalid-type'}, {}, 'project-a')
    with pytest.raises(ToolExecutionError, match='TOOL_ORIGIN_DENIED'):
        validate_binding({'execution': binding()}, {}, {}, 'project-b')


def test_domain_failure_is_not_success():
    from callcraft_api.services.http_tool import backend_status
    assert backend_status({'status': 'failed', 'error': {'code': 'FORBIDDEN'}}) == 'failed'


@pytest.mark.asyncio
async def test_mcp_validate_spec_does_not_invoke_backend(monkeypatch):
    from callcraft_api.routers.mcp import handle_jsonrpc_request
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    result = await handle_jsonrpc_request({'jsonrpc': '2.0', 'id': 1,
        'method': 'tools/call', 'params': {'name': 'callcraft_validate_spec',
        'arguments': {'spec_json': {'toolsConfig': {'execution': binding()},
                                  'requestSchema': {}, 'responseSchema': {}}}}}, 'user', None, 'project-a')
    assert result['result']['structuredContent']['backendInvoked'] is False


@pytest.mark.asyncio
@pytest.mark.parametrize('status,body,limit,code', [
    (302, '{}', 128, 'TOOL_BACKEND_REJECTED'),
    (200, 'not-json', 128, 'TOOL_RESPONSE_INVALID'),
    (200, '{"data":"too large"}', 4, 'TOOL_RESPONSE_TOO_LARGE'),
    (200, '{}', 128, 'TOOL_RESPONSE_INVALID'),
])
async def test_invalid_backend_results_are_unknown(monkeypatch, status, body, limit, code):
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', '{"project-a":{"https://tools.example.com":"TEST_TOOL_SECRET"}}')
    monkeypatch.setenv('TEST_TOOL_SECRET', 'service-secret')
    monkeypatch.setattr(asyncio.get_running_loop(), 'getaddrinfo', AsyncMock(return_value=[
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34', 443))]))
    client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: client(
        transport=httpx.MockTransport(lambda request: httpx.Response(status, content=body)), **kw))
    config = {**binding(), 'maxResponseBytes': limit}
    with pytest.raises(ToolExecutionError) as exc:
        await execute_http_tool(config, {}, {}, {'required': ['id']}, 'req', 'key', None, 'project-a')
    assert exc.value.code == code
    assert exc.value.unknown


@pytest.mark.asyncio
async def test_real_tls_preserves_hostname_and_backend_response(monkeypatch, tmp_path):
    """Real local TLS socket; only address policy and test CA are injected."""
    import datetime
    import ssl
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    from callcraft_api.services import http_tool

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'tools.example.com')])
    now = datetime.datetime.now(datetime.timezone.utc)
    certificate = (x509.CertificateBuilder().subject_name(subject).issuer_name(subject)
        .public_key(key.public_key()).serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=1))
        .not_valid_after(now + datetime.timedelta(hours=1))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName('tools.example.com')]), critical=False)
        .sign(key, hashes.SHA256()))
    cert_path, key_path = tmp_path / 'cert.pem', tmp_path / 'key.pem'
    cert_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    server_ssl = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_ssl.load_cert_chain(cert_path, key_path)
    names = []
    server_ssl.set_servername_callback(lambda sock, name, ctx: names.append(name))
    received = []
    async def backend(reader, writer):
        headers = await reader.readuntil(b'\r\n\r\n')
        received.append(headers)
        body = b'{"status":"succeeded","id":"persisted"}'
        writer.write(b'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: '
                     + str(len(body)).encode() + b'\r\nConnection: close\r\n\r\n' + body)
        await writer.drain()
        writer.close()
        await writer.wait_closed()
    server = await asyncio.start_server(backend, '127.0.0.1', 0, ssl=server_ssl)
    port = server.sockets[0].getsockname()[1]
    origin = f'https://tools.example.com:{port}'
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', json.dumps({'project-a': {origin: 'TEST_TOOL_SECRET'}}))
    monkeypatch.setenv('TEST_TOOL_SECRET', 'test-secret')
    monkeypatch.setattr(asyncio.get_running_loop(), 'getaddrinfo', AsyncMock(return_value=[
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', port))]))
    class TestAddress:
        is_global = True
    monkeypatch.setattr(http_tool.ipaddress, 'ip_address', lambda address: TestAddress())
    client_ssl = ssl.create_default_context(cafile=str(cert_path))
    client = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: client(verify=client_ssl, **kw))
    try:
        result = await execute_http_tool({**binding(), 'url': origin + '/save'}, {}, {}, {},
                                         'req', 'key', None, 'project-a')
        assert result['id'] == 'persisted'
        assert names == ['tools.example.com']
        assert f'Host: tools.example.com:{port}'.lower().encode() in received[0].lower()
    finally:
        server.close()
        await server.wait_closed()

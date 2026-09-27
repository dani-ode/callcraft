"""Secret-safe, project-bound MCP contract helpers."""

from typing import Any


def redact_secrets(value: Any) -> Any:
    """Keep schema property declarations intact; remove credential values."""
    if isinstance(value, list):
        return [redact_secrets(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {}
    for key, item in value.items():
        normalized = key.replace('_', '').lower()
        if normalized in {'externalapikey', 'apikey', 'secretkey', 'authorization',
                          'executiontoken', 'password', 'key'}:
            result[key] = None
        elif key in {'requestSchema', 'responseSchema', 'inputSchema', 'outputSchema'}:
            result[key] = item
        else:
            result[key] = redact_secrets(item)
    return result


async def enforce_project(repository: Any, db: Any, user_id: str,
                          project_id: str | None, name: str,
                          arguments: dict[str, Any]) -> None:
    if not project_id:
        raise ValueError('Kredensial MCP wajib terikat ke project.')
    requested = arguments.get('project_id')
    document = arguments.get('spec_json') or {}
    imported_project = document.get('projectId') or document.get('project_id')
    if any(value and value != project_id for value in (requested, imported_project)):
        raise ValueError('Project tidak sesuai dengan kredensial MCP.')
    spec_id = arguments.get('spec_id') or document.get('id')
    if spec_id and spec_id != 'new':
        spec = await repository.get_call_spec(db, user_id, spec_id)
        if not spec or spec.get('projectId') != project_id:
            raise ValueError('Call Spec tidak ditemukan dalam project kredensial.')


INTEGRATION_GUIDE = {
    'schemaVersion': '1',
    'authentication': {
        'requiredHeaders': ['Authorization', 'X-USER-ID', 'X-CALL-PUBLIC-KEY'],
        'authorizationScheme': 'Bearer',
        'projectScope': 'Credential project; X-PROJECT-ID cannot override it.',
    },
    'transports': {'preferred': '/mcp/v1', 'legacySse': '/mcp/v1/sse'},
    'workflow': ['callcraft_list_specs', 'callcraft_get_spec',
                 'callcraft_create_spec', 'callcraft_export_spec_json'],
    'execution': {
        'endpoint': '/v1/call',
        'routingHeader': 'X-CALL-SPEC-ID',
        'extraction': 'Provider function calling produces structured data, not domain mutations.',
        'http': 'Explicit toolsConfig.execution dispatches validated arguments to a backend.',
        'unknownOutcome': 'Do not retry mutations with a new idempotency key.',
    },
    'secrets': 'Use client environment or secret store; never put credentials in prompts or specs.',
}

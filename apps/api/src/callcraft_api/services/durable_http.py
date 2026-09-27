"""Durable admission without retaining customer payloads or blindly replaying mutations."""
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from callcraft_api.services import execution_journal as journal
from callcraft_api.services.http_tool import execute_http_tool, backend_status, ToolExecutionError, validate_binding, validate_schema


async def execute(session: AsyncSession, spec: dict[str, Any], arguments: dict[str, Any],
                  request_id: str, key: str | None, token: str | None) -> dict[str, Any]:
    if not key:
        raise ToolExecutionError('IDEMPOTENCY_KEY_REQUIRED')
    project = spec['projectId']
    binding = spec['toolsConfig']['execution']
    contract = {'binding': binding, 'requestSchema': spec.get('requestSchema') or {},
                'responseSchema': spec.get('responseSchema') or {}}
    # Invalid input/configuration must not consume an idempotency identity.
    validate_binding({'execution': binding}, contract['requestSchema'], contract['responseSchema'], project)
    validate_schema(contract['requestSchema'], arguments)
    execution_id, created, state = await journal.admit(session, project, spec['id'], key,
                                                      arguments, contract)
    await session.commit()
    if not created:
        return {'executionId': execution_id, 'status': state, 'replayed': True,
                'result': None, 'resultRetained': False,
                'reconciliationRequired': state in {'running', 'reconciliation_required'}}
    try:
        result = await execute_http_tool(binding, arguments, contract['requestSchema'],
            contract['responseSchema'], request_id, key, token, project)
    except ToolExecutionError as error:
        await journal.finish(session, execution_id, project,
            'reconciliation_required' if error.unknown else 'failed', error.code)
        await session.commit()
        raise
    # Cancellation/crash intentionally leaves running: re-admission never dispatches it again.
    state = backend_status(result)
    await journal.finish(session, execution_id, project, state)
    await session.commit()
    return {'executionId': execution_id, 'status': state, 'replayed': False,
            'result': result, 'resultRetained': False, 'reconciliationRequired': False}

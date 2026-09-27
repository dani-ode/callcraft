"""Metadata-only, atomic HTTP tool admission. Caller owns transaction boundaries."""
import hashlib
import hmac
import json
import os
from typing import Any

import ulid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ExecutionConflict(ValueError):
    pass


def fingerprint(value: Any) -> str:
    secret = os.environ.get('CALLCRAFT_EXECUTION_HMAC_KEY', '')
    if not secret.strip():
        raise ExecutionConflict('EXECUTION_JOURNAL_NOT_CONFIGURED')
    encoded = json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()
    return hmac.new(secret.encode(), encoded, hashlib.sha256).hexdigest()


async def admit(session: AsyncSession, project_id: str, spec_id: str,
                key: str, arguments: dict[str, Any], contract: dict[str, Any]) -> tuple[str, bool, str]:
    values = {'id': f'exe_{ulid.new()}', 'project': project_id, 'spec': spec_id,
              'key': fingerprint(key), 'request': fingerprint({'arguments': arguments, 'contract': contract})}
    inserted = (await session.execute(text('''
        INSERT INTO tool_executions
            (id, project_id, spec_id, idempotency_hash, request_hash, status)
        VALUES (:id, :project, :spec, :key, :request, 'running')
        ON CONFLICT (project_id, spec_id, idempotency_hash) DO NOTHING
        RETURNING id
    '''), values)).scalar_one_or_none()
    if inserted:
        return str(inserted), True, 'running'
    existing = (await session.execute(text('''
        SELECT id, request_hash, status FROM tool_executions
        WHERE project_id=:project AND spec_id=:spec AND idempotency_hash=:key
    '''), values)).mappings().one()
    if existing['request_hash'] != values['request']:
        raise ExecutionConflict('IDEMPOTENCY_CONFLICT')
    return str(existing['id']), False, str(existing['status'])


async def finish(session: AsyncSession, execution_id: str, project_id: str,
                 status: str, error_code: str | None = None) -> None:
    if status not in {'succeeded', 'failed', 'reconciliation_required'}:
        raise ExecutionConflict('INVALID_EXECUTION_STATE')
    result = await session.execute(text('''
        UPDATE tool_executions SET status=:status, error_code=:error,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=:id AND project_id=:project AND status='running'
        RETURNING id
    '''), {'status': status, 'error': error_code, 'id': execution_id, 'project': project_id})
    if result.scalar_one_or_none() is None:
        raise ExecutionConflict('EXECUTION_STATE_CONFLICT')


async def reconcile(session: AsyncSession, execution_id: str, project_id: str,
                    spec: dict[str, Any], key: str, token: str | None) -> dict[str, Any]:
    from callcraft_api.services.http_tool import execute_http_tool, ToolExecutionError
    row = (await session.execute(text('''SELECT * FROM tool_executions
        WHERE id=:id AND project_id=:project AND spec_id=:spec AND idempotency_hash=:key'''),
        {'id': execution_id, 'project': project_id, 'spec': spec['id'], 'key': fingerprint(key)})).mappings().one_or_none()
    if not row:
        raise ExecutionConflict('EXECUTION_NOT_FOUND')
    if row['status'] in {'succeeded', 'failed'}:
        await session.commit()
        return {'executionId': execution_id, 'status': row['status'], 'result': None,
                'resultRetained': False, 'reconciliationRequired': False}
    await session.commit()
    binding = dict(spec['toolsConfig']['execution'])
    url = binding.pop('reconciliationUrl', None)
    if not url:
        raise ToolExecutionError('RECONCILIATION_NOT_CONFIGURED')
    binding['url'] = url
    result = await execute_http_tool(binding, {'executionId': execution_id, 'idempotencyKey': key},
        {'type': 'object'}, {'type': 'object', 'required': ['status'], 'properties': {
            'status': {'enum': ['succeeded', 'failed', 'pending', 'unknown']}}},
        execution_id, key, token, project_id)
    state = result['status']
    if state in {'succeeded', 'failed'}:
        updated = await session.execute(text('''UPDATE tool_executions SET status=:status,
            error_code=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=:id AND project_id=:project
            AND status IN ('running', 'reconciliation_required') RETURNING id'''),
            {'status': state, 'id': execution_id, 'project': project_id})
        if updated.scalar_one_or_none() is None:
            actual = (await session.execute(text('SELECT status FROM tool_executions WHERE id=:id AND project_id=:project'),
                {'id': execution_id, 'project': project_id})).scalar_one()
            if actual != state:
                raise ExecutionConflict('RECONCILIATION_STATE_CONFLICT')
        await session.commit()
    return {'executionId': execution_id, 'status': state, 'result': result,
            'reconciliationRequired': state in {'pending', 'unknown'}}


async def claim_reconciliation(session: AsyncSession, limit: int, lease_seconds: int) -> list[dict[str, Any]]:
    rows = (await session.execute(text('''
        WITH candidates AS (
          SELECT id FROM tool_executions
          WHERE status='reconciliation_required'
            AND (lease_until IS NULL OR lease_until < CURRENT_TIMESTAMP)
          ORDER BY updated_at LIMIT :limit FOR UPDATE SKIP LOCKED
        )
        UPDATE tool_executions e SET lease_until=CURRENT_TIMESTAMP + (:lease * INTERVAL '1 second'),
          attempt_count=e.attempt_count+1, updated_at=CURRENT_TIMESTAMP
        FROM candidates c WHERE e.id=c.id
        RETURNING e.id, e.project_id, e.spec_id, e.attempt_count
    '''), {'limit': limit, 'lease': lease_seconds})).mappings().all()
    await session.commit()
    return [dict(row) for row in rows]


async def release_reconciliation_lease(session: AsyncSession, execution_id: str,
                                       project_id: str, status: str,
                                       error_code: str | None = None) -> None:
    if status not in {'reconciliation_required', 'succeeded', 'failed'}:
        raise ExecutionConflict('INVALID_RECONCILIATION_STATE')
    await session.execute(text('''UPDATE tool_executions SET status=:status,
        error_code=:error, lease_until=NULL, updated_at=CURRENT_TIMESTAMP
        WHERE id=:id AND project_id=:project'''),
        {'status': status, 'error': error_code, 'id': execution_id, 'project': project_id})
    await session.commit()


async def reconcile_claim(session: AsyncSession, execution_id: str, project_id: str,
                          spec: dict[str, Any]) -> dict[str, Any]:
    """Worker lookup using execution identity; it never needs the original key."""
    from callcraft_api.services.http_tool import execute_http_tool, ToolExecutionError
    row = (await session.execute(text('''SELECT id, status, attempt_count FROM tool_executions
        WHERE id=:id AND project_id=:project'''), {'id': execution_id, 'project': project_id})).mappings().one_or_none()
    if not row or row['status'] != 'reconciliation_required':
        return {'executionId': execution_id, 'status': row['status'] if row else 'not_found'}
    binding = dict(spec['toolsConfig']['execution'])
    lookup = binding.pop('reconciliationUrl', None)
    if not lookup:
        await release_reconciliation_lease(session, execution_id, project_id, 'reconciliation_required', 'RECONCILIATION_NOT_CONFIGURED')
        return {'executionId': execution_id, 'status': 'reconciliation_required'}
    binding.update({'url': lookup, 'requiresIdempotency': False})
    try:
        result = await execute_http_tool(binding, {'executionId': execution_id},
            {'type': 'object'}, {'type': 'object', 'required': ['status'], 'properties': {
                'status': {'enum': ['succeeded', 'failed', 'pending', 'unknown']}}},
            execution_id, None, None, project_id)
    except ToolExecutionError as error:
        await release_reconciliation_lease(session, execution_id, project_id,
            'reconciliation_required', error.code)
        return {'executionId': execution_id, 'status': 'reconciliation_required'}
    state = result['status']
    await release_reconciliation_lease(session, execution_id, project_id,
        state if state in {'succeeded', 'failed'} else 'reconciliation_required',
        None if state in {'succeeded', 'failed'} else state.upper())
    return {'executionId': execution_id, 'status': state}

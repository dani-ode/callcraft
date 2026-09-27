"""Real PostgreSQL admission/replay; HTTP backend is an explicit test double."""
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import text
from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.services import execution_journal as journal, durable_http


@pytest.mark.asyncio
async def test_concurrent_admission_restart_and_conflict(monkeypatch):
    monkeypatch.setenv('CALLCRAFT_EXECUTION_HMAC_KEY', 'test-only-journal-key')
    async with AsyncSessionLocal() as session:
        sql = (Path(__file__).resolve().parents[3] / 'migrations/0005_tool_executions.sql').read_text()
        for statement in sql.split(';'):
            if statement.strip():
                await session.execute(text(statement))
        spec = (await session.execute(text('SELECT id, project_id FROM call_specs LIMIT 1'))).mappings().one()
        await session.execute(text('DELETE FROM tool_executions'))
        await session.commit()
    async def admit():
        async with AsyncSessionLocal() as session:
            result = await journal.admit(session, spec['project_id'], spec['id'], 'same-key', {'word': 'hello'}, {})
            await session.commit()
            return result
    first, second = await asyncio.gather(admit(), admit())
    assert first[0] == second[0]
    assert sum([first[1], second[1]]) == 1
    assert (await admit())[1:] == (False, 'running')
    async with AsyncSessionLocal() as session:
        with pytest.raises(journal.ExecutionConflict, match='IDEMPOTENCY_CONFLICT'):
            await journal.admit(session, spec['project_id'], spec['id'], 'same-key', {'word': 'different'}, {})
        await session.rollback()
        await journal.finish(session, first[0], spec['project_id'], 'succeeded')
        await session.commit()
    assert (await admit())[2] == 'succeeded'


@pytest.mark.asyncio
async def test_durable_timeout_replay_reconcile_and_owner(monkeypatch):
    from callcraft_api.services import http_tool
    monkeypatch.setenv('CALLCRAFT_EXECUTION_HMAC_KEY', 'test-only-journal-key')
    async with AsyncSessionLocal() as session:
        sql = (Path(__file__).resolve().parents[3] / 'migrations/0005_tool_executions.sql').read_text()
        for statement in sql.split(';'):
            if statement.strip():
                await session.execute(text(statement))
        row = (await session.execute(text('SELECT id, project_id FROM call_specs LIMIT 1'))).mappings().one()
        await session.execute(text('DELETE FROM tool_executions'))
        await session.commit()
    binding = {'schemaVersion': '1', 'type': 'http', 'url': 'https://backend.example/save',
        'reconciliationUrl': 'https://backend.example/status', 'credentialEnv': 'TEST_SERVICE',
        'timeoutSeconds': 1.0, 'maxResponseBytes': 1000, 'requiresIdempotency': True}
    spec = {'id': row['id'], 'projectId': row['project_id'], 'toolsConfig': {'execution': binding},
            'requestSchema': {'type': 'object'}, 'responseSchema': {'type': 'object'}}
    import json
    monkeypatch.setenv('CALLCRAFT_HTTP_TOOL_ORIGINS', json.dumps({row['project_id']: {'https://backend.example': 'TEST_SERVICE'}}))
    dispatch = AsyncMock(side_effect=http_tool.ToolExecutionError('TOOL_OUTCOME_UNKNOWN', unknown=True))
    monkeypatch.setattr(durable_http, 'execute_http_tool', dispatch)
    async with AsyncSessionLocal() as session:
        with pytest.raises(http_tool.ToolExecutionError):
            await durable_http.execute(session, spec, {'word': 'hello'}, 'req', 'timeout-key', None)
    async with AsyncSessionLocal() as session:
        replay = await durable_http.execute(session, spec, {'word': 'hello'}, 'req', 'timeout-key', None)
    assert replay['status'] == 'reconciliation_required'
    assert dispatch.await_count == 1
    lookup = AsyncMock(return_value={'status': 'succeeded'})
    monkeypatch.setattr(http_tool, 'execute_http_tool', lookup)
    async with AsyncSessionLocal() as session:
        with pytest.raises(journal.ExecutionConflict, match='EXECUTION_NOT_FOUND'):
            await journal.reconcile(session, replay['executionId'], 'other-project', spec, 'timeout-key', None)
    lookup.assert_not_called()
    async with AsyncSessionLocal() as session:
        result = await journal.reconcile(session, replay['executionId'], row['project_id'], spec, 'timeout-key', None)
    assert result['status'] == 'succeeded'
    assert lookup.call_args.args[0]['url'] == 'https://backend.example/status'
    async with AsyncSessionLocal() as session:
        terminal = await journal.reconcile(session, replay['executionId'], row['project_id'], spec, 'timeout-key', None)
    assert terminal['status'] == 'succeeded'
    assert lookup.await_count == 1

import pytest
from callcraft_api.services.orchestrator import LoopPolicy, PlanningError, run


@pytest.fixture(scope='session', autouse=True)
def ensure_db_initialized():
    """Planner policy tests are pure and do not require PostgreSQL."""
    return None


class FakePlanner:
    def __init__(self, decisions): self.decisions = iter(decisions); self.history = []
    async def plan(self, context, history):
        self.history.append(history)
        return next(self.decisions)


@pytest.mark.asyncio
async def test_planning_loop_executes_allowlisted_tool_then_finishes():
    planner = FakePlanner([{'kind': 'tool_call', 'name': 'save', 'arguments': {'x': 1}},
                           {'kind': 'final', 'result': {'message': 'saved'}}])
    calls = []
    async def executor(name, arguments):
        calls.append((name, arguments)); return {'status': 'succeeded', 'result': {'id': 'server-id'}}
    result = await run(planner, executor, {}, LoopPolicy(frozenset({'save'}), 3, 1))
    assert result['result']['message'] == 'saved'
    assert calls == [('save', {'x': 1})]
    assert planner.history[1][0]['result'] == {'id': 'server-id'}


@pytest.mark.asyncio
async def test_unknown_tool_result_stops_without_fake_success():
    planner = FakePlanner([{'kind': 'tool_call', 'name': 'save', 'arguments': {}}])
    async def executor(name, arguments): return {'status': 'unknown'}
    result = await run(planner, executor, {}, LoopPolicy(frozenset({'save'}), 3, 1))
    assert result['status'] == 'reconciliation_required'


@pytest.mark.asyncio
async def test_disallowed_tool_and_step_limits_fail():
    planner = FakePlanner([{'kind': 'tool_call', 'name': 'delete', 'arguments': {}}])
    with pytest.raises(PlanningError, match='TOOL_NOT_ALLOWED'):
        await run(planner, lambda n, a: None, {}, LoopPolicy(frozenset({'save'}), 2, 1))

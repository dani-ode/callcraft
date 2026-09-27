"""Bounded tool-planning loop. Provider adapters supply plans; Callcraft owns policy."""
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Protocol


class PlanningError(ValueError):
    pass


class Planner(Protocol):
    async def plan(self, context: dict[str, Any], history: list[dict[str, Any]]) -> dict[str, Any]: ...


ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class LoopPolicy:
    allowed_tools: frozenset[str]
    max_steps: int
    max_tool_calls: int


async def run(planner: Planner, executor: ToolExecutor, context: dict[str, Any],
              policy: LoopPolicy) -> dict[str, Any]:
    if policy.max_steps < 1 or policy.max_tool_calls < 0:
        raise PlanningError('PLANNING_POLICY_INVALID')
    history: list[dict[str, Any]] = []
    calls = 0
    for step in range(policy.max_steps):
        decision = await planner.plan(context, history)
        if not isinstance(decision, dict):
            raise PlanningError('PLANNER_RESPONSE_INVALID')
        if decision.get('kind') == 'final':
            return {'status': 'succeeded', 'steps': step + 1, 'result': decision.get('result')}
        if decision.get('kind') != 'tool_call':
            raise PlanningError('PLANNER_DECISION_INVALID')
        name, arguments = decision.get('name'), decision.get('arguments')
        if not isinstance(name, str) or name not in policy.allowed_tools or not isinstance(arguments, dict):
            raise PlanningError('TOOL_NOT_ALLOWED')
        calls += 1
        if calls > policy.max_tool_calls:
            raise PlanningError('TOOL_CALL_LIMIT_EXCEEDED')
        # The planner sees only this structured result, never credentials/tokens.
        tool_result = await executor(name, arguments)
        if not isinstance(tool_result, dict) or tool_result.get('status') not in {'succeeded', 'failed', 'unknown'}:
            raise PlanningError('TOOL_RESULT_INVALID')
        history.append({'tool': name, 'status': tool_result['status'],
                        'result': tool_result.get('result') if tool_result['status'] != 'unknown' else None})
        if tool_result['status'] == 'unknown':
            return {'status': 'reconciliation_required', 'steps': step + 1,
                    'result': None, 'tool': name}
    raise PlanningError('PLANNING_STEP_LIMIT_EXCEEDED')

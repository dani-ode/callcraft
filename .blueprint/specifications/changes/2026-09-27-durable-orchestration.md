# Durable orchestration and reconciliation

> **Status:** Design Target — implementation in progress
> **Source of truth:** this change specification; code remains authoritative

## Problem and scope

HTTP execution currently has no durable admission record. Concurrent/restarted
requests can invoke a mutation twice. Add metadata-only execution admission and
explicit unknown-outcome handling, then bounded AI planning and UI integration.
HTTP binding UI already exists and needs end-to-end verification.

## Facts and constraints

ADR-0002 forbids persisted prompts, arguments and model/backend output. Durable
records therefore contain identifiers, keyed request fingerprints, state and
timestamps only. Reconciliation must query the owner backend; Callcraft cannot
replay a stored result or resume reasoning from a transcript it does not store.
No credential or execution token is persisted. Business authorization remains
owned by each backend. A network timeout is not proof of failure.

## Contracts

Execution identity is unique per project, spec and caller idempotency key hash.
Same identity/different fingerprint is a conflict. Concurrent requests do not
redispatch. A committed running record survives worker/process failure and is
reported as unresolved until authoritative reconciliation completes. Terminal
states are succeeded/failed; uncertain states require reconciliation.
SQL migration 0005 is additive and must precede execution activation.

## Security and privacy

Project ownership is verified before admission/status/reconciliation. Fingerprints
use a deployment secret HMAC rather than unhashed low-entropy arguments. Metadata
does not permit payload reconstruction or authorize arbitrary tool dispatch.
Backend status lookups must use the same HTTPS origin policy and trusted context
as dispatch. Planning must never choose a URL, credential, owner or context token.

## Plan and acceptance

1. Migration/model and concurrent metadata admission.
2. Wire HTTP invocation and status transitions, including cancellation/crash paths.
3. Define backend status contract and reconciliation endpoint.
4. Add bounded planning with allowlisted project tools and no unknown-outcome retry.
5. Wire UI/MCP and test concurrent replay, conflicts, ownership, restart and limits.

## Validation and rollout

The worker now has lease-based reconciliation (`0006_tool_execution_leases.sql`)
and processes metadata-only due records. A lease uses `FOR UPDATE SKIP LOCKED`,
increments attempts, and clears/requeues the lease without retaining payloads.
The lookup uses the execution ID and the configured same-origin reconciliation
endpoint; it never reconstructs the original request. Provider-specific planner
transport remains intentionally injected through the `Planner` protocol rather
than silently binding arbitrary customer prompts.

Progress: journal admission is wired into `/v1/call` HTTP dispatch. Every HTTP
operation now requires an idempotency key. Replayed requests return metadata with
`result: null`/`resultRetained: false`; they do not redispatch or invent a result.
`CALLCRAFT_EXECUTION_HMAC_KEY` must remain stable; rotation requires an explicit
identity migration strategy. Apply migration 0005 before serving HTTP executions.

Optional binding `reconciliationUrl` must share the dispatch origin. Reconcile
via `/v1/call` with `arguments: {}`, `reconcileExecutionId`, the original key and
fresh trusted context. The backend lookup receives `executionId`/`idempotencyKey`
and returns `status: succeeded|failed|pending|unknown`. No mutation retry occurs.
This is caller-triggered reconciliation, not a background scheduler.

The deployment runner applies only forward migrations `0005+`. Historical
`0001–0004` files remain reference SQL for fresh provisioning and are not replayed
on existing installations because the application bootstrap/seed path owns that
baseline.

Bounded planning is implemented as a provider-neutral policy loop in
`apps/api/src/callcraft_api/services/orchestrator.py`. It permits only an explicit
allowlist, enforces maximum steps/tool calls, returns verified tool results to the
planner, and stops with `reconciliation_required` on unknown outcome. Provider
adapters and MCP spec execution still need an approved planner wiring contract;
the loop is not silently connected to arbitrary customer prompts.

Verification so far: 95 backend tests passed in the full run with isolated PostgreSQL/Redis; one real PostgreSQL test
passed for concurrent admission, restart replay, payload conflict and terminal
state persistence. End-to-end reconciliation, planning and browser tests remain
open; this change is not yet a completed release.

Use isolated PostgreSQL/Redis, backend fixtures and frontend build/browser tests.
Do not run billable providers without explicit budget. Existing extraction behavior
must remain compatible. Deploy additive SQL first; do not drop metadata on rollback.
Completion requires each acceptance above; file presence does not close the gate.

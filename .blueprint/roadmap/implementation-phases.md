# Implementation Phases — Historical Record

> **Status:** Historical context, not a current delivery ledger
> **Source of truth:** [IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md) for current behavior; [open-gaps.md](open-gaps.md) for active work
> **Last reviewed:** 2026-09-06

This record preserves the original delivery sequence. Completion markers in earlier planning material
are not proof of present behavior and must not be used as such. The active source of truth is the
implementation-status ledger and its linked risk register.

## Original delivery sequence

1. **Project scaffolding:** establish the Python API, Next.js dashboard, worker, environment, and
   workspace tooling.
2. **Database and data access:** introduce PostgreSQL tables, SQLAlchemy models, seed data, and
   Redis spec caching.
3. **Execution engine:** add in-memory input handling, provider adapters, tool-schema generation,
   response coercion, and public response envelopes.
4. **Control Plane:** deliver management workflows for users, projects, specs, credentials, provider
   keys, templates, and playground state.
5. **Security and asynchronous operations:** introduce cryptography, SSRF validation, a rate-limiter
   implementation, Redis outbox, and worker process.
6. **Deployment:** add Docker artifacts and deployment configuration.

## Important reconciliation

The original roadmap used checked boxes for desired deliverables. Several describe work that is only
partial or absent today. In particular, do not infer the following from the historical phase list:

| Historical target | Current state | Canonical reference |
| :--- | :--- | :--- |
| Hallucination auto-retry and `partial_success` | Not implemented | [Implementation status](../IMPLEMENTATION-STATUS.md#1-data-plane-public-execution) |
| React Flow visual builder | Not a repository dependency; Monaco/custom components are used | [Implementation status](../IMPLEMENTATION-STATUS.md#6-tooling-and-stack) |
| Enforced rate limit/correlation middleware | Middleware exists but is not attached; inbound correlation headers are ignored | [GAP-005](open-gaps.md), [GAP-009](open-gaps.md) |
| Worker inserts execution logs | Worker drains/logs items but does not persist them | [GAP-006](open-gaps.md) |
| Public route `/v1/call/{user_id}` | Superseded; actual route is `POST /v1/call` | [API endpoints](../specifications/api-endpoints.md#1-public-data-plane) |

## Using this document

- Use it only to understand the original sequencing rationale.
- Create new work through [AI-SPEC.md](../AI-SPEC.md) and a change specification.
- Track active fixes in [open-gaps.md](open-gaps.md), never by re-checking historical boxes.

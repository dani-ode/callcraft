# Open Gaps and Risk Register

> **Status:** Mixed — current implementation gaps and planned remediation
> **Source of truth:** cited code for current state; approved change specifications for remediation
> **Last reviewed:** 2026-09-06

This register turns known implementation drift into explicit, prioritized work. A row is closed only
when its linked change specification meets the Definition of Done in [AI-SPEC.md](../AI-SPEC.md).

## Prioritization

- **P0:** exploitable security/authentication/data-loss issue; stop or contain before normal feature work.
- **P1:** material security, integrity, availability, or customer-contract risk.
- **P2:** operational/product gap with a defined workaround.
- **P3:** quality or future-scale improvement.

## Active register

| ID | Priority | Gap / risk | Current evidence | Required completion evidence |
| :--- | :---: | :--- | :--- | :--- |
| GAP-001 | P0 | Internal management identity trusts caller-controlled `X-USER-ID`; no session/service-client verification. | `apps/api/src/callcraft_api/routers/internal/_deps.py` | Auth design ADR, protected endpoint tests, migration/rollout plan, and no header-only impersonation path. |
| GAP-002 | P0 | CORS permits arbitrary origins while credentials are enabled. | `apps/api/src/callcraft_api/app.py` | Origin allowlist configuration and tests for allowed/rejected origins. |
| GAP-003 | P0 | Remote fetch follows redirects without revalidating the destination, enabling SSRF bypass. | `apps/api/src/callcraft_engine/buffer_handler.py` | Redirect-safe fetch behavior, private-target tests, bounded download tests. |
| GAP-004 | P1 | Remote downloads and public request bodies lack an application-level enforced size ceiling. | `apps/api/src/callcraft_engine/buffer_handler.py`; `apps/api/src/callcraft_api/app.py` | Configurable limits, streaming/bounded reads, rejection tests, operational limits documented. |
| GAP-005 | P1 | Rate-limiter middleware exists but is not attached to the application. | `apps/api/src/callcraft_api/middleware/rate_limiter.py`; `apps/api/src/callcraft_api/app.py` | Middleware registration, keying policy, rejection tests, and Redis-failure behavior. |
| GAP-006 | P1 | Worker discards outbox events; execution logs and usage aggregation are not persisted. | `apps/worker/main.py`; `apps/api/src/callcraft_api/db/models.py` | Idempotent persistence, retry/dead-letter behavior, migration, and end-to-end test. |
| GAP-007 | P1 | Admin mutations have no role enforcement. | `apps/api/src/callcraft_api/routers/internal/users.py` | Authorization policy, enforcement tests for all protected actions, and audit trail. |
| GAP-008 | P2 | Unhandled errors can include internal exception text in client responses. | `apps/api/src/callcraft_api/app.py` | Sanitized production envelope and regression test; internal correlation retained in logs. |
| GAP-009 | P2 | Inbound correlation IDs are ignored; trace IDs are only server-generated. | `apps/api/src/callcraft_api/routers/public.py` | Header policy, validation, propagation, privacy rules, and contract tests. |
| GAP-010 | P3 | Header `X-CALL-PROVIDER` is accepted but unused. | `apps/api/src/callcraft_api/routers/public.py` | Remove/deprecate it or implement an explicit validated selection contract. |

## Register workflow

1. Create `specifications/changes/GAP-<NNN>-<slug>.md` from the change template before remediation.
2. Link an ADR if remediation changes a durable boundary or protocol.
3. Update the row's evidence after implementation and attach validation results in the change spec.
4. Move closed risks to a dated **Resolved** section; do not delete history.

## Resolved

No entries have been formally closed under this protocol.

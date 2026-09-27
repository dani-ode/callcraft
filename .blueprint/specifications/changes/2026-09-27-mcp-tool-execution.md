# Project-scoped MCP and backend tool execution

> **Status:** Mixed — local regression/integration verified; online deployment pending
> **Source of truth:** `apps/api/src/callcraft_api/routers/mcp.py`, `routers/public.py`
> **Last reviewed:** 2026-09-27

## Problem and outcome

Callcraft currently uses provider function calling for structured extraction
(`routers/public.py:815`, ADR-0003). This does not execute customer domain APIs.
MCP authenticates a user identifier rather than a secret (`routers/mcp.py:67`),
does not consistently constrain operations to its selected project, and exports
`externalApiKey`. IDE clients also lack machine-readable integration guidance.

## Scope

Implement authenticated, project-bound MCP management, input validation, sanitized
results/errors, discovery resources, and a standalone remote stdio bridge. Add an
explicit HTTP execution mode to the existing header-routed `/v1/call` contract.
Existing extraction specs retain their behavior. This slice does not introduce an
autonomous multi-step planning loop or claim exactly-once delivery across networks.

## Facts and assumptions

- `toolsConfig` is versioned JSON already persisted by spec repositories; no new
  SQL column is required for an additive, explicit execution binding.
- Customer credentials are verified by `Repository.verify_api_credential` and
  contain a project ID. MCP will use the same secret/public-key pair.
- Project backends own business authorization, signed execution context validation,
  and durable idempotency. Callcraft forwards trusted context outside AI prompts.
- The user requested local Callcraft changes; deployment to the online server is
  performed by the user. Local tests are not evidence of online deployment.

## Contracts and compatibility

- MCP requires `Authorization: Bearer ...`, `X-USER-ID`, and `X-CALL-PUBLIC-KEY`.
  `X-PROJECT-ID` may only equal the credential project. Identifier-only auth is
  intentionally removed; existing clients must supply their credential pair.
- MCP retains existing snake_case tool arguments for compatibility. New discovery
  and execution data uses camelCase. Invalid arguments return protocol invalid
  params; tool execution failures return `isError: true` and safe structured data.
- HTTP tools use explicit `toolsConfig.execution` version `1`, type `http`, fixed
  HTTPS URL, timeout, response limit, and idempotency requirement. Configuration
  contains no literal credential. Deployment controls allowed origins and secrets.
- `/v1/call` with an HTTP spec validates `arguments` against `requestSchema`, sends
  those arguments to the configured endpoint, and validates the backend response
  against `responseSchema`. It never calls an LLM to fabricate a backend result.
- An optional execution token and idempotency key are forwarded as headers, never
  included in provider input, export, or logs. Unknown outcomes are explicit and
  never automatically retried. Backends must persist replay protection.

## Security and privacy

| Threat | Mitigation / verification |
|---|---|
| Identity impersonation | Require verified secret/public key; reject ID-only requests |
| Cross-project management | Enforce credential project on reads, writes, imports and listings |
| Credential disclosure | Redact secret fields before MCP serialization; sanitize failures |
| SSRF / DNS rebinding | Deployment origin allowlist, public IP validation and pinned connection; no redirects/proxy inheritance |
| Prompt-selected URL/auth | Binding comes from stored spec; secrets from server configuration |
| Duplicate mutations | Mandatory forwarded idempotency key for mutation bindings; no retries |
| Oversized/invalid output | Bound response bytes and validate JSON Schema |

No customer payload persistence is added. Tests use isolated doubles and local
fixtures; no billable provider probes are required.

## Implementation plan

1. Add reusable contract validation, secret-safe MCP output and project checks.
2. Replace MCP identity-only authentication; bind legacy SSE session ownership.
3. Add discovery resources, contract inspection/validation and remote stdio bridge.
4. Add explicit HTTP binding validation/execution and route dispatch.
5. Test boundary, tenancy, protocol, dispatch, and failure cases; reconcile docs.

## Acceptance criteria

- ID-only MCP access fails; valid project credentials succeed.
- A credential cannot read/write/import specs outside its project.
- MCP outputs and failures never expose stored provider secrets.
- IDE clients can discover capabilities and validate a spec without inference.
- HTTP spec execution returns actual validated backend data, makes no AI call,
  rejects disallowed origins and malformed contracts, and does not retry timeouts.
- Existing extraction mode remains backward compatible.

## Validation plan

Run focused pytest tests for MCP and HTTP execution with isolated dependencies;
run existing engine unit tests and Python compile checks. Database-dependent
tests require an isolated PostgreSQL URL because existing suite setup creates
tables/seeds. Record exact commands and results here after execution.

## Rollout and rollback

Local evidence on 2026-09-27: **88 tests passed** with PostgreSQL 16/Redis 7
in disposable containers, including real MCP SDK and local TLS socket tests.
Commands: `DATABASE_URL=<isolated asyncpg URL> REDIS_URL=<isolated Redis URL>
.venv/bin/python -m pytest -q --tb=short --show-capture=no`, `git diff --check`,
and `uv lock --check` all passed. Two upstream Starlette/AnyIO deprecation warnings
remain. No online mutation or billable provider execution was performed.
Repository create/update paths now validate HTTP bindings before commit; extraction
contracts retain their existing validation behavior. Local stdio verifies credentials
and revocation, and discovery includes capabilities, call contracts and dry validation.

Deploy backend code and explicit HTTP egress/secret configuration first; update
IDE MCP credentials simultaneously. Create HTTP-bound specs only after deployment.
Existing extraction specs require no migration. Roll back code only after disabling
HTTP-bound specs; old servers cannot safely interpret their execution mode. Never
restore identifier-only authentication as a compatibility workaround.

### Deployment checklist

1. Install updated dependencies (`requirements.txt` for runtime;
   `requirements-dev.txt` or the dev extra for SDK tests).
2. API Compose already loads `.env`; configure `CALLCRAFT_HTTP_TOOL_ORIGINS`
   and referenced backend service secrets there or in deployment secret storage.
   `{}` disables HTTP bindings until an operator explicitly configures a project.
3. Rebuild/restart the API. No new SQL columns are required by this patch.
4. Update IDE MCP header configuration with the project public/secret key pair.
5. Check SDK discovery/list/get against the deployed endpoint, then exercise a
   staging backend binding with a durable idempotency key before production use.
6. Existing extraction specs retain their execution path. HTTP specs must be
   disabled before reverting to a server version without HTTP mode support.

# Implementation Status — Blueprint vs. Code

> **Status:** As-Built
> **Source of truth:** the code paths cited in each row
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

This is the reconciliation table between what the blueprint describes and what
`apps/api`, `apps/worker`, and `apps/web` actually do. When a blueprint document and this table
disagree, this table is newer; when this table and the code disagree, the code wins and this table
is a bug.

Markers follow [CONVENTIONS.md](CONVENTIONS.md#2-status-markers): ✅ implemented · 🟡 partial ·
📐 planned · ⚠️ gap that matters.

---

## 1. Data Plane (public execution)

| Capability | Status | Where | Notes |
| :--- | :---: | :--- | :--- |
| `POST /v1/call` execution endpoint | ✅ | `apps/api/src/callcraft_api/routers/public.py:75` | Single endpoint; routing inputs are headers, not a path parameter — [ADR-0006](decisions/0006-header-routed-call-endpoint.md) |
| Credential auth (public key + Argon2id secret) | ✅ | `public.py:129`, `db/repository.py:34` | Both `Authorization: Bearer` and `X-CALL-PUBLIC-KEY` are required |
| Per-credential IP allowlist | ✅ | `public.py:144`, `callcraft_engine/ip_utils.py:23` | Supports plain IPs and CIDR |
| Project isolation between credential and spec | ✅ | `public.py:188` | Rejects with `PROJECT_MISMATCH` |
| Spec resolution, Redis cache → PostgreSQL fallback | ✅ | `public.py:171`, `services/redis_cache.py:44` | Key `callcraft:spec:{userId}:{slug}`, TTL 3600s |
| Base64 and URL input decoded into RAM only | ✅ | `callcraft_engine/buffer_handler.py:14` | Nothing is written to disk |
| Multi-image / multi-document payloads | ✅ | `public.py:259` | All string fields that look like a data URL/URL/long Base64 are collected |
| Response schema → AI tool declaration | ✅ | `callcraft_engine/tool_generator.py:5` | Injects an extra `_ai_commentary` string parameter |
| Type coercion and schema validation | ✅ | `callcraft_engine/coercion.py:9` | Failure → HTTP 422 `SCHEMA_COERCION_FAILED` |
| camelCase success/error envelopes | ✅ | `utils/envelope.py:151`, `utils/envelope.py:91` | [envelope-contract.md](specifications/envelope-contract.md) |
| Cost estimation from model pricing rows | ✅ | `public.py:512` | Uses `ai_models.cost_per_1k_*` |
| Outbox push after execution | ✅ | `public.py:517`, `services/redis_cache.py:81` | Success path only |
| Request body size limit (10 MB) | ⚠️ | not enforced in app code | Only the documented Apache `LimitRequestBody` would enforce it; `buffer_handler.py` applies no size cap to downloads either |
| Rate limiting (60 req/min) | ⚠️ | `middleware/rate_limiter.py:15` | Middleware exists and is unit-tested, **but is never added to the app** in `app.py` — no rate limiting is active |
| Hallucination auto-retry (1–2 attempts) | ⚠️ | — | Not implemented anywhere; a malformed tool result fails immediately |
| `partial_success` / HTTP 207 degradation | 📐 | — | No code path produces it |
| `traceId` propagation from client headers | 🟡 | `public.py:91` | `traceId` is generated server-side; inbound `X-Request-ID` / `X-Correlation-ID` are ignored |
| Async / webhook execution mode | 📐 | — | `meta.executionMode` is hardcoded to `"sync"` |
| `X-CALL-PROVIDER` header | ⚠️ | `public.py:83` | Accepted and then unused; provider is derived from the model row |

---

## 2. Control Plane and internal API

| Capability | Status | Where | Notes |
| :--- | :---: | :--- | :--- |
| Specs CRUD, duplicate, publication, playground state | ✅ | `routers/internal/specs.py` | 10 endpoints |
| Projects CRUD | ✅ | `routers/internal/projects.py` | Undocumented in the original blueprint |
| API credential management + IP allowlist | ✅ | `routers/internal/keys.py:35` | |
| User AI provider keys (save / list / verify) | ✅ | `routers/internal/keys.py:127` | AES-256-GCM at rest |
| Template marketplace: list, publish, fork, like, comment | ✅ | `routers/internal/templates.py` | Undocumented in the original blueprint |
| AI model & provider catalog reads | ✅ | `routers/internal/models.py:38` | Dashboard reads models from the DB, not a hardcoded list |
| Platform settings (`app_init`) | ✅ | `routers/internal/app.py:52` | Branding, registration policy, default prompts |
| User profile, close account, admin status/verify actions | ✅ | `routers/internal/users.py` | Admin actions live under `/internal/v1/admin/users/*` |
| Registration, email verification, login | ✅ | `routers/auth.py:63` | SMTP mail via `services/email.py:36` |
| Service-client authentication on `/internal/v1/*` | ⚠️ | `routers/internal/_deps.py:12` | `get_current_user_id` trusts the `X-USER-ID` header; `service_clients` rows are seeded but never verified. `/internal/v1/status` echoes the service headers without checking them |
| Session tokens / JWT after login | ⚠️ | `routers/auth.py:258` | Login returns a user object; the browser stores the user id in `localStorage` and sends it as `X-USER-ID` |
| Next.js server-side proxy for management calls | ⚠️ | `apps/web/src/lib/api/core.ts:1` | The browser calls the Python API directly via `NEXT_PUBLIC_API_URL`; there is no server-side credential boundary as the blueprint described |
| Admin plane `/admin/v1/*` with RBAC | 📐 | `routers/admin.py:6` | Only `GET /admin/v1/status`, unauthenticated, returning a static payload |
| RBAC enforcement from `roles`/`permissions` | 📐 | `db/init_db.py:175` | Roles and permissions are seeded; no endpoint checks them |

---

## 3. Worker and audit logging

| Capability | Status | Where | Notes |
| :--- | :---: | :--- | :--- |
| Redis outbox queue | ✅ | `services/redis_cache.py:81` | With an in-memory fallback when Redis is down |
| Worker process drains the queue | 🟡 | `apps/worker/main.py:14` | Polls every 2s in batches of 50 |
| Batch insert into `api_requests` | ⚠️ | — | The worker **logs** each item and discards it; nothing is ever written to `api_requests`, so the dashboard's execution-log view has no data source |
| Daily aggregation into `user_usage_daily` | 📐 | — | Table exists, no writer |
| `traceId` / `executionMode` persisted | ⚠️ | `db/models.py:333` | Both columns are in the blueprint DDL but absent from the `ApiRequest` model |

---

## 4. Security

| Capability | Status | Where | Notes |
| :--- | :---: | :--- | :--- |
| AES-256-GCM for stored provider keys | ✅ | `callcraft_engine/crypto.py:15` | |
| Argon2id for customer secret keys | ✅ | `callcraft_engine/crypto.py:54` | |
| SSRF validation of remote URLs | 🟡 | `callcraft_engine/ssrf.py:11` | Blocks loopback/private/link-local/multicast before the request |
| Redirects disabled on remote fetches | ⚠️ | `buffer_handler.py:28` | `follow_redirects=True`, and the redirect target is not re-validated — the SSRF check can be bypassed by a redirect to a private address |
| Download size ceiling | ⚠️ | `buffer_handler.py:28` | The full response body is read with no cap |
| Error envelopes free of internal detail | 🟡 | `app.py:100` | The catch-all handler interpolates `str(exc)` into `error.message`, which can surface internal exception text |
| CORS restricted to known origins | ⚠️ | `app.py:44` | `allow_origin_regex=r"https?://.*"` accepts every origin, with `allow_credentials=True` |
| Base64 redaction in echoed prompts | ✅ | `public.py:13` | Applies when `X-CALL-SHOW-PROMPT: true` |

---

## 5. Data model

| Item | Blueprint said | Code has |
| :--- | :--- | :--- |
| Table count | 16 | 21 (19 entities + `role_permissions`, `user_roles`) — `migrations/0001_initial_schema.sql` |
| Tables absent from the old blueprint | — | `projects`, `template_likes`, `template_comments`, `app_init`, `playground_states` |
| Primary key format | `VARCHAR(26)` bare ULID | `VARCHAR(50)` prefixed ULID (`usr_01HZX…`) |
| Schema application | migration scripts | `Base.metadata.create_all` at startup (`app.py:22`), with `migrations/*.sql` kept in parallel — no migration runner |
| `api_requests` columns | includes `trace_id`, `execution_mode` | neither column exists on the model |

Details: [specifications/database-schema.md](specifications/database-schema.md).

---

## 6. Tooling and stack

| Blueprint said | Reality |
| :--- | :--- |
| React Flow for the visual schema builder | Not a dependency of `apps/web`; the builder uses Monaco plus custom React components |
| Playwright E2E, k6 load tests, testcontainers | None present |
| Pytest unit and integration tests | 32 test functions across 9 files in `apps/api/tests` |
| `bun test` frontend tests | Script exists; no test files |
| Models: Gemini 1.5, GPT-4o, Claude 3.5 | Seeded catalog is a different generation — `gemini-3.6-flash`, `gpt-5.6-luna`, `claude-opus-5`, `mistral-medium-3.5`, `deepseek-v4-pro`, `ocr-4.1` (`db/init_db.py:124`) |
| Adapters: Gemini, OpenAI, Anthropic, DeepSeek | Five adapters — Gemini, OpenAI, Anthropic, Mistral, DeepSeek. The seeded `ocr-engine` provider has no adapter and silently falls back to Gemini (`adapters/factory.py:22`) |

---

## How to re-verify this document

Run these and compare against the tables above:

```bash
# Every registered route
grep -rn '@router\.\(get\|post\|put\|patch\|delete\)' apps/api/src --include=*.py

# Every table
grep -n '__tablename__' apps/api/src/callcraft_api/db/models.py

# Middleware actually attached to the app
grep -n 'add_middleware' apps/api/src/callcraft_api/app.py

# Test inventory
grep -c 'def test_' apps/api/tests/*.py
```

Then update the affected rows, the **Last verified** line here and in the documents you touched, and
[roadmap/open-gaps.md](roadmap/open-gaps.md).

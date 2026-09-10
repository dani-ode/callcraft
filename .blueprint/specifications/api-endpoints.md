# Specification — API Endpoints Reference

> **Status:** As-Built
> **Source of truth:** `apps/api/src/callcraft_api/routers/`
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

Every route the FastAPI application registers, grouped by plane. Response bodies follow
[envelope-contract.md](envelope-contract.md) on the Data Plane, and plain camelCase JSON objects on
the internal surface.

Regenerate this list with:

```bash
grep -rn '@router\.\(get\|post\|put\|patch\|delete\)' apps/api/src --include=*.py
```

---

## 1. Public Data Plane

### `POST /v1/call`

The only public execution route. Routing inputs are headers
([ADR-0006](../decisions/0006-header-routed-call-endpoint.md)).

**Headers**

| Header | Required | Meaning |
| :--- | :---: | :--- |
| `Authorization: Bearer <call_sk_…>` | ✔ | Credential secret; verified against the Argon2id hash |
| `X-CALL-PUBLIC-KEY` | ✔ | Credential public key (`pk_…`) |
| `X-USER-ID` | ✔ | Owner of the spec (`usr_…`) |
| `X-CALL-SPEC-ID` | ✔ | Spec id **or** slug |
| `X-AI-MODEL-NAME` | — | Overrides the spec's model, e.g. `gemini-3.6-flash` |
| `X-AI-API-KEY` | — | Caller-supplied provider key; used only when the spec has `useExternalApiKey` |
| `X-CALL-SHOW-PROMPT` | — | `true` echoes the assembled prompt in `executionTrace.promptBuilder` |
| `X-CALL-PROVIDER` | — | ⚠️ Accepted and ignored; provider comes from the model row |
| `Content-Type: application/json` | ✔ | |

**Body** — declared fields, plus any extra fields (`extra: "allow"`):

| Field | Type | Notes |
| :--- | :--- | :--- |
| `image` / `file` / `pdf` | string | Base64 data URL, raw Base64, or an `http(s)` URL |
| `prompt` | string | Additional instruction; honoured only if the spec allows it |
| `negativePrompt` | string | Constraint text |
| `variables` | object | Interpolated into `{{placeholders}}` in the spec's prompts |
| `data` | object | Alternative container; its values are scanned for inputs too |
| *any other field* | any | String values that look like a URL, data URL, or long Base64 are treated as additional documents; the rest are passed to the model as request input parameters |

Multiple documents in one call are supported — every qualifying value is decoded and sent as part of
a multi-image payload (`public.py:259`).

**Example**

```bash
curl -X POST https://api.example.com/v1/call \
  -H "Authorization: Bearer call_sk_live_…" \
  -H "X-CALL-PUBLIC-KEY: pk_live_…" \
  -H "X-USER-ID: usr_01HZX89ABCDEF1234567890XY" \
  -H "X-CALL-SPEC-ID: ktp-reader" \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,/9j/4AAQ…","prompt":"Gunakan format tanggal YYYY-MM-DD"}'
```

**Status codes**

| Code | Meaning |
| :---: | :--- |
| 200 | `meta.status = "completed"` |
| 400 | Missing header, unknown model, or no provider key |
| 401 | Missing or invalid credential |
| 403 | IP not allowlisted, or credential/spec project mismatch |
| 404 | Spec not found for that user |
| 422 | Body failed validation, or model output failed coercion |
| 502 | AI provider adapter failed |
| 500 | Unhandled server error |

Full code catalog: [envelope-contract.md](envelope-contract.md#7-error-code-catalog).

### `GET /v1/projects`

Lists active projects accessible by caller's API credentials. Used by workflow tools (n8n, Langflow) to populate project dropdowns.

**Headers:** `Authorization: Bearer <call_sk_...>`, `X-CALL-PUBLIC-KEY: <pk_...>`, `X-USER-ID: <usr_...>`.
**Response:** Standard camelCase envelope with `data` containing the list of projects (including `specsCount`, `keysCount`).

### `GET /v1/specs`

Lists Call Specs or retrieves single spec details. Accepts query parameters:
- `projectId` / `project_id`: Filters specs by project ID (enforces Project Isolation if key is project-scoped).
- `specId` / `spec_id` / `slug`: Fetches single spec details directly with extracted `promptVariables` and `requiredInputs`.

**Headers:** `Authorization: Bearer <call_sk_...>`, `X-CALL-PUBLIC-KEY: <pk_...>`, `X-USER-ID: <usr_...>`.

### `GET /v1/specs/{spec_id_or_slug}`

Path-parameter equivalent to fetch complete spec details, input schemas, required media inputs, and dynamic `{{placeholders}}`.

### `GET /health`

Liveness probe. `apps/api/src/callcraft_api/routers/health.py:7`.

---

## 2. Model Context Protocol (MCP) Server Plane — `/mcp/v1/*`

Supports AI agent integrations (DeepSeek Harness, Antigravity IDE, Cursor, Claude Desktop, Langflow, n8n) with dual-transport negotiation ([ADR-0008](../decisions/0008-mcp-server-and-multi-transport.md)).

**Authentication:** Inbound identity is resolved via header `X-USER-ID: <id>`, query param `?user_id=<id>`, or header `Authorization: Bearer <id>`. Optional scoping via `X-PROJECT-ID: <id>` or `?project_id=<id>`.

### Transports & Endpoints

| Method | Path | Transport | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/mcp/v1` (also `/mcp/v1/stream`, `/mcp/v1/rpc`) | **Streamable HTTP** | Primary MCP endpoint. Negotiates `Accept: text/event-stream` (SSE event streaming) or `application/json` (direct response). Handles single and batched JSON-RPC 2.0 payloads |
| `GET` | `/mcp/v1` (also `/mcp/v1/stream`) | **Streamable HTTP** | Capability discovery probe (`protocolVersion: 2024-11-05`), or opens a persistent SSE event stream if `Accept: text/event-stream` is requested |
| `DELETE` | `/mcp/v1` (also `/mcp/v1/stream`) | **Streamable HTTP** | Gracefully closes active streamable sessions |
| `GET` | `/mcp/v1/sse` | **Legacy SSE** | Handshake endpoint for Antigravity & Cursor; yields an `endpoint` event pointing to `/mcp/v1/messages` |
| `POST` | `/mcp/v1/messages?session_id=` | **Legacy SSE** | Inbound JSON-RPC message ingress for established SSE sessions |
| `CLI` | `python -m callcraft_api.mcp_stdio` | **Local Stdio** | Full duplex JSON-RPC 2.0 via `stdin`/`stdout` for Claude Desktop & local CLI agents |

### Catalog of 13 CallCraft MCP Tools

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `callcraft_list_projects` | — | List all projects in user's workspace |
| `callcraft_list_specs` | `project_id?` | List CallCraft endpoint specs with optional project filter |
| `callcraft_get_spec` | `spec_id` | Get complete spec by ID or slug |
| `callcraft_get_spec_section` | `spec_id`, `section` | Get granular section (`request-schema`, `response-schema`, `prompts`, `tools-config`, `config`) |
| `callcraft_create_spec` | `name`, `slug?`, `project_id`, `positive_prompt?`, `schemas?` | Create a new CallCraft spec |
| `callcraft_update_spec` | `spec_id`, `name?`, `description?`, `positive_prompt?`, `schemas?` | Update an existing spec |
| `callcraft_update_spec_section` | `spec_id`, `section`, `content` | Granularly update a specific section |
| `callcraft_delete_spec` | `spec_id` | Delete a spec by ID or slug |
| `callcraft_export_spec_json` | `spec_id` | Export complete spec as a standardized JSON document |
| `callcraft_import_spec_json` | `project_id?`, `spec_json` | Import full JSON spec to create or replace in DB |
| `callcraft_list_user_ai_providers` | `project_id?` | List configured AI provider keys, masked keys, and custom base URLs |
| `callcraft_list_ai_models` | — | List available AI models with capability flags and pricing |
| `callcraft_verify_ai_provider` | `provider_id`, `api_key`, `base_url?` | Live-verify connectivity of AI provider or custom gateway |

---

## 3. Internal management API — `/internal/v1/*`

Consumed by the dashboard. **Identity comes from the `X-USER-ID` header alone**
(`routers/internal/_deps.py:12`): the header is checked to correspond to an existing user, and
nothing more. There is no service-client verification and no session token — see
[../architecture/security-and-auth.md](../architecture/security-and-auth.md) and
[../roadmap/open-gaps.md](../roadmap/open-gaps.md).

Most collection endpoints accept `?project_id=` to scope results to one project.

### Authentication (`routers/auth.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/internal/v1/auth/register` | Create an account; sends a verification mail when required by settings |
| `POST` | `/internal/v1/auth/verify-email` | Consume a verification token / OTP |
| `POST` | `/internal/v1/auth/resend-verification` | Re-send the activation mail |
| `POST` | `/internal/v1/auth/login` | Verify credentials; returns the user object (no token is issued) |
| `POST` | `/internal/v1/auth/forgot-password` | Request password reset token / email dispatch |
| `POST` | `/internal/v1/auth/reset-password` | Submit reset token and apply new password |

### Platform (`routers/internal/app.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/status` | Channel probe; echoes the service-client headers without verifying them |
| `GET` | `/internal/v1/app-init` | Branding, landing-page toggle, registration policy, default prompts |
| `PUT` | `/internal/v1/app-init` | Update those settings |

### Projects (`routers/internal/projects.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/projects` | List the user's projects |
| `POST` | `/internal/v1/projects` | Create (201); slug derived from the name |
| `GET` | `/internal/v1/projects/{project_id}` | Fetch one |
| `PUT` | `/internal/v1/projects/{project_id}` | Update |
| `DELETE` | `/internal/v1/projects/{project_id}` | Delete (204); cascades to specs, credentials, provider keys |

### Call specs (`routers/internal/specs.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/specs?project_id=` | List specs |
| `POST` | `/internal/v1/specs` | Create; slug collisions get a ULID suffix |
| `GET` | `/internal/v1/specs/{spec_id}` | Fetch spec with its active version |
| `PUT` | `/internal/v1/specs/{spec_id}` | Update; writes a new version row |
| `DELETE` | `/internal/v1/specs/{spec_id}` | Delete |
| `POST` | `/internal/v1/specs/{spec_id}/duplicate?project_id=` | Copy into the same or another project |
| `GET` | `/internal/v1/specs/{spec_id}/sections/{section}` | Fetch granular section (`prompts`, `schemas`, `config`) |
| `PUT` | `/internal/v1/specs/{spec_id}/sections/{section}` | Granularly update section without full payload |
| `GET` | `/internal/v1/specs/{spec_id}/export` | Export standardized spec JSON document |
| `POST` | `/internal/v1/specs/{spec_id}/import` | Import full JSON spec to replace spec configuration |
| `GET` | `/internal/v1/specs/{spec_id}/publication` | Marketplace publication state |
| `POST` | `/internal/v1/specs/{spec_id}/publication` | Publish / unpublish to the marketplace |
| `GET` | `/internal/v1/specs/{spec_id}/playground-state` | Saved playground form state |
| `POST` | `/internal/v1/specs/{spec_id}/playground-state` | Persist playground form state (includes `baseUrl`) |

### Credentials and provider keys (`routers/internal/keys.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/keys?project_id=` | List API credentials (no secrets) |
| `POST` | `/internal/v1/keys` | Create a pair; **the secret is returned once**, as `secretKey` |
| `PUT` | `/internal/v1/keys/{key_id}/whitelist` | Replace the IP allowlist; entries validated as IP or CIDR |
| `DELETE` | `/internal/v1/keys/{key_id}` | Revoke |
| `GET` | `/internal/v1/logs?project_id=&limit=50` | Execution log rows from `api_requests` — ⚠️ nothing writes that table today |
| `POST` | `/internal/v1/providers/save-key` | Store a user's AI provider key, AES-256-GCM encrypted |
| `GET` | `/internal/v1/providers/keys?project_id=` | List stored provider keys, masked |
| `GET` | `/internal/v1/providers/list` | Providers registered on the platform |
| `POST` | `/internal/v1/providers/verify-key` | Live-check a provider key against the vendor |

### Templates / marketplace (`routers/internal/templates.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/templates?category=&search=&sort=` | Browse published templates |
| `POST` | `/internal/v1/templates/publish` | Publish a spec as a template |
| `GET` | `/internal/v1/templates/{template_id}` | Template detail |
| `POST` | `/internal/v1/templates/{template_id}/fork?project_id=` | Fork into the caller's account as a new spec |
| `POST` | `/internal/v1/templates/{template_id}/like` | Toggle like |
| `GET` | `/internal/v1/templates/{template_id}/comments` | List reviews |
| `POST` | `/internal/v1/templates/{template_id}/comments` | Add a review with a rating |
| `DELETE` | `/internal/v1/templates/comments/{comment_id}` | Delete own review |

### Users (`routers/internal/users.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/users/me` | Caller's profile |
| `GET` | `/internal/v1/users/{target_user_id}/profile` | Public profile of another user |
| `PUT` | `/internal/v1/users/profile` | Update own profile |
| `POST` | `/internal/v1/users/me/close-account` | Close the account |
| `PUT` | `/internal/v1/admin/users/{target_user_id}/status` | ⚠️ Set account status — no role check |
| `PUT` | `/internal/v1/admin/users/{target_user_id}/verify` | ⚠️ Force-verify an account — no role check |

### AI catalog (`routers/internal/models.py`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/internal/v1/models` | Active models with capability flags and pricing |
| `GET` | `/internal/v1/providers` | Active providers |

---

## 4. Admin plane — `/admin/v1/*`

| Method | Path | Status |
| :--- | :--- | :--- |
| `GET` | `/admin/v1/status` | ✅ Returns a static health payload — unauthenticated, and its `active_models` list is hardcoded rather than read from the database (`routers/admin.py:6`) |

📐 The model management, prompt management, and user-suspension endpoints described in the original
blueprint do not exist. Their nearest working equivalents are the `/internal/v1/models` reads and the
`/internal/v1/admin/users/*` mutations listed above, neither of which enforces a role.

---

## 5. What is not here

📐 Designed in the original blueprint, absent from the code: `/internal/v1/auth/verify-service`,
`/internal/v1/call-specs` (the surface is `/internal/v1/specs`), `/internal/v1/api-credentials`
(it is `/internal/v1/keys`), `/internal/v1/analytics/usage` (partially covered by
`/internal/v1/logs`), and the whole `/admin/v1/models`, `/admin/v1/users/{id}/suspend` family.

# MCP and HTTP tool integration

> **Status:** Mixed — local implementation; online deployment pending
> **Source of truth:** `routers/mcp.py`, `services/http_tool.py`, `integrations/mcp_remote.py`
> **Last verified against code:** 2026-09-27 (uncommitted working tree)

## IDE connection

Use Streamable HTTP at the deployed `/mcp/v1` endpoint. Configure these headers
in the IDE's secret storage: `Authorization: Bearer <secret>`, `X-USER-ID`,
`X-CALL-PUBLIC-KEY`. The credential must belong to the intended project.
Identifier-only authentication no longer works. `X-PROJECT-ID` cannot override
the credential's project. Existing SSE clients must send authentication headers
on both the connection and subsequent message POSTs.

For stdio-only clients run `python /absolute/path/integrations/mcp_remote.py` with
`httpx` installed. Supply `CALLCRAFT_MCP_URL` (HTTPS `/mcp/v1`, not `/sse`),
`CALLCRAFT_AUTH` (raw secret without Bearer prefix), `CALLCRAFT_PUBLIC_KEY`,
`CALLCRAFT_USER_ID`, and `CALLCRAFT_MCP_TIMEOUT_SECONDS` through the environment.
This bridge accesses the online server and needs no local Callcraft database.
Prefer this bridge over the database-connected `mcp_stdio.py` launcher. The local
launcher now requires credentials and checks revocation before every operation.

The AI can start with `callcraft_get_integration_guide` or read the MCP resource
`callcraft://integration`, then list/get/create/update/export project specs.
Tool arguments retain their existing snake_case naming for client compatibility.
Additional read-only tools: `callcraft_get_capabilities`,
`callcraft_get_call_contract`, and `callcraft_validate_spec` (no inference/backend call).
Returned contract data uses camelCase. Tool failures use MCP `isError` and a
correlated sanitized error rather than exposing exception text.

## HTTP execution mode

Existing extraction specs continue through the provider. For a backend action,
add this explicit binding under the spec's `toolsConfig`:

```json
{
  "execution": {
    "schemaVersion": "1",
    "type": "http",
    "url": "https://backend.example.com/internal/tools/save",
    "timeoutSeconds": 15.0,
    "maxResponseBytes": 65536,
    "requiresIdempotency": true,
    "credentialEnv": "PROJECT_BACKEND_SERVICE_TOKEN"
  }
}
```

The values above are illustrative deployment choices. Set `requestSchema` to the
exact argument contract and `responseSchema` to the exact backend response.
The server operator must configure `CALLCRAFT_HTTP_TOOL_ORIGINS` as a JSON mapping
of **project ID → HTTPS origin → permitted credential environment variable** and
inject that environment secret. No origin is allowed implicitly. DNS must resolve
only to public addresses; connections pin the validated IP with original TLS SNI.
Redirects and proxy environment inheritance are disabled.

Invoke `POST /v1/call` with normal API credentials, `X-CALL-SPEC-ID`,
`Idempotency-Key`, optional `X-Execution-Token`, and body
`{"arguments": {"yourField": "yourValue"}}`.
Callcraft forwards the arguments as the backend JSON body, authenticates with the
configured Bearer service secret, and forwards context/idempotency headers.
No model is invoked in this explicit mode. The backend must verify context,
ownership and durable idempotency; a timeout is not proof of rollback.

Success returns `schemaVersion`, `requestId`, `executionMode: "http"`,
`status: "succeeded"`, and the validated backend JSON as `result`.
An explicit backend `status: "failed"` is propagated as top-level failure.
Applications must still interpret other domain states within their declared schema.
Transport/invalid-response failures expose `outcomeUnknown`; no automatic retry
occurs. No customer arguments or results are persisted by this adapter.

## Verification and remaining scope

Full local suite: **88 passed**, using isolated PostgreSQL 16 and Redis 7.
Boundary module: **20 passed**. MCP integration uses the real Python MCP SDK
against ASGI HTTP and database-backed credentials. A real local TLS server verifies
SNI/Host preservation and backend response handling; test CA and address-policy
injection are test-only. Production public-IP rejection remains enabled.
These tests exercise redaction, project denial, credential enforcement, MCP
discovery/input errors, HTTP result handling, DNS pinning/private-IP rejection,
idempotency admission and unknown timeout/no retry. They do not establish deployed
backend compatibility or billable provider behavior. See the change specification
for exact verification commands and rollout steps.

The bounded planner, durable journal and worker lease reconciliation are implemented.
Provider-specific planner adapters are intentionally not enabled automatically:
the application must supply a typed `Planner` and an explicit tool allowlist.
No arbitrary prompt is promoted into a tool loop.
Existing MCP integration fixtures now use real project credentials. Manage bindings via spec JSON/MCP.

## Dashboard integration

The spec builder's Tools tab now provides an extraction/HTTP mode selector and
HTTP URL, credential-reference, timeout, response-limit and idempotency fields.
The backend validates deployment policy when saving. Playground selects a dedicated
HTTP execution form for HTTP specs; arguments, credentials, context token and results
are held in component memory rather than persisted by this form.

The `/mcp` page provides authenticated connection templates, a capabilities probe,
project context, remote stdio instructions and skill/discovery guidance. Its probe
does not invoke inference or backend actions. It requires the updated API deployment.

Frontend verification: `bunx tsc --noEmit` and `bun run build` passed (27 pages).
`bun test` found no frontend tests; browser E2E and deployed CORS/configuration
verification have not been performed. Build success is not browser integration evidence.
Deploy this server update before creating HTTP specs online; old servers must not
receive HTTP-bound specs because they do not recognize the execution mode.

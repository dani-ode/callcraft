# Specification — Response Envelope Contract

> **Status:** As-Built
> **Source of truth:** `apps/api/src/callcraft_api/utils/envelope.py`
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

Every Data Plane response — success or failure, from a route handler or from a framework-level
exception — is an envelope with the same four top-level blocks. Keys are **camelCase**
([ADR-0004](../decisions/0004-camelcase-json-wire-format.md)).

```text
{
  "meta":           always present — who/what/when/status
  "data":           present on success
  "error":          present on failure
  "executionTrace": always present — timing and steps
  "metrics":        present on success — tokens and cost
}
```

---

## 1. `meta`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `requestId` | string | `req_<ULID>`, generated per request (`public.py:90`) |
| `traceId` | string | `trc_<12 chars>`; **success envelopes only** — the error builder omits it |
| `timestamp` | string | ISO 8601 UTC |
| `status` | string | `"completed"` or `"failed"`. `"partial_success"` is designed but not produced |
| `apiVersion` | string | `"v1.0"` |
| `executionMode` | string | `"sync"` — success envelopes only; async modes are not implemented |

## 2. `data` (success)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `primaryResult.type` | string | `"structured_json"` |
| `primaryResult.content` | object | The coerced result, shaped by the spec's response schema |
| `humanReadableMessage` | string | The model's `_ai_commentary`, or a generated fallback sentence |

Internal keys (`_ai_commentary`, `_executed_tools`) are stripped from `content` before it is returned.

## 3. `error` (failure)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `code` | string | Stable uppercase symbol — see the catalog below |
| `message` | string | Human-readable, in Indonesian |
| `details` | array | `{field, issue}` items; `[]` when there is nothing to itemize |
| `actionableStep` | string | What the caller should do next; never empty |

## 4. `executionTrace`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `totalDurationMs` | integer | Server-measured wall time |
| `steps` | array | **Always an array**, `[]` when empty. Items: `{stepId, agent, actionType, toolName, status, durationMs}` |
| `promptBuilder` | string | Success envelopes only. The assembled prompt when `X-CALL-SHOW-PROMPT: true`, otherwise `""`. Base64 payloads are redacted (`public.py:13`) |
| `warnings` | array | Currently always `[]` |

## 5. `metrics` (success)

| Field | Type |
| :--- | :--- |
| `usage.promptTokens` | integer |
| `usage.completionTokens` | integer |
| `usage.totalTokens` | integer |
| `estimatedCostUsd` | number — `tokens ÷ 1000 × ai_models.cost_per_1k_*`, rounded to 6 dp |

---

## 6. Examples

### Success — `200 OK`

```json
{
  "meta": {
    "requestId": "req_01JB8Z6Q4R7X2M0N5K3P9T1V4C",
    "traceId": "trc_01JB8Z6Q4R7",
    "timestamp": "2026-08-31T09:14:22.481293+00:00",
    "status": "completed",
    "apiVersion": "v1.0",
    "executionMode": "sync"
  },
  "data": {
    "primaryResult": {
      "type": "structured_json",
      "content": {
        "nik": "3271041508950001",
        "fullName": "BUDI SANTOSO",
        "birth": { "place": "BOGOR", "date": "1995-08-15" }
      }
    },
    "humanReadableMessage": "Dokumen KTP terbaca jelas, seluruh field berhasil diekstrak."
  },
  "executionTrace": {
    "totalDurationMs": 1240,
    "steps": [
      {
        "stepId": "step_1",
        "agent": "vision_parser",
        "actionType": "tool_call",
        "toolName": "extract_ktp_reader",
        "status": "success",
        "durationMs": 1240
      }
    ],
    "promptBuilder": "",
    "warnings": []
  },
  "metrics": {
    "usage": { "promptTokens": 850, "completionTokens": 120, "totalTokens": 970 },
    "estimatedCostUsd": 0.0001
  }
}
```

### Failure — `401 Unauthorized`

```json
{
  "meta": {
    "requestId": "req_01JB8Z7A2C9D4E6F8G0H2J4K6L",
    "timestamp": "2026-08-31T09:15:03.117884+00:00",
    "status": "failed",
    "apiVersion": "v1.0"
  },
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Kunci API (Public Key / Secret Key) tidak valid, tidak cocok, atau telah dicabut",
    "details": [],
    "actionableStep": "Gunakan pasangan Public Key dan Secret Key aktif dari akun Anda."
  },
  "executionTrace": { "totalDurationMs": 4, "steps": [], "warnings": [] }
}
```

Note the asymmetry: error envelopes carry no `traceId`, `executionMode`, `metrics`, or
`promptBuilder`. Clients must treat those as optional.

---

## 7. Error code catalog

Codes raised explicitly by handlers:

| Code | HTTP | Raised when | Where |
| :--- | :---: | :--- | :--- |
| `MISSING_USER_ID` | 400 | `X-USER-ID` absent or blank | `public.py:96` |
| `UNAUTHORIZED_MISSING_TOKEN` | 401 | No `Authorization: Bearer` header | `public.py:111` |
| `MISSING_PUBLIC_KEY` | 400 | `X-CALL-PUBLIC-KEY` absent | `public.py:121` |
| `INVALID_API_KEY` | 401 | Key pair not found, mismatched, or revoked | `public.py:136` |
| `IP_NOT_WHITELISTED` | 403 | Client IP outside the credential's allowlist | `public.py:151` |
| `MISSING_SPEC_ID` | 400 | `X-CALL-SPEC-ID` absent | `public.py:164` |
| `SPEC_NOT_FOUND` | 404 | No spec with that id/slug for the user | `public.py:178` |
| `PROJECT_MISMATCH` | 403 | Credential's project ≠ spec's project | `public.py:195` |
| `MISSING_MODEL_NAME` | 400 | No model in header or spec | `public.py:214` |
| `UNSUPPORTED_AI_MODEL` | 400 | Model identifier not in `ai_models` | `public.py:225` |
| `MISSING_PROVIDER_API_KEY` | 400 | No provider key from header, user store, or spec | `public.py:247` |
| `<PROVIDER>_EXECUTION_FAILED` | 502 | Adapter raised — e.g. `GEMINI_EXECUTION_FAILED` | `public.py:484` |
| `SCHEMA_COERCION_FAILED` | 422 | Model output could not be coerced to the response schema | `public.py:498` |
| `INVALID_REQUEST_PAYLOAD` | 422 | Pydantic rejected the request body | `app.py:78` |
| `INVALID_CREDENTIALS` / `EMAIL_NOT_VERIFIED` / `ACCOUNT_SUSPENDED` | 401/403 | Dashboard login failures | `routers/auth.py:258` |

Codes produced by inference when a handler raises `HTTPException` without one
(`envelope.py:12`) — the message is substring-matched, so prefer passing an explicit code:

`FORBIDDEN_ACCESS` · `RESOURCE_NOT_FOUND` · `BAD_REQUEST` · `SSRF_SECURITY_VIOLATION` ·
`INVALID_INPUT_STREAM` · `RATE_LIMIT_EXCEEDED` · `AI_CONNECTION_FAILED` ·
`AI_PROVIDER_EXECUTION_FAILED` · `SERVICE_UNAVAILABLE` · `INTERNAL_SERVER_ERROR`

⚠️ `RATE_LIMIT_EXCEEDED` is unreachable in practice: the rate-limit middleware is not attached to the
app, and when attached it returns a bare `{"detail": …}` rather than an envelope
(`middleware/rate_limiter.py:52`). See [../roadmap/open-gaps.md](../roadmap/open-gaps.md).

---

## 8. Client integration rules

1. **Branch on `error.code`**, never on `message` — messages are prose and are localized.
2. **Show `actionableStep`** to whoever can act on it; it is written for that purpose.
3. **Treat `steps` as always present**, possibly empty — never null-check it away.
4. **Retry only** `502`, `503`, and `429`, with exponential backoff. `4xx` codes other than `429`
   are caller errors and will fail identically on retry.
5. **Log `requestId`** on every call; it is the only handle support has to correlate a client report
   with server logs.

---

## 9. Designed but not implemented

📐 The following appear in the original design and in [system-overview.md](../architecture/system-overview.md)
but no code path produces them today:

- `meta.status = "partial_success"` and HTTP `207`, for multi-tool workflows where a secondary tool
  fails after the primary extraction succeeds.
- `meta.executionMode = "async_webhook"`.
- `AI_HALLUCINATION_DETECTED`, which presumes the auto-retry loop that has not been built.
- Client-supplied `X-Request-ID` / `X-Correlation-ID` propagation — both identifiers are generated
  server-side and inbound values are ignored.

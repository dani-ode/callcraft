# ADR-0007 — Errors carry a code, details, and an actionable step

> **Status:** Accepted
> **Date:** 2026-08 (reconstructed from `qna-7.md`)

## Context

Callers integrate against an execution engine with many distinct failure causes: a bad key, a
non-whitelisted IP, a corrupt Base64 string, a private-IP URL, an unsupported model, a provider
outage, a schema the model could not satisfy. A bare `{"detail": "..."}` forces callers to string-match
prose to decide whether to fix their payload, rotate a key, or retry.

## Decision

Every failure — including framework-level ones — is rendered as an error envelope containing:

- `error.code` — a stable uppercase symbol (`INVALID_API_KEY`, `IP_NOT_WHITELISTED`,
  `SPEC_NOT_FOUND`, `SCHEMA_COERCION_FAILED`, `RATE_LIMIT_EXCEEDED`, …)
- `error.message` — a human-readable explanation, in Indonesian, safe to show an end user
- `error.details[]` — itemized `{field, issue}` entries
- `error.actionableStep` — the concrete next move for the caller

The code and the actionable step are never optional: when a handler does not supply them, they are
inferred from the HTTP status and message (`infer_error_code`, `infer_actionable_step`). FastAPI
`HTTPException`s, Pydantic validation failures, and unhandled exceptions all pass through the same
builder, so no route can return a bare `detail` payload.

## Consequences

- Clients branch on `error.code` and surface `actionableStep` directly in their own UI.
- Codes become part of the public contract; renaming one is a breaking change.
- Inference is heuristic — it matches substrings of the message — so handlers should pass an explicit
  code rather than rely on it.
- The catch-all handler currently interpolates the raw exception text into `error.message`, which is
  helpful in development and a leak in production (see
  [../roadmap/open-gaps.md](../roadmap/open-gaps.md)).

## Implementation

- Builders and inference: `apps/api/src/callcraft_api/utils/envelope.py:12`, `:91`
- Global handlers: `apps/api/src/callcraft_api/app.py:51`, `:78`, `:99`
- Code catalog: [../specifications/envelope-contract.md](../specifications/envelope-contract.md)

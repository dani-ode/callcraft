# ADR-0004 — camelCase for all JSON on the wire

> **Status:** Accepted
> **Date:** 2026-08

## Context

Python and PostgreSQL are `snake_case`; TypeScript and the browser are `camelCase`. Without one rule
the boundary becomes a mix of both, and every consumer writes defensive lookups for two spellings of
the same field — which is exactly what happened before the rule was fixed
(`envelope.py:151` still reads both spellings of token counts and step fields for that reason).

## Decision

Every JSON key crossing an HTTP boundary is **camelCase**: Data Plane envelopes, `/internal/v1/*`
responses, and Control Plane payloads. Python identifiers, database columns, and environment
variables stay in their native casing. Conversion happens once, at the serialization boundary
(repository serializers and envelope builders).

The rule is also recorded for tooling in `.agents/rules/case.md`.

## Consequences

- Frontend types map to responses without a translation layer.
- Request *payload* fields are the ragged edge: handlers still accept `negative_prompt` alongside
  `negativePrompt`, and internal routers accept `snake_case` query parameters (`project_id`,
  `user_id`). Inbound tolerance is deliberate; outbound output is camelCase only.
- Blueprint examples written before this decision show `snake_case` envelopes and are stale wherever
  they conflict with
  [../specifications/envelope-contract.md](../specifications/envelope-contract.md).

## Implementation

- Envelope builders: `apps/api/src/callcraft_api/utils/envelope.py:91`, `:151`
- Repository serializers: `apps/api/src/callcraft_api/db/repository.py:265`, `:875`

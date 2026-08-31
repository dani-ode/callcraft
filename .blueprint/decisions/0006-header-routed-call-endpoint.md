# ADR-0006 — One header-routed public endpoint, `POST /v1/call`

> **Status:** Accepted — supersedes the `POST /v1/call/{user_id}` design
> **Date:** 2026-08 (commit `07f05c8`)

## Context

The original design put the spec owner in the path: `POST /v1/call/{user_id}`. That shape has three
problems. The tenant identifier is baked into every client URL, so it leaks into referrers, proxy
access logs, and copy-pasted snippets. Adding further routing inputs (spec, credential, model,
provider) means either a longer path or a mix of path and header conventions. And path-templated
routes fragment metrics and rate-limit buckets per tenant.

## Decision

A single route, `POST /v1/call`. All routing and authentication inputs are headers:

| Header | Required | Meaning |
| :--- | :---: | :--- |
| `Authorization: Bearer <call_sk_…>` | yes | Credential secret |
| `X-CALL-PUBLIC-KEY` | yes | Credential public key |
| `X-USER-ID` | yes | Spec owner |
| `X-CALL-SPEC-ID` | yes | Spec id or slug |
| `X-AI-MODEL-NAME` | no | Overrides the spec's preferred model |
| `X-AI-API-KEY` | no | Caller-supplied provider key, when the spec allows it |
| `X-CALL-SHOW-PROMPT` | no | Echo the assembled prompt back in `executionTrace.promptBuilder` |
| `X-CALL-PROVIDER` | no | Accepted; currently unused — provider is derived from the model row |

Missing required headers fail fast with a specific code (`MISSING_USER_ID`, `MISSING_PUBLIC_KEY`,
`MISSING_SPEC_ID`) rather than a generic 404.

## Consequences

- Tenant and spec identifiers stay out of URLs, logs, and referrers.
- One route to instrument, cache, and rate-limit.
- Requiring both halves of the key pair means a leaked secret alone is not sufficient to execute.
- Header-heavy calls are harder to try from a browser address bar, and header stripping by
  intermediaries becomes a support class.
- Documents, samples, and client snippets referencing `/v1/call/{user_id}` are obsolete.

## Implementation

- Route: `apps/api/src/callcraft_api/routers/public.py:75`
- Credential verification: `apps/api/src/callcraft_api/db/repository.py:34`
- Reference: [../specifications/api-endpoints.md](../specifications/api-endpoints.md)

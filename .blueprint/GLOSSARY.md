# Glossary

> **Status:** As-Built
> **Source of truth:** this document
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

Shared vocabulary for Callcraft. Terms are used with exactly these meanings across the blueprint,
the code, and the dashboard UI.

---

### Additional Prompt
Free-text instruction supplied by the caller at execution time (`prompt` in the request body), merged
into the final prompt only when the spec sets `allowAdditionalPrompt`. See
[api-spec-engine.md](specifications/api-spec-engine.md#6-prompt-assembly).

### AI Provider
An upstream model vendor: `gemini`, `openai`, `anthropic`, `mistral`, `deepseek`, `ocr-engine`.
Rows live in `ai_providers`; each has one adapter class in
`apps/api/src/callcraft_engine/adapters/`.

### API Credential
A customer key pair for the Data Plane: a public key (`pk_...`, sent as `X-CALL-PUBLIC-KEY`) and a
secret key (`call_sk_...`, sent as `Authorization: Bearer`). Only the Argon2id hash of the secret is
stored, in `api_credentials`.

### Call Spec
The central user-authored artifact: a named, versioned definition of a request schema, a response
schema, prompts, tool configuration, and model preference. Executed by `POST /v1/call` via the
`X-CALL-SPEC-ID` header. Table: `call_specs`; versions in `call_spec_versions`.

### Control Plane
The dashboard: Next.js 14 App Router served by Bun, in `apps/web`. Manages specs, keys, projects,
templates, and settings. See
[architecture/control-plane-web.md](architecture/control-plane-web.md).

### Data Plane
The public execution path: `POST /v1/call` on the Python FastAPI service, in
`apps/api/src/callcraft_api/routers/public.py`. Carries customer traffic and nothing else.

### Envelope
The standard JSON response shape for the Data Plane: `meta`, `data` or `error`, `executionTrace`,
and `metrics`. Built in `apps/api/src/callcraft_api/utils/envelope.py`. Contract:
[specifications/envelope-contract.md](specifications/envelope-contract.md).

### Execution Trace
The `executionTrace` block of an envelope: total duration, an always-present `steps` array, warnings,
and (when `X-CALL-SHOW-PROMPT: true`) the assembled `promptBuilder` text.

### External API Key mode
Per-spec flag (`useExternalApiKey`) allowing the caller to supply the AI provider key at request time
via `X-AI-API-KEY`, instead of using the user's stored encrypted key.

### Internal API
`/internal/v1/*` — the management surface the dashboard calls. Currently identified by the
`X-USER-ID` header only; see [architecture/security-and-auth.md](architecture/security-and-auth.md).

### Negative Prompt
Spec-level constraint text describing what the model must not do, appended as its own labelled block
in the assembled prompt.

### Outbox
A Redis list (`callcraft:outbox:api_requests`) that the Data Plane pushes execution metadata onto
after each call, drained by the worker. See
[architecture/worker-and-outbox.md](architecture/worker-and-outbox.md).

### Playground
Dashboard page that executes a spec against the real Data Plane using a chosen credential. Per-user,
per-spec form state persists in `playground_states`.

### Positive Prompt
The spec's primary instruction text — what to extract and how. Stored on the spec version; the field
was formerly named `extraction_prompt` and both names are still read.

### Prefixed ULID
The project's identifier format: `<prefix>_<26-char ULID>`, e.g. `spc_01HZX...`. See
[ADR-0005](decisions/0005-prefixed-ulid-identifiers.md).

### Project
A user-owned grouping of specs, credentials, and provider keys. Enforced at execution: a credential
bound to one project cannot execute a spec belonging to another (`PROJECT_MISMATCH`).

### Request Schema
The caller-facing input contract of a spec — which fields the client may send. Stored as JSON on the
spec version and rendered by the dashboard; it is not used to reject unknown request fields at
runtime.

### Response Schema
The output contract of a spec. Translated into an AI tool/function declaration
(`generate_ai_tool_schema`) and used again to validate and coerce the model's answer
(`validate_and_coerce`).

### Service Client
A row in `service_clients` intended to authenticate the Next.js server to the Python API. Seeded and
modelled, but not enforced by any endpoint today — see
[open-gaps.md](roadmap/open-gaps.md).

### Spec Version
An immutable snapshot of a spec's schemas, prompts, and flags, numbered per spec. `call_specs.active_version_number`
selects the live one.

### Template
A shareable, publishable spec definition in the marketplace: official platform templates plus
user-published forks, with likes and comments. Tables: `templates`, `template_likes`,
`template_comments`.

### Tool Calling
The mechanism used to force structured output: the response schema becomes a function declaration
that the model must fill in, rather than free text parsed after the fact. See
[ADR-0003](decisions/0003-tool-calling-for-structured-output.md).

### Type Coercion
Post-processing that repairs tolerable model type errors (`"123"` → `123`, loose dates → ISO) and
rejects the rest with `SCHEMA_COERCION_FAILED`. Implemented in
`apps/api/src/callcraft_engine/coercion.py`.

### Zero Data Retention (ZDR)
The rule that document bytes, prompts, and extracted content are never persisted — only execution
metadata is. See [ADR-0002](decisions/0002-stateless-zero-data-retention.md).

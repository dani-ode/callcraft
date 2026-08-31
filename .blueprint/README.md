# Callcraft — Architecture Blueprint

> **Status:** Mixed — each document declares its own
> **Source of truth:** the code, always; see [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

**Callcraft** is a dynamic multimodal AI execution engine. Users design an API specification — a
dynamic request schema, a structured response schema, prompts, and a model preference — and
Callcraft executes it against an AI vision/LLM provider, returning JSON that conforms to the schema
they defined.

This folder holds the architecture and specification set. It is not a copy of the code; it explains
the shape of the system, the decisions behind that shape, and where the two currently diverge.

---

## Start here

| If you want to… | Read |
| :--- | :--- |
| Understand the system in 10 minutes | [architecture/system-overview.md](architecture/system-overview.md) |
| Know what is actually built vs. designed | **[IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)** |
| Call the public API | [specifications/api-endpoints.md](specifications/api-endpoints.md) + [specifications/envelope-contract.md](specifications/envelope-contract.md) |
| Change the execution engine | [architecture/execution-engine.md](architecture/execution-engine.md) |
| Change the dashboard | [architecture/control-plane-web.md](architecture/control-plane-web.md) |
| Understand a past decision | [decisions/](decisions/README.md) |
| Know what to work on next | [roadmap/open-gaps.md](roadmap/open-gaps.md) |
| Write or edit a document here | [CONVENTIONS.md](CONVENTIONS.md) |
| Look up a term | [GLOSSARY.md](GLOSSARY.md) |

---

## Document map

```text
.blueprint/
├── README.md                       # This index
├── CONVENTIONS.md                  # How to write and maintain these documents
├── GLOSSARY.md                     # Shared vocabulary
├── IMPLEMENTATION-STATUS.md        # Blueprint vs. code reconciliation — read before trusting any doc
│
├── architecture/
│   ├── system-overview.md          # Planes, request lifecycle, limits
│   ├── execution-engine.md         # Data Plane internals, module by module
│   ├── control-plane-web.md        # Next.js dashboard structure and data flow
│   ├── worker-and-outbox.md        # Async audit pipeline
│   ├── security-and-auth.md        # Auth channels as-built and as-designed, crypto, SSRF
│   └── deployment-and-infrastructure.md  # Apache host proxy, Docker, CI/CD
│
├── specifications/
│   ├── api-endpoints.md            # Every route, grouped by plane
│   ├── envelope-contract.md        # Wire contract for Data Plane responses
│   ├── api-spec-engine.md          # Schemas, tool generation, coercion, prompt assembly
│   ├── database-schema.md          # Table catalog and relationships
│   ├── configuration.md            # Environment variable reference
│   └── testing-strategy.md         # Current suite and the intended pyramid
│
├── decisions/                      # ADRs — one decision per file
│   ├── README.md
│   └── 0001…0007-*.md
│
├── roadmap/
│   ├── implementation-phases.md    # Phase history with honest status
│   └── open-gaps.md                # Prioritized backlog derived from the drift audit
│
└── question-and-answer/            # Archived design conversations (qna-1 … qna-7)
    └── README.md                   # What these are and how to read them
```

---

## Architectural principles

1. **Separated planes.** The Control Plane (`apps/web`, Next.js on Bun) manages configuration. The
   Data Plane (`apps/api`, Python FastAPI) executes customer traffic. Customer traffic never passes
   through Next.js. — [ADR-0001](decisions/0001-control-plane-data-plane-split.md)
2. **Zero data retention.** Documents, images, prompts, and extracted content live only in RAM for
   the duration of a request. Only execution metadata is persisted. —
   [ADR-0002](decisions/0002-stateless-zero-data-retention.md)
3. **Structured output via tool calling.** A user's response schema becomes a model function
   declaration, so conformance is enforced by the provider rather than parsed out of prose. —
   [ADR-0003](decisions/0003-tool-calling-for-structured-output.md)
4. **One envelope for every answer.** `meta` / `data` or `error` / `executionTrace` / `metrics`, in
   camelCase, success or failure. —
   [specifications/envelope-contract.md](specifications/envelope-contract.md),
   [ADR-0004](decisions/0004-camelcase-json-wire-format.md)
5. **Actionable errors.** Every failure carries an uppercase `code`, a human message, itemized
   `details`, and an `actionableStep` telling the caller what to do next. —
   [ADR-0007](decisions/0007-actionable-error-contract.md)
6. **Prefixed, sortable identifiers.** `usr_01HZX…`, `spc_01HZX…` — self-describing in logs and
   lexicographically ordered by creation time. —
   [ADR-0005](decisions/0005-prefixed-ulid-identifiers.md)
7. **Header-routed execution.** One public endpoint, `POST /v1/call`; the user, spec, credential, and
   model come from headers. — [ADR-0006](decisions/0006-header-routed-call-endpoint.md)
8. **Multi-tenant scoping by project.** Credentials, specs, and provider keys are scoped to projects,
   and cross-project execution is refused.

---

## Tech stack

| Component | Technology | Where |
| :--- | :--- | :--- |
| Data Plane / execution engine | Python 3.12, FastAPI, Pydantic v2, Uvicorn | `apps/api` |
| Control Plane / dashboard | Next.js 14 (App Router), React 18, TypeScript, Tailwind, TanStack Query | `apps/web` |
| JS runtime & package manager | Bun 1.1+ | repo root workspace |
| Schema/code editor UI | Monaco (`@monaco-editor/react`), Recharts for analytics | `apps/web` |
| Database | PostgreSQL 16, SQLAlchemy 2 async + asyncpg | `apps/api/src/callcraft_api/db` |
| Cache, spec cache, outbox | Redis 7 | `apps/api/src/callcraft_api/services/redis_cache.py` |
| Background worker | Python asyncio poller | `apps/worker` |
| AI providers | Gemini, OpenAI, Anthropic, Mistral, DeepSeek adapters | `apps/api/src/callcraft_engine/adapters` |
| Crypto | AES-256-GCM (provider keys), Argon2id (secret keys) | `apps/api/src/callcraft_engine/crypto.py` |
| Tests | pytest, pytest-asyncio, respx | `apps/api/tests` |
| Deployment | Docker Compose behind host Apache 2.4, GitHub Actions → SSH | `docker/`, `.github/workflows/deploy.yml` |

Verified against `package.json`, `apps/web/package.json`, and `pyproject.toml` on the date above.

---

## Reading the blueprint safely

Three habits prevent this document set from misleading you:

1. **Check the front matter.** A **Design Target** document describes intent, not behaviour.
2. **Check [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)** before relying on any capability —
   several things the older documents asserted as built are not wired up (rate limiting, audit-log
   persistence, service-client auth).
3. **Follow the code citation.** Every non-obvious claim names a file and line. If the line no longer
   says what the document says, the document is stale — fix it, in that commit.

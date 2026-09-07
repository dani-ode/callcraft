# Callcraft Blueprint

> **Status:** Governing index
> **Source of truth:** code for runtime behavior; [AI-SPEC.md](AI-SPEC.md) for AI-assisted change process
> **Last reviewed:** 2026-09-06

This directory is Callcraft's evidence-based specification system. It helps humans and AI agents
reason about the product without confusing design intent with deployed behavior.

**Read [AI-SPEC.md](AI-SPEC.md) first** before planning or implementing a non-trivial change. It
defines required evidence, security gates, change specifications, validation, and completion rules.

## Fast paths

| Goal | Read |
| :--- | :--- |
| Make a code or product change safely | [AI-SPEC.md](AI-SPEC.md) → [change-spec template](templates/change-spec.md) |
| Understand the system | [architecture/system-overview.md](architecture/system-overview.md) |
| Know what is implemented versus intended | [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) |
| Call the Data Plane API | [specifications/api-endpoints.md](specifications/api-endpoints.md) and [specifications/envelope-contract.md](specifications/envelope-contract.md) |
| Review security/authentication constraints | [architecture/security-and-auth.md](architecture/security-and-auth.md) |
| Find current risk-prioritized work | [roadmap/open-gaps.md](roadmap/open-gaps.md) |
| Record a durable architecture decision | [ADR template](decisions/TEMPLATE.md) and [decisions/README.md](decisions/README.md) |
| Follow documentation conventions | [CONVENTIONS.md](CONVENTIONS.md) |
| Look up domain language | [GLOSSARY.md](GLOSSARY.md) |

## System at a glance

Callcraft is a dynamic multimodal AI execution platform. The **Data Plane** (`apps/api`, FastAPI)
executes customer calls through `POST /v1/call`; the **Control Plane** (`apps/web`, Next.js) manages
projects, specs, keys, templates, and settings. The **worker** (`apps/worker`) processes asynchronous
outbox work. Review the implementation-status register before relying on any capability.

## Documentation map

```text
.blueprint/
├── README.md                         # This index
├── AI-SPEC.md                        # Strict operating protocol for AI/human changes
├── CONVENTIONS.md                    # Documentation-writing conventions
├── GLOSSARY.md                       # Shared domain vocabulary
├── IMPLEMENTATION-STATUS.md          # Code-vs-blueprint reconciliation
├── templates/
│   └── change-spec.md                # Mandatory template for non-trivial changes
├── architecture/                     # System, deployment, and security descriptions
├── specifications/                   # API, engine, database, config, and test contracts
├── decisions/                        # Accepted ADRs and ADR template
├── roadmap/
│   ├── implementation-phases.md      # Historical delivery phases
│   └── open-gaps.md                  # Prioritized, evidence-backed risk register
└── question-and-answer/              # Archived design conversations; non-authoritative
```

## Trust and status rules

1. **Code wins for current behavior.** Each document must distinguish As-Built, Design Target, and
   Mixed content.
2. **Never infer a capability from aspirational prose.** Check
   [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) and cited source files.
3. **Every material implementation change needs a change spec.** Start with
   [templates/change-spec.md](templates/change-spec.md).
4. **Security, contracts, and operations are release gates.** Follow [AI-SPEC.md](AI-SPEC.md).
5. **Known risks remain visible.** Track and close them through
   [roadmap/open-gaps.md](roadmap/open-gaps.md), not by deleting references.

## Core architectural invariants

- Data Plane and Control Plane are separate concerns — [ADR-0001](decisions/0001-control-plane-data-plane-split.md).
- Customer documents and inference payloads are intended to remain ephemeral — [ADR-0002](decisions/0002-stateless-zero-data-retention.md).
- Structured model output is produced through provider tool/function calling — [ADR-0003](decisions/0003-tool-calling-for-structured-output.md).
- Public wire JSON uses camelCase — [ADR-0004](decisions/0004-camelcase-json-wire-format.md).
- Identifiers are prefixed ULIDs — [ADR-0005](decisions/0005-prefixed-ulid-identifiers.md).
- Public execution is header-routed through `POST /v1/call` — [ADR-0006](decisions/0006-header-routed-call-endpoint.md).
- Errors must be actionable — [ADR-0007](decisions/0007-actionable-error-contract.md).

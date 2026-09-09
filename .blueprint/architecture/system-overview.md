# Architecture — System Overview

> **Status:** Mixed — current topology with explicit known gaps
> **Source of truth:** `apps/api/src/callcraft_api/app.py`, `apps/api/src/callcraft_api/routers/`, `apps/web`, and `apps/worker/main.py`
> **Last reviewed:** 2026-09-06

This is the high-level map of Callcraft. For current capability status, use
[IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md); for operational changes, use
[AI-SPEC.md](../AI-SPEC.md).

## 1. Current topology

```text
 Client applications           External AI Agents            Platform users
        │                     (DSH, Cursor, Claude)                │
        │ POST /v1/call                 │                          │ dashboard browser
        ▼                               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ Data Plane           │    │ MCP Server Plane     │    │ Control Plane        │
│ FastAPI, apps/api    │    │ Streamable HTTP/SSE  │    │ Next.js, apps/web    │
└──────┬───────┬───────┘    └──────────┬───────────┘    └──────────┬───────────┘
       │       │                       │                           │ /internal/v1/*
       │       │                       ▼                           ▼
       │       │            ┌──────────────────────────────────────────────┐
       │       └───────────►│ FastAPI Internal & MCP Execution Handlers    │
       │                    └──────────────────────────────────────────────┘
       ▼                 ▼                         │
┌──────────────┐  ┌──────────────┐                 │
│ AI providers │  │ PostgreSQL   │◄────────────────┘
└──────────────┘  └──────┬───────┘
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
   Redis cache       Redis outbox     Worker process
                                       (currently drains but
                                        does not persist logs)
```

- **Data Plane:** `POST /v1/call` in
  `apps/api/src/callcraft_api/routers/public.py` executes a project-scoped call specification.
- **MCP Server Plane:** `/mcp/v1/*` and `mcp_stdio.py` expose CallCraft tools and spec manipulation to
  external AI agent runtimes via Streamable HTTP, Legacy SSE, and Stdio.
- **Control Plane:** `apps/web` calls the FastAPI internal API directly. It is not presently a
  server-side proxy or credential boundary.
- **Persistence:** PostgreSQL stores platform metadata such as users, projects, specs, and keys.
  Redis caches specs and receives outbox messages.
- **Worker:** `apps/worker/main.py` consumes outbox entries. Audit-log persistence is not delivered;
  see [GAP-006](../roadmap/open-gaps.md).

## 2. Trust boundaries and current risks

| Boundary | Intended responsibility | Current status |
| :--- | :--- | :--- |
| External caller → Data Plane | Credential auth, project isolation, input validation | Implemented in part; limits and rate limiting have gaps. |
| Browser → Internal API | Authenticated user identity and authorization | **Unsafe today:** the API trusts `X-USER-ID`; see GAP-001. |
| Data Plane → remote URL | Prevent SSRF and resource exhaustion | Private-address validation exists, but redirect and size-limit gaps remain (GAP-003/004). |
| Data Plane → AI provider | Send ephemeral input and receive structured results | Provider keys and model output require existing validation paths. |
| Data Plane → worker | Queue execution metadata asynchronously | Queue push exists; durable audit persistence does not (GAP-006). |

## 3. Public request lifecycle

1. A client calls `POST /v1/call` with credential, user, and spec headers. See
   [API endpoint reference](../specifications/api-endpoints.md#1-public-data-plane).
2. The API authenticates the credential, checks the IP allowlist and project/spec relationship, then
   resolves the active spec from Redis or PostgreSQL.
3. Input documents are decoded or fetched into process memory. They are intended not to be persisted.
   Remote URL behavior has open SSRF and size-limit risks, which must be fixed before claiming a
   complete zero-retention security boundary.
4. The response schema is converted to a provider tool declaration; the adapter invokes the selected
   AI model; returned arguments are validated/coerced.
5. The API returns the camelCase envelope defined in
   [envelope-contract.md](../specifications/envelope-contract.md). It pushes successful metadata to
   the outbox, whose persistence path is currently incomplete.

## 4. Explicit non-capabilities

The following are design ideas, not current runtime guarantees:

- application-enforced request/download size ceilings;
- active rate limiting (middleware exists but is not attached);
- redirect-safe SSRF handling;
- inbound correlation-ID propagation;
- hallucination retry or `partial_success` execution responses;
- session/service-client authentication and RBAC enforcement;
- durable execution-log persistence and usage aggregation.

The canonical evidence and remediation priority are in
[IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md) and
[roadmap/open-gaps.md](../roadmap/open-gaps.md).

## 5. Stable architectural constraints

The governing decisions are: separate planes (ADR-0001), ephemeral payload processing (ADR-0002),
tool calling for structured output (ADR-0003), camelCase public JSON (ADR-0004), prefixed ULIDs
(ADR-0005), one header-routed execution endpoint (ADR-0006), actionable errors (ADR-0007), and
multi-transport Model Context Protocol agent access (ADR-0008).
Review [decisions/README.md](../decisions/README.md) before altering any of these boundaries.

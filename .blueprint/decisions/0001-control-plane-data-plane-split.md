# ADR-0001 — Split the Control Plane from the Data Plane

> **Status:** Accepted
> **Date:** 2026-08 (reconstructed from `qna-2.md`, `qna-4.md`)

## Context

Two workloads with incompatible profiles share one product: interactive dashboard sessions
(low volume, session-bearing, HTML-heavy) and customer API execution (high volume, key-authenticated,
CPU- and network-bound on AI calls, latency-sensitive). Running both through one runtime couples
their scaling, their failure modes, and their attack surfaces.

## Decision

Two deployables, two hostnames:

- **Control Plane** — Next.js 14 on Bun (`apps/web`), served at `app.<domain>`. Configuration UI only.
- **Data Plane** — Python 3.12 FastAPI (`apps/api`), served at `api.<domain>`. Customer execution
  traffic only.

Customer execution traffic **never** passes through Next.js. The Next.js process must not be a proxy
on the hot path.

## Consequences

- Dashboard deploys cannot break customer executions, and vice versa.
- The AI-heavy path lives in Python, where the provider SDK and Pydantic validation story is best.
- Two runtimes to build, ship, and monitor; a shared Postgres and Redis remain the coupling points.
- Management operations need their own authenticated channel between the planes — that channel is
  where the system is currently weakest (see [ADR-0006](0006-header-routed-call-endpoint.md) and
  [../roadmap/open-gaps.md](../roadmap/open-gaps.md)).

## Implementation

- Data Plane entry: `apps/api/src/callcraft_api/app.py`
- Control Plane entry: `apps/web/src/app`
- Split at the proxy: `.blueprint/architecture/deployment-and-infrastructure.md`

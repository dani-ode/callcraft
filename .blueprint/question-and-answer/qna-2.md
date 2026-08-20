# Q&A Discussion 2: Architecture & Component Separation

## QUESTION:
Should backend and frontend be separated in this project?

---

## ANSWER:

Yes, for Callcraft I **strongly recommend separating backend and frontend application layers**.

This does not mean you need multiple separate Git repositories or complex microservices. Rather, it means maintaining a **separated application layer within a monorepo**:

```text
callcraft/
├── apps/
│   ├── api/            ← Python FastAPI Data Plane Gateway & Engine
│   ├── worker/         ← Python Async Outbox Logger & Worker
│   └── web/            ← Next.js 14 Dashboard & Visual Schema Builder (Bun)
│
├── migrations/         ← PostgreSQL 16+ Migration DDL SQL
├── docker/             ← Multi-stage Dockerfiles
├── docker-compose.yml  ← Multi-container setup
└── pyproject.toml      ← Python workspace manifest
```

### Why Separate Them?

Because Callcraft comprises **two distinct product domains**:

#### 1. Control Plane (Frontend: Next.js + Bun)
Users and administrators manage:
- User Profile & Auth
- AI Provider API Keys (Gemini, OpenAI, Anthropic, DeepSeek)
- Dynamic Callcraft API Specifications
- Request Schemas & Response Schemas
- Prompts & Templates
- Customer API Credentials (`pk_live_...` & `call_sk_live_...`)
- Interactive Playground & Analytics Dashboard

#### 2. Data Plane + Execution Engine (Backend: Python FastAPI)
Handles runtime customer traffic:
- Service Authentication & Customer API Key Verification
- High-Performance Gateway & Token-Bucket Rate Limiting
- Dynamic Execution Engine & Tool Calling Generation
- In-Memory Stream Processing (RAM `bytes` without disk retention)
- Multi-AI Provider Adapters (Gemini, OpenAI, Anthropic, DeepSeek)
- Schema Validation & Automated Type Coercion
- Async Request Audit Logging

External customer applications **never need to access the frontend dashboard directly**. They interact exclusively with the Python Data Plane API:

```text
                    ┌─────────────────┐
                    │ Next.js + Bun   │
                    │ Dashboard UI    │
                    └────────┬────────┘
                             │
                             │ Internal Auth (/internal/v1/*)
                             ▼
                    ┌─────────────────┐
                    │ Python FastAPI  │
                    │ Data Plane API  │
                    └───────┬─────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
     PostgreSQL           Redis           AI Providers
                                              │
                                       ┌──────┴──────┐
                                       │             │
                                    Gemini        OpenAI


External Customer App
       │
       │ POST /v1/call/{user_id}
       ▼
┌─────────────────┐
│ Python FastAPI  │
└─────────────────┘
```

### Architecture Scalability Advantage
Separating Control Plane and Data Plane allows independent horizontal scaling under high traffic:
```text
web: 2 container instances
api: 10 container instances (high execution throughput)
worker: 4 container instances (outbox logging & analytics processing)
```

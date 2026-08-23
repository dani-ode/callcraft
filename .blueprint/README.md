# Callcraft — Software Architecture Blueprint & Technical Specifications

Welcome to the **Callcraft** architecture documentation repository. This document set serves as the official single source of truth, developed based on the complete architecture and technical design discussions in **`qna-1.md` through `qna-7.md`** within the `.blueprint/question-and-answer/` directory.

---

## 📌 Executive Summary

**Callcraft** is an AI-powered **Dynamic Multimodal AI Execution Engine**. It empowers users to design custom API specifications, define dynamic input schemas (*request schema*) and structured output schemas (*response schema*), and execute high-speed data extraction and processing by leveraging state-of-the-art AI Vision & LLM models (such as Google Gemini, OpenAI GPT-4o, Anthropic Claude, and DeepSeek).

### Key Architectural Principles (Derived from Q&A 1-7):
1. **Stateless Privacy-First Data Processing (Q&A 3)**: No documents, image files (Base64 or URL downloads), or sensitive raw extraction outputs are saved to persistent storage (*disk*, MinIO, S3, or database). Data and images live exclusively inside RAM buffers during execution and are immediately dropped from memory after the request cycle completes.
2. **Separated Control Plane & Data Plane (Q&A 2 & Q&A 4)**:
   - **Control Plane (`Next.js` with Bun - `app.yourdomain.com`)**: Visual GUI dashboard for users and administrators to manage API specs, input templates, AI provider credentials, and monitoring metadata logs.
   - **Data Plane (`Python / FastAPI` - `api.yourdomain.com`)**: High-performance API Gateway and Execution Engine receiving dynamic execution traffic directly from external customer applications without passing through Next.js.
3. **Multi-AI Vision & Dynamic Tool/Function Calling (Q&A 1)**: Converts user-defined input/output JSON Schemas into official AI model tool/function calling declarations (Gemini, OpenAI, etc.) to guarantee 100% precise output JSON structures.
4. **Multi-Tier Authorization & Security (Q&A 5)**: Strict separation of 3 authentication pathways: Service Client (`/internal/v1/*`), Customer Application Key (`/v1/call/{user_id}`), and Admin RBAC (`/admin/v1/*`).
5. **Host Apache Reverse Proxy + Docker (Q&A 4)**: Integrates Apache Web Server on Ubuntu Host VPS with Docker Compose containers (`Next.js + Bun`, `Python FastAPI API`, `Python Worker`, `PostgreSQL`, `Redis`).
6. **Future-Proof Envelope Pattern & Correlation IDs (Q&A 6)**: Wraps all Data Plane responses in standardized `meta`, `data` (or `error`), `execution_trace`, and `metrics` JSON envelopes. Employs `request_id` and `trace_id` for idempotency, distributed tracing, and support for both synchronous and asynchronous execution modes.
7. **Structured Actionable Error Handling & Graceful Degradation (Q&A 7)**: Provides standardized error envelopes with uppercase error codes (`code`), human-readable messages, itemized `details`, and `actionable_step` recommendations. Implements internal auto-retry loops (1-2 attempts) for AI hallucinations and supports `partial_success` for multi-tool workflows.

---

## 📁 Blueprint Documentation Structure

This architecture documentation is divided into the following comprehensive modules:

```text
.blueprint/
├── README.md                                  # Master index & blueprint overview
├── question-and-answer/                       # Raw architectural Q&A files (qna-1.md to qna-7.md)
│   ├── qna-1.md                               # Prompt spec, AI keys, visual builder, admin monitoring
│   ├── qna-2.md                               # Monorepo architecture & component separation
│   ├── qna-3.md                               # Stateless RAM-only image & payload processing
│   ├── qna-4.md                               # Control plane vs Data plane, VPS Apache Host + Docker
│   ├── qna-5.md                               # Multi-tier auth (Service vs Customer vs Admin RBAC)
│   ├── qna-6.md                               # Correlation ID, Envelope Pattern (meta, data, trace, metrics)
│   └── qna-7.md                               # Actionable error handling, HTTP codes, auto-retry, partial success
├── architecture/
│   ├── system-overview.md                     # High-level architecture, flow diagrams, envelope pipeline
│   ├── security-and-auth.md                   # 3-tier auth, RBAC matrix, AES-256-GCM, SSRF, audit envelopes
│   └── deployment-and-infrastructure.md       # VPS Apache proxy, Docker Compose, multi-stage Dockerfiles
├── specifications/
│   ├── database-schema.md                     # SQL DDL PostgreSQL 16+ (16 Relational Tables), indexes, FK
│   ├── api-spec-engine.md                     # API specification engine, Envelope wrapping, Tool Calling
│   ├── api-endpoints.md                       # OpenAPI specs for Control Plane, Data Plane & Admin (Envelopes)
│   └── testing-strategy.md                    # Testing strategy (Envelope validation, Pytest, Bun test, Load)
└── roadmap/
    └── implementation-phases.md               # Tactical execution roadmap from Phase 1 to Phase 6
```

---

## 📚 Blueprint Module Summary

### 1. [System Overview](file:///home/dani/Projects/callcraft/.blueprint/architecture/system-overview.md) *(Reflects Q&A 1, 2, 3, 4, 6, 7)*
Explains global system architecture, Control Plane (Next.js + Bun) vs Data Plane (Python FastAPI) separation, monorepo structure, data flow from client to AI Engine, in-memory stream processing without disk storage, API Envelope pipeline, distributed tracing (`request_id`/`trace_id`), and execution quota performance.

### 2. [Security & Authentication](file:///home/dani/Projects/callcraft/.blueprint/architecture/security-and-auth.md) *(Reflects Q&A 1, 5, 6, 7)*
Documents 3-tier authentication model (`/internal/v1/*` Service Auth, `/v1/call/{user_id}` User API Key Auth, `/admin/v1/*` Admin Session Auth), Role-Based Access Control (RBAC), AES-256-GCM encryption for database AI provider keys, SSRF protections, and secure error envelope sanitization without internal credential leakage.

### 3. [Deployment & Infrastructure](file:///home/dani/Projects/callcraft/.blueprint/architecture/deployment-and-infrastructure.md) *(Reflects Q&A 4)*
Infrastructure configuration guide for single-host Ubuntu VPS running Apache as Host Reverse Proxy & SSL Terminator, combined with Docker Compose containers (`Next.js + Bun`, `Python API`, `Python Worker`, `PostgreSQL`, `Redis`).

### 4. [Database Schema Specifications](file:///home/dani/Projects/callcraft/.blueprint/specifications/database-schema.md) *(Reflects Q&A 1, 3, 5, 6)*
Complete PostgreSQL 16+ relational database specification containing 16 relational tables (such as `call_specs`, `call_spec_versions`, `api_requests`) with data types, primary keys (ULID/UUID), foreign keys, performance indexes, audit request tracing (`request_id`, `trace_id`), and production-ready SQL migration DDLs.

### 5. [API Specification Engine](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-spec-engine.md) *(Reflects Q&A 1, 6, 7)*
Technical specifications for building dynamic *Request Schemas* & *Response Schemas*. Details basic & container data types (nested Object/Array), translation to AI Tool Calling, automated Pydantic validation & *Type Coercion* algorithms, step trace generation, internal hallucination auto-retries, and Envelope packaging.

### 6. [API Endpoints Reference](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-endpoints.md) *(Reflects Q&A 1, 4, 5, 6, 7)*
Full reference documentation for all REST API endpoints across `/internal/v1/*` (Internal Management), `/v1/call/{user_id}` (Public Execution Data Plane), and `/admin/v1/*` (Admin Dashboard), complete with standard Success, Error, and Partial Success Envelope response specifications and HTTP status code mappings.

### 7. [Professional Testing Strategy](file:///home/dani/Projects/callcraft/.blueprint/specifications/testing-strategy.md) *(Reflects Q&A 6, 7)*
Professional quality assurance and testing specifications including Unit Testing (Python `pytest` & `bun test`), Integration Testing (`testcontainers-python`), Envelope Conformance Testing, Hallucination Auto-retry Verification, E2E UI Testing (Playwright), Load Testing (k6), Security Fuzzing, and Zero Data Retention Memory Audits.

### 8. [Implementation Phases Roadmap](file:///home/dani/Projects/callcraft/.blueprint/roadmap/implementation-phases.md)
Tactical execution phases from Phase 1 (Python & Bun Monorepo Scaffolding), Phase 2 (Database & Domain Models), Phase 3 (Python Dynamic Execution Engine & Envelope Pipeline), Phase 4 (Next.js & Bun Dashboard), Phase 5 (Security, Worker Logging & Tracing), through Phase 6 (VPS Deployment & QA).

---

## 🛠️ Official Tech Stack

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Data Plane / Core API** | **Python 3.12 (FastAPI + Pydantic v2)** | High-throughput, dynamic multimodal API Gateway & Execution Engine |
| **Control Plane / Front** | **Next.js 14+ (App Router)** | Web Dashboard, React, TypeScript, Tailwind CSS, shadcn/ui |
| **JS/TS Runtime & Manager** | **Bun 1.1+** | Superfast JavaScript/TypeScript runtime & package manager for Web |
| **Schema Builder UI** | **React Flow + Monaco** | Visual drag-and-drop & code editor for dynamic API specs |
| **Database** | **PostgreSQL 16+** | Relational Database (Asyncpg / SQLAlchemy in Python) |
| **Cache & Rate Limit** | **Redis 7+** | Callcraft spec caching, token-bucket rate limiter, session cache |
| **Testing Tools** | **Pytest, Bun Test, Playwright, k6** | Automated unit, integration, UI E2E, & load testing |
| **Reverse Proxy** | **Apache 2.4+ (Host VPS)** | ProxyPass, SSL/TLS Termination, Security headers |
| **Containerization** | **Docker & Docker Compose** | Multi-container setup for applications and infrastructure |


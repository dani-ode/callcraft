# Callcraft — AI-Powered Dynamic Multimodal API Execution Engine

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-fbf0df.svg?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-000000.svg?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Callcraft** is an enterprise-grade, high-throughput **Dynamic Multimodal AI Execution Engine & API Platform**. It empowers developers and enterprise engineering teams to visually define custom API extraction contracts, build dynamic input/response JSON schemas, and execute precision structured document and vision extraction across state-of-the-art vision-language models—including Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5/3.7, Mistral, and DeepSeek.

---

## 🌟 Key Capabilities & Features

- ⚡ **Universal Header-Routed Data Plane (`POST /v1/call`)**: Execute any defined extraction specification dynamically via a single, standardized REST endpoint routed by headers.
- 🛠️ **Provider-Native Tool & Function Calling**: Automatic on-the-fly compilation of user-defined JSON Schemas into provider-native tool calling signatures (Gemini Tools, OpenAI Function Calling, Claude Tool Use, Mistral Tools, DeepSeek Tools) to guarantee 100% strictly formatted, deterministic JSON output with zero markdown or conversational artifacts.
- 🔒 **Stateless In-Memory Execution & Zero Data Retention**: Ingest Base64 streams, binary documents, or public URLs into ephemeral RAM buffers (`bytes`). Document bytes and customer payloads are discarded immediately post-inference—zero payload data is persisted to disk, S3, or database.
- 🛡️ **Enterprise Defense-in-Depth Security**:
  - Dual-key cryptographic authentication (`X-CALL-PUBLIC-KEY` + `Authorization: Bearer <secret_key>`).
  - Project-scoped isolation and multi-tenant authorization.
  - Configurable IP Whitelisting with CIDR subnet support.
  - Active SSRF (Server-Side Request Forgery) protection with RFC 1918 / loopback / private IP filtering and DNS pinning.
  - AES-256-GCM authenticated encryption for provider secrets and Argon2id key hashing.
- 📐 **Standardized Wire Envelope & Actionable Error Contracts**: All responses strictly conform to an enterprise wire format (`meta`, `data`, `executionTrace`, `metrics`, or `error`) with itemized details and actionable remediation instructions in `camelCase` JSON.
- 📊 **Dynamic Visual Schema Builder & Monaco Editor**: Create nested object, array, currency, date, and regex-validated schemas visually or via an embedded Monaco code editor with real-time schema validation.
- 🧪 **Interactive Testing Playground**: Test Call Specs live against documents or webcam captures with variable templating, negative prompt constraints, token usage metrics, latency breakdown, and cost estimation.
- 📦 **Pre-Configured Template Library**: Ready-to-deploy extraction blueprints for National ID Cards (KTP, Passports, Driver Licenses), Invoices, Receipts, Medical Records, Legal Agreements, and Financial Statements.
- 👑 **Admin Superuser Control Center**: Granular model registry management, dynamic provider token pricing, platform user RBAC (`SUPERADMIN`, `ADMIN`, `MEMBER`, `VIEWER`), and audit log observability.

---

## 🏛️ System Architecture

Callcraft enforces a strict separation of concerns, decoupling developer management workflows from customer runtime execution traffic:

```mermaid
graph TD
    Client["Client Applications / External Services"] -->|POST /v1/call<br>Bearer API Key + Headers| DataPlane["Data Plane API Gateway<br>(Python 3.12 / FastAPI)"]
    Admin["Admin / Developer Browser"] -->|HTTP / Web UI| ControlPlane["Control Plane Dashboard<br>(Next.js 14 / Bun)"]

    subgraph Internal Architecture
        ControlPlane -->|Service Auth / internal/v1/*| DataPlane
        DataPlane -->|Spec Cache & Outbox Queue| Redis["Redis 7<br>(In-Memory Cache & Stream)"]
        DataPlane -->|Relational Persistence| Postgres[("PostgreSQL 16<br>(Metadata / Specs / Keys)")]
        DataPlane -->|Ephemeral In-Memory Inference| LLM["Multimodal AI Adapters<br>(Gemini / OpenAI / Claude / Mistral / DeepSeek)"]
        Worker["Background Outbox Worker<br>(Python Async Poller)"] -->|Consume Queue| Redis
        Worker -->|Audit / Telemetry Logging| Postgres
    end
```

### Architectural Highlights

1. **Control Plane (`apps/web`)**: Next.js 14 (App Router) running on Bun. Provides visual schema composition, API credential generation, playground execution, team RBAC, and template management.
2. **Data Plane (`apps/api`)**: Python 3.12 + FastAPI asynchronous gateway. Purpose-built for low-latency, high-concurrency API execution with zero frontend runtime overhead.
3. **Background Worker (`apps/worker`)**: Python asynchronous poller that streams audit logs and analytics from the Redis outbox queue into PostgreSQL asynchronously, removing write overhead from the critical API path.
4. **Resilient Adapter Engine (`apps/api/src/callcraft_engine`)**: Pluggable AI adapter layer normalizing multimodal payload formatting, tool generation, error mapping, and field-level type coercion across all AI providers.

---

## 📂 Repository Layout

```text
callcraft/
├── .blueprint/                 # Architecture blueprints, ADRs, & specifications
│   ├── README.md               # Architecture documentation index
│   ├── CONVENTIONS.md          # Coding standards, naming conventions, & patterns
│   ├── GLOSSARY.md             # Standard platform domain vocabulary
│   ├── IMPLEMENTATION-STATUS.md# Feature delivery matrix & tracking
│   ├── architecture/           # System overview, security, and deployment guides
│   ├── decisions/              # Architecture Decision Records (ADR 0001–0007)
│   ├── question-and-answer/    # Deep-dive architecture Q&A documents
│   ├── roadmap/                # Implementation phases & milestone tracking
│   └── specifications/         # Database schema, API spec engine, envelope contracts
│
├── apps/
│   ├── web/                    # CONTROL PLANE: Next.js 14 Dashboard & Schema Studio
│   │   ├── src/app/            # App Router pages (Dashboard, Specs, Keys, Playground, Admin)
│   │   └── src/components/     # UI components, Monaco Editor, and Schema Builder
│   ├── api/                    # DATA PLANE: Python FastAPI Gateway & Adapter Engine
│   │   ├── main.py             # Uvicorn gateway entrypoint
│   │   ├── src/callcraft_api/  # Routers (Public, Internal, Auth), DB, Services, Middleware
│   │   ├── src/callcraft_engine/# Adapters, Tool Generator, Crypto, Coercion, SSRF Guard
│   │   └── tests/              # Pytest engine & integration test suite
│   └── worker/                 # BACKGROUND WORKER: Async Redis Outbox & Audit Processor
│       └── main.py             # Worker loop entrypoint
│
├── migrations/                 # PostgreSQL DDL migration & seed scripts
│   ├── 0001_initial_schema.sql # Core relational schema (16 tables)
│   ├── 0002_seed_data.sql      # Seed templates, admin credentials, AI providers, and models
│   └── 0003_add_ip_whitelist.sql # IP whitelist schema extension
│
├── docker/                     # Multi-stage container definitions (API, Web, Worker)
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── worker.Dockerfile
│
├── docker-compose.yml          # Container orchestration (Postgres, Redis, API, Worker, Web)
├── pyproject.toml              # Root Python package dependencies & tool configuration
├── package.json                # Bun monorepo workspace & script definitions
└── .env.example                # Standardized environment configuration template
```

---

## 🛠️ Tech Stack & Requirements

| Layer | Technologies | Version / Requirement |
| :--- | :--- | :--- |
| **Package & Workspace Runtime** | [Bun](https://bun.sh/) | `v1.1+` |
| **Backend Runtime** | [Python](https://www.python.org/) | `v3.12+` |
| **API Framework** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [Pydantic v2](https://docs.pydantic.dev/) | FastAPI `0.111+`, Pydantic `2.7+` |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) | Next.js `14.2+`, React `18+` |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [SQLAlchemy 2](https://www.sqlalchemy.org/) (AsyncIO), [asyncpg](https://github.com/MagicStack/asyncpg) | PostgreSQL `16+` |
| **In-Memory Cache & Streams** | [Redis](https://redis.io/), [redis-py](https://github.com/redis/redis-py) (AsyncIO) | Redis `7+` |
| **Cryptography & Security** | [cryptography](https://cryptography.io/) (AES-256-GCM), [argon2-cffi](https://argon2-cffi.readthedocs.io/) | Argon2id, AES-GCM |
| **Multimodal AI Integrations** | Google Gemini, OpenAI GPT-4o, Anthropic Claude, Mistral, DeepSeek | Native Tool Calling APIs |
| **Containerization** | [Docker](https://www.docker.com/), Docker Compose | Docker `24.0+`, Compose `v2+` |

---

## ⚡ Quick Start

### 1. Environment Configuration

Copy the example configuration file and set your desired environment variables:

```bash
cp .env.example .env
```

> [!IMPORTANT]
> For production environments, generate a cryptographically secure 32-byte hex key for `MASTER_ENCRYPTION_KEY`:
> ```bash
> openssl rand -hex 32
> ```

---

### 2. Execution Methods

#### Option A: Run Full Stack via Docker Compose (Recommended)

To launch all infrastructure components (PostgreSQL, Redis, FastAPI Gateway, Background Worker, and Next.js Dashboard) in isolated containers:

```bash
docker compose up --build -d
```

Access services at:
- 🌐 **Web Dashboard & Studio**: [http://localhost:3000](http://localhost:3000) (or configured `WEB_PORT`)
- ⚡ **Data Plane API**: [http://127.0.0.1:8080](http://127.0.0.1:8080) (or configured `PORT`)
- 📚 **Interactive Swagger / OpenAPI Docs**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

---

#### Option B: Hybrid Local Development (Docker Infra + Local App Services)

1. **Start database and cache containers**:
   ```bash
   docker compose up -d callcraft-postgres callcraft-redis
   ```

2. **Apply PostgreSQL database migrations and seed data**:
   ```bash
   psql -h 127.0.0.1 -p 5432 -U callcraft_user -d callcraft_db -f migrations/0001_initial_schema.sql
   psql -h 127.0.0.1 -p 5432 -U callcraft_user -d callcraft_db -f migrations/0002_seed_data.sql
   psql -h 127.0.0.1 -p 5432 -U callcraft_user -d callcraft_db -f migrations/0003_add_ip_whitelist.sql
   ```

3. **Install workspace dependencies**:
   ```bash
   # Install frontend & monorepo tooling
   bun install

   # Setup Python virtual environment & backend packages
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```

4. **Launch API Gateway and Web Dashboard concurrently**:
   ```bash
   bun dev
   ```

---

## 📜 Available Workspace Scripts

All workspace tasks are managed from the root directory using `bun`:

| Command | Description |
| :--- | :--- |
| `bun dev` | Runs both Backend API Gateway (`:8081`) and Web Dashboard (`:3001`) concurrently |
| `bun run dev:api` | Starts the Python FastAPI Data Plane with Uvicorn live hot-reloading |
| `bun run dev:web` | Starts the Next.js Control Plane Dashboard in development mode |
| `bun run build:web` | Builds the optimized production bundle for the Next.js frontend |
| `bun run test:api` | Executes Pytest backend test suite (adapters, crypto, coercion, SSRF, routes) |
| `bun run test:web` | Executes Next.js frontend unit and component tests |

---

## 📡 API Usage & Wire Contract Standard

Clients send execution requests to the public Data Plane API endpoint `POST /v1/call`. 

All JSON request bodies and response envelopes strictly adhere to `camelCase` naming conventions.

### Execution Request Example (`cURL`):

```bash
curl -X POST "http://127.0.0.1:8081/v1/call" \
  -H "Authorization: Bearer call_sk_live_01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-PUBLIC-KEY: pk_live_01HZX89ABCDEF1234567890XYZ" \
  -H "X-USER-ID: usr_01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-SPEC-ID: identity-card-extractor" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/identity-sample.jpg",
    "prompt": "Extract identity card attributes with high precision.",
    "negativePrompt": "Do not hallucinate blurry or missing text.",
    "variables": {
      "country": "ID"
    }
  }'
```

### Standardized Success Wire Envelope (`200 OK`):

```json
{
  "meta": {
    "requestId": "req_01HZY9998877665544332211AA",
    "traceId": "trc_01HZY9998877",
    "timestamp": "2026-09-02T08:00:00.000000+00:00",
    "status": "completed",
    "apiVersion": "v1.0",
    "executionMode": "sync"
  },
  "data": {
    "primaryResult": {
      "type": "structured_json",
      "content": {
        "documentNumber": "3271041508950001",
        "fullName": "GOTTFRIED WILHELM LEIBNIZ",
        "gender": "LAKI-LAKI",
        "birthDate": "1995-08-15",
        "address": "JL. MERDEKA NO. 45",
        "isVerified": true
      }
    },
    "humanReadableMessage": "Hasil ekstraksi terstruktur 'Identity Document Extractor' berhasil diproses via provider AI 'gemini' (gemini-1.5-flash)."
  },
  "executionTrace": {
    "totalDurationMs": 850,
    "steps": [
      {
        "stepId": "stp_01HZY9998877",
        "agent": "CallcraftEngine",
        "actionType": "TOOL_EXECUTION",
        "toolName": "extract_identity_document",
        "status": "COMPLETED",
        "durationMs": 810
      }
    ],
    "promptBuilder": "",
    "warnings": []
  },
  "metrics": {
    "usage": {
      "promptTokens": 540,
      "completionTokens": 120,
      "totalTokens": 660
    },
    "estimatedCostUsd": 0.00012
  }
}
```

### Standardized Actionable Error Envelope (`422 / 400 / 403`):

```json
{
  "meta": {
    "requestId": "req_01HZY9998877665544332211BB",
    "timestamp": "2026-09-02T08:00:00.000000+00:00",
    "status": "failed",
    "apiVersion": "v1.0"
  },
  "error": {
    "code": "SSRF_SECURITY_VIOLATION",
    "message": "The provided document URL failed security verification.",
    "details": [
      {
        "field": "image",
        "issue": "http://10.0.0.1/private-document.png",
        "reason": "URL resolves to a restricted private/internal IP range."
      }
    ],
    "actionableStep": "Gunakan URL dokumen publik yang aman atau kirimkan file sebagai Base64 string."
  },
  "executionTrace": {
    "totalDurationMs": 14,
    "steps": [],
    "warnings": []
  }
}
```

---

## 🧪 Testing & Verification

Callcraft includes test suites covering schema coercion, provider tool generation, SSRF prevention, cryptography, rate limiting, and API endpoints:

```bash
# Run backend engine and API test suite
bun run test:api

# Run frontend tests
bun run test:web
```

---

## 📘 Architecture Blueprints & Technical Documentation

For in-depth architectural specifications, RFCs, and implementation design documents, explore the [`.blueprint/`](.blueprint/) directory:

- 🏛️ [System Architecture Overview](.blueprint/architecture/system-overview.md)
- 🔐 [Security, Cryptography & Auth Specifications](.blueprint/architecture/security-and-auth.md)
- 🚢 [Deployment & Infrastructure Guide](.blueprint/architecture/deployment-and-infrastructure.md)
- 🗄️ [Database Schema & Relational Specifications](.blueprint/specifications/database-schema.md)
- ⚡ [API Endpoints Specification](.blueprint/specifications/api-endpoints.md)
- 📐 [Wire Envelope & Error Contract Standard](.blueprint/specifications/envelope-contract.md)
- ⚙️ [Configuration & Environment Variables](.blueprint/specifications/configuration.md)
- 🧪 [Testing Strategy & Test Pyramid](.blueprint/specifications/testing-strategy.md)
- 📋 [Architecture Decision Records (ADRs)](.blueprint/decisions/)
- 🗺️ [Implementation Roadmap & Phases](.blueprint/roadmap/implementation-phases.md)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

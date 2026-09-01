# Callcraft — AI-Powered Dynamic Multimodal API Execution Engine

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-fbf0df.svg?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-000000.svg?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Callcraft** is an enterprise-grade, high-speed **Dynamic Multimodal AI Execution Engine**. It enables developers and enterprise teams to visually define custom API contracts, construct dynamic input/response JSON schemas, and execute precision structured document and data extraction with state-of-the-art vision and language models (Google Gemini, OpenAI GPT-4o, Anthropic Claude, Mistral, and DeepSeek).

---

## 🏛️ System Architecture

Callcraft is designed around a clean separation of concerns, decoupling management logic from runtime execution traffic:

```mermaid
graph TD
    Client["Client Applications / External Services"] -->|POST /v1/call<br>Bearer API Key| DataPlane["Data Plane API Gateway<br>(Python 3.12 / FastAPI)"]
    Admin["Admin / Developer Browser"] -->|HTTP / Web UI| ControlPlane["Control Plane Dashboard<br>(Next.js 14 / Bun)"]

    subgraph Internal Architecture
        ControlPlane -->|Service Auth / internal/v1/*| DataPlane
        DataPlane -->|Async State / Spec Lookup| Redis["Redis 7<br>(Spec Cache & Outbox)"]
        DataPlane -->|Relational Persistence| Postgres[("PostgreSQL 16<br>(Metadata / Specs / Keys)")]
        DataPlane -->|In-Memory Execution| LLM["Multimodal AI Adapters<br>(Gemini / OpenAI / Claude / DeepSeek)"]
        Worker["Outbox Worker<br>(Python Async Poller)"] -->|Audit / Event Processing| Postgres
        Worker -->|Consume Queue| Redis
    end
```

### Key Design Principles

1. **Separated Control Plane & Data Plane**:
   - **Control Plane (`apps/web`)**: Next.js 14 App Router running on Bun. Provides visual schema design, API key generation, provider configuration, and operational dashboards.
   - **Data Plane (`apps/api`)**: Python 3.12 + FastAPI high-throughput API gateway. Direct execution engine with no Next.js overhead on customer call traffic.
2. **Stateless & Zero Data Retention**:
   - Customer payloads, document images (Base64 or URL streams), and extracted data reside strictly in RAM buffers (`bytes`) during execution.
   - Zero payload or document data is persisted to host storage, S3, or databases.
3. **Provider-Native Tool Calling**:
   - Automatically translates user-defined JSON Schemas into official AI model tool/function calling specifications to guarantee 100% schema-compliant JSON output without prose contamination.
4. **Standardized Wire Envelope & Actionable Errors**:
   - All response envelopes follow a consistent wire format (`meta`, `data`, `execution`, `metrics` or `error`).
   - Every failure provides structured actionable error contracts featuring an explicit `code`, human-readable `message`, itemized `details`, and an `actionableStep`.
5. **Defense-in-Depth Security**:
   - AES-256-GCM authenticated encryption for provider API keys.
   - Argon2id cryptographic password/secret hashing.
   - Strict SSRF (Server-Side Request Forgery) IP/URL filtering on image fetches.
   - Scoped multi-tenant authorization per project and granular RBAC.

---

## 📂 Repository Layout

```text
callcraft/
├── .blueprint/                 # Architecture blueprints, ADRs, & specifications
│   ├── README.md               # Architecture documentation index
│   ├── architecture/           # System overview, security, execution engine, worker
│   ├── specifications/         # Database schema, API spec engine, envelope contracts
│   └── roadmap/                # Tactical phase breakdown & open gaps
│
├── apps/
│   ├── web/                    # CONTROL PLANE: Next.js 14 Dashboard & Monaco Schema Editor
│   ├── api/                    # DATA PLANE: Python FastAPI Gateway & Multimodal Adapters
│   │   ├── main.py             # Uvicorn entrypoint
│   │   ├── src/callcraft_engine/ # Dynamic Tool Generator, Crypto, Coercion, SSRF
│   │   └── tests/              # Pytest engine test suite
│   └── worker/                 # BACKGROUND WORKER: Python Async Outbox Event Poller
│
├── migrations/                 # PostgreSQL DDL migration scripts (16 relational tables)
├── docker/                     # Optimized multi-stage Dockerfiles (API, Web, Worker)
├── docker-compose.yml          # Infrastructure orchestration (Postgres, Redis, API, Worker, Web)
├── pyproject.toml              # Root Python package dependencies & tool settings
├── package.json                # Bun monorepo workspace & script definitions
└── .env.example                # Standardized environment configuration template
```

---

## 🛠️ Tech Stack & Requirements

| Layer | Technologies | Minimum Version |
| :--- | :--- | :--- |
| **Runtime / Tooling** | Python, Bun, Node.js | Python `3.12+`, Bun `1.1+` |
| **Backend (Data Plane)** | FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2, asyncpg | FastAPI `0.111+` |
| **Frontend (Control Plane)** | Next.js 14 (App Router), React 18, TypeScript, Monaco | Next.js `14.2+` |
| **Database & Cache** | PostgreSQL, Redis | PostgreSQL `16+`, Redis `7+` |
| **Containerization** | Docker, Docker Compose | Docker `24.0+`, Compose `v2+` |

---

## ⚡ Quick Start

### 1. Environment Setup

Copy the example configuration file and fill in required secrets:

```bash
cp .env.example .env
```

> **Note**: For production deployments, generate a 32-byte hex key for `MASTER_ENCRYPTION_KEY` via `openssl rand -hex 32`.

### 2. Install Workspace Dependencies

```bash
bun install
```

### 3. Setup & Execution Options

#### Option A: Run Full Stack via Docker Compose (Recommended)

```bash
docker-compose up --build -d
```

Access services at:
- **Web Dashboard**: `http://localhost:3001`
- **Data Plane API**: `http://127.0.0.1:8081`
- **Interactive OpenAPI Documentation**: `http://127.0.0.1:8081/docs`

#### Option B: Hybrid Local Development (Docker Infra + Local App Services)

1. Start database and cache containers:
   ```bash
   docker-compose up -d callcraft-postgres callcraft-redis
   ```

2. Apply database migrations:
   ```bash
   psql -h 127.0.0.1 -p 5432 -U callcraft_user -d callcraft_db -f migrations/0001_initial_schema.sql
   ```

3. Setup Python Virtual Environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```

4. Launch API and Dashboard concurrently:
   ```bash
   bun dev
   ```

---

## 📜 Available Workspace Scripts

Run these scripts from the repository root using `bun`:

| Command | Action |
| :--- | :--- |
| `bun dev` | Runs both Backend API (`:8081`) and Web Dashboard (`:3001`) concurrently |
| `bun run dev:api` | Starts the Python FastAPI Data Plane with Uvicorn hot-reloading |
| `bun run dev:web` | Starts the Next.js Control Plane Dashboard in development mode |
| `bun run build:web` | Builds the production bundle for the Next.js Control Plane |
| `bun run test:api` | Executes backend unit tests & engine test suite with Pytest |
| `bun run test:web` | Executes frontend tests for the Next.js app |

---

## 📡 API Usage & Execution Example

Customers send execution requests to the public Data Plane API endpoint `POST /v1/call` using standard headers and Bearer API key authentication:

### Request Example (`cURL`):

```bash
curl -X POST "http://127.0.0.1:8081/v1/call" \
  -H "Authorization: Bearer call_sk_live_01HZX89ABCDEF1234567890XYZ" \
  -H "X-USER-ID: usr_01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-SPEC-ID: spc_01HZX89ABCDEF1234567890XYZ" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/identity-sample.jpg",
    "prompt": "Extract identity document details into structured format.",
    "variables": { "country": "ID" }
  }'
```

### Successful Response (`200 OK`):

```json
{
  "success": true,
  "request_id": "req_01HZY9998877665544332211AA",
  "spec": {
    "id": "spc_01HZX89ABCDEF1234567890XYZ",
    "name": "Identity Document Extractor",
    "version": 1
  },
  "execution": {
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "processing_time_ms": 950,
    "tokens": { "total_tokens": 780 }
  },
  "data": {
    "document_number": "3271041508950001",
    "full_name": "BUDI SANTOSO",
    "gender": "MALE"
  }
}
```

### Structured Error Response Example (`422 Unprocessable Entity`):

```json
{
  "success": false,
  "request_id": "req_01HZY9998877665544332211BB",
  "error": {
    "code": "INVALID_IMAGE_URL",
    "message": "The provided image URL failed security checks or could not be downloaded.",
    "details": [
      {
        "field": "image",
        "reason": "URL points to a private IP range (SSRF protection triggered)."
      }
    ],
    "actionableStep": "Provide a publicly reachable HTTP/HTTPS image URL."
  }
}
```

---

## 🧪 Testing & Code Quality

Callcraft maintains comprehensive test suites for core execution logic, crypto helpers, SSRF protections, and API routes.

```bash
# Run backend pytest suite
bun run test:api

# Run frontend tests
bun run test:web
```

---

## 📘 Architecture Blueprints & Reference Docs

For deeper insights into system internals, database DDL, and RFC-style architecture specifications, refer to the `.blueprint/` directory:

- 📖 [System Architecture Overview](.blueprint/architecture/system-overview.md)
- 🔐 [Security, Crypto & Auth Specifications](.blueprint/architecture/security-and-auth.md)
- 🚀 [Execution Engine Internals](.blueprint/architecture/execution-engine.md)
- 🗄️ [Database Schema & Table Specifications](.blueprint/specifications/database-schema.md)
- ⚡ [API Endpoint Specification](.blueprint/specifications/api-endpoints.md)
- 📐 [Envelope & Error Contract Standard](.blueprint/specifications/envelope-contract.md)
- 🧪 [Testing Strategy & Test Pyramid](.blueprint/specifications/testing-strategy.md)
- 🗺️ [Implementation Roadmap](.blueprint/roadmap/implementation-phases.md)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).


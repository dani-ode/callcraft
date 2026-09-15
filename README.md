# Callcraft — Enterprise Dynamic Multimodal AI Execution Engine & API Platform

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-fbf0df.svg?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-000000.svg?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-8A2BE2.svg?style=for-the-badge)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Callcraft** is an enterprise-grade, high-throughput **Dynamic Multimodal AI Execution Engine & Control Plane**. It empowers developers and engineering teams to visually define custom extraction contracts, compose dynamic input/output JSON schemas, and execute deterministic structured document and vision extraction across leading vision-language models (VLMs)—including **Google Gemini**, **OpenAI GPT-4o**, **Anthropic Claude 3.5/3.7**, **Mistral**, **DeepSeek**, and OpenAI-compatible gateways.

---

## 📑 Table of Contents

- [Key Capabilities & Enterprise Features](#-key-capabilities--enterprise-features)
- [System Architecture](#-system-architecture)
  - [Architectural Topology](#architectural-topology)
  - [Core Components Breakdown](#core-components-breakdown)
- [Repository Layout](#-repository-layout)
- [Tech Stack & Prerequisites](#-tech-stack--prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Environment Setup](#1-environment-setup)
  - [2. Option A: Full-Stack Docker Compose (Production)](#2-option-a-full-stack-docker-compose-production)
  - [3. Option B: Local Monorepo Development (Hybrid)](#3-option-b-local-monorepo-development-hybrid)
- [Workspace Scripts & Makefile Reference](#-workspace-scripts--makefile-reference)
- [Data Plane API Reference & Wire Contracts](#-data-plane-api-reference--wire-contracts)
  - [Authentication Protocol](#authentication-protocol)
  - [Data Plane Endpoints](#data-plane-endpoints)
  - [Execution Request & Envelope Examples](#execution-request--envelope-examples)
  - [Multi-Language Client Implementation Snippets](#multi-language-client-implementation-snippets)
- [Workflow Automation & Low-Code Integrations](#-workflow-automation--low-code-integrations)
  - [n8n Community Node & Workflow](#n8n-community-node--workflow)
  - [Langflow Custom Component & Flow](#langflow-custom-component--flow)
- [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
- [Enterprise Security, Governance & Compliance](#-enterprise-security-governance--compliance)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Architecture Blueprints & Deep Dives](#-architecture-blueprints--deep-dives)
- [License](#-license)

---

## 🌟 Key Capabilities & Enterprise Features

- ⚡ **Universal Header-Routed Data Plane (`POST /v1/call`)**: Execute any registered extraction contract dynamically via a single, standardized REST endpoint routed by headers.
- 🛠️ **Provider-Native Tool & Function Calling Compilation**: Automatically compiles user-defined JSON Schemas into native tool-calling definitions (Gemini Tools, OpenAI Function Calling, Claude Tool Use, Mistral Tools, DeepSeek Tools) ensuring 100% deterministic, type-coerced JSON with zero conversational markdown artifacts.
- 🔍 **Automated Schema & Project Discovery**: Public inspection endpoints (`GET /v1/projects`, `GET /v1/specs`) expose dynamic prompt variable requirements (e.g. `{{invoiceNumber}}`), input formats, and field constraints for workflow automation.
- 🔒 **Stateless In-Memory Processing & Zero Data Retention**: Binary documents, Base64 payloads, and remote URLs are ingested strictly into ephemeral in-memory RAM buffers (`bytes`). Document buffers are purged immediately upon inference completion—zero customer payload data is written to disk, S3, or database.
- 🛡️ **Enterprise Defense-in-Depth Security**:
  - **Dual-Key Cryptographic Authentication**: Pairing `X-CALL-PUBLIC-KEY` with `Authorization: Bearer <secret_key>` verified via Argon2id hashing.
  - **Multi-Tenant Project Scoping**: Strict project-level boundary isolation preventing cross-project resource execution.
  - **Configurable IP Whitelisting**: Granular CIDR subnet and discrete IP validation at the gateway level.
  - **Active SSRF Protection**: In-flight RFC 1918, loopback, link-local IP filtering, and DNS resolution pinning prevent server-side request forgery attacks.
  - **AES-256-GCM Envelope Encryption**: Provider API tokens and sensitive credentials stored encrypted at rest.
- 📐 **Strict `camelCase` Wire Envelopes**: All responses strictly adhere to a standardized wire schema (`meta`, `data`, `executionTrace`, `metrics`, or `error`) containing granular execution steps, token usage, latency breakdowns, and actionable remediation steps.
- 🤖 **Built-in Model Context Protocol (MCP) Server**: Full JSON-RPC 2.0 (`/mcp/v1/rpc`) and SSE (`/mcp/v1/sse`) server allowing AI coding assistants (Cursor, Claude Desktop, Antigravity) to manage, build, test, and export Callcraft specs directly from an IDE.
- 🔄 **First-Class Low-Code Integrations**: Out-of-the-box custom nodes and components for **n8n** and **Langflow** with dynamic project/spec pickers and binary streaming.
- 📊 **Visual Schema Studio & Monaco Code Editor**: Construct complex nested object schemas, arrays, enums, regex rules, and currency validations visually or via an embedded Monaco editor with live schema validation.
- 🧪 **Live Testing Playground**: Test Call Specs against sample documents or direct webcam captures with dynamic variable injection, negative prompts, and real-time cost estimation.
- 📦 **Pre-Configured Template Blueprints**: Ready-to-deploy blueprints for National Identity Cards (KTP, Passports, Driver Licenses), Invoices, Receipts, Medical Records, Legal Contracts, and Bank Statements.

---

## 🏛️ System Architecture

Callcraft enforces a strict separation of concerns, completely decoupling developer management workflows (Control Plane) from high-throughput runtime execution traffic (Data Plane):

### Architectural Topology

```mermaid
graph TD
    Client["Client Services / External Applications"] -->|POST /v1/call<br>Dual-Key Auth + Headers| DataPlane["Data Plane API Gateway<br>(Python 3.12 / FastAPI)"]
    Agents["AI Agents & IDEs<br>(Cursor / Claude Desktop / Antigravity)"] -->|JSON-RPC 2.0 / SSE<br>/mcp/v1/rpc| DataPlane
    Workflows["Workflow Automation<br>(n8n / Langflow)"] -->|GET /v1/projects<br>GET /v1/specs<br>POST /v1/call| DataPlane
    Admin["Developer / Admin Browser"] -->|HTTP / Web UI| ControlPlane["Control Plane Dashboard<br>(Next.js 14 / Bun)"]

    subgraph Internal Architecture
        ControlPlane -->|Service Auth / internal/v1/*| DataPlane
        DataPlane -->|Spec Cache & Outbox Queue| Redis["Redis 7<br>(In-Memory Cache & Streams)"]
        DataPlane -->|Relational Persistence| Postgres[("PostgreSQL 16<br>(Metadata / Specs / Keys)")]
        DataPlane -->|Ephemeral In-Memory RAM Inference| LLM["Multimodal AI Adapters<br>(Gemini / OpenAI / Claude / Mistral / DeepSeek)"]
        Worker["Background Outbox Worker<br>(Python Async Poller)"] -->|Consume Queue| Redis
        Worker -->|Audit / Telemetry Logging| Postgres
    end
```

### Core Components Breakdown

1. **Control Plane (`apps/web`)**: Next.js 14 (App Router) running on Bun. Provides visual schema composition, API credential management, interactive playground execution, team RBAC, and template management.
2. **Data Plane (`apps/api`)**: Asynchronous Python 3.12 + FastAPI gateway. Engineered for low-latency, high-concurrency API execution, provider tool compilation, schema coercion, and SSRF filtering.
3. **Model Context Protocol Server (`apps/api/src/callcraft_api/routers/mcp.py`)**: MCP interface allowing AI agents to discover, create, update, export, and inspect Callcraft specs programmatically.
4. **Background Outbox Worker (`apps/worker`)**: Dedicated Python asynchronous worker consuming Redis outbox streams and persisting audit/telemetry logs into PostgreSQL without adding latency to the critical execution path.
5. **Adapter Engine (`apps/api/src/callcraft_engine`)**: Pluggable multimodal engine normalizing vision prompts, native tool generation, error translation, and type coercion across AI providers.

---

## 📂 Repository Layout

```text
callcraft/
├── .blueprint/                 # Architectural blueprints, ADRs, & specifications
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
│   ├── api/                    # DATA PLANE: Python FastAPI Gateway, MCP & Adapter Engine
│   │   ├── main.py             # Uvicorn gateway entrypoint
│   │   ├── src/callcraft_api/  # Routers (Public, Internal, Auth, MCP), DB, Services, Middleware
│   │   ├── src/callcraft_engine/# Adapters, Tool Generator, Crypto, Coercion, SSRF Guard
│   │   └── tests/              # Pytest engine & integration test suite (57+ test cases)
│   └── worker/                 # BACKGROUND WORKER: Async Redis Outbox & Audit Processor
│       └── main.py             # Worker loop entrypoint
│
├── integrations/               # Low-Code & Automation Ecosystem
│   ├── n8n/                    # n8n Integration
│   │   ├── n8n-nodes-callcraft # Custom Community Node (TypeScript)
│   │   ├── Callcraft_Sample_Workflow.json # Importable standard n8n workflow
│   │   └── README.md           # Installation & credential guide
│   └── langflow/               # Langflow Integration
│       ├── callcraft_component.py # Custom Python Langflow Component
│       ├── callcraft_sample_flow.json # Importable sample Langflow pipeline
│       └── README.md           # Component configuration guide
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
├── Makefile                    # Workspace lifecycle & automation commands
├── pyproject.toml              # Root Python package dependencies & tool configuration
├── package.json                # Bun monorepo workspace & script definitions
└── .env.example                # Standardized environment configuration template
```

---

## 🛠️ Tech Stack & Prerequisites

| Layer | Technologies | Version / Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| **Monorepo & Frontend Runtime** | [Bun](https://bun.sh/) | `v1.1+` | Package manager, script runner, and frontend runtime |
| **Backend Runtime** | [Python](https://www.python.org/) | `v3.12+` | Async core API, AI adapters, and worker daemon |
| **API Framework** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [Pydantic v2](https://docs.pydantic.dev/) | FastAPI `0.111+`, Pydantic `2.7+` | High-performance asynchronous REST & MCP gateway |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) | Next.js `14.2+`, React `18+` | Control Plane dashboard, Monaco editor, playground |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [SQLAlchemy 2](https://www.sqlalchemy.org/) (AsyncIO), [asyncpg](https://github.com/MagicStack/asyncpg) | PostgreSQL `16+` | Relational persistence for specs, users, and audit logs |
| **In-Memory Cache & Streams** | [Redis](https://redis.io/), [redis-py](https://github.com/redis/redis-py) (AsyncIO) | Redis `7+` | Spec caching and asynchronous audit outbox queue |
| **Cryptography & Security** | [cryptography](https://cryptography.io/) (AES-256-GCM), [argon2-cffi](https://argon2-cffi.readthedocs.io/) | Argon2id, AES-GCM | Dual-key verification and provider secret encryption |
| **AI Adapters Supported** | Google Gemini, OpenAI GPT-4o, Anthropic Claude, Mistral, DeepSeek | Native Tool Calling APIs | Deterministic multimodal structured extraction |
| **Containerization** | [Docker](https://www.docker.com/), Docker Compose | Docker `24.0+`, Compose `v2+` | Multi-container isolated execution |

---

## ⚡ Quick Start Guide

### 1. Environment Setup

Clone the repository and copy the environment configuration template:

```bash
git clone https://github.com/dani-ode/callcraft.git
cd callcraft
cp .env.example .env
```

> [!IMPORTANT]
> For production deployments, generate a cryptographically secure 32-byte hex key for `MASTER_ENCRYPTION_KEY`:
> ```bash
> openssl rand -hex 32
> ```

---

### 2. Option A: Full-Stack Docker Compose (Production)

Run the entire platform (PostgreSQL 16, Redis 7, FastAPI Gateway, Background Worker, and Next.js Dashboard) in isolated Docker containers:

```bash
# Using Makefile
make up

# Or directly using Docker Compose
docker compose up --build -d
```

#### Service Port Endpoints (Docker Mode)

| Service | Endpoint URL | Description |
| :--- | :--- | :--- |
| **Control Plane Web Dashboard** | [http://localhost:3000](http://localhost:3000) | Web Dashboard, Schema Studio & Playground |
| **Data Plane API Gateway** | [http://127.0.0.1:8080](http://127.0.0.1:8080) | Public customer API endpoint (`POST /v1/call`) |
| **Interactive OpenAPI Docs** | [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs) | Swagger UI for interactive API exploration |
| **Model Context Protocol (MCP)** | [http://127.0.0.1:8080/mcp/v1/rpc](http://127.0.0.1:8080/mcp/v1/rpc) | JSON-RPC 2.0 endpoint for AI coding assistants |

---

### 3. Option B: Local Monorepo Development (Hybrid)

For active local development with live hot-reloading:

1. **Spin up database and cache containers**:
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
   # Install frontend & monorepo tools using Bun
   bun install

   # Setup Python virtual environment & backend packages
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```

4. **Launch API Gateway and Web Dashboard concurrently**:
   ```bash
   # Using Makefile
   make dev

   # Or using Bun
   bun dev
   ```

#### Service Port Endpoints (Local Dev Mode)

| Service | Endpoint URL | Description |
| :--- | :--- | :--- |
| **Control Plane Web Dashboard** | [http://localhost:3001](http://localhost:3001) | Next.js with hot reload |
| **Data Plane API Gateway** | [http://127.0.0.1:8081](http://127.0.0.1:8081) | Uvicorn with auto reload |
| **Interactive OpenAPI Docs** | [http://127.0.0.1:8081/docs](http://127.0.0.1:8081/docs) | Local Swagger UI |
| **MCP Server Endpoint** | [http://127.0.0.1:8081/mcp/v1/rpc](http://127.0.0.1:8081/mcp/v1/rpc) | Local JSON-RPC 2.0 MCP server |

---

## 📜 Workspace Scripts & Makefile Reference

### Bun Monorepo Commands

| Command | Description |
| :--- | :--- |
| `bun dev` | Starts Data Plane API (`:8081`) and Control Plane Web (`:3001`) concurrently |
| `bun run dev:api` | Starts the Python FastAPI Data Plane with Uvicorn hot reload |
| `bun run dev:web` | Starts the Next.js Control Plane Dashboard in development mode |
| `bun run build:web` | Builds the optimized production bundle for Next.js |
| `bun run test:api` | Executes the complete Pytest backend test suite (57+ unit and integration tests) |

### Makefile Automation Commands

| Make Target | Description |
| :--- | :--- |
| `make help` | Displays available Makefile management commands |
| `make up` | Launches all services via Docker Compose in the background |
| `make down` | Gracefully stops and removes all Docker Compose containers |
| `make restart` | Restarts all running Docker containers |
| `make rebuild` | Prunes old Docker cache, rebuilds images, and restarts services |
| `make logs` | Streams live logs from all Docker containers |
| `make dev` | Starts local dev servers concurrently via `bun dev` |
| `make test` | Runs the full Pytest test suite using `.venv/bin/pytest` |
| `make build-web` | Cleans `.next` cache and compiles the production Next.js bundle |
| `make clean` | Cleans temporary Python bytecode (`__pycache__`) and Next.js artifacts |

---

## 📡 Data Plane API Reference & Wire Contracts

### Authentication Protocol

All customer Data Plane requests require dual-key authentication headers:

```http
Authorization: Bearer <secret_key>
X-CALL-PUBLIC-KEY: <public_key>
X-USER-ID: <user_id>
```

| Header Name | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `Authorization` | **Yes** | Bearer Secret API Key | `Bearer call_sk_live_01HZX89ABCDEF...` |
| `X-CALL-PUBLIC-KEY` | **Yes** | Public Identification Key | `pk_live_01HZX89ABCDEF...` |
| `X-USER-ID` | **Yes** | User account identifier | `usr_01HZX89ABCDEF...` |
| `X-CALL-SPEC-ID` | For `/v1/call` | Call Spec ID or Slug to execute | `identity-card-extractor` |
| `X-CALL-PROVIDER` | Optional | Runtime AI provider override | `gemini`, `openai`, `anthropic`, `mistral`, `deepseek` |
| `X-CALL-SHOW-PROMPT` | Optional | Include compiled positive/negative prompt in trace | `true` or `false` |

---

### Data Plane Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/projects` | Lists all active projects accessible to the authenticated credentials |
| `GET` | `/v1/specs` | Lists specs for user/project or inspects a spec via `?projectId=...` or `?specId=...` |
| `GET` | `/v1/specs/{spec_id_or_slug}` | Retrieves complete spec definition, input schema, and required mustache variables |
| `POST` | `/v1/call` | Executes dynamic multimodal AI extraction against a defined Call Spec |
| `GET` | `/health` | Liveness and readiness health probe |

---

### Execution Request & Envelope Examples

#### 1. Execution Request (`POST /v1/call`)

```bash
curl -X POST "http://127.0.0.1:8081/v1/call" \
  -H "Authorization: Bearer call_sk_live_01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-PUBLIC-KEY: pk_live_01HZX89ABCDEF1234567890XYZ" \
  -H "X-USER-ID: usr_01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-SPEC-ID: identity-card-extractor" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/sample-ktp.jpg",
    "prompt": "Extract all identity card fields with strict accuracy.",
    "negativePrompt": "Do not hallucinate obscured numbers.",
    "variables": {
      "country": "ID"
    }
  }'
```

#### 2. Standardized Success Response (`200 OK`)

All JSON responses follow enterprise `camelCase` naming conventions:

```json
{
  "meta": {
    "requestId": "req_01HZY9998877665544332211AA",
    "traceId": "trc_01HZY9998877",
    "timestamp": "2026-09-15T16:00:00.000000+00:00",
    "status": "completed",
    "apiVersion": "v1.0",
    "executionMode": "sync"
  },
  "data": {
    "primaryResult": {
      "type": "structured_json",
      "content": {
        "nik": "3271041508950001",
        "fullName": "GOTTFRIED WILHELM LEIBNIZ",
        "birthDate": "1995-08-15",
        "gender": "LAKI-LAKI",
        "address": "JL. MERDEKA NO. 45",
        "isVerified": true
      }
    },
    "humanReadableMessage": "Hasil ekstraksi terstruktur 'Identity Card Extractor' berhasil diproses via provider AI 'gemini' (gemini-1.5-flash)."
  },
  "executionTrace": {
    "totalDurationMs": 842,
    "steps": [
      {
        "stepId": "stp_01HZY9998877",
        "agent": "CallcraftEngine",
        "actionType": "TOOL_EXECUTION",
        "toolName": "extract_identity_card",
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

#### 3. Standardized Actionable Error Envelope (`422 / 400 / 403 / 401`)

```json
{
  "meta": {
    "requestId": "req_01HZY9998877665544332211BB",
    "timestamp": "2026-09-15T16:00:00.000000+00:00",
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
    "totalDurationMs": 12,
    "steps": [],
    "warnings": []
  }
}
```

---

### Multi-Language Client Implementation Snippets

#### Python (`httpx`)

```python
import httpx

API_BASE_URL = "http://127.0.0.1:8081"
HEADERS = {
    "Authorization": "Bearer call_sk_live_01HZX89ABCDEF1234567890XYZ",
    "X-CALL-PUBLIC-KEY": "pk_live_01HZX89ABCDEF1234567890XYZ",
    "X-USER-ID": "usr_01HZX89ABCDEF1234567890XYZ",
    "X-CALL-SPEC-ID": "invoice-parser",
    "Content-Type": "application/json",
}

payload = {
    "image": "https://example.com/sample-invoice.pdf",
    "prompt": "Extract line items and grand totals accurately.",
    "variables": {"department": "Finance"},
}

with httpx.Client(base_url=API_BASE_URL, timeout=60.0) as client:
    response = client.post("/v1/call", headers=HEADERS, json=payload)
    response.raise_for_status()
    result = response.json()
    print("Extracted Data:", result["data"]["primaryResult"]["content"])
```

#### TypeScript / JavaScript (`fetch`)

```typescript
interface CallcraftSuccessResponse<T = Record<string, unknown>> {
  meta: { requestId: string; timestamp: string; status: string };
  data: {
    primaryResult: { type: string; content: T };
    humanReadableMessage: string;
  };
  metrics: { usage: { totalTokens: number }; estimatedCostUsd: number };
}

async function executeCallcraftSpec<T>(
  specId: string,
  documentUrlOrBase64: string,
  variables: Record<string, string> = {}
): Promise<T> {
  const response = await fetch("http://127.0.0.1:8081/v1/call", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CALLCRAFT_SECRET_KEY}`,
      "X-CALL-PUBLIC-KEY": process.env.CALLCRAFT_PUBLIC_KEY!,
      "X-USER-ID": process.env.CALLCRAFT_USER_ID!,
      "X-CALL-SPEC-ID": specId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: documentUrlOrBase64,
      variables,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Callcraft Error [${body.error?.code}]: ${body.error?.message}`);
  }

  return (body as CallcraftSuccessResponse<T>).data.primaryResult.content;
}
```

---

## 🔄 Workflow Automation & Low-Code Integrations

Callcraft includes turnkey integrations for leading open-source automation platforms in the [`integrations/`](integrations/) directory:

### n8n Community Node & Workflow

- **Custom Community Node (`integrations/n8n/n8n-nodes-callcraft`)**:
  - Dynamically populates **Projects** (`GET /v1/projects`) and **Call Specs** (`GET /v1/specs?projectId=...`) directly into n8n dropdown menus.
  - Supports **Binary File** input (from Telegram, Email, Google Drive, or Webhook nodes), **Image/PDF URL**, **Base64 string**, or **Text Only**.
  - Includes instant credential testing and structured output mapping.
- **Ready-to-Use Workflow (`integrations/n8n/Callcraft_Sample_Workflow.json`)**:
  - Importable JSON workflow covering project discovery, spec resolution, and document extraction.
  - See [n8n Integration Documentation](integrations/n8n/README.md) for step-by-step setup.

### Langflow Custom Component & Flow

- **Custom Python Component (`integrations/langflow/callcraft_component.py`)**:
  - Drag-and-drop custom component for Langflow canvases.
  - Interactive project and spec pickers that refresh on-demand.
  - Returns type-safe `Data` and `Message` objects ready for downstream LLM or agent nodes.
- **Sample Pipeline (`integrations/langflow/callcraft_sample_flow.json`)**:
  - Complete flow demonstration ready for instant import.
  - See [Langflow Integration Documentation](integrations/langflow/README.md) for full guide.

---

## 🤖 Model Context Protocol (MCP) Server

Callcraft provides native **Model Context Protocol (MCP)** server compliance, allowing AI coding assistants (such as Claude Desktop, Cursor, and Antigravity) to inspect, create, modify, and execute specs directly within your development environment.

### Endpoints

- **JSON-RPC 2.0**: `POST /mcp/v1/rpc`
- **Server-Sent Events (SSE)**: `GET /mcp/v1/sse`

### Configuration for Claude Desktop / Cursor

Add Callcraft to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "callcraft": {
      "command": "curl",
      "args": [
        "-s",
        "-X", "POST",
        "http://127.0.0.1:8080/mcp/v1/rpc",
        "-H", "Content-Type: application/json",
        "-H", "X-USER-ID: usr_01HZX89ABCDEF1234567890XYZ",
        "-d", "@-"
      ]
    }
  }
}
```

### Supported MCP Tools

| Tool Name | Description |
| :--- | :--- |
| `callcraft_list_projects` | Lists all projects accessible to the user context |
| `callcraft_list_specs` | Lists specs filtered by project or tag |
| `callcraft_get_spec` | Retrieves complete schema and prompt configuration for a spec |
| `callcraft_get_spec_section` | Reads a specific spec section (`schema`, `prompt`, `variables`) |
| `callcraft_create_spec` | Creates a new extraction Call Spec programmatically |
| `callcraft_update_spec` | Updates an existing Call Spec definition |
| `callcraft_update_spec_section` | Surgically edits a specific section of a spec |
| `callcraft_delete_spec` | Soft-deletes or archives a Call Spec |
| `callcraft_export_spec_json` | Exports full spec configuration as portable JSON |
| `callcraft_import_spec_json` | Imports and validates a spec configuration from JSON |

---

## 🛡️ Enterprise Security, Governance & Compliance

1. **Strict Zero Data Retention**: All document buffers (`bytes`) are ephemeral in RAM. Payloads are never written to disk, object storage, or logs.
2. **SSRF Protection & DNS Pinning**: All remote URLs are evaluated prior to fetching. RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), AWS metadata endpoints (`169.254.169.254`), and loopback addresses (`127.0.0.1`) are immediately blocked with typed `SSRF_SECURITY_VIOLATION` errors.
3. **Argon2id & AES-256-GCM Cryptography**: Secret API keys are hashed with Argon2id. Upstream AI provider API keys are encrypted with AES-256-GCM using `MASTER_ENCRYPTION_KEY`.
4. **IP Whitelisting**: Per-key IP access control supporting discrete IPs (`203.0.113.10`) and CIDR ranges (`198.51.100.0/24`).
5. **Project-Scoped RBAC**: API keys can be bound to specific projects, preventing unauthorized cross-project extraction execution.

---

## 🧪 Testing & Quality Assurance

Callcraft includes comprehensive backend test coverage spanning adapters, tool compilers, cryptographic routines, SSRF guards, rate limiting, and API routes:

```bash
# Execute Pytest test suite (57+ tests)
bun run test:api

# Or via Makefile
make test
```

### Test Coverage Highlights

- `test_adapters.py`: Multimodal payload transformation across Gemini, OpenAI, Claude, Mistral, DeepSeek.
- `test_tool_generator.py`: Type coercion and schema compilation into provider-native tool calling syntax.
- `test_ssrf.py`: Verification of private IP blocking, DNS rebinding guards, and URL validation.
- `test_crypto.py`: Verification of AES-256-GCM authenticated encryption and Argon2id key verification.
- `test_ip_whitelist.py`: Verification of CIDR ranges, multiple subnet matching, and forbidden IP rejection.
- `test_mcp_and_spec_export.py`: Full MCP JSON-RPC protocol testing and spec import/export validation.
- `test_public_integrations.py`: Public Data Plane endpoints (`/v1/projects`, `/v1/specs`, `/v1/call`).

---

## 📘 Architecture Blueprints & Deep Dives

For in-depth architectural specifications, ADRs, and implementation design documents, explore the [`.blueprint/`](.blueprint/) directory:

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

Callcraft is licensed under the [MIT License](LICENSE).

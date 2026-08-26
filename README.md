# Callcraft — AI-Powered Dynamic Multimodal API Execution Engine

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-orange.svg?style=flat&logo=bun)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg?style=flat&logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Callcraft** is a high-speed, AI-powered **Dynamic Multimodal API Execution Engine**. It empowers users to visually design custom API contracts, define dynamic request and response schemas, and execute 100% precision structured document & data processing by leveraging state-of-the-art AI Vision & LLM Models (Google Gemini 1.5, OpenAI GPT-4o, Anthropic Claude, and DeepSeek).

---

## ⚡ Core Features & Architectural Highlights

- 🔒 **Stateless Privacy-First Data Processing**: Image/document files (Base64 or URL downloads) and context payloads are strictly processed in RAM buffers (`bytes`) during execution and immediately dropped from memory. **No files are ever saved to host disk, S3, MinIO, or databases.**
- 🚀 **Separated Control Plane & Data Plane**:
  - **Control Plane (`Next.js` with Bun)**: Visual dashboard for users and admins to manage API specs, input templates, AI provider credentials, and analytics.
  - **Data Plane (`Python / FastAPI`)**: High-performance API Gateway and Execution Engine that directly handles customer execution traffic without bottlenecks.
- 🤖 **Dynamic Tool & Function Calling Engine**: Automatically translates user-defined JSON Schemas into official AI Vision *Tool Calling Specs* to guarantee 100% valid JSON responses.
- 🛡️ **Multi-Tier Security & Authentication**:
  - **Service Auth**: Internal communication between Next.js Server ➔ Python (`/internal/v1/*`).
  - **Customer Auth**: Public execution API (`/v1/call`) via Bearer API Key (`call_sk_...`) & `X-USER-ID` header.
  - **Admin Auth**: Granular access control based on Role-Based Access Control (**RBAC**).
  - **Security Safeguards**: AES-256-GCM encryption for provider API keys, Argon2id hashing for secret keys, and strict SSRF URL validation.

---

## 📂 Repository Monorepo Structure

```text
callcraft/
├── .blueprint/                 # Complete Architecture Blueprint & Q&A Specifications
│   ├── README.md               # Master index of architectural blueprints
│   ├── architecture/           # System overview, Security/Auth, Deployment specs
│   ├── specifications/         # Database DDL (16 tables), API Spec engine, Endpoints, Testing Strategy
│   └── roadmap/                # Tactical implementation roadmap (Phase 1-6)
│
├── apps/
│   ├── web/                    # FRONTEND: Next.js 14 Dashboard & Visual Schema Builder (Bun Runtime)
│   ├── api/                    # BACKEND API: Python FastAPI Data Plane Gateway & Execution Engine
│   │   ├── main.py
│   │   ├── src/callcraft_engine/ # Shared Engine (Tool Generator, Coercion, Crypto, SSRF)
│   │   └── tests/              # Pytest Unit & Engine Test Suite
│   └── worker/                 # WORKER: Python Async Outbox Logger
│
├── migrations/                 # PostgreSQL 16+ DDL Migration SQL Scripts (16 Relational Tables)
├── docker/                     # Dockerfiles (Python FastAPI Multi-Stage & Bun Next.js)
├── docker-compose.yml          # Multi-Container Setup (Web, API, Worker, Postgres, Redis)
├── pyproject.toml              # Root Python 3.12 Workspace Manifest
├── requirements.txt            # Python Dependencies List
└── .env.example                # Environment Variable Template
```

---

## 🛠️ Prerequisites

Ensure your environment meets the following requirements before running the application:
- **Python**: `3.12+`
- **Bun**: `v1.1+`
- **Docker & Docker Compose**: `v24.0+`
- **PostgreSQL**: `v16+` (If running without Docker)
- **Redis**: `v7+` (If running without Docker)

---

## 🚀 Quick Start (Local Development)

### 1. Clone Repository & Environment Setup
```bash
cp .env.example .env
bun install
```

### 2. Start Infrastructure Services (PostgreSQL & Redis)
```bash
docker-compose up -d callcraft-postgres callcraft-redis
```

### 3. Run Database Migrations
```bash
psql -h 127.0.0.1 -U callcraft_user -d callcraft_db -f migrations/0001_initial_schema.sql
```

### 4. Run Both Backend & Frontend (Single-Command Option A)
```bash
bun dev
```
*The Data Plane API will run at `http://127.0.0.1:8081` and the Web Dashboard at `http://localhost:3001`.*

---

### Individual Service Commands:

- **Start Python Backend Data Plane API (`apps/api`)**:
  ```bash
  bun run dev:api
  ```
  *Data Plane API available at `http://127.0.0.1:8081`.*

- **Start Next.js Web Dashboard (`apps/web`)**:
  ```bash
  bun run dev:web
  ```
  *Control Plane Dashboard available at `http://localhost:3001`.*

- **Run Pytest Backend Test Suite**:
  ```bash
  bun run test:api
  ```

---

## 📡 Usage Example (Public Callcraft API Execution)

After creating a Callcraft API specification and generating an API Key in the Dashboard, external applications can execute API calls via HTTP `POST`:

```bash
curl -X POST "http://127.0.0.1:8081/v1/call" \
  -H "Authorization: Bearer call_sk_sample_key_1234567890" \
  -H "X-USER-ID: 01HZX89ABCDEF1234567890XYZ" \
  -H "X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/ktp-sample.jpg",
    "prompt": "Verify national identity number structure",
    "variables": { "environment": "production" }
  }'
```

### Sample Response (`200 OK`):
```json
{
  "success": true,
  "request_id": "req_01HZY9998877665544332211AA",
  "spec": {
    "id": "01HZX89ABCDEF1234567890XYZ",
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
    "nik": "3271041508950001",
    "full_name": "BUDI SANTOSO",
    "gender": "MALE"
  }
}
```

---

## 📘 Documentation & Blueprints

Detailed technical specifications and architecture design docs are available in the `.blueprint/` directory:
- 📄 [System Architecture Overview](file:///home/dani/Projects/callcraft/.blueprint/architecture/system-overview.md)
- 🔐 [Security & Auth Specifications](file:///home/dani/Projects/callcraft/.blueprint/architecture/security-and-auth.md)
- 🐳 [Deployment & Infrastructure Blueprint](file:///home/dani/Projects/callcraft/.blueprint/architecture/deployment-and-infrastructure.md)
- 🗄️ [Database Schema DDL (16 Tables)](file:///home/dani/Projects/callcraft/.blueprint/specifications/database-schema.md)
- ⚙️ [Dynamic API Specification Engine](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-spec-engine.md)
- 🧪 [Professional Testing Strategy](file:///home/dani/Projects/callcraft/.blueprint/specifications/testing-strategy.md)
- 🗺️ [Implementation Roadmap](file:///home/dani/Projects/callcraft/.blueprint/roadmap/implementation-phases.md)

---

## 📜 License

This project is licensed under the MIT License.

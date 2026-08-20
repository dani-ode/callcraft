# Implementation Roadmap — Actionable Execution Phases

This document provides a tactical execution roadmap for building **Callcraft** from initial monorepo setup to production deployment on VPS infrastructure. The roadmap is structured into **6 Tactical Execution Phases**.

---

## 🧭 Executive Summary of Phases

```text
Phase 1: Project Scaffolding & Workspace Setup (Python + Bun)
  │
  ▼
Phase 2: Database Migrations & Domain Data Access Layer
  │
  ▼
Phase 3: Python Dynamic Multimodal Execution Engine & AI Adapters
  │
  ▼
Phase 4: Next.js + Bun Dashboard & Visual Schema Builder
  │
  ▼
Phase 5: Security Hardening, Rate Limiter & Async Outbox Worker
  │
  ▼
Phase 6: Dockerization, Apache VPS Deployment & E2E Audit
```

---

## 🛠️ Phase 1: Project Scaffolding & Workspace Setup

- [x] **1.1. Monorepo Structure Initialization**:
  - Create monorepo directory layout: `apps/web` (Next.js with Bun), `apps/api` (Python 3.12 FastAPI), `apps/worker` (Python Worker).
  - Configure root `pyproject.toml` and `requirements.txt` for Python dependencies.
  - Set up Bun (`package.json`, `bun.lockb`, `pyrightconfig.json`) in `apps/web` and workspace root.
- [x] **1.2. Environment & Tooling Configuration**:
  - Configure `.env.example` and `.env` for database (`callcraft_db`), Redis connection strings, and encryption keys.
  - Configure Tailwind CSS, shadcn/ui, and TypeScript in Next.js with Bun runtime.
  - Set up FastAPI, Pydantic v2, Uvicorn, Asyncpg, and Cryptography in Python.

---

## 🗄️ Phase 2: Database Migrations & Data Access Layer

- [ ] **2.1. Execute Migration SQL**:
  - Run PostgreSQL DDL migration scripts (Tables `users`, `roles`, `permissions`, `call_specs`, `api_credentials`, `api_requests`, etc.).
  - Seed initial provider data (`ai_providers` for Gemini, OpenAI, Anthropic, DeepSeek), `ai_models`, and official platform `templates`.
- [ ] **2.2. Implement Python Asyncpg/SQLAlchemy Models & Redis Cache Layer**:
  - Build Data Access Layer for `call_specs`, `api_credentials`, and user AI provider key persistence.
  - Implement Redis client module for spec caching (`setex` with 3600-second TTL).

---

## ⚙️ Phase 3: Python Dynamic Multimodal Execution Engine & AI Adapters

- [ ] **3.1. Implement In-Memory Buffer Handler**:
  - Build FastAPI extractor for Base64 stream decoding directly into RAM `bytes` objects.
  - Implement `httpx` async HTTP client to stream-download URLs into RAM `bytes` with a 10-second timeout.
- [ ] **3.2. Implement AI Provider Adapters**:
  - **Gemini Adapter**: Google AI Studio REST API / SDK integration supporting Structured Output Tool Calling.
  - **OpenAI Adapter**: GPT-4o Chat Completions API integration with `tools` function calling specs.
  - **Anthropic / DeepSeek Adapters**: Multi-provider support for structured JSON generation.
- [ ] **3.3. Implement Tool Generator & Post-Processing Validator**:
  - Build converter transforming user `response_schema` into standard JSON Tool Calling Specs.
  - Implement Pydantic validation & *Type Coercion Engine* (String to Date, Number string to Int, Enum validation).

---

## 💻 Phase 4: Next.js + Bun Dashboard & Visual Schema Builder

- [ ] **4.1. Authentication & User Profile Dashboard**:
  - Create Sign Up, Login, and Profile management pages.
  - AI Provider Key management UI (Gemini, OpenAI, Anthropic) with live key validation.
  - Customer API Key pair generator (`pk_live_...` and `call_sk_live_...`).
- [ ] **4.2. Visual API Schema Builder**:
  - Integrate **React Flow** for visual drag-and-drop request & response schema creation.
  - Integrate **Monaco Editor** for real-time JSON Schema code preview and editing.
  - One-click template marketplace installer (Invoice, Document Parser, Receipt).
- [ ] **4.3. Interactive Playground & Monitoring UI**:
  - Interactive Playground UI for live API execution testing within the dashboard.
  - Analytics dashboard rendering `api_requests` metadata (latency distribution, status codes, token usage, cost tracking).

---

## 🛡️ Phase 5: Security Hardening, Rate Limiter & Async Outbox Worker

- [ ] **5.1. Security Modules Integration**:
  - Integrate AES-256-GCM encryption for stored user API keys.
  - Integrate Argon2id hashing for customer secret keys (`call_sk_live_...`).
  - Implement SSRF Security Validator blocking private/loopback/cloud metadata IPs on remote URL downloads.
- [ ] **5.2. Token-Bucket Rate Limiter in Redis**:
  - FastAPI middleware checking customer API Key request quotas (default 60 req/min).
- [ ] **5.3. Async Outbox Worker**:
  - Python Data Plane writes execution metadata non-blocking to Redis outbox queues.
  - `callcraft-worker` consumes outbox queues and batch-inserts request logs into PostgreSQL `api_requests`.

---

## 🚀 Phase 6: Dockerization, Apache VPS Deployment & E2E Audit

- [ ] **6.1. Container Build & Testing**:
  - Build multi-stage `docker/api.Dockerfile` (Python 3.12-slim), `docker/worker.Dockerfile`, and `docker/web.Dockerfile` (Bun).
  - Verify container cluster using `docker-compose up --build` in local environment.
- [ ] **6.2. VPS Host Setup & Apache Configuration**:
  - Configure Apache `VirtualHost` configurations on Host VPS (`callcraft-app.conf` & `callcraft-api.conf`).
  - Issue SSL/TLS HTTPS certificates using Certbot / Let's Encrypt.
- [ ] **6.3. E2E Verification & Memory Audit**:
  - Execute external end-to-end API smoke tests via `curl` / Postman against `https://api.yourdomain.com/v1/call/{user_id}`.
  - Confirm 0 bytes of temporary files created on VPS host filesystem after 100+ continuous API executions.

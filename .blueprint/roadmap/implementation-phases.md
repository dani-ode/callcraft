# Implementation Roadmap — Actionable Execution Phases

Dokumen ini berisi peta jalan (*roadmap*) urutan eksekusi pembuatan sistem **OCR Platform** dari awal hingga siap dipublikasikan ke production VPS. Roadmap dibagi menjadi **6 Fase Eksekusi Taktis**.

---

## 🧭 Executive Summary of Phases

```text
Phase 1: Project Scaffolding & Workspace Setup
  │
  ▼
Phase 2: Database Migrations & Domain Data Access Layer
  │
  ▼
Phase 3: Rust Stateless OCR Execution Engine & AI Adapters
  │
  ▼
Phase 4: Next.js Dashboard & Visual Schema Builder
  │
  ▼
Phase 5: Security Hardening, Rate Limiter & Worker Logging
  │
  ▼
Phase 6: Dockerization, Apache VPS Deployment & E2E Audit
```

---

## 🛠️ Phase 1: Project Scaffolding & Workspace Setup

- [ ] **1.1. Inisialisasi Workspace Structure**:
  - Membuat folder monorepo: `apps/web` (Next.js), `apps/api` (Rust Axum), `apps/worker` (Rust Worker), `crates/ocr-engine` (Rust Core Library).
  - Membuat `Cargo.toml` root workspace di Rust.
- [ ] **1.2. Konfigurasi Environment & Tooling**:
  - Menyiapkan `.env.example` dan `.env.local` untuk variable database, Redis, encryption keys.
  - Setup ESLint, Prettier, Tailwind CSS, shadcn/ui di Next.js.
  - Setup `tracing`, `tokio`, `axum`, `sqlx`, `serde` di Rust.

---

## 🗄️ Phase 2: Database Migrations & Data Access Layer

- [ ] **2.1. Eksekusi Migration SQL**:
  - Menjalankan DDL migrasi PostgreSQL (Tabel `users`, `roles`, `permissions`, `ocr_specs`, `api_credentials`, `api_requests`, dll).
  - Seeding data awal `ai_providers` (Gemini, OpenAI), `ai_models` (Gemini 1.5 Flash, GPT-4o), dan `templates` dasar (KTP Indonesia, Invoice).
- [ ] **2.2. Implementasi Rust SQLx Models & Redis Cache Layer**:
  - Membuat repository pattern untuk CRUD `ocr_specs`, `api_credentials`, dan user provider keys.
  - Membuat modul Redis client untuk caching OCR Specs (`set_ex` dengan TTL 3600s).

---

## ⚙️ Phase 3: Rust Stateless OCR Execution Engine & AI Adapters

- [ ] **3.1. Implementasi In-Memory Image Buffer Handler**:
  - Membangun Axum extractor untuk Base64 decoding ke Tokio `Bytes` RAM.
  - Membangun module `reqwest` download URL langsung ke `Bytes` RAM dengan timeout 10 detik.
- [ ] **3.2. Implementasi AI Provider Adapters**:
  - **Gemini Adapter**: Menggunakan REST Google AI Studio API dengan Tool Calling / Structured JSON output.
  - **OpenAI Adapter**: Menggunakan GPT-4o Chat Completions API dengan `tools` parameter function calling.
- [ ] **3.3. Implementasi Tool Generator & Post-Processing Validator**:
  - Membuat converter dari `response_schema` deklaratif ke JSON Tool Spec.
  - Membangun validator dan *Type Coercion Engine* (String to Date, Number string to Int, Enum validation).

---

## 💻 Phase 4: Next.js Dashboard & Visual Schema Builder

- [ ] **4.1. Authentication & Profile Dashboard**:
  - Membuat halaman Sign Up, Login, dan Profile User.
  - Halaman input API Key AI Provider (Gemini & OpenAI) dengan feedback validasi key.
  - Generator API Key Customer (`pk_live_...` dan `sk_live_...`).
- [ ] **4.2. Visual API Schema Builder**:
  - Integrasi **React Flow** untuk membuat editor visual drag-and-drop bidang request & response.
  - Integrasi **Monaco Editor** untuk preview JSON Schema secara langsung.
  - Katalogue Template Dokumen (KTP, SIM, Invoice) sekali klik pasang.
- [ ] **4.3. Playground & Hit Monitoring UI**:
  - Halaman Playground interaktif untuk menguji hit API OCR langsung dari dashboard.
  - Dashboard analytics (tabel `api_requests` metadata: latency, status, token usage, cost).

---

## 🛡️ Phase 5: Security Hardening, Rate Limiter & Async Outbox Worker

- [ ] **5.1. Security Modules Integration**:
  - Implementasi enkripsi AES-256-GCM untuk API Key user di database Rust.
  - Implementasi hashing Argon2id untuk `secret_key_hash` pelanggan.
  - SSRF Security Validator untuk memblokir IP private/loopback/cloud metadata saat mendownload gambar via URL.
- [ ] **5.2. Token-Bucket Rate Limiter di Redis**:
  - Middleware Axum untuk memverifikasi kuota request per API Key (default 60 req/min).
- [ ] **5.3. Async Worker Outbox Logging**:
  - Rust API menuliskan log hit secara non-blocking ke outbox queue.
  - `ocr-worker` memproses outbox queue dan melakukan batch insert metadata ke PostgreSQL `api_requests`.

---

## 🚀 Phase 6: Dockerization, Apache VPS Deployment & E2E Audit

- [ ] **6.1. Container Build & Testing**:
  - Membuat `docker/api.Dockerfile` (Cargo Chef) dan `docker/web.Dockerfile`.
  - Menguji `docker-compose up --build` di lingkungan lokal.
- [ ] **6.2. VPS Host Setup & Apache Configuration**:
  - Menyiapkan `VirtualHost` Apache di VPS Host (`ocr-app.conf` dan `ocr-api.conf`).
  - Generasi sertifikat SSL/TLS HTTPS via Certbot / Let's Encrypt.
- [ ] **6.3. E2E Verification & Smoke Testing**:
  - Uji coba eksekusi eksternal API via `curl` / Postman ke `https://api.yourdomain.com/v1/ocr/{user_id}`.
  - Memastikan 0 bytes file tersisa di filesystem VPS setelah 100+ eksekusi OCR.

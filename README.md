# OCR Platform — AI-Powered Stateless OCR-as-a-Service

[![Rust Workspace](https://img.shields.io/badge/Rust-1.78+-orange.svg?style=flat&logo=rust)](https://www.rust-lang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg?style=flat&logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OCR Platform** adalah platform berbasis AI (*OCR-as-a-Service*) berkecepatan tinggi yang memungkinkan pengguna untuk mendesain kontrak API OCR secara visual, menentukan *request schema* dan *response schema* kustom, serta mengekstraksi data dokumen terstruktur presisi 100% dengan memanfaatkan AI Vision Models (Google Gemini 1.5 & OpenAI GPT-4o).

---

## ⚡ Core Features & Architectural Highlights

- 🔒 **Stateless Privacy-First Document Processing**: File gambar (Base64 atau URL download) hanya diolah di dalam buffer RAM (Tokio `Bytes`) selama eksekusi OCR dan langsung di-*zeroize* / di-drop dari memori. **Tidak ada file yang disimpan ke disk host, S3, MinIO, atau database.**
- 🚀 **Separated Control Plane & Data Plane**:
  - **Control Plane (`Next.js`)**: Dashboard visual bagi pengguna dan admin untuk mengelola API specs, template dokumen, AI provider keys, dan analitik.
  - **Data Plane (`Rust / Axum`)**: High-performance API Gateway dan Execution Engine yang memproses traffic eksekusi customer secara langsung tanpa bottleneck.
- 🤖 **Dynamic Tool & Function Calling Engine**: Mengonversi JSON Schema buatan pengguna secara otomatis menjadi deklarasi *Tool Calling Spec* resmi AI Vision untuk menggaransi respon JSON valid 100%.
- 🛡️ **Multi-Tier Security & Authentication**:
  - **Service Auth**: Komunikasi internal Next.js Server ➔ Rust (`/internal/v1/*`).
  - **Customer Auth**: Eksekusi Public OCR (`/v1/ocr/{user_id}`) dengan Bearer API Key (`sk_live_...`).
  - **Admin Auth**: Hak akses berjenjang berbasis Role-Based Access Control (**RBAC**).
  - **Security Safeguards**: Enkripsi AES-256-GCM untuk API key provider, Argon2id hashing untuk secret key, dan validator SSRF URL.

---

## 📂 Repository Monorepo Structure

```text
ocr-platform/
├── .blueprint/                 # Blueprint Arsitektur Lengkap & Dokumentasi Q&A
│   ├── README.md               # Master index spesifikasi cetak biru
│   ├── architecture/           # System overview, Security/Auth, Deployment specs
│   ├── specifications/         # Database DDL (16 tabel), API Spec engine, Endpoints, Testing Strategy
│   └── roadmap/                # Implementation phases roadmap (Phase 1-6)
│
├── apps/
│   ├── web/                    # FRONTEND: Next.js 14 Dashboard & Visual Schema Builder
│   ├── api/                    # BACKEND API: Rust Axum Data Plane Gateway & Execution Engine
│   └── worker/                 # WORKER: Rust Tokio Async Outbox Logger
│
├── crates/
│   └── ocr-engine/             # RUST LIBRARY: Shared Engine (Tool Generator, Coercion, Crypto, SSRF)
│
├── migrations/                 # PostgreSQL 16+ DDL Migration SQL Scripts (16 Tabel Relasional)
├── docker/                     # Dockerfiles (Cargo Chef Multi-Stage & Standalone Next.js)
├── docker-compose.yml          # Multi-Container Setup (Web, API, Worker, Postgres, Redis)
├── Cargo.toml                  # Root Workspace Manifest Rust
└── .env.example                # Template Variabel Lingkungan
```

---

## 🛠️ Prerequisites

Pastikan perangkat Anda memenuhi syarat berikut sebelum menjalankan aplikasi:
- **Rust**: `1.78.0` atau yang lebih baru
- **Node.js**: `v20.0.0` atau yang lebih baru
- **Docker & Docker Compose**: `v24.0+`
- **PostgreSQL**: `v16+` (Jika dijalankan tanpa Docker)
- **Redis**: `v7+` (Jika dijalankan tanpa Docker)

---

## 🚀 Quick Start (Local Development)

### 1. Clone Repository & Environment Setup
```bash
cp .env.example .env
```

### 2. Jalankan Infrastructure Services (PostgreSQL & Redis)
```bash
docker-compose up -d ocr-postgres ocr-redis
```

### 3. Jalankan Database Migration
```bash
# Menggunakan sqlx-cli (opsional) atau import file migration
psql -h 127.0.0.1 -U ocr_user -d ocr_platform -f migrations/0001_initial_schema.sql
```

### 4. Jalankan Rust Backend Data Plane API (`apps/api`)
```bash
cargo run --bin ocr-api
```
*API Data Plane akan berjalan pada address `http://127.0.0.1:8080`.*

### 5. Jalankan Next.js Web Dashboard (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```
*Dashboard Control Plane akan berjalan pada address `http://localhost:3000`.*

---

## 📡 Usage Example (Public OCR API Execution)

Setelah membuat spesifikasi OCR dan menggenerasi API Key di Dashboard, aplikasi eksternal dapat melakukan eksekusi OCR dengan mengirimkan request HTTP `POST`:

```bash
curl -X POST "http://127.0.0.1:8080/v1/ocr/01HZX89ABCDEF1234567890XYZ" \
  -H "Authorization: Bearer ocr_sk_sample_key_1234567890" \
  -H "X-OCR-SPEC-ID: 01HZX89ABCDEF1234567890XYZ" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/ktp-sample.jpg",
    "prompt": "Pastikan NIK terverifikasi 16 digit"
  }'
```

### Sample Response (`200 OK`):
```json
{
  "success": true,
  "request_id": "req_01HZY9998877665544332211AA",
  "execution": {
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "processing_time_ms": 1120,
    "tokens": { "total_tokens": 890 }
  },
  "data": {
    "nik": "3271041508950001",
    "full_name": "BUDI SANTOSO",
    "gender": "LAKI-LAKI",
    "birth": {
      "place": "BOGOR",
      "date": "1995-08-15"
    }
  }
}
```

---

## 📘 Documentation & Blueprints

Spesifikasi teknis dan acuan arsitektur mendalam dapat diakses pada folder `.blueprint/`:
- 📄 [System Architecture Overview](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/system-overview.md)
- 🔐 [Security & Auth Specifications](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/security-and-auth.md)
- 🐳 [Deployment & Infrastructure Blueprint](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/deployment-and-infrastructure.md)
- 🗄️ [Database Schema DDL (16 Tables)](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/database-schema.md)
- ⚙️ [Dynamic API Specification Engine](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/api-spec-engine.md)
- 🧪 [Professional Testing Strategy](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/testing-strategy.md)
- 🗺️ [Implementation Roadmap](file:///home/dani/Projects/ocr-platform/.blueprint/roadmap/implementation-phases.md)

---

## 📜 License

Project ini dilindungi di bawah lisensi MIT.

# Callcraft — AI-Powered Dynamic Multimodal API Execution Engine

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-orange.svg?style=flat&logo=bun)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg?style=flat&logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Callcraft** adalah platform berbasis AI (*Dynamic Multimodal API Execution Engine*) berkecepatan tinggi yang memungkinkan pengguna untuk mendesain kontrak API secara visual, menentukan *request schema* dan *response schema* kustom dinamis, serta mengeksekusi ekstraksi dan pemrosesan data dokumen terstruktur presisi 100% dengan memanfaatkan AI Vision & LLM Models (Google Gemini 1.5, OpenAI GPT-4o, Anthropic Claude, dan DeepSeek).

---

## ⚡ Core Features & Architectural Highlights

- 🔒 **Stateless Privacy-First Data Processing**: File gambar/dokumen (Base64 atau URL download) dan konteks data hanya diolah di dalam buffer RAM (`bytes`) selama eksekusi Callcraft dan langsung di-drop dari memori. **Tidak ada file yang disimpan ke disk host, S3, MinIO, atau database.**
- 🚀 **Separated Control Plane & Data Plane**:
  - **Control Plane (`Next.js` dengan Bun)**: Dashboard visual bagi pengguna dan admin untuk mengelola API specs, template dokumen, AI provider keys, dan analitik.
  - **Data Plane (`Python / FastAPI`)**: High-performance API Gateway dan Execution Engine yang memproses traffic eksekusi customer secara langsung tanpa bottleneck.
- 🤖 **Dynamic Tool & Function Calling Engine**: Mengonversi JSON Schema buatan pengguna secara otomatis menjadi deklarasi *Tool Calling Spec* resmi AI Vision untuk menggaransi respon JSON valid 100%.
- 🛡️ **Multi-Tier Security & Authentication**:
  - **Service Auth**: Komunikasi internal Next.js Server ➔ Python (`/internal/v1/*`).
  - **Customer Auth**: Eksekusi Public Callcraft (`/v1/call/{user_id}`) dengan Bearer API Key (`call_sk_...`).
  - **Admin Auth**: Hak akses berjenjang berbasis Role-Based Access Control (**RBAC**).
  - **Security Safeguards**: Enkripsi AES-256-GCM untuk API key provider, Argon2id hashing untuk secret key, dan validator SSRF URL.

---

## 📂 Repository Monorepo Structure

```text
callcraft/
├── .blueprint/                 # Blueprint Arsitektur Lengkap & Dokumentasi Q&A
│   ├── README.md               # Master index spesifikasi cetak biru
│   ├── architecture/           # System overview, Security/Auth, Deployment specs
│   ├── specifications/         # Database DDL (16 tabel), API Spec engine, Endpoints, Testing Strategy
│   └── roadmap/                # Implementation phases roadmap (Phase 1-6)
│
├── apps/
│   ├── web/                    # FRONTEND: Next.js 14 Dashboard & Visual Schema Builder (Bun Runtime)
│   ├── api/                    # BACKEND API: Python FastAPI Data Plane Gateway & Execution Engine
│   │   ├── main.py
│   │   ├── src/callcraft_engine/ # Shared Engine (Tool Generator, Coercion, Crypto, SSRF)
│   │   └── tests/              # Pytest Unit & Engine Test Suite
│   └── worker/                 # WORKER: Python Async Outbox Logger
│
├── migrations/                 # PostgreSQL 16+ DDL Migration SQL Scripts (16 Tabel Relasional)
├── docker/                     # Dockerfiles (Python FastAPI Multi-Stage & Bun Next.js)
├── docker-compose.yml          # Multi-Container Setup (Web, API, Worker, Postgres, Redis)
├── pyproject.toml              # Root Python 3.12 Workspace Manifest
├── requirements.txt            # Python Dependencies List
└── .env.example                # Template Variabel Lingkungan
```

---

## 🛠️ Prerequisites

Pastikan perangkat Anda memenuhi syarat berikut sebelum menjalankan aplikasi:
- **Python**: `3.12+`
- **Bun**: `v1.1+`
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
docker-compose up -d callcraft-postgres callcraft-redis
```

### 3. Jalankan Database Migration
```bash
psql -h 127.0.0.1 -U callcraft_user -d callcraft_db -f migrations/0001_initial_schema.sql
```

### 4. Jalankan Python Backend Data Plane API (`apps/api`)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn apps.api.main:app --port 8080 --reload
```
*API Data Plane akan berjalan pada address `http://127.0.0.1:8080`.*

### 5. Jalankan Python Pytest Suite
```bash
pytest apps/api/tests
```

### 6. Jalankan Next.js Web Dashboard dengan Bun (`apps/web`)
```bash
cd apps/web
bun install
bun run dev
```
*Dashboard Control Plane akan berjalan pada address `http://localhost:3000`.*

---

## 📡 Usage Example (Public Callcraft API Execution)

Setelah membuat spesifikasi Callcraft dan menggenerasi API Key di Dashboard, aplikasi eksternal dapat melakukan eksekusi dengan mengirimkan request HTTP `POST`:

```bash
curl -X POST "http://127.0.0.1:8080/v1/call/01HZX89ABCDEF1234567890XYZ" \
  -H "Authorization: Bearer call_sk_sample_key_1234567890" \
  -H "X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://storage.example.com/ktp-sample.jpg",
    "prompt": "Pastikan NIK terverifikasi 16 digit",
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
    "gender": "LAKI-LAKI"
  }
}
```

---

## 📘 Documentation & Blueprints

Spesifikasi teknis dan acuan arsitektur mendalam dapat diakses pada folder `.blueprint/`:
- 📄 [System Architecture Overview](file:///home/dani/Projects/callcraft/.blueprint/architecture/system-overview.md)
- 🔐 [Security & Auth Specifications](file:///home/dani/Projects/callcraft/.blueprint/architecture/security-and-auth.md)
- 🐳 [Deployment & Infrastructure Blueprint](file:///home/dani/Projects/callcraft/.blueprint/architecture/deployment-and-infrastructure.md)
- 🗄️ [Database Schema DDL (16 Tables)](file:///home/dani/Projects/callcraft/.blueprint/specifications/database-schema.md)
- ⚙️ [Dynamic API Specification Engine](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-spec-engine.md)
- 🧪 [Professional Testing Strategy](file:///home/dani/Projects/callcraft/.blueprint/specifications/testing-strategy.md)
- 🗺️ [Implementation Roadmap](file:///home/dani/Projects/callcraft/.blueprint/roadmap/implementation-phases.md)

---

## 📜 License

Project ini dilindungi di bawah lisensi MIT.

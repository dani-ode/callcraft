# Callcraft — Software Architecture Blueprint & Technical Specifications

Selamat datang di repository dokumentasi arsitektur **Callcraft**. Document set ini merupakan acuan resmi dan panduan teknis mendalam (*single source of truth*) yang dikembangkan berdasarkan seluruh hasil diskusi pada file **`qna-1.md` hingga `qna-5.md`** di folder `.blueprint/question-and-answer/`.

---

## 📌 Executive Summary

**Callcraft** adalah platform berbasis AI (*Dynamic Multimodal AI Execution Engine*) yang memungkinkan pengguna untuk mendesain secara kustom API specs, menentukan skema masukan dinamis (*dynamic request schema*) dan keluaran terstruktur (*dynamic response schema*), serta mengeksekusi ekstraksi dan pengolahan data berkecepatan tinggi dengan memanfaatkan AI Vision & LLM models (seperti Google Gemini, OpenAI GPT-4o, Anthropic Claude, dan DeepSeek).

### Prinsip Utama Arsitektur (Derived from Q&A 1-5):
1. **Stateless Privacy-First Data Processing (Q&A 3)**: Tidak ada dokumen, file gambar (Base64 atau URL download), maupun hasil teks mentah sensitif yang disimpan ke dalam media penyimpan (*disk*, MinIO, S3, atau database). Data dan gambar hanya hidup di dalam buffer RAM selama durasi eksekusi dan langsung di-drop dari memori setelah siklus request selesai.
2. **Separated Control Plane & Data Plane (Q&A 2 & Q&A 4)**:
   - **Control Plane (`Next.js` dengan Bun - `app.yourdomain.com`)**: Dashboard visual bagi pengguna dan admin untuk mengelola API specs, template masukan, AI provider credentials, dan monitoring metadata log.
   - **Data Plane (`Python / FastAPI` - `api.yourdomain.com`)**: High-performance API Gateway dan Execution Engine yang menerima traffic eksekusi dinamis langsung dari customer aplikasi eksternal tanpa melalui Next.js.
3. **Multi-AI Vision & Dynamic Tool/Function Calling (Q&A 1)**: Mengonversi JSON Schema masukan/keluaran pengguna menjadi fungsi/tool calling resmi AI models (Gemini, OpenAI, dll) untuk menjamin struktur JSON keluaran presisi 100%.
4. **Multi-Tier Authorization & Security (Q&A 5)**: Pemisahan tegas 3 jalur autentikasi antara Service Client (`/internal/v1/*`), Customer Application Key (`/v1/call/{user_id}`), dan Admin RBAC (`/admin/v1/*`).
5. **Host Apache Reverse Proxy + Docker (Q&A 4)**: Mengintegrasikan Apache Web Server di host VPS Ubuntu dengan container Docker Compose (`Next.js + Bun`, `Python FastAPI API`, `Python Worker`, `PostgreSQL`, `Redis`).

---

## 📁 Struktur Dokumentasi Blueprint

Dokumentasi arsitektur ini terbagi menjadi modul-modul komprehensif berikut:

```text
.blueprint/
├── README.md                                  # Index & overview blueprint ini
├── question-and-answer/                       # File diskusi mentah (qna-1.md s/d qna-5.md)
│   ├── qna-1.md                               # Prompt spec, AI keys, visual builder, admin monitoring
│   ├── qna-2.md                               # Monorepo architecture & component separation
│   ├── qna-3.md                               # Stateless RAM-only image & payload processing
│   ├── qna-4.md                               # Control plane vs Data plane, VPS Apache Host + Docker
│   └── qna-5.md                               # Multi-tier auth (Service vs Customer vs Admin RBAC)
├── architecture/
│   ├── system-overview.md                     # High-level architecture, flow diagrams, monorepo structure
│   ├── security-and-auth.md                   # Auth 3-jalur, RBAC matrix, AES-256-GCM encryption, SSRF rules
│   └── deployment-and-infrastructure.md       # VPS Apache proxy, Docker Compose, multi-stage Dockerfiles
├── specifications/
│   ├── database-schema.md                     # SQL DDL PostgreSQL 16+ (16 Tabel Relasional), indeks, FK
│   ├── api-spec-engine.md                     # Engine spesifikasi API, Data Types, Tool Calling, Type Coercion
│   ├── api-endpoints.md                       # Contract OpenAPI spesifik untuk Control Plane, Data Plane & Admin
│   └── testing-strategy.md                    # Strategi testing profesional (Pytest, Bun test, Load, Memory audit)
└── roadmap/
    └── implementation-phases.md               # Panduan urutan pengembangan dari Phase 1 hingga Phase 6
```

---

## 📚 Ringkasan Modul Blueprint

### 1. [System Overview](file:///home/dani/Projects/callcraft/.blueprint/architecture/system-overview.md) *(Reflects Q&A 1, 2, 3, 4)*
Menjelaskan arsitektur global sistem Callcraft, pemisahan layer Control Plane (Next.js + Bun) dan Data Plane (Python FastAPI), struktur monorepo (`apps/web`, `apps/api`, `apps/worker`), aliran data dari client hingga AI Engine, penanganan memori tanpa file storage, serta performa dan batas kuota eksekusi.

### 2. [Security & Authentication](file:///home/dani/Projects/callcraft/.blueprint/architecture/security-and-auth.md) *(Reflects Q&A 1, 5)*
Mendokumentasikan model autentikasi 3-jalur (`/internal/v1/*` Service Auth, `/v1/call/{user_id}` User API Key Auth, `/admin/v1/*` Admin Session Auth), Role-Based Access Control (RBAC), enkripsi AES-256-GCM untuk API Key AI provider di database, dan proteksi Server-Side Request Forgery (SSRF) pada URL gambar/dokumen.

### 3. [Deployment & Infrastructure](file:///home/dani/Projects/callcraft/.blueprint/architecture/deployment-and-infrastructure.md) *(Reflects Q&A 4)*
Petunjuk konfigurasi infrastruktur pada VPS Ubuntu single-host yang menjalankan Apache sebagai Host Reverse Proxy & SSL Terminator, dikombinasikan dengan container Docker Compose (`Next.js + Bun`, `Python API`, `Python Worker`, `PostgreSQL`, `Redis`).

### 4. [Database Schema Specifications](file:///home/dani/Projects/callcraft/.blueprint/specifications/database-schema.md) *(Reflects Q&A 1, 3, 5)*
Skema database PostgreSQL 16+ terlengkap memuat 16 tabel relasional (seperti `call_specs`, `call_spec_versions`, `api_requests`) beserta tipe data, kunci primer (ULID/UUID), kunci asing, indeks performa, dan DDL migration SQL siap pakai.

### 5. [API Specification Engine](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-spec-engine.md) *(Reflects Q&A 1)*
Spesifikasi teknis pembentukan *Request Schema* & *Response Schema* dinamis. Menjelaskan tipe data dasar & kontainer (Object/Array bertingkat), penerjemah ke Tool Calling AI (OpenAI & Gemini), serta algoritma validasi Pydantic & *Type Coercion* otomatis.

### 6. [API Endpoints Reference](file:///home/dani/Projects/callcraft/.blueprint/specifications/api-endpoints.md) *(Reflects Q&A 1, 4, 5)*
Dokumentasi lengkap seluruh REST API endpoint untuk `/internal/v1/*` (Internal Management), `/v1/call/{user_id}` (Public Execution Data Plane), dan `/admin/v1/*` (Admin Dashboard).

### 7. [Professional Testing Strategy](file:///home/dani/Projects/callcraft/.blueprint/specifications/testing-strategy.md)
Spesifikasi strategi pengujian profesional mencakup Unit Testing (Python `pytest` & `bun test`), Integration Testing (`testcontainers-python`), E2E UI Testing (Playwright), Load Testing (k6), Security Fuzzing, dan Zero Data Retention Memory Audit.

### 8. [Implementation Phases Roadmap](file:///home/dani/Projects/callcraft/.blueprint/roadmap/implementation-phases.md)
Langkah-langkah taktis pelaksanaan coding dari Phase 1 (Scaffolding Monorepo Python & Bun), Phase 2 (Database & Domain Model), Phase 3 (Python Dynamic Execution Engine), Phase 4 (Next.js & Bun Dashboard), Phase 5 (Security & Worker Log), hingga Phase 6 (Deployment VPS & QA).

---

## 🛠️ Stack Teknologi Resmi

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Data Plane / Core API** | **Python 3.12 (FastAPI + Pydantic v2)** | High-throughput, dynamic multimodal API Gateway & Execution Engine |
| **Control Plane / Front** | **Next.js 14+ (App Router)** | Web Dashboard, React, TypeScript, Tailwind CSS, shadcn/ui |
| **JS/TS Runtime & Manager** | **Bun 1.1+** | Superfast JavaScript/TypeScript runtime & package manager for Web |
| **Schema Builder UI** | **React Flow + Monaco** | Visual drag-and-drop & code editor untuk membuat API specs dinamis |
| **Database** | **PostgreSQL 16+** | Relational Database (Asyncpg / SQLAlchemy di Python) |
| **Cache & Rate Limit** | **Redis 7+** | Cache spec Callcraft, rate limiter token-bucket, session cache |
| **Testing Tools** | **Pytest, Bun Test, Playwright, k6** | Automated unit, integration, UI E2E, & load testing |
| **Reverse Proxy** | **Apache 2.4+ (Host VPS)** | ProxyPass, SSL/TLS Termination, Security headers |
| **Containerization** | **Docker & Docker Compose** | Multi-container setup untuk aplikasi & infrastruktur pendukung |

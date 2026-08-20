# OCR Platform — Software Architecture Blueprint & Technical Specifications

Selamat datang di repository dokumentasi arsitektur **OCR Platform**. Document set ini merupakan acuan resmi dan panduan teknis mendalam (*single source of truth*) yang dikembangkan berdasarkan seluruh hasil diskusi pada file **`qna-1.md` hingga `qna-5.md`** di folder `.blueprint/question-and-answer/`.

---

## 📌 Executive Summary

**OCR Platform** adalah platform berbasis AI yang memungkinkan pengguna untuk mendesain kontrak API OCR secara kustom, menentukan struktur masukan (*request schema*) dan keluaran (*response schema*), serta mengeksekusi ekstraksi data dokumen berkecepatan tinggi dengan memanfaatkan AI Vision models (seperti Google Gemini dan OpenAI GPT-4o).

### Prinsip Utama Arsitektur (Derived from Q&A 1-5):
1. **Stateless Privacy-First Document Processing (Q&A 3)**: Tidak ada dokumen, file gambar (Base64 atau URL download), maupun hasil teks mentah sensitif yang disimpan ke dalam media penyimpan (*disk*, MinIO, S3, atau database). File gambar hanya hidup di dalam buffer RAM (Tokio `Bytes`) selama durasi eksekusi OCR dan langsung di-drop dari memori setelah siklus request selesai.
2. **Separated Control Plane & Data Plane (Q&A 2 & Q&A 4)**:
   - **Control Plane (`Next.js` - `app.yourdomain.com`)**: Dashboard visual bagi pengguna dan admin untuk mengelola API specs, template dokumen, AI provider credentials, dan monitoring metadata log.
   - **Data Plane (`Rust / Axum` - `api.yourdomain.com`)**: High-performance API Gateway dan Execution Engine yang menerima traffic eksekusi OCR langsung dari customer aplikasi eksternal tanpa melalui Next.js.
3. **Multi-AI Vision & Dynamic Tool/Function Calling (Q&A 1)**: Mengonversi JSON Schema masukan pengguna menjadi fungsi/tool calling resmi AI Vision model (Gemini & OpenAI) untuk menjamin struktur JSON keluaran presisi 100%.
4. **Multi-Tier Authorization & Security (Q&A 5)**: Pemisahan tegas 3 jalur autentikasi antara Service Client (`/internal/v1/*`), Customer Application Key (`/v1/ocr/{user_id}`), dan Admin RBAC (`/admin/v1/*`).
5. **Host Apache Reverse Proxy + Docker (Q&A 4)**: Mengintegrasikan Apache Web Server di host VPS Ubuntu dengan container Docker Compose (`Next.js`, `Rust API`, `Rust Worker`, `PostgreSQL`, `Redis`).

---

## 📁 Struktur Dokumentasi Blueprint

Dokumentasi arsitektur ini terbagi menjadi modul-modul komprehensif berikut:

```text
.blueprint/
├── README.md                                  # Index & overview blueprint ini
├── question-and-answer/                       # File diskusi mentah (qna-1.md s/d qna-5.md)
│   ├── qna-1.md                               # Prompt spec, AI keys, visual builder, admin monitoring
│   ├── qna-2.md                               # Monorepo architecture & component separation
│   ├── qna-3.md                               # Stateless RAM-only image processing (No S3/MinIO)
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
│   └── testing-strategy.md                    # Strategi testing profesional (Unit, Integration, E2E, Load, Memory audit)
└── roadmap/
    └── implementation-phases.md               # Panduan urutan pengembangan dari Phase 1 hingga Phase 6
```

---

## 📚 Ringkasan Modul Blueprint

### 1. [System Overview](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/system-overview.md) *(Reflects Q&A 1, 2, 3, 4)*
Menjelaskan arsitektur global sistem, pemisahan layer Control Plane dan Data Plane, struktur monorepo (`apps/web`, `apps/api`, `apps/worker`), aliran data dari client hingga AI Engine, penanganan memori gambar tanpa file storage, serta performa dan batas kuota eksekusi.

### 2. [Security & Authentication](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/security-and-auth.md) *(Reflects Q&A 1, 5)*
Mendokumentasikan model autentikasi 3-jalur (`/internal/v1/*` Service Auth, `/v1/ocr/{user_id}` User API Key Auth, `/admin/v1/*` Admin Session Auth), Role-Based Access Control (RBAC), enkripsi AES-256-GCM untuk API Key AI provider di database, dan proteksi Server-Side Request Forgery (SSRF) pada URL gambar.

### 3. [Deployment & Infrastructure](file:///home/dani/Projects/ocr-platform/.blueprint/architecture/deployment-and-infrastructure.md) *(Reflects Q&A 4)*
Petunjuk konfigurasi infrastruktur pada VPS Ubuntu single-host yang menjalankan Apache sebagai Host Reverse Proxy & SSL Terminator, dikombinasikan dengan container Docker Compose (`Next.js`, `Rust API`, `Rust Worker`, `PostgreSQL`, `Redis`).

### 4. [Database Schema Specifications](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/database-schema.md) *(Reflects Q&A 1, 3, 5)*
Skema database PostgreSQL 16+ terlengkap memuat 16 tabel relasional beserta tipe data, kunci primer (ULID/UUID), kunci asing, indeks performa, dan DDL migration SQL siap pakai.

### 5. [API Specification Engine](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/api-spec-engine.md) *(Reflects Q&A 1)*
Spesifikasi teknis pembentukan *Request Schema* & *Response Schema* kustom. Menjelaskan tipe data dasar & kontainer (Object/Array bertingkat), penerjemah ke Tool Calling AI (OpenAI & Gemini), serta algoritma validasi & *Type Coercion* otomatis.

### 6. [API Endpoints Reference](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/api-endpoints.md) *(Reflects Q&A 1, 4, 5)*
Dokumentasi lengkap seluruh REST API endpoint untuk `/internal/v1/*` (Internal Management), `/v1/ocr/{user_id}` (Public Execution Data Plane), dan `/admin/v1/*` (Admin Dashboard).

### 7. [Professional Testing Strategy](file:///home/dani/Projects/ocr-platform/.blueprint/specifications/testing-strategy.md)
Spesifikasi strategi pengujian profesional mencakup Unit Testing (Rust `cargo test` & Vitest), Integration Testing (`sqlx::test` & `testcontainers`), E2E UI Testing (Playwright), Load Testing (k6), Security Fuzzing, dan Zero Data Retention Memory Audit.

### 8. [Implementation Phases Roadmap](file:///home/dani/Projects/ocr-platform/.blueprint/roadmap/implementation-phases.md)
Langkah-langkah taktis pelaksanaan coding dari Phase 1 (Scaffolding Monorepo), Phase 2 (Database & Domain Model), Phase 3 (Rust OCR Engine), Phase 4 (Next.js Dashboard), Phase 5 (Security & Worker Log), hingga Phase 6 (Deployment VPS & QA).

---

## 🛠️ Stack Teknologi Resmi

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Data Plane / Core API** | **Rust (Axum + Tokio)** | High-throughput, memory-safe API Gateway & Execution Engine |
| **Control Plane / Front** | **Next.js 14+ (App Router)**| Web Dashboard, React, TypeScript, Tailwind CSS, shadcn/ui |
| **Schema Builder UI** | **React Flow + Monaco** | Visual drag-and-drop & code editor untuk membuat API specs |
| **Database** | **PostgreSQL 16+** | Relational Database (ORM/Query via `SQLx` di Rust) |
| **Cache & Rate Limit** | **Redis 7+** | Cache spec OCR, rate limiter token-bucket, session cache |
| **Testing Tools** | **Cargo Test, Vitest, Playwright, k6**| Automated unit, integration, UI E2E, & load testing |
| **Reverse Proxy** | **Apache 2.4+ (Host VPS)** | ProxyPass, SSL/TLS Termination, Security headers |
| **Containerization** | **Docker & Docker Compose** | Multi-container setup untuk aplikasi & infrastruktur pendukung |

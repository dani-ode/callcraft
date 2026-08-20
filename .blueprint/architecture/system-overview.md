# Architecture — System Overview

Dokumen ini menjelaskan arsitektur tingkat tinggi dari **Callcraft**, termasuk pembagian komponen *Control Plane* dan *Data Plane*, alur pemrosesan data dinamis *stateless* di RAM, serta siklus hidup request dari masukan client hingga respon JSON terstruktur.

---

## 1. High-Level Architecture

Sistem dirancang mengadopsi arsitektur **FastAPI (Python 3.12)** untuk *Data Plane* dan **Next.js (App Router) yang dijalankan di atas Bun** untuk *Control Plane*, dipisahkan secara logis namun dapat didedikasikan pada container terpisah.

```text
                                   ┌──────────────────────┐
                                   │       INTERNET       │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │     Apache Host      │
                                   │ SSL / Reverse Proxy  │
                                   └──────────┬───────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │ HTTP/HTTPS                                        │ HTTP/HTTPS
                    ▼                                                   ▼
       ┌─────────────────────────┐                         ┌─────────────────────────┐
       │   app.yourdomain.com    │                         │   api.yourdomain.com    │
       │   Dashboard Web App     │                         │  Public Dynamic API GW  │
       │   (Next.js + Bun)       │                         │   (Python / FastAPI)    │
       └────────────┬────────────┘                         └────────────┬────────────┘
                    │                                                   │
                    │ Service Credential Auth                           │
                    │ /internal/v1/*                                    │ Customer API Key
                    └─────────────────────────┬─────────────────────────┘ /v1/call/{user_id}
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │   Python FastAPI     │
                                   │  (Execution Engine)  │
                                   └──────────┬───────────┘
                                              │
                 ┌────────────────────────────┼────────────────────────────┐
                 │                            │                            │
                 ▼                            ▼                            ▼
      ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
      │   PostgreSQL 16    │       │     Redis 7        │       │    AI Providers    │
      │ Spec, Key, User,   │       │ Cache Call Specs,  │       │ Google Gemini API  │
      │ Metada Request Log │       │ Rate Limits        │       │ OpenAI GPT-4o API  │
      └────────────────────┘       └────────────────────┘       └────────────────────┘
                 ▲                                                         │
                 │                                                         │
                 └────────────────────────────┬────────────────────────────┘
                                              │ Async Outbox Log
                                              ▼
                                   ┌──────────────────────┐
                                   │    Python Worker     │
                                   │ Analytics Aggregator │
                                   └──────────────────────┘
```

---

## 2. Separation of Concerns: Control Plane vs Data Plane

### A. Control Plane (Next.js + Bun - `app.yourdomain.com`)
- **Fungsi**: Interface berbasis GUI bagi pengguna dan admin.
- **Fitur Utama**:
  1. Register, Login, Profile Management, & API Key Generation (Public & Secret Key `sk_live_...`).
  2. Manajemen AI Provider Keys (Gemini, OpenAI, Anthropic, DeepSeek API Key yang diinput pengguna).
  3. Visual API Specification Builder (React Flow & Monaco Editor) untuk mendesain request schema dan response schema kustom dinamis.
  4. Template Marketplace (Invoice, Document, Receipt, Form Parser, Custom API Builder).
  5. Monitoring Dashboard & Analytics (API Hit counts, Token consumption, latency distribution, error rate).
  6. Admin Management UI (System models, user role management, prompt system editing).
- **Catatan**: Next.js **TIDAK PERNAH** memproses traffic *Public Execution API* pengguna eksternal.

### B. Data Plane (Python FastAPI - `api.yourdomain.com`)
- **Fungsi**: High-performance execution engine stateless.
- **Fitur Utama**:
  1. Receiving & Validating Customer Requests (`POST /v1/call/{user_id}`).
  2. Authentication & Rate Limiting (Pengecekan API Key `sk_live_...` & Token Bucket di Redis).
  3. Spec Resolution: Mengambil definisi Call Spec dari Redis (fallback PostgreSQL).
  4. In-Memory Image & Document Handling: Menerima Base64 atau mendownload URL file/gambar secara langsung ke buffer RAM (`bytes`).
  5. AI Engine Execution: Mengubah response schema menjadi JSON Tool Schema untuk Gemini/OpenAI/LLM Vision API.
  6. Response Mapping & Type Coercion: Memvalidasi keluaran AI terhadap response schema pengguna dan mengembalikan JSON presisi.
  7. Async Request Audit Logging: Mengirimkan metadata hit (token, latency, cost, http status) ke outbox queue tanpa menyimpan gambar/konten dokumen.

---

## 3. Stateless RAM-Only Image Processing Pipeline

Platform ini menerapkan standar **Zero Data Retention (ZDR)** untuk dokumen yang diproses. File gambar tidak pernah disimpan ke dalam media disk lokal, temporary directory, MinIO, S3, atau database.

```text
  Client App Request (Base64 / Image URL)
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│                  Rust Axum Handler                   │
│                                                      │
│ 1. Stream Request Body (Max 10 MB limit)             │
│ 2. Decode Base64 OR Download URL via reqwest (in RAM)│
│ 3. Buffer stored in Tokio Bytes (RAM)                │
│                                                      │
│                     │                                │
│                     ▼                                │
│ 4. Pass Bytes directly to AI Adapter (Gemini/OpenAI) │
│                                                      │
│                     │                                │
│                     ▼                                │
│ 5. Receive Structured Output from AI                 │
│ 6. Drop Tokio Bytes memory allocation immediately    │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
   JSON Response returned to Client App
```

### Aturan Penanganan Memori:
- **Base64 Payload**: Axum memvalidasi header Base64, mendecode string langsung menjadi `bytes::Bytes` di RAM.
- **URL Payload**: Terjadi eksekusi HTTP GET stream via `reqwest` langsung ke `Bytes` buffer dengan batas timeout 10 detik dan batas ukuran file 10 MB. Terproteksi penuh dari serangan SSRF.
- **Memory Drop**: Variabel `Bytes` secara eksplisit dihapus (*dropped*) dari scope memori Rust sesegera mungkin setelah dipassing ke provider AI.

---

## 4. OCR AI Execution Flow (Tool / Function Calling Engine)

Untuk menjamin struktur JSON keluaran sesuai 100% dengan `response_schema` yang dikonfigurasi oleh user, engine tidak menggunakan prompt biasa (*string completion*), melainkan **Structured Tool / Function Calling**.

```text
    User OCR Spec (Response Schema Definition)
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              Tool Generator Engine                   │
│                                                      │
│ Transforms Response Schema -> Dynamic AI Function:   │
│ Name: "extract_document_data"                        │
│ Parameters: JSON Schema derived from Spec            │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                   AI Provider                        │
│ (Gemini 1.5 Flash/Pro Vision OR OpenAI GPT-4o)       │
│                                                      │
│ System Prompt: Platform Base Prompt + Spec Prompt    │
│ Input: Image Bytes Buffer + Extra User Prompt        │
│ Tools: [ extract_document_data Tool Schema ]         │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│           AI Tool Call Arguments Output              │
│                                                      │
│ JSON Output: {"nik": "3271...", "name": "BUDI", ...} │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│          Schema Validation & Type Coercion           │
│                                                      │
│ 1. Validate fields against spec rules                │
│ 2. Coerce types (e.g., String -> Date, Int -> String)│
│ 3. Apply Enum matching & Defaults                    │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
                 Final Response JSON
```

---

## 5. Sequence Diagrams

### Sequence A: Eksekusi Public OCR API (`Customer -> Rust Axum`)

```text
Client Application             Apache Proxy               Rust API Gateway               Redis Cache               AI Provider (Gemini/OpenAI)     PostgreSQL
       │                            │                             │                           │                                 │                    │
       │─── POST /v1/ocr/{user_id}─►│                             │                           │                                 │                    │
       │    Header: X-OCR-SPEC-ID   │                             │                           │                                 │                    │
       │    Header: Authorization   │─── Proxy Pass :8080 ───────►│                           │                                 │                    │
       │                            │                             │─── Check Rate Limit ─────►│                                 │                    │
       │                            │                             │◄── Rate Limit OK ─────────│                                 │                    │
       │                            │                             │                           │                                 │                    │
       │                            │                             │─── Get OCR Spec Cached ──►│                                 │                    │
       │                            │                             │◄── Spec Found (JSON) ─────│                                 │                    │
       │                            │                             │                           │                                 │                    │
       │                            │                             │ (If Cache Miss) ────────────────────────────────────────────────────────────────────►│ Query Spec
       │                            │                             │◄(Cache Miss Fallback) ───────────────────────────────────────────────────────────│ Return Spec
       │                            │                             │                           │                                 │                    │
       │                            │                             │─── Download/Decode Image (RAM memory only)                   │                    │
       │                            │                             │─── Decrypt User AI Provider API Key                             │                    │
       │                            │                             │                                                             │                    │
       │                            │                             │─── POST Vision Request (Image + Tool Schema) ──────────────►│                    │
       │                            │                             │◄── Return Tool Call Argument JSON ──────────────────────────│                    │
       │                            │                             │                                                             │                    │
       │                            │                             │─── Drop Image RAM Buffer                                    │                    │
       │                            │                             │─── Validate & Coerce JSON Output                            │                    │
       │                            │                             │                                                             │                    │
       │                            │                             │─── Async Outbox Audit Log (Metadata only, no payload) ────────────────────────────►│ Insert api_requests
       │◄── 200 OK (JSON Data) ─────│◄── 200 OK ──────────────────│                                                                                  │
```

---

## 6. System Limits & Resource Specifications

| Metric / Constraint | Value | Description |
| :--- | :--- | :--- |
| **Max Request Body Size** | `10 MB` | Batas maksimum payload HTTP request (termasuk Base64) |
| **Max Image Download Size**| `10 MB` | Batas maksimum file gambar yang didownload dari URL |
| **URL Download Timeout** | `10 seconds` | Max waktu tunggu untuk mendownload gambar via URL |
| **OCR Execution Timeout** | `60 seconds` | Max waktu tunggu respon dari AI Provider |
| **Redis Cache Spec TTL** | `3600 seconds` | Durasi spesifikasi OCR disimpan di Redis cache |
| **Rate Limit Default** | `60 req/minute` | Batas default per API Key customer (configurable) |

# ---------------------------------------------

# QUESTION:

# ---------------------------------------------

saya tidak ingin menyimpan file sama sekali

# ---------------------------------------------

# ANSWER:

# ---------------------------------------------

Bisa, dan malah saya setuju. Untuk sistem kamu, **tidak perlu MinIO/S3/file storage sama sekali** kalau requirement-nya adalah file hanya diproses saat request berlangsung.

Arsitekturnya menjadi **stateless document processing**:

```text
Client
  │
  │ image base64 / image URL
  ▼
Rust API
  │
  ├── Validate request
  ├── Download URL (memory only)
  ├── Validate MIME / size
  │
  ▼
Memory Buffer
  │
  ├── AI Provider
  │     ├── Gemini
  │     └── OpenAI
  │
  ▼
Structured Output
  │
  ├── Schema Validation
  ├── Response Mapping
  │
  ▼
JSON Response
  │
  ▼
Memory Buffer dropped
```

Tidak ada:

```text
❌ MinIO
❌ S3
❌ local uploads/
❌ temporary file
❌ permanent document storage
```

### Untuk URL

Misalnya request:

```json
{
  "image": "https://example.com/ktp.jpg"
}
```

Backend:

```text
HTTP GET
   ↓
response bytes
   ↓
memory buffer
   ↓
MIME validation
   ↓
size validation
   ↓
AI
   ↓
buffer di-drop
```

Jadi bukan:

```text
URL
 ↓
download
 ↓
/tmp/ktp.jpg
 ↓
AI
 ↓
delete
```

tetapi:

```text
URL
 ↓
download ke RAM
 ↓
AI
 ↓
drop memory
```

Untuk Rust, ini sangat cocok karena bisa menggunakan `Bytes`/memory buffer dan tidak perlu filesystem.

### Base64 juga jangan disimpan

Request:

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

Flow:

```text
Base64
 ↓
decode
 ↓
Bytes
 ↓
AI
 ↓
drop Bytes
```

Jangan masuk:

```text
api_requests
```

Jangan simpan:

```text
image_base64
image_url
raw_document
ocr_image
```

kecuali kamu memang nanti menambahkan fitur audit/debug yang secara eksplisit memilih storage.

---

## Database tetap hanya menyimpan metadata

Contoh `api_requests`:

```text
api_requests
-------------
id
request_id
user_id
api_spec_id
api_spec_version_id
credential_id

provider_id
model_id

status
http_status

input_type
input_size

processing_time_ms

prompt_tokens
completion_tokens
total_tokens
estimated_cost

error_code

ip_address
user_agent

created_at
completed_at
```

Yang **tidak** disimpan:

```text
❌ base64
❌ image binary
❌ document URL
❌ OCR raw image
❌ hasil OCR mentah jika mengandung data sensitif
```

Untuk response, kamu bisa pilih:

### Mode 1 — privacy-first

Tidak menyimpan hasil OCR sama sekali.

```text
request
 → process
 → response
 → selesai
```

### Mode 2 — metadata-only

Simpan hanya:

```text
status
latency
token usage
cost
model
provider
error
```

Saya sangat menyarankan mode 2 sebagai default.

---

## Ini juga mengubah arsitektur sebelumnya

Jadi saya akan **hapus object storage dari arsitektur**:

```text
                    ┌───────────────┐
                    │    Next.js    │
                    │    Frontend   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Rust Axum   │
                    │   API Server  │
                    └───────┬───────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
      PostgreSQL         Redis          AI Providers
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                                  Gemini        OpenAI

                            ┌───────────────┐
                            │    Worker     │
                            │ Rust + Kafka  │
                            └───────────────┘
```

Tidak ada storage file.

---

## Ada satu hal penting: ukuran request

Karena tidak menyimpan file, API harus punya batas ketat:

```text
max request body
max base64 size
max downloaded URL size
max image dimensions
timeout
```

Misalnya:

```text
Base64 image: max 10 MB
URL download: max 10 MB
Download timeout: 10s
OCR timeout: 60s
```

Angkanya nanti bisa dibuat configurable.

Untuk URL downloader juga tetap wajib:

```text
SSRF protection
DNS rebinding protection
private IP blocking
redirect validation
content-type validation
content-length validation
download timeout
```

Karena walaupun tidak menyimpan file, endpoint URL tetap bisa menjadi SSRF vector.

---

## Saya justru menyarankan nama engine-nya berubah

Daripada:

```text
OCR File Storage
```

lebih cocok:

```text
OCR Processing Engine
```

atau:

```text
Stateless OCR Execution Engine
```

Karena prinsipnya:

> **Input document exists only in memory for the duration of OCR execution and is never persisted by the platform.**

Ini bisa menjadi salah satu selling point produk kamu:

**Privacy-first OCR API**

```text
No document storage
No image persistence
No permanent uploads
No raw document logging
```

Dengan requirement baru ini, `MinIO/S3` dari rancangan sebelumnya **bisa dihapus total**.

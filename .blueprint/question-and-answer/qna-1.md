# ---------------------------------------------

# QUESTION:

# ---------------------------------------------

buatkan promt spec (databese, file structure, walktghough, dll) untuk project aplikasi web sekaligus api ai ocr, pakai rust, apalagi teknolgi tambahan. dan rekomendasi,

beberapa info:
user diwjibkan mengaktifkan model saat ini hanya (gemini dan openai), dan wajib memasukkan key dari ai tersebut di halaman profile.

user mendesain sendiri api dari file ocrnya:
saat register, user akan punya sacret key dan public key.
dan path endpoint khusus berdasar userID (ULID)

flownya:
user pilih template yang sudah ada (KTP) atau mulai desain dari nol, lalu masuk ke list api file ocr nya dia:

user bisa desain secara grphical interface, body dari request dan response nya. (seperti key-value, type data, dan pastikan data bisa object dalam object, atau array).

saat ini type data yang bisa di dukung oleh project ini (request : text untuk base 64 gambar, dan string untuk link, text promt tambahan, dll, reuiered atau tidak) kalau link begitu di hit akan ada proses download dulu disimpan di temporary folder. (response : buatkan agak banyak).

setealh user endpoint untuk file ocr itu di create oleh user maka akan ada id, id itu akan jadi api spec di header.

jadi ada halaman, untuk menapilkan (cara hit dan hasil request apinya):

---

flow penggunaan:
saat api dari user itu di hit, file dan promot tambahan nya akan di proses dengan tool/function calling dengan ai khusus image, pakai apikey dari user tersebut, hasilnya akan di kembalikan json sesuai spec (response yang di definisikan oleh user di id tersebut).

---

sekarang bahas tentang saya sebagai yang punya sistem ini, ada management user, model, template, promt umum untuk toll calling, type data. dan saya ingin memonitor semua hit yang ada, jadi ada tabel untuk hitnya.

coba kembangkan jadi lebih baik

# ---------------------------------------------

# ANSWER:

# ---------------------------------------------

Bisa. Dari flow yang kamu jelaskan, saya akan mengembangkannya bukan sekadar sebagai **OCR API generator**, tetapi sebagai **OCR API Platform / OCR-as-a-Service**.

Konsep utamanya:

> **User tidak hanya menggunakan OCR, tetapi mendesain kontrak API OCR mereka sendiri secara visual, memilih AI provider/model mereka sendiri, lalu sistem kita menjadi gateway + execution engine yang menjalankan OCR dan mengembalikan response sesuai schema yang mereka desain.**

Saya sarankan arsitektur **Rust modular monolith terlebih dahulu**, dengan worker terpisah untuk pekerjaan yang berat. Ini lebih mudah dikembangkan dibanding langsung microservices.

---

# 1. Gambaran besar sistem

```text
                         ┌─────────────────────┐
                         │      Web App         │
                         │ React / Next.js      │
                         └──────────┬──────────┘
                                    │
                         HTTPS / REST API
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                     CALLCRAFT                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Rust API Server                       │  │
│  │                     Axum                               │  │
│  │                                                        │  │
│  │ Auth │ Users │ OCR Specs │ Templates │ API Gateway     │  │
│  │ Admin │ Models │ Logs │ Playground │ API Keys         │  │
│  └───────────────┬───────────────────────┬────────────────┘  │
│                  │                       │                    │
│                  ▼                       ▼                    │
│           PostgreSQL                  Redis                  │
│                                                              │
│                  │                       │                    │
│                  └───────────┬───────────┘                    │
│                              ▼                                │
│                     OCR Execution Engine                      │
│                              │                                │
│                 ┌────────────┴────────────┐                   │
│                 ▼                         ▼                   │
│           Gemini Adapter           OpenAI Adapter              │
│                 │                         │                   │
│                 └────────────┬────────────┘                   │
│                              ▼                                │
│                     Tool / Function                          │
│                     Calling Engine                           │
│                              │                                │
│                              ▼                                │
│                     Structured JSON                           │
│                              │                                │
│                              ▼                                │
│                       Response Mapper                          │
└──────────────────────────────────────────────────────────────┘

       ▲
       │
       │ User's external application
       │
POST /v1/{user_id}/ocr
X-OCR-SPEC-ID: ...
X-OCR-SECRET-KEY: ...
```

---

# 2. Stack yang saya rekomendasikan

### Backend

| Komponen       | Teknologi               |
| -------------- | ----------------------- |
| Language       | **Rust**                |
| HTTP           | **Axum**                |
| Async          | Tokio                   |
| Database       | PostgreSQL              |
| ORM/query      | SQLx                    |
| Serialization  | Serde                   |
| Validation     | validator               |
| ID             | ULID                    |
| Cache          | Redis                   |
| Queue          | Kafka / Redpanda        |
| Object Storage | MinIO / S3              |
| Auth           | JWT + Argon2            |
| API docs       | OpenAPI                 |
| Logging        | tracing                 |
| Metrics        | Prometheus              |
| Observability  | Grafana + OpenTelemetry |
| Container      | Docker                  |
| Reverse proxy  | Nginx / Traefik         |

### Frontend

Saya rekomendasikan:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
React Hook Form
Zod
TanStack Query
React Flow
Monaco Editor
```

**React Flow** akan sangat berguna untuk visual API/schema builder jika nantinya ingin dibuat seperti:

```text
OCR
 ├── document_number
 ├── name
 ├── birth
 │    ├── place
 │    └── date
 ├── address
 │    ├── province
 │    ├── city
 │    └── postal_code
 └── family
      └── members[]
```

---

# 3. Konsep paling penting: OCR API Specification

Saya menyarankan setiap endpoint yang dibuat user memiliki sebuah:

```text
OCR API Specification
```

Misalnya user membuat:

```text
KTP OCR
```

Maka database menyimpan:

```text
id
user_id
name
slug
description
version
status
request_schema
response_schema
system_prompt
created_at
updated_at
```

Contohnya:

```text
Name:
KTP OCR

Endpoint:
POST /v1/{user_id}/ocr

API Spec ID:
01K...

Version:
1
```

Kemudian request:

```http
POST /v1/01JABC.../ocr
X-OCR-SPEC-ID: 01KXYZ...
X-OCR-SECRET-KEY: sk_live_xxxxxxxxx

Content-Type: application/json
```

---

# 4. Request schema

User bisa membuat:

```json
{
  "image": {
    "type": "base64",
    "required": true
  },
  "document_url": {
    "type": "string",
    "required": false
  },
  "prompt": {
    "type": "text",
    "required": false
  }
}
```

Namun saya justru menyarankan internal schema-nya dibuat lebih formal.

Contoh:

```json
{
  "type": "object",
  "properties": {
    "image": {
      "type": "image",
      "source": ["base64", "url"],
      "required": true
    },
    "prompt": {
      "type": "string",
      "required": false
    }
  }
}
```

Jadi user tidak perlu menentukan:

```text
base64 = text
```

secara manual.

Platform memahami bahwa:

```text
image
```

adalah special input type.

---

# 5. Request data type

Saya sarankan jangan hanya:

```text
string
integer
boolean
array
object
```

Tetapi buat **platform data types**.

### Basic

```text
string
text
integer
number
boolean
```

### File

```text
image
file
base64
url
```

### Special

```text
email
phone
date
datetime
currency
enum
```

### Container

```text
object
array
```

Dan recursive:

```text
object
 └── object
      └── array
           └── object
```

---

# 6. Response schema

Response harus jauh lebih fleksibel.

Saya rekomendasikan:

```text
string
integer
number
boolean
null

object
array

date
datetime

email
phone
url

enum

money

percentage
```

Contoh:

```json
{
  "type": "object",
  "properties": {
    "nik": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "birth": {
      "type": "object",
      "properties": {
        "place": {
          "type": "string"
        },
        "date": {
          "type": "date"
        }
      }
    },
    "address": {
      "type": "object",
      "properties": {
        "street": {
          "type": "string"
        },
        "city": {
          "type": "string"
        }
      }
    },
    "gender": {
      "type": "enum",
      "values": ["male", "female"]
    },
    "confidence": {
      "type": "number"
    }
  }
}
```

---

# 7. Template

Ini bagian yang menurut saya sangat bagus untuk dikembangkan.

Admin bisa membuat template:

```text
KTP Indonesia
SIM Indonesia
Passport
NPWP
KK
Invoice
Receipt
Bank Statement
Driver License
ID Card
```

Template bukan cuma schema.

Template bisa berisi:

```text
Template
├── metadata
├── request schema
├── response schema
├── system prompt
├── extraction prompt
├── tools
├── validation rules
└── default model
```

User kemudian:

```text
Create OCR API

        ↓

Choose Template

 ┌──────────────────────┐
 │ KTP Indonesia        │
 │ Invoice              │
 │ Passport             │
 │ Receipt              │
 │ Blank                │
 └──────────────────────┘

        ↓

Customize Schema

        ↓

Create API
```

---

# 8. AI Provider

User wajib mengaktifkan AI provider.

Untuk sekarang:

```text
Gemini
OpenAI
```

Profile:

```text
AI Providers

☑ Gemini
    API Key: ************

☑ OpenAI
    API Key: ************
```

Tetapi **jangan menyimpan API key plaintext**.

Simpan:

```text
encrypted_api_key
```

menggunakan encryption key milik platform.

Lebih bagus lagi:

```text
API key
   ↓
Encrypt
   ↓
PostgreSQL
```

Ketika digunakan:

```text
PostgreSQL
   ↓
Decrypt
   ↓
Memory
   ↓
AI Provider
   ↓
Immediately discard
```

Jangan pernah masuk log.

---

# 9. Model management

Admin memiliki:

```text
AI Models
```

Contoh:

```text
Gemini
├── Gemini image model
├── Gemini reasoning model
└── ...

OpenAI
├── Vision capable model
├── ...
```

Database:

```text
ai_providers
ai_models
```

Model memiliki:

```text
id
provider_id
name
model_identifier
supports_image
supports_tool_calling
supports_structured_output
is_active
```

Dengan begitu kamu tidak perlu hardcode:

```rust
if model == "xxx"
```

---

# 10. Tool/function calling

Ini inti dari engine.

Jangan langsung menyuruh AI:

> "Extract KTP"

Lebih bagus schema user diterjemahkan menjadi tool.

Misalnya user membuat:

```text
name
nik
birth_date
address
```

Engine membuat function:

```text
extract_document
```

dengan schema:

```json
{
  "name": "extract_document",
  "description": "Extract structured information from the provided document",
  "parameters": {
    "type": "object",
    "properties": {
      "nik": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "birth_date": {
        "type": "string"
      },
      "address": {
        "type": "string"
      }
    }
  }
}
```

AI kemudian menghasilkan structured tool call.

Engine:

```text
Image
   +
User Prompt
   +
System Prompt
   +
Tool Schema
        ↓
      AI
        ↓
Tool Call
        ↓
Validator
        ↓
Response Mapper
        ↓
JSON
```

---

# 11. Jangan percaya output AI secara langsung

Ini sangat penting.

Misalnya AI mengembalikan:

```json
{
  "nik": 123456
}
```

padahal schema:

```text
nik = string
```

Engine harus melakukan:

```text
AI Output
    ↓
Schema Validator
    ↓
Type Coercion
    ↓
Validation
    ↓
Final Response
```

Kalau invalid:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_AI_OUTPUT",
    "message": "AI output does not match API specification"
  }
}
```

---

# 12. API key milik user

Saya menyarankan jangan hanya:

```text
public key
secret key
```

tetapi:

```text
public key
secret key
```

dengan secret hanya ditampilkan **sekali ketika dibuat**.

Database:

```text
api_credentials
```

```text
id
user_id
public_key
secret_key_hash
name
environment
last_used_at
expires_at
revoked_at
created_at
```

Jangan simpan:

```text
secret_key
```

plaintext.

---

# 13. API endpoint

Saya menyarankan format:

```http
POST /v1/ocr/{user_id}
```

Header:

```http
X-OCR-SECRET-KEY: sk_live_xxxxx
X-OCR-SPEC-ID: 01KXXXXXXXXXXXX
```

atau:

```http
Authorization: Bearer sk_live_xxxxx
X-OCR-SPEC-ID: 01KXXXXXXXXXXXX
```

Saya lebih menyukai:

```http
Authorization: Bearer sk_live_xxxxx
X-OCR-SPEC-ID: 01KXXXXXXXXXXXX
```

karena lebih familiar untuk developer.

---

# 14. Contoh penggunaan API

Request:

```json
{
  "image": "data:image/jpeg;base64,...",
  "prompt": "Pastikan NIK terdiri dari 16 digit."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "nik": "740xxxxxxxxxxxxx",
    "name": "JOHN DOE",
    "birth_date": "1998-01-01",
    "address": {
      "province": "Sulawesi Tenggara",
      "city": "Kendari"
    }
  },
  "meta": {
    "request_id": "01K...",
    "processing_time_ms": 3280
  }
}
```

---

# 15. URL input

Jika:

```json
{
  "image": "https://example.com/ktp.jpg"
}
```

maka:

```text
API
 ↓
Validate URL
 ↓
SSRF Protection
 ↓
Download
 ↓
Validate MIME
 ↓
Validate Size
 ↓
Temporary Storage
 ↓
AI
 ↓
Delete Temporary File
```

Jangan biarkan user memasukkan:

```text
http://localhost
http://127.0.0.1
http://169.254.169.254
```

Ini penting karena endpoint downloader bisa menjadi **SSRF vulnerability**.

---

# 16. Hit monitoring

Saya menyarankan membuat tabel:

```text
api_requests
```

Jangan hanya menyimpan:

```text
hit_count
```

Simpan setiap request sebagai event/request record.

Contoh:

```text
api_requests

id
user_id
api_spec_id
credential_id

request_id

provider
model

status

input_type
input_size

processing_time_ms

prompt_tokens
completion_tokens
total_tokens

estimated_cost

http_status

error_code

ip_address
user_agent

created_at
completed_at
```

Tetapi **jangan menyimpan image/base64 mentah secara default**.

Kalau perlu debugging:

```text
debug_logging = true
```

dan data sensitif harus di-redact.

---

# 17. Dashboard admin

Sebagai owner platform, kamu sebaiknya punya:

```text
Dashboard
```

isi:

```text
Total Users
Active Users

Total API Requests
Requests Today
Requests This Month

Success Rate
Error Rate

Average Latency

AI Usage
Gemini Usage
OpenAI Usage

Estimated AI Cost
```

Grafik:

```text
Requests / Hour
Requests / Day
Requests by Provider
Requests by Model
Error Distribution
Latency P50
Latency P95
Latency P99
```

---

# 18. Admin management

Minimal:

```text
Users
AI Providers
AI Models
OCR Templates
Prompt Templates
Tool Definitions
Data Types
API Requests
Audit Logs
System Settings
```

---

# 19. Prompt management

Jangan hardcode system prompt di source code.

Buat:

```text
prompt_templates
```

Contoh:

```text
OCR_SYSTEM_PROMPT
OCR_EXTRACTION_PROMPT
OCR_VALIDATION_PROMPT
```

Versioning:

```text
prompt
version
is_active
```

Jadi bisa:

```text
OCR Prompt v1
OCR Prompt v2
OCR Prompt v3
```

dan kamu bisa mengetahui request lama menggunakan prompt mana.

---

# 20. Database utama

Saya akan membuat kurang lebih:

```text
users
user_profiles

api_credentials

ai_providers
ai_models
user_ai_credentials

ocr_templates
ocr_template_versions

ocr_specs
ocr_spec_versions

schema_nodes

prompt_templates
prompt_versions

tool_definitions

api_requests
api_request_inputs
api_request_outputs

usage_records

audit_logs

rate_limits

system_settings
```

Saya justru menyarankan **versioning**.

Misalnya user punya:

```text
KTP OCR v1
```

kemudian mengubah schema:

```text
KTP OCR v2
```

Request lama tetap menggunakan v1.

Jangan mengubah kontrak API lama secara destructive.

---

# 21. Struktur Rust

Saya sarankan modular monolith:

```text
ocr-platform/
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── main.rs
│   │
│   └── worker/
│       └── src/
│           └── main.rs
│
├── crates/
│   │
│   ├── domain/
│   │   ├── user/
│   │   ├── credential/
│   │   ├── ocr/
│   │   ├── template/
│   │   ├── ai/
│   │   ├── request/
│   │   └── audit/
│   │
│   ├── application/
│   │   ├── auth/
│   │   ├── ocr/
│   │   ├── template/
│   │   ├── ai/
│   │   └── admin/
│   │
│   ├── infrastructure/
│   │   ├── postgres/
│   │   ├── redis/
│   │   ├── storage/
│   │   ├── kafka/
│   │   └── crypto/
│   │
│   ├── ai/
│   │   ├── gemini/
│   │   ├── openai/
│   │   ├── tool_calling/
│   │   ├── structured_output/
│   │   └── provider.rs
│   │
│   └── shared/
│       ├── error/
│       ├── id/
│       ├── validation/
│       └── config/
│
├── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── security.md
│
├── docker/
│
├── Cargo.toml
├── docker-compose.yml
└── README.md
```

Untuk project sebesar ini, saya lebih menyukai **Cargo workspace** dibanding satu folder Rust besar.

---

# 22. Flow lengkap API execution

```text
Client
  │
  │ POST /v1/ocr/{user_id}
  │
  ▼
API Gateway
  │
  ├── Rate Limit
  ├── Authentication
  ├── Validate User
  └── Validate API Spec
  │
  ▼
Request Parser
  │
  ├── Base64?
  ├── URL?
  └── Prompt?
  │
  ▼
Input Processor
  │
  ├── Decode Base64
  ├── Download URL
  ├── MIME validation
  └── Size validation
  │
  ▼
OCR Execution Engine
  │
  ├── Load User AI Key
  ├── Load Model
  ├── Load System Prompt
  ├── Load OCR Schema
  └── Generate Tool Definition
  │
  ▼
AI Provider
  │
  ├── Gemini
  └── OpenAI
  │
  ▼
Tool Call
  │
  ▼
Schema Validator
  │
  ▼
Response Transformer
  │
  ▼
API Response
  │
  ├── Record metrics
  ├── Record usage
  └── Audit request
```

---

# 23. Async processing

Untuk MVP, jangan semua dimasukkan Kafka.

Saya sarankan:

### Synchronous

```text
HTTP
→ OCR
→ AI
→ response
```

Karena developer yang menggunakan API mengharapkan response langsung.

### Async

```text
API request logging
usage aggregation
analytics
audit
cleanup temporary files
billing
```

bisa masuk:

```text
Kafka / Redpanda
```

Jadi:

```text
API
 ↓
PostgreSQL
 ↓
Outbox
 ↓
Redpanda
 ↓
Analytics Worker
```

Ini cocok dengan pola **outbox + worker** yang sebelumnya kamu gunakan.

---

# 24. Security yang wajib

Karena sistem ini memproses dokumen seperti KTP, security harus menjadi bagian dari desain awal.

Minimal:

```text
Argon2 password hashing

Encrypted AI API keys

Hashed OCR secret keys

Rate limiting

Request size limit

Image size limit

MIME validation

SSRF protection

Temporary file cleanup

No API key in logs

No base64 image in logs

No document content in logs

Prompt injection protection

IP throttling

Credential rotation

Credential revocation

Audit logging
```

Tambahkan:

```text
X-Request-ID
```

pada setiap request.

---

# 25. Halaman frontend

Saya akan membuat:

```text
/login
/register

/dashboard

/profile
/profile/ai-providers
/profile/api-credentials

/ocr
/ocr/new
/ocr/:id
/ocr/:id/builder
/ocr/:id/playground

/templates
/templates/:id

/api-requests
/api-requests/:id

/docs

/admin
/admin/users
/admin/models
/admin/providers
/admin/templates
/admin/prompts
/admin/tools
/admin/data-types
/admin/requests
/admin/audit-logs
```

---

# 26. OCR Builder UI

Ini salah satu fitur paling penting.

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ KTP OCR Builder                                  Save       │
├──────────────────┬───────────────────────────┬──────────────┤
│ Request          │ Schema                    │ Preview      │
│                  │                           │              │
│ image            │ response                  │ JSON         │
│ ├ type: image    │ ├ nik: string             │              │
│ └ required       │ ├ name: string             │              │
│                  │ ├ birth: object            │              │
│ prompt           │ │  ├ place: string         │              │
│ └ string         │ │  └ date: date            │              │
│                  │ └ address: object           │              │
│ [+ Add Field]    │                            │              │
└──────────────────┴───────────────────────────┴──────────────┘
```

User bisa:

```text
Add field
Delete
Rename
Change type
Required
Description
Enum
Default
Array
Nested object
Reorder
```

---

# 27. API Playground

User dapat mencoba API mereka.

```text
POST /v1/ocr/01K...

Authorization:
Bearer sk_live_...

X-OCR-SPEC-ID:
01K...

Body:

{
    "image": "...",
    "prompt": "..."
}
```

Kemudian:

```text
REQUEST
──────────────

Status: 200

Time: 3.21s

RESPONSE
──────────────

{
  "success": true,
  "data": {
     ...
  }
}
```

Dan tampilkan:

```text
cURL
JavaScript
Python
PHP
Rust
Go
```

Ini akan sangat berguna untuk developer.

---

# 28. Satu perubahan penting dari desain awalmu

Saya **tidak menyarankan userID menjadi satu-satunya routing identifier**.

Lebih baik:

```http
POST /v1/ocr/{user_id}
```

dan:

```http
X-OCR-SPEC-ID: ...
```

Tetapi tambahkan juga `slug` atau `alias`.

Contoh:

```http
POST /v1/ocr/01KUSER.../ktp
```

Header:

```http
X-OCR-SPEC-ID: 01KSPEC...
```

Sehingga URL lebih manusiawi.

Tetapi internal tetap menggunakan ULID.

---

# 29. Arsitektur final yang saya rekomendasikan

```text
                         Internet
                            │
                            ▼
                    Cloudflare / WAF
                            │
                            ▼
                    Nginx / Traefik
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        Web Application              OCR API
        Next.js                      Rust/Axum
                                           │
              ┌────────────────────────────┼─────────────────┐
              │                            │                 │
              ▼                            ▼                 ▼
         PostgreSQL                     Redis             MinIO
              │                            │                 │
              │                            │                 │
              └──────────────┬─────────────┴─────────────────┘
                             │
                             ▼
                         Outbox
                             │
                             ▼
                        Redpanda
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
             Usage Worker          Audit Worker
                  │
                  ▼
              Analytics

                             OCR
                              │
                              ▼
                       AI Abstraction
                       /            \
                      /              \
                 Gemini             OpenAI
```

---

# 30. Master Prompt / Project Specification

Berikut prompt yang bisa langsung kamu berikan ke **AI coding agent** untuk mulai membangun project ini.

# OCR API Platform — Master Project Specification

## 1. Project Overview

Build a production-ready OCR API platform where users can create, configure, test, and expose their own OCR APIs.

The platform acts as an OCR API gateway and execution engine.

Users do not provide their own OCR implementation. Instead, users:

1. Register an account.
2. Configure an AI provider.
3. Add their own AI API key.
4. Create an OCR API specification.
5. Start from a predefined OCR template or create a schema from scratch.
6. Design request and response schemas using a graphical interface.
7. Define nested objects and arrays.
8. Configure prompts and extraction requirements.
9. Receive an API credential.
10. Call their OCR endpoint from external applications.
11. The platform sends the document and schema to the configured AI provider.
12. The AI performs OCR/extraction using image-capable AI and tool/function calling.
13. The platform validates the AI result against the user's response schema.
14. The platform returns JSON according to the user's API specification.
15. Every API request is monitored and recorded.

The system must be designed as a secure multi-tenant SaaS platform.

---

# 2. Technology Stack

## Backend

Use:

- Rust
- Tokio
- Axum
- SQLx
- PostgreSQL
- Serde
- validator
- tracing
- OpenTelemetry
- Redis
- Redpanda/Kafka
- MinIO/S3-compatible object storage
- Argon2
- AES-256-GCM or equivalent authenticated encryption
- ULID
- OpenAPI

Use Cargo Workspace.

Do not use a large monolithic Rust source directory.

Structure the backend as a modular monolith with clear domain boundaries.

---

# 3. Frontend

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- React Flow where useful
- Monaco Editor for JSON/schema/code examples

The UI must be developer-oriented and clean.

The OCR schema builder is one of the most important parts of the product.

---

# 4. Core Concepts

The system has these major concepts:

- User
- User Profile
- AI Provider
- AI Model
- User AI Credential
- API Credential
- OCR Template
- OCR Template Version
- OCR API Specification
- OCR API Specification Version
- Schema Node
- Prompt Template
- Prompt Version
- Tool Definition
- API Request
- Usage Record
- Audit Log
- Rate Limit

All important entities must use ULID identifiers.

---

# 5. Authentication

Users can:

- Register
- Login
- Logout
- Change password
- Reset password
- Manage profile

Passwords must be hashed using Argon2.

Never store plaintext passwords.

Implement authentication using secure HTTP-only cookies for the web application or another secure session mechanism.

The public OCR API must use API credentials.

---

# 6. User AI Provider Configuration

Currently support:

- Gemini
- OpenAI

A user must configure at least one AI provider before creating or activating an OCR API.

The user profile must contain an AI provider configuration screen.

Example:

Gemini:

- Enabled/Disabled
- API Key
- Default Model

OpenAI:

- Enabled/Disabled
- API Key
- Default Model

Never store AI API keys in plaintext.

Encrypt them at rest.

Never expose decrypted API keys through API responses.

Never write API keys to logs.

Never include API keys in request history.

---

# 7. AI Model Management

Administrators can manage AI models.

Database model:

ai_models

Fields should include at minimum:

- id
- provider_id
- name
- model_identifier
- supports_image
- supports_tool_calling
- supports_structured_output
- is_active
- created_at
- updated_at

Do not hardcode AI model identifiers throughout the application.

Use provider adapters.

---

# 8. AI Provider Abstraction

Create a common Rust interface for AI providers.

Conceptually:

AIProvider

Methods should support:

- image input
- text prompt
- system prompt
- tool/function definitions
- structured output
- model selection
- token usage
- error normalization

Implement:

- GeminiProvider
- OpenAIProvider

The application layer must not directly depend on provider-specific SDK behavior.

Use adapters.

---

# 9. OCR API Credentials

When a user registers, the platform must create API credentials.

Credentials consist of:

- public key
- secret key

The secret key must only be displayed to the user when created or explicitly rotated.

Never store the raw secret key.

Store a secure hash of the secret key.

Example:

public key:

pk_live_xxxxxxxxx

secret key:

sk_live_xxxxxxxxx

Database:

api_credentials

Fields:

- id
- user_id
- public_key
- secret_key_hash
- name
- environment
- last_used_at
- expires_at
- revoked_at
- created_at
- updated_at

Support:

- create credential
- rotate credential
- revoke credential
- list credentials
- last-used timestamp

---

# 10. OCR API Endpoint

External applications call:

POST /v1/ocr/{user_id}

Headers:

Authorization: Bearer sk_live_xxxxxxxxx

X-OCR-SPEC-ID: 01KXXXXXXXXXXXX

The user ID is a ULID.

The OCR specification ID determines which schema and configuration must be used.

Optionally support:

POST /v1/ocr/{user_id}/{slug}

The slug is human-readable but the internal identifier remains ULID.

---

# 11. OCR Specification

Each OCR API specification contains:

- id
- user_id
- name
- slug
- description
- status
- active_version_id
- created_at
- updated_at

Never modify an already-used schema destructively.

Implement versioning.

Example:

KTP OCR

Version 1

Version 2

Version 3

Old API requests must remain reproducible against the version that was active when the request occurred.

---

# 12. OCR Templates

Administrators can create OCR templates.

Initial templates may include:

- Indonesian KTP
- Indonesian SIM
- Passport
- NPWP
- Family Card
- Invoice
- Receipt
- Bank Statement
- Generic Identity Card

A template contains:

- metadata
- request schema
- response schema
- system prompt
- extraction prompt
- tool definition
- default model
- validation rules

Users can:

- select template
- clone template
- customize template
- create from scratch

Users must never directly modify the global template.

Creating from a template creates a user-owned copy/version.

---

# 13. Request Schema Builder

Users must be able to graphically define request fields.

Supported request types:

Basic:

- string
- text
- integer
- number
- boolean

Image/File:

- image
- file
- base64
- url

Special:

- date
- datetime
- email
- phone
- enum

Containers:

- object
- array

Each field should support:

- name
- label
- description
- type
- required
- nullable
- default value
- enum values
- array item type
- nested object
- validation rules

Nested structures must be supported recursively.

Example:

object
→ object
→ array
→ object
→ string

---

# 14. Initial Request Types

The initial OCR request implementation must support:

## Image as Base64

Example:

{
"image": "data:image/jpeg;base64,..."
}

## Image as URL

Example:

{
"image": "[https://example.com/document.jpg](https://example.com/document.jpg)"
}

When an image URL is provided:

1. Validate URL.
2. Protect against SSRF.
3. Reject localhost/private network destinations.
4. Download the file.
5. Validate MIME type.
6. Validate file size.
7. Store temporarily.
8. Send to AI.
9. Delete temporary file after processing.

Never allow arbitrary internal network access through the URL downloader.

## Additional Prompt

Allow:

{
"prompt": "Extract only the information visible on the document."
}

The additional prompt must be treated as untrusted user input.

Do not allow it to override platform security rules or the core extraction instructions.

---

# 15. Response Schema Builder

Users must be able to visually design the response JSON.

Supported types:

- string
- integer
- number
- boolean
- null
- object
- array
- date
- datetime
- email
- phone
- url
- enum
- money
- percentage

Objects and arrays must be recursive.

Example:

{
"type": "object",
"properties": {
"nik": {
"type": "string"
},
"name": {
"type": "string"
},
"birth": {
"type": "object",
"properties": {
"place": {
"type": "string"
},
"date": {
"type": "date"
}
}
},
"family_members": {
"type": "array",
"items": {
"type": "object",
"properties": {
"name": {
"type": "string"
},
"relationship": {
"type": "string"
}
}
}
}
}
}

---

# 16. Schema Representation

Do not hardcode schemas as arbitrary frontend-only JSON.

Create a normalized internal schema representation.

A schema node should conceptually contain:

- id
- parent_id
- schema_version_id
- name
- display_name
- type
- required
- nullable
- description
- order_index
- validation_rules
- enum_values
- created_at
- updated_at

Support recursive parent-child relationships.

The application must be able to compile the internal schema into:

- JSON Schema
- AI tool/function schema
- API validation schema
- frontend form schema
- documentation examples

JSON Schema should become the canonical interchange format.

---

# 17. Tool Calling Engine

The OCR engine must convert the user's response schema into an AI tool/function definition.

Example:

User schema:

nik: string
name: string
birth_date: date
address: object

Compile it into an AI extraction tool.

Conceptually:

extract_document(
nik: string,
name: string,
birth_date: string,
address: object
)

The exact provider implementation may differ between Gemini and OpenAI, but the platform must expose one internal abstraction.

---

# 18. OCR Execution Flow

Implement the following flow:

Client

↓

API Gateway

↓

Authenticate API credential

↓

Resolve user

↓

Resolve OCR specification

↓

Resolve active specification version

↓

Validate request

↓

Process image input

↓

Load user AI credential

↓

Load selected AI model

↓

Load platform system prompt

↓

Load OCR specification prompt

↓

Compile response schema

↓

Compile tool/function definition

↓

Call AI provider

↓

Receive tool/function output

↓

Validate AI output

↓

Normalize types

↓

Apply response schema

↓

Return JSON

↓

Record request metrics

↓

Publish analytics/audit event asynchronously

---

# 19. AI Output Validation

Never trust AI output directly.

The AI response must pass:

1. JSON parsing
2. Schema validation
3. Type validation
4. Required field validation
5. Enum validation
6. Nested object validation
7. Array validation

If the AI returns invalid data, return a controlled error.

Example:

{
"success": false,
"error": {
"code": "INVALID_AI_OUTPUT",
"message": "The AI output does not match the configured response schema."
}
}

Do not leak internal AI provider errors to customers.

---

# 20. Standard API Response

Successful response:

{
"success": true,
"data": {},
"meta": {
"request_id": "01K...",
"processing_time_ms": 3200
}
}

Error response:

{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Human readable error"
},
"meta": {
"request_id": "01K..."
}
}

---

# 21. API Request Monitoring

Every OCR API request must be recorded.

Create:

api_requests

Fields:

- id
- request_id
- user_id
- api_spec_id
- api_spec_version_id
- credential_id
- provider_id
- model_id
- status
- http_status
- input_type
- input_size
- processing_time_ms
- prompt_tokens
- completion_tokens
- total_tokens
- estimated_cost
- error_code
- ip_address
- user_agent
- created_at
- completed_at

Do not store raw document content by default.

Do not store raw Base64 image data in request logs.

Do not store user AI API keys.

Sensitive fields must be redacted.

---

# 22. Usage Records

Create a separate usage table.

Track:

- user
- provider
- model
- request
- input tokens
- output tokens
- total tokens
- estimated cost
- processing duration
- timestamp

This will later support:

- billing
- quota
- usage dashboard
- cost analysis

---

# 23. Admin Dashboard

Create an administration area.

Administrators can manage:

Users

AI Providers

AI Models

OCR Templates

Prompt Templates

Tool Definitions

Data Types

API Requests

Usage

Audit Logs

System Settings

Rate Limits

---

# 24. Admin Analytics

Dashboard must display:

- total users
- active users
- total OCR requests
- requests today
- requests this month
- success rate
- error rate
- average latency
- P50 latency
- P95 latency
- P99 latency
- Gemini usage
- OpenAI usage
- model usage
- estimated AI cost

Charts:

- requests over time
- requests by provider
- requests by model
- errors by type
- latency distribution
- usage by user

---

# 25. Prompt Management

Do not hardcode global OCR prompts in source code.

Create:

prompt_templates

and:

prompt_versions

Support:

- draft
- active
- archived

Every OCR request must be traceable to the prompt version used.

Global prompts may include:

- OCR system prompt
- extraction prompt
- validation prompt
- security instructions
- tool-calling instructions

---

# 26. Security

Implement security from the beginning.

Required:

- Argon2 password hashing
- encrypted AI API keys
- hashed OCR secret keys
- secure credential rotation
- credential revocation
- rate limiting
- request body size limit
- image size limit
- MIME validation
- SSRF protection
- temporary file cleanup
- API key redaction
- Base64 redaction
- prompt injection mitigation
- audit logging
- request IDs
- secure headers

Never log:

- passwords
- API keys
- secret keys
- Base64 images
- raw documents
- full sensitive OCR results

---

# 27. Temporary File Management

Development:

Use local temporary storage.

Production:

Use MinIO/S3-compatible object storage.

Temporary files must have:

- random object name
- TTL
- automatic cleanup
- no public access

Recommended lifecycle:

Upload

↓

Temporary object

↓

OCR processing

↓

Delete

The platform must never expose temporary object URLs publicly.

---

# 28. Rate Limiting

Rate limiting must exist at multiple levels:

- IP
- user
- API credential
- OCR specification

Use Redis.

Support configurable limits.

Example:

100 requests/minute

1000 requests/hour

10000 requests/day

Administrators must be able to configure limits.

---

# 29. Event Architecture

Use PostgreSQL as the source of truth.

Use the Outbox Pattern.

Important events:

- user.created
- credential.created
- credential.revoked
- ocr_spec.created
- ocr_spec.updated
- ocr_request.completed
- ocr_request.failed
- usage.recorded

The API should not require Kafka/Redpanda for the synchronous OCR response.

Use asynchronous workers for:

- analytics
- usage aggregation
- audit processing
- cleanup
- billing
- notifications

---

# 30. Rust Project Structure

Use Cargo Workspace:

ocr-platform/

apps/

api/

worker/

crates/

domain/

user/

credential/

ocr/

template/

ai/

request/

audit/

application/

auth/

ocr/

template/

ai/

admin/

infrastructure/

postgres/

redis/

storage/

kafka/

crypto/

ai/

gemini/

openai/

tool_calling/

structured_output/

shared/

error/

id/

validation/

config/

migrations/

docs/

architecture.md

database.md

security.md

api.md

README.md

---

# 31. Frontend Pages

Implement:

/login

/register

/dashboard

/profile

/profile/ai-providers

/profile/api-credentials

/ocr

/ocr/new

/ocr/[id]

/ocr/[id]/builder

/ocr/[id]/playground

/templates

/templates/[id]

/api-requests

/api-requests/[id]

/docs

/admin

/admin/users

/admin/providers

/admin/models

/admin/templates

/admin/prompts

/admin/tools

/admin/data-types

/admin/requests

/admin/usage

/admin/audit-logs

---

# 32. OCR Builder UI

The builder must allow users to visually create schemas.

Features:

- Add field
- Remove field
- Rename field
- Change type
- Required
- Nullable
- Description
- Enum
- Array
- Object
- Nested object
- Reorder fields
- Duplicate field
- Preview JSON
- Preview JSON Schema
- Preview generated tool definition

Example UI:

Request Schema

image
type: image
required: true

prompt
type: text
required: false

Response Schema

nik
string
required

name
string
required

birth
object
place
string
date
date

---

# 33. API Playground

Every OCR specification must have a playground.

The playground must show:

- endpoint
- headers
- request body
- file upload
- Base64 input
- URL input
- additional prompt
- generated cURL
- generated JavaScript
- generated Python
- generated PHP
- generated Rust
- generated Go

After execution show:

- HTTP status
- request ID
- processing time
- AI provider
- AI model
- response JSON
- validation result

Do not expose the user's raw AI API key.

---

# 34. API Documentation Generator

Automatically generate documentation from OCR specification.

For every OCR API provide:

- endpoint
- authentication
- headers
- request schema
- response schema
- examples
- cURL
- JavaScript
- Python
- PHP
- Go
- Rust

Documentation must automatically update when a new API specification version becomes active.

---

# 35. Database Design

Use PostgreSQL.

All primary keys should use ULID.

Create migrations for:

users

user_profiles

api_credentials

ai_providers

ai_models

user_ai_credentials

ocr_templates

ocr_template_versions

ocr_specs

ocr_spec_versions

schema_nodes

prompt_templates

prompt_versions

tool_definitions

api_requests

usage_records

audit_logs

rate_limits

outbox_events

system_settings

Use foreign keys.

Use appropriate indexes for:

user_id

api_spec_id

request_id

created_at

status

provider_id

model_id

credential_id

---

# 36. Important Indexes

At minimum:

api_requests(request_id)

api_requests(user_id, created_at)

api_requests(api_spec_id, created_at)

api_requests(status, created_at)

usage_records(user_id, created_at)

audit_logs(user_id, created_at)

ocr_specs(user_id, slug)

api_credentials(user_id)

---

# 37. API Error Codes

Create standardized errors.

Examples:

AUTHENTICATION_FAILED

INVALID_CREDENTIAL

CREDENTIAL_REVOKED

USER_NOT_FOUND

OCR_SPEC_NOT_FOUND

OCR_SPEC_INACTIVE

INVALID_REQUEST

MISSING_REQUIRED_FIELD

INVALID_IMAGE

INVALID_IMAGE_URL

IMAGE_TOO_LARGE

UNSUPPORTED_MEDIA_TYPE

RATE_LIMIT_EXCEEDED

AI_PROVIDER_NOT_CONFIGURED

AI_MODEL_NOT_AVAILABLE

AI_PROVIDER_ERROR

AI_TIMEOUT

INVALID_AI_OUTPUT

SCHEMA_VALIDATION_FAILED

INTERNAL_ERROR

Every error must have a request_id.

---

# 38. Observability

Use:

- tracing
- OpenTelemetry
- Prometheus
- Grafana

Every request must have:

request_id

trace_id

user_id

api_spec_id

provider

model

latency

status

Never include secrets or document contents in traces/logs.

---

# 39. Testing

Implement:

Unit tests

Integration tests

API tests

Schema compiler tests

AI provider adapter tests

Security tests

SSRF tests

Rate limit tests

Credential authentication tests

OCR response validation tests

Template cloning tests

Versioning tests

End-to-end OCR tests using mocked AI providers.

Do not make automated tests depend on real Gemini/OpenAI API calls.

Create provider mocks.

---

# 40. Docker

Provide Docker Compose for development.

Services:

- PostgreSQL
- Redis
- Redpanda
- MinIO
- API
- Worker
- Frontend

The application must be configurable entirely through environment variables.

Provide:

.env.example

Do not commit secrets.

---

# 41. Configuration

Create typed Rust configuration.

Configuration categories:

APP

DATABASE

REDIS

KAFKA/REDPANDA

STORAGE

JWT/SESSION

ENCRYPTION

AI

RATE_LIMIT

OBSERVABILITY

Do not access environment variables directly throughout the codebase.

Load configuration once and inject it.

---

# 42. Development Phases

Implement in phases.

## Phase 1

Foundation:

- Rust workspace
- Axum
- PostgreSQL
- migrations
- ULID
- configuration
- error handling
- tracing
- Docker

## Phase 2

Authentication:

- registration
- login
- profile
- user management
- API credentials

## Phase 3

AI Provider:

- provider abstraction
- Gemini
- OpenAI
- encrypted API keys
- model management

## Phase 4

OCR Specification:

- templates
- specification
- versioning
- schema nodes
- request schema
- response schema

## Phase 5

Schema Builder:

- graphical builder
- nested object
- arrays
- JSON Schema compiler
- tool schema compiler

## Phase 6

OCR Engine:

- image Base64
- image URL
- temporary storage
- SSRF protection
- AI execution
- tool calling
- output validation

## Phase 7

API Gateway:

- public OCR endpoint
- authentication
- rate limiting
- request monitoring
- error handling

## Phase 8

Playground:

- API testing
- generated examples
- generated documentation

## Phase 9

Administration:

- users
- models
- templates
- prompts
- tools
- data types
- requests
- usage
- audit logs

## Phase 10

Async Architecture:

- outbox
- Redpanda
- workers
- analytics
- usage aggregation
- cleanup

## Phase 11

Production Hardening:

- OpenTelemetry
- Prometheus
- Grafana
- security hardening
- load testing
- integration testing
- backup
- migration strategy

---

# 43. Engineering Principles

Follow these principles:

1. PostgreSQL is the source of truth.
2. Use ULID everywhere.
3. Prefer modular monolith over premature microservices.
4. Keep domain logic independent from Axum.
5. Keep AI providers behind an abstraction.
6. Never hardcode model-specific logic in business logic.
7. Never store API keys in plaintext.
8. Never trust AI output.
9. Validate all AI output against user-defined schema.
10. Never trust external URLs.
11. Protect against SSRF.
12. Never log sensitive document contents.
13. Use schema versioning.
14. Keep synchronous OCR execution separate from asynchronous analytics.
15. Use the Outbox Pattern for events.
16. Make all important operations observable.
17. Make the system multi-tenant from the beginning.
18. Avoid destructive schema changes.
19. Every external API request must have a request ID.
20. Keep provider-specific code isolated.

---

# 44. Expected Final User Flow

Registration:

User registers

↓

Platform generates API credentials

↓

User opens Profile

↓

User activates Gemini/OpenAI

↓

User enters AI API key

↓

Platform validates provider

↓

User opens OCR API

↓

Choose:

[Use Template]

or

[Start From Scratch]

↓

OCR Builder

↓

Define request schema

↓

Define response schema

↓

Configure prompt

↓

Choose AI provider/model

↓

Save

↓

Platform generates OCR API specification ID

↓

API becomes active

↓

User opens Playground

↓

Test request

↓

See response

↓

Copy cURL / SDK examples

↓

Use API from external application

---

# 45. Final API Example

Request:

POST /v1/ocr/01KUSER123

Authorization: Bearer sk_live_xxxxx

X-OCR-SPEC-ID: 01KSPEC123

Content-Type: application/json

{
"image": "[https://example.com/ktp.jpg](https://example.com/ktp.jpg)",
"prompt": "Extract only information that is clearly visible."
}

Internal execution:

Request

→ Authentication

→ Resolve user

→ Resolve specification

→ Validate request

→ Download image

→ Temporary storage

→ Load user Gemini/OpenAI credential

→ Load model

→ Load prompt

→ Compile tool schema

→ AI image analysis

→ Tool call

→ Validate tool output

→ Normalize response

→ Record usage

→ Return response

Response:

{
"success": true,
"data": {
"nik": "7400000000000001",
"name": "JOHN DOE",
"birth": {
"place": "KENDARI",
"date": "1998-01-01"
}
},
"meta": {
"request_id": "01KREQUEST123",
"processing_time_ms": 3210
}
}

---

# 46. Implementation Rule for the Coding Agent

Do not attempt to implement the entire system in one step.

Work phase by phase.

For every phase:

1. Explain the architecture.
2. Create database migration.
3. Implement domain models.
4. Implement application services.
5. Implement infrastructure.
6. Implement API endpoints.
7. Implement tests.
8. Update documentation.
9. Run formatting.
10. Run tests.
11. Run clippy.
12. Verify the implementation.
13. Only then continue to the next phase.

Never silently introduce a new technology.

If a new dependency is required, explain why it is necessary before adding it.

Keep business logic independent from the web framework.

The final system must be production-oriented, secure, multi-tenant, observable, testable, and extensible to additional AI providers in the future.

---

## Beberapa keputusan yang menurut saya paling penting

Ada **4 hal yang saya ubah dari konsep awalmu** dan menurut saya akan membuat produk ini jauh lebih kuat:

### 1. `OCR Specification` harus versioned

Jangan:

```text
user edit schema
↓
schema lama berubah
```

Tetapi:

```text
KTP OCR
├── v1
├── v2
└── v3 ← active
```

Ini penting karena API adalah **contract**.

---

### 2. Schema builder sebaiknya menghasilkan JSON Schema

Jangan membuat format schema sendiri yang hanya dimengerti frontend.

Lebih bagus:

```text
Visual Builder
      ↓
Internal Schema
      ↓
JSON Schema
      ├── API Validator
      ├── AI Tool Schema
      ├── Documentation
      ├── Playground
      └── SDK Generator
```

Satu schema bisa digunakan untuk banyak fungsi.

---

### 3. Pisahkan AI key user dengan API credential platform

Ini dua credential yang berbeda:

```text
User AI Credential
    ↓
Gemini/OpenAI API Key
```

vs.

```text
Platform API Credential
    ↓
pk_live
sk_live
```

Yang pertama dipakai **platform → AI provider**.

Yang kedua dipakai **customer → platform**.

Ini harus dipisahkan secara eksplisit di database dan codebase.

---

### 4. Jadikan `OCR Execution Engine` sebagai core domain

Struktur mental project-nya sebaiknya:

```text
                    ┌──────────────┐
                    │  Web Admin   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ OCR API      │
                    │ Gateway      │
                    └──────┬───────┘
                           │
                  ┌────────▼────────┐
                  │ OCR Execution   │
                  │ Engine          │
                  └────────┬────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
          Schema         Prompt        Tool
          Engine         Engine       Engine
             │             │             │
             └─────────────┼─────────────┘
                           │
                    ┌──────▼───────┐
                    │ AI Provider  │
                    ├──────────────┤
                    │ Gemini       │
                    │ OpenAI       │
                    └──────────────┘
```

Dengan desain ini, nanti kalau kamu ingin menambahkan:

```text
Anthropic
Mistral
Qwen
Ollama
Azure OpenAI
AWS Bedrock
```

tidak perlu mengubah OCR engine. Tinggal membuat adapter provider baru.

Dan untuk tahap awal, saya akan **tetap menggunakan modular monolith Rust + PostgreSQL + Redis**, lalu Redpanda/Kafka hanya untuk pekerjaan asynchronous. Itu jauh lebih masuk akal daripada langsung memecah API, OCR engine, schema engine, dan AI engine menjadi banyak microservice.

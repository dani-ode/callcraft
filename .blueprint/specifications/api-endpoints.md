# Specifications — API Endpoints Reference

This document presents the complete REST API contract specifications for **Callcraft**, divided into 3 primary categories: **Internal Management API** (`/internal/v1/*`), **Public Customer Data Plane API** (`/v1/call/{user_id}`), and **Admin Platform API** (`/admin/v1/*`).

---

## 1. Public Customer Data Plane API

The primary channel for external customer applications to execute dynamic multimodal AI processing.

### `POST /v1/call/{user_id}`

Executes dynamic multimodal AI processing based on the specified `X-CALL-SPEC-ID`.

#### Request Headers:
```http
Authorization: Bearer call_sk_sample_key_1234567890
X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ
X-Request-ID: req_882391005_abc
X-Correlation-ID: trc_5599201
Content-Type: application/json
```

#### Path Parameters:
- `user_id` (string, required): ULID identifier of the Callcraft specification owner.

#### Request Body Options:

##### Option A: Base64 File Payload
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
  "prompt": "Verify document authenticity and extract key fields",
  "variables": { "environment": "production" }
}
```

##### Option B: Image / Document URL Download Payload
```json
{
  "image": "https://storage.clientdomain.com/documents/ktp-sample.jpg",
  "prompt": "Ensure date of birth strictly uses YYYY-MM-DD format"
}
```

---

#### Envelope Response Specifications (Q&A 6 & Q&A 7)

##### 1. Success Response Envelope (`200 OK` - `meta.status = "completed"`):
```json
{
  "meta": {
    "request_id": "req_882391005_abc",
    "trace_id": "trc_5599201",
    "timestamp": "2026-08-23T20:05:12Z",
    "status": "completed",
    "api_version": "v2.1",
    "execution_mode": "sync"
  },
  "data": {
    "primary_result": {
      "type": "structured_json",
      "content": {
        "nik": "3271041508950001",
        "full_name": "BUDI SANTOSO",
        "gender": "MALE",
        "birth": {
          "place": "BOGOR",
          "date": "1995-08-15"
        },
        "address": {
          "street": "JL. MERDEKA NO. 45",
          "rt_rw": "002/005",
          "district": "PAKUAN",
          "city": "KOTA BOGOR"
        }
      }
    },
    "human_readable_message": "Identitas dokumen berhasil diekstrak dan divalidasi."
  },
  "execution_trace": {
    "total_duration_ms": 1240,
    "steps": [
      {
        "step_id": "step_1",
        "agent": "vision_parser",
        "action_type": "tool_call",
        "tool_name": "extract_document_data",
        "status": "success",
        "duration_ms": 1200
      }
    ],
    "warnings": []
  },
  "metrics": {
    "usage": {
      "prompt_tokens": 850,
      "completion_tokens": 120,
      "total_tokens": 970
    },
    "estimated_cost_usd": 0.001455
  }
}
```

##### 2. Actionable Error Response Envelope (`400/422/403/429/500/504` - `meta.status = "failed"`):
```json
{
  "meta": {
    "request_id": "req_882391009_xyz",
    "trace_id": "trc_5599202",
    "timestamp": "2026-08-23T20:07:15Z",
    "status": "failed",
    "api_version": "v2.1",
    "execution_mode": "sync"
  },
  "error": {
    "code": "INVALID_IMAGE_FORMAT",
    "message": "Gambar tidak dapat diproses. Pastikan formatnya adalah JPG atau PNG, dan resolusi tidak melebihi 4K.",
    "details": [
      {
        "field": "image",
        "issue": "String Base64 corrupt atau bukan format gambar yang dikenali."
      }
    ],
    "actionable_step": "Silakan kompres gambar atau periksa kembali proses encoding Base64 di sisi client."
  },
  "execution_trace": {
    "total_duration_ms": 120,
    "steps": [],
    "warnings": []
  }
}
```

##### 3. Partial Success Response Envelope (`200 OK` / `207 Multi-Status` - `meta.status = "partial_success"`):
```json
{
  "meta": {
    "request_id": "req_882391010_pqr",
    "trace_id": "trc_5599203",
    "timestamp": "2026-08-23T20:08:00Z",
    "status": "partial_success",
    "api_version": "v2.1",
    "execution_mode": "sync"
  },
  "data": {
    "primary_result": {
      "type": "structured_json",
      "content": {
        "estimasi_biaya": 450000000
      }
    },
    "human_readable_message": "Analisis denah dan estimasi biaya berhasil, namun sistem gagal menjadwalkannya di kalender."
  },
  "error": {
    "code": "PARTIAL_TOOL_FAILURE",
    "message": "Gagal mengeksekusi tool 'create_calendar_event'.",
    "details": [
      {
        "issue": "Google Calendar API sedang down (HTTP 503)."
      }
    ],
    "actionable_step": "Hasil analisis telah disimpan. Jadwalkan ulang event kalender secara manual."
  },
  "execution_trace": {
    "total_duration_ms": 3200,
    "steps": [
      { "step_id": "step_1", "agent": "vision_parser", "action_type": "tool_call", "tool_name": "vision_analysis", "status": "success", "duration_ms": 1500 },
      { "step_id": "step_2", "agent": "data_retriever", "action_type": "tool_call", "tool_name": "query_milvus_db", "status": "success", "duration_ms": 500 },
      { "step_id": "step_3", "agent": "integrator", "action_type": "tool_call", "tool_name": "create_calendar_event", "status": "failed", "duration_ms": 1200 }
    ],
    "warnings": ["Tool create_calendar_event failed with HTTP 503"]
  }
}
```

---

#### Standardized Error Codes Reference Table

| Category | HTTP Code | Error Code (`error.code`) | Trigger Condition | Recommended Client Action |
| :--- | :---: | :--- | :--- | :--- |
| **Client Input** | `400` | `VALIDATION_ERROR` | Malformed JSON, missing prompt/variables | Correct payload syntax; do not auto-retry |
| **Client Input** | `422` | `UNSUPPORTED_MEDIA_TYPE` | Non-image payload or invalid MIME | Use valid JPEG, PNG, or PDF format |
| **Client Input** | `422` | `INVALID_IMAGE_FORMAT` | Corrupt Base64 string or image > 4K | Re-encode file or compress image size |
| **Security** | `401` | `UNAUTHORIZED` | Invalid or missing API Key (`call_sk_...`) | Check Authorization bearer token |
| **Security** | `403` | `SSRF_BLOCKED` | Remote URL points to internal IP/localhost | Provide public, safe remote file URL |
| **Rate Limit** | `429` | `RATE_LIMIT_EXCEEDED` | Request frequency exceeds key limit | Apply Exponential Backoff wait |
| **AI Model** | `403` | `AI_SAFETY_BLOCK` | Image/prompt triggered safety filter | Inspect image content for violations |
| **AI Model** | `422` | `VISION_EXTRACTION_FAILED` | Image unreadable, blurry, or low quality | Provide clearer high-contrast image |
| **AI Model** | `422` | `AI_HALLUCINATION_DETECTED` | Model failed tool spec after 2 retries | Adjust prompt instructions or spec |
| **Tool/Infra** | `500` | `TOOL_EXECUTION_FAILED` | Internal tool execution exception | Inspect step log in `execution_trace` |
| **Tool/Infra** | `504` | `UPSTREAM_AI_TIMEOUT` | AI Model provider timed out (>60s) | Retry request with exponential backoff |
| **Partial** | `207` / `200` | `PARTIAL_TOOL_FAILURE` | Primary tool succeeded, sub-tool failed | Process partial `data`; retry failed tool |

---

## 2. Internal Management API (`/internal/v1/*`)

Used exclusively by the Next.js Control Plane server. Requires Service Auth Headers:
- `X-Service-Client-Id`: `svc_nextjs_main`
- `X-Service-Client-Secret`: `sec_live_...`

### Summary Table of Internal Endpoints:

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `POST` | `/internal/v1/auth/verify-service` | Verifies service client credentials |
| `GET` | `/internal/v1/users/{id}` | Fetches user profile data |
| `POST` | `/internal/v1/users` | Registers new user from Next.js Control Plane |
| `GET` | `/internal/v1/call-specs` | Lists user's Callcraft specifications (paginated) |
| `POST` | `/internal/v1/call-specs` | Creates a new Callcraft specification (Save draft/active) |
| `GET` | `/internal/v1/call-specs/{id}` | Fetches detailed spec and version history |
| `PUT` | `/internal/v1/call-specs/{id}` | Updates spec and increments version number |
| `POST` | `/internal/v1/api-credentials` | Generates a new API Key pair (`pk_...` & `call_sk_...`)|
| `GET` | `/internal/v1/templates` | Lists official platform templates |
| `GET` | `/internal/v1/analytics/usage` | Queries request audit logs & aggregated token metrics |

---

## 3. Admin Platform API (`/admin/v1/*`)

Used for administrative platform operations. Requires Bearer JWT Admin Token + RBAC permission checks.

### Endpoints Detail:

#### `GET /admin/v1/models`
- **Permission**: `model.manage`
- **Description**: Lists all AI Vision & LLM Models registered on the platform along with active status.

#### `POST /admin/v1/models`
- **Permission**: `model.manage`
- **Request Body**:
  ```json
  {
    "provider_code": "gemini",
    "name": "Gemini 1.5 Pro Vision",
    "model_identifier": "gemini-1.5-pro",
    "supports_image": true,
    "supports_tool_calling": true,
    "is_default": false
  }
  ```

#### `PUT /admin/v1/models/{id}`
- **Permission**: `model.manage`
- **Description**: Enables/disables an AI model or modifies default token rate limits.

#### `POST /admin/v1/users/{id}/suspend`
- **Permission**: `user.manage`
- **Description**: Suspends a user account and immediately blocks all active API Keys for that user across the Data Plane (invalidates Redis caches).

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

#### Response Specifications:

##### Success Response (`200 OK`):
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
    "processing_time_ms": 1240,
    "tokens": {
      "prompt_tokens": 850,
      "completion_tokens": 120,
      "total_tokens": 970
    }
  },
  "data": {
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
}
```

##### Error Responses:

###### `400 Bad Request` (Invalid Input / Schema Mismatch)
```json
{
  "success": false,
  "request_id": "req_01HZY...",
  "error": {
    "code": "INVALID_FILE_PAYLOAD",
    "message": "Base64 payload size exceeds maximum 10 MB limit"
  }
}
```

###### `401 Unauthorized` (Invalid / Missing API Key)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API Secret Key provided in Authorization header"
  }
}
```

###### `429 Too Many Requests` (Rate Limit Exceeded)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API Key rate limit of 60 requests/minute exceeded. Try again in 14 seconds."
  }
}
```

###### `502 Bad Gateway` (AI Provider Error)
```json
{
  "success": false,
  "request_id": "req_01HZY...",
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "Upstream AI Provider returned rate limit error (HTTP 429)"
  }
}
```

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

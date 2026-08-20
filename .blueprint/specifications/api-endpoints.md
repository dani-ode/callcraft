# Specifications — API Endpoints Reference

Dokumen ini menyajikan spesifikasi kontrak REST API lengkap untuk **OCR Platform**, dibagi menjadi 3 kategori utama: **Internal Management API** (`/internal/v1/*`), **Public Customer OCR Data Plane API** (`/v1/ocr/{user_id}`), dan **Admin Platform API** (`/admin/v1/*`).

---

## 1. Public Customer Data Plane OCR API

Jalur utama untuk aplikasi eksternal pelanggan dalam mengeksekusi ekstraksi OCR dokumen.

### `POST /v1/ocr/{user_id}`

Executes OCR document data extraction based on the specified `X-OCR-SPEC-ID`.

#### Request Headers:
```http
Authorization: Bearer ocr_sk_sample_key_1234567890
X-OCR-SPEC-ID: 01HZX89ABCDEF1234567890XYZ
Content-Type: application/json
```

#### Path Parameters:
- `user_id` (string, required): ULID dari akun user pemilik spesifikasi OCR.

#### Request Body Options:

##### Option A: Base64 Image Payload
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
  "prompt": "Harap perhatikan NIK jika agak samar"
}
```

##### Option B: Image URL Download Payload
```json
{
  "image": "https://storage.clientdomain.com/documents/ktp-sample.jpg",
  "prompt": "Pastikan tanggal lahir sesuai format YYYY-MM-DD"
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
    "name": "KTP Indonesia OCR",
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
    "gender": "LAKI-LAKI",
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
    "code": "INVALID_IMAGE_PAYLOAD",
    "message": "Base64 image size exceeds maximum 10 MB limit"
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
    "message": "Upstream Gemini Vision API returned rate limit error (HTTP 429)"
  }
}
```

---

## 2. Internal Management API (`/internal/v1/*`)

Digunakan secara eksklusif oleh server Next.js Control Plane. Membutuhkan Service Auth Headers:
- `X-Service-Client-Id`: `svc_nextjs_main`
- `X-Service-Client-Secret`: `sec_live_...`

### Summary Table of Internal Endpoints:

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `POST` | `/internal/v1/auth/verify-service` | Memverifikasi kredensial service client |
| `GET` | `/internal/v1/users/{id}` | Mengambil data profile pengguna |
| `POST` | `/internal/v1/users` | Mendaftarkan pengguna baru dari Next.js |
| `GET` | `/internal/v1/ocr-specs` | List OCR Specs milik pengguna (dengan pagination) |
| `POST` | `/internal/v1/ocr-specs` | Membuat OCR Spec baru (Save draft/active) |
| `GET` | `/internal/v1/ocr-specs/{id}` | Detail OCR Spec beserta versi schema |
| `PUT` | `/internal/v1/ocr-specs/{id}` | Update OCR Spec (Increment version) |
| `POST` | `/internal/v1/api-credentials` | Membuat pasangan API Key baru (`pk_...` & `sk_...`)|
| `GET` | `/internal/v1/templates` | List katalog template resmi platform |
| `GET` | `/internal/v1/analytics/usage` | Log metadata request & agregasi token user |

---

## 3. Admin Platform API (`/admin/v1/*`)

Digunakan untuk operasi administratif platform. Membutuhkan Bearer JWT Admin Token + Peran RBAC.

### Endpoints Detail:

#### `GET /admin/v1/models`
- **Permission**: `model.manage`
- **Description**: Mengambil daftar seluruh AI Vision Model yang terdaftar di platform beserta status aktif.

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
- **Description**: Mengaktifkan/menonaktifkan model atau mengubah batas kuota token default.

#### `POST /admin/v1/users/{id}/suspend`
- **Permission**: `user.manage`
- **Description**: Membekukan akun pengguna dan memblokir seluruh eksekusi API Key pengguna tersebut di Data Plane secara langsung (invalidation di Redis).

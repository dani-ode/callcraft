# Architecture — Security & Authentication

This document provides a comprehensive description of the security model, 3-tier authentication schema, credential encryption standards, Role-Based Access Control (RBAC), and Server-Side Request Forgery (SSRF) prevention guidelines for **Callcraft**.

---

## 1. Multi-Tier Authentication Channels

To enforce the principle of *least privilege*, Callcraft isolates backend access into **3 independent authentication channels**:

```text
                               ┌──────────────────────────┐
                               │  Python FastAPI Gateway  │
                               └────────────┬─────────────┘
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         │                                  │                                  │
         ▼                                  ▼                                  ▼
┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
│   Channel 1:     │               │   Channel 2:     │               │   Channel 3:     │
│  Service Auth    │               │ Customer API Key │               │ Admin Auth (RBAC)│
│ /internal/v1/*   │               │ /v1/call/{user_id}│              │  /admin/v1/*     │
└────────┬─────────┘               └────────┬─────────┘               └────────┬─────────┘
         │                                  │                                  │
   Next.js Server                   Customer External App              Platform Admin User
```

---

### Channel 1: Service Auth (Next.js Server-Side ➔ Python API)
- **Target Endpoints**: `/internal/v1/*`
- **Purpose**: Enables the Next.js server (App Router Server Actions / Route Handlers) to manage platform data (such as creating users, saving specifications, managing templates, and retrieving analytics logs).
- **Mechanism**:
  1. Next.js stores `SERVICE_CLIENT_ID` and `SERVICE_CLIENT_SECRET` securely in server environment variables (`.env.local`). **These credentials must never be exposed to the browser client**.
  2. On every request from Next.js to the Python FastAPI backend, Next.js sends headers:
     ```http
     X-Service-Client-Id: svc_nextjs_main
     X-Service-Client-Secret: sec_live_xxxxxxxxxxxxxxxxxxxxxxxx
     ```
  3. The Python backend matches `secret_hash` stored in the `service_clients` database table using Argon2id (`argon2-cffi`).
  4. (Optional extension): Short-lived JWT Service Token exchange (15-minute expiration).

---

### Channel 2: Customer API Key Auth (External App ➔ Python Data Plane)
- **Target Endpoints**: `/v1/call/{user_id}`
- **Purpose**: Authenticates customer applications invoking dynamic Callcraft execution APIs.
- **Header Specification**:
  ```http
  Authorization: Bearer call_sk_sample_key_1234567890
  X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ
  ```
- **Scope & Constraints**:
  - API Keys possess a single permission scope: `call.execute`.
  - API Keys **CANNOT** access management endpoints (`/internal/v1/*` or `/admin/v1/*`).
  - Python API performs lookup on `public_key` and verifies `secret_key_hash` using Redis Cache with PostgreSQL fallback.

---

### Channel 3: Admin Auth & Session (Admin Dashboard ➔ Python API)
- **Target Endpoints**: `/admin/v1/*`
- **Purpose**: Administrative operations including AI Model management, System Prompt editing, user account suspension, and global audit inspection.
- **Mechanism**:
  - Uses Bearer JWT Access Tokens generated upon administrative login.
  - Every request is validated against the administrative user's RBAC role and permission matrix.

---

## 2. Role-Based Access Control (RBAC) Matrix

Administrative access is governed by the following permission matrix:

| Scope / Feature | SUPER_ADMIN | ADMIN | SUPPORT | ANALYST | CUSTOMER_USER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage AI Models & Providers** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage System Prompts** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Global Templates** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Platform Users** | ✅ | ✅ | 👁️ Read | ❌ | ❌ |
| **View Global API Requests Log**| ✅ | ✅ | ✅ | ✅ | ❌ |
| **Manage Own Call Specs** | ✅ | ❌ | ❌ | ❌ | ✅ (Own Only) |
| **Manage Own Provider Keys** | ✅ | ❌ | ❌ | ❌ | ✅ (Own Only) |
| **Execute Public Callcraft API** | ❌ | ❌ | ❌ | ❌ | ✅ (via API Key) |

---

## 3. Storage & Encryption Security Standard

### A. Customer AI Provider API Keys Encryption (AES-256-GCM)
Users enter their own Gemini, OpenAI, Anthropic, or DeepSeek API keys in their profile settings. **API Keys are never stored as plaintext**.

```text
User AI API Key (Plaintext Input)
               │
               ▼
┌──────────────────────────────────────────────┐
│ Platform Master Encryption Key (256-bit)    │
│ Standard: AES-256-GCM + Random 12-byte Nonce │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
 PostgreSQL Table: `user_ai_providers`
 Columns: `encrypted_api_key`, `key_nonce`
```

#### Lifecycle Decryption in RAM:
1. When a `/v1/call/{user_id}` request is received, the Python Data Plane retrieves the user's `encrypted_api_key` and `key_nonce` from Redis/PostgreSQL.
2. The key is decrypted in RAM using the Platform Master Encryption Key via Python `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
3. The plaintext API key string is passed directly in HTTP headers to Google / OpenAI / Anthropic API endpoints.
4. The key variable is dereferenced and garbage collected immediately after the HTTP call finishes.
5. API Keys **MUST NEVER** be logged in application logs, exception tracebacks, or debugging output.

### B. Customer Secret Keys Hashing (Argon2id)
When a customer generates a new API Key:
1. The system generates a key pair:
   - `public_key`: `pk_live_...` (ULID or random string)
   - `secret_key`: `call_sk_live_...` (Cryptographically secure random string)
2. **The secret key is displayed ONCE** to the user on the dashboard UI.
3. The database **ONLY stores the Argon2id hash** of the secret key:
   - Memory Cost: `64 MB`
   - Time Cost: `3 iterations`
   - Parallelism: `4 threads`

---

## 4. SSRF Protection Guidelines (Server-Side Request Forgery)

When request payloads specify remote image or document URLs (`"image": "https://example.com/document.pdf"`), the Data Plane validates the URL against strict SSRF rules before issuing HTTP requests.

```text
User Input File URL: "https://example.com/document.pdf"
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│           SSRF Security Validation Check             │
│                                                      │
│ 1. Parse URL & Scheme Check (Must be HTTP / HTTPS)   │
│ 2. Resolve DNS IP Address                            │
│ 3. Check IP against Blacklist / Private Subnets:     │
│    - 127.0.0.0/8 (Loopback)                          │
│    - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16       │
│    - 169.254.0.0/16 (Link-local / Cloud Metadata)   │
│    - ::1/128, fc00::/7 (IPv6 local)                  │
│ 4. Disable HTTP Redirect Follow (Prevent DNS Rebind) │
│ 5. Enforce Stream Limit (Max 10 MB) & Timeout (10s)  │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
           Fetch File Stream to RAM
```

### Python Implementation Reference:
```python
import ipaddress
import socket
from urllib.parse import urlparse

class SsrfError(Exception):
    pass

def validate_url_ip(url_str: str) -> str:
    parsed = urlparse(url_str)
    if parsed.scheme not in ("http", "https"):
        raise SsrfError("Invalid URL scheme: only HTTP and HTTPS are permitted")

    host = parsed.hostname
    if not host:
        raise SsrfError("Invalid host string")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addr_info = socket.getaddrinfo(host, port)

    for family, socktype, proto, canonname, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_unspecified:
            raise SsrfError(f"SSRF Protection: Access to IP address {ip} is forbidden")

    return url_str
```

---

## 5. Audit Logging Security & Envelope Error Masking (Q&A 5, 6 & 7)

### A. Zero Data Retention (ZDR) Audit Logs
To balance strict privacy guarantees with operational observability, Callcraft decouples audit metadata logging from payload content:
- **Recorded Audit Fields (`api_requests` table)**: `request_id`, `trace_id`, `user_id`, `call_spec_id`, `status`, `execution_mode`, `http_status`, `input_type`, `input_size_bytes`, `processing_time_ms`, token usage, estimated cost, client IP, and standardized `error_code`.
- **Forbidden Audit Fields**: Base64 strings, binary image bytes, raw prompt text, dynamic variables, extracted JSON payloads, or decrypted AI provider API keys.

### B. Envelope Error Response Sanitization
When security or validation checks fail, the backend returns standardized Actionable Error Envelopes:
1. **No Internal Leakage**: Error messages (`error.message`) and details (`error.details`) are sanitized to prevent leaking database schemas, internal host paths, stack tracebacks, or secret key hashes.
2. **Standardized Codes**: Uses predefined uppercase codes (such as `UNAUTHORIZED`, `SSRF_BLOCKED`, `RATE_LIMIT_EXCEEDED`, `VALIDATION_ERROR`).
3. **Auditability**: Every error envelope retains `meta.request_id` and `meta.trace_id`, enabling customer support engineers to correlate client issues with server log entries without exposing internal details to the client.


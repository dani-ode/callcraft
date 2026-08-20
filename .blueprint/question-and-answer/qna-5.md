# Q&A Discussion 5: Service Auth, Customer Auth & Admin RBAC

## QUESTION:
Is there a specific credential mechanism between Next.js and Python so that unauthorized users cannot edit settings or perform administrative actions?

---

## ANSWER:

Yes. I strongly recommend **3 distinct authentication channels**:

1. **Next.js ➔ Python API** (`/internal/v1/*`) for internal Control Plane management.
2. **Customer App ➔ Python API** (`/v1/call/{user_id}`) for public Callcraft execution.
3. **Admin User ➔ Python API** (`/admin/v1/*`) for platform-level RBAC operations.

Customer API keys must never be capable of accessing management or administrative endpoints.

---

## 1. Channel 1: Service Auth (Next.js ➔ Python API)

Next.js operates as an authenticated service client for management operations:

```text
Browser User
   │
   ▼
Next.js (Server Action / Route Handler)
   │
   │ Service Auth Headers
   ▼
Python Management API (/internal/v1/*)
```

Request Header Format:
```http
X-Service-Client-Id: svc_nextjs_main
X-Service-Client-Secret: sec_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

Python verifies `secret_hash` using Argon2id against the `service_clients` database table. If an unauthenticated client tries to hit `/internal/v1/*` endpoints directly without valid service credentials, access is rejected immediately (HTTP 401/403).

---

## 2. Channel 2: Customer API Key Auth (Customer ➔ Python API)

Customer applications use API Keys generated from the dashboard:

```http
Authorization: Bearer call_sk_live_sample_key_1234567890
X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ
```

Flow:
```text
External Customer App ➔ Python API Gateway ➔ Validate API Key & Execute Callcraft API
```

This credential possesses a single permission scope: `call.execute`. It **CANNOT** perform management tasks like `user.read`, `model.manage`, `template.manage`, or `system_prompt.update`.

---

## 3. Channel 3: Admin Auth & Role-Based Access Control (RBAC)

Admin users authenticate using Bearer JWT tokens with RBAC permission checks:

| Endpoint Path | Browser User | Next.js Service | Customer API Key | Admin User |
| :--- | :---: | :---: | :---: | :---: |
| `/internal/v1/users` | ❌ | ✅ | ❌ | ✅ |
| `/internal/v1/call-specs` | ❌ | ✅ | ❌ | ✅ |
| `/v1/call/{user_id}` | ❌ | ❌ | ✅ | ✅ |
| `/admin/v1/models` | ❌ | ❌ | ❌ | ✅ (`model.manage`) |
| `/admin/v1/system-prompts` | ❌ | ❌ | ❌ | ✅ (`prompt.manage`) |
| `/admin/v1/users/{id}/suspend` | ❌ | ❌ | ❌ | ✅ (`user.manage`) |

---

## Summary of Identity Isolation

```text
               Python FastAPI Gateway
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     SERVICE           USER             ADMIN
  Next.js Server   Customer Key     Admin JWT
  (/internal/v1)  (/v1/call/{id})  (/admin/v1/*)
```

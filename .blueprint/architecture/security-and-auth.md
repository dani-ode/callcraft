# Architecture — Security & Authentication

Dokumen ini mendeskripsikan secara mendalam model keamanan, skema autentikasi 3-jalur, penanganan enkripsi kredensial pengguna, Role-Based Access Control (RBAC), serta langkah-langkah proteksi Server-Side Request Forgery (SSRF) pada **Callcraft**.

---

## 1. Multi-Tier Authentication Channels

Untuk menjamin prinsip *least privilege*, sistem memisahkan akses ke backend Python FastAPI menjadi **3 jalur autentikasi independen**:

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
- **Target Endpoint**: `/internal/v1/*`
- **Tujuan**: Memungkinkan server Next.js (App Router Server Actions / Route Handlers) mengelola data platform (seperti membuat user, menyimpan spec, membuat template, mengambil log).
- **Mekanisme**:
  1. Next.js menyimpan `SERVICE_CLIENT_ID` dan `SERVICE_CLIENT_SECRET` di lingkungan server (`.env.local`). **Credential ini tidak boleh pernah ter-expose ke browser client**.
  2. Pada setiap request server Next.js ke Python FastAPI, Next.js mengirimkan header:
     ```http
     X-Service-Client-Id: svc_nextjs_main
     X-Service-Client-Secret: sec_live_xxxxxxxxxxxxxxxxxxxxxxxx
     ```
  3. Backend Python mencocokkan `secret_hash` di database `service_clients` menggunakan Argon2id (`argon2-cffi`).
  4. (Pengembangan Opsional): Pertukaran short-lived JWT Service Token (Masa berlaku 15 menit).

---

### Channel 2: Customer API Key Auth (External App ➔ Python Data Plane)
- **Target Endpoint**: `/v1/call/{user_id}`
- **Tujuan**: Autentikasi aplikasi eksternal milik customer yang ingin melakukan eksekusi Callcraft API dinamis.
- **Mekanisme Header**:
  ```http
  Authorization: Bearer call_sk_sample_key_1234567890
  X-CALL-SPEC-ID: 01HZX89ABCDEF1234567890XYZ
  ```
- **Scope & Constraints**:
  - API Key ini **HANYA** memiliki izin tunggal: `call.execute`.
  - API Key **TIDAK BISA** digunakan untuk mengakses endpoint manajemen (`/internal/v1/*` atau `/admin/v1/*`).
  - Python API melakukan matching `public_key` dan memverifikasi `secret_key_hash` dengan Redis Cache (fallback PostgreSQL).

---

### Channel 3: Admin Auth & Session (Admin Dashboard ➔ Python API)
- **Target Endpoint**: `/admin/v1/*`
- **Tujuan**: Operasi administratif tingkat tinggi seperti manajemen AI Models, manipulasi System Prompts, suspensi User, dan inspeksi audit global.
- **Mekanisme**:
  - Menggunakan Bearer JWT Access Token yang dihasilkan dari login admin.
  - Setiap request diverifikasi terhadap peran (*role*) dan hak akses (*permissions*) RBAC penggunanya.

---

## 2. Role-Based Access Control (RBAC) Matrix

Akses administratif diatur secara presisi menggunakan matriks peran berikut:

| Scope / Feature | SUPER_ADMIN | ADMIN | SUPPORT | ANALYST | CUSTOMER_USER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage AI Models & Providers** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage System Prompts** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Global Templates** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Platform Users** | ✅ | ✅ | 👁️ Read | ❌ | ❌ |
| **View Global API Requests Log**| ✅ | ✅ | ✅ | ✅ | ❌ |
| **Manage Own OCR Specs** | ✅ | ❌ | ❌ | ❌ | ✅ (Own Only) |
| **Manage Own Provider Keys** | ✅ | ❌ | ❌ | ❌ | ✅ (Own Only) |
| **Execute Public OCR API** | ❌ | ❌ | ❌ | ❌ | ✅ (via API Key) |

---

## 3. Storage & Encryption Security Standard

### A. Customer AI Provider API Keys Encryption (AES-256-GCM)
User wajib memasukkan API Key Gemini atau OpenAI milik mereka di menu Profile. **API Key ini tidak pernah disimpan sebagai plaintext**.

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

#### Lifecycle Decryption di RAM:
1. Saat request `/v1/ocr/{user_id}` diterima, Rust mengambil `encrypted_api_key` dan `key_nonce` milik user dari Redis/Postgres.
2. Key didekripsi di dalam RAM menggunakan Platform Master Encryption Key.
3. String API Key digunakan secara langsung pada HTTP Client header ke Google/OpenAI.
4. Variabel API Key di-zeroize / di-drop dari RAM setelah request selesai.
5. API Key **TIDAK BOLEH** pernah dicatat dalam `tracing`, `println!`, atau log error.

### B. Customer API Secret Keys Hashing (Argon2id)
Saat user membuat API Key baru untuk aplikasi mereka:
1. System membangkitkan pasangan key:
   - `public_key`: `pk_live_...` (ULID/Random string)
   - `secret_key`: `sk_live_...` (Cryptographically secure random string)
2. **Secret key hanya ditampilkan SEKALI** kepada user pada layar UI dashboard.
3. Database **HANYA menyimpan hash** dari secret key menggunakan algoritma **Argon2id**:
   - Memory Cost: `64 MB`
   - Time Cost: `3 iterations`
   - Parallelism: `4 threads`

---

## 4. SSRF Protection Guidelines (Server-Side Request Forgery)

Jika masukan request pengguna berupa URL gambar (`"image": "https://example.com/ktp.jpg"`), Rust Data Plane wajib mendownload gambar tersebut secara aman.

```text
User Input Image URL: "https://example.com/ktp.jpg"
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
│ 5. Validate MIME Header (Must be image/jpeg, png, etc│
│ 6. Enforce Stream Limit (Max 10 MB) & Timeout (10s)  │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
           Fetch Image Stream to RAM
```

### Implementasi Rust Safeguard Pseudocode:
```rust
// Modul validasi IP sebelum HTTP reqwest
pub fn validate_url_ip(url: &Url) -> Result<IpAddr, SecurityError> {
    let host = url.host_str().ok_or(SecurityError::InvalidHost)?;
    let ips = resolve_dns(host)?;
    for ip in ips {
        if ip.is_loopback() || ip.is_private() || ip.is_multicast() || is_cloud_metadata(ip) {
            return Err(SecurityError::SSRFForbiddenIP(ip));
        }
    }
    Ok(ips[0])
}
```

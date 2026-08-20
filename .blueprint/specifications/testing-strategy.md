# Specifications — Professional Testing Strategy & Quality Assurance

Dokumen ini mendeskripsikan strategi pengujian (*testing strategy*) profesional menyeluruh untuk **OCR Platform**. Pengujian dirancang mengikuti piramida pengujian perangkat lunak modern (*Software Testing Pyramid*), mencakup Unit Testing, Integration Testing, End-to-End (E2E) Testing, Load & Performance Testing, serta Audit Keamanan & Retention Memory Audit.

---

## 📐 1. Software Testing Pyramid Architecture

```text
                     /\
                    /  \         E2E & UI Flow Tests (Playwright)
                   / E2E\        - Dashboard UI, Visual Schema Builder, API Key Generation
                  /------\
                 / Load & \      Performance & Load Tests (k6)
                / Security \     - Throughput, P95 Latency, Memory Leak, SSRF Fuzzing
               /------------\
              / Integration  \   Integration Tests (Rust testcontainers + SQLx + Redis)
             /   Testing      \  - Axum Routes, DB Queries, Redis Cache & Rate Limiter
            /------------------\
           /    Unit Testing    \ Unit Tests (Rust Cargo Test + Vitest)
          /                      \ - Schema Coercion Engine, Tool Generator, Crypto, SSRF Validations
         /------------------------\
```

---

## 🧪 2. Unit Testing Specification

Unit test menjamin bahwa fungsi-fungsi atomik di dalam kode berjalan sesuai spesifikasi tanpa dependensi eksternal (*isolated*).

### A. Core Rust Unit Tests (`crates/ocr-engine` & `apps/api`)

| Module | Test Coverage Goal | Tooling |
| :--- | :--- | :--- |
| **Schema Converter Engine** | Menguji translasi dari `ResponseSchema` ke Tool Calling Spec OpenAI & Gemini | `cargo test` |
| **Type Coercion Engine** | Menguji toleransi kesalahan tipe AI (misal: `"123"` ➔ `123`, `"15-08-1995"` ➔ Date) | `cargo test` |
| **SSRF URL Validator** | Menguji pemblokiran IP private (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, IPv6) | `cargo test` |
| **Crypto Modules** | Menguji dekripsi/enkripsi AES-256-GCM dan hashing Argon2id | `cargo test` |
| **Base64 Stream Decoder** | Menguji dekripsi Base64 gambar langsung ke `Bytes` buffer RAM | `cargo test` |
| **AI Adapter Mocks** | Menguji serialisasi request & deserialisasi respon AI Vision | `wiremock` |

#### Contoh Unit Test Rust Pseudocode:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_ssrf_validator_blocks_private_ips() {
        let private_url = Url::parse("http://169.254.169.254/latest/meta-data/").unwrap();
        let result = validate_url_ip(&private_url);
        assert!(matches!(result, Err(SecurityError::SSRFForbiddenIP(_))));
    }

    #[test]
    fn test_type_coercion_string_to_date() {
        let schema = ResponseSchema::date_field();
        let coerced = schema.validate_and_coerce(json!("1995-08-15")).unwrap();
        assert_eq!(coerced, json!("1995-08-15"));
    }
}
```

### B. Next.js Frontend Unit Tests (`apps/web`)
- **Framework**: `Vitest` + `@testing-library/react` + `Zod`.
- **Cakupan**: Validasi form Sign Up/Login, state management React Flow Schema Builder, kustom hook TanStack Query.

---

## 🔗 3. Integration Testing Specification

Integration test memverifikasi interaksi antar komponen (*Rust API + PostgreSQL + Redis*) menggunakan instance aktual.

### A. Rust Integration Testing Strategy (`apps/api/tests`)
- **Database Testing**: Menggunakan `sqlx::test` atau `testcontainers-rs` untuk menjalankan container ephemeral PostgreSQL & Redis selama eksekusi test.
- **Axum API Route Testing**: Menguji handler HTTP menggunakan `tower::ServiceExt` tanpa menyalakan port socket asli.

#### Contoh Integration Test Axum Route Pseudocode:
```rust
#[sqlx::test]
async fn test_public_ocr_execution_rate_limit(pool: PgPool) {
    let app = create_app(pool).await;

    // Send 61 consecutive requests to trigger rate limit (Max 60 req/min)
    for i in 1..=60 {
        let response = app.clone().oneshot(build_ocr_request()).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // 61st request must return 429 Too Many Requests
    let response = app.oneshot(build_ocr_request()).await.unwrap();
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
}
```

---

## 🎭 4. End-to-End (E2E) UI & API Testing

E2E Test memverifikasi *user flow* nyata dari ujung ke ujung menggunakan **Playwright**.

```text
                       Playwright Test Suite
                                │
   ┌────────────────────────────┴────────────────────────────┐
   │                                                         │
   ▼                                                         ▼
[ E2E Scenario 1: Dashboard Flow ]         [ E2E Scenario 2: Public API Execution ]
1. Admin Sign Up & Login                   1. Generate API Key via Dashboard
2. Create KTP OCR Spec via Visual Editor   2. Send POST /v1/ocr/{user_id} via HTTP
3. Configure Gemini AI Provider Key        3. Mock AI Provider Response via Wiremock
4. Test Playground & verify execution      4. Assert JSON Output matches Spec 100%
```

---

## ⚡ 5. Performance, Load & Memory Leak Auditing

Untuk menjamin klaim **High Performance** dan **Stateless Privacy-First (0 Bytes Data Retention)**, platform harus lolos uji beban dan audit memori.

### A. Load Testing dengan `k6`
Target Performa minimal di lingkungan VPS 4 CPU / 8 GB RAM:
- **Throughput**: minimal `200 RPS` (Requests Per Second) untuk spec cache hit.
- **P95 Latency**: `< 50ms` untuk gateway validation & spec resolution (diluar latency AI Provider).
- **Error Rate**: `0.00%` pada beban normal.

#### Contoh Skrip Load Test `k6`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m', target: 100 },  // Stay at 100 VUs
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

export default function () {
  const url = 'http://127.0.0.1:8080/v1/ocr/01HZX89ABCDEF1234567890XYZ';
  const payload = JSON.stringify({
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk_live_test_key_123',
      'X-OCR-SPEC-ID': '01HZX89ABCDEF1234567890XYZ',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'success field is true': (r) => r.json().success === true,
  });
  sleep(0.1);
}
```

### B. Memory Retention Audit (Zero Data Retention Guarantee)
- **Metode**: Menjalankan perkakas audit memori Rust (`valgrind`, `heaptrack`, atau `dtrace`) selama eksekusi 10.000+ request OCR.
- **Kriteria Kelulusan**:
  1. Tidak ada memori teralokasi (*heap memory leak*) yang terus meningkat seiring bertambahnya request.
  2. Buffer `Bytes` gambar yang digunakan dalam eksekusi ter-zeroize / ter-drop sempurna dari RAM.
  3. Disk inspector (`ls /tmp`, `du -sh /var/tmp`) mengonfirmasi `0 bytes` file temporer yang tercipta di OS host.

---

## 🔒 6. Security Fuzzing & Vulnerability Scanning

Sebelum rilis ke production, jalankan rangkaian pengujian keamanan otomatis:

1. **SSRF Fuzzing**: Mengirimkan masukan URL dengan skema berbahaya (`file:///etc/passwd`, `gopher://`, `dict://`, `http://10.0.0.1/admin`).
2. **Payload Size Exhaustion**: Mengirimkan request body 50 MB, 100 MB untuk memastikan HTTP Server (Apache & Axum) menolak request sebelum memuat ke memori.
3. **Automated Dependency Audit**:
   - Rust: `cargo audit` dan `cargo clippy -- -D warnings`
   - Node.js: `npm audit --audit-level=high`

---

## 🔄 7. Continuous Integration (CI/CD) Pipeline Workflow

Setiap *Pull Request* atau *Commit* ke branch `main` akan memicu pipeline GitHub Actions / GitLab CI berikut secara otomatis:

```text
                               Commit / Pull Request
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Actions CI Pipeline                            │
│                                                                                 │
│ ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐  │
│ │   Code Linting     │   │    Unit Testing    │   │ Security Audit Scanning  │  │
│ │ cargo fmt --check  │   │ cargo test         │   │ cargo audit              │  │
│ │ cargo clippy       │   │ npm run test       │   │ npm audit                │  │
│ │ npm run lint       │   │                    │   │                          │  │
│ └─────────┬──────────┘   └─────────┬──────────┘   └────────────┬─────────────┘  │
│           │                        │                           │                │
│           └────────────────────────┼───────────────────────────┘                │
│                                    │                                            │
│                                    ▼                                            │
│                     ┌──────────────────────────────┐                            │
│                     │  Integration Tests & Build   │                            │
│                     │  sqlx migrate run            │                            │
│                     │  docker build check          │                            │
│                     └──────────────┬───────────────┘                            │
│                                    │                                            │
│                                    ▼                                            │
│                     ┌──────────────────────────────┐                            │
│                     │     Playwright E2E Tests     │                            │
│                     └──────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

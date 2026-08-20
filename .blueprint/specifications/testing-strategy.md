# Specifications — Professional Testing Strategy & Quality Assurance

This document details the comprehensive, professional testing strategy for **Callcraft**. The testing framework is designed following the modern **Software Testing Pyramid**, encompassing Unit Testing, Integration Testing, End-to-End (E2E) Testing, Load & Performance Testing, as well as Security Fuzzing & Memory Retention Audits.

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
              / Integration  \   Integration Tests (Python testcontainers + Asyncpg + Redis)
             /   Testing      \  - FastAPI Routes, DB Queries, Redis Cache & Rate Limiter
            /------------------\
           /    Unit Testing    \ Unit Tests (Python Pytest + Bun Test)
          /                      \ - Schema Coercion Engine, Tool Generator, Crypto, SSRF Validations
         /------------------------\
```

---

## 🧪 2. Unit Testing Specification

Unit tests verify that atomic units of logic execute correctly in isolation without external infrastructure dependencies.

### A. Core Python Unit Tests (`apps/api/src/callcraft_engine`)

| Module | Test Coverage Goal | Tooling |
| :--- | :--- | :--- |
| **Schema Converter Engine** | Verifies translation of `ResponseSchema` to OpenAI / Gemini Tool Calling Specs | `pytest` |
| **Type Coercion Engine** | Tests AI output fault tolerance (e.g., `"123"` ➔ `123`, `"1995-08-15"` ➔ Date) | `pytest` |
| **SSRF URL Validator** | Verifies private IP blocking (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, IPv6) | `pytest` |
| **Crypto Modules** | Tests AES-256-GCM encryption/decryption and Argon2id password hashing | `pytest` |
| **Base64 Stream Decoder** | Tests Base64 stream decoding directly to RAM `bytes` buffers | `pytest` |
| **AI Adapter Mocks** | Mocks request serialization and AI model response deserialization | `pytest-mock` / `respx` |

#### Python Unit Test Reference:
```python
import pytest
from callcraft_engine.ssrf import validate_url_ip, SsrfError
from callcraft_engine.schema import FieldDefinition, PlatformDataType, ResponseSchema
from callcraft_engine.coercion import validate_and_coerce

def test_ssrf_validator_blocks_private_ips():
    private_url = "http://169.254.169.254/latest/meta-data/"
    with pytest.raises(SsrfError):
        validate_url_ip(private_url)

def test_type_coercion_string_to_date():
    schema = ResponseSchema(properties={
        "birth_date": FieldDefinition(type=PlatformDataType.DATE, required=True)
    })
    coerced = validate_and_coerce(schema, {"birth_date": "1995-08-15"})
    assert coerced["birth_date"] == "1995-08-15"
```

### B. Next.js Frontend Unit Tests (`apps/web`)
- **Framework**: `Bun Test` / `Vitest` + `@testing-library/react` + `Zod`.
- **Coverage**: Sign Up/Login form validation, React Flow Schema Builder state management, TanStack Query custom hooks.

---

## 🔗 3. Integration Testing Specification

Integration tests verify interactions between platform components (*Python FastAPI + PostgreSQL + Redis*) using live container instances.

### A. Python Integration Testing Strategy (`apps/api/tests`)
- **Database & Cache Testing**: Uses `testcontainers-python` to launch ephemeral PostgreSQL & Redis containers during test execution.
- **FastAPI Route Testing**: Tests HTTP handlers using `httpx.AsyncClient` against the FastAPI application without opening external listening sockets.

#### FastAPI Route Integration Test Example:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from apps.api.main import app

@pytest.mark.asyncio
async def test_public_call_execution_rate_limit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {
            "Authorization": "Bearer call_sk_sample_key_1234567890",
            "X-CALL-SPEC-ID": "01HZX89ABCDEF1234567890XYZ"
        }

        # Send consecutive requests to verify rate limiter thresholds
        response = await ac.post("/v1/call/sample_user_id", json={"prompt": "Test prompt"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["success"] is True
```

---

## 🎭 4. End-to-End (E2E) UI & API Testing

E2E tests verify real user flows end-to-end using **Playwright**.

```text
                       Playwright Test Suite
                                │
   ┌────────────────────────────┴────────────────────────────┐
   │                                                         │
   ▼                                                         ▼
[ E2E Scenario 1: Dashboard Flow ]         [ E2E Scenario 2: Public API Execution ]
1. Admin Sign Up & Login                   1. Generate API Key via Dashboard
2. Create Document Spec via Visual Editor  2. Send POST /v1/call/{user_id} via HTTP
3. Configure Gemini AI Provider Key        3. Mock AI Provider Response via respx
4. Test Playground & verify execution      4. Assert JSON Output matches Spec 100%
```

---

## ⚡ 5. Performance, Load & Memory Leak Auditing

To validate **High Performance** and **Stateless Privacy-First (0 Bytes Data Retention)** guarantees, the platform undergoes automated load testing and memory auditing.

### A. Load Testing with `k6`
Target performance metrics on a 4 CPU / 8 GB RAM VPS:
- **Throughput**: Minimum `200 RPS` (Requests Per Second) for cached spec hits.
- **P95 Latency**: `< 50ms` for gateway validation & spec resolution (excluding upstream AI Provider latency).
- **Error Rate**: `0.00%` under standard load.

#### Sample `k6` Load Test Script:
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
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

export default function () {
  const url = 'http://127.0.0.1:8080/v1/call/01HZX89ABCDEF1234567890XYZ';
  const payload = JSON.stringify({
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    prompt: 'Extract document metadata'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer call_sk_live_test_key_123',
      'X-CALL-SPEC-ID': '01HZX89ABCDEF1234567890XYZ',
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
- **Methodology**: Running Python memory profiling tools (`tracemalloc`, `memory_profiler`) during continuous execution of 10,000+ API requests.
- **Pass Criteria**:
  1. No heap memory leaks or uncollected objects accumulating over prolonged execution.
  2. Memory buffers (`bytes`) explicitly garbage collected after payload dispatch.
  3. Host disk inspection (`ls /tmp`, `du -sh /var/tmp`) confirms `0 bytes` of temporary files created on the host OS.

---

## 🔒 6. Security Fuzzing & Vulnerability Scanning

Automated security checks executed prior to production release:

1. **SSRF Fuzzing**: Dispatching payload URLs containing dangerous schemes (`file:///etc/passwd`, `gopher://`, `dict://`, `http://10.0.0.1/admin`).
2. **Payload Size Exhaustion**: Sending 50 MB, 100 MB request bodies to ensure web servers (Apache & Uvicorn) reject oversized payloads before buffering into RAM.
3. **Automated Dependency Auditing**:
   - Python: `pip-audit` or `safety check`
   - Bun / Node: `bun audit` or `npm audit --audit-level=high`

---

## 🔄 7. Continuous Integration (CI/CD) Pipeline Workflow

Every Pull Request or commit to `main` automatically triggers the GitHub Actions CI pipeline:

```text
                               Commit / Pull Request
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Actions CI Pipeline                            │
│                                                                                 │
│ ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐  │
│ │   Code Linting     │   │    Unit Testing    │   │ Security Audit Scanning  │  │
│ │ ruff / flake8      │   │ pytest             │   │ pip-audit                │  │
│ │ bun run lint       │   │ bun test           │   │ bun audit                │  │
│ └─────────┬──────────┘   └─────────┬──────────┘   └────────────┬─────────────┘  │
│           │                        │                           │                │
│           └────────────────────────┼───────────────────────────┘                │
│                                    │                                            │
│                                    ▼                                            │
│                     ┌──────────────────────────────┐                            │
│                     │  Integration Tests & Build   │                            │
│                     │  python -m pytest tests/     │                            │
│                     │  docker build check          │                            │
│                     └──────────────┬───────────────┘                            │
│                                    │                                            │
│                                    ▼                                            │
│                     ┌──────────────────────────────┐                            │
│                     │     Playwright E2E Tests     │                            │
│                     └──────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

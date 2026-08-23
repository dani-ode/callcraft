# Architecture — System Overview

This document describes the high-level architecture of **Callcraft**, including the separation of **Control Plane** and **Data Plane** components, the stateless in-memory data processing pipeline, and the end-to-end request lifecycle from client invocation to structured JSON responses.

---

## 1. High-Level Architecture

Callcraft adopts a decoupled micro-service monorepo design separating the **Python 3.12 (FastAPI)** *Data Plane Execution Engine* from the **Next.js 14 (App Router running on Bun)** *Control Plane Dashboard*.

```text
                                   ┌──────────────────────┐
                                   │       INTERNET       │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │     Apache Host      │
                                   │ SSL / Reverse Proxy  │
                                   └──────────┬───────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │ HTTP/HTTPS                                        │ HTTP/HTTPS
                    ▼                                                   ▼
       ┌─────────────────────────┐                         ┌─────────────────────────┐
       │   app.yourdomain.com    │                         │   api.yourdomain.com    │
       │   Dashboard Web App     │                         │  Public Dynamic API GW  │
       │   (Next.js + Bun)       │                         │   (Python / FastAPI)    │
       └────────────┬────────────┘                         └────────────┬────────────┘
                    │                                                   │
                    │ Service Credential Auth                           │
                    │ /internal/v1/*                                    │ Customer API Key
                    └─────────────────────────┬─────────────────────────┘ /v1/call/{user_id}
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │   Python FastAPI     │
                                   │  (Execution Engine)  │
                                   └──────────┬───────────┘
                                              │
                 ┌────────────────────────────┼────────────────────────────┐
                 │                            │                            │
                 ▼                            ▼                            ▼
      ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
      │   PostgreSQL 16    │       │     Redis 7        │       │    AI Providers    │
      │ Spec, Key, User,   │       │ Cache Call Specs,  │       │ Google Gemini API  │
      │ Metadata Request   │       │ Rate Limits        │       │ OpenAI / Anthropic │
      └────────────────────┘       └────────────────────┘       └────────────────────┘
                 ▲                                                         │
                 │                                                         │
                 └────────────────────────────┬────────────────────────────┘
                                              │ Async Outbox Log
                                              ▼
                                   ┌──────────────────────┐
                                   │    Python Worker     │
                                   │ Analytics Aggregator │
                                   └──────────────────────┘
```

---

## 2. Separation of Concerns: Control Plane vs Data Plane

### A. Control Plane (Next.js + Bun - `app.yourdomain.com`)
- **Function**: GUI management interface for platform users and system administrators.
- **Key Features**:
  1. Registration, Login, Profile Management, & API Key Generation (Public & Secret Keys `call_sk_...`).
  2. AI Provider Key Management (User-provided API Keys for Gemini, OpenAI, Anthropic, DeepSeek).
  3. Visual API Specification Builder (React Flow & Monaco Editor) to design dynamic request and response schemas.
  4. Template Marketplace (Invoice, Receipt, Document Parser, Form Extractor, Custom API Builder).
  5. Monitoring Dashboard & Analytics (API hit counts, token consumption, latency distribution, error rates).
  6. Admin Management UI (System models, user role RBAC management, prompt system editing).
- **Note**: Next.js **NEVER** proxies public API traffic from external customer applications.

### B. Data Plane (Python FastAPI - `api.yourdomain.com`)
- **Function**: High-performance, stateless execution engine.
- **Key Features**:
  1. Receiving & Validating Customer Requests (`POST /v1/call/{user_id}`).
  2. Authentication & Rate Limiting (API Key `call_sk_...` verification & Token Bucket rate limiter in Redis).
  3. Spec Resolution: Fetching Call Spec definitions from Redis cache (with PostgreSQL fallback).
  4. In-Memory Image & Document Handling: Stream decoding Base64 payloads or fetching HTTP URLs directly into RAM buffers (`bytes`).
  5. AI Engine Execution: Translating response schemas into dynamic JSON Tool Calling declarations for Gemini, OpenAI, Anthropic, or DeepSeek APIs.
  6. Response Mapping & Type Coercion: Validating raw AI model output against user response schemas and coercing data types.
  7. Async Request Audit Logging: Dispatching execution metadata (token counts, processing latency, estimated cost, HTTP status) to outbox queue without storing documents or sensitive raw text.

---

## 3. Stateless RAM-Only Data Processing Pipeline

Callcraft enforces strict **Zero Data Retention (ZDR)** for all documents and context payloads. Files are never written to host disk storage, temporary directories, MinIO, S3, or databases.

```text
  Client App Request (Base64 / File URL)
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│                FastAPI Request Handler               │
│                                                      │
│ 1. Stream Request Body (Max 10 MB limit)             │
│ 2. Decode Base64 OR Download URL via httpx (in RAM)  │
│ 3. Buffer stored in RAM bytes object                 │
│                                                      │
│                     │                                │
│                     ▼                                │
│ 4. Pass Bytes directly to AI Adapter (Gemini/OpenAI) │
│                                                      │
│                     │                                │
│                     ▼                                │
│ 5. Receive Structured Tool Output from AI            │
│ 6. Garbage Collect bytes buffer memory immediately   │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
   JSON Response returned to Client App
```

### Memory Safety & Retention Rules:
- **Base64 Payload**: FastAPI validates the Base64 header and decodes the string directly into an in-memory `bytes` object.
- **URL Payload**: Asynchronous HTTP GET streaming via `httpx` downloads content directly into `bytes` in RAM with a 10-second timeout and 10 MB file size restriction. Protected against SSRF vulnerabilities.
- **Memory Cleanup**: The `bytes` buffer is explicitly released and garbage collected as soon as payload dispatch to the AI provider completes.

---

## 4. Dynamic AI Execution Engine (Tool / Function Calling)

To guarantee that AI output strictly conforms 100% to the user-defined `response_schema`, Callcraft employs **Structured Tool / Function Calling** instead of plain text prompts.

```text
  User Callcraft Spec (Response Schema Definition)
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              Tool Generator Engine                   │
│                                                      │
│ Transforms Response Schema -> Dynamic AI Tool:       │
│ Name: "extract_document_data"                        │
│ Parameters: JSON Schema derived from Response Schema │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                   AI Provider                        │
│ (Gemini 1.5 Flash/Pro Vision OR OpenAI GPT-4o)       │
│                                                      │
│ System Prompt: Platform Base Prompt + Spec Prompt    │
│ Input: File Bytes Buffer + User Prompt + Variables   │
│ Tools: [ extract_document_data Tool Schema ]         │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│           AI Tool Call Arguments Output              │
│                                                      │
│ JSON Output: {"nik": "3271...", "name": "BUDI", ...} │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│          Schema Validation & Type Coercion           │
│                                                      │
│ 1. Validate fields against Pydantic schema           │
│ 2. Coerce types (e.g., String -> Date, Int -> String)│
│ 3. Apply Enum matching & Default fallbacks           │
│ 4. Internal Hallucination Auto-Retry (1-2 attempts)  │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
 ┌────────────────────────────────────────────────────┐
 │         Envelope Packaging & Tracing Engine        │
 │                                                    │
 │ Wrap Output into Standardized Envelope:            │
 │ - Meta (request_id, trace_id, status, mode)        │
 │ - Data (primary_result + human message) OR Error   │
 │ - Execution Trace (duration, steps[], warnings[])  │
 │ - Metrics (token usage & estimated cost)           │
 └──────────────────────┬─────────────────────────────┘
                        │
                        ▼
           Final Response JSON Envelope
```

### 4.1. Envelope Pattern & Distributed Tracing (Q&A 6 & Q&A 7)

Callcraft standardizes all API communication via the **Envelope Pattern**:
1. **Separation of Metadata & Payload**: The `"meta"` block isolates infrastructure headers (`request_id`, `trace_id`, `execution_mode`) from business payloads (`"data"` or `"error"`).
2. **Execution Steps Tracing**: The `"execution_trace"` block logs every internal step duration and status. The `"steps"` field is **guaranteed to be a JSON Array (`[]`)**, even if only a single step was executed.
3. **Internal Hallucination Auto-Retry**: When an AI provider returns structural hallucinations or missing key parameters, the Engine triggers an internal auto-retry (up to 2 times) with feedback prompts before escalating to an `AI_HALLUCINATION_DETECTED` error envelope.
4. **Graceful Degradation (`partial_success`)**: In complex multi-tool workflows, if non-fatal tools fail while primary extractions succeed, the Engine returns HTTP 200/207 with `meta.status = "partial_success"`, embedding both the extracted `"data"` and partial `"error"` details.

---

## 5. Sequence Diagrams

### Sequence A: Public Callcraft API Execution (`Customer -> Python FastAPI`)

```text
Client Application             Apache Proxy               Python API Gateway             Redis Cache               AI Provider (Gemini/OpenAI)     PostgreSQL
       │                            │                             │                           │                                 │                    │
       │─── POST /v1/call/{user_id}►│                             │                           │                                 │                    │
       │    Header: X-Request-ID    │                             │                           │                                 │                    │
       │    Header: Authorization   │─── Proxy Pass :8080 ───────►│                           │                                 │                    │
       │                            │                             │─── Assign/Propagate Request ID & Trace ID                   │                    │
       │                            │                             │─── Check Rate Limit ─────►│                                 │                    │
       │                            │                             │◄── Rate Limit OK ─────────│                                 │                    │
       │                            │                             │                           │                                 │                    │
       │                            │                             │─── Get Call Spec Cached ─►│                                 │                    │
       │                            │                             │◄── Spec Found (JSON) ─────│                                 │                    │
       │                            │                             │                           │                                 │                    │
       │                            │                             │ (If Cache Miss) ────────────────────────────────────────────────────────────────────►│ Query Spec
       │                            │                             │◄(Cache Miss Fallback) ───────────────────────────────────────────────────────────│ Return Spec
       │                            │                             │                           │                                 │                    │
       │                            │                             │─── Download/Decode File (RAM memory only)                     │                    │
       │                            │                             │─── Decrypt User AI Provider API Key                             │                    │
       │                            │                             │                                                             │                    │
       │                            │                             │─── POST Vision/LLM Request (Bytes + Tool Schema) ──────────►│                    │
       │                            │                             │◄── Return Tool Call Argument JSON ──────────────────────────│                    │
       │                            │                             │                                                             │                    │
       │                            │                             │   (If Hallucination Detected: Retry 1-2x internally)         │                    │
       │                            │                             │─── Release File RAM Buffer                                  │                    │
       │                            │                             │─── Validate & Coerce JSON Output                            │                    │
       │                            │                             │─── Package into Envelope (meta, data/error, trace, metrics) │                    │
       │                            │                             │                                                             │                    │
       │                            │                             │─── Async Outbox Audit Log (request_id, trace_id, metadata) ───────────────────────►│ Insert api_requests
       │◄── 200 OK (JSON Envelope)──│◄── 200 OK ──────────────────│                                                                                  │
```

---

## 6. System Limits & Resource Specifications

| Metric / Constraint | Value | Description |
| :--- | :--- | :--- |
| **Max Request Body Size** | `10 MB` | Maximum HTTP request payload limit (including Base64) |
| **Max File Download Size** | `10 MB` | Maximum file download size allowed from remote URL |
| **URL Download Timeout** | `10 seconds` | Max HTTP request timeout when downloading remote files |
| **API Execution Timeout** | `60 seconds` | Max response timeout when invoking AI Providers |
| **Redis Cache Spec TTL** | `3600 seconds` | Expiration time for cached Callcraft specifications |
| **Rate Limit Default** | `60 req/minute` | Default token-bucket rate limit per Customer API Key |

# Q&A Discussion 3: Stateless In-Memory Processing & Zero Data Retention

## QUESTION:
I do not want to store any image or document files at all. Is this possible?

---

## ANSWER:

Yes, and I strongly agree. For Callcraft, **no MinIO, S3, or persistent file storage is needed at all** if the core requirement is that files are strictly processed transiently during request execution.

The architecture enforces **Stateless Document Processing**:

```text
Client Application Request
   │
   │ Image / File Base64 OR Remote URL
   ▼
Python FastAPI Gateway
   │
   ├── Validate payload size limit (Max 10 MB)
   ├── Stream download URL directly to RAM bytes (No disk I/O)
   ├── Validate MIME type & SSRF security checks
   │
   ▼
RAM Bytes Memory Buffer
   │
   ├── AI Vision Provider
   │     ├── Google Gemini
   │     ├── OpenAI GPT-4o
   │     ├── Anthropic Claude
   │     └── DeepSeek
   │
   ▼
Structured Tool Response
   │
   ├── Schema Validation & Type Coercion
   ├── Response Mapping
   │
   ▼
JSON Response returned to Client App
   │
   ▼
RAM Bytes Buffer released & garbage collected
```

There are:
```text
❌ NO MinIO containers
❌ NO AWS S3 buckets
❌ NO local uploads/ directories
❌ NO temporary files on disk (/tmp)
❌ NO permanent image/document storage
```

---

## URL Downloads Stream Directly to RAM

When a client sends a remote URL request:

```json
{
  "image": "https://example.com/document.pdf"
}
```

The backend executes:

```text
HTTP GET Stream via httpx
   ↓
Response Bytes
   ↓
RAM Memory Buffer
   ↓
MIME validation & SSRF checks
   ↓
AI Provider API call
   ↓
RAM Buffer garbage collected
```

Instead of disk-buffered operations:
```text
URL ➔ Download ➔ /tmp/document.pdf ➔ AI ➔ Delete file
```

Callcraft streams directly in-memory:
```text
URL ➔ Stream download directly into Python bytes RAM buffer ➔ AI ➔ Release buffer
```

In Python FastAPI, streaming via `httpx.AsyncClient` directly into memory `bytes` avoids filesystem access completely.

---

## Base64 Strings Are Decoded Directly in Memory

When a request contains Base64 content:

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
}
```

The flow is:

```text
Base64 String ➔ Decode to RAM bytes ➔ AI Provider API ➔ Release bytes buffer
```

---

## Database Audit Logs Store Metadata Only

The PostgreSQL database **only records request metadata**.

Columns in `api_requests`:
```text
- id
- request_id
- user_id
- call_spec_id
- call_spec_version_id
- status & http_status
- input_type & input_size_bytes
- processing_time_ms
- prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd
- error_code & error_message
- client_ip & user_agent
- created_at
```

Items **NEVER** stored in the database:
```text
❌ Base64 strings
❌ Image / Document binary bytes
❌ Raw extracted text dumps
❌ Sensitive user document contents
```

This guarantees 100% compliance with **Zero Data Retention (ZDR)** privacy standards.

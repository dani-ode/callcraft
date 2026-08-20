# Q&A Discussion 4: Control Plane vs Data Plane & Apache VPS Deployment

## QUESTION:
So the user configures API specs in Next.js which connects to Python/FastAPI. Once configured, customer execution calls bypass Next.js and go directly to Python. Also, I want to run this project on an Ubuntu VPS that already runs Apache. Should I use Docker with Nginx, or Docker with the existing Host Apache?

---

## ANSWER:

Exactly. That is the design: **Next.js acts strictly as the Control Plane**, while **Python FastAPI acts as the Execution/Data Plane**.

```text
                 CONTROL PLANE
User Browser
 │
 ▼
Next.js (Bun)
 │
 │ Internal Auth (/internal/v1/*)
 ▼
Python Management API
 │
 ├── PostgreSQL
 ├── Redis
 └── Callcraft Specs & Config
```

Once the user creates and activates a Callcraft API specification:

```text
              DATA PLANE

Customer App
     │
     │ POST /v1/call/{user_id}
     ▼
 Host Apache Reverse Proxy
     │
     ▼
 Python FastAPI Gateway
     │
     ├── Verify API Key Credential
     ├── Load Callcraft Spec (Redis / Postgres)
     ├── Validate input payload & stream bytes to RAM
     ├── Invoke Gemini / OpenAI Tool Calling API
     ├── Validate & coerce structured JSON output
     └── Return JSON Response
 
     ❌ Does NOT pass through Next.js
```

This is the **ideal decoupled architecture** for high-performance API platforms.

---

## VPS Deployment on Ubuntu with Host Apache

I recommend:

> **Use Docker for all application containers, with the Host Apache Web Server acting as the Reverse Proxy.**

**There is no need to install Nginx inside Docker or on the host.**

Architecture Diagram:

```text
                         INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │  Apache Host   │
                    │   Ubuntu VPS   │
                    │   :80 / :443   │
                    └───────┬────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        app.yourdomain.com      api.yourdomain.com
                 │                     │
                 ▼                     ▼
        Docker: Next.js + Bun  Docker: Python FastAPI
             :3000                  :8080
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                    PostgreSQL       Redis      AI Providers
```

---

## Domain Routing Strategy

We recommend separating subdomains:

- **Dashboard UI**: `app.yourdomain.com` ➔ Proxies to Next.js container (`127.0.0.1:3000`).
- **Data Plane API**: `api.yourdomain.com` ➔ Proxies directly to Python FastAPI container (`127.0.0.1:8080`).

---

## Summary of Responsibilities

- **Host Apache**: Manages SSL/TLS termination (Certbot), domain virtual hosts, HTTP-to-HTTPS redirects, request payload size limits (`LimitRequestBody 10485760`), and proxy headers (`X-Forwarded-Proto`, `X-Forwarded-For`).
- **Docker Compose**: Orchestrates `callcraft-web` (Next.js with Bun), `callcraft-api` (Python 3.12 FastAPI), `callcraft-worker` (Python Outbox Logger), `callcraft-postgres` (PostgreSQL 16), and `callcraft-redis` (Redis 7).

# Q&A Discussion 1: System Vision, Requirements & Architecture Setup

## QUESTION:
Create a prompt spec (database, file structure, walkthrough, etc.) for a web application and AI execution engine project. 

Key details:
1. Users must activate AI models (currently Gemini, OpenAI, Anthropic, DeepSeek) and enter their own API Keys on the profile page.
2. Users design their own dynamic API specs for file/document processing.
3. Upon registration, users get public and secret keys (`call_sk_live_...`), and a specific endpoint path based on `userID` (ULID).
4. Workflow: Users select existing templates (KTP, Invoice, Receipt) or start from scratch, entering their API list.
5. Users design the request and response body using a graphical interface (key-value, data types, object-in-object, arrays).
6. Supported request types: text for Base64 images, string for file URLs, extra prompt text, required flags. (For URLs, files stream into RAM memory without persistent storage).
7. Created endpoints generate a Callcraft Spec ID passed via request headers (`X-CALL-SPEC-ID`).
8. Interactive Playground showing API invocation examples and outputs.
9. Execution flow: Requests are processed via Tool / Function Calling using user AI provider keys, returning validated JSON conforming to user response schemas.
10. System Administrator features: Management of users, models, templates, tool calling system prompts, data types, and hit monitoring logs table.

---

## ANSWER:

This concept is built not merely as a simple extractor, but as **Callcraft — AI-Powered Dynamic Multimodal API Execution Engine (Callcraft-as-a-Service)**.

Core Concept:
> **Users do not just execute AI extractions; they visually design their own custom API contracts, choose their own AI providers and models, and Callcraft acts as the high-speed gateway + execution engine executing models and enforcing strict JSON output schemas.**

---

### Recommended Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Data Plane / Core API** | **Python 3.12 (FastAPI + Pydantic v2)** | High-performance dynamic API Gateway & Execution Engine |
| **Control Plane / Dashboard** | **Next.js 14+ (App Router)** | Web Management Dashboard (React, TypeScript, Tailwind CSS, shadcn/ui) |
| **JS/TS Runtime & Manager** | **Bun 1.1+** | Superfast JavaScript/TypeScript runtime & package manager |
| **Schema Builder UI** | **React Flow + Monaco Editor** | Visual drag-and-drop & code editor for dynamic API specs |
| **Database** | **PostgreSQL 16+** | Relational database (Asyncpg / SQLAlchemy) |
| **Cache & Rate Limit** | **Redis 7+** | Spec caching, token-bucket rate limiter, session cache |
| **Reverse Proxy** | **Apache 2.4+ (Host VPS)** | Host reverse proxy, SSL/TLS termination |
| **Containerization** | **Docker & Docker Compose** | Multi-container setup (`callcraft-web`, `callcraft-api`, `callcraft-worker`) |

---

### Core Data Flow Architecture

```text
                               ┌─────────────────────┐
                               │  Next.js + Bun Web  │
                               │  Dashboard App      │
                               └──────────┬──────────┘
                                          │
                               Service Auth / REST API
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              CALLCRAFT                                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Python FastAPI Data Plane                     │  │
│  │                                                                  │  │
│  │ Auth │ Users │ Call Specs │ Templates │ Gateway │ API Keys      │  │
│  │ Admin │ Models │ Logs │ Playground │ Engine                     │  │
│  └───────────────┬─────────────────────────┬────────────────────────┘  │
│                  │                         │                           │
│                  ▼                         ▼                           │
│           PostgreSQL 16                 Redis 7                        │
│                  │                         │                           │
│                  └───────────┬─────────────┘                           │
│                              ▼                                         │
│                   Dynamic Execution Engine                             │
│                              │                                         │
│                 ┌────────────┴────────────┐                            │
│                 ▼                         ▼                            │
│           Gemini Adapter           OpenAI Adapter                      │
│                 │                         │                            │
│                 └────────────┬────────────┘                            │
│                              ▼                                         │
│                   Tool / Function Calling Spec                         │
│                              │                                         │
│                              ▼                                         │
│                   Structured JSON Output                               │
│                              │                                         │
│                              ▼                                         │
│                Type Coercion & Schema Mapper                           │
└────────────────────────────────────────────────────────────────────────┘

       ▲
       │ User's External Application
       │
POST /v1/call/{user_id}
Authorization: Bearer call_sk_live_...
X-CALL-SPEC-ID: 01HZX...
```

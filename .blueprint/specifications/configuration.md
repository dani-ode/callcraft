# Specification — Configuration Reference

> **Status:** As-Built
> **Source of truth:** `apps/api/src/callcraft_api/config.py`, `.env.example`, `docker-compose.yml`
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

One `.env` at the repo root feeds every process: the API, the worker, the web build, and
`docker-compose.yml`. Settings are loaded by `pydantic-settings` with `extra="ignore"` and
case-insensitive names, so unknown keys are tolerated and `POSTGRES_HOST` binds to `postgres_host`.

**Variables without a default are required — the API refuses to start without them.**

---

## 1. Application

| Variable | Required | Default | Used by | Notes |
| :--- | :---: | :--- | :--- | :--- |
| `APP_NAME` | ✔ | — | API | FastAPI title |
| `APP_ENV` | ✔ | — | API, compose | `production`, `testing`, … — informational, not branched on |
| `PORT` | ✔ | — | API, compose | Container listen port (8080 in Docker; the dev script uses 8081) |
| `WEB_PORT` | ✔ | — | compose | Dashboard port (3000 in Docker; the dev script uses 3001) |

## 2. PostgreSQL

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `POSTGRES_DB` `POSTGRES_USER` `POSTGRES_PASSWORD` | ✔ | Also consumed by the `callcraft-postgres` service |
| `POSTGRES_HOST` `POSTGRES_PORT` | ✔ | Compose overrides `POSTGRES_HOST` to `callcraft-postgres` |
| `DATABASE_URL` | — | When set, wins over the parts above. `postgres://` and `postgresql://` are rewritten to `postgresql+asyncpg://` (`config.py:38`) |

## 3. Redis

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `REDIS_HOST` `REDIS_PORT` `REDIS_PASSWORD` | ✔ | The password is enforced by `redis-server --requirepass` in compose |
| `REDIS_URL` | — | When set, wins over the parts above |

Redis is used for the spec cache (`callcraft:spec:*`, TTL 3600s), the audit outbox
(`callcraft:outbox:api_requests`), and rate-limit counters. **If Redis is unreachable the API keeps
serving** with in-process fallbacks (`services/redis_cache.py:34`) — correct for a single instance,
lossy across replicas.

## 4. Security

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `MASTER_ENCRYPTION_KEY` | ✔ | 64 hex characters = 256 bits. Encrypts every stored AI provider key. **Rotating it makes existing stored keys undecryptable** — there is no re-encryption path |
| `SERVICE_CLIENT_ID` | ✔ | Seeded into `service_clients`; ⚠️ not verified by any endpoint yet |
| `SERVICE_CLIENT_SECRET` | ✔ | Same |
| `NEXTAUTH_SECRET` | ✔ (web) | Required by compose for the web service |
| `NEXTAUTH_URL` | ✔ (web) | Also used by the API as the base URL in verification e-mails (`services/email.py:32`) |

## 5. Bootstrap admin

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` `ADMIN_NAME` | — | Seed the first superuser on startup (`db/init_db.py`) |

## 6. Frontend

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | ✔ | **Baked into the client bundle at build time** — it is a build arg in `docker/web.Dockerfile`, not a runtime setting. The browser calls the Python API at this URL directly |

## 7. Mail (SMTP)

Read directly via `os.getenv` in `services/email.py:23`, so these bypass the `Settings` model and
have in-code defaults.

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `MAIL_HOST` `MAIL_PORT` | vendor host, `465` | |
| `MAIL_USERNAME` `MAIL_PASSWORD` | vendor account | ⚠️ A real-looking password is hardcoded as the fallback default in source; it should be removed and rotated |
| `MAIL_ENCRYPTION` | `ssl` | `ssl` uses `SMTP_SSL`, anything else uses `STARTTLS` |
| `MAIL_FROM_ADDRESS` `MAIL_FROM_NAME` | vendor identity | Quotes are stripped from the value |
| `MAIL_MAILER` | — | Present in `.env.example`, not read by the code |

## 8. Provider keys in the environment

| Variable | Notes |
| :--- | :--- |
| `GEMINI_API_KEY` `OPENAI_API_KEY` | Declared as optional settings but not used on the execution path. Execution keys come from the `X-AI-API-KEY` header, the user's encrypted store, or the spec |

---

## 9. Resolution order for an AI provider key at execution

1. `X-AI-API-KEY` header — only when the spec has `useExternalApiKey`
2. The user's stored key for that provider, scoped to the spec's project, decrypted with
   `MASTER_ENCRYPTION_KEY`
3. `call_specs.external_api_key` on the spec
4. Otherwise `MISSING_PROVIDER_API_KEY` (400)

`public.py:235`.

---

## 10. Local development

```bash
cp .env.example .env          # then set real values
bun install
bun run dev                   # api on :8081, web on :3001
```

The dev scripts in the root `package.json` pin `POSTGRES_PORT=5432` and `REDIS_PORT=6379` regardless
of `.env`, and run the API on 8081 and the dashboard on 3001 — different from the container ports.
Point `NEXT_PUBLIC_API_URL` at `http://127.0.0.1:8081` for local work.

## 11. Operational cautions

- ⚠️ `.env` is not committed, but `.env.example` ships placeholder secrets that are valid-looking.
  Never promote them to an environment that accepts real traffic.
- ⚠️ `MASTER_ENCRYPTION_KEY` has no rotation story. Treat it as permanent per database.
- ⚠️ Compose passes `env_file: .env` *and* an explicit `environment:` block; the explicit block wins.
  When a value seems ignored, check `docker-compose.yml` first.

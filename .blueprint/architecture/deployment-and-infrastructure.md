# Architecture — Deployment & Infrastructure

This document provides infrastructure specifications and deployment guidelines for **Callcraft** on an Ubuntu VPS running an Apache Web Server host.

---

## 1. Network Topology & Deployment Architecture

The application is containerized with **Docker Containers** and exposed to the public internet via an **Apache Reverse Proxy** running directly on the Host VPS operating system.

```text
                                 INTERNET
                                    │
                                    ├── Port 80 (HTTP Redirect to HTTPS)
                                    ├── Port 443 (HTTPS / SSL Certbot)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ HOST UBUNTU VPS                                                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Apache Web Server (Host)                     │  │
│  │                                                                  │  │
│  │   VirtualHost: app.yourdomain.com   VirtualHost: api.yourdomain.com│  │
│  │   ProxyPass -> 127.0.0.1:3000       ProxyPass -> 127.0.0.1:8080  │  │
│  └────────────────┬──────────────────────────────────┬──────────────┘  │
│                   │                                  │                 │
│                   ▼                                  ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         DOCKER ENGINE                            │  │
│  │                                                                  │  │
│  │   ┌─────────────────────┐             ┌──────────────────────┐   │  │
│  │   │   callcraft-web     │             │    callcraft-api     │   │  │
│  │   │   (Next.js + Bun)   │             │   (Python FastAPI)   │   │  │
│  │   │  Bound: 127.0.0.1:3000            │  Bound: 127.0.0.1:8080│   │  │
│  │   └──────────┬──────────┘             └──────────┬───────────┘   │  │
│  │              │                                   │               │  │
│  │              └─────────────────┬─────────────────┘               │  │
│  │                                │                                 │  │
│  │   ┌─────────────────────┐      │      ┌──────────────────────┐   │  │
│  │   │  callcraft-worker   │      │      │  callcraft-postgres  │   │  │
│  │   │(Python Outbox Log)  │◄─────┼─────►│   (PostgreSQL 16)    │   │  │
│  │   └─────────────────────┘      │      │ No External Port     │   │  │
│  │                                │      └──────────────────────┘   │  │
│  │                                ▼                                 │  │
│  │                       ┌──────────────────┐                       │  │
│  │                       │  callcraft-redis │                       │  │
│  │                       │    (Redis 7)     │                       │  │
│  │                       │ No External Port │                       │  │
│  │                       └──────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Apache Host Reverse Proxy Configuration

Bypassing secondary Nginx proxies inside Docker eliminates double proxying network overhead (*Apache ➔ Nginx ➔ Docker*). The Host Apache server handles TLS/SSL termination, HTTP to HTTPS redirection, and request header forwarding.

### A. VirtualHost Configuration: Dashboard UI (`app.yourdomain.com`)
Save to `/etc/apache2/sites-available/callcraft-app.conf`:

```apache
<VirtualHost *:80>
    ServerName app.yourdomain.com
    Redirect permanent / https://app.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName app.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/app.yourdomain.com/privkey.pem

    ProxyPreserveHost On
    ProxyRequests Off

    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ErrorLog ${APACHE_LOG_DIR}/callcraft-app-error.log
    CustomLog ${APACHE_LOG_DIR}/callcraft-app-access.log combined
</VirtualHost>
```

### B. VirtualHost Configuration: Data Plane API (`api.yourdomain.com`)
Save to `/etc/apache2/sites-available/callcraft-api.conf`:

```apache
<VirtualHost *:80>
    ServerName api.yourdomain.com
    Redirect permanent / https://api.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName api.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.yourdomain.com/privkey.pem

    ProxyPreserveHost On
    ProxyRequests Off
    
    # Increase timeout for AI Vision/LLM processing up to 90 seconds
    ProxyTimeout 90

    # Enforce request payload size limit (10MB = 10485760 bytes)
    LimitRequestBody 10485760

    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ErrorLog ${APACHE_LOG_DIR}/callcraft-api-error.log
    CustomLog ${APACHE_LOG_DIR}/callcraft-api-access.log combined
</VirtualHost>
```

---

## 3. Docker Compose Specification (`docker-compose.yml`)

All application services are defined in the master `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  callcraft-postgres:
    image: postgres:16-alpine
    container_name: callcraft-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-callcraft_db}
      POSTGRES_USER: ${POSTGRES_USER:-callcraft_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - callcraft-network
    # Port 5432 NOT exposed externally for security

  callcraft-redis:
    image: redis:7-alpine
    container_name: callcraft-redis
    restart: always
    command: redis-server --save 60 1 --loglevel warning --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    networks:
      - callcraft-network
    # Port 6379 NOT exposed externally for security

  callcraft-api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    container_name: callcraft-api
    restart: always
    ports:
      - "127.0.0.1:8080:8080" # Bound strictly to loopback interface
    environment:
      - APP_ENV=production
      - PORT=8080
      - DATABASE_URL=postgres://${POSTGRES_USER:-callcraft_user}:${POSTGRES_PASSWORD:-secret_password}@callcraft-postgres:5432/${POSTGRES_DB:-callcraft_db}
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_password}@callcraft-redis:6379
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - SERVICE_CLIENT_SECRET=${SERVICE_CLIENT_SECRET}
    depends_on:
      - callcraft-postgres
      - callcraft-redis
    networks:
      - callcraft-network

  callcraft-worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    container_name: callcraft-worker
    restart: always
    environment:
      - APP_ENV=production
      - DATABASE_URL=postgres://${POSTGRES_USER:-callcraft_user}:${POSTGRES_PASSWORD:-secret_password}@callcraft-postgres:5432/${POSTGRES_DB:-callcraft_db}
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_password}@callcraft-redis:6379
    depends_on:
      - callcraft-postgres
      - callcraft-redis
    networks:
      - callcraft-network

  callcraft-web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    container_name: callcraft-web
    restart: always
    ports:
      - "127.0.0.1:3000:3000" # Bound strictly to loopback interface
    environment:
      - NODE_ENV=production
      - PORT=3000
      - INTERNAL_PYTHON_API_URL=http://callcraft-api:8080/internal/v1
      - SERVICE_CLIENT_ID=svc_nextjs_main
      - SERVICE_CLIENT_SECRET=${SERVICE_CLIENT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://app.yourdomain.com
    depends_on:
      - callcraft-api
    networks:
      - callcraft-network

networks:
  callcraft-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 4. Multi-Stage Dockerfile Blueprint

### A. Python API Dockerfile (`docker/api.Dockerfile`)

```dockerfile
FROM python:3.12-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim as runner

WORKDIR /app

COPY --from=builder /install /usr/local
COPY apps/api /app/apps/api

ENV PYTHONPATH=/app/apps/api/src
ENV PORT=8080

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### B. Python Worker Dockerfile (`docker/worker.Dockerfile`)

```dockerfile
FROM python:3.12-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim as runner

WORKDIR /app

COPY --from=builder /install /usr/local
COPY apps/worker /app/apps/worker

ENV PYTHONPATH=/app/apps/worker

CMD ["python", "apps/worker/main.py"]
```

### C. Bun Next.js Web Dockerfile (`docker/web.Dockerfile`)

```dockerfile
FROM oven/bun:1-alpine as base

WORKDIR /app

COPY apps/web/package.json ./
RUN bun install

COPY apps/web/ ./
ENV NODE_ENV=production
RUN bun run build

EXPOSE 3000

ENV PORT=3000
CMD ["bun", "run", "start"]
```

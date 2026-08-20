# Architecture — Deployment & Infrastructure

Dokumen ini berisi spesifikasi penataan infrastruktur dan petunjuk pengerjaan *deployment* **OCR Platform** pada server VPS Ubuntu yang sudah mengoperasikan Apache Web Server.

---

## 1. Network Topology & Deployment Architecture

Aplikasi dikemas dalam **Docker Container** dan dipublikasikan ke publik melalui **Apache Reverse Proxy** yang terpasang di sistem operasi Host VPS.

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
│  │   │      ocr-web        │             │       ocr-api        │   │  │
│  │   │  (Next.js App)      │             │    (Rust Axum)       │   │  │
│  │   │  Bound: 127.0.0.1:3000            │  Bound: 127.0.0.1:8080│   │  │
│  │   └──────────┬──────────┘             └──────────┬───────────┘   │  │
│  │              │                                   │               │  │
│  │              └─────────────────┬─────────────────┘               │  │
│  │                                │                                 │  │
│  │   ┌─────────────────────┐      │      ┌──────────────────────┐   │  │
│  │   │     ocr-worker      │      │      │     ocr-postgres     │   │  │
│  │   │ (Rust Outbox Log)   │◄─────┼─────►│   (PostgreSQL 16)    │   │  │
│  │   └─────────────────────┘      │      │ No External Port     │   │  │
│  │                                │      └──────────────────────┘   │  │
│  │                                ▼                                 │  │
│  │                       ┌──────────────────┐                       │  │
│  │                       │    ocr-redis     │                       │  │
│  │                       │    (Redis 7)     │                       │  │
│  │                       │ No External Port │                       │  │
│  │                       └──────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Apache Host Reverse Proxy Configuration

Mengabaikan pemasangan Nginx tambahan di dalam Docker mengurangi overhead network proxying ganda (*Apache ➔ Nginx ➔ Docker*). Apache Host menangani TLS/SSL termination, HTTP to HTTPS redirection, dan header forwarding.

### A. VirtualHost Configuration: Dashboard UI (`app.yourdomain.com`)
Simpan di `/etc/apache2/sites-available/ocr-app.conf`:

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

    ErrorLog ${APACHE_LOG_DIR}/ocr-app-error.log
    CustomLog ${APACHE_LOG_DIR}/ocr-app-access.log combined
</VirtualHost>
```

### B. VirtualHost Configuration: Data Plane API (`api.yourdomain.com`)
Simpan di `/etc/apache2/sites-available/ocr-api.conf`:

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
    
    # Increase timeout for AI Vision processing up to 90 seconds
    ProxyTimeout 90

    # Enforce request payload size limit (10MB = 10485760 bytes)
    LimitRequestBody 10485760

    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ErrorLog ${APACHE_LOG_DIR}/ocr-api-error.log
    CustomLog ${APACHE_LOG_DIR}/ocr-api-access.log combined
</VirtualHost>
```

---

## 3. Docker Compose Specification (`docker-compose.yml`)

Seluruh service aplikasi didefinisikan dalam berkas `docker-compose.yml` utama di root project:

```yaml
version: '3.8'

services:
  ocr-postgres:
    image: postgres:16-alpine
    container_name: ocr-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ocr_platform}
      POSTGRES_USER: ${POSTGRES_USER:-ocr_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ocr-network
    # Port 5432 NOT exposed to host / public for security

  ocr-redis:
    image: redis:7-alpine
    container_name: ocr-redis
    restart: always
    command: redis-server --save 60 1 --loglevel warning --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    networks:
      - ocr-network
    # Port 6379 NOT exposed to host / public for security

  ocr-api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    container_name: ocr-api
    restart: always
    ports:
      - "127.0.0.1:8080:8080" # Bound strictly to loopback host
    environment:
      - APP_ENV=production
      - PORT=8080
      - DATABASE_URL=postgres://${POSTGRES_USER:-ocr_user}:${POSTGRES_PASSWORD:-secret_password}@ocr-postgres:5432/${POSTGRES_DB:-ocr_platform}
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_password}@ocr-redis:6379
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - SERVICE_CLIENT_SECRET=${SERVICE_CLIENT_SECRET}
    depends_on:
      - ocr-postgres
      - ocr-redis
    networks:
      - ocr-network

  ocr-worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    container_name: ocr-worker
    restart: always
    environment:
      - APP_ENV=production
      - DATABASE_URL=postgres://${POSTGRES_USER:-ocr_user}:${POSTGRES_PASSWORD:-secret_password}@ocr-postgres:5432/${POSTGRES_DB:-ocr_platform}
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_password}@ocr-redis:6379
    depends_on:
      - ocr-postgres
      - ocr-redis
    networks:
      - ocr-network

  ocr-web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    container_name: ocr-web
    restart: always
    ports:
      - "127.0.0.1:3000:3000" # Bound strictly to loopback host
    environment:
      - NODE_ENV=production
      - PORT=3000
      - INTERNAL_RUST_API_URL=http://ocr-api:8080/internal/v1
      - SERVICE_CLIENT_ID=svc_nextjs_main
      - SERVICE_CLIENT_SECRET=${SERVICE_CLIENT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://app.yourdomain.com
    depends_on:
      - ocr-api
    networks:
      - ocr-network

networks:
  ocr-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 4. Multi-Stage Dockerfile Blueprint

### A. Rust API Dockerfile (`docker/api.Dockerfile`)
Menggunakan `cargo-chef` untuk caching dependensi Rust agar build cepat:

```dockerfile
# Stage 1: Cargo Chef Planner
FROM lukemathwalker/cargo-chef:latest-rust-1.78-alpine AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Build Dependencies & Binary
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin ocr-api

# Stage 3: Minimal Runtime
FROM alpine:3.19 AS runtime
RUN apk add --no-libc-dev ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/target/release/ocr-api /app/ocr-api
EXPOSE 8080
ENTRYPOINT ["/app/ocr-api"]
```

### B. Next.js Web Dockerfile (`docker/web.Dockerfile`)

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

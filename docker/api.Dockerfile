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

CMD ["sh", "-c", "exec uvicorn apps.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

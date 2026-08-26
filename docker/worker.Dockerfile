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
COPY apps/api /app/apps/api

ENV PYTHONPATH=/app/apps/worker:/app/apps/api/src

CMD ["python", "apps/worker/main.py"]

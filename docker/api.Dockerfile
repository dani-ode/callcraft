# Stage 1: Cargo Chef Planner
FROM lukemathwalker/cargo-chef:latest-rust-1-alpine AS chef
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
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/target/release/ocr-api /app/ocr-api
EXPOSE 8080
ENTRYPOINT ["/app/ocr-api"]

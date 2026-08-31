# ADR-0002 — Process documents in RAM only; retain no payloads

> **Status:** Accepted
> **Date:** 2026-08 (reconstructed from `qna-3.md`)

## Context

Callers send identity documents, invoices, and receipts. Any durable copy — a temp file, an object
store, a database blob, a log line containing Base64 — becomes a liability that must be secured,
audited, retained, and deleted on request. The product does not need the copy: extraction is
synchronous and single-shot.

## Decision

Document bytes exist only as an in-process `bytes` buffer for the duration of one request.

Never written: disk, temp directories, object storage (MinIO/S3), database columns, or logs. Never
persisted: raw prompts, dynamic variables, model output content.

Persisted instead: execution *metadata* only — identifiers, status, HTTP code, input type and size,
duration, token counts, estimated cost, error code, client IP, user agent.

## Consequences

- No storage subsystem to secure, and no deletion workflow to build.
- Debugging a bad extraction cannot reconstruct the input; the caller must reproduce it. The
  `X-CALL-SHOW-PROMPT` escape hatch echoes the assembled prompt back in the response, with Base64
  redacted, rather than logging it server-side.
- Request size is bounded by memory, not by disk — so a body-size ceiling is load-bearing, and its
  absence today is a real risk (see [../roadmap/open-gaps.md](../roadmap/open-gaps.md)).
- Reprocessing and async retry-from-storage are foreclosed by design.

## Implementation

- Buffer handling: `apps/api/src/callcraft_engine/buffer_handler.py:14`
- Base64 redaction in echoed prompts: `apps/api/src/callcraft_api/routers/public.py:13`
- Metadata-only audit record: `apps/api/src/callcraft_api/db/models.py:333`

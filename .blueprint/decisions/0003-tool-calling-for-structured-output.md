# ADR-0003 — Force structured output via provider tool calling

> **Status:** Accepted
> **Date:** 2026-08 (reconstructed from `qna-1.md`)

## Context

The product's promise is that the response matches the user's declared response schema exactly. Asking
a model for JSON in prose and parsing the reply fails in the usual ways: prose wrapped around the
JSON, markdown fences, renamed keys, dropped fields, invented fields.

## Decision

Translate the user's response schema into the provider's native function/tool declaration and require
the model to answer by calling that function. The tool's `parameters` object *is* the schema. Platform
types collapse to JSON Schema primitives (`date`, `email`, `phone`, `currency` → `string`; `enum` →
`string` + `enum` list), with the user's description carried through as the field description so the
model has the semantics.

One extra parameter, `_ai_commentary`, is appended to every generated tool so the model can return a
human-readable remark. It is stripped from `data.primaryResult.content` and surfaced as
`data.humanReadableMessage`.

## Consequences

- Conformance is enforced upstream by the provider's constrained decoding, not by a parser.
- Every provider needs an adapter that maps one canonical tool declaration onto its own tool API.
- Models without tool calling cannot serve a spec — `ai_models.supports_tool_calling` records this,
  and the seeded OCR-oriented models set it to `false`.
- Output still needs validation: models fill declared functions imperfectly, hence
  [type coercion](../specifications/api-spec-engine.md#5-type-coercion-and-validation).

## Implementation

- Generator: `apps/api/src/callcraft_engine/tool_generator.py:5`
- Adapters: `apps/api/src/callcraft_engine/adapters/`
- Post-validation: `apps/api/src/callcraft_engine/coercion.py:9`

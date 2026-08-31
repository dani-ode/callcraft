# Architecture Decision Records

> **Status:** As-Built
> **Source of truth:** this folder
> **Last verified against code:** 2026-08-31 (commit `0ab3d71`)

One file per decision that constrains future work. ADRs are append-only: a decision that stops being
true is **superseded** by a new ADR, not edited into agreement with the present.

These records were reconstructed from the archived design conversations in
[../question-and-answer/](../question-and-answer/README.md) and from the code as it stands, so that
future changes have something specific to argue against.

| # | Decision | Status |
| :-- | :--- | :--- |
| [0001](0001-control-plane-data-plane-split.md) | Split the Control Plane from the Data Plane | Accepted |
| [0002](0002-stateless-zero-data-retention.md) | Process documents in RAM only; retain no payloads | Accepted |
| [0003](0003-tool-calling-for-structured-output.md) | Force structured output via provider tool calling | Accepted |
| [0004](0004-camelcase-json-wire-format.md) | camelCase for all JSON on the wire | Accepted |
| [0005](0005-prefixed-ulid-identifiers.md) | Prefixed ULIDs as primary keys | Accepted |
| [0006](0006-header-routed-call-endpoint.md) | One header-routed public endpoint, `POST /v1/call` | Accepted — supersedes `/v1/call/{user_id}` |
| [0007](0007-actionable-error-contract.md) | Errors carry a code, details, and an actionable step | Accepted |

---

## Template

```markdown
# ADR-NNNN — <Decision in imperative form>

> **Status:** Proposed | Accepted | Superseded by ADR-NNNN
> **Date:** YYYY-MM-DD

## Context
What forced a choice. Constraints, not narrative.

## Decision
What was chosen, stated as a rule the code must follow.

## Consequences
What this buys, what it costs, and what it forecloses.

## Implementation
Where the decision lives in the code: `path/to/file.py:LINE`.
```

# Blueprint Conventions

Rules for writing and maintaining documents inside `.blueprint/`. Read this before editing any
document here.

---

## 1. Every document declares what it is

Each document starts with a front matter block:

```markdown
# <Title>

> **Status:** As-Built | Design Target | Mixed
> **Source of truth:** `<path/to/code>` (or "this document")
> **Last verified against code:** YYYY-MM-DD (commit `<short sha>`)
```

- **As-Built** — describes what the code does today. If code and document disagree, the code wins
  and the document is a bug.
- **Design Target** — describes an intended future state that is not implemented yet. Never read as
  a description of the running system.
- **Mixed** — contains both; every section must then carry its own status marker.

---

## 2. Status markers

Used in tables and section headings throughout the blueprint:

| Marker | Meaning |
| :--- | :--- |
| ✅ **Implemented** | Present in code, exercised by the running system |
| 🟡 **Partial** | Code exists but is incomplete, unwired, or only covers part of the design |
| 📐 **Planned** | Design only — no code |
| ⚠️ **Gap** | Documented behaviour that the code does *not* deliver, where the difference matters (security, data integrity, contract) |

A section with no marker inherits the document's front matter status.

---

## 3. Do not duplicate machine-readable truth

Prose documents must not copy things that already exist in an authoritative file. Copies drift; the
original does not.

| Do not copy into a document | Point at instead |
| :--- | :--- |
| Full SQL DDL | `migrations/*.sql`, `apps/api/src/callcraft_api/db/models.py` |
| Full `docker-compose.yml` | `docker-compose.yml` |
| Full Dockerfiles | `docker/*.Dockerfile` |
| Environment variable values | `.env.example` |
| Route handler bodies | The router module, cited as `path/to/file.py:LINE` |

Summaries, catalogs, rationale, and diagrams are fine — verbatim mirrors are not.

---

## 4. Cite code with paths

Reference implementation as `apps/api/src/callcraft_api/routers/public.py:75` — a path plus a line
number. Do not describe behaviour without saying where it lives.

---

## 5. JSON casing: camelCase on the wire

All JSON crossing an HTTP boundary — public Data Plane envelopes, `/internal/v1/*` responses, and
Control Plane payloads — uses **camelCase** keys (`requestId`, `executionTrace`, `totalDurationMs`).

This is a project rule, recorded in `.agents/rules/case.md` and
[ADR-0004](decisions/0004-camelcase-json-wire-format.md).

Python identifiers, database columns, and env vars stay `snake_case`/`SCREAMING_SNAKE_CASE`. The
conversion happens at the serialization boundary.

Older documents in this blueprint were written with `snake_case` examples. Any such example is
stale — treat [envelope-contract.md](specifications/envelope-contract.md) as authoritative.

---

## 6. Identifiers: prefixed ULID

All primary keys are `<prefix>_<26-char ULID>` — see
`apps/api/src/callcraft_api/utils/id_generator.py` and
[ADR-0005](decisions/0005-prefixed-ulid-identifiers.md). Use real prefixes in examples
(`usr_`, `spc_`, `crd_`), never bare UUIDs.

---

## 7. Language

Documents are written in English. Runtime strings the code sends to end users are in Indonesian
(error messages, actionable steps). When quoting a message the code emits, quote it verbatim in
Indonesian rather than translating it — the point of the quote is that it is what the client sees.

---

## 8. Diagrams

ASCII box diagrams, consistent with the existing set. Keep them under 100 columns so they survive
side-by-side diffs. A diagram that no longer matches the code is a defect, same as prose.

---

## 9. Keeping the blueprint honest

When you change code that a document describes:

1. Update the document in the same commit.
2. Bump its **Last verified against code** line.
3. If the change closes or opens a gap, update
   [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) and
   [roadmap/open-gaps.md](roadmap/open-gaps.md).

For a periodic sweep, use the checklist in [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md#how-to-re-verify-this-document).

---

## 10. Architecture decisions

A decision that constrains future work — a protocol shape, a storage choice, a security boundary —
goes in `decisions/` as an ADR, numbered sequentially, using the template in
[decisions/README.md](decisions/README.md). Documents then link to the ADR instead of re-arguing
the rationale.

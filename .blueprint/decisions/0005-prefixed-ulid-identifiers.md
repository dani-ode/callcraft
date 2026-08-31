# ADR-0005 — Prefixed ULIDs as primary keys

> **Status:** Accepted
> **Date:** 2026-08

## Context

Opaque UUIDs in logs, support tickets, and API headers give no hint what they identify, and their
random ordering makes primary-key inserts and time-ranged queries unfriendly. Bare ULIDs fix ordering
but not identification.

## Decision

Every primary key is `<prefix>_<26-character ULID>`, stored as `VARCHAR(50)`.

Prefixes are defined once, in `apps/api/src/callcraft_api/utils/id_generator.py`: `usr`, `prj`, `spc`,
`spv`, `crd`, `prv`, `mdl`, `uap`, `tpl`, `cmt`, `req`, `trc`, `usg`, `pgs`, `rol`, `prm`, `svc`,
`spm`, `app`.

Per-request identifiers follow the same shape: `req_<ULID>` and `trc_<12 chars>`.

## Consequences

- An identifier is self-describing: `spc_01HZX…` in a log line needs no lookup to interpret, and a
  credential id pasted where a spec id belongs is obvious.
- Keys sort by creation time, which suits B-tree inserts and time-ordered scans.
- Keys are wider than a UUID (up to 50 bytes vs 16) — paid in index size.
- Prefix and type must not drift apart; the generator is the only sanctioned source.
- Documentation and fixtures must use realistic prefixed ids. The old blueprint's bare
  `01HZX89ABCDEF…` examples predate this decision.

## Implementation

- Generator: `apps/api/src/callcraft_api/utils/id_generator.py`
- Column type: `VARCHAR(50)` throughout `apps/api/src/callcraft_api/db/models.py`
- Seeded fixed ids: `apps/api/src/callcraft_api/db/init_db.py:104`

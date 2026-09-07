# Callcraft AI Specification Protocol

> **Status:** Governing specification
> **Source of truth:** this document for specification process; code for runtime behavior
> **Applies to:** every AI-assisted code, architecture, API, security, and product change
> **Last reviewed:** 2026-09-06

This is the operating contract for humans and AI agents working in Callcraft. It makes changes
traceable, testable, security-aware, and explicit about what is known versus proposed.

## 1. Non-negotiable rules

1. **Evidence before claims.** Do not present behavior as fact without a source citation. Runtime
   facts cite code; planned behavior cites a decision or approved change specification.
2. **No silent assumptions.** State unresolved assumptions, then ask for a decision when they can
   change scope, security, data handling, compatibility, cost, or user experience.
3. **Preserve contracts deliberately.** Any public API, stored-data, auth, schema, or deployment
   change requires a compatibility assessment and an explicit migration or rollout plan.
4. **Security and privacy are acceptance criteria.** Authentication, authorization, tenancy,
   untrusted input, SSRF, secrets, logging, retention, and error disclosure must be considered.
5. **Tests prove behavior.** New or changed behavior requires proportionate automated tests. A
   test omission must be documented with its risk and follow-up.
6. **Documentation ships with implementation.** Update affected blueprint material in the same
   change. Code remains authoritative when documentation conflicts with it.
7. **Do not invent completion.** Mark work complete only after the stated acceptance criteria and
   validation commands pass, or identify exactly what remains unverified.

## 2. Source-of-truth hierarchy

When sources conflict, use this order:

1. Executed code and verified tests for current behavior.
2. Database migrations and deployment configuration for persisted/infrastructure behavior.
3. Accepted ADRs for enduring architectural constraints.
4. This protocol and approved change specifications for process and intended work.
5. Other blueprint documents for context.
6. README text, comments, tickets, and conversation for hints only.

A document that differs from a higher-ranked source must be corrected or marked as a gap.

## 3. Required change specification

Before implementation beyond a trivial, local edit, create a change specification under
`specifications/changes/` using `templates/change-spec.md`. It must include every required section:

- **Problem and outcome:** user-facing reason and measurable result.
- **Scope:** included work, explicit non-goals, and affected planes/components.
- **Facts and assumptions:** each fact cites a source; assumptions have an owner or question.
- **Contracts:** request/response, data model, events, configuration, and compatibility impact.
- **Security and privacy:** a focused threat/mitigation table and retention/logging impact.
- **Implementation plan:** ordered, reversible steps with relevant code paths.
- **Acceptance criteria:** observable, binary statements.
- **Validation plan:** exact commands, tests, manual checks, and expected outcomes.
- **Rollout and rollback:** migrations, flags, monitoring, and reversal.

Do not begin a risky or cross-cutting implementation while any required section is `TBD`.

## 4. Requirement language

Use RFC 2119 terms consistently:

- **MUST / MUST NOT:** mandatory acceptance criterion.
- **SHOULD / SHOULD NOT:** strong default; a deviation needs rationale.
- **MAY:** optional behavior.

Write requirements so a reviewer can determine pass or fail. Avoid ambiguous words such as
"robust," "secure," "fast," or "proper" unless accompanied by a measurable definition.

## 5. AI-agent execution loop

1. Read this protocol, the relevant blueprint documents, and the cited source files.
2. Establish the current state with evidence; do not rely on stale summaries.
3. Create or update the change specification and resolve material unknowns.
4. Implement the smallest coherent vertical slice.
5. Add or update automated tests at the appropriate layer.
6. Run the validation plan, inspect failures, and fix them before claiming success.
7. Reconcile documentation, implementation status, ADRs, and open gaps.
8. Report changed files, validation performed, known limitations, and any follow-up work.

## 6. Mandatory review gates

### Contract gate
Required for public/internal endpoints, schemas, headers, envelopes, database fields, events, or
configuration. Define old/new behavior, backward compatibility, and version/migration handling.

### Security gate
Required whenever a change handles credentials, identity, access control, tenant data, remote URLs,
files, prompts, model output, encryption, logging, or administrative capability. Identify attacker
input, trust boundaries, abuse path, mitigation, and a test or verification method.

### Operations gate
Required for migrations, background jobs, caches, queues, external providers, or deployment. Define
failure mode, observability, rollout order, and rollback.

### Decision gate
Create an ADR when a choice has a durable architectural impact, significantly constrains future
work, or has credible alternatives. Use `decisions/TEMPLATE.md`.

## 7. Definition of done

A change is done only when all applicable items are true:

- [ ] Acceptance criteria are met and evidenced.
- [ ] Relevant tests pass; added tests cover changed behavior or the omission is documented.
- [ ] Contract, security, and operations gates have been addressed.
- [ ] Errors are actionable and do not expose sensitive/internal data.
- [ ] Tenant boundaries and authorization are preserved or explicitly changed.
- [ ] Migrations and rollback steps are safe and documented, if applicable.
- [ ] Blueprint references, status markers, and open gaps are reconciled.
- [ ] The final report names validation commands and any remaining risk.

## 8. Repository-specific invariants

These constraints apply unless a new ADR explicitly changes them:

- The Data Plane is Python/FastAPI; the Control Plane is the Next.js application in `apps/web`.
- Public execution enters through `POST /v1/call`; public wire JSON uses camelCase.
- Customer documents and inference payloads are intended to remain ephemeral; do not introduce
  payload persistence without an ADR, retention policy, security review, and user-facing contract.
- Specs, credentials, and provider keys are project-scoped. Cross-project access must fail closed.
- Provider secrets must never be logged, rendered, or returned after their one-time creation flow.
- Remote input handling must defend against SSRF, redirects, DNS changes, and unbounded downloads.

Current gaps are tracked in `IMPLEMENTATION-STATUS.md` and must not be misrepresented as delivered
capabilities.

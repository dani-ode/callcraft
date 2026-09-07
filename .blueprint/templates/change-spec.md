# Change Specification: <short imperative title>

> **Status:** Draft | Approved | Implementing | Validated | Superseded
> **Owner:** <name/team>
> **Created:** YYYY-MM-DD
> **Last updated:** YYYY-MM-DD
> **Related:** <issue, ADR, prior specification, or N/A>
> **Implementation status:** 📐 Planned | 🟡 Partial | ✅ Implemented

## 1. Problem and intended outcome

**Problem.** <What fails, is missing, or must change? Who is affected?>

**Outcome.** <Observable result. Include a metric or concrete behavioral change when possible.>

## 2. Scope

### In scope

- <item>

### Explicit non-goals

- <item>

### Affected surfaces

| Surface | Impact | Source/evidence |
| :--- | :--- | :--- |
| Data Plane / Control Plane / worker / DB / infrastructure | <change> | `<path>:<line>` |

## 3. Current facts and assumptions

| Type | Statement | Evidence / owner | Resolution needed? |
| :--- | :--- | :--- | :---: |
| Fact | <verifiable statement> | `<path>:<line>` | No |
| Assumption | <unverified statement> | <owner or question> | Yes/No |

**Blocking questions:** <List material unknowns, or `None`. Do not proceed with a security,
compatibility, cost, or retention unknown.>

## 4. Proposed behavior and contracts

### Behavior

1. The system **MUST** <observable requirement>.
2. The system **MUST NOT** <prohibited behavior>.

### API / event / UI contract

| Item | Current | Proposed | Compatibility / migration |
| :--- | :--- | :--- | :--- |
| Endpoint, field, event, UI state, or config | <old> | <new> | <safe path> |

### Data and retention

| Data | Created/read/changed by | Retention | Access control | Migration |
| :--- | :--- | :--- | :--- | :--- |
| <data class> | <component> | <duration/none> | <who> | <plan/N/A> |

## 5. Security and privacy review

| Threat or trust boundary | Risk | Required mitigation | Verification |
| :--- | :--- | :--- | :--- |
| <e.g., caller-controlled URL> | <impact> | <control> | <test/check> |

- **Secrets exposure review:** <result>
- **Authorization / tenant isolation review:** <result>
- **Logging / retention review:** <result>
- **Abuse limits / failure behavior:** <result>

## 6. Implementation plan

1. <ordered, reversible implementation step with paths>
2. <test step>
3. <documentation/reconciliation step>

## 7. Acceptance criteria

- [ ] <Binary, observable criterion>
- [ ] <Binary, observable criterion>
- [ ] Unauthorized/cross-tenant/invalid input behavior is verified where applicable.
- [ ] Relevant automated tests pass.

## 8. Validation plan

| Check | Command or procedure | Expected outcome | Result |
| :--- | :--- | :--- | :--- |
| Unit/integration test | `<exact command>` | <outcome> | Pending |
| Contract/security test | `<exact command or manual steps>` | <outcome> | Pending |

## 9. Rollout, monitoring, and rollback

- **Rollout order:** <migrations, deploy order, flag, cache invalidation>
- **Monitoring:** <metrics/logs/alerts and expected signals>
- **Rollback:** <exact reversible action and data implications>

## 10. Completion record

- **Implemented in:** <commit/PR/date>
- **Validation evidence:** <commands and outputs summary>
- **Known limitations / follow-ups:** <links or `None`>
- **Blueprint updates:** <paths updated>

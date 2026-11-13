# Production Authorization Checklist

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Purpose:** Confirm that the path from merged code to production requires a human decision that the triggering identity cannot make for itself.
**Scorecard controls:** CK-DC-01, CK-DC-02, CK-DC-03, CK-DC-04, CK-KE-06

| # | Check | Evidence |
|---|---|---|
| 1 | Production is a protected environment with named human reviewers | Environment settings export |
| 2 | The identity that triggers a deployment cannot approve it (self-review prevented) | Same |
| 3 | No agent identity is an allowed deployer or reviewer | Same |
| 4 | Production secrets are environment-scoped and released only after approval | Secret configuration |
| 5 | Jobs on agent branches cannot reach the production environment | Deployment branch rules |
| 6 | Secret scanning is a required pipeline step before deployment | Pipeline definition |
| 7 | Merge does not automatically deploy to production without step 1 — or the auto-deploy path is itself gated | Pipeline definition |
| 8 | Rollback runbook exists and was tested on: ____ | Runbook link |
| 9 | Break-glass path exists, is logged, and requires a named approver | Procedure + sample log |

## Limitations

Approval features differ by platform and plan (see the evidence register). Record compensating controls where a feature is unavailable.

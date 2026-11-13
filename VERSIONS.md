# Versions

Machine-readable source: `reference/versions.json`. Tests fail if the model, register, validator or pages disagree with it.

| Item | Version | Date | Notes |
|---|---|---|---|
| Site release (nav badge "site v2.0") | 2.0 | 2026-11-12 | Release label for the website as a whole, not a document version |
| Codokey Protocol | 1.1 | 2026-11-12 | Adds six layer specifications; layers unchanged from 1.0 |
| Governance Scorecard model | 2.0.0 | 2026-11-12 | Breaking change in grade interpretation — see `SCORING.md` §7 |
| Evidence Register | 1.0.0 | verified 2026-11-12 | `reference/evidence-register.json` |
| Reference Cases / validator | 1.0.0 / 1.1.1 | 2026-11-12 | `cases/`, `tools/codokey-check.mjs`; validator 1.1.1 hardens Cases A–D (see `docs/PR2_HARDENING.md`) |
| Scorecard export schema | 2.0.0 | 2026-11-12 | `reference/schemas/scorecard-assessment-2.0.0.schema.json` (generated; versioned with the model) |
| Reference Kit | 1.0.0 | 2026-11-12 | `kit/` |
| Review package | 1.0.0 | 2026-11-12 | `review/` |
| Charter | 1.0 | 2026-06-01 | |
| Category Definition | 1.2 | 2026-11-12 | 1.2 removes the unsupported "canonical reference" status claim |
| Narrative, Asset Thesis, Buyer Logic, Buyer Brief | 1.1 | 2026-06-01 | Status notes added 2026-11-12; content otherwise unchanged except corrected claims |

## Rules

- A page shows the version of the **document** it presents (e.g. "CHARTER v1.0"), never a sprint number.
- The nav badge shows only the site release.
- Semantic versioning for machine-consumed artifacts (scorecard model, register, cases, kit): MAJOR when an existing result or ID changes meaning, MINOR for additions, PATCH for corrections that do not change results.
- Print briefs are dated snapshots and state their own version and date.

## Site release history

| Release | Date | Summary |
|---|---|---|
| 1.0 | 2026-06-01 | Multi-page static site |
| 1.1–1.4 | 2026-06-01 | Category, evidence-pack briefs, doctrine sprints (labels were used inconsistently on pages) |
| 2.0 | 2026-11-12 | Evidence, trust & adoption sprint — see `DECISION_LOG.md` |

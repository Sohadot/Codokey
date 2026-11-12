# Codokey

**Reference model for AI Code Access Governance — protocol, evidence-aware scorecard, verified evidence register, reproducible cases, and adoption templates.**

Codokey defines the boundary between AI coding agents, codebases, secrets, and production authority. It is a static reference site and documentation corpus, positioned as a strategic digital asset — **not** a deployed security product, scanner, or certification scheme.

## Public site

| Path | Content |
|------|---------|
| `/` | Overview |
| `/category/` | Category definition (v1.2) — Codokey's proposed definition |
| `/charter/` | Charter v1.0 — founding doctrine |
| `/protocol/` | Protocol v1.1 — six layers |
| `/protocol/<layer>/` | Six layer reference specifications (code-origin, key-exposure, agent-authority, review-boundary, deployment-control, audit-memory) |
| `/governance-scorecard/` | Scorecard model v2.0.0 — 32 controls, critical gates, local-only |
| `/evidence/` | Evidence Register v1.0.0 — sources, exact passages, claim classes |
| `/reference-cases/` | Reference Cases A–D — reproducible pass/fail checks |
| `/reference-kit/` | Reference Kit v1.0.0 — templates |
| `/review/` | Open Review — package for external reviewers (no review has occurred) |
| `/secrets-boundary/`, `/agent-permissions/` | Secret classes; agent classes and forbidden zones |
| `/cost-of-inaction/`, `/buyer-logic/` | Doctrine and strategic reasoning |
| `/briefs/` | Print-ready briefs (noindex) |
| `/strategic-inquiries/` | Acquisition, licensing, partnership |

## Verify it yourself

Node 18+; no dependencies to install.

```sh
node --test tests/*.test.mjs        # scorecard model, reference cases, site integrity (40 tests)
node tests/ui/scorecard.ui.mjs      # browser test (needs Playwright + Chromium)
node tools/build.mjs --check        # generated pages match their sources
node tools/verify-evidence.mjs      # re-check evidence sources online
node tools/codokey-check.mjs --help # run a reference case (see /reference-cases/)
```

## Repository layout

| Path | Purpose |
|------|---------|
| `assets/js/scorecard-model.js` | Single source for controls and scoring (browser + Node) |
| `reference/` | Evidence register, control catalog (JSON/CSV), versions |
| `cases/` | Reference case fixtures (synthetic) and expected outcomes |
| `kit/` | Reference Kit templates |
| `review/` | Review package, rubric, feedback template, review log |
| `tools/build.mjs` | Generates data-driven pages and normalizes shared chrome; `--check` for CI |
| `tools/codokey-check.mjs` | Reference-case validator |
| `tools/verify-evidence.mjs` | Online re-verification of the evidence register |
| `tests/` | Automated tests |
| `docs/BASELINE_AUDIT.md` | Audit of the pre-sprint baseline |

## Key documents

| File | Purpose |
|------|---------|
| `SCORING.md` | Scorecard specification, rationale, breaking changes |
| `VERSIONS.md` | Version scheme and current versions |
| `IP_AND_PROVENANCE.md` | What is original, branded, or generally available; reuse status |
| `CODOKEY_PROTOCOL.md`, `CODOKEY_CHARTER.md`, `CODOKEY_CATEGORY_DEFINITION.md` | Source documents |
| `ASSET_THESIS.md`, `BUYER_BRIEF.md`, `BUYER_LOGIC.md`, `CODOKEY_NARRATIVE.md`, `MONETIZATION_PRINCIPLES.md` | Strategic positioning (aspirational claims are marked as such) |
| `SEO_POLICY.md`, `CONTENT_STANDARD.md`, `QUALITY_GATE.md`, `DECISION_LOG.md`, `PROJECT_DOCTRINE.md` | Operating standards |

## Deploy

Static site; no build step is required to serve it. GitHub Pages from the repository root with `.nojekyll` and `CNAME`. After editing a data source (model, register, layer or case content), run `node tools/build.mjs` and commit the regenerated files.

## Ownership & inquiries

Privately held digital asset of Sohadot. No reuse license has been published yet (see `IP_AND_PROVENANCE.md`). Strategic inquiries: inquiry@codokey.com

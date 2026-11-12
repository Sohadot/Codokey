# Intellectual Property & Provenance

**Owner:** Sohadot · **Prepared:** 2026-11-12 · **Status:** factual inventory, not legal advice

This document separates what Codokey originated, what it brands, and what it builds on, so that a reviewer, licensee or acquirer can see exactly what the asset contains.

## 1. Original Codokey materials

Authored in this repository; history in Git.

| Material | Location | First appearance |
|---|---|---|
| Six-layer protocol structure and layer names; forbidden zones | `CODOKEY_PROTOCOL.md`, `/protocol/` | 2026-06-01 |
| Layer reference specifications (objectives, scenarios, principles, limitations) | `tools/content/layers.mjs`, `/protocol/<layer>/` | 2026-11-12 |
| 32-control catalog wording, evidence expectations, remediation text | `assets/js/scorecard-model.js`, `reference/controls.json` | 2026-06-01 (checks), 2026-11-12 (controls v2) |
| Scorecard gating methodology (forbidden-zone caps, floor/ceiling handling of unknowns) | `SCORING.md` | 2026-11-12 |
| Reference cases A–D, fixtures and validator | `cases/`, `tools/codokey-check.mjs` | 2026-11-12 |
| Reference Kit templates and the Audit Evidence Specification | `kit/` | 2026-11-12 |
| Evidence register compilation (selection, classification, application notes) | `reference/evidence-register.json` | 2026-11-12 |
| Charter, category definition, narrative and doctrine texts; site design | `*.md`, pages, `assets/css/` | 2026-06-01 |

## 2. Brand identity

- The name **Codokey** and the domain **codokey.com** (domain registration and any trademark filings are outside this repository and are not evidenced here).
- Visual identity: dark editor palette with acid-green `#b8ff3f`, file-tab navigation, diff-style presentation.

## 3. Not claimed as exclusive

- The phrase **"AI Code Access Governance"** and related terms (code-key boundary, agent authority surface, governance debt). They are Codokey's proposed vocabulary; using a term first does not confer exclusive rights, and related guidance exists under other names.
- The **security principles** the protocol organizes: least privilege, separation of duties, human approval of high-impact actions, secret scanning, audit logging. These come from public standards and vendor guidance listed in the evidence register.
- **Third-party content** quoted in the evidence register remains the property of its publishers; quotations are short and attributed. OWASP Top 10 for Agentic Applications is CC BY-SA 4.0.

## 4. Reuse terms

**No license has been published.** By default this means others have no explicit permission to copy or adapt the materials, which limits adoption of the Reference Kit. Choosing terms is an owner decision. Options commonly used for this split:

- reference kit, control catalog and cases under an open content/code license (enables adoption and citation);
- brand, name, domain and site design reserved.

Until a decision is made, the kit states that redistribution requires contacting inquiry@codokey.com.

## 5. Provenance facts

- Repository: `Sohadot/Codokey`. All changes are in Git history; this sprint's commits are on branch `ccr-eaae92cc-iclcxf` (draft PR, not merged).
- External sources were retrieved on 2026-11-12; re-run `node tools/verify-evidence.mjs` to re-check.
- No external review, endorsement, adoption, customer, revenue or licensing agreement exists as of 2026-11-12 (`review/REVIEW_LOG.md`).

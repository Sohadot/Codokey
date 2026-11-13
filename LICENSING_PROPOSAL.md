# Licensing Proposal — FOR OWNER DECISION, NOT OPERATIVE

**Status:** Proposal only · prepared 2026-11-12 for Sohadot · branch `ccr-eaae92cc-iclcxf` (PR #2)

> **This document grants no rights to anyone.** No LICENSE file, license header, SPDX identifier, or public grant has been added to the repository or site. Until the owner adopts terms in a separate, explicit change, all materials remain all rights reserved, as stated in `IP_AND_PROVENANCE.md`. This is not legal advice; have counsel review before adoption, in particular the trademark and patent points in §5.

## 1. Proposed structure

| Tier | License | Purpose |
|---|---|---|
| A | **CC BY 4.0** | Let organizations copy, adapt and redistribute the adoption templates and the control catalog, with attribution |
| B | **Apache License 2.0** | Let engineers reuse the validator, scoring model and test code in their own tooling |
| R | **Reserved (all rights reserved)** | Brand, site design, doctrine, strategy, specifications, evidence compilation, and everything not listed in A or B |
| X | **Third-party, excluded** | Material owned by others; never covered by A or B |

Both CC BY 4.0 (§2(a)(1)) and Apache 2.0 (§2–3) grant **irrevocable** licenses. Once a version is published under them, that version cannot be withdrawn. Neither license grants trademark rights: CC BY 4.0 §2(b)(2) and Apache 2.0 §6 exclude them.

## 2. Exact file-level scope

Paths are relative to the repository root at the PR #2 head. A future version would apply only to the files listed. New files are **not** covered unless a later decision adds them.

### Tier A — CC BY 4.0 (proposed)

| File | Notes |
|---|---|
| `kit/README.md` | Its "reuse terms have not yet been published" paragraph must be replaced on adoption |
| `kit/agent-access-policy.md` | |
| `kit/agent-access-policy.example.json` | Synthetic example values |
| `kit/repository-access-boundary-checklist.md` | |
| `kit/secrets-exposure-review.md` | |
| `kit/ai-pr-review-checklist.md` | |
| `kit/production-authorization-checklist.md` | |
| `kit/audit-evidence-specification.md` | Field mapping to NIST SP 800-53 AU-3 is a factual reference, not NIST text |
| `reference/controls.json` | Generated control catalog: control IDs, titles, evidence, remediation, layer and severity |
| `reference/protocol-control-map.csv` | Generated from the same source |
| `cases/a-secrets-access/README.md` | Generated case documentation |
| `cases/b-excess-authority/README.md` | Generated |
| `cases/c-production-path/README.md` | Generated |
| `cases/d-audit-reconstruct/README.md` | Generated |

**Attribution form (proposed):** "Based on the Codokey Reference Kit v1.0.0 (codokey.com), licensed under CC BY 4.0. Changes were made." Attribution must not imply endorsement by, or certification from, Codokey.

### Tier B — Apache License 2.0 (proposed)

| File | Notes |
|---|---|
| `tools/codokey-check.mjs` | Reference-case validator |
| `assets/js/scorecard-model.js` | Scoring model. The control text inside it is the same text as Tier A `reference/controls.json`, so that text would be available under both licenses (no conflict: one licensor) |
| `reference/schemas/scorecard-assessment-2.0.0.schema.json` | Export schema (an interface definition) |
| `tests/model.test.mjs`, `tests/cases.test.mjs`, `tests/adversarial.test.mjs`, `tests/export-schema.test.mjs`, `tests/ajv-crosscheck.mjs`, `tests/lib/json-schema-subset.mjs` | Tests that exercise Tier B code |
| `cases/*/expected.json`, `cases/*/*.json`, `cases/*/*.jsonl`, `cases/d-audit-reconstruct/provenance.json`, `cases/a-secrets-access/repo/**` | Synthetic fixtures (test data). The `repo/` files contain fake credential strings marked SYNTHETIC FIXTURE |

### Tier R — Reserved (not licensed)

- **Brand:** the names "Codokey", "Codokey Aligned" and "Codokey Protocol", the domain codokey.com, `CNAME`, and `assets/social-preview.svg` / `.png`.
- **Site design and front end:** `assets/css/*.css`, `assets/js/main.js`, `assets/js/scorecard.js`, every `*/index.html`, `index.html`, `sitemap.xml`, `robots.txt`, `.nojekyll`.
- **Specifications and doctrine:**
  - `CODOKEY_PROTOCOL.md`, `CODOKEY_CHARTER.md`, `CODOKEY_CATEGORY_DEFINITION.md`, `CODOKEY_NARRATIVE.md`, `SCORING.md`
  - `tools/content/layers.mjs` (layer specifications)
  - `tools/content/cases.mjs` (source of the Tier A case READMEs — see §4, item 3)
- **Evidence compilation:** `reference/evidence-register.json` and `/evidence/`. See §4, item 4.
- **Commercial strategy:** `ASSET_THESIS.md`, `BUYER_BRIEF.md`, `BUYER_LOGIC.md`, `MONETIZATION_PRINCIPLES.md`, `IP_AND_PROVENANCE.md`, `LICENSING_PROPOSAL.md`, `docs/**`.
- **Operating documents:** `PROJECT_DOCTRINE.md`, `CONTENT_STANDARD.md`, `SEO_POLICY.md`, `QUALITY_GATE.md`, `DECISION_LOG.md`, `VERSIONS.md`, `README.md`.
- **Site tooling and site-specific tests:** `tools/build.mjs`, `tools/verify-evidence.mjs`, `tests/site.test.mjs`, `tests/docs-commands.test.mjs`, `tests/ui/**`, `.github/**`, `package.json`, `reference/versions.json`.
- **Review package:** `review/**`. Reviewer submissions are addressed in §4, item 6.

### Tier X — Third-party content (excluded from every grant)

| Content | Location | Owner / terms |
|---|---|---|
| Quoted passages (`passage` fields) | `reference/evidence-register.json`, `/evidence/` | Their publishers: NIST, OWASP, GitHub, GitLab, Anthropic, MCP project, OpenSSF/SLSA, Microsoft. The OWASP Top 10 for Agentic Applications 2026 is CC BY-SA 4.0 (stated in that document) |
| Source titles and section names | Same, and the "Sources" lists in case READMEs | Factual references to third-party works |
| Platform setting names and syntax in examples (e.g. `Read(.env)`, `permissions:`, CODEOWNERS syntax) | `tools/content/layers.mjs`, protocol pages | Their vendors. Examples were written by Codokey; the product syntax belongs to the vendors |
| Google Fonts loaded at runtime | page `<head>` | Their licenses; not distributed in this repository |

## 3. How this interacts with existing IP assertions

| Existing statement | File | Effect if the proposal is adopted |
|---|---|---|
| "No license has been published … redistribution requires contacting inquiry@codokey.com" | `IP_AND_PROVENANCE.md` §4, `kit/README.md`, `/reference-kit/` page | Superseded for Tiers A and B. Must be edited in the same change that adds the licenses |
| "Licensing: reference model citation licensing … documentation corpus licensing for training and compliance" | `MONETIZATION_PRINCIPLES.md` | **Conflict.** Fees for copying or adapting Tier A/B files would no longer be possible. Citation never needed a license. Brand licensing and services stay possible |
| "Hard-to-copy reference infrastructure" | `ASSET_THESIS.md` | **Conflict** for Tier A/B: they become explicitly copyable. Still true for Tier R and for the maintained, versioned whole |
| Asset tables listing scorecard, kit and cases as acquisition assets | `BUYER_BRIEF.md`, `/strategic-inquiries/` | Not a conflict, but they must disclose the outbound licenses. A buyer acquires copyright in these files, not exclusivity |
| "Privately held digital asset of Sohadot" | `README.md` | Remains true: licensing is not a transfer of ownership |

## 4. Decision points the owner must settle before adoption

1. **Versions covered.** Proposed: only the versions published at adoption (kit 1.0.0, validator 1.1.1, model 2.0.0, schema 2.0.0). Later versions could use different terms.
2. **Severity and gating method.** The scoring method is an idea or method, so copyright does not protect it either way. Licensing `scorecard-model.js` only affects reuse of the code and text.
3. **`tools/content/cases.mjs`.** The case READMEs (Tier A) are generated from this reserved source. Either license `cases.mjs` under CC BY 4.0 as well, or accept that adapters edit the README output rather than the source.
4. **Evidence register.** Option: license only the Codokey-authored fields (`supports`, `codokeyApplication`, `limitations`, `claimClass`, `codokeyClaims`) under CC BY 4.0, explicitly excluding `passage`. Recommended to keep reserved for now: this avoids a CC BY-SA interaction with quoted OWASP text and keeps the curated compilation as an asset.
5. **Patents.** Apache 2.0 §3 includes a patent license for anyone practising the licensed code. No patent or application is evidenced in this repository. If one exists or is planned for the gating method, keep `scorecard-model.js` out of Tier B.
6. **Inbound contributions.** The review issue form invites text from third parties. Before accepting code or template changes, adopt a contribution rule: for example inbound = outbound per Apache 2.0 §5, a Developer Certificate of Origin for code, and CC BY 4.0 for kit text. Otherwise contributed changes cannot be relicensed.
7. **Naming guideline.** Publish a short rule alongside the licenses:
   - Users may say "based on the Codokey Reference Kit" or "assessed with the Codokey Scorecard model 2.0.0 (self-assessment)".
   - Users may not claim "Codokey certified", "Codokey approved", or use "Codokey Aligned" as a status conferred by Codokey.
   - Trademark registration status is not evidenced in this repository.

## 5. Commercial and acquisition consequences

### Rights that remain with the owner
- Copyright in every file, including licensed files. The owner can sell, assign or relicense them.
- Exclusive control of Tier R: brand and domain, site design, doctrine, layer specifications, scoring documentation, evidence compilation, and strategy.
- Freedom to publish future versions of Tier A/B under different terms, or not at all.
- Brand licensing, hosted or managed versions, advisory work, sponsorship, and sale of the whole asset to an acquirer.
- An acquirer would receive ownership of everything, plus the brand and domain.

### Exclusivity that would be given up
- For the licensed versions only: the right to stop others from copying, adapting, redistributing or commercializing those files, including competitors and including after an acquisition. A buyer cannot revoke the grants.
- For the Tier B code: an Apache 2.0 patent license to the extent any owned patent reads on it.
- Pricing power over the templates and the control catalog themselves. Value would need to come from the brand, maintenance, review status, the evidence compilation, and services.

### Rights that are not affected because they never existed
- Exclusive rights over the phrase "AI Code Access Governance", the security principles (least privilege, separation of duties, human approval), or the gating idea. Copyright does not protect ideas or methods; see `IP_AND_PROVENANCE.md` §3.

### Alternatives considered

| Option | Adoption | Exclusivity kept | Note |
|---|---|---|---|
| This proposal (A + B, rest reserved) | High for kit and code | Brand, design, doctrine, specifications, evidence | Recommended if adoption is the near-term goal |
| CC BY-NC for Tier A | Lower: enterprise use is commercial use, and "non-commercial" is ambiguous | More | Undercuts the stated adoption goal |
| CC BY-ND | Low: the templates cannot be adapted | More | Templates are meant to be adapted |
| No license until acquisition talks | None (permission needed for every use) | All | Adoption and citation evidence cannot accumulate |

## 6. Steps if the owner approves (a separate change; not done here)
1. Add `LICENSES/CC-BY-4.0.txt` and `LICENSES/Apache-2.0.txt` (canonical texts).
2. Add a top-level `LICENSE.md` stating the tiers and the exact file list from §2, with "all other materials: all rights reserved".
3. Add SPDX headers to Tier B source files, and license notes to Tier A file headers.
4. Update `IP_AND_PROVENANCE.md` §4, `kit/README.md`, `/reference-kit/`, `MONETIZATION_PRINCIPLES.md`, `ASSET_THESIS.md`, `BUYER_BRIEF.md`.
5. Publish the naming guideline (§4, item 7) and the contribution rule (§4, item 6).
6. Add a test asserting every Tier A/B file carries its notice and no Tier R file does.

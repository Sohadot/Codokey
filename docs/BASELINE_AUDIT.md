# Baseline Audit — Evidence, Trust & Adoption Sprint

**Baseline:** `main` at `e841eec` (merge of PR #1, site sprint v1.3/v1.4) · **Audited:** 2026-11-12
**Method:** full read of repository documents and pages; automated checks (sitemap, canonicals, internal links, titles) run against a clean checkout of `main`; pages rendered in Chromium at 1280px and 360–375px; scorecard logic read and exercised.

Statements in Codokey's own documents were **not** treated as evidence of external authority.

## 1. Verified strengths

| Strength | How verified |
|---|---|
| Coherent identity: code-editor/diff aesthetic, consistent terminology, six-layer protocol, explicit "not a product" positioning | Read all 15 pages and 14 documents |
| Static, dependency-free architecture deployable to GitHub Pages | No build step, no package manifest, `.nojekyll`, `CNAME` |
| All 11 indexable pages have unique titles, descriptions and self-referencing canonical URLs | Automated check on `main` |
| No broken internal links | Automated check of every root-relative `href` on `main` |
| Scorecard disclaimer ("not certification") present; no SaaS / free-trial language | Read |
| Protocol layers map to scorecard groups (4/6/6/5/5/6 = 32) | Read |

## 2. Defects (with evidence)

### Scorecard integrity (highest impact)

| # | Defect | Evidence |
|---|---|---|
| S1 | Grade derived only from the percentage of ticked boxes; **A+ at ≥85%** means 28/32 — up to 4 unresolved checks, which may all be critical (18 of 32 are critical) | `assets/js/scorecard.js` grade table |
| S2 | No distinction between "not assessed" and "not implemented"; an untouched scorecard displays **"C — Ungoverned AI Code Access"** | `updateScorecard()` runs on load and makes the output visible |
| S3 | "Primary gap" and "Next action" are fixed strings per grade band, not derived from the answers (e.g. A+ always says "None — all critical checks resolved" even when critical checks are unticked) | grade table |
| S4 | Checks are `div` elements with `onclick`; not focusable or operable by keyboard, no roles or states for assistive technology | 32 `onclick` divs in `/governance-scorecard/` |
| S5 | Check #2 ("human review required for AI-generated merges") duplicates #17 at the same severity; agent identity/attribution is absent from all 32 checks | content review |
| S6 | Check #6 relies on pre-commit hooks, which the committer can skip | content review |

### Site defects

| # | Defect | Evidence |
|---|---|---|
| D1 | **The IDE file-tab navigation was not visible on any page.** `nav{position:fixed;top:0}` also matched the footer `<nav class="footer-nav">`, which rendered on top of it | Chromium render of `main` (top bar shows footer links) |
| D2 | **`assets/social-preview.svg` was invalid XML** (non-ASCII characters stored as control bytes U+0014/U+0012/0xB7); the Open Graph/Twitter image could not render. Many platforms also do not accept SVG for `og:image` | XML parser error at line 1 col 120; Chromium shows parse error |
| D3 | 4 print briefs are `noindex` yet listed in `sitemap.xml` (15 entries, 11 indexable) | automated check |
| D4 | `body{cursor:none}` hid the system pointer for all mouse users | `codokey.css` |
| D5 | Version labels inconsistent: nav badge `v1.0` on some pages and `v1.3` on others; file headers show sprint numbers (v1.2, v1.4) that are not document versions; social image says v1.2; CODOKEY_CHARTER.md is v1.0 while the page says v1.4 | grep across pages |
| D6 | Horizontal overflow at 360px on `/agent-permissions/` (long unbreakable tokens) | Chromium at 360px |
| D7 | SEO_POLICY and QUALITY_GATE describe 9 or 10 pages and footer links; the site had 15 pages and 11 footer links | documents vs. pages |

### Claims without evidence

| # | Claim | Where | Status |
|---|---|---|---|
| C1 | Homepage terminal reads "Scanning sample codebase — 847 files" — a static visualization presented as scanner output | `index.html` | Misleading even though titled "reference simulation" |
| C2 | "Codokey is the canonical reference model", "category-defining reference infrastructure", "−0 competing definitions", `canonicalReference = "codokey.com"` | `/category/`, category brief, README, ASSET_THESIS, BUYER_BRIEF | No external evidence; related practitioner guidance exists under other names (e.g. Microsoft Zero Trust DS 120) |
| C3 | Briefs described as "the evidence layer of the asset" / "Codokey Evidence Room" | `/briefs/` and doctrine-hierarchy blocks on 5 pages | Self-authored doctrine is not evidence |
| C4 | "Acquire the reference model that already owns the language"; "first-mover in AI Code Access Governance definition" | BUYER_BRIEF, MONETIZATION_PRINCIPLES | Unverified ownership and first-mover claims |
| C5 | "Recovery cost grows non-linearly"; "the company that owns the language … " | `/cost-of-inaction/` | Doctrine without measurement |
| C6 | No page cites any external source | all pages | Evidence gap |

## 3. Evidence gaps

- No evidence register; no external citations anywhere.
- No reproducible artifacts: nothing a reviewer could run to test a claim.
- No operational templates an organization could adopt.
- No mechanism for external review or correction.
- No license or reuse terms for any material (unchanged — owner decision; see `IP_AND_PROVENANCE.md`).

## 4. Priorities set from this audit

1. Scorecard: gates instead of percentages; explicit unknowns; dynamic gaps; keyboard access (S1–S6).
2. Repair D1–D7 because they affect every visitor.
3. Build the evidence register; remove or reclassify C1–C5.
4. Layer specifications, reproducible cases, kit, review package.
5. Automated tests so these properties stay true.

## 5. What was deliberately preserved

The visual system, terminology, six layers and their names, forbidden zones, the 32-control count and severity distribution (18/11/3), URLs of all existing pages, and the doctrinal voice of charter and cost pages — except where a specific claim above required correction.

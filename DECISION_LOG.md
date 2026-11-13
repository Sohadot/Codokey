# Decision Log

Architectural and strategic decisions for the Codokey repository.

---

## 2026-11-12 — Evidence, Trust & Adoption Sprint (site 2.0)

**Decision:** Shift Codokey's credibility from self-declared authority to inspectable substance. Baseline findings in `docs/BASELINE_AUDIT.md`.

**Changes:**
- Scorecard model 2.0.0: three states, critical/forbidden-zone gates, floor/ceiling handling of unknowns, dynamic gap list, keyboard-accessible form, local-only JSON export (`SCORING.md`).
- Evidence Register 1.0.0 with verified passages and claim classes; online re-verification tool.
- Protocol 1.1: six layer specifications generated from structured content and the scorecard model.
- Reference Cases A–D with a zero-dependency validator and pinned expected outcomes.
- Reference Kit 1.0.0 and review package (no review has occurred).
- Fixed hidden top navigation, invalid social image, sitemap/noindex contradiction, hidden system cursor, inconsistent version labels, mobile overflow.
- Removed or reclassified unsupported claims (canonical/category-defining status, pseudo-scan output, briefs-as-evidence, first-mover).

**Architecture:** Still static, still no runtime dependencies. Added `tools/build.mjs` as a maintenance generator; generated files are committed and `--check` guards drift. Rejected: a static-site framework (new dependency), a backend for the scorecard (no requirement; privacy is better served locally).

**Breaking:** Scorecard grades from v1.0 are not comparable with v2.0.0.

**Open (owner decisions):** reuse license for kit and cases; whether to seek external review; trademark status (not evidenced in repository).

---

## 2026-06-01 — Multi-Page Static Site Architecture

**Decision:** Split single-page SPA prototype into 9 independent HTML pages with shared CSS/JS assets.

**Rationale:** GitHub Pages requires real URLs for SEO, deep linking, and institutional citation. Tab-based SPA navigation does not produce indexable pages or shareable references.

**Structure:**
- `/assets/css/codokey.css` — shared design system
- `/assets/js/main.js` — cursor, shared behavior
- `/assets/js/scorecard.js` — scorecard interactivity
- Each page in its own directory with `index.html`

**Alternatives rejected:**
- Static site generator (11ty, Astro) — adds build dependency
- Keeping SPA with hash routing — poor SEO, non-institutional URLs

---

## 2026-06-01 — Reference Model Positioning

**Decision:** Position Codokey exclusively as reference model, charter, protocol, and scorecard — never as a working security product.

**Rationale:** No actual security tool exists. Presenting as product would violate asset integrity and create legal/reputational risk.

**Implementation:** CONTENT_STANDARD.md, scorecard disclaimer, buyer brief language, strategic inquiries page.

---

## 2026-06-01 — Navigation Model

**Decision:** IDE-style file tab navigation for 6 core reference pages. Secondary pages (cost-of-inaction, buyer-logic, strategic-inquiries) linked via footer and internal links sections.

**Rationale:** Preserves governance console aesthetic from prototype. Adding 9 tabs would overcrowd the nav bar.

---

## 2026-06-01 — Scorecard as Static JavaScript

**Decision:** 32-check scorecard runs entirely in client-side JavaScript with no persistence.

**Rationale:** Static site constraint. No backend, no localStorage requirement. Self-assessment is session-based reference tool, not audit record.

**Grades:** C (0–39%) · B (40–69%) · A (70–84%) · A+ (85–100%) — **superseded 2026-11-12** by scorecard model 2.0.0 (gate-based; see `SCORING.md`).

---

## 2026-06-01 — GitHub Pages Deployment

**Decision:** Deploy from repository root with `.nojekyll` file. No build step.

**Rationale:** Maximum durability, minimum dependency. Asset must survive without npm, CI, or external services.

---

## 2026-06-01 — Visual System Preservation

**Decision:** Retain dark IDE/diff aesthetic from prototype. Acid green (`#b8ff3f`) as brand signal.

**Rationale:** Differentiates from generic SaaS landing pages. Reinforces governance console positioning. Design system already mature in prototype.

---

## 2026-06-01 — Repository Documentation Corpus

**Decision:** Create 12 repository markdown files covering thesis, doctrine, charter, protocol, buyer logic, SEO, content standards, monetization, quality gate, and decision log.

**Rationale:** Strategic digital asset requires institutional documentation beyond public web pages. Supports acquisition due diligence and content governance.

---

## 2026-06-01 — Authority Evidence Pack v1.2

**Decision:** Add evidence-ready institutional briefs, social preview asset, strengthened pillar pages, and search submission readiness.

**New assets:**
- `/briefs/` hub + four print-ready HTML briefs (charter, protocol, category-definition, buyer-brief)
- `assets/social-preview.svg` — Open Graph / Twitter preview
- `assets/css/print-brief.css` — print-ready brief styling
- Strengthened `/cost-of-inaction/`, `/buyer-logic/`, `/category/` (Reference Stack)

**Constraints preserved:** No PDF links without files. No visual redesign. No SaaS claims. Browser Print → Save as PDF for briefs.

---

## 2026-06-01 — Inevitability & Doctrine Sprint v1.3

**Decision:** Deepen conceptual depth, buyer-loss logic, and strategic inevitability without new pages or visual redesign.

**Changes:**
- Cost pillar: future control failure framing, six sharpened failure modes, six-line governed/ungoverned diff
- Buyer logic: gain / loss / why per category
- Charter: First Law of Definition, sharper foundational doctrine
- Briefs: Codokey Evidence Room framing, explicit doctrine hierarchy
- Doctrine hierarchy block on charter, cost, buyer, briefs, category

**Constraints preserved:** No SaaS claims, no PDF links without files, no new generic pages.

---

## Pending Decisions

- Reuse license for Reference Kit, cases and control catalog — proposal in `LICENSING_PROPOSAL.md` (not operative; owner decision pending).
- Whether and whom to invite for external review (see `review/`).

---

## 2026-06-01 — Category Authority Sprint v1.1

**Decision:** Elevate Codokey from reference site to category-defining infrastructure. Add canonical category definition, narrative document, `/category/` public page, and strengthened acquisition positioning.

**New assets:**
- `CODOKEY_CATEGORY_DEFINITION.md` v1.1 — seven category layers, canonical definition
- `CODOKEY_NARRATIVE.md` v1.1 — three narrative pillars (Shift, Gap, Advantage)
- `/category/` — public category definition page
- Updated `ASSET_THESIS.md`, `BUYER_BRIEF.md`, `BUYER_LOGIC.md` v1.1
- Strengthened `/cost-of-inaction/` as Cost of Undefined Agent Authority

**Rationale:** Category language ownership is the primary strategic asset. Reference infrastructure without category authority is citable; with category authority it is canonical.

**Constraints preserved:** No visual redesign. No generic pages. No SaaS claims. Footer nav expanded to 10 pages; top nav unchanged.

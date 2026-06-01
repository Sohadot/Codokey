# Decision Log

Architectural and strategic decisions for the Codokey repository.

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

**Grades:** C (0–39%) · B (40–69%) · A (70–84%) · A+ (85–100%)

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

## Pending Decisions

_None at v1.1._

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

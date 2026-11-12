# SEO Policy

Search and indexing standards for codokey.com.

## Primary Category Phrase

**AI Code Access Governance**

Use in titles, meta descriptions, and H1-adjacent content on every page.

## Secondary Phrases

Deploy naturally across the site — not keyword-stuffed:

- code-key boundary
- agent authority surface
- secrets boundary
- governance debt
- AI agent permissions
- repository trust boundaries
- production authority
- audit memory

## Page Requirements

Every public page must include:

- Unique `<title>` (50–60 characters preferred)
- Unique `<meta name="description">` (150–160 characters preferred)
- `<link rel="canonical">` pointing to production URL
- Open Graph: type, url, title, description, site_name
- Twitter card: summary with title and description
- Internal links to related reference pages
- Footer navigation (generated; identical on every non-print page)

## URL Structure

Indexable URLs (the sitemap is generated from each page's robots meta by `tools/build.mjs`):

```
/  /category/  /charter/  /protocol/
/protocol/code-origin/  /protocol/key-exposure/  /protocol/agent-authority/
/protocol/review-boundary/  /protocol/deployment-control/  /protocol/audit-memory/
/secrets-boundary/  /agent-permissions/  /governance-scorecard/
/evidence/  /reference-cases/  /reference-kit/  /review/
/cost-of-inaction/  /buyer-logic/  /briefs/  /strategic-inquiries/
```

Print briefs under `/briefs/<name>/` are `noindex, follow` and are not in the sitemap. Trailing slashes on all paths. No hash routing. No query-parameter pages. URLs are stable for citation; anchors (`#CK-KE-03`, `#EV-GH-PUSH-PROTECTION`) are stable IDs.

## Internal Linking Rules

1. Links follow conceptual relationships: control ↔ layer specification ↔ evidence entry ↔ reference case.
2. Every page links to at least 3 related reference pages.
3. Footer navigation is generated and identical on every non-print page.
4. Acquisition pages (`/buyer-logic/`, `/strategic-inquiries/`) link to the reference work; technical pages do not carry acquisition calls to action.

## Content Separation

| Type | Pages | Rule |
|---|---|---|
| Original reference material | protocol, layer specs, scorecard, cases, kit | Technical, testable; no acquisition language |
| Supporting evidence | `/evidence/` | External sources only, with claim classes |
| Doctrine | charter, category, cost-of-inaction | Labelled as Codokey position |
| Strategic acquisition | buyer-logic, strategic-inquiries, buyer brief | No traction or endorsement claims |

## Structured Data

JSON-LD where it accurately describes the page: `TechArticle` (layer specs, cases, kit, review), `Dataset` (evidence register), `WebApplication` (scorecard). No review, rating, or organization-endorsement markup.

## Content Quality

- No thin pages — every page must carry substantive reference content
- No generic blog tone — institutional, precise, sovereign language
- No fake product claims — reference model positioning only
- No placeholder content or "coming soon" pages

## Technical SEO

- `robots.txt` allows all public pages
- `sitemap.xml` is generated; lastmod is the release date of the generating build
- Static HTML — no JavaScript-rendered content for core text
- Mobile-responsive via CSS media queries
- Semantic HTML: nav, main, footer, aria-labels

## Indexing

`<meta name="robots" content="index, follow">` on all public pages.

Repository markdown files (ASSET_THESIS.md, etc.) are for repository documentation — not indexed as separate web pages unless explicitly published.

## Measurement

No claims about rankings, indexing, AI citations or referral traffic are made without measurement data. None has been collected as of 2026-11-12.

## Prohibited

- Newsletter signup as primary CTA
- Fake testimonials or customer logos
- "Start free trial" or SaaS conversion language
- Keyword stuffing or hidden text
- Broken internal links
- Claims of certification, compliance, endorsement, or third-party validation
- Static visuals presented as live scans

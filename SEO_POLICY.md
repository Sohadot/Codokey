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
- Footer navigation to all 10 pages

## URL Structure

```
https://codokey.com/
https://codokey.com/category/
https://codokey.com/charter/
https://codokey.com/protocol/
https://codokey.com/secrets-boundary/
https://codokey.com/agent-permissions/
https://codokey.com/governance-scorecard/
https://codokey.com/cost-of-inaction/
https://codokey.com/buyer-logic/
https://codokey.com/strategic-inquiries/
```

Trailing slashes on all paths. No hash routing. No query-parameter pages.

## Internal Linking Rules

1. Every page links to at least 3 other reference pages
2. Protocol layers link to secrets-boundary and agent-permissions where relevant
3. Scorecard links to all six protocol layer groups
4. Homepage links to all 10 pages via stats row and internal links section
5. Footer nav present on every page with all 10 links

## Content Quality

- No thin pages — every page must carry substantive reference content
- No generic blog tone — institutional, precise, sovereign language
- No fake product claims — reference model positioning only
- No placeholder content or "coming soon" pages

## Technical SEO

- `robots.txt` allows all public pages
- `sitemap.xml` lists all 10 URLs with lastmod
- Static HTML — no JavaScript-rendered content for core text
- Mobile-responsive via CSS media queries
- Semantic HTML: nav, main, footer, aria-labels

## Indexing

`<meta name="robots" content="index, follow">` on all public pages.

Repository markdown files (ASSET_THESIS.md, etc.) are for repository documentation — not indexed as separate web pages unless explicitly published.

## Prohibited

- Newsletter signup as primary CTA
- Fake testimonials or customer logos
- "Start free trial" or SaaS conversion language
- Keyword stuffing or hidden text
- Broken internal links

# Quality Gate

Pre-publish checklist for codokey.com pages and repository content.

## Page Completeness

- [ ] Unique title tag
- [ ] Unique meta description
- [ ] Canonical URL set to production domain
- [ ] Open Graph metadata complete
- [ ] Twitter card metadata complete
- [ ] File header with path and diff stats
- [ ] Substantive body content (not thin)
- [ ] Internal links section with 3+ related pages
- [ ] Footer with all 9 navigation links
- [ ] Active nav tab matches current page

## Positioning

- [ ] No fake SaaS or product claims
- [ ] Scorecard labeled as self-assessment, not certification
- [ ] Reference model language used consistently
- [ ] No "sign up" or "free trial" CTAs
- [ ] Strategic inquiry language is restrained

## Technical

- [ ] Static HTML only — no backend dependency
- [ ] CSS loaded from `/assets/css/codokey.css`
- [ ] JS loaded from `/assets/js/` where needed
- [ ] All internal links use absolute paths from root (`/charter/`)
- [ ] No broken links (verify all 9 pages + mailto)
- [ ] Mobile responsive at 768px breakpoint
- [ ] GitHub Pages compatible (no Jekyll conflicts — `.nojekyll` present)

## Visual System

- [ ] Dark code/editor background (`#0d1117`)
- [ ] Git diff green for safe/added/governed states
- [ ] Git diff red for critical/removed/forbidden states
- [ ] Pale code text, muted gray metadata
- [ ] Yellow for review/high-severity authority
- [ ] Acid green (`#b8ff3f`) as Codokey signal color
- [ ] JetBrains Mono + Outfit typography
- [ ] Does not look like generic SaaS landing page

## SEO

- [ ] Primary phrase "AI Code Access Governance" present
- [ ] At least 2 secondary phrases used naturally
- [ ] Page listed in sitemap.xml
- [ ] robots.txt allows indexing

## Content

- [ ] Institutional, precise, sovereign language
- [ ] No generic blog tone
- [ ] Terminology matches CONTENT_STANDARD.md
- [ ] No placeholder text or lorem ipsum

## Repository

- [ ] Related .md source document updated if content changed
- [ ] DECISION_LOG.md updated for architectural changes
- [ ] README.md reflects current site structure

## Sign-Off

| Gate | Status | Date |
|------|--------|------|
| v1.1 category authority sprint | Pass | 2026-06-01 |

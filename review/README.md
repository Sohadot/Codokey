# Independent Review Package

**Version 1.0.0 · prepared 2026-11-12**

This package lets an external security engineer evaluate Codokey without relying on anything Codokey says about itself.

**Status: no independent review has taken place.** The [review log](REVIEW_LOG.md) is empty. Nothing on codokey.com should be read as reviewed, endorsed, or validated by any third party.

## What is in scope

| Artifact | Location | What to challenge |
|---|---|---|
| Codokey Protocol v1.1 (six layers) | `/protocol/` and `/protocol/<layer>/` | Missing threats, wrong boundaries, layers that overlap or leave gaps |
| Scorecard model v2.0.0 (32 controls, gates) | `assets/js/scorecard-model.js`, `SCORING.md` | Severity assignments, forbidden-zone gates, B/C threshold, unknown handling |
| Evidence register v1.0.0 | `reference/evidence-register.json`, `/evidence/` | Misquoted passages, overstated support, wrong claim class, missing sources |
| Reference cases A–D | `cases/`, `tools/codokey-check.mjs` | False positives / false negatives, unrealistic fixtures, wrong pass conditions |
| Reference Kit v1.0.0 | `kit/` | Gaps that would stop real adoption |

## How to reproduce (about 2 minutes, Node 18+, no dependencies)

```sh
git clone https://github.com/Sohadot/Codokey.git && cd Codokey
node --test tests/*.test.mjs                 # model, cases, site integrity
node tools/codokey-check.mjs production-path \
  --change cases/c-production-path/change.self-approved.json \
  --policy cases/c-production-path/policy.governed.json   # expect FAIL on C4, C7
node tools/build.mjs --check                 # generated pages match their sources
```

Optional browser test (needs Playwright with Chromium): `node tests/ui/scorecard.ui.mjs`.

## How to report

Use the [feedback template](FEEDBACK_TEMPLATE.md) or open an issue with the "Review finding" form. Rate each finding with the [rubric](RUBRIC.md).

## What a reviewer should NOT assume

- That "implemented" in the scorecard means verified — it means self-attested with evidence available.
- That a validator PASS means a platform enforces anything — results are based on declared configuration and recorded history and carry `enforcementVerified: false`.
- That any external source endorses Codokey — the register records only what each source says.
- That example configurations were executed against live platforms — they were syntax-checked; see the register's `gaps`.

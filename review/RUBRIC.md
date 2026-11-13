# Review Rubric v1.0.0

Rate every finding on two axes. Use the same scale across reviewers so results can be combined.

## Finding type

| Code | Type | Example |
|---|---|---|
| FN | False negative | A case PASSes a configuration that is actually unsafe |
| FP | False positive | A case FAILs a configuration that is acceptable |
| MC | Missing control | A material risk no control addresses |
| SV | Severity / gate disagreement | A control should (not) be critical or a forbidden zone |
| EV | Evidence defect | Passage misquoted, out of date, or does not support the stated claim |
| CL | Claim-class error | Codokey doctrine presented as external fact, or vice versa |
| US | Usability / adoption | A template cannot be used as written |
| OT | Other | |

## Impact

| Level | Meaning |
|---|---|
| 3 — Material | Could lead a user to a wrong security conclusion (e.g. a grade or PASS that is too favorable) |
| 2 — Significant | Weakens credibility or usefulness but not likely to mislead on its own |
| 1 — Minor | Wording, clarity, or completeness |

## Confidence

High (reproduced) · Medium (reasoned, not reproduced) · Low (concern to investigate).

## Overall assessment (optional)

For each artifact: **Usable as-is / Usable with listed corrections / Not usable yet**, with one sentence of reasoning.

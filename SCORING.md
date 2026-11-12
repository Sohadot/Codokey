# Governance Scorecard — Scoring Specification

**Model version:** 2.0.0 · **Date:** 2026-11-12 · **Protocol:** 1.1
**Implementation:** `assets/js/scorecard-model.js` (single source; also runs in Node)
**Tests:** `tests/model.test.mjs`, `tests/export-schema.test.mjs`, `tests/ui/scorecard.ui.mjs` (browser)

Self-assessment reference model. Not an audit, certification, or compliance determination.

## 1. Control states

| State | Meaning | Counts as implemented? |
|---|---|---|
| `pass` — Implemented, evidence available | The assessor states the control is in place **and** the listed evidence exists | Yes |
| `fail` — Not implemented | The control is absent or only partially in place | No |
| `unknown` — Not assessed / evidence insufficient | Default. Includes "we think so but cannot show evidence" | **No** — and it is never treated as a failure either |

"Pass" is self-attested. The tool cannot verify it. Exports record this in a `disclaimer` field.

## 2. Control attributes

Every control has: `id` (stable, `CK-<layer>-<nn>`), `legacy` (v1.0 check number), `layer`, `severity` (critical / high / medium), optional `forbiddenZone`, `title`, `evidence` (acceptable evidence), `remediation`, `refs` (evidence-register IDs; empty means Codokey recommendation without external source).

Severity counts: 18 critical, 11 high, 3 medium — unchanged from v1.0.

## 3. Grade for a fully resolved assessment

Applied in order:

1. **C — Ungoverned AI Code Access** if any forbidden-zone control is not implemented, **or** more than half of critical controls (more than 9 of 18) are not implemented.
2. **B — Partially Governed** if at least one critical control is not implemented.
3. **A — Controlled With Gaps** if every critical control is implemented but at least one high or medium control is not.
4. **A+ — Codokey Aligned** if every control is implemented.

Forbidden zones (from the Codokey Protocol): FZ-1 production secrets accessible to an agent (CK-KE-06, CK-DC-02); FZ-2 organization-wide scope for a single-repository task (CK-AA-05); FZ-3 unsupervised production deployment (CK-DC-01).

## 4. Handling unknowns

The model computes:

- **floor** = grade with every `unknown` treated as `fail`
- **ceiling** = grade with every `unknown` treated as `pass`

| Situation | State | What is shown |
|---|---|---|
| No control answered | `not-assessed` | "—" and the full range C–A+. No grade. |
| floor = ceiling | `determined` | The grade. (Known failures already settle it, e.g. a forbidden-zone failure gives C regardless of unknowns.) |
| floor ≠ ceiling | `provisional` | "?" and the range. No grade is stated until the controls that could change it are assessed. |

Consequences: A+ is shown only when all 32 controls are `pass`. An unassessed organization ("—") is never presented as a failed one ("C").

## 5. Gap analysis

- **Failed controls** are ordered: forbidden-zone first, then critical → high → medium, then protocol layer order, then ID. The first three are the **primary unresolved risks**.
- **Unassessed controls** are ordered the same way under "verify next".
- **Next action**: remediation text of the first failed control; if none failed, the evidence to collect for the first unassessed control; otherwise "re-assess on a cadence".

## 6. Rationale and judgment calls

- **Why no weights.** Weighted percentages let many low-severity passes offset a critical failure — the defect in v1.0. Gates express the property that matters: some failures are disqualifying no matter what else is true. Weights would also need empirical calibration that does not exist.
- **Why forbidden zones cap at C.** They are the protocol's "no exception" rules; each corresponds to a direct path from an agent to production credentials, unrelated repositories, or production itself.
- **Why "more than half of critical" for C.** A majority of the critical boundary missing means the protocol's boundary is mostly undefined. The threshold is a Codokey judgment, not derived from data. It is listed for external review.
- **Why A+ needs every control.** A top grade must not coexist with any known gap; otherwise it is easy to misread.
- **Severity assignments** are Codokey judgments carried over from v1.0 and have not been externally reviewed.

## 7. Breaking changes from v1.0

| v1.0 behavior | v2.0.0 behavior |
|---|---|
| Grade from % of ticked checks (C 0–39, B 40–69, A 70–84, A+ 85–100) | Grade from gates; no percentage thresholds |
| A+ possible with up to 4 checks — including critical ones — unticked | A+ only with all 32 implemented |
| Untouched scorecard displayed "C — Ungoverned" | Displays "Not assessed" |
| Unticked = not done (no distinction from not assessed) | Three explicit states |
| Generic "primary gap" text per grade band | Gap list computed from the actual failed and unassessed controls |
| Clickable `div`s (not keyboard operable) | Native radio groups in fieldsets; keyboard and screen-reader operable |
| "Codokey Ready" | "Codokey Aligned" (avoids implying readiness for anything beyond this self-assessment) |

**v1.0 grades are not comparable with v2.0.0 grades.**

Reworded controls (intent preserved unless noted):

| Control | v1.0 check | Change |
|---|---|---|
| CK-OR-02 | #2 "Human review is explicitly required for all AI-generated merges" | **Replaced**: duplicated #17 (now CK-RB-01). Now: each agent acts under a distinct, attributable identity — a prerequisite for review and audit that v1.0 lacked. |
| CK-OR-03 | #3 | Broadened to state the disclosure and review obligation (absorbs the policy part of old #2). |
| CK-KE-02 | #6 "Pre-commit hooks block secrets" | Prefers server-side push protection; client hooks can be skipped by the committer. |
| CK-KE-03 | #7 | Requires a technical boundary, because vendor documentation states tool-level exclusions do not cover all access paths. |
| CK-RB-01 | #17 | Approver must be independent of the agent **and** the requester; approval applies to the latest push. |
| CK-AM-02 | #28 "immutable" | "Protected from modification or deletion by agents" — states the testable property. |

## 8. Export format

`exportAssessment()` produces JSON with `$schema` (the published schema URL `https://codokey.com/reference/schemas/scorecard-assessment-2.0.0.schema.json`, generated from the model and tested against real exports), `model`, `modelVersion`, `protocolVersion`, `generatedAt`, `disclaimer`, `summary` (state, grade, floor, ceiling, counts, gates, primaryRisks) and `controls[]` (id, layer, severity, forbiddenZone, title, status, evidenceNote). Exports are created in the browser and saved by the user; nothing is transmitted.

## 9. Limitations

- Reflects the assessor's answers; cannot detect inaccurate answers.
- Covers 32 controls; says nothing about other security properties.
- Platform features referenced in evidence expectations vary by vendor and plan.

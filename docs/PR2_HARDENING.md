# PR #2 Pre-Merge Hardening — Defect Record

**Date:** 2026-11-12 · **Scope:** focused review of `tools/codokey-check.mjs`, scorecard export, reproduction instructions. No new pages or content areas.

Each defect has a regression test. "Before" means the test was run against the PR #2 head prior to this change (`c52ce54`). Result: **29 of 36** adversarial tests failed; the other 7 already passed and remain as guards. "After" means the fixed code, where all pass.

## Validator (`tools/codokey-check.mjs` 1.0.0 → 1.1.0 → 1.1.1)

| ID | Defect (confirmed) | Correction | Test(s) in `tests/adversarial.test.mjs` |
|---|---|---|---|
| V-B1 | B4 accepted a **negative or zero** token lifetime as "bounded". (NaN, Infinity, string, null and boolean already failed and are kept as guards) | Lifetime must be a positive finite number ≤ task maximum | `V-B1 …` (7 cases) |
| V-B2 | An invalid task `maxTokenLifetimeHours` (0, negative, string, Infinity) silently fell back to 24 h or produced nonsense | Invalid task maximum is an input error (exit 2) | `V-B2 …` (4 cases) |
| V-B3 | An unknown permission level (e.g. `"maintain"`, or inherited keys like `"toString"`) was treated as level 0, so it **passed** B2 | Unknown levels count as excess (fail closed); `Object.hasOwn` lookup | `V-B3`, `V-B3b` |
| V-B4 | A non-list repository scope (e.g. `"example-org/*"`) crashed the validator | Non-list scope and wildcards fail B1 | `V-B4` |
| V-C1 | **Duplicate approvals by one reviewer satisfied `requiredApprovals: 2`** | Approvals are counted once per distinct reviewer | `V-C1` |
| V-C1b | Identity comparison was case-sensitive: requester "Alice" approving as "Alice" vs "alice" was counted | Case-insensitive, trimmed identity comparison | `V-C1b` |
| V-C1c | `name[bot]` identities counted as human approvers | Non-human detection covers `app:`/`bot:`/`ci:`/`svc:`/`service:` prefixes and `[bot]` suffix | `V-C1c` |
| V-C2 | **`deployAllowed` could be true while C1, C2, C3 or C6 failed** (e.g. secrets not scoped, admin bypass) | `deployAllowed` = deployment requested AND every check C1–C7 passes; `mergeAllowed` = C1–C4 | `V-C2`, `V-C2b` |
| V-C3 | A non-human or agent identity listed as a **required deployment reviewer** passed C5 | C5 rejects ineligible reviewers | `V-C3`, `V-C3b` |
| V-C4 | A deployment triggered by an identity **not allowed to deploy** passed C7; duplicate deployment approvals were counted | C7 requires an allowed human trigger and distinct eligible approvers ≥ environment requirement | `V-C4`, `V-C4b` |
| V-C5 | `requiredApprovals: "1"` (string) passed C1; an **undeclared** bypass list or self-review flag was treated as safe | Type-checked positive integers; missing safeguards fail closed | `V-C5`, `V-C5b` |
| V-C6 | Inconsistent configuration was not detected: unknown `deployTo` crashed with a TypeError; a sole reviewer who is also the sole deployer (unapprovable with self-review prevented) passed | Unknown environment → input error (exit 2); "starved" deployers fail C5 | `V-C6`, `V-C6b`, `V-C6c` |
| V-C7 | Results did not distinguish **recorded configuration from verified enforcement** | Every check carries `basis: declared-configuration` or `recorded-history`; results carry `enforcementVerified: false`; CLI prints the basis | `V-C7` |
| V-D1 | **D4 inferred independence from the source string**: any label other than `agent-self-report` passed | D4 requires a separate provenance manifest (`--sources`); each source must be declared, tamper-protected, and not writable by an acting agent. Without a manifest D4 fails | `V-D1`, `V-D1b`, `V-D1c` |
| V-D2 | `actor: {}` and unparseable timestamps passed the required-field check | Actor type/id and RFC 3339 timestamps validated | `V-D2`, `V-D2b` |
| V-A1 | Case A accepted `enforcement: "not-in-workspace"` while secret-bearing files were present in the workspace (a self-contradicting declaration) | A2 accepts "not-in-workspace" only when no secret-bearing file is found | `V-A1` (second pass, 2026-11-13) |
| V-D1d | A provenance manifest declaring a source writable by anyone (`"*"`, `any`, `all`, …) passed D4 | Open-write sources fail D4 | `V-D1d` (second pass, 2026-11-13) |
| V-D3 | Q8 accepted a deployment approval for a **different revision** than the one deployed | Approval must match the deployed revision | `V-D3` |

The declared-configuration limitation is unchanged and is now stated in every result. The validator reads files; it does not connect to any platform, and a PASS is not live security verification.

## Scorecard export

| ID | Defect | Correction | Test(s) |
|---|---|---|---|
| S-1 | The export's `schema` field pointed to `https://codokey.com/reference/scorecard-assessment.schema.json`, **which did not exist** | Versioned JSON Schema (2020-12), generated from the model, at `reference/schemas/scorecard-assessment-2.0.0.schema.json`. The export field is now `$schema` with that URL | `tests/export-schema.test.mjs` S-1…S-5; the UI test validates the downloaded file against the schema served by the site; CI cross-checks with Ajv in strict mode (`tests/ajv-crosscheck.mjs`) |

## Reproduction

| ID | Defect | Correction | Test |
|---|---|---|---|
| R-1 | `review/README.md` told reviewers to run `git clone <repository> && cd <repository>`, which cannot be executed | Real URL `https://github.com/Sohadot/Codokey.git` and directory | `tests/docs-commands.test.mjs`: no placeholders; clone URL matches the git remote. Fails on the old file (verified) |
| R-2 | No check that documented commands run as written | Every `node tools/codokey-check.mjs …` command in README files and on the reference-cases and review pages is executed and its exit code compared with the documented "# expect"; other documented scripts must exist | same |
| R-3 | Test counts hard-coded in README/SCORING went stale | Counts removed | — |

## Not changed
- No pages, layers, controls, grades or severity assignments were added or changed.
- Scorecard model stays 2.0.0. Its grading is unchanged; the export URL fix is a correction to an unreleased version.

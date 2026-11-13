# AI-Generated Pull Request — Review Checklist

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Purpose:** Give the approving human a short, specific list for pull requests produced wholly or partly by an agent. Supplements, does not replace, normal code review.
**Scorecard controls:** CK-RB-01, CK-RB-02, CK-RB-03, CK-OR-01

## Before reviewing code

- [ ] I am not the person who asked the agent to make this change, and I am not an AI reviewer. (If I am, hand off.)
- [ ] The PR identifies the agent and the delegating human (label, trailer, or description).
- [ ] I am reviewing the **latest** pushed revision.

## Authority changes (review these first)

- [ ] Changes to CI workflows, build scripts, IaC, deployment manifests, or dependency manifests are listed and routed to their owners.
- [ ] No new or broadened token permissions, secrets references, environment names, or deployment targets — or each is justified.
- [ ] No new network calls, telemetry endpoints, or package sources without explanation.

## Secrets

- [ ] No credential-like literal (keys, tokens, connection strings) in code, tests, fixtures, or docs.
- [ ] No test or example "temporarily" disables auth, TLS verification, or secret scanning.

## Correctness signals common in generated changes

- [ ] Tests exercise the behavior changed, not only the new code paths written alongside it.
- [ ] Removed or weakened tests and assertions are justified.
- [ ] APIs, flags, and packages referenced actually exist at the pinned versions.
- [ ] The change does what the issue asked and nothing unrelated (scope creep in large diffs).

## Decision

Approve only if every applicable box is checked or the exception is written in the review.

## Limitations

The "correctness signals" are practitioner heuristics compiled by Codokey, not findings from a cited study.

# Codokey Protocol

**Document:** Codokey Protocol  
**Version:** 1.1  
**Date:** 2026-11-12 (v1.0: 2026-06-01)  
**Status:** Reference Model  
**Category:** AI Code Access Governance

Vendor-agnostic reference model. Applies to Copilot, Cursor, Claude Code, and any agent that will exist tomorrow.

When AI can write, modify, and deploy code — the most valuable layer is no longer the code alone. It is the key that governs what the code can access, expose, change, and release.

---

## Layer 01 — Code Origin

**Tag:** Provenance Layer

Who authored this code? Human, AI, or hybrid authorship each carries a different governance weight. The answer determines the review obligation before merge.

**Governance questions:**
- Was this written by a human, an AI agent, or a hybrid workflow?
- Is AI authorship documented in the commit or PR metadata?
- Does policy require human review for AI-generated code?

---

## Layer 02 — Key Exposure

**Tag:** Secrets Layer

Does this code touch secrets, tokens, credentials, or signing keys? Every path to a secret is a governance decision. AI agents reading a repository encounter secrets in comments, env files, test fixtures, and configuration.

**Secret classes:** API keys, access tokens, SSH keys, signing keys, environment variables, cloud credentials, database credentials, Git tokens / deploy keys.

**Governance questions:**
- Does the code read or reference environment variables?
- Are API keys, access tokens, or SSH keys in scope?
- Could the AI agent see secrets during its session?

---

## Layer 03 — Agent Authority

**Tag:** Permission Layer

What is the AI agent permitted to read, change, or execute? Undefined authority is a security gap. Every agent must have an explicit, documented scope before execution.

**Agent classes:** suggestion agent, code review agent, task agent, MCP-connected agent, autonomous agent.

**Governance questions:**
- What repository scope does the agent have?
- Can the agent push to branches or create PRs?
- Is the agent connected to external systems via MCP?

---

## Layer 04 — Review Boundary

**Tag:** Human Gate Layer

Where must a human intervene before code proceeds? Without explicit gates, AI agents create invisible paths from generation to merge. The review boundary is the minimum accountability structure.

**Governance questions:**
- Is human review required before merging AI-generated PRs?
- Is there a mandatory review step for code touching secrets?
- Are review requirements documented in governance policy?

---

## Layer 05 — Deployment Control

**Tag:** Authority Layer

Can this code reach production? Who holds the deployment key, and under what conditions? Automation and autonomy are different things. No agent deploys to production without a human authorization gate.

**Governance questions:**
- Is automated deployment gated by secret scanning?
- Can an AI-generated change deploy without human approval?
- Are production credentials separated from development environments?

---

## Layer 06 — Audit Memory

**Tag:** Accountability Layer

Can you reconstruct what happened, who authorized it, and what was exposed? Audit trails are governance proof. A breach without audit memory is a non-traceable breach — the worst outcome for organizational accountability.

**Governance questions:**
- Are AI agent actions logged with timestamps and scope?
- Can you trace which agent accessed which repository and when?
- Is there a record of what secrets were in scope during agent sessions?

---

## Forbidden Zones

No agent class, no exception, no override:

- Production secrets accessible to agent
- Organization-wide scope for single-repo task
- Unsupervised production deployment

---

## Scorecard Alignment

The Governance Scorecard (model 2.0.0, see `SCORING.md`) maps 32 controls across these six layers:
- 01 code-origin.sh — 4 controls (CK-OR-01…04)
- 02 key-exposure.sh — 6 controls (CK-KE-01…06)
- 03 agent-authority.sh — 6 controls (CK-AA-01…06)
- 04 review-boundary.sh — 5 controls (CK-RB-01…05)
- 05 deployment-control.sh — 5 controls (CK-DC-01…05)
- 06 audit-memory.sh — 6 controls (CK-AM-01…06)

Forbidden-zone controls: CK-KE-06 and CK-DC-02 (FZ-1), CK-AA-05 (FZ-2), CK-DC-01 (FZ-3). A failure in any of them caps the grade at C.

Grades: C (Ungoverned) · B (Partially Governed) · A (Controlled With Gaps) · A+ (Codokey Aligned — every control implemented). Results with unassessed controls are reported as provisional ranges, not grades.

Self-assessment reference model — not formal certification.

---

## Layer Specifications (added in v1.1)

Each layer has a reference specification at `https://codokey.com/protocol/<layer>/` (generated from `tools/content/layers.mjs` and the scorecard model): objective, governed boundary, failure scenarios, applicable agent capabilities, platform-neutral principles, required controls and acceptable evidence, labelled implementation examples, limitations, remediation and evidence-register references.

## Changes in v1.1

- Added the six layer specifications above. The six layers, their names, the forbidden zones and the governance questions are unchanged.
- Scorecard alignment updated to model 2.0.0 (gates instead of percentages; "Codokey Ready" renamed "Codokey Aligned").

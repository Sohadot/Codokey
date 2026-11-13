# Agent Access Policy — Template

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Purpose:** Declare, before an agent runs, exactly what it may reach. One entry per agent integration.
**Scorecard controls:** CK-AA-01, CK-AA-02, CK-AA-03, CK-AA-04, CK-AA-05, CK-AA-06, CK-OR-02
**Machine-readable form:** [`agent-access-policy.example.json`](agent-access-policy.example.json)

## How to use

1. Copy the entry below for each agent (IDE agent, cloud task agent, review bot, MCP-connected assistant).
2. Fill every field. "Unknown" is an acceptable answer only while you investigate — record it, do not guess.
3. Compare the **declared** scope with the **granted** credentials (export from your platform). Any difference is a finding. Reference Case B (`node tools/codokey-check.mjs excess-authority`) automates that comparison for declared JSON.
4. Re-review on every change of agent product, permissions, or repositories, and at least on the cadence in CK-AA-04.

## Entry

| Field | Value | Notes |
|---|---|---|
| Agent name | | Product and integration (e.g. "cloud task agent on web repo") |
| Agent class | suggestion / review / task / MCP-connected / autonomous | See /agent-permissions/ |
| Identity | | Dedicated app/bot/service identity. **Not** a personal token (CK-OR-02) |
| Accountable owner | | Team or person who approves this policy |
| Delegating humans | | Who may instruct the agent |
| Repositories | | Explicit list. "All repositories" is a forbidden zone (FZ-2) |
| Branches it may push | | e.g. `agent/*` only |
| Repository permissions | | Per permission: none / read / write. Justify every write |
| Tools / MCP servers | | Name, purpose, credential, scopes. Empty list is valid |
| Command execution | none / sandboxed / unrestricted | Unrestricted execution makes file-level exclusions unreliable |
| Network egress | | Allowed hosts, or "none" |
| Secret-bearing paths excluded | | And the enforcement boundary (tool / OS sandbox / not in workspace) |
| Token lifetime | | Hours. Unbounded is a finding |
| Forbidden zones acknowledged | production secrets · org-wide scope · production deploy | Each with the control that enforces it (CK-AA-06) |
| Approved by / date | | |
| Next review | | |

## Limitations

- A policy declares intent; it does not enforce anything. Each line must map to a platform setting you can export.
- Effective permissions can exceed the token's own grant through roles, team membership, or the host the agent runs on.
- Vendor-neutral by design: adapt permission names to your platform.

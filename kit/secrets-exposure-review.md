# Secrets-Exposure Review — Template

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Purpose:** Structured review after a secret may have been in an agent's reach (found in a workspace, logged, committed, or pasted into a prompt). Prioritizes containment before analysis.
**Scorecard controls:** CK-AM-04, CK-KE-03, CK-KE-05, CK-AM-01

## 1. Contain first (do not wait for the analysis)

- [ ] Revoke the credential at its issuer. Time: ____
- [ ] Issue a replacement and update consumers. Time: ____
- [ ] If committed: rotate **before** rewriting history; history rewriting does not un-expose a pushed secret.

## 2. Describe the secret

| Field | Value |
|---|---|
| Secret class | API key / access token / SSH key / signing key / env variable / cloud credential / database credential / Git token |
| Environment | production / staging / development |
| What it authorizes | |
| Where it was found | path, log, prompt, commit |
| First possible exposure time | |

## 3. Determine agent exposure (use audit records — see Audit Evidence Specification)

| Question | Answer | Source record |
|---|---|---|
| Which agent sessions had the path in readable scope? | | |
| Did any session read it (or was a read denied)? | | |
| Did any session run commands that could read it indirectly? | | |
| Was the value sent to an external service (model provider, tool, MCP server)? | | |
| Which humans delegated those sessions? | | |
| Was the credential used after first possible exposure? (issuer logs) | | |

If a question cannot be answered, write **"Unknown — record missing"** and add a finding against CK-AM-01. Do not assume "not exposed".

## 4. Root cause and follow-up

- Why was the secret within reach? (in workspace / in agent environment / in history / in tool output)
- Which scorecard control failed? Record control ID, owner, due date.

## Limitations

This template guides an internal review. It is not legal or regulatory incident-notification guidance.

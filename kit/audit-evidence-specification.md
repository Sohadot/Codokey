# Audit Evidence Specification

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Status:** Original Codokey proposal (claim class 3). Field set derived from NIST SP 800-53 Rev. 5 AU-3 plus agent-specific additions. Not an external standard.
**Purpose:** Define the minimum records needed to reconstruct an AI agent session after the fact.
**Scorecard controls:** CK-AM-01, CK-AM-02, CK-AM-03, CK-OR-02
**Validated by:** Reference Case D (`node tools/codokey-check.mjs audit-reconstruct --events <file.jsonl>`)

## Reconstruction questions

A conforming record set answers, for every agent session:

| ID | Question |
|---|---|
| Q1 | Which agent identity acted? |
| Q2 | Which human delegated the session? |
| Q3 | When did the session start and end? |
| Q4 | What scope (repositories, permissions, tools) was granted at session start? |
| Q5 | Which secret-bearing paths were readable during the session? |
| Q6 | Which changes did the agent produce? |
| Q7 | Which human approved the change, on which revision? |
| Q8 | Was it deployed, and who authorized the deployment of that same revision? |

## Event fields (one JSON object per line)

| Field | Required | AU-3 element | Description |
|---|---|---|---|
| `event_id` | yes | — | Unique per event |
| `session_id` | yes | — | Correlates platform, agent, and approval records (agent-specific) |
| `timestamp` | yes | b. when | RFC 3339 UTC |
| `event_type` | yes | a. what | See types below |
| `actor` | yes | d./f. source, identity | `{ "type": "agent" \| "human" \| "pipeline", "id": "…" }` |
| `on_behalf_of` | for agent actors | f. identity | Delegating human (agent-specific) |
| `target` | recommended | c. where | Repository, ref, path, PR, or environment |
| `revision` | for approvals, pushes, deployments | — | Commit/revision the event applies to |
| `outcome` | yes | e. outcome | `success` \| `denied` \| `failure` |
| `source` | yes | — | Label of the system that produced the record. The label alone proves nothing; see *Provenance manifest* |
| `scope` | on `session.started` | — | `{ repositories, permissions, tools, readable_secret_paths }` |

### Event types

`session.started`, `session.ended`, `file.read`, `command.executed`, `tool.called`, `change.pushed`, `pr.opened`, `review.approved`, `deployment.approved`, `deployment.completed`.

### Frequently unavailable

`scope.readable_secret_paths` is rarely exported by agent products today. Where unavailable, derive it from the agent's configured deny rules and the workspace contents at session start, and record how it was derived.

## Provenance manifest

Independence of audit evidence cannot be inferred from a source name. Supply, with the export, a manifest declaring each source:

```json
{ "sources": [ { "id": "platform-audit-log", "writableBy": ["platform"], "tamperProtection": "retention-lock" } ] }
```

`tamperProtection` is one of `append-only`, `retention-lock`, `write-once`. A source passes Reference Case D check D4 only if it is declared, tamper-protected, and not writable by any agent identity that acts in the events. The manifest is a declaration; confirm it against the storage system's actual access policy.

## Protection and retention

- Records must be written to a destination the agent identity cannot modify or delete (CK-AM-02; NIST SP 800-53 AU-9).
- Retain for at least your documented requirement; export platform logs whose native retention is shorter (CK-AM-03).

## Limitations

This specification checks that records exist and link together. It cannot establish that their contents are true.

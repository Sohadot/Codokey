# Codokey Category Definition

**Document:** Codokey Category Definition  
**Version:** 1.1  
**Date:** 2026-06-01  
**Status:** Canonical Reference  
**Category:** AI Code Access Governance

---

## Category Name

**AI Code Access Governance**

## Canonical Definition

AI Code Access Governance is the discipline of governing what AI agents, AI-touched code, and agentic development workflows can **access**, **expose**, **change**, and **move toward production**.

It is not code review. It is not application security. It is not secrets management in isolation. It is the definitional layer that sits at the intersection of all three — governing the **access boundary** where machine authority meets organizational accountability.

## Foundational Thesis

AI coding did not merely change who writes software. **It changed where authority begins.**

Before AI agents, authority was anchored in human authorship and human review. After AI agents, authority is distributed across agent capabilities, repository scope, credential exposure, deployment paths, and audit reconstruction — often before any human observes the change.

Codokey is the **canonical reference model** for this category.

---

## Why This Category Exists

Traditional software governance assumed:

1. A human wrote the code
2. A human reviewer could assess logic and intent
3. Secrets were protected by storage-layer controls
4. Deployment required explicit human authorization
5. Audit trails followed human-initiated actions

AI agentic development breaks each assumption simultaneously. An agent can read across repositories, encounter credentials in IDE context, modify deployment workflows, and open pull requests — all before governance policy is invoked.

Organizations that apply human-developer governance models to agent authority surfaces create **undefined authority** — not because they lack security tools, but because they lack category language.

---

## Category Layers

AI Code Access Governance is structured across seven definitional layers. Codokey maps these to its reference infrastructure:

### 01 — AI Agent Capabilities

What can the agent do? Suggestion, review, task execution, MCP-connected tool use, autonomous pipeline operation. Each capability class carries distinct governance weight.

**Codokey reference:** [Agent Permissions](/agent-permissions/) · Protocol Layer 03

### 02 — Codebase Access

What repositories, branches, files, and contexts can the agent read or modify? Repository trust boundaries must be defined before agent execution — not after incident discovery.

**Codokey reference:** [Codokey Protocol v1.0](/protocol/) · Layer 01 Code Origin

### 03 — Secrets Boundary

Which credential classes must never enter agent read context? API keys, tokens, SSH keys, signing keys, environment variables, cloud credentials, database credentials, Git tokens.

**Codokey reference:** [Secrets Boundary](/secrets-boundary/) · Protocol Layer 02 Key Exposure

### 04 — Agent Authority

What is the total scope of agent permission — read, write, execute, external system access? Undefined authority is a security gap. Minimum privilege is the default posture.

**Codokey reference:** [Agent Permissions](/agent-permissions/) · [Charter](/charter/) Principle 03

### 05 — Deployment Authority

Can AI-touched code reach production? Under what human gates? Automation and autonomy are not equivalent. Production authority must be explicitly bounded.

**Codokey reference:** [Codokey Protocol v1.0](/protocol/) · Layer 05 Deployment Control

### 06 — Audit Memory

Can agent actions be reconstructed — who, what, when, what was in scope? Breach without audit memory is non-traceable breach.

**Codokey reference:** [Codokey Protocol v1.0](/protocol/) · Layer 06 Audit Memory

### 07 — Organizational Accountability

Who owns the governance model? Who reviews governance debt? Who authorizes agent scope expansion? Category definition without organizational accountability is documentation without enforcement.

**Codokey reference:** [Codokey Charter](/charter/) · [Governance Scorecard](/governance-scorecard/)

---

## Category Vocabulary

| Term | Definition |
|------|------------|
| AI Code Access Governance | The governing discipline — this category |
| code-key boundary | Separation between code access and credential access |
| agent authority surface | Total scope of agent read, write, execute, deploy |
| secrets boundary | Exclusion zone for credential classes in agent context |
| governance debt | Accumulated risk from ungoverned agent sessions |
| repository trust boundaries | Scoped limits on what repositories an agent may access |
| production authority | Human-gated path from code change to deployment |
| audit memory | Immutable record of agent actions and session scope |

---

## Codokey as Category Authority

Codokey.com is not a site *about* AI Code Access Governance. It **is** the category-defining reference infrastructure:

| Asset | Role in category |
|-------|------------------|
| Category Definition | Names and structures the discipline |
| Charter v1.0 | Founding doctrine and principles |
| Protocol v1.0 | Six-layer operational reference model |
| Governance Scorecard v1.0 | 32-check self-assessment framework |
| Reference pages | Secrets, agents, cost analysis, buyer logic |
| Narrative v1.1 | Structural shift documentation |

Organizations, platforms, and compliance teams that cite Codokey cite the category. That is the strategic asset.

---

## What This Category Is Not

- Not generic AI coding best practices
- Not traditional AppSec or DevSecOps alone
- Not a certification or compliance framework
- Not vendor-specific tooling documentation
- Not a blog or news category

---

**Canonical URL:** https://codokey.com/category/  
**Related:** `CODOKEY_NARRATIVE.md` · `ASSET_THESIS.md` · `CODOKEY_CHARTER.md`

# Repository Access-Boundary Checklist

**Codokey Reference Kit · v1.0.0 · 2026-11-12**
**Purpose:** Verify, per repository, that agent access stops where it should. Use before enabling an agent on a repository and after any permission change.
**Scorecard controls:** CK-AA-02, CK-AA-05, CK-KE-01, CK-KE-02, CK-KE-03, CK-RB-01, CK-RB-04

Mark each item **Yes (evidence attached)**, **No**, or **Not assessed**. "Not assessed" is not "Yes".

| # | Check | Evidence to attach |
|---|---|---|
| 1 | Every agent identity with access to this repository is listed in an agent access policy | Collaborator / installation export |
| 2 | No agent identity has admin or "bypass protections" permission | Role export |
| 3 | Agent installations are scoped to selected repositories, not all | Installation settings screenshot or API output |
| 4 | Agents can push only to designated branches (e.g. `agent/*`) | Ruleset / branch protection export |
| 5 | Default branch requires independent approval of the latest push | Branch protection export |
| 6 | Protection applies to administrators | Same export |
| 7 | Secret scanning and push protection are enabled | Security settings |
| 8 | No secret-bearing file is committed (full-history scan run within the defined interval) | Dated scan report |
| 9 | Local secret files used by developers are excluded from agent read scope at a boundary covering subprocesses | Agent config + sandbox setting + denied-read test |
| 10 | CODEOWNERS covers CI workflows, IaC, deployment manifests, and secret-handling code | CODEOWNERS file |
| 11 | Workflow tokens declare minimal `permissions` | Workflow files |
| 12 | Agent activity on this repository appears in the audit log under the agent identity | Sample audit events |

## Limitations

Platform settings can be inherited from organization or enterprise policy; record the effective setting, not only the repository-level one.

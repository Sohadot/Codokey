// Reference case metadata — source for cases/*/README.md and /reference-cases/.
export const CASES = [
  {
    dir: 'a-secrets-access', letter: 'A', command: 'secrets-access', slug: 'agent-access-to-secrets',
    title: 'Agent access to secrets',
    thesis: 'Repository access is not the same thing as credential access. Whether an agent can read a secret depends on where the secret lives and on the boundary that enforces exclusion — not on whether the agent was "given the repo".',
    scenario: 'A task agent is asked to fix a bug in a small service. Its workspace is a checkout of the repository. The checkout contains a local .env file, a placeholder key file, and an INI file with a hardcoded token — the kinds of files that commonly sit beside code. The agent can run commands (tests, scripts).',
    assumptions: ['All credentials in the fixture are fake strings.', 'The agent configuration is declared in JSON; the validator reads the declaration, it does not observe a running agent.', '"enforcement" records the strongest boundary covering the deny rules: "tool" (agent tool-level rules only), "os-sandbox" (OS/sandbox isolation covering subprocesses), or "not-in-workspace" (secrets absent from the workspace).'],
    inputs: ['repo/ — synthetic repository with .env, config/deploy_key.pem, config/settings.ini, and a harmless .env.example', 'agent-config.governed.json — deny rules cover every secret-bearing file; os-sandbox enforcement; no production variables', 'agent-config.ungoverned.json — only .env denied; tool-level enforcement with command execution; a PROD_ variable in the agent environment'],
    layers: ['KE', 'AA'],
    expectations: ['Every secret-bearing file is outside the agent\'s readable set (CK-KE-03).', 'The exclusion holds for subprocesses, not only the agent\'s file tool (CK-KE-03).', 'No production credential is in the agent environment (CK-KE-06, forbidden zone FZ-1).'],
    passFail: [['A1', 'PASS if every file identified as secret-bearing matches a deny rule.'], ['A2', 'PASS if enforcement is os-sandbox or not-in-workspace; tool-level rules alone FAIL when the agent can run commands.'], ['A3', 'PASS if no environment variable name contains PROD.']],
    evidence: 'Agent configuration export (deny rules, sandbox setting), list of secret-bearing paths from a scan, a recorded denied read attempt, and the agent environment variable names (names only).',
    expected: 'governed → PASS. ungoverned → FAIL on A1 (deploy_key.pem and settings.ini readable), A2 (tool-level only), A3 (production variable present).',
    limitations: ['Secret detection uses filename patterns and a simple assignment pattern; it will miss secrets in other forms and is not a substitute for a secret scanner.', 'The PROD naming heuristic is illustrative; real environments need an explicit classification of variables.', 'A PASS does not prove the agent product honors its declared configuration.'],
    refs: ['EV-CLAUDE-PERMISSIONS', 'EV-GH-CONTENT-EXCLUSION', 'EV-OWASP-LLM02', 'EV-SSDF-PO.5.1']
  },
  {
    dir: 'b-excess-authority', letter: 'B', command: 'excess-authority', slug: 'excessive-agent-authority',
    title: 'Excessive agent authority',
    thesis: 'An agent\'s authority should be derived from its task. Comparing what the task requires with what the credential grants turns "least privilege" from a slogan into a diff.',
    scenario: 'A task agent must add pagination to one API and open a pull request in one repository. Two alternative grants are compared: a least-privilege grant and a typical convenience grant (all repositories, administration and workflow write, secrets read, two extra MCP tools, no expiry).',
    assumptions: ['Permission names follow GitHub fine-grained permission naming; the mapping from task actions to permissions is in tools/codokey-check.mjs and should be adapted per platform.', 'Levels are ordered none < read < write < admin. Any other level value is treated as excess (fail closed).', 'Repository names compare case-insensitively; wildcards or a non-list repository scope count as excess.', 'Token lifetimes must be positive finite numbers of hours; an invalid task maximum is an input error (exit 2), not a silent default.'],
    inputs: ['task.json — repositories, actions, declared tools, maximum token lifetime', 'grant.least-privilege.json', 'grant.excessive.json'],
    layers: ['AA', 'OR'],
    expectations: ['Repository access equals the task\'s repositories (CK-AA-05, forbidden zone FZ-2).', 'No permission exceeds what the task actions need (CK-AA-02).', 'Only declared tools are connected (CK-AA-03).', 'The credential expires within the task maximum (CK-AA-04).', 'The grant is sufficient, so the agent is not pushed toward workarounds (CK-AA-01).'],
    passFail: [['B1', 'FAIL if repositories is "all" or lists any repository not in the task.'], ['B2', 'FAIL if any granted permission level exceeds the required level.'], ['B3', 'FAIL if any tool is not declared by the task.'], ['B4', 'FAIL if lifetime is missing, not a positive finite number, or above the task maximum.'], ['B5', 'FAIL if a required permission is missing.']],
    evidence: 'App installation or token configuration export (repositories, permissions, expiry) and the MCP/tool configuration for the agent, compared with the agent access policy entry.',
    expected: 'least-privilege → PASS. excessive → FAIL on B1–B4 (B5 passes: the grant is more than sufficient).',
    limitations: ['Declared grants only; effective permissions can be wider through team membership, inherited roles, or command execution on a privileged host.', 'The action-to-permission table is a simplification and not an authoritative platform mapping.'],
    refs: ['EV-OWASP-LLM06', 'EV-SP80053-AC-6', 'EV-SSDF-PS.1.1', 'EV-GH-FG-PAT', 'EV-MCP-SECURITY']
  },
  {
    dir: 'c-production-path', letter: 'C', command: 'production-path', slug: 'ai-generated-code-to-production',
    title: 'AI-generated code approaching production',
    thesis: 'A review requirement is only meaningful if the approver is independent of the agent and of the person who asked for the change, if approval applies to the final revision, and if deployment is a separate human decision.',
    scenario: 'An agent opens a pull request that changes application code and a deployment workflow. The case evaluates two policies (governed and ungoverned) and two histories of the same kind of change (independent approval vs. requester self-approval with a stale owner approval and an AI review-assistant approval).',
    assumptions: ['Identities prefixed app:, bot:, ci:, svc: or service:, or ending in [bot], are non-human and never count as approvers or eligible reviewers.', 'Approvals count once per distinct human (case-insensitive) and only on headRevision; the agent author and the requester never count.', 'Missing safeguard fields fail closed (e.g. an undeclared bypass list is not treated as empty).', 'Policy settings are modeled on GitHub branch protection and environments; GitLab protected branches and deployment approvals provide equivalents.', 'Policy checks read DECLARED settings and approval checks read RECORDED history. Neither proves the platform enforces them; results carry enforcementVerified: false.'],
    inputs: ['policy.governed.json / policy.ungoverned.json — branch protection and production environment settings', 'change.independent-approval.json — approval from a code owner on the latest revision; deployment approved by a reviewer other than the trigger', 'change.self-approved.json — only the requester, an AI reviewer, and a stale approval'],
    layers: ['RB', 'DC', 'OR'],
    expectations: ['Required approval excludes agent and requester and applies to the latest push (CK-RB-01).', 'Protection binds administrators (CK-RB-04).', 'Sensitive paths need code-owner review (CK-RB-02).', 'Production deployment requires an independent human reviewer; agents are not deployers (CK-DC-01, FZ-3).', 'Production secrets are scoped to the protected environment (CK-DC-02).'],
    passFail: [['C1–C3, C5–C6', 'Declared-configuration checks. C5 also fails on non-human or agent reviewers, non-human deployers, or a deployer for whom no other eligible reviewer exists.'], ['C4', 'Recorded-history check: enough DISTINCT independent human approvers on the head revision, including the required code owner.'], ['C7', 'Recorded-history check: the trigger is an allowed human deployer and enough distinct eligible reviewers other than the trigger approved.'], ['decision', 'deployAllowed is true only if a deployment was requested and every check C1–C7 passes; mergeAllowed requires C1–C4.']],
    evidence: 'Exported branch-protection or ruleset configuration, CODEOWNERS, environment protection settings, and the pull-request review and deployment-approval history.',
    expected: 'governed + independent → PASS (merge and deploy allowed). governed + self-approved → FAIL on C4, C7. ungoverned + independent → FAIL on C1, C2, C3, C5, C6, C7 even though one independent approval happened to exist.',
    limitations: ['Models a single protected branch and environment.', 'Does not evaluate review quality — only who approved what.', 'Platform features vary by plan; see evidence register limitations.'],
    refs: ['EV-GH-BRANCH-PROTECTION', 'EV-GH-ENVIRONMENTS', 'EV-GH-COPILOT-AGENT-RISKS', 'EV-GL-DEPLOY-APPROVALS', 'EV-SP80053-AC-5']
  },
  {
    dir: 'd-audit-reconstruct', letter: 'D', command: 'audit-reconstruct', slug: 'audit-reconstruction',
    title: 'Audit reconstruction',
    thesis: 'Logs exist in most organizations; reconstruction often fails anyway because records are not linked by session, omit the delegating human, or never captured what the agent could read.',
    scenario: 'After a suspected exposure, an investigator must answer eight questions about an agent session: who acted, for whom, when, with what scope, with which secret paths readable, what changed, who approved, and who authorized deployment. Two event exports are compared.',
    assumptions: ['Event format follows the Codokey Audit Evidence Specification v1.0 (kit/audit-evidence-specification.md); actor needs a valid type and id, timestamps must be RFC 3339.', 'An event\'s source field is only a label. Independence is judged from a separate provenance manifest (provenance.json) declaring who can write each source and how it is tamper-protected. Without a manifest, D4 fails.', 'The manifest is itself a declaration; the validator cannot verify it.'],
    inputs: ['events.complete.jsonl — eight correlated events from platform audit log and agent session log', 'events.incomplete.jsonl — missing delegation, scope, end event, a session-less approval, and records from an undeclared source', 'provenance.json — declared writers and tamper protection for each record source'],
    layers: ['AM', 'OR', 'KE'],
    expectations: ['Each event has the required fields (CK-AM-01).', 'Each event links to a session (CK-AM-01).', 'Q1–Q8 are answerable for every session (CK-AM-01, CK-OR-02).', 'Records come from sources outside agent write access (CK-AM-02).'],
    passFail: [['D1', 'FAIL if any event lacks a required field, has an actor without valid type/id, or has a non-RFC 3339 timestamp.'], ['D2', 'FAIL if any event lacks session_id.'], ['D3', 'FAIL if any reconstruction question cannot be answered for a session.'], ['D4', 'FAIL if no provenance manifest is supplied, or any record source is undeclared, lacks tamper protection, or is declared writable by an acting agent identity.']],
    evidence: 'An export of one real session\'s records (platform audit log + agent session log), with secret values removed, mapped to the specification fields.',
    expected: 'complete + provenance → PASS. incomplete → FAIL on D1, D2, D3, D4. complete without provenance manifest → FAIL on D4.',
    limitations: ['Checks presence and linkage of fields, not their truthfulness.', 'Many agent products do not currently export "readable_secret_paths"; the specification marks this field as frequently unavailable.'],
    refs: ['EV-SP80053-AU-3', 'EV-SP80053-AU-9', 'EV-SP80053-AC-6-9', 'EV-GH-AUDIT-LOG']
  }
];

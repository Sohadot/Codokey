// Layer reference specifications — Codokey Protocol v1.1.
// Content source for /protocol/<layer>/ pages. Controls, evidence and
// references are pulled from the scorecard model and evidence register at
// build time so the specification and the scorecard cannot drift apart.

export const LAYER_SPECS = {
  OR: {
    question: 'Who — or what — produced this change, and on whose behalf?',
    objective: 'Make every change attributable to the identity that produced it (human, agent, or both) and to the human who delegated the work, so review obligations and audit reconstruction can be applied to the right actor.',
    boundary: 'The boundary between an authenticated identity and the changes recorded under it in version control. It is crossed whenever an agent commits, pushes, or opens a pull request.',
    threats: [
      ['Shared-credential attribution loss', 'An agent runs with a developer\'s personal access token. Its commits appear under the developer\'s name; reviewers apply the obligations for a human-authored change and audit logs cannot separate the two actors.'],
      ['Silent assistance', 'A large AI-assisted change is merged with no marker. Later, an incident review cannot establish which code paths were generated or what review they received.'],
      ['Delegation gap', 'An agent identity is distinct, but nothing records which human asked it to act, so accountability stops at a bot account.']
    ],
    capabilities: 'Applies to task agents, MCP-connected agents, and autonomous agents that write commits or open pull requests. Suggestion-only agents (inline completion accepted by a human) are attributed to the human; record their use through the disclosure policy (CK-OR-03) rather than per-commit identity.',
    principles: [
      'An agent never acts under a credential that also represents a person.',
      'Attribution has two parts: the acting identity and the delegating human.',
      'Disclosure must be machine-readable; free-text mentions in PR descriptions are not queryable evidence.'
    ],
    limitations: [
      'Git author and committer fields are self-asserted. Attribution is reliable only when tied to the authenticated identity that pushed (platform audit events) or to signed commits.',
      'There is no industry-standard trailer for AI involvement; the convention below is an example, not a standard.',
      'Assistance in an editor (accepted suggestions) is generally not detectable after the fact; policy disclosure is the realistic control.'
    ],
    examples: [
      { label: 'Git commit trailers recording agent involvement (example convention — tested with git 2.x)', lang: 'text', code:
`feat(api): add pagination to /orders

AI-Agent: example-task-agent
Delegated-By: alice@example.test
Agent-Session: 7f3c2a`},
      { label: 'Query history by agent trailer (tested)', lang: 'shell', code:
`git log --format='%h %an %(trailers:key=AI-Agent,valueonly,separator=%x2C)'`}
    ],
    remediation: ['Provision a dedicated app/bot identity per agent integration (CK-OR-02).', 'Adopt a commit-trailer or label convention and enforce it in the agent integration (CK-OR-01).', 'Record the delegating human in the trailer or session log (feeds CK-AM-01).', 'Publish the disclosure and review obligation in the SDLC policy (CK-OR-03).']
  },

  KE: {
    question: 'Can the agent read, emit, or move a credential?',
    objective: 'Keep credentials out of the agent\'s readable context and out of the repository, so that repository access does not imply credential access.',
    boundary: 'The code-key boundary: the line between files and tools an agent may read (code) and the material that grants authority elsewhere (keys). Read access to a repository must not include read access to secrets that happen to be stored beside it.',
    threats: [
      ['Working-tree secret read', 'A local .env file sits in the repository directory. An agent with workspace read access includes it in context, or a test script it runs prints it to a log.'],
      ['Agent-introduced hardcoding', 'An agent "fixes" a failing integration test by inlining a credential from an error message or example into source.'],
      ['Exclusion mistaken for isolation', 'A tool-level ignore list hides .env from the agent\'s file tool, but a subprocess the agent launches (a test runner, a script) reads the file anyway.']
    ],
    capabilities: 'Every agent class that can read a workspace. The risk rises sharply for agents that can execute commands, because command execution reaches files indirectly.',
    principles: [
      'Prefer absence over exclusion: secrets injected at runtime from a secret manager are not in the tree to be read.',
      'Where files must exist, enforce exclusion at the boundary that also covers subprocesses (sandbox, OS permissions, separate machine).',
      'Detection (scanning) and prevention (push protection) are separate controls; both are needed.'
    ],
    limitations: [
      'Pattern-based scanners detect known secret formats; custom or low-entropy secrets can pass undetected.',
      'Tool-level deny rules are vendor-specific and, per vendor documentation, may not cover subprocesses or indirect reads.',
      'A secret that was ever readable must be treated as exposed; exclusion added later does not undo prior exposure.'
    ],
    examples: [
      { label: 'Claude Code project settings — deny reads of secret files (example; rule syntax from vendor docs, not executed against a live agent here)', lang: 'json', code:
`{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(*.env)",
      "Read(secrets/**)"
    ]
  }
}`},
      { label: 'Why the example above is not sufficient on its own', lang: 'text', code:
`Vendor documentation states Read deny rules do not apply to arbitrary
subprocesses (for example a Node or Python script that opens the file).
Pair the rule with sandbox / OS-level isolation, or keep the file out
of the workspace entirely.`}
    ],
    remediation: ['Move secrets out of the working tree; inject at runtime (CK-KE-03).', 'Enable server-side push protection (CK-KE-02) and secret scanning (CK-KE-01).', 'Put production secrets in a store no agent identity can read (CK-KE-06).', 'Define lifetimes and rotation per credential class (CK-KE-05).', 'Run Reference Case A against your agent configuration.']
  },

  AA: {
    question: 'What is the agent permitted to read, change, call, and execute — and is that the minimum the task needs?',
    objective: 'Bound each agent\'s authority to the task: specific repositories, specific permissions, specific tools, for a limited time, with authorization enforced by the systems the agent calls rather than by the agent\'s own judgment.',
    boundary: 'The agent authority surface: the union of repository permissions, tool and MCP connections, network reach, and command execution granted to an agent identity.',
    threats: [
      ['Organization-wide token for a one-repository task', 'An agent installed with access to all repositories can read and push to repositories unrelated to its task; a prompt injection in one repository can act on another.'],
      ['Open-ended tools', 'An agent is given a shell and broad network access when it only needs to edit files and open a pull request.'],
      ['Token passthrough', 'An MCP server forwards the client\'s token to a downstream API without validating audience, extending the agent\'s reach beyond the approved scope.']
    ],
    capabilities: 'All agent classes. The required depth of control scales with capability: suggestion (read open file) < review (read + comment) < task (read + branch + PR) < MCP-connected (external tools) < autonomous (multi-step, deployment-adjacent).',
    principles: [
      'Scope is declared before the agent runs and compared with what is actually granted.',
      'Authorization is enforced downstream (permissions, protection rules), never delegated to the model.',
      'Least agency: do not grant autonomy or tools the task does not need.'
    ],
    limitations: [
      'Platform permission models differ; a "read-only" grant on one platform may include metadata or issue access on another.',
      'Command execution makes static scope analysis incomplete: an agent with a shell can reach anything the host can.',
      'Short-lived tokens limit exposure duration, not misuse during their lifetime.'
    ],
    examples: [
      { label: 'GitHub Actions — declare minimum workflow token permissions (example)', lang: 'yaml', code:
`permissions:
  contents: read
  pull-requests: write`},
      { label: 'Agent access policy entry (Reference Kit format, validated by tools/codokey-check.mjs)', lang: 'json', code:
`{
  "agent": "example-task-agent",
  "identity": "app:example-task-agent",
  "owner": "platform-team",
  "repositories": ["example-org/web"],
  "permissions": { "contents": "write", "pull_requests": "write" },
  "tools": [],
  "maxTokenLifetimeHours": 8,
  "forbidden": ["org_wide_scope", "production_secrets", "production_deploy"]
}`}
    ],
    remediation: ['Write an access policy entry per agent (CK-AA-01).', 'Replace "all repositories" installations with explicit lists (CK-AA-05).', 'Diff granted vs. required permissions and remove the excess (CK-AA-02) — Reference Case B automates this for declared grants.', 'Inventory MCP/tool servers and reject token passthrough (CK-AA-03).']
  },

  RB: {
    question: 'Which human must approve before an agent\'s change becomes part of the protected codebase — and can that gate be skipped?',
    objective: 'Ensure agent-generated changes reach protected branches only after approval by a human who is independent of both the agent and the person who requested the change, with stricter routing for security-sensitive paths.',
    boundary: 'The merge boundary between a proposed change (branch or pull request) and a protected branch that downstream builds and deployments trust.',
    threats: [
      ['Requester self-approval', 'A developer asks an agent to write a change and then approves the agent\'s pull request. One person has both requested and approved; the review requirement is satisfied in form only.'],
      ['Administrator bypass', 'Branch protection exists but, by default on some platforms, does not apply to administrators; an admin-scoped automation merges without review.'],
      ['Sensitive path drift', 'An agent edits a CI workflow or deployment manifest inside a large refactor; the general reviewer does not notice the authority change.']
    ],
    capabilities: 'Task, MCP-connected, and autonomous agents that open pull requests or push branches. Code-review agents may assist reviewers but do not count as an approving human.',
    principles: [
      'Approval must come from a human independent of the agent and of the requester.',
      'Approval applies to the latest pushed revision, not an earlier one.',
      'Gates are enforced by platform settings that also bind administrators.'
    ],
    limitations: [
      'Independent approval reduces risk but does not guarantee review quality; large agent-generated diffs strain reviewers.',
      'Platform defaults and plan tiers change; verify settings by export, not memory.',
      'An AI code-review agent\'s approval should not be counted toward required approvals.'
    ],
    examples: [
      { label: 'CODEOWNERS — route sensitive paths to designated owners (example)', lang: 'text', code:
`/.github/workflows/   @example-org/platform-security
/infra/               @example-org/platform-security
/deploy/              @example-org/release-owners`},
      { label: 'Branch protection settings to verify (GitHub terminology)', lang: 'text', code:
`Require a pull request before merging       : on, approvals >= 1
Require review from Code Owners             : on
Require approval of the most recent push    : on
Do not allow bypassing the above settings   : on`}
    ],
    remediation: ['Require independent approval and approval of the latest push (CK-RB-01).', 'Apply rules to administrators and remove standing bypass (CK-RB-04).', 'Route secret, CI, and deployment paths to owners (CK-RB-02).', 'Use the AI-generated PR review checklist in the Reference Kit (CK-RB-03).', 'Run Reference Case C against an export of your protection settings.']
  },

  DC: {
    question: 'Can an agent-produced change reach production, and who authorizes that step?',
    objective: 'Separate the authority to propose and merge code from the authority to release it, so that production deployment always passes a human approval that the triggering identity cannot grant itself, and production credentials are released only after that approval.',
    boundary: 'The release boundary between a trusted branch and production systems, including the credentials that deployment jobs use.',
    threats: [
      ['Merge-equals-deploy', 'A pipeline deploys every merge to production automatically; once an agent change is merged, no further human decision exists.'],
      ['Agent as deployer', 'An agent identity is listed among identities allowed to deploy to production or can trigger and approve the same deployment.'],
      ['Credential pre-release', 'Production secrets are available to every job in the pipeline, including jobs that run on unreviewed agent branches.']
    ],
    capabilities: 'Autonomous and pipeline-integrated agents; also any agent whose merged changes trigger continuous deployment.',
    principles: [
      'Automation and autonomy are different: automated deployment is acceptable when a human has authorized the release.',
      'Production credentials are released after, and because of, approval.',
      'The identity that triggers a deployment cannot approve it.'
    ],
    limitations: [
      'Some platforms restrict deployment-approval features by plan or repository visibility.',
      'Emergency paths (hotfixes, break-glass) need their own recorded authorization; this layer does not define them.',
      'Supply-chain integrity of the deployed artifact (build provenance) is adjacent and not covered by these controls.'
    ],
    examples: [
      { label: 'GitHub Actions — deployment job bound to a protected environment (example; reviewers configured in environment settings)', lang: 'yaml', code:
`jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
    steps:
      - run: ./deploy.sh`},
      { label: 'GitLab CI — deployment to a protected environment (example; approvals configured in project settings)', lang: 'yaml', code:
`deploy_production:
  stage: deploy
  script: ./deploy.sh
  environment:
    name: production`}
    ],
    remediation: ['Gate production deployments on human approval with self-review prevented (CK-DC-01).', 'Scope production secrets to the protected environment (CK-DC-02).', 'Make secret scanning a required pipeline step (CK-DC-03).', 'Route IaC and pipeline changes to infrastructure owners (CK-DC-05).']
  },

  AM: {
    question: 'Can you reconstruct what the agent could reach, what it did, who authorized it, and what was exposed?',
    objective: 'Retain enough tamper-protected, correlated records to answer, after the fact, the reconstruction questions defined in the Audit Evidence Specification — for every agent session.',
    boundary: 'The evidentiary boundary between events that happened and records the organization can produce about them, outside the control of the actors being recorded.',
    threats: [
      ['Uncorrelated logs', 'Platform audit events show a bot pushed a branch; the agent\'s session log shows commands; nothing links the two, so scope and delegation cannot be reconstructed.'],
      ['Retention shortfall', 'An exposure is discovered after the platform\'s audit-log window has passed; the session that read the secret is no longer on record.'],
      ['Self-editable records', 'Logs are written to a location the agent identity can modify or delete.']
    ],
    capabilities: 'All agent classes that act on repositories; the record set expands with capability (tool calls, external requests, deployments).',
    principles: [
      'Every record carries a session identifier that links platform events, agent logs, and approvals.',
      'Scope at session start is recorded, not only actions taken: exposure analysis needs to know what was readable.',
      'Records live outside the reach of the identities they describe.'
    ],
    limitations: [
      'Vendor agent logs vary in content and export options; some fields may not be available.',
      'Logging what was readable (scope) is often harder than logging what was done; the specification marks which fields are commonly unavailable.',
      'Records support accountability; they do not prevent incidents.'
    ],
    examples: [
      { label: 'Audit event (Codokey Audit Evidence Specification v1.0 — validated by Reference Case D)', lang: 'json', code:
`{
  "event_id": "evt-0004",
  "session_id": "sess-7f3c2a",
  "timestamp": "2026-11-02T10:14:07Z",
  "event_type": "change.pushed",
  "actor": { "type": "agent", "id": "app:example-task-agent" },
  "on_behalf_of": "alice@example.test",
  "target": "example-org/web@refs/heads/agent/orders-pagination",
  "outcome": "success",
  "source": "platform-audit-log"
}`}
    ],
    remediation: ['Log agent actions with identity, delegating human, time, target, outcome (CK-AM-01).', 'Store logs outside agent reach with retention lock (CK-AM-02).', 'Export logs where platform retention is shorter than required (CK-AM-03).', 'Exercise the secret-exposure runbook (CK-AM-04).', 'Run Reference Case D against an export of one real session (with secrets removed).']
  }
};

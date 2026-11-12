/*!
 * Codokey Governance Scorecard — assessment model
 * Model version 2.0.0 (see /SCORING.md for the full specification)
 *
 * This file is the single source of truth for the 32 controls, their
 * evidence expectations, and the grading algorithm. It has no
 * dependencies and runs unchanged in the browser (window.CodokeyScorecard)
 * and in Node (module.exports) so the same logic is unit-tested.
 *
 * Self-assessment reference model. A status of "implemented" records the
 * assessor's own statement that evidence exists; it is not independent
 * verification, certification, or a compliance determination.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.CodokeyScorecard = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODEL_VERSION = '2.0.0';
  var PROTOCOL_VERSION = '1.1';

  var STATUS = { PASS: 'pass', FAIL: 'fail', UNKNOWN: 'unknown' };
  var STATUS_LABELS = {
    pass: 'Implemented — evidence available',
    fail: 'Not implemented',
    unknown: 'Not assessed / evidence insufficient'
  };

  var SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };

  var LAYERS = [
    { id: 'OR', num: '01', name: 'Code Origin', slug: 'code-origin', tag: 'Provenance Layer', file: 'code-origin.sh' },
    { id: 'KE', num: '02', name: 'Key Exposure', slug: 'key-exposure', tag: 'Secrets Layer', file: 'key-exposure.sh' },
    { id: 'AA', num: '03', name: 'Agent Authority', slug: 'agent-authority', tag: 'Permission Layer', file: 'agent-authority.sh' },
    { id: 'RB', num: '04', name: 'Review Boundary', slug: 'review-boundary', tag: 'Human Gate Layer', file: 'review-boundary.sh' },
    { id: 'DC', num: '05', name: 'Deployment Control', slug: 'deployment-control', tag: 'Authority Layer', file: 'deployment-control.sh' },
    { id: 'AM', num: '06', name: 'Audit Memory', slug: 'audit-memory', tag: 'Accountability Layer', file: 'audit-memory.sh' }
  ];

  /*
   * Forbidden zones (Codokey Protocol): no agent class, no exception.
   * A failed control mapped to a forbidden zone caps the grade at C.
   */
  var FORBIDDEN_ZONES = {
    'FZ-1': 'Production secrets accessible to an agent',
    'FZ-2': 'Organization-wide scope for a single-repository task',
    'FZ-3': 'Unsupervised production deployment'
  };

  // legacy = position (1–32) in Scorecard v1.0, kept for traceability.
  var CONTROLS = [
    // 01 — Code Origin
    { id: 'CK-OR-01', legacy: 1, layer: 'OR', severity: 'high',
      title: 'AI involvement in a change is recorded in commit or pull-request metadata',
      evidence: 'Commit trailers, PR labels, or bot/app author identities that mark AI-generated or AI-assisted changes, observable on a sample of recent merged PRs.',
      remediation: 'Adopt one machine-readable convention (for example a commit trailer or a PR label applied by the agent integration) and verify it on merged history.',
      refs: ['EV-SLSA-SOURCE-1.2'] },
    { id: 'CK-OR-02', legacy: 2, layer: 'OR', severity: 'critical',
      title: 'Each agent acts under a distinct, attributable identity — not a shared account or a reused personal credential',
      evidence: 'Inventory mapping each agent integration to its own app, bot, or service identity, plus the human principal who delegated the task; sample audit events showing that identity.',
      remediation: 'Provision a dedicated identity per agent integration; retire shared tokens and personal access tokens used by automation.',
      refs: ['EV-OWASP-ASI-2026', 'EV-SP80053-AU-3'] },
    { id: 'CK-OR-03', legacy: 3, layer: 'OR', severity: 'medium',
      title: 'SDLC policy states how AI-assisted changes are disclosed and what review obligation they carry',
      evidence: 'Current, approved policy text with owner and review date.',
      remediation: 'Add an AI-assisted change section to the SDLC policy: disclosure convention, review obligation, and exceptions process.',
      refs: ['EV-SSDF-PW.7'] },
    { id: 'CK-OR-04', legacy: 4, layer: 'OR', severity: 'high',
      title: 'Human-authored and agent-authored contributions are distinguishable in version-control history',
      evidence: 'History query that separates agent-authored commits (by identity or trailer) from human commits for a chosen period.',
      remediation: 'Combine CK-OR-01 metadata with CK-OR-02 identities so history can be filtered by author type.',
      refs: ['EV-SLSA-SOURCE-1.2'] },

    // 02 — Key Exposure
    { id: 'CK-KE-01', legacy: 5, layer: 'KE', severity: 'critical',
      title: 'Secret scanning is enabled on all active repositories',
      evidence: 'Platform security settings or API output showing secret scanning enabled per repository; list of exclusions with justification.',
      remediation: 'Enable secret scanning organization-wide; track repositories where it is unavailable and compensate with CI scanning.',
      refs: ['EV-GH-SECRET-SCANNING'] },
    { id: 'CK-KE-02', legacy: 6, layer: 'KE', severity: 'critical',
      title: 'Secrets are blocked before they enter the repository (server-side push protection, with client hooks as a supplement)',
      evidence: 'Push-protection setting enabled; a test push of a synthetic secret pattern rejected; documented bypass process.',
      remediation: 'Enable server-side push protection. Client-side pre-commit hooks can be skipped by the committer and should not be the only control.',
      refs: ['EV-GH-PUSH-PROTECTION', 'EV-GL-SECRET-PUSH-PROTECTION'] },
    { id: 'CK-KE-03', legacy: 7, layer: 'KE', severity: 'critical',
      title: 'Secret-bearing files (.env, credential files, key material) are outside agent read scope, enforced at a technical boundary',
      evidence: 'Agent configuration deny rules or sandbox/filesystem policy covering secret paths, plus a test showing a read attempt is refused; note whether subprocesses are covered.',
      remediation: 'Keep secrets out of the working tree (inject at runtime from a secret manager). Where files must exist, combine tool-level deny rules with OS or sandbox isolation — tool-level exclusions alone may not cover subprocesses.',
      refs: ['EV-CLAUDE-PERMISSIONS', 'EV-GH-CONTENT-EXCLUSION', 'EV-OWASP-LLM02'] },
    { id: 'CK-KE-04', legacy: 8, layer: 'KE', severity: 'high',
      title: 'Hardcoded-credential review of code and history performed within a defined interval (default: 90 days)',
      evidence: 'Dated scan report covering full history and the follow-up record for each finding.',
      remediation: 'Schedule a full-history scan; revoke and rotate any confirmed credential before removing it from history.',
      refs: ['EV-GH-SECRET-SCANNING'] },
    { id: 'CK-KE-05', legacy: 9, layer: 'KE', severity: 'high',
      title: 'Credential rotation policy is documented and enforced (expiry or automated rotation)',
      evidence: 'Policy with lifetimes per credential class; system evidence of expiry or rotation (e.g. token expiration dates).',
      remediation: 'Set maximum lifetimes per class; prefer short-lived, automatically issued credentials for agents and CI.',
      refs: ['EV-OWASP-SECRETS-CS', 'EV-GH-FG-PAT'] },
    { id: 'CK-KE-06', legacy: 10, layer: 'KE', severity: 'critical', forbiddenZone: 'FZ-1',
      title: 'Production secrets live in a separate store that agent identities cannot read',
      evidence: 'Access policy of the production secret store listing principals; confirmation no agent identity is among them.',
      remediation: 'Move production secrets to a dedicated store or protected environment and remove agent identities from its access policy.',
      refs: ['EV-SSDF-PO.5.1', 'EV-GH-ENVIRONMENTS'] },

    // 03 — Agent Authority
    { id: 'CK-AA-01', legacy: 11, layer: 'AA', severity: 'critical',
      title: 'Each agent has a documented scope: repositories, branches, tools, and permitted actions',
      evidence: 'Agent access policy entry per agent (see Reference Kit template) with owner and review date.',
      remediation: 'Complete an agent access policy entry for every agent integration before it runs again.',
      refs: ['EV-SP80053-AC-6', 'EV-OWASP-LLM06'] },
    { id: 'CK-AA-02', legacy: 12, layer: 'AA', severity: 'critical',
      title: 'Agent credentials grant only the repository permissions the task requires',
      evidence: 'Granted permission set for each agent identity compared with the documented scope (CK-AA-01); no unexplained write or admin permissions.',
      remediation: 'Replace broad tokens with fine-grained or app installation tokens restricted to the needed repositories and permissions.',
      refs: ['EV-SSDF-PS.1.1', 'EV-SP80053-AC-6', 'EV-GH-FG-PAT', 'EV-OWASP-LLM06'] },
    { id: 'CK-AA-03', legacy: 13, layer: 'AA', severity: 'high',
      title: 'MCP servers and other agent tool connections are inventoried and reviewed',
      evidence: 'Inventory listing each server/tool, its credentials, scopes, and an approval record; an empty inventory counts if verified.',
      remediation: 'Inventory configured tool servers per agent; remove unapproved ones; record approval and owner.',
      refs: ['EV-MCP-SECURITY', 'EV-MS-ZT-DS120', 'EV-OWASP-LLM06'] },
    { id: 'CK-AA-04', legacy: 14, layer: 'AA', severity: 'high',
      title: 'Agent token scopes are reviewed on a schedule (default: quarterly) and use the shortest practical lifetime',
      evidence: 'Dated review record; token metadata showing scopes and expiry.',
      remediation: 'Add agent tokens to the access-review cycle; set expirations; declare minimum workflow token permissions explicitly.',
      refs: ['EV-GH-GITHUB-TOKEN', 'EV-GH-FG-PAT', 'EV-MCP-SECURITY'] },
    { id: 'CK-AA-05', legacy: 15, layer: 'AA', severity: 'critical', forbiddenZone: 'FZ-2',
      title: 'Organization-wide agent access is disabled by default; repository access is granted per repository',
      evidence: 'Agent app/token configuration showing selected-repository access rather than all repositories.',
      remediation: 'Switch installations and tokens from "all repositories" to an explicit repository list.',
      refs: ['EV-GH-FG-PAT', 'EV-SP80053-AC-6'] },
    { id: 'CK-AA-06', legacy: 16, layer: 'AA', severity: 'critical',
      title: 'Forbidden access zones are defined in writing and enforced technically',
      evidence: 'Written forbidden-zone list and, for each zone, the technical control that enforces it (deny rule, permission, protection rule).',
      remediation: 'Map each forbidden zone to an enforcing control; a zone enforced only by policy text remains open.',
      refs: ['EV-OWASP-LLM06', 'EV-SP80053-CM-5'] },

    // 04 — Review Boundary
    { id: 'CK-RB-01', legacy: 17, layer: 'RB', severity: 'critical',
      title: 'Merges of agent-generated changes require approval by a human other than the agent and the person who requested the change',
      evidence: 'Branch protection or ruleset export: required approvals ≥ 1, approval of the most recent push required, requester/self-approval not counted.',
      remediation: 'Require pull-request approval on protected branches and enable "approval of the most recent reviewable push"; confirm the requester cannot approve.',
      refs: ['EV-GH-BRANCH-PROTECTION', 'EV-GL-PROTECTED-BRANCHES', 'EV-SP80053-AC-5', 'EV-GH-COPILOT-AGENT-RISKS'] },
    { id: 'CK-RB-02', legacy: 18, layer: 'RB', severity: 'critical',
      title: 'Changes to secret-handling code, CI configuration, or deployment paths require review by a designated owner',
      evidence: 'Ownership file (e.g. CODEOWNERS) covering those paths and a protection rule requiring owner review.',
      remediation: 'Assign owners to sensitive paths and require code-owner review on protected branches.',
      refs: ['EV-GH-CODEOWNERS'] },
    { id: 'CK-RB-03', legacy: 19, layer: 'RB', severity: 'high',
      title: 'Reviewers are briefed on failure modes typical of AI-generated changes',
      evidence: 'Training or guidance material and attendance/acknowledgement record.',
      remediation: 'Adopt the AI-generated PR review checklist in the Reference Kit and brief reviewers on it.',
      refs: [] },
    { id: 'CK-RB-04', legacy: 20, layer: 'RB', severity: 'critical',
      title: 'Review bypass is technically prevented — including for administrators — not just prohibited by policy',
      evidence: 'Protection setting that applies rules to administrators/bypass roles; list of any bypass actors with justification.',
      remediation: 'Enable the setting that applies protection to administrators and remove standing bypass permissions.',
      refs: ['EV-GH-BRANCH-PROTECTION', 'EV-SP80053-CM-5'] },
    { id: 'CK-RB-05', legacy: 21, layer: 'RB', severity: 'medium',
      title: 'Human review gates are documented in the SDLC governance policy',
      evidence: 'Policy section describing each gate and its enforcing control.',
      remediation: 'Document each gate alongside the control that enforces it.',
      refs: ['EV-SSDF-PW.7'] },

    // 05 — Deployment Control
    { id: 'CK-DC-01', legacy: 22, layer: 'DC', severity: 'critical', forbiddenZone: 'FZ-3',
      title: 'No agent can deploy to production without an approving human gate',
      evidence: 'Production environment protection: required reviewers, self-review prevented; no agent identity among allowed deployers or approvers.',
      remediation: 'Protect the production environment with required human approvers and prevent the triggering identity from approving.',
      refs: ['EV-GH-ENVIRONMENTS', 'EV-GL-DEPLOY-APPROVALS', 'EV-GL-PROTECTED-ENVIRONMENTS', 'EV-OWASP-LLM06'] },
    { id: 'CK-DC-02', legacy: 23, layer: 'DC', severity: 'critical', forbiddenZone: 'FZ-1',
      title: 'Production credentials are separated from development and agent environments',
      evidence: 'Environment-scoped secrets released only to production deployment jobs after approval; development and agent sessions hold none.',
      remediation: 'Scope production secrets to the protected environment so they are released only after its rules pass.',
      refs: ['EV-SSDF-PO.5.1', 'EV-GH-ENVIRONMENTS'] },
    { id: 'CK-DC-03', legacy: 24, layer: 'DC', severity: 'critical',
      title: 'CI/CD pipeline includes secret scanning as a blocking step',
      evidence: 'Pipeline definition with a secret-scanning job marked required; a failing run blocking merge or deploy.',
      remediation: 'Add a required secret-scanning job to the pipeline.',
      refs: ['EV-GH-SECRET-SCANNING'] },
    { id: 'CK-DC-04', legacy: 25, layer: 'DC', severity: 'high',
      title: 'Deployment rollback procedures are documented and tested',
      evidence: 'Runbook and the date and outcome of the last rollback test.',
      remediation: 'Write and exercise a rollback runbook for each production service.',
      refs: [] },
    { id: 'CK-DC-05', legacy: 26, layer: 'DC', severity: 'high',
      title: 'Infrastructure-as-code and pipeline-definition changes require review separate from application code',
      evidence: 'Ownership rules on IaC and workflow paths routing them to infrastructure/security owners.',
      remediation: 'Route IaC and workflow files to dedicated owners via code-owner rules.',
      refs: ['EV-GH-CODEOWNERS', 'EV-SP80053-CM-5'] },

    // 06 — Audit Memory
    { id: 'CK-AM-01', legacy: 27, layer: 'AM', severity: 'critical',
      title: 'Agent actions are logged with agent identity, delegating human, timestamp, target, and outcome',
      evidence: 'Sample audit records for an agent session containing each field (see Audit Evidence Specification).',
      remediation: 'Enable platform audit logging and agent session logs; correlate them by session identifier.',
      refs: ['EV-SP80053-AU-3', 'EV-SP80053-AC-6-9', 'EV-SSDF-PO.3.3'] },
    { id: 'CK-AM-02', legacy: 28, layer: 'AM', severity: 'critical',
      title: 'Audit logs are protected from modification or deletion by agents and the identities they use',
      evidence: 'Log destination access policy showing agent identities lack write/delete; retention lock or append-only configuration.',
      remediation: 'Stream logs to a store outside agent reach with write-once or retention-lock settings.',
      refs: ['EV-SP80053-AU-9'] },
    { id: 'CK-AM-03', legacy: 29, layer: 'AM', severity: 'high',
      title: 'Log retention meets your documented requirement, including export beyond platform defaults',
      evidence: 'Documented retention requirement and the configured retention of every log source used for reconstruction.',
      remediation: 'Compare platform retention windows with your requirement; export logs where the platform window is shorter.',
      refs: ['EV-GH-AUDIT-LOG', 'EV-GL-AUDIT-EVENTS'] },
    { id: 'CK-AM-04', legacy: 30, layer: 'AM', severity: 'critical',
      title: 'Secret exposure events trigger a documented response: revoke, rotate, scope the exposure, record',
      evidence: 'Incident runbook for secret exposure and a record of its last exercise or use.',
      remediation: 'Write a secret-exposure runbook that starts with revocation and rotation, then determines which sessions had the secret in scope.',
      refs: ['EV-OWASP-SECRETS-CS'] },
    { id: 'CK-AM-05', legacy: 31, layer: 'AM', severity: 'medium',
      title: 'Audit reviews are scheduled — not only performed after incidents',
      evidence: 'Review calendar and the most recent review record.',
      remediation: 'Schedule periodic review of agent activity logs.',
      refs: [] },
    { id: 'CK-AM-06', legacy: 32, layer: 'AM', severity: 'high',
      title: 'Open governance gaps are tracked with owners and reviewed by engineering leadership (default: quarterly)',
      evidence: 'Gap register (for example an exported scorecard result) with owners, dates, and review minutes.',
      remediation: 'Export this assessment, assign an owner per unresolved control, and review progress on a fixed cadence.',
      refs: [] }
  ];

  var GRADES = {
    'A+': { cls: 'grade-ap', title: 'Codokey Aligned', meaning: 'Every control is self-attested as implemented with evidence available.' },
    'A':  { cls: 'grade-a', title: 'Controlled With Gaps', meaning: 'All critical controls are implemented; at least one high or medium control is not.' },
    'B':  { cls: 'grade-b', title: 'Partially Governed', meaning: 'At least one critical control is not implemented, but no forbidden-zone control has failed and at least half of critical controls are implemented.' },
    'C':  { cls: 'grade-c', title: 'Ungoverned AI Code Access', meaning: 'A forbidden-zone control has failed, or more than half of critical controls are not implemented.' }
  };
  var GRADE_ORDER = ['C', 'B', 'A', 'A+'];

  function controlById(id) {
    for (var i = 0; i < CONTROLS.length; i++) { if (CONTROLS[i].id === id) return CONTROLS[i]; }
    return null;
  }

  function normalize(statuses) {
    var out = {};
    statuses = statuses || {};
    CONTROLS.forEach(function (c) {
      var s = statuses[c.id];
      out[c.id] = (s === STATUS.PASS || s === STATUS.FAIL) ? s : STATUS.UNKNOWN;
    });
    return out;
  }

  /* Grade for a fully resolved state (no unknowns). */
  function classifyResolved(resolved) {
    var critTotal = 0, critFail = 0, fzFail = 0, otherFail = 0;
    CONTROLS.forEach(function (c) {
      var failed = resolved[c.id] !== STATUS.PASS;
      if (c.severity === 'critical') { critTotal++; if (failed) critFail++; }
      else if (failed) { otherFail++; }
      if (c.forbiddenZone && failed) fzFail++;
    });
    if (fzFail > 0 || critFail * 2 > critTotal) return 'C';
    if (critFail > 0) return 'B';
    if (otherFail > 0) return 'A';
    return 'A+';
  }

  function substitute(statuses, unknownAs) {
    var r = {};
    Object.keys(statuses).forEach(function (k) { r[k] = statuses[k] === STATUS.UNKNOWN ? unknownAs : statuses[k]; });
    return r;
  }

  function sortKey(c) {
    var layerIdx = 0;
    for (var i = 0; i < LAYERS.length; i++) { if (LAYERS[i].id === c.layer) layerIdx = i; }
    return [c.forbiddenZone ? 0 : 1, SEVERITY_RANK[c.severity], layerIdx, c.id];
  }
  function compareControls(a, b) {
    var ka = sortKey(a), kb = sortKey(b);
    for (var i = 0; i < ka.length; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; }
    return 0;
  }

  function evaluate(input) {
    var statuses = normalize(input);
    var counts = { pass: 0, fail: 0, unknown: 0, total: CONTROLS.length };
    var bySeverity = { critical: { pass: 0, fail: 0, unknown: 0, total: 0 }, high: { pass: 0, fail: 0, unknown: 0, total: 0 }, medium: { pass: 0, fail: 0, unknown: 0, total: 0 } };
    var byLayer = {};
    LAYERS.forEach(function (l) { byLayer[l.id] = { pass: 0, fail: 0, unknown: 0, total: 0 }; });
    var failed = [], unassessed = [], forbiddenZoneFailures = [], forbiddenZoneUnknown = [];

    CONTROLS.forEach(function (c) {
      var s = statuses[c.id];
      counts[s]++; bySeverity[c.severity][s]++; bySeverity[c.severity].total++;
      byLayer[c.layer][s]++; byLayer[c.layer].total++;
      if (s === STATUS.FAIL) { failed.push(c); if (c.forbiddenZone) forbiddenZoneFailures.push(c); }
      if (s === STATUS.UNKNOWN) { unassessed.push(c); if (c.forbiddenZone) forbiddenZoneUnknown.push(c); }
    });
    failed.sort(compareControls);
    unassessed.sort(compareControls);

    var floor = classifyResolved(substitute(statuses, STATUS.FAIL));
    var ceiling = classifyResolved(substitute(statuses, STATUS.PASS));
    var assessed = counts.pass + counts.fail;

    var state, grade;
    if (assessed === 0) { state = 'not-assessed'; grade = null; }
    else if (floor === ceiling) { state = 'determined'; grade = floor; }
    else { state = 'provisional'; grade = null; }

    var nextAction;
    if (failed.length) {
      nextAction = { type: 'remediate', control: failed[0].id, text: failed[0].remediation };
    } else if (unassessed.length) {
      nextAction = { type: 'assess', control: unassessed[0].id, text: 'Collect evidence: ' + unassessed[0].evidence };
    } else {
      nextAction = { type: 'maintain', control: null, text: 'Re-assess on a fixed cadence and when agent tooling, permissions, or repositories change.' };
    }

    return {
      modelVersion: MODEL_VERSION,
      state: state,
      grade: grade,
      floor: floor,
      ceiling: ceiling,
      counts: counts,
      coveragePct: Math.round(assessed / CONTROLS.length * 100),
      implementedPct: Math.round(counts.pass / CONTROLS.length * 100),
      bySeverity: bySeverity,
      byLayer: byLayer,
      gates: {
        forbiddenZoneFailures: forbiddenZoneFailures.map(function (c) { return c.id; }),
        forbiddenZoneUnknown: forbiddenZoneUnknown.map(function (c) { return c.id; }),
        criticalFailed: bySeverity.critical.fail,
        criticalUnknown: bySeverity.critical.unknown
      },
      primaryRisks: failed.slice(0, 3).map(function (c) { return c.id; }),
      failed: failed.map(function (c) { return c.id; }),
      unassessed: unassessed.map(function (c) { return c.id; }),
      nextAction: nextAction,
      statuses: statuses
    };
  }

  function describe(result) {
    if (result.state === 'not-assessed') {
      return 'Not assessed. No control has been answered, so no grade is given. Unanswered controls are never counted as implemented.';
    }
    if (result.state === 'provisional') {
      return 'Provisional. ' + result.counts.unknown + ' control(s) not assessed. The grade lies between ' + result.floor +
        ' (if they are not implemented) and ' + result.ceiling + ' (if evidence confirms them). It cannot be stated until they are assessed.';
    }
    return 'Grade ' + result.grade + ' — ' + GRADES[result.grade].title + '. ' + GRADES[result.grade].meaning;
  }

  function exportAssessment(statuses, notes, meta) {
    var result = evaluate(statuses);
    notes = notes || {};
    return {
      schema: 'https://codokey.com/reference/scorecard-assessment.schema.json',
      model: 'codokey-governance-scorecard',
      modelVersion: MODEL_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      generatedAt: (meta && meta.generatedAt) || new Date().toISOString(),
      disclaimer: 'Self-assessment against the Codokey reference model. Not an audit, certification, or compliance determination. "pass" records the assessor\'s statement that evidence exists; it was not independently verified.',
      summary: {
        state: result.state, grade: result.grade, floor: result.floor, ceiling: result.ceiling,
        counts: result.counts, gates: result.gates, primaryRisks: result.primaryRisks
      },
      controls: CONTROLS.map(function (c) {
        return { id: c.id, layer: c.layer, severity: c.severity, forbiddenZone: c.forbiddenZone || null, title: c.title,
          status: result.statuses[c.id], evidenceNote: notes[c.id] || '' };
      })
    };
  }

  return {
    MODEL_VERSION: MODEL_VERSION,
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    STATUS: STATUS,
    STATUS_LABELS: STATUS_LABELS,
    LAYERS: LAYERS,
    CONTROLS: CONTROLS,
    FORBIDDEN_ZONES: FORBIDDEN_ZONES,
    GRADES: GRADES,
    GRADE_ORDER: GRADE_ORDER,
    controlById: controlById,
    classifyResolved: classifyResolved,
    evaluate: evaluate,
    describe: describe,
    exportAssessment: exportAssessment
  };
});

#!/usr/bin/env node
/*
 * codokey-check — reference-case validator (zero dependencies, Node >= 18)
 *
 * Evaluates DECLARED configuration files (JSON / JSONL) against the
 * Codokey reference cases. It does not connect to GitHub, GitLab, an agent,
 * or any live system, and it does not scan real repositories for secrets
 * beyond the simple file heuristics used for Case A fixtures. A PASS means
 * "the declared configuration meets the case's stated conditions", nothing more.
 *
 * Usage:
 *   node tools/codokey-check.mjs secrets-access   --repo <dir> --agent <agent-config.json>
 *   node tools/codokey-check.mjs excess-authority --task <task.json> --grant <grant.json>
 *   node tools/codokey-check.mjs production-path  --change <change.json> --policy <policy.json>
 *   node tools/codokey-check.mjs audit-reconstruct --events <events.jsonl> [--sources <provenance.json>]
 * Add --json for machine-readable output. Exit code 0 = PASS, 1 = FAIL, 2 = usage/input error.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHECK_VERSION = '1.1.0';

// ---------- helpers ----------
export function globToRegExp(glob) {
  // Supports **, *, ? and gitignore-style bare names (match at any depth).
  let g = glob.replace(/^\.\//, '');
  const anyDepth = !g.includes('/');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*') {
      if (g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
      else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + (anyDepth ? '(?:.*/)?' : '') + re + '$');
}
const matchesAny = (path, globs) => globs.some(g => globToRegExp(g).test(path));

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, root, out);
    else out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
}
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const result = (caseId, checks) => ({
  case: caseId, checkVersion: CHECK_VERSION,
  verdict: checks.every(c => c.pass) ? 'PASS' : 'FAIL',
  checks
});

// ---------- Case A: agent access to secrets ----------
// Secret-bearing file heuristics, aligned with the Codokey secrets-boundary classes.
const SECRET_NAME_GLOBS = ['.env', '.env.*', '*.env', '*.pem', '*.key', 'id_rsa', 'id_ed25519', '.npmrc', '.pypirc', 'credentials', 'credentials.json', '*.tfvars'];
const SECRET_ASSIGNMENT = /^\s*[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*\s*[:=]\s*\S+/im;
const EXAMPLE_FILE = /(^|\/)[^/]*\.(example|sample|template)(\.[^/]*)?$/i;

export function findSecretBearingFiles(repoDir) {
  return walk(repoDir).filter(f => {
    if (EXAMPLE_FILE.test(f)) return false;
    if (matchesAny(f, SECRET_NAME_GLOBS)) return true;
    const text = readFileSync(join(repoDir, f), 'utf8');
    return SECRET_ASSIGNMENT.test(text);
  }).sort();
}

export function checkSecretsAccess(repoDir, agent) {
  const secretFiles = findSecretBearingFiles(repoDir);
  const deny = agent.readDeny || [];
  const readable = secretFiles.filter(f => !matchesAny(f, deny));
  const checks = [
    { id: 'A1', control: 'CK-KE-03', title: 'Every secret-bearing file in the workspace is covered by a read-deny rule',
      pass: readable.length === 0, detail: readable.length ? 'Readable by the agent: ' + readable.join(', ') : `${secretFiles.length} secret-bearing file(s) covered` },
    { id: 'A2', control: 'CK-KE-03', title: 'Exclusion is enforced at a boundary that also covers subprocesses',
      pass: agent.enforcement === 'os-sandbox' || agent.enforcement === 'not-in-workspace',
      detail: `enforcement = ${agent.enforcement || 'undeclared'}${agent.canExecuteCommands ? ' (agent can execute commands)' : ''}` },
    { id: 'A3', control: 'CK-KE-06', title: 'No production credential is present in the agent environment',
      pass: !(agent.environment || []).some(v => /PROD/i.test(v)), detail: 'environment variables: ' + ((agent.environment || []).join(', ') || 'none') }
  ];
  return { ...result('A-secrets-access', checks.map(c => ({ ...c, basis: 'declared-configuration' }))), enforcementVerified: false, secretBearingFiles: secretFiles };
}

// ---------- Case B: excessive agent authority ----------
// Required permission per task action (GitHub-style permission names; adapt for other platforms).
export const ACTION_PERMISSIONS = {
  'read-code': { contents: 'read' },
  'push-branch': { contents: 'write' },
  'open-pull-request': { pull_requests: 'write' },
  'comment-pull-request': { pull_requests: 'write' },
  'read-issues': { issues: 'read' },
  'run-ci': { actions: 'read' }
};
const LEVEL = { none: 0, read: 1, write: 2, admin: 3 };

export function requiredPermissions(task) {
  const req = {};
  for (const a of task.actions) {
    const p = ACTION_PERMISSIONS[a];
    if (!p) throw new Error('Unknown task action: ' + a);
    for (const [k, v] of Object.entries(p)) if ((LEVEL[v]) > (LEVEL[req[k]] || 0)) req[k] = v;
  }
  return req;
}

class InputError extends Error {}
const isPositiveFinite = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isPositiveInt = v => Number.isInteger(v) && v > 0;
const norm = id => String(id).trim().toLowerCase();
// Non-human identities never count as approvers or acceptable reviewers.
export const isNonHuman = id => typeof id !== 'string' || id.trim() === '' || /^(app|bot|ci|svc|service):/i.test(id.trim()) || /\[bot\]$/i.test(id.trim());

export function checkExcessAuthority(task, grant) {
  if (!Array.isArray(task.actions) || !Array.isArray(task.repositories)) throw new InputError('task.actions and task.repositories must be arrays');
  if (task.maxTokenLifetimeHours !== undefined && !isPositiveFinite(task.maxTokenLifetimeHours)) {
    throw new InputError(`task.maxTokenLifetimeHours must be a positive finite number of hours (got ${JSON.stringify(task.maxTokenLifetimeHours)})`);
  }
  const maxLifetime = task.maxTokenLifetimeHours ?? 24;
  const req = requiredPermissions(task);
  const granted = grant.permissions && typeof grant.permissions === 'object' ? grant.permissions : {};
  const excess = [];
  for (const [k, v] of Object.entries(granted)) {
    if (!Object.hasOwn(LEVEL, v)) excess.push(`${k}:${v} (unrecognized level — treated as excess)`);
    else if (LEVEL[v] > (LEVEL[req[k]] || 0)) excess.push(`${k}:${v} (needed ${req[k] || 'none'})`);
  }
  const missing = Object.entries(req).filter(([k, v]) => !Object.hasOwn(LEVEL, granted[k] ?? "") || LEVEL[granted[k]] < LEVEL[v]).map(([k, v]) => `${k}:${v}`);
  const taskRepos = new Set(task.repositories.map(norm));
  const repos = grant.repositories;
  const extraRepos = Array.isArray(repos)
    ? repos.filter(r => typeof r !== 'string' || /[*?]/.test(r) || !taskRepos.has(norm(r))).map(String)
    : [`${JSON.stringify(repos)} (not an explicit repository list)`];
  const taskTools = new Set((task.tools || []).map(norm));
  const tools = Array.isArray(grant.tools) ? grant.tools : grant.tools === undefined ? [] : null;
  const unapprovedTools = tools === null ? [`${JSON.stringify(grant.tools)} (not a list)`] : tools.filter(t => !taskTools.has(norm(t)));
  const lt = grant.tokenLifetimeHours;
  const checks = [
    { id: 'B1', control: 'CK-AA-05', title: 'Repository access is limited to the repositories the task names (forbidden zone FZ-2)',
      pass: extraRepos.length === 0, detail: extraRepos.length ? 'Excess: ' + extraRepos.join(', ') : 'repositories match task' },
    { id: 'B2', control: 'CK-AA-02', title: 'Granted permissions do not exceed what the task actions require',
      pass: excess.length === 0, detail: excess.length ? 'Excess: ' + excess.join(', ') : 'no excess permissions' },
    { id: 'B3', control: 'CK-AA-03', title: 'Tool / MCP connections are limited to those the task declares',
      pass: unapprovedTools.length === 0, detail: unapprovedTools.length ? 'Undeclared tools: ' + unapprovedTools.join(', ') : 'tools match task' },
    { id: 'B4', control: 'CK-AA-04', title: 'Credential has a valid, bounded lifetime (positive finite hours <= task maximum)',
      pass: isPositiveFinite(lt) && lt <= maxLifetime,
      detail: `lifetime = ${isPositiveFinite(lt) ? lt + ' h' : 'invalid or unbounded (' + JSON.stringify(lt ?? null) + ')'}, maximum = ${maxLifetime} h` },
    { id: 'B5', control: 'CK-AA-01', title: 'Grant is sufficient for the task (scope is not so narrow the task will be done by other means)',
      pass: missing.length === 0, detail: missing.length ? 'Missing: ' + missing.join(', ') : 'all required permissions present' }
  ].map(c => ({ ...c, basis: 'declared-configuration' }));
  return { ...result('B-excess-authority', checks), enforcementVerified: false, required: req };
}

// ---------- Case C: AI-generated change approaching production ----------
// Every policy check reads DECLARED settings (basis "declared-configuration");
// approval checks read RECORDED history supplied with the change (basis
// "recorded-history"). Neither proves the platform enforces the settings.
export function checkProductionPath(change, policy) {
  const bp = policy && policy.branchProtection;
  if (!bp || typeof bp !== 'object') throw new InputError('policy.branchProtection is missing');
  if (!policy.environments || typeof policy.environments !== 'object') throw new InputError('policy.environments is missing');
  const deploymentRequested = change.deploymentTriggeredBy !== undefined && change.deploymentTriggeredBy !== null;
  const env = change.deployTo !== undefined ? policy.environments[change.deployTo] : undefined;
  if (change.deployTo !== undefined && !env) throw new InputError(`change.deployTo "${change.deployTo}" is not defined in policy.environments`);
  if (deploymentRequested && !env) throw new InputError('a deployment was triggered but change.deployTo is missing');
  if (!Array.isArray(change.approvals) || !Array.isArray(change.paths)) throw new InputError('change.approvals and change.paths must be arrays');

  const excluded = new Set([change.author, change.requestedBy].filter(Boolean).map(norm));
  const ownerMap = bp.codeOwnerPaths && typeof bp.codeOwnerPaths === 'object' ? bp.codeOwnerPaths : {};
  // Distinct human approvers on the head revision (duplicates collapse to one).
  const byReviewer = new Map();
  for (const a of change.approvals) {
    if (!a || a.revision !== change.headRevision || isNonHuman(a.by) || excluded.has(norm(a.by))) continue;
    const k = norm(a.by);
    const prev = byReviewer.get(k);
    byReviewer.set(k, { by: a.by, teams: [...new Set([...(prev ? prev.teams : []), ...(Array.isArray(a.teams) ? a.teams : [])])] });
  }
  const counted = [...byReviewer.values()];
  const ignored = change.approvals.filter(a => !a || !byReviewer.has(norm(a.by)) || a.revision !== change.headRevision)
    .map(a => (a && a.by) + (a && a.revision !== change.headRevision ? ' (stale)' : ''));
  const duplicateCount = change.approvals.filter(a => a && a.revision === change.headRevision && byReviewer.has(norm(a.by))).length - counted.length;

  const sensitive = change.paths.filter(p => matchesAny(p, Object.keys(ownerMap)));
  const ownersNeeded = [...new Set(sensitive.flatMap(p => Object.entries(ownerMap).filter(([g]) => globToRegExp(g).test(p)).map(([, o]) => o)))];
  const ownerApproved = ownersNeeded.every(o => counted.some(a => a.teams.includes(o)));

  const c1 = isPositiveInt(bp.requiredApprovals) && bp.requireLastPushApproval === true && bp.excludeRequesterApproval === true;
  const c2 = bp.enforceForAdmins === true && Array.isArray(bp.bypassActors) && bp.bypassActors.length === 0;
  const c3 = sensitive.length === 0 || bp.requireCodeOwnerReview === true;
  const c4 = isPositiveInt(bp.requiredApprovals) && counted.length >= bp.requiredApprovals && (sensitive.length === 0 || ownerApproved);

  // Deployment environment policy.
  const reviewers = env && Array.isArray(env.requiredReviewers) ? env.requiredReviewers : [];
  const deployers = env && Array.isArray(env.allowedDeployers) ? env.allowedDeployers : [];
  const envRequired = env && env.requiredApprovals !== undefined ? env.requiredApprovals : 1;
  const badReviewers = reviewers.filter(r => isNonHuman(r) || excluded.has(norm(r)));
  const badDeployers = deployers.filter(isNonHuman);
  const humanReviewers = reviewers.filter(r => !isNonHuman(r) && !excluded.has(norm(r))).map(norm);
  // With self-review prevented, every allowed deployer must have enough OTHER eligible reviewers.
  const starved = env && env.preventSelfReview === true && isPositiveInt(envRequired)
    ? deployers.filter(d => new Set(humanReviewers.filter(r => r !== norm(d))).size < envRequired) : [];
  const c5Problems = [];
  if (!env) c5Problems.push('no deployment environment declared');
  else {
    if (reviewers.length === 0) c5Problems.push('no required reviewers');
    if (badReviewers.length) c5Problems.push('ineligible reviewers: ' + badReviewers.join(', '));
    if (env.preventSelfReview !== true) c5Problems.push('preventSelfReview is not true');
    if (!Array.isArray(env.allowedDeployers) || deployers.length === 0) c5Problems.push('allowedDeployers not declared');
    if (badDeployers.length) c5Problems.push('non-human deployers: ' + badDeployers.join(', '));
    if (!isPositiveInt(envRequired)) c5Problems.push('environment requiredApprovals is not a positive integer');
    if (starved.length) c5Problems.push('no eligible reviewer can approve deployments by: ' + starved.join(', '));
  }
  const c6 = !!env && env.secretsScopedToEnvironment === true;

  // Recorded deployment approvals: distinct, eligible, not the trigger.
  const deployApprovers = new Set();
  for (const a of (change.deploymentApprovals || [])) {
    if (!a || isNonHuman(a.by)) continue;
    const k = norm(a.by);
    if (!humanReviewers.includes(k)) continue;
    if (env && env.preventSelfReview === true && k === norm(change.deploymentTriggeredBy)) continue;
    deployApprovers.add(k);
  }
  const triggerAllowed = !deploymentRequested || (!isNonHuman(change.deploymentTriggeredBy) && deployers.map(norm).includes(norm(change.deploymentTriggeredBy)));
  const c7 = !deploymentRequested || (triggerAllowed && isPositiveInt(envRequired) && deployApprovers.size >= envRequired);

  const checks = [
    { id: 'C1', control: 'CK-RB-01', basis: 'declared-configuration', title: 'Declared policy requires >= 1 approval on the latest revision, excluding the agent and the requester',
      pass: c1, detail: `requiredApprovals=${JSON.stringify(bp.requiredApprovals)}, lastPush=${bp.requireLastPushApproval}, excludeRequester=${bp.excludeRequesterApproval}` },
    { id: 'C2', control: 'CK-RB-04', basis: 'declared-configuration', title: 'Declared branch protection applies to administrators (explicitly empty bypass list)',
      pass: c2, detail: `enforceForAdmins=${bp.enforceForAdmins}, bypass=${Array.isArray(bp.bypassActors) ? (bp.bypassActors.join(', ') || 'none') : 'not declared'}` },
    { id: 'C3', control: 'CK-RB-02', basis: 'declared-configuration', title: 'Declared policy requires code-owner review for sensitive paths',
      pass: c3, detail: sensitive.length ? 'sensitive paths: ' + sensitive.join(', ') : 'no sensitive paths touched' },
    { id: 'C4', control: 'CK-RB-01', basis: 'recorded-history', title: 'Recorded approvals include enough distinct independent humans on the latest revision',
      pass: c4, detail: `distinct counted approvers: ${counted.map(a => a.by).join(', ') || 'none'}${duplicateCount > 0 ? ` (${duplicateCount} duplicate approval(s) ignored)` : ''}; ignored: ${ignored.join(', ') || 'none'}` },
    { id: 'C5', control: 'CK-DC-01', basis: 'declared-configuration', title: 'Declared production environment requires an eligible human reviewer other than the triggering identity (forbidden zone FZ-3)',
      pass: c5Problems.length === 0, detail: c5Problems.length ? c5Problems.join('; ') : `reviewers=${reviewers.join(', ')}, preventSelfReview=true, deployers=${deployers.join(', ')}` },
    { id: 'C6', control: 'CK-DC-02', basis: 'declared-configuration', title: 'Declared configuration releases production secrets only to the protected environment',
      pass: c6, detail: `secretsScopedToEnvironment=${env ? env.secretsScopedToEnvironment : 'no environment'}` },
    { id: 'C7', control: 'CK-DC-01', basis: 'recorded-history', title: 'Recorded deployment (if any) was triggered by an allowed deployer and approved by enough distinct eligible reviewers',
      pass: c7, detail: deploymentRequested ? `trigger=${change.deploymentTriggeredBy}${triggerAllowed ? '' : ' (not an allowed human deployer)'}; distinct qualifying approvals: ${[...deployApprovers].join(', ') || 'none'} (required ${JSON.stringify(envRequired)})` : 'no deployment requested' }
  ];
  const all = checks.every(c => c.pass);
  return {
    ...result('C-production-path', checks),
    enforcementVerified: false,
    decision: {
      basis: 'declared configuration and recorded history; platform enforcement NOT verified',
      mergeAllowed: c1 && c2 && c3 && c4,
      deploymentRequested,
      deployAllowed: deploymentRequested && all
    }
  };
}

// ---------- Case D: audit reconstruction ----------
export const REQUIRED_EVENT_FIELDS = ['event_id', 'session_id', 'timestamp', 'event_type', 'actor', 'outcome', 'source'];
const ACTOR_TYPES = ['agent', 'human', 'pipeline'];
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
export const TAMPER_PROTECTION = ['append-only', 'retention-lock', 'write-once'];

function eventProblems(e) {
  const p = REQUIRED_EVENT_FIELDS.filter(f => e[f] === undefined || e[f] === null || e[f] === '');
  if (e.actor !== undefined && (typeof e.actor !== 'object' || !ACTOR_TYPES.includes(e.actor.type) || typeof e.actor.id !== 'string' || !e.actor.id)) p.push('actor.type/id');
  if (typeof e.timestamp === 'string' && (!RFC3339.test(e.timestamp) || Number.isNaN(Date.parse(e.timestamp)))) p.push('timestamp format');
  return p;
}

export const QUESTIONS = [
  ['Q1', 'Which agent identity acted?', s => s.events.some(e => e.actor?.type === 'agent' && e.actor?.id)],
  ['Q2', 'Which human delegated the session?', s => s.start?.on_behalf_of && s.events.filter(e => e.actor?.type === 'agent').every(e => e.on_behalf_of)],
  ['Q3', 'When did the session start and end?', s => !!(s.start && s.end)],
  ['Q4', 'What scope (repositories, permissions, tools) was granted at session start?', s => !!(s.start?.scope?.repositories && s.start?.scope?.permissions)],
  ['Q5', 'Which secret-bearing paths were readable during the session?', s => Array.isArray(s.start?.scope?.readable_secret_paths)],
  ['Q6', 'Which changes did the agent produce?', s => s.events.some(e => e.event_type === 'change.pushed' && e.target)],
  ['Q7', 'Which human approved the change, on which revision?', s => s.events.some(e => e.event_type === 'review.approved' && e.actor?.type === 'human' && e.revision)],
  ['Q8', 'Was it deployed, and who authorized that deployment (same revision)?', s => s.events.filter(e => e.event_type === 'deployment.completed')
    .every(d => s.events.some(e => e.event_type === 'deployment.approved' && e.actor?.type === 'human' && e.revision && e.revision === d.revision))]
];

/*
 * D4 — independent audit evidence. A source string in an event is only a
 * label. Independence is evaluated against a separately supplied provenance
 * manifest: { sources: [{ id, writableBy: [identities], tamperProtection }] }.
 * A source passes only if it is declared, has tamper protection, and none of
 * the agent identities that act in the events can write to it. This is still
 * DECLARED provenance; the validator cannot verify it.
 */
export function checkAuditReconstruction(events, manifest) {
  const malformed = events.map(e => [e.event_id || '(no id)', eventProblems(e)]).filter(([, p]) => p.length).map(([id, p]) => `${id} [${p.join(', ')}]`);
  const sessions = {};
  for (const e of events) {
    const sid = e.session_id || '(none)';
    (sessions[sid] ||= { events: [] }).events.push(e);
    if (e.event_type === 'session.started') sessions[sid].start = e;
    if (e.event_type === 'session.ended') sessions[sid].end = e;
  }
  const answers = [];
  for (const [sid, s] of Object.entries(sessions)) {
    if (sid === '(none)') continue; // reported by D2
    for (const [qid, text, fn] of QUESTIONS) answers.push({ session: sid, id: qid, question: text, answerable: !!fn(s) });
  }
  const unanswerable = answers.filter(a => !a.answerable);

  const agentIds = new Set(events.filter(e => e.actor?.type === 'agent' && e.actor?.id).map(e => norm(e.actor.id)));
  const declared = manifest && Array.isArray(manifest.sources) ? new Map(manifest.sources.map(s => [s.id, s])) : null;
  const provenanceProblems = [];
  if (!declared) provenanceProblems.push('no provenance manifest supplied — a source label alone does not establish independence');
  else {
    for (const src of new Set(events.map(e => e.source))) {
      const d = declared.get(src);
      if (!d) { provenanceProblems.push(`${src || '(missing)'}: not declared in manifest`); continue; }
      if (!TAMPER_PROTECTION.includes(d.tamperProtection)) provenanceProblems.push(`${src}: tamperProtection=${JSON.stringify(d.tamperProtection)}`);
      if (!Array.isArray(d.writableBy)) provenanceProblems.push(`${src}: writableBy not declared`);
      else { const w = d.writableBy.filter(x => agentIds.has(norm(x))); if (w.length) provenanceProblems.push(`${src}: writable by acting agent ${w.join(', ')}`); }
    }
  }
  const checks = [
    { id: 'D1', control: 'CK-AM-01', basis: 'recorded-history', title: 'Every event carries valid required fields (Audit Evidence Specification v1.0)',
      pass: malformed.length === 0, detail: malformed.length ? 'Invalid events: ' + malformed.join('; ') : `${events.length} events complete` },
    { id: 'D2', control: 'CK-AM-01', basis: 'recorded-history', title: 'Every event is linked to a session',
      pass: !sessions['(none)'], detail: sessions['(none)'] ? `${sessions['(none)'].events.length} event(s) without session_id` : `${Object.keys(sessions).length} session(s)` },
    { id: 'D3', control: 'CK-AM-01', basis: 'recorded-history', title: 'All reconstruction questions are answerable for every session',
      pass: unanswerable.length === 0, detail: unanswerable.length ? 'Unanswerable: ' + unanswerable.map(a => `${a.session}/${a.id}`).join(', ') : 'all questions answerable' },
    { id: 'D4', control: 'CK-AM-02', basis: 'declared-configuration', title: 'Declared provenance places every record source outside agent write access, with tamper protection',
      pass: provenanceProblems.length === 0, detail: provenanceProblems.length ? provenanceProblems.join('; ') : `sources declared independent: ${[...declared.keys()].join(', ')}` }
  ];
  return { ...result('D-audit-reconstruct', checks), enforcementVerified: false, answers };
}

// ---------- CLI ----------
function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { json: false };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--json') opts.json = true;
    else if (rest[i].startsWith('--')) opts[rest[i].slice(2)] = rest[++i];
  }
  return { cmd, opts };
}

export function run(cmd, o) {
  switch (cmd) {
    case 'secrets-access': return checkSecretsAccess(o.repo, readJson(o.agent));
    case 'excess-authority': return checkExcessAuthority(readJson(o.task), readJson(o.grant));
    case 'production-path': return checkProductionPath(readJson(o.change), readJson(o.policy));
    case 'audit-reconstruct': return checkAuditReconstruction(readFileSync(o.events, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)), o.sources ? readJson(o.sources) : undefined);
    default: throw new Error('Unknown case command: ' + cmd);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(`codokey-check ${CHECK_VERSION} — reference-case validator (declared configuration only)

  secrets-access    --repo <dir> --agent <agent-config.json>
  excess-authority  --task <task.json> --grant <grant.json>
  production-path   --change <change.json> --policy <policy.json>
  audit-reconstruct --events <events.jsonl> [--sources <provenance.json>]

Options: --json   Exit: 0 PASS, 1 FAIL, 2 usage/input error. Cases: https://codokey.com/reference-cases/`);
    process.exit(0);
  }
  try {
    const r = run(cmd, opts);
    if (opts.json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`codokey-check ${CHECK_VERSION} · case ${r.case} · ${r.verdict}`);
      for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.id} [${c.control}] ${c.title}\n        ${c.detail}`);
      console.log('Basis: declared configuration and recorded history only. Platform enforcement was NOT verified.\nNot a scan of live systems; not certification.');
    }
    process.exit(r.verdict === 'PASS' ? 0 : 1);
  } catch (e) {
    console.error('codokey-check: ' + e.message);
    console.error('Usage: see header of tools/codokey-check.mjs or /reference-cases/');
    process.exit(2);
  }
}

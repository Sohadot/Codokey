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
 *   node tools/codokey-check.mjs audit-reconstruct --events <events.jsonl>
 * Add --json for machine-readable output. Exit code 0 = PASS, 1 = FAIL, 2 = usage/input error.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHECK_VERSION = '1.0.0';

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
  return { ...result('A-secrets-access', checks), secretBearingFiles: secretFiles };
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

export function checkExcessAuthority(task, grant) {
  const req = requiredPermissions(task);
  const excess = [];
  for (const [k, v] of Object.entries(grant.permissions || {})) {
    if ((LEVEL[v] || 0) > (LEVEL[req[k]] || 0)) excess.push(`${k}:${v} (needed ${req[k] || 'none'})`);
  }
  const missing = Object.entries(req).filter(([k, v]) => (LEVEL[(grant.permissions || {})[k]] || 0) < LEVEL[v]).map(([k, v]) => `${k}:${v}`);
  const repos = grant.repositories;
  const extraRepos = repos === 'all' ? ['all repositories'] : repos.filter(r => !task.repositories.includes(r));
  const unapprovedTools = (grant.tools || []).filter(t => !(task.tools || []).includes(t));
  const checks = [
    { id: 'B1', control: 'CK-AA-05', title: 'Repository access is limited to the repositories the task names (forbidden zone FZ-2)',
      pass: extraRepos.length === 0, detail: extraRepos.length ? 'Excess: ' + extraRepos.join(', ') : 'repositories match task' },
    { id: 'B2', control: 'CK-AA-02', title: 'Granted permissions do not exceed what the task actions require',
      pass: excess.length === 0, detail: excess.length ? 'Excess: ' + excess.join(', ') : 'no excess permissions' },
    { id: 'B3', control: 'CK-AA-03', title: 'Tool / MCP connections are limited to those the task declares',
      pass: unapprovedTools.length === 0, detail: unapprovedTools.length ? 'Undeclared tools: ' + unapprovedTools.join(', ') : 'tools match task' },
    { id: 'B4', control: 'CK-AA-04', title: 'Credential has a bounded lifetime (<= task maximum)',
      pass: typeof grant.tokenLifetimeHours === 'number' && grant.tokenLifetimeHours <= (task.maxTokenLifetimeHours || 24),
      detail: `lifetime = ${grant.tokenLifetimeHours ?? 'unbounded'} h, maximum = ${task.maxTokenLifetimeHours || 24} h` },
    { id: 'B5', control: 'CK-AA-01', title: 'Grant is sufficient for the task (scope is not so narrow the task will be done by other means)',
      pass: missing.length === 0, detail: missing.length ? 'Missing: ' + missing.join(', ') : 'all required permissions present' }
  ];
  return { ...result('B-excess-authority', checks), required: req };
}

// ---------- Case C: AI-generated change approaching production ----------
export function checkProductionPath(change, policy) {
  const bp = policy.branchProtection;
  const env = policy.environments[change.deployTo];
  const excluded = new Set([change.author, change.requestedBy]);
  const latest = change.approvals.filter(a => a.revision === change.headRevision);
  const counted = latest.filter(a => !excluded.has(a.by) && !a.by.startsWith('app:') && !a.by.startsWith('bot:'));
  const sensitive = change.paths.filter(p => matchesAny(p, bp.codeOwnerPaths ? Object.keys(bp.codeOwnerPaths) : []));
  const ownersNeeded = [...new Set(sensitive.flatMap(p => Object.entries(bp.codeOwnerPaths).filter(([g]) => globToRegExp(g).test(p)).map(([, o]) => o)))];
  const ownerApproved = ownersNeeded.every(o => counted.some(a => (a.teams || []).includes(o)));
  const mergeAllowed = bp.requiredApprovals >= 1 && counted.length >= bp.requiredApprovals && (!bp.requireCodeOwnerReview || ownerApproved);
  const deployApprovals = (change.deploymentApprovals || []).filter(a => (env.requiredReviewers || []).includes(a.by) && !(env.preventSelfReview && a.by === change.deploymentTriggeredBy) && !a.by.startsWith('app:'));
  const checks = [
    { id: 'C1', control: 'CK-RB-01', title: 'Policy requires >= 1 approval on the latest revision, excluding the agent and the requester',
      pass: bp.requiredApprovals >= 1 && bp.requireLastPushApproval === true && bp.excludeRequesterApproval === true,
      detail: `requiredApprovals=${bp.requiredApprovals}, lastPush=${bp.requireLastPushApproval}, excludeRequester=${bp.excludeRequesterApproval}` },
    { id: 'C2', control: 'CK-RB-04', title: 'Branch protection applies to administrators (no standing bypass)',
      pass: bp.enforceForAdmins === true && (bp.bypassActors || []).length === 0, detail: `enforceForAdmins=${bp.enforceForAdmins}, bypass=${(bp.bypassActors || []).join(', ') || 'none'}` },
    { id: 'C3', control: 'CK-RB-02', title: 'Changes to sensitive paths require code-owner review',
      pass: sensitive.length === 0 || bp.requireCodeOwnerReview === true, detail: sensitive.length ? 'sensitive paths: ' + sensitive.join(', ') : 'no sensitive paths touched' },
    { id: 'C4', control: 'CK-RB-01', title: 'This change has an independent approval on its latest revision',
      pass: mergeAllowed, detail: `counted approvals: ${counted.map(a => a.by).join(', ') || 'none'}; ignored: ${change.approvals.filter(a => !counted.includes(a)).map(a => a.by + (a.revision !== change.headRevision ? ' (stale)' : '')).join(', ') || 'none'}` },
    { id: 'C5', control: 'CK-DC-01', title: 'Production deployment requires a human reviewer other than the triggering identity (forbidden zone FZ-3)',
      pass: (env.requiredReviewers || []).length > 0 && env.preventSelfReview === true && !(env.allowedDeployers || []).some(d => d.startsWith('app:')),
      detail: `reviewers=${(env.requiredReviewers || []).join(', ') || 'none'}, preventSelfReview=${env.preventSelfReview}, deployers=${(env.allowedDeployers || []).join(', ')}` },
    { id: 'C6', control: 'CK-DC-02', title: 'Production secrets are released only to the protected environment',
      pass: env.secretsScopedToEnvironment === true, detail: `secretsScopedToEnvironment=${env.secretsScopedToEnvironment}` },
    { id: 'C7', control: 'CK-DC-01', title: 'This deployment (if requested) has a qualifying approval',
      pass: !change.deploymentTriggeredBy || deployApprovals.length > 0, detail: change.deploymentTriggeredBy ? `qualifying approvals: ${deployApprovals.map(a => a.by).join(', ') || 'none'}` : 'no deployment requested' }
  ];
  return { ...result('C-production-path', checks), decision: { mergeAllowed, deployAllowed: checks[4].pass && checks[6].pass && mergeAllowed } };
}

// ---------- Case D: audit reconstruction ----------
export const REQUIRED_EVENT_FIELDS = ['event_id', 'session_id', 'timestamp', 'event_type', 'actor', 'outcome', 'source'];
export const QUESTIONS = [
  ['Q1', 'Which agent identity acted?', s => s.events.some(e => e.actor?.type === 'agent' && e.actor?.id)],
  ['Q2', 'Which human delegated the session?', s => s.start?.on_behalf_of && s.events.filter(e => e.actor?.type === 'agent').every(e => e.on_behalf_of)],
  ['Q3', 'When did the session start and end?', s => !!(s.start && s.end)],
  ['Q4', 'What scope (repositories, permissions, tools) was granted at session start?', s => !!(s.start?.scope?.repositories && s.start?.scope?.permissions)],
  ['Q5', 'Which secret-bearing paths were readable during the session?', s => Array.isArray(s.start?.scope?.readable_secret_paths)],
  ['Q6', 'Which changes did the agent produce?', s => s.events.some(e => e.event_type === 'change.pushed' && e.target)],
  ['Q7', 'Which human approved the change, on which revision?', s => s.events.some(e => e.event_type === 'review.approved' && e.actor?.type === 'human' && e.revision)],
  ['Q8', 'Was it deployed, and who authorized the deployment?', s => !s.events.some(e => e.event_type === 'deployment.completed') || s.events.some(e => e.event_type === 'deployment.approved' && e.actor?.type === 'human')]
];

export function checkAuditReconstruction(events) {
  const malformed = events.filter(e => REQUIRED_EVENT_FIELDS.some(f => e[f] === undefined || e[f] === '')).map(e => e.event_id || '(no id)');
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
  const checks = [
    { id: 'D1', control: 'CK-AM-01', title: 'Every event carries the required fields (Audit Evidence Specification v1.0)',
      pass: malformed.length === 0, detail: malformed.length ? 'Incomplete events: ' + malformed.join(', ') : `${events.length} events complete` },
    { id: 'D2', control: 'CK-AM-01', title: 'Every event is linked to a session',
      pass: !sessions['(none)'], detail: sessions['(none)'] ? `${sessions['(none)'].events.length} event(s) without session_id` : `${Object.keys(sessions).length} session(s)` },
    { id: 'D3', control: 'CK-AM-01', title: 'All reconstruction questions are answerable for every session',
      pass: unanswerable.length === 0, detail: unanswerable.length ? 'Unanswerable: ' + unanswerable.map(a => `${a.session}/${a.id}`).join(', ') : 'all questions answerable' },
    { id: 'D4', control: 'CK-AM-02', title: 'Records come from a source outside agent write access',
      pass: events.every(e => e.source !== 'agent-self-report'), detail: 'sources: ' + [...new Set(events.map(e => e.source || '(missing)'))].join(', ') }
  ];
  return { ...result('D-audit-reconstruct', checks), answers };
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
    case 'audit-reconstruct': return checkAuditReconstruction(readFileSync(o.events, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)));
    default: throw new Error('Unknown case command: ' + cmd);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  try {
    const r = run(cmd, opts);
    if (opts.json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`codokey-check ${CHECK_VERSION} · case ${r.case} · ${r.verdict}`);
      for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.id} [${c.control}] ${c.title}\n        ${c.detail}`);
      console.log('Declared-configuration check only. Not a scan of live systems; not certification.');
    }
    process.exit(r.verdict === 'PASS' ? 0 : 1);
  } catch (e) {
    console.error('codokey-check: ' + e.message);
    console.error('Usage: see header of tools/codokey-check.mjs or /reference-cases/');
    process.exit(2);
  }
}

// Adversarial regression tests for tools/codokey-check.mjs.
// Each test encodes a confirmed defect found in the PR #2 pre-merge review
// (IDs V-xx in docs/PR2_HARDENING.md). Inputs are synthetic and inline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkExcessAuthority, checkProductionPath, checkAuditReconstruction } from '../tools/codokey-check.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const C = join(ROOT, 'cases');
const load = p => JSON.parse(readFileSync(join(C, p), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const failing = r => r.checks.filter(c => !c.pass).map(c => c.id);

// ---------------------------------------------------------------- Case B
const task = load('b-excess-authority/task.json');
const goodGrant = load('b-excess-authority/grant.least-privilege.json');

for (const [label, value] of [['negative', -5], ['zero', 0], ['NaN', NaN], ['Infinity', Infinity], ['string', '8'], ['null', null], ['boolean', true]]) {
  test(`V-B1 token lifetime ${label} (${String(value)}) is rejected by B4`, () => {
    const g = clone(goodGrant); g.tokenLifetimeHours = value;
    const r = checkExcessAuthority(task, g);
    assert.equal(r.verdict, 'FAIL');
    assert.ok(failing(r).includes('B4'));
  });
}

for (const [label, value] of [['zero', 0], ['negative', -1], ['string', '8'], ['Infinity', Infinity]]) {
  test(`V-B2 invalid task maxTokenLifetimeHours (${label}) is an input error, not a silent default`, () => {
    const t = clone(task); t.maxTokenLifetimeHours = value;
    assert.throws(() => checkExcessAuthority(t, goodGrant), /maxTokenLifetimeHours/);
  });
}

test('V-B3 unknown permission level (e.g. "maintain") fails closed in B2', () => {
  const g = clone(goodGrant); g.permissions.administration = 'maintain';
  const r = checkExcessAuthority(task, g);
  assert.ok(failing(r).includes('B2'));
});

test('V-B4 non-array repository scope (wildcard string) fails B1 instead of crashing', () => {
  const g = clone(goodGrant); g.repositories = 'example-org/*';
  const r = checkExcessAuthority(task, g);
  assert.ok(failing(r).includes('B1'));
});

// ---------------------------------------------------------------- Case C
const governed = load('c-production-path/policy.governed.json');
const good = load('c-production-path/change.independent-approval.json');

test('baseline: governed policy + independent approval passes', () => {
  assert.equal(checkProductionPath(good, governed).verdict, 'PASS');
});

test('V-C1 duplicate approvals from one reviewer cannot satisfy requiredApprovals = 2', () => {
  const p = clone(governed); p.branchProtection.requiredApprovals = 2;
  const ch = clone(good);
  ch.approvals = [
    { by: 'carol', revision: 'r3', teams: ['platform-security'] },
    { by: 'carol', revision: 'r3', teams: ['platform-security'] }
  ];
  const r = checkProductionPath(ch, p);
  assert.ok(failing(r).includes('C4'));
  assert.equal(r.decision.mergeAllowed, false);
});

test('V-C1b reviewer identity comparison is case-insensitive (requester "Alice" vs "alice")', () => {
  const ch = clone(good);
  ch.approvals = [{ by: 'Alice', revision: 'r3', teams: ['platform-security'] }];
  assert.ok(failing(checkProductionPath(ch, governed)).includes('C4'));
});

test('V-C1c GitHub-style "[bot]" identities never count as human approvers', () => {
  const ch = clone(good);
  ch.approvals = [{ by: 'review-assistant[bot]', revision: 'r3', teams: ['platform-security'] }];
  assert.ok(failing(checkProductionPath(ch, governed)).includes('C4'));
});

test('V-C2 deployAllowed is false when any mandatory policy control fails (secrets not scoped)', () => {
  const p = clone(governed); p.environments.production.secretsScopedToEnvironment = false;
  const r = checkProductionPath(good, p);
  assert.ok(failing(r).includes('C6'));
  assert.equal(r.decision.deployAllowed, false);
});

test('V-C2b deployAllowed is false when administrators can bypass branch protection', () => {
  const p = clone(governed); p.branchProtection.enforceForAdmins = false;
  const r = checkProductionPath(good, p);
  assert.ok(failing(r).includes('C2'));
  assert.equal(r.decision.deployAllowed, false);
  assert.equal(r.decision.mergeAllowed, false);
});

test('V-C3 a non-human identity listed as required deployment reviewer fails C5', () => {
  const p = clone(governed); p.environments.production.requiredReviewers = ['app:release-bot'];
  assert.ok(failing(checkProductionPath(good, p)).includes('C5'));
});

test('V-C3b the agent author listed as a deployment reviewer fails C5', () => {
  const p = clone(governed); p.environments.production.requiredReviewers = ['dana', 'app:example-task-agent'];
  assert.ok(failing(checkProductionPath(good, p)).includes('C5'));
});

test('V-C4 deployment triggered by an identity not allowed to deploy fails C7', () => {
  const ch = clone(good); ch.deploymentTriggeredBy = 'mallory';
  assert.ok(failing(checkProductionPath(ch, governed)).includes('C7'));
});

test('V-C4b duplicate deployment approvals cannot satisfy an environment requiring two', () => {
  const p = clone(governed); p.environments.production.requiredApprovals = 2;
  const ch = clone(good); ch.deploymentApprovals = [{ by: 'dana' }, { by: 'dana' }];
  assert.ok(failing(checkProductionPath(ch, p)).includes('C7'));
});

test('V-C5 requiredApprovals given as the string "1" is not accepted as a numeric safeguard', () => {
  const p = clone(governed); p.branchProtection.requiredApprovals = '1';
  assert.ok(failing(checkProductionPath(good, p)).includes('C1'));
});

test('V-C5b missing safeguard fields (undefined) fail rather than pass', () => {
  const p = clone(governed); delete p.environments.production.preventSelfReview; delete p.branchProtection.bypassActors;
  const r = checkProductionPath(good, p);
  assert.ok(failing(r).includes('C5'));
  assert.ok(failing(r).includes('C2'));
});

test('V-C6 inconsistent configuration: deployTo names an environment the policy does not define', () => {
  const ch = clone(good); ch.deployTo = 'prod-eu';
  assert.throws(() => checkProductionPath(ch, governed), /not defined in policy/);
});

test('V-C6b inconsistent configuration: approval required but no eligible reviewer can give it', () => {
  const p = clone(governed);
  p.environments.production.requiredReviewers = ['bob'];        // bob is the only reviewer
  p.environments.production.allowedDeployers = ['bob'];         // and the only deployer
  const r = checkProductionPath(good, p);                       // preventSelfReview → nobody can approve bob's deploy
  assert.ok(failing(r).includes('C5'));
});

test('V-C7 results state their basis: declared configuration, enforcement not verified', () => {
  const r = checkProductionPath(good, governed);
  assert.equal(r.enforcementVerified, false);
  for (const c of r.checks) assert.match(c.basis, /^(declared-configuration|recorded-history)$/, c.id);
  assert.equal(r.checks.find(c => c.id === 'C5').basis, 'declared-configuration');
  assert.equal(r.checks.find(c => c.id === 'C7').basis, 'recorded-history');
});

// ---------------------------------------------------------------- Case D
const completeEvents = readFileSync(join(C, 'd-audit-reconstruct/events.complete.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));

test('V-D1 an arbitrary source string does not establish independent provenance', () => {
  const ev = completeEvents.map(e => ({ ...e, source: 'trusted-immutable-log' }));
  const r = checkAuditReconstruction(ev);   // no provenance manifest supplied
  assert.ok(failing(r).includes('D4'));
});

test('V-D1b a source declared writable by the acting agent fails D4', () => {
  const manifest = { sources: [
    { id: 'agent-platform-session-log', writableBy: ['app:example-task-agent'], tamperProtection: 'append-only' },
    { id: 'platform-audit-log', writableBy: ['platform'], tamperProtection: 'retention-lock' }
  ] };
  const r = checkAuditReconstruction(completeEvents, manifest);
  assert.ok(failing(r).includes('D4'));
});

test('V-D1c a source with no tamper protection, or not in the manifest, fails D4', () => {
  const manifest = { sources: [{ id: 'platform-audit-log', writableBy: ['platform'], tamperProtection: 'none' }] };
  assert.ok(failing(checkAuditReconstruction(completeEvents, manifest)).includes('D4'));
});

test('V-D2 an actor object without type/id does not satisfy the required-field check', () => {
  const ev = clone(completeEvents); ev[1].actor = {};
  assert.ok(failing(checkAuditReconstruction(ev)).includes('D1'));
});

test('V-D2b an unparseable timestamp does not satisfy the required-field check', () => {
  const ev = clone(completeEvents); ev[1].timestamp = 'yesterday';
  assert.ok(failing(checkAuditReconstruction(ev)).includes('D1'));
});

test('V-D3 a deployment approval for a different revision does not answer Q8', () => {
  const ev = clone(completeEvents);
  ev.find(e => e.event_type === 'deployment.approved').revision = 'r1';
  const r = checkAuditReconstruction(ev);
  assert.ok(r.answers.some(a => a.id === 'Q8' && !a.answerable));
});

test('V-B3b inherited object keys ("toString", "constructor") are not valid permission levels', () => {
  for (const lvl of ['toString', 'constructor', '__proto__']) {
    const g = clone(goodGrant); g.permissions = { ...g.permissions, administration: lvl };
    assert.ok(failing(checkExcessAuthority(task, g)).includes('B2'), lvl);
  }
});

test('V-C6c CLI exits 2 (input error) on inconsistent configuration, not 0 or 1', async () => {
  const { execFileSync } = await import('node:child_process');
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'codokey-'));
  const ch = clone(good); ch.deployTo = 'prod-eu';
  writeFileSync(join(dir, 'change.json'), JSON.stringify(ch));
  assert.throws(() => execFileSync('node', [join(ROOT, 'tools/codokey-check.mjs'), 'production-path', '--change', join(dir, 'change.json'), '--policy', join(C, 'c-production-path/policy.governed.json')], { stdio: 'pipe' }), e => e.status === 2);
});

// ---------------------------------------------------------------- second-pass review (2026-11-13)
import { checkSecretsAccess } from '../tools/codokey-check.mjs';

test('V-A1 "not-in-workspace" enforcement is rejected when secret-bearing files ARE in the workspace', () => {
  const agent = { readDeny: ['.env', '*.pem', 'config/settings.ini'], enforcement: 'not-in-workspace', canExecuteCommands: true, environment: [] };
  const r = checkSecretsAccess(join(C, 'a-secrets-access/repo'), agent);
  assert.ok(failing(r).includes('A2'));
});

test('V-D1d a source declared writable by anyone ("*") fails D4', () => {
  const manifest = { sources: [
    { id: 'agent-platform-session-log', writableBy: ['*'], tamperProtection: 'append-only' },
    { id: 'platform-audit-log', writableBy: ['platform'], tamperProtection: 'retention-lock' }
  ] };
  assert.ok(failing(checkAuditReconstruction(completeEvents, manifest)).includes('D4'));
});

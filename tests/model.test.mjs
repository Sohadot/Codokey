// Unit tests for the scorecard assessment model (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const M = require('../assets/js/scorecard-model.js');
const register = JSON.parse(readFileSync(new URL('../reference/evidence-register.json', import.meta.url)));

const ids = M.CONTROLS.map(c => c.id);
const all = s => Object.fromEntries(ids.map(id => [id, s]));
const crit = M.CONTROLS.filter(c => c.severity === 'critical').map(c => c.id);
const fz = M.CONTROLS.filter(c => c.forbiddenZone).map(c => c.id);

test('framework shape: 32 controls, 6 layers, 18/11/3 severities, unique ids', () => {
  assert.equal(ids.length, 32);
  assert.equal(new Set(ids).size, 32);
  const per = Object.fromEntries(M.LAYERS.map(l => [l.id, M.CONTROLS.filter(c => c.layer === l.id).length]));
  assert.deepEqual(per, { OR: 4, KE: 6, AA: 6, RB: 5, DC: 5, AM: 6 });
  const sev = s => M.CONTROLS.filter(c => c.severity === s).length;
  assert.deepEqual([sev('critical'), sev('high'), sev('medium')], [18, 11, 3]);
  assert.deepEqual(M.CONTROLS.map(c => c.legacy), Array.from({ length: 32 }, (_, i) => i + 1));
  for (const c of M.CONTROLS) { assert.ok(c.title && c.evidence && c.remediation, c.id); }
  for (const id of fz) assert.equal(M.controlById(id).severity, 'critical');
});

test('every control reference resolves to an evidence register entry', () => {
  const evIds = new Set(register.entries.map(e => e.id));
  for (const c of M.CONTROLS) for (const r of c.refs) assert.ok(evIds.has(r), `${c.id} -> ${r}`);
  for (const e of register.entries) for (const cid of e.controls) assert.ok(ids.includes(cid), `${e.id} -> ${cid}`);
});

test('zero answered controls: not assessed, no grade, never counted as implemented', () => {
  const r = M.evaluate({});
  assert.equal(r.state, 'not-assessed');
  assert.equal(r.grade, null);
  assert.equal(r.counts.pass, 0);
  assert.equal(r.counts.unknown, 32);
  assert.equal(r.implementedPct, 0);
  assert.equal(r.floor, 'C');
  assert.equal(r.ceiling, 'A+');
  assert.equal(r.nextAction.type, 'assess');
  assert.deepEqual(r.primaryRisks, []);
});

test('garbage status values are treated as unknown', () => {
  const r = M.evaluate({ 'CK-OR-01': 'yes', 'CK-OR-02': true, 'NOT-A-CONTROL': 'pass' });
  assert.equal(r.counts.unknown, 32);
});

test('all assessed and implemented: A+', () => {
  const r = M.evaluate(all('pass'));
  assert.equal(r.state, 'determined');
  assert.equal(r.grade, 'A+');
  assert.equal(r.implementedPct, 100);
  assert.equal(r.nextAction.type, 'maintain');
});

test('all assessed and failed: C, forbidden zones reported first', () => {
  const r = M.evaluate(all('fail'));
  assert.equal(r.grade, 'C');
  assert.equal(r.gates.forbiddenZoneFailures.length, 4);
  assert.ok(fz.includes(r.primaryRisks[0]));
  assert.equal(r.failed.length, 32);
});

test('high completion with one critical failure never reaches A or A+', () => {
  const s = all('pass'); s['CK-KE-03'] = 'fail';      // 31/32 = 97% implemented
  const r = M.evaluate(s);
  assert.equal(r.implementedPct, 97);
  assert.equal(r.grade, 'B');
  assert.deepEqual(r.primaryRisks, ['CK-KE-03']);
  assert.equal(r.nextAction.control, 'CK-KE-03');
  assert.equal(r.nextAction.text, M.controlById('CK-KE-03').remediation);
});

test('a single forbidden-zone failure caps the grade at C', () => {
  for (const id of fz) {
    const s = all('pass'); s[id] = 'fail';
    assert.equal(M.evaluate(s).grade, 'C', id);
  }
});

test('more than half of critical controls failed is C; exactly half is B', () => {
  const nonFz = crit.filter(id => !fz.includes(id));
  const s = all('pass'); nonFz.slice(0, 9).forEach(id => s[id] = 'fail');
  assert.equal(M.evaluate(s).grade, 'B');
  nonFz.slice(0, 10).forEach(id => s[id] = 'fail');
  assert.equal(M.evaluate(s).grade, 'C');
});

test('unknown critical control blocks A+ and makes the result provisional', () => {
  const s = all('pass'); s['CK-AM-01'] = 'unknown';
  const r = M.evaluate(s);
  assert.equal(r.state, 'provisional');
  assert.equal(r.grade, null);
  assert.equal(r.floor, 'B');
  assert.equal(r.ceiling, 'A+');
  assert.equal(r.gates.criticalUnknown, 1);
  assert.equal(r.nextAction.type, 'assess');
  assert.equal(r.nextAction.control, 'CK-AM-01');
});

test('unknown forbidden-zone control: floor is C', () => {
  const s = all('pass'); s['CK-DC-01'] = 'unknown';
  const r = M.evaluate(s);
  assert.equal(r.floor, 'C');
  assert.deepEqual(r.gates.forbiddenZoneUnknown, ['CK-DC-01']);
});

test('unknown non-critical only: provisional between A and A+', () => {
  const s = all('pass'); s['CK-RB-03'] = 'unknown';
  const r = M.evaluate(s);
  assert.equal(r.state, 'provisional');
  assert.deepEqual([r.floor, r.ceiling], ['A', 'A+']);
});

test('all critical implemented, high failed: A; known failures determine grade even with unknowns', () => {
  const s = all('pass'); s['CK-KE-05'] = 'fail';
  assert.equal(M.evaluate(s).grade, 'A');
  const t = all('unknown'); t['CK-DC-01'] = 'fail';   // FZ failure: C regardless of unknowns
  const r = M.evaluate(t);
  assert.equal(r.state, 'determined');
  assert.equal(r.grade, 'C');
});

test('A+ is impossible while any critical control is failed or unverified (exhaustive per control)', () => {
  for (const id of crit) {
    for (const st of ['fail', 'unknown']) {
      const s = all('pass'); s[id] = st;
      const r = M.evaluate(s);
      assert.notEqual(r.grade, 'A+', `${id}=${st}`);
      assert.notEqual(r.grade, 'A', `${id}=${st}`);
    }
  }
});

test('mixed results across layers: counts, per-layer breakdown and risk ordering', () => {
  const s = {
    'CK-OR-01': 'pass', 'CK-OR-02': 'fail', 'CK-OR-03': 'fail',
    'CK-KE-01': 'pass', 'CK-KE-03': 'fail', 'CK-KE-04': 'fail',
    'CK-AA-02': 'pass', 'CK-AA-03': 'fail',
    'CK-RB-01': 'pass', 'CK-RB-04': 'fail',
    'CK-DC-04': 'fail',
    'CK-AM-01': 'pass', 'CK-AM-05': 'fail'
  };
  const r = M.evaluate(s);
  assert.deepEqual([r.counts.pass, r.counts.fail, r.counts.unknown], [5, 8, 19]);
  assert.deepEqual(r.byLayer.OR, { pass: 1, fail: 2, unknown: 1, total: 4 });
  assert.deepEqual(r.byLayer.DC, { pass: 0, fail: 1, unknown: 4, total: 5 });
  // critical failures first, in layer order; then high; then medium
  assert.deepEqual(r.failed, ['CK-OR-02', 'CK-KE-03', 'CK-RB-04', 'CK-KE-04', 'CK-AA-03', 'CK-DC-04', 'CK-OR-03', 'CK-AM-05']);
  assert.deepEqual(r.primaryRisks, ['CK-OR-02', 'CK-KE-03', 'CK-RB-04']);
  // unknown forbidden-zone controls are first to verify
  assert.ok(fz.includes(r.unassessed[0]));
  assert.equal(r.state, 'provisional');
  assert.deepEqual([r.floor, r.ceiling], ['C', 'B']);
  assert.equal(r.coveragePct, 41);
});

test('classifyResolved ordering is monotonic: fixing a control never lowers the grade', () => {
  const order = M.GRADE_ORDER;
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 500; i++) {
    const s = Object.fromEntries(ids.map(id => [id, rnd() < 0.5 ? 'pass' : 'fail']));
    const g0 = order.indexOf(M.classifyResolved(s));
    const failing = ids.filter(id => s[id] === 'fail');
    if (!failing.length) continue;
    s[failing[Math.floor(rnd() * failing.length)]] = 'pass';
    assert.ok(order.indexOf(M.classifyResolved(s)) >= g0);
  }
});

test('describe() never states a grade for provisional or unassessed results', () => {
  assert.match(M.describe(M.evaluate({})), /^Not assessed/);
  const s = all('pass'); s['CK-KE-01'] = 'unknown';
  assert.match(M.describe(M.evaluate(s)), /^Provisional/);
});

test('export carries disclaimer, versions, statuses and notes', () => {
  const ex = M.exportAssessment({ 'CK-OR-01': 'pass' }, { 'CK-OR-01': 'PR #12 label' }, { generatedAt: '2026-11-12T00:00:00Z' });
  assert.equal(ex.modelVersion, '2.0.0');
  assert.match(ex.disclaimer, /Not an audit, certification/);
  assert.equal(ex.controls.length, 32);
  assert.equal(ex.controls[0].status, 'pass');
  assert.equal(ex.controls[0].evidenceNote, 'PR #12 label');
  assert.equal(ex.summary.state, 'provisional');
});

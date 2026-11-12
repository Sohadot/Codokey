// The scorecard export references a published JSON Schema. These tests make
// sure that schema exists at the referenced path, is self-consistent with the
// model, and accepts real exports while rejecting malformed ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { validate, assertSupported } from './lib/json-schema-subset.mjs';

const require = createRequire(import.meta.url);
const M = require('../assets/js/scorecard-model.js');
const ROOT = new URL('..', import.meta.url).pathname;
const schemaPath = join(ROOT, new URL(M.EXPORT_SCHEMA_URL).pathname);
const ids = M.CONTROLS.map(c => c.id);
const all = s => Object.fromEntries(ids.map(id => [id, s]));

test('S-1 export $schema URL resolves to a file in the published site', () => {
  assert.match(M.EXPORT_SCHEMA_URL, /^https:\/\/codokey\.com\/reference\/schemas\/scorecard-assessment-\d+\.\d+\.\d+\.schema\.json$/);
  assert.ok(existsSync(schemaPath), schemaPath);
  assert.equal(M.exportAssessment({}).$schema, M.EXPORT_SCHEMA_URL);
});

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
test('S-2 schema is 2020-12, its $id matches the URL, and it uses only validated keywords', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id, M.EXPORT_SCHEMA_URL);
  assertSupported(schema);
  assert.ok(schema.title.includes(M.MODEL_VERSION));
});

const notes = { 'CK-OR-02': 'identity inventory, 2026-11', 'CK-KE-03': 'sandbox policy export' };
const reps = {
  'not assessed': {},
  'all implemented (A+)': all('pass'),
  'all failed (C)': all('fail'),
  'critical failure at 97%': { ...all('pass'), 'CK-KE-03': 'fail' },
  'provisional with unknown critical': { ...all('pass'), 'CK-AM-01': 'unknown' },
  'mixed across layers': { 'CK-OR-01': 'pass', 'CK-OR-02': 'fail', 'CK-KE-03': 'fail', 'CK-AA-03': 'fail', 'CK-RB-01': 'pass', 'CK-DC-04': 'fail', 'CK-AM-05': 'fail' }
};
for (const [name, statuses] of Object.entries(reps)) {
  test(`S-3 representative export validates: ${name}`, () => {
    const ex = M.exportAssessment(statuses, notes);
    assert.deepEqual(validate(schema, ex), []);
    assert.deepEqual(validate(schema, JSON.parse(JSON.stringify(ex))), []); // after serialization, as downloaded
  });
}

const base = () => JSON.parse(JSON.stringify(M.exportAssessment(reps['mixed across layers'], notes, { generatedAt: '2026-11-12T10:00:00.000Z' })));
const mutations = {
  'unknown status value': e => { e.controls[0].status = 'yes'; },
  'grade outside enum': e => { e.summary.grade = 'A++'; },
  'missing control': e => { e.controls.pop(); },
  'extra top-level field (e.g. claimed certification)': e => { e.certified = true; },
  'wrong model version': e => { e.modelVersion = '1.0'; },
  'malformed timestamp': e => { e.generatedAt = 'yesterday'; },
  'unknown control id in risks': e => { e.summary.primaryRisks = ['CK-XX-99']; },
  'count above total': e => { e.summary.counts.pass = 33; },
  'disclaimer removed': e => { delete e.disclaimer; }
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`S-4 schema rejects malformed export: ${name}`, () => {
    const e = base(); mutate(e);
    assert.ok(validate(schema, e).length > 0);
  });
}

test('S-5 the subset validator refuses schemas with keywords it does not implement', () => {
  assert.throws(() => assertSupported({ type: 'object', patternProperties: {} }), /unsupported keyword "patternProperties"/);
});

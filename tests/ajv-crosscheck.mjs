// Independent cross-check: validate representative scorecard exports with
// Ajv (a separate JSON Schema implementation). Runs in CI where Ajv is
// installed; it is not a site dependency.  Usage: node tests/ajv-crosscheck.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(join(process.cwd(), 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats').default;
const M = require('./assets/js/scorecard-model.js');
const schema = JSON.parse(readFileSync(join(process.cwd(), new URL(M.EXPORT_SCHEMA_URL).pathname), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const check = ajv.compile(schema);
const ids = M.CONTROLS.map(c => c.id);
const cases = [{}, Object.fromEntries(ids.map(i => [i, 'pass'])), Object.fromEntries(ids.map(i => [i, 'fail'])), { 'CK-KE-03': 'fail', 'CK-OR-01': 'pass' }];
let bad = 0;
for (const s of cases) { if (!check(M.exportAssessment(s, { 'CK-OR-01': 'note' }))) { bad++; console.error(check.errors); } }
const broken = M.exportAssessment({}); broken.controls[0].status = 'yes';
if (check(broken)) { bad++; console.error('Ajv accepted an invalid status'); }
console.log(bad ? `ajv cross-check FAILED (${bad})` : `ajv cross-check: ${cases.length} exports valid, malformed export rejected`);
process.exit(bad ? 1 : 0);

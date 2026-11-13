// Reproduces every reference case run and compares with cases/*/expected.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { run, globToRegExp, findSecretBearingFiles } from '../tools/codokey-check.mjs';

const root = new URL('..', import.meta.url).pathname;
const casesDir = join(root, 'cases');

for (const dir of readdirSync(casesDir).filter(d => /^[a-d]-/.test(d))) {
  const exp = JSON.parse(readFileSync(join(casesDir, dir, 'expected.json'), 'utf8'));
  for (const r of exp.runs) {
    test(`case ${dir} / ${r.name} → ${r.verdict}`, () => {
      const args = Object.fromEntries(Object.entries(r.args).map(([k, v]) => [k, join(casesDir, dir, v)]));
      const out = run(r.command, args);
      assert.equal(out.verdict, r.verdict);
      assert.deepEqual(out.checks.filter(c => !c.pass).map(c => c.id), r.failing);
      for (const c of out.checks) assert.match(c.control, /^CK-[A-Z]{2}-0\d$/);
    });
  }
}

test('CLI exit codes: 0 for PASS, 1 for FAIL, 2 for bad input', () => {
  const cli = join(root, 'tools/codokey-check.mjs');
  const a = join(casesDir, 'a-secrets-access');
  execFileSync('node', [cli, 'secrets-access', '--repo', join(a, 'repo'), '--agent', join(a, 'agent-config.governed.json')]);
  assert.throws(() => execFileSync('node', [cli, 'secrets-access', '--repo', join(a, 'repo'), '--agent', join(a, 'agent-config.ungoverned.json')], { stdio: 'pipe' }), e => e.status === 1);
  assert.throws(() => execFileSync('node', [cli, 'no-such-case'], { stdio: 'pipe' }), e => e.status === 2);
});

test('glob semantics used by deny rules', () => {
  assert.ok(globToRegExp('.env').test('.env'));
  assert.ok(globToRegExp('.env').test('nested/dir/.env'));
  assert.ok(!globToRegExp('.env').test('.env.example'));
  assert.ok(globToRegExp('*.pem').test('config/deploy_key.pem'));
  assert.ok(globToRegExp('.github/workflows/**').test('.github/workflows/deploy.yml'));
  assert.ok(!globToRegExp('config/*.ini').test('other/config/settings.ini'));
});

test('Case A heuristics: example templates are not secret-bearing; fixtures are', () => {
  const files = findSecretBearingFiles(join(casesDir, 'a-secrets-access/repo'));
  assert.deepEqual(files, ['.env', 'config/deploy_key.pem', 'config/settings.ini']);
});

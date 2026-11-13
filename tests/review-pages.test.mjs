// Review pages are public, usable, and must not quietly store or submit findings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const sec = readFileSync(join(ROOT, 'review/security-challenge/index.html'), 'utf8');
const score = readFileSync(join(ROOT, 'review/scorecard-challenge/index.html'), 'utf8');
const hub = readFileSync(join(ROOT, 'review/index.html'), 'utf8');
const script = readFileSync(join(ROOT, 'assets/js/reviewer-forms.js'), 'utf8');

test('review hub links clearly to both guided tracks', () => {
  assert.match(hub, /href="\/review\/security-challenge\/"/);
  assert.match(hub, /href="\/review\/scorecard-challenge\/"/);
});

test('security and scorecard routes have unique, non-certifying headings and expected question counts', () => {
  assert.equal([...sec.matchAll(/data-review-question data-id=/g)].length, 4);
  assert.equal([...score.matchAll(/data-review-question data-id=/g)].length, 6);
  for (const html of [sec, score]) {
    assert.match(html, /nothing is submitted automatically/);
    assert.match(html, /No independent review is recorded yet/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /assets\/js\/reviewer-forms\.js/);
    assert.match(html, /id="reviewGenerate" disabled/);
    assert.match(html, /github\.com\/Sohadot\/Codokey\/issues\/new/);
  }
});

test('browser worksheet contains no network submission or hidden tracking API', () => {
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.match(script, /report\.textContent = buildReport\(\)/);
  assert.match(script, /navigator\.clipboard\.writeText/);
});

test('scorecard questions follow the source-of-truth model counts', () => {
  assert.match(score, /18 critical, 11 high, and 3 medium controls/);
  assert.match(score, /all 32 controls/);
});

const commands = [...sec.matchAll(/<pre class="review-command"><code>([\s\S]*?)<\/code><\/pre>/g)]
  .flatMap(m => [...m[1].matchAll(/# expect (PASS|FAIL)\n(node tools\/codokey-check\.mjs [^\n]+)/g)]
    .map(([, expected, command]) => [expected, command]));

test('the security worksheet provides exactly four passing and four failing synthetic commands', () => {
  assert.equal(commands.length, 8);
  assert.equal(commands.filter(c => c[0] === 'PASS').length, 4);
  assert.equal(commands.filter(c => c[0] === 'FAIL').length, 4);
});

for (const [expected, command] of commands) {
  test(`security worksheet command returns ${expected}: ${command.slice(0, 85)}`, () => {
    const run = spawnSync('sh', ['-c', command], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(run.status, expected === 'PASS' ? 0 : 1, run.stdout + '\n' + run.stderr);
  });
}

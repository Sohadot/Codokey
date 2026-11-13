// Browser checks for both public reviewer worksheets, including actual report output.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = new URL('../..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain' };
const server = createServer((req, res) => {
  let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CODOKEY_CHROMIUM_PATH
  ? { executablePath: process.env.CODOKEY_CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const requests = [];
await ctx.route('**/*', route => {
  const u = new URL(route.request().url());
  if (u.hostname === '127.0.0.1') return route.continue();
  requests.push(u.hostname);
  return route.abort();
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; }
}

await test('review hub links to both public test pages', async () => {
  await page.goto(base + '/review/');
  assert.equal(await page.locator('a.review-track').count(), 2);
  await page.locator('a[href="/review/security-challenge/"]').first().click();
  assert.ok((await page.title()).startsWith('Security Challenge'));
});

await test('security: initial state offers choices without claiming a test ran', async () => {
  assert.equal(await page.locator('[data-review-question]').count(), 4);
  assert.ok(await page.locator('#reviewGenerate').isDisabled());
  assert.equal(await page.locator('#reviewProgress').innerText(), '0 of 4 sections answered');
  assert.equal(await page.locator('#reviewResult').isHidden(), true);
  assert.match(await page.locator('.review-privacy').innerText(), /nothing is submitted automatically/i);
});

await test('security: answer, report, result and copy reflect exact judgments', async () => {
  await page.locator('input[name="decision-A"][value="false-safe"]').check();
  await page.locator('#review-note-A').fill('Unsafe configuration passed when subprocesses still had access.');
  await page.locator('#reviewMethod').selectOption('source-inspection');
  await page.locator('#reviewRevision').fill('887ec77');
  assert.equal(await page.locator('#reviewProgress').innerText(), '1 of 4 sections answered');
  await page.locator('#reviewGenerate').click();
  const output = await page.locator('#reviewReportText').innerText();
  assert.match(output, /Potential false-safe result/);
  assert.match(output, /887ec77/);
  assert.match(output, /Unsafe configuration passed/);
  assert.match(output, /B — Excessive agent authority\nJudgment: Unanswered/);
  assert.match(output, /SELF-REPORTED/);
  assert.match(await page.locator('#reviewResult').innerText(), /has not been submitted or saved/i);
  await page.locator('#reviewCopy').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), output);
});

await test('security: download emits actual report text, then changes invalidate stale report', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#reviewDownload').click()]);
  assert.equal(download.suggestedFilename(), 'codokey-security-review.txt');
  assert.match(readFileSync(await download.path(), 'utf8'), /Unsafe configuration passed/);
  await page.locator('input[name="decision-B"][value="no-issue"]').check();
  assert.equal(await page.locator('#reviewResult').isHidden(), true);
  assert.equal(await page.locator('#reviewProgress').innerText(), '2 of 4 sections answered');
  await page.locator('#reviewReset').click();
  await page.waitForFunction(() => document.getElementById('reviewGenerate').disabled);
  assert.ok(await page.locator('#reviewGenerate').isDisabled());
  assert.equal(await page.locator('#reviewProgress').innerText(), '0 of 4 sections answered');
});

await test('security: command buttons copy reproducible examples', async () => {
  await page.locator('.review-repro').first().locator('summary').click();
  await page.locator('[data-copy-command]').first().click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /node tools\/codokey-check\.mjs secrets-access/);
});

await test('scorecard: six scoped questions and report generated locally', async () => {
  await page.goto(base + '/review/scorecard-challenge/');
  assert.match(await page.title(), /^Scorecard Challenge/);
  assert.equal(await page.locator('[data-review-question]').count(), 6);
  await page.locator('input[name="decision-S3"][value="challenge"]').check();
  await page.locator('#review-note-S3').fill('Majority threshold needs a stronger rationale.');
  await page.locator('#reviewGenerate').click();
  assert.match(await page.locator('#reviewReportText').innerText(), /S3 — Critical-majority threshold\nJudgment: I challenge this decision/);
  assert.match(await page.locator('#reviewReportText').innerText(), /Majority threshold needs/);
  assert.match(await page.locator('a.review-send-link').first().getAttribute('href'), /github\.com\/Sohadot\/Codokey\/issues\/new/);
});

await test('both review routes are readable at 360px without sideways scrolling', async () => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ['/review/security-challenge/', '/review/scorecard-challenge/']) {
    await page.goto(base + path);
    assert.ok(await page.locator('h1').isVisible(), path);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, path);
  }
});

await test('no JS errors or unapproved external submissions', async () => {
  assert.deepEqual(errors, []);
  assert.deepEqual([...new Set(requests)].filter(h => !['fonts.googleapis.com', 'fonts.gstatic.com'].includes(h)), []);
});

await browser.close();
server.close();
console.log(`\n${passed} guided-review UI checks passed${process.exitCode ? ', some FAILED' : ''}`);

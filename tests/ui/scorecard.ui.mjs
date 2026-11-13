// Browser test for the scorecard UI and responsive layout.
// Requires Playwright with Chromium (`require('playwright')`). Run: node tests/ui/scorecard.ui.mjs
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { validate } from '../lib/json-schema-subset.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const M = require('../../assets/js/scorecard-model.js');
const ROOT = new URL('../..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain', '.csv': 'text/csv', '.xml': 'application/xml' };

const server = createServer((req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let passed = 0;
async function t(name, fn) { try { await fn(); passed++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
const external = [];
await ctx.route('**/*', route => {
  const u = new URL(route.request().url());
  if (u.hostname === '127.0.0.1') return route.continue();
  external.push(u.hostname);
  return route.abort(); // fonts etc. — keep the test offline and detect unexpected hosts
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + '/governance-scorecard/');

const text = id => page.locator('#' + id).innerText();
const setStatus = (id, v) => page.locator(`input[name="st-${id}"][value="${v}"]`).check();
async function setAll(v) {
  await page.evaluate(v => { document.querySelectorAll(`input[type=radio][value="${v}"]`).forEach(r => { r.checked = true; }); document.getElementById('scorecardForm').dispatchEvent(new Event('change')); }, v);
}
async function domMatchesModel() {
  const statuses = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('fieldset.ctl')].map(f => [f.id, f.querySelector('input:checked').value])));
  const r = M.evaluate(statuses);
  assert.equal(await text('cntPass'), String(r.counts.pass));
  assert.equal(await text('cntFail'), String(r.counts.fail));
  assert.equal(await text('cntUnknown'), String(r.counts.unknown));
  const shown = await text('scGrade');
  assert.equal(shown, r.state === 'determined' ? r.grade : r.state === 'provisional' ? '?' : '—');
  const risks = await page.locator('#scRisks li a').allInnerTexts();
  assert.deepEqual(risks, r.primaryRisks);
  for (const [id, s] of Object.entries(r.statuses)) assert.equal(await page.locator('#' + id).getAttribute('data-status'), s);
  return r;
}

await t('initial state: not assessed, no grade, export disabled', async () => {
  assert.equal(await text('scGrade'), '—');
  assert.equal(await text('scTitle'), 'Not assessed');
  assert.equal(await text('cntUnknown'), '32');
  assert.ok(await page.locator('#scExport').isDisabled());
  assert.equal(await page.locator('fieldset.ctl').count(), 32);
  await domMatchesModel();
});

await t('top file-tab navigation is visible (not covered by footer nav)', async () => {
  const hit = await page.evaluate(() => { const el = document.elementFromPoint(60, 20); return el && el.closest('body > nav') ? true : false; });
  assert.ok(hit, 'element at top of viewport should belong to the top navigation');
  assert.equal(await page.locator('footer .footer-nav').evaluate(n => getComputedStyle(n).position), 'static');
});

await t('keyboard: radios reachable and operable with arrow keys', async () => {
  await page.locator('input[name="st-CK-OR-01"][value="unknown"]').focus();
  await page.keyboard.press('ArrowUp'); // moves selection to previous option: "fail"
  assert.equal(await page.locator('input[name="st-CK-OR-01"]:checked').getAttribute('value'), 'fail');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('input[name="st-CK-OR-01"]:checked').getAttribute('value'), 'pass');
  const r = await domMatchesModel();
  assert.equal(r.state, 'provisional');
  // details disclosure is keyboard operable
  await page.locator('#CK-OR-01 summary').focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#CK-OR-01 details').evaluate(d => d.open));
});

await t('all implemented → A+', async () => {
  await setAll('pass');
  assert.equal(await text('scGrade'), 'A+');
  assert.equal((await domMatchesModel()).grade, 'A+');
});

await t('97% implemented with one critical failure → B, risk listed with remediation as next action', async () => {
  await setStatus('CK-KE-03', 'fail');
  assert.equal(await text('scGrade'), 'B');
  assert.match(await text('scNext'), /^CK-KE-03:/);
  await domMatchesModel();
});

await t('forbidden-zone failure → C, gate shows failure', async () => {
  await setStatus('CK-DC-01', 'fail');
  assert.equal(await text('scGrade'), 'C');
  assert.match(await text('gateFz'), /FAILED — CK-DC-01/);
  const r = await domMatchesModel();
  assert.equal(r.primaryRisks[0], 'CK-DC-01');
});

await t('critical control unassessed → provisional "?" with range, never A+', async () => {
  await setAll('pass');
  await setStatus('CK-AM-01', 'unknown');
  assert.equal(await text('scGrade'), '?');
  assert.match(await text('scTitle'), /Provisional — range B to A\+/);
  await domMatchesModel();
});

await t('export produces model-consistent JSON including notes', async () => {
  await page.locator('#CK-OR-02 summary').click();
  await page.locator('#note-CK-OR-02').fill('app:example-agent inventory 2026-11');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#scExport').click()]);
  const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  assert.equal(data.modelVersion, M.MODEL_VERSION);
  assert.equal(data.summary.state, 'provisional');
  assert.equal(data.controls.find(c => c.id === 'CK-OR-02').evidenceNote, 'app:example-agent inventory 2026-11');
  assert.equal(data.controls.find(c => c.id === 'CK-AM-01').status, 'unknown');
  // The downloaded file validates against the schema its $schema field names, served by this site.
  const schemaRes = await page.request.get(base + new URL(data.$schema).pathname);
  assert.equal(schemaRes.status(), 200);
  assert.deepEqual(validate(await schemaRes.json(), data), []);
});

await t('reset clears answers', async () => {
  page.once('dialog', d => d.accept());
  await page.locator('#scReset').click();
  assert.equal(await text('scGrade'), '—');
  await domMatchesModel();
});

await t('no page errors and no requests to unexpected hosts', async () => {
  assert.deepEqual(errors, []);
  const unexpected = external.filter(h => !['fonts.googleapis.com', 'fonts.gstatic.com'].includes(h));
  assert.deepEqual(unexpected, []);
});

const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const paths = [...sitemap.matchAll(/<loc>https:\/\/codokey\.com(\/[^<]*)<\/loc>/g)].map(m => m[1]);
await t(`responsive: no horizontal page overflow at 360px on ${paths.length} sitemap pages`, async () => {
  const mobile = await ctx.newPage();
  await mobile.setViewportSize({ width: 360, height: 740 });
  const bad = [];
  for (const p of paths) {
    await mobile.goto(base + p);
    const o = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (o > 1) bad.push(`${p} (+${o}px)`);
  }
  assert.deepEqual(bad, []);
});

await browser.close();
server.close();
console.log(`\n${passed} UI checks passed${process.exitCode ? ', some FAILED' : ''}`);

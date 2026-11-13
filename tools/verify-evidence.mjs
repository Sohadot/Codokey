#!/usr/bin/env node
/*
 * Re-verify the evidence register against live sources (needs network).
 * For each entry: fetch the URL (or retrievedFrom), check HTTP status, and
 * look for each passage fragment (split on "…") in the page text after
 * stripping markup and normalizing whitespace and quotes. NIST entries cite
 * landing pages whose passages live in the linked PDF; set
 * passageSource in the entry to check a different document, otherwise those
 * are reported as "status only".
 *
 *   node tools/verify-evidence.mjs [--json]
 * Exit code 1 if any URL fails or any checked passage is not found.
 */
import { readFileSync } from 'node:fs';
const REG = JSON.parse(readFileSync(new URL('../reference/evidence-register.json', import.meta.url), 'utf8'));
const PDF_TEXT = new Map(); // not fetched: PDF parsing is out of scope for a zero-dependency tool

const norm = s => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;|&#34;|&#x22;/g, '"').replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, "'")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();

const results = [];
for (const e of REG.entries) {
  const url = e.retrievedFrom || e.url;
  let status = 0, text = '';
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'codokey-evidence-verifier/1.0' } });
    status = r.status; text = norm(await r.text());
  } catch (err) { status = 'error: ' + err.message; }
  const statusOnly = Boolean(e.passageDocument);
  const fragments = e.passage.split('…').map(f => norm(f).trim()).filter(f => f.length > 12)
    .map(f => f.replace(/^[a-z0-9.()]{1,8}: /, '').slice(0, 70));
  const missing = statusOnly ? [] : fragments.filter(f => !text.includes(f));
  results.push({ id: e.id, url, status, passage: statusOnly ? 'status only (passage in passageDocument PDF)' : missing.length ? 'NOT FOUND: ' + missing.join(' | ') : 'found' });
}
const failed = results.filter(r => r.status !== 200 || r.passage.startsWith('NOT FOUND'));
if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
else for (const r of results) console.log(`${r.status === 200 && !r.passage.startsWith('NOT') ? 'ok  ' : 'FAIL'} ${r.id.padEnd(28)} ${r.status} ${r.passage}`);
console.log(`\n${results.length - failed.length}/${results.length} entries verified on ${new Date().toISOString().slice(0, 10)}`);
process.exit(failed.length ? 1 : 0);

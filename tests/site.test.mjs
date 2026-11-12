// Static site integrity: canonicals, sitemap, internal links and anchors,
// navigation, structured data, version consistency, prohibited claims, and
// a repository secret-pattern scan. Runs offline with no dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;
const BASE = 'https://codokey.com';
const VERSIONS = JSON.parse(readFileSync(join(ROOT, 'reference/versions.json'), 'utf8'));
const M = require('../assets/js/scorecard-model.js');
const REG = JSON.parse(readFileSync(join(ROOT, 'reference/evidence-register.json'), 'utf8'));

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const pages = files.filter(f => f.endsWith('index.html') && !relative(ROOT, f).startsWith('cases' + sep)).map(f => {
  const rel = relative(ROOT, dirname(f)).split(sep).join('/');
  return { file: f, path: rel ? `/${rel}/` : '/', html: readFileSync(f, 'utf8') };
});
const meta = (html, re) => (html.match(re) || [])[1];
const indexable = pages.filter(p => /<meta name="robots" content="index/.test(p.html));
const isPrint = p => p.path.startsWith('/briefs/') && p.path !== '/briefs/';

test('every page has title, description, robots; indexable pages have a self canonical', () => {
  for (const p of pages) {
    assert.ok(meta(p.html, /<title>([^<]+)<\/title>/), p.path + ' title');
    assert.ok(meta(p.html, /<meta name="robots" content="([^"]+)"/), p.path + ' robots');
    if (indexable.includes(p)) {
      assert.ok(meta(p.html, /<meta name="description" content="([^"]+)"/), p.path + ' description');
      assert.equal(meta(p.html, /<link rel="canonical" href="([^"]+)"/), BASE + p.path, p.path + ' canonical');
      assert.equal(meta(p.html, /<meta property="og:url" content="([^"]+)"/), BASE + p.path, p.path + ' og:url');
    }
  }
});

test('indexable titles and descriptions are unique', () => {
  const t = indexable.map(p => meta(p.html, /<title>([^<]+)<\/title>/));
  const d = indexable.map(p => meta(p.html, /<meta name="description" content="([^"]+)"/));
  assert.equal(new Set(t).size, t.length, 'duplicate titles');
  assert.equal(new Set(d).size, d.length, 'duplicate descriptions');
});

test('sitemap lists exactly the indexable pages, and robots.txt points to it', () => {
  const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).sort();
  assert.deepEqual(locs, indexable.map(p => BASE + p.path).sort());
  assert.match(readFileSync(join(ROOT, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/codokey\.com\/sitemap\.xml/);
  for (const p of pages.filter(isPrint)) assert.ok(!locs.includes(BASE + p.path), 'noindex print brief in sitemap: ' + p.path);
});

const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
test('all internal links and same-site anchors resolve', () => {
  const broken = [];
  const pageByPath = Object.fromEntries(pages.map(p => [p.path, p]));
  for (const p of pages) {
    for (const [, href] of p.html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [pathPart, hash] = href.split('#');
      const target = pathPart === '' ? p.path : pathPart;
      if (!target.startsWith('/')) { broken.push(`${p.path} → ${href} (relative link)`); continue; }
      const fsPath = join(ROOT, target);
      const ok = target.endsWith('/') ? existsSync(join(fsPath, 'index.html')) : existsSync(fsPath);
      if (!ok) { broken.push(`${p.path} → ${href}`); continue; }
      if (hash && target.endsWith('/')) {
        const tp = pageByPath[target];
        if (tp && !idsOf(tp.html).has(hash)) broken.push(`${p.path} → ${href} (missing #${hash})`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test('non-print pages share the same footer navigation and site version badge', () => {
  let reference = null;
  for (const p of pages.filter(p => !isPrint(p))) {
    const nav = meta(p.html, /<nav class="footer-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(nav, p.path + ' footer nav');
    const links = [...nav.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    reference ??= links;
    assert.deepEqual(links, reference, p.path);
    assert.ok(links.includes(p.path) || p.path.startsWith('/protocol/'), p.path + ' should be reachable from footer');
    assert.match(p.html, new RegExp(`<div class="nav-badge"[^>]*>site v${VERSIONS.site.replace('.', '\\.')}</div>`), p.path + ' badge');
  }
});

test('JSON-LD blocks parse', () => {
  for (const p of pages) for (const [, j] of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(j);
});

test('versions are consistent across model, register, validator and pages', async () => {
  const { CHECK_VERSION } = await import('../tools/codokey-check.mjs');
  assert.equal(M.MODEL_VERSION, VERSIONS.scorecardModel);
  assert.equal(M.PROTOCOL_VERSION, VERSIONS.protocol);
  assert.equal(REG.version, VERSIONS.evidenceRegister);
  assert.equal(CHECK_VERSION, VERSIONS.validator);
  for (const p of pages.filter(p => !isPrint(p))) {
    assert.doesNotMatch(p.html, /Protocol v1\.0|Scorecard v1\.0|model v1\./, p.path + ' stale version label');
    assert.doesNotMatch(p.html, /· v1\.[34]</, p.path + ' sprint number used as version');
  }
  assert.match(readFileSync(join(ROOT, 'CODOKEY_PROTOCOL.md'), 'utf8'), new RegExp(`\\*\\*Version:\\*\\* ${VERSIONS.protocol}`));
});

test('no prohibited or unsupported claims on public pages', () => {
  const prohibited = [/\bcertified\b/i, /\bcompliant\b/i, /free trial/i, /sign up/i, /we scan your/i, /scanning sample codebase/i, /Evidence Room/, /canonical reference model/i, /−0 competing definitions/, /independently (verified|validated|reviewed) by/i, /endorsed by/i];
  for (const p of pages) for (const re of prohibited) assert.doesNotMatch(p.html, re, `${p.path}: ${re}`);
});

test('generated files are up to date (tools/build.mjs --check)', () => {
  execFileSync('node', [join(ROOT, 'tools/build.mjs'), '--check'], { stdio: 'pipe' });
});

test('repository contains no real-looking secrets; fixtures are marked synthetic', () => {
  const patterns = [/AKIA[0-9A-Z]{16}/, /gh[pousr]_[A-Za-z0-9]{36}/, /github_pat_[A-Za-z0-9_]{40,}/, /xox[baprs]-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bsk-[A-Za-z0-9]{32,}/, /AIza[0-9A-Za-z_-]{35}/];
  const textFiles = files.filter(f => !/\.(png|jpg|ico|woff2?)$/.test(f));
  const hits = [];
  for (const f of textFiles) {
    const s = readFileSync(f, 'utf8');
    for (const re of patterns) if (re.test(s)) hits.push(`${relative(ROOT, f)}: ${re}`);
  }
  assert.deepEqual(hits, []);
  for (const f of ['cases/a-secrets-access/repo/.env', 'cases/a-secrets-access/repo/config/settings.ini', 'cases/a-secrets-access/repo/config/deploy_key.pem']) {
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /SYNTHETIC FIXTURE/);
  }
});

test('no operative license has been published (owner has not approved LICENSING_PROPOSAL.md)', () => {
  const licenseFiles = files.map(f => relative(ROOT, f)).filter(f => /^(LICEN[CS]E|COPYING)(\.|$)|^LICENSES\//i.test(f));
  assert.deepEqual(licenseFiles, []);
  for (const f of files.filter(f => /\.(mjs|js|md|json|html|css)$/.test(f) && !f.endsWith('site.test.mjs'))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /SPDX-License-Identifier/, relative(ROOT, f));
  }
  assert.match(readFileSync(join(ROOT, 'LICENSING_PROPOSAL.md'), 'utf8'), /This document grants no rights to anyone/);
});

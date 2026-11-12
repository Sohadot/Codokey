#!/usr/bin/env node
/*
 * Codokey site generator (zero dependencies).
 *
 * The site deploys as static files with no build step; this script is a
 * maintenance tool. It renders pages whose content comes from structured
 * sources — the scorecard model, the evidence register, the layer specs and
 * the reference cases — so those pages cannot drift from their sources, and
 * it normalizes shared chrome (footer navigation, version badge, social image)
 * on hand-written pages.
 *
 *   node tools/build.mjs          write generated files
 *   node tools/build.mjs --check  exit 1 if any generated file is out of date
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
import { LAYER_SPECS } from './content/layers.mjs';
import { CASES } from './content/cases.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(new URL(import.meta.url).pathname), '..');
const M = require(join(ROOT, 'assets/js/scorecard-model.js'));
const REG = JSON.parse(readFileSync(join(ROOT, 'reference/evidence-register.json'), 'utf8'));
const VERSIONS = JSON.parse(readFileSync(join(ROOT, 'reference/versions.json'), 'utf8'));
const SITE_VERSION = VERSIONS.site;
const BUILD_DATE = VERSIONS.released;
const BASE = 'https://codokey.com';
const CHECK = process.argv.includes('--check');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const evById = Object.fromEntries(REG.entries.map(e => [e.id, e]));
const layerById = Object.fromEntries(M.LAYERS.map(l => [l.id, l]));
const LAYER_COLOR = { OR: 'var(--cyan)', KE: 'var(--removed-bar)', AA: 'var(--purple)', RB: 'var(--yellow)', DC: 'var(--added-bar)', AM: 'var(--acid)' };
const SEV_CLASS = { critical: 'sev-c', high: 'sev-h', medium: 'sev-m' };
const cap = s => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- chrome
export const FOOTER_LINKS = [
  ['/', 'Home'], ['/category/', 'Category'], ['/charter/', 'Charter'], ['/protocol/', 'Protocol'],
  ['/secrets-boundary/', 'Secrets Boundary'], ['/agent-permissions/', 'Agent Permissions'],
  ['/governance-scorecard/', 'Scorecard'], ['/reference-cases/', 'Reference Cases'], ['/reference-kit/', 'Reference Kit'],
  ['/evidence/', 'Evidence Register'], ['/review/', 'Open Review'], ['/cost-of-inaction/', 'Cost of Inaction'],
  ['/buyer-logic/', 'Buyer Logic'], ['/briefs/', 'Briefs'], ['/strategic-inquiries/', 'Strategic Inquiries']
];
const NAV_TABS = [
  ['/', 'codokey.com'], ['/charter/', 'charter.md'], ['/protocol/', 'protocol.md'],
  ['/secrets-boundary/', 'secrets-boundary.diff'], ['/agent-permissions/', 'agent-permissions.json'],
  ['/governance-scorecard/', 'governance-scorecard.sh']
];

function footerNav(path) {
  const items = FOOTER_LINKS.map(([href, label]) => `    <a href="${href}"${href === path ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('\n');
  return `<nav class="footer-nav" aria-label="Site navigation">\n${items}\n  </nav>`;
}
const navBadge = () => `<div class="nav-badge" title="Site release">site v${SITE_VERSION}</div>`;

function navTabs(activeTab) {
  return NAV_TABS.map(([href, label]) => `    <a class="nav-tab${href === activeTab ? ' active' : ''}" href="${href}"${href === activeTab ? ' aria-current="page"' : ''}><div class="tab-dot"></div>${label}</a>`).join('\n');
}

function head({ title, description, path, type = 'article', jsonld, robots = 'index, follow' }) {
  const url = BASE + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="Codokey">
<meta property="og:image" content="${BASE}/assets/social-preview.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Codokey — AI Code Access Governance reference model.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${BASE}/assets/social-preview.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/codokey.css">
${jsonld ? `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>\n` : ''}</head>`;
}

function articleLd({ headline, description, path, version, about }) {
  return {
    '@context': 'https://schema.org', '@type': 'TechArticle', headline, description,
    url: BASE + path, version, dateModified: BUILD_DATE, inLanguage: 'en',
    author: { '@type': 'Organization', name: 'Codokey', url: BASE + '/' },
    publisher: { '@type': 'Organization', name: 'Codokey', url: BASE + '/' },
    isPartOf: { '@type': 'WebSite', name: 'Codokey', url: BASE + '/' },
    ...(about ? { about } : {})
  };
}

function page({ title, description, path, activeTab = null, fileHeader, body, footerMeta, footerTag, scripts = [], jsonld, type }) {
  return `${head({ title, description, path, jsonld, type })}
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="cur" id="cur" aria-hidden="true"></div>
<div class="cur-r" id="curR" aria-hidden="true"></div>

<nav aria-label="Reference files">
  <div class="nav-tabs">
${navTabs(activeTab)}
  </div>
  <div class="nav-right">${navBadge()}</div>
</nav>

<main id="main">
  <div class="file-header">
    <div class="file-path"><span>${fileHeader.path}</span><span class="file-name">${fileHeader.name}</span><span class="file-lang">${fileHeader.lang}</span></div>
    <div class="file-stats"><span class="stat-a">${fileHeader.a}</span><span class="stat-r">${fileHeader.r}</span></div>
  </div>
${body}
</main>

<footer class="site-footer">
  <div class="footer-top">
    <a class="footer-logo" href="/">Codo<span>key</span></a>
    <div class="footer-meta">${footerMeta}</div>
    <div class="footer-tag">${footerTag}</div>
  </div>
  ${footerNav(path)}
</footer>

<script src="/assets/js/main.js"></script>
${scripts.map(s => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
}

const evLink = id => `<a href="/evidence/#${id}">${id}</a>`;
const ctlLink = id => `<a href="/governance-scorecard/#${id}">${id}</a>`;
const layerSpecPath = l => `/protocol/${layerById[l].slug}/`;
const sevBadge = c => `<span class="cl-sev ${SEV_CLASS[c.severity]}"><span class="sr-only">Severity: </span>${cap(c.severity)}</span>${c.forbiddenZone ? ` <span class="cl-sev sev-fz" title="${esc(M.FORBIDDEN_ZONES[c.forbiddenZone])}">${c.forbiddenZone}</span>` : ''}`;

// ---------------------------------------------------------------- scorecard page
function renderControl(c) {
  const refs = c.refs.length ? c.refs.map(evLink).join(', ') : 'No external source — Codokey recommendation (claim class 3).';
  const opts = ['pass', 'fail', 'unknown'].map(v =>
    `      <label class="ctl-opt ctl-${v}"><input type="radio" name="st-${c.id}" value="${v}"${v === 'unknown' ? ' checked' : ''}> ${esc(M.STATUS_LABELS[v])}</label>`).join('\n');
  return `    <fieldset class="ctl" id="${c.id}" data-status="unknown">
      <legend class="ctl-head"><span class="ctl-id">${c.id}</span> <span class="ctl-text">${esc(c.title)}</span> ${sevBadge(c)}</legend>
      <div class="ctl-opts">
${opts}
      </div>
      <details class="ctl-more">
        <summary>Evidence, remediation &amp; sources</summary>
        <dl>
          <dt>Acceptable evidence</dt><dd>${esc(c.evidence)}</dd>
          <dt>Remediation</dt><dd>${esc(c.remediation)}</dd>
          <dt>Sources</dt><dd>${refs}</dd>
          <dt>Specification</dt><dd><a href="${layerSpecPath(c.layer)}">Layer ${layerById[c.layer].num} — ${layerById[c.layer].name}</a> · v1.0 check #${c.legacy}</dd>
        </dl>
        <label class="ctl-note-label" for="note-${c.id}">Evidence note (optional — stays in this tab, included in export)</label>
        <textarea class="ctl-note" id="note-${c.id}" name="note-${c.id}" rows="2"></textarea>
      </details>
    </fieldset>`;
}

function scorecardPage() {
  const groups = M.LAYERS.map(l => {
    const ctls = M.CONTROLS.filter(c => c.layer === l.id);
    return `  <section class="cl-file-group" aria-labelledby="grp-${l.id}">
    <div class="cl-fg-header"><span style="color:${LAYER_COLOR[l.id]}" aria-hidden="true">◈</span><h2 class="cl-fg-name" id="grp-${l.id}">${l.num} — ${l.file}</h2><a class="cl-fg-spec" href="${layerSpecPath(l.id)}">${l.name} specification</a><span class="cl-fg-count" id="lc-${l.id}" aria-live="off">${ctls.length} controls</span></div>
${ctls.map(renderControl).join('\n')}
  </section>`;
  }).join('\n');

  const gradeRows = M.GRADE_ORDER.slice().reverse().map(g => `        <tr><th scope="row"><span class="sc-grade-mini ${M.GRADES[g].cls}">${g}</span></th><td>${M.GRADES[g].title}</td><td>${esc(M.GRADES[g].meaning)}</td></tr>`).join('\n');
  const fzRows = Object.entries(M.FORBIDDEN_ZONES).map(([k, v]) => `        <tr><th scope="row">${k}</th><td>${esc(v)}</td><td>${M.CONTROLS.filter(c => c.forbiddenZone === k).map(c => ctlLink(c.id)).join(', ')}</td></tr>`).join('\n');
  const n = s => M.CONTROLS.filter(c => c.severity === s).length;

  const body = `
  <div class="scorecard-disclaimer">
    <strong>Reference self-assessment only.</strong> Not a formal certification, audit, or security assessment, and not a compliance determination. "Implemented" records your own statement that evidence exists; this page does not verify it. Your answers stay in this browser tab — nothing is sent, stored, or tracked; reloading clears them.
  </div>

  <div class="content-wrap sc-intro">
    <h1 class="sc-h1">Governance Scorecard <em>v${M.MODEL_VERSION}</em></h1>
    <p class="content-body">Assess ${M.CONTROLS.length} controls across the six layers of the <a href="/protocol/">Codokey Protocol v${M.PROTOCOL_VERSION}</a>. Each control has three states: <strong>Implemented — evidence available</strong>, <strong>Not implemented</strong>, and <strong>Not assessed</strong> (the default). Unanswered controls are never counted as implemented. Critical controls act as gates: a single failed forbidden-zone control caps the result at C, and A+ requires every control to be implemented.</p>
  </div>

  <div class="diff-summary-bar">
    <span class="dsb-label">Assessment coverage</span>
    <div class="dsb-bar" aria-hidden="true"><div class="dsb-fill" id="pFill" style="width:0%"></div></div>
    <span class="dsb-count" id="pCount">0 / ${M.CONTROLS.length} assessed</span>
    <span class="dsb-hint">Use Tab / arrow keys or click to answer</span>
  </div>

  <p class="sc-js-required" id="scJsRequired">The result panel needs JavaScript. Without it you can still read every control, its evidence expectations, and the methodology below.</p>

  <section class="scorecard-output" id="scorecardOut" hidden aria-labelledby="scTitle">
    <div class="sc-bar" aria-live="polite" aria-atomic="true">
      <div class="sc-grade grade-pending" id="scGrade" role="img" aria-label="Not assessed">—</div>
      <div class="sc-info">
        <h2 class="sc-title" id="scTitle">Not assessed</h2>
        <p class="sc-subtitle" id="scSub"></p>
      </div>
      <dl class="sc-counts">
        <div><dt>Implemented</dt><dd id="cntPass">0</dd></div>
        <div><dt>Not implemented</dt><dd id="cntFail">0</dd></div>
        <div><dt>Not assessed</dt><dd id="cntUnknown">${M.CONTROLS.length}</dd></div>
      </dl>
    </div>
    <div class="sc-details">
      <table class="sc-gates">
        <caption>Gates</caption>
        <tr><th scope="row">Forbidden zones (4 controls)</th><td id="gateFz">unverified</td></tr>
        <tr><th scope="row">Critical controls (${n('critical')})</th><td id="gateCrit"></td></tr>
        <tr><th scope="row">A+ requirement</th><td id="gateAp"></td></tr>
        <tr><th scope="row">Coverage</th><td id="scCoverage">0% assessed</td></tr>
      </table>
      <div class="sc-lists">
        <div><h3 class="sc-list-h">Primary unresolved risks</h3><ol id="scRisks" class="sc-list"></ol></div>
        <div><h3 class="sc-list-h">Verify next (not yet assessed)</h3><ol id="scVerify" class="sc-list"></ol></div>
      </div>
      <p class="sc-detail"><span class="sd-label">Next action:</span> <span class="sd-val" id="scNext"></span></p>
      <div class="sc-actions">
        <button type="button" class="btn-p" id="scExport" disabled>Export assessment (JSON)</button>
        <button type="button" class="btn-g" id="scReset">Reset</button>
      </div>
    </div>
  </section>

  <form id="scorecardForm" class="sc-form" onsubmit="return false" aria-label="Governance controls">
${groups}
  </form>

  <section class="content-wrap" id="methodology" aria-labelledby="meth-h">
    <div class="content-section">
      <div class="charter-label">Methodology · model v${M.MODEL_VERSION}</div>
      <h2 class="charter-heading" id="meth-h">How the result is calculated</h2>
      <div class="content-body">
        <p><strong>No weights, no percentages in the grade.</strong> The grade is decided by gates on control status, not by the share of boxes ticked. Severity determines which gates a control participates in and the order of the gap list. The full specification, rationale, and test cases are in <a href="/SCORING.md">SCORING.md</a>.</p>
        <ol>
          <li>Every control starts as <em>Not assessed</em>. Only an explicit "Implemented" answer counts as implemented.</li>
          <li>The model computes two bounding grades: a <strong>floor</strong> (every unassessed control treated as not implemented) and a <strong>ceiling</strong> (every unassessed control treated as implemented).</li>
          <li>If floor and ceiling are equal, the grade is <strong>determined</strong> — known failures already settle it. Otherwise the result is <strong>provisional</strong> and no grade is stated, only the range. With nothing answered, the result is <strong>not assessed</strong>.</li>
          <li>Gaps are listed from your answers: forbidden-zone failures first, then critical, high, and medium, in layer order.</li>
        </ol>
      </div>
      <table class="ref-table">
        <caption>Grades (applied to a fully resolved assessment)</caption>
        <thead><tr><th scope="col">Grade</th><th scope="col">Name</th><th scope="col">Condition</th></tr></thead>
        <tbody>
${gradeRows}
        </tbody>
      </table>
      <table class="ref-table">
        <caption>Forbidden-zone gates — a failed control caps the grade at C</caption>
        <thead><tr><th scope="col">Zone</th><th scope="col">Description</th><th scope="col">Controls</th></tr></thead>
        <tbody>
${fzRows}
        </tbody>
      </table>
      <div class="content-body">
        <p><strong>Why "more than half of critical controls" for C.</strong> With ${n('critical')} critical controls, a majority unimplemented means most of the boundary the protocol defines is absent. This threshold is a Codokey judgment, documented as such; reviewers are invited to challenge it via <a href="/review/">Open Review</a>.</p>
        <p><strong>Changed from v1.0.</strong> v1.0 graded by percentage of ticked checks (A+ at 85%), so up to four critical checks could be unresolved at A+, and an untouched scorecard displayed "C — Ungoverned". v2.0 removes both behaviors. Grades from v1.0 are not comparable with v2.0 grades. Two checks were reworded for technical accuracy (#2 now addresses agent identity rather than duplicating #17; #6 now prefers server-side push protection over bypassable client hooks); all others keep their intent. See SCORING.md for the mapping.</p>
        <p><strong>Limitations.</strong> The result reflects the assessor's answers. It does not inspect any system, cannot detect inaccurate answers, and says nothing about controls outside these ${M.CONTROLS.length}. Severity assignments are Codokey judgments that have not been externally reviewed.</p>
      </div>
    </div>
  </section>

  <div class="internal-links">
    <div class="internal-links-title">Apply the result</div>
    <div class="internal-links-grid">
      <a href="/reference-kit/">Reference Kit — templates for each gap</a>
      <a href="/reference-cases/">Reference Cases — reproducible checks</a>
      <a href="/evidence/">Evidence Register — sources behind each control</a>
      <a href="/protocol/">Codokey Protocol v${M.PROTOCOL_VERSION}</a>
    </div>
  </div>
`;
  return page({
    title: `Governance Scorecard v${M.MODEL_VERSION} — AI Code Access Self-Assessment`,
    description: `Evidence-aware self-assessment of ${M.CONTROLS.length} AI Code Access Governance controls with critical-control gates, explicit "not assessed" handling and a gap list. Runs locally; not certification.`,
    path: '/governance-scorecard/', activeTab: '/governance-scorecard/', type: 'website',
    jsonld: { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Codokey Governance Scorecard', applicationCategory: 'SecurityApplication', operatingSystem: 'Any (web browser)', softwareVersion: M.MODEL_VERSION, url: BASE + '/governance-scorecard/', isAccessibleForFree: true, description: 'Local, browser-only self-assessment against the Codokey Protocol. Not certification.' },
    fileHeader: { path: 'codokey / audit /', name: 'governance-scorecard.sh', lang: `MODEL v${M.MODEL_VERSION}`, a: '<span id="doneCount">+0 implemented</span>', r: `<span id="remainCount">−0 not · ${M.CONTROLS.length} unassessed</span>` },
    body, footerMeta: `Governance Scorecard · model v${M.MODEL_VERSION} · ${M.CONTROLS.length} controls · Self-assessment reference`, footerTag: 'Self-Assessment',
    scripts: ['/assets/js/scorecard-model.js', '/assets/js/scorecard.js']
  });
}

// ---------------------------------------------------------------- layer spec pages
function codeBlock(ex) {
  return `      <figure class="spec-example">
        <figcaption>${esc(ex.label)}</figcaption>
        <pre class="code-block"><code class="lang-${ex.lang}">${esc(ex.code)}</code></pre>
      </figure>`;
}

function layerPage(l, idx) {
  const s = LAYER_SPECS[l.id];
  const ctls = M.CONTROLS.filter(c => c.layer === l.id);
  const evs = REG.entries.filter(e => e.layers.includes(l.id));
  const prev = M.LAYERS[idx - 1], next = M.LAYERS[idx + 1];
  const path = layerSpecPath(l.id);
  const ctlRows = ctls.map(c => `        <tr id="${c.id}-spec"><th scope="row">${ctlLink(c.id)}</th><td>${esc(c.title)}</td><td>${sevBadge(c)}</td><td>${esc(c.evidence)}</td></tr>`).join('\n');
  const evRows = evs.map(e => `        <li>${evLink(e.id)} — ${esc(e.publisher)}, <cite>${esc(e.title)}</cite>, ${esc(e.section)}. <span class="ev-class">Class ${e.claimClass}</span></li>`).join('\n');
  const body = `
  <article class="content-wrap spec" aria-labelledby="spec-h">
    <p class="spec-breadcrumb"><a href="/protocol/">Codokey Protocol v${M.PROTOCOL_VERSION}</a> / Layer ${l.num}</p>
    <div class="eyebrow">Layer ${l.num} · ${esc(l.tag)} · Reference specification</div>
    <h1 class="spec-h1" id="spec-h">${esc(l.name)}</h1>
    <p class="spec-question">${esc(s.question)}</p>

    <dl class="spec-meta">
      <div><dt>Version</dt><dd>Protocol v${M.PROTOCOL_VERSION} · ${BUILD_DATE}</dd></div>
      <div><dt>Scorecard controls</dt><dd>${ctls.length} (${ctls.filter(c => c.severity === 'critical').length} critical)</dd></div>
      <div><dt>Status</dt><dd>Codokey reference specification — not externally reviewed</dd></div>
    </dl>

    <section class="content-section"><h2 class="spec-h2">Security objective</h2><p class="content-body">${esc(s.objective)}</p></section>
    <section class="content-section"><h2 class="spec-h2">Boundary governed</h2><p class="content-body">${esc(s.boundary)}</p></section>
    <section class="content-section"><h2 class="spec-h2">Failure scenarios</h2>
      <dl class="spec-threats">
${s.threats.map(([t, d]) => `        <dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('\n')}
      </dl>
    </section>
    <section class="content-section"><h2 class="spec-h2">Applicable agent capabilities</h2><p class="content-body">${esc(s.capabilities)}</p></section>
    <section class="content-section"><h2 class="spec-h2">Platform-neutral principles</h2>
      <ul class="spec-list">
${s.principles.map(p => `        <li>${esc(p)}</li>`).join('\n')}
      </ul>
    </section>
    <section class="content-section"><h2 class="spec-h2">Required controls and acceptable evidence</h2>
      <div class="table-scroll"><table class="ref-table">
        <caption>Controls are defined once, in the scorecard model; this table is generated from it.</caption>
        <thead><tr><th scope="col">Control</th><th scope="col">Requirement</th><th scope="col">Severity</th><th scope="col">Acceptable evidence</th></tr></thead>
        <tbody>
${ctlRows}
        </tbody>
      </table></div>
    </section>
    <section class="content-section"><h2 class="spec-h2">Implementation examples</h2>
      <p class="content-body">Examples show one way to implement a control on a specific platform. They are not universally secure configurations; adapt and test them in your environment.</p>
${s.examples.map(codeBlock).join('\n')}
    </section>
    <section class="content-section"><h2 class="spec-h2">Known limitations</h2>
      <ul class="spec-list">
${s.limitations.map(p => `        <li>${esc(p)}</li>`).join('\n')}
      </ul>
    </section>
    <section class="content-section"><h2 class="spec-h2">Remediation path</h2>
      <ol class="spec-list">
${s.remediation.map(p => `        <li>${esc(p)}</li>`).join('\n')}
      </ol>
    </section>
    <section class="content-section"><h2 class="spec-h2">External references</h2>
      <p class="content-body">Claim classes: 1 = directly supported, 2 = Codokey synthesis of the source. See the <a href="/evidence/">Evidence Register</a> for passages and limitations.</p>
      <ul class="spec-list spec-refs">
${evRows}
      </ul>
    </section>
  </article>

  <div class="internal-links">
    <div class="internal-links-title">Continue</div>
    <div class="internal-links-grid">
      ${prev ? `<a href="${layerSpecPath(prev.id)}">← Layer ${prev.num}: ${prev.name}</a>` : '<a href="/protocol/">← Protocol overview</a>'}
      ${next ? `<a href="${layerSpecPath(next.id)}">Layer ${next.num}: ${next.name} →</a>` : '<a href="/reference-cases/">Reference Cases →</a>'}
      <a href="/governance-scorecard/#grp-${l.id}">Assess this layer in the scorecard</a>
      <a href="/reference-kit/">Reference Kit</a>
    </div>
  </div>
`;
  return page({
    title: `${l.name} — Codokey Protocol Layer ${l.num} Specification`,
    description: `${s.question} Objective, failure scenarios, required controls, acceptable evidence, examples and limitations for the ${l.name} layer of AI Code Access Governance.`.slice(0, 300),
    path, activeTab: '/protocol/',
    jsonld: articleLd({ headline: `${l.name} — Codokey Protocol Layer ${l.num}`, description: s.objective, path, version: M.PROTOCOL_VERSION }),
    fileHeader: { path: 'codokey / protocol /', name: `${String(idx + 1).padStart(2, '0')}-${l.slug}.md`, lang: `LAYER ${l.num} · v${M.PROTOCOL_VERSION}`, a: `+${ctls.length} controls`, r: `−${s.threats.length} failure scenarios` },
    body, footerMeta: `Codokey Protocol v${M.PROTOCOL_VERSION} · Layer ${l.num} · ${l.name}`, footerTag: 'Specification'
  });
}

// ---------------------------------------------------------------- evidence page
function evidencePage() {
  const cards = REG.entries.map(e => `    <article class="ev-card" id="${e.id}" aria-labelledby="${e.id}-h">
      <h3 class="ev-id" id="${e.id}-h">${e.id} <span class="ev-class">Class ${e.claimClass}</span></h3>
      <p class="ev-src"><cite>${esc(e.title)}</cite> — ${esc(e.publisher)} · ${esc(e.date)}</p>
      <p class="ev-src"><a href="${esc(e.url)}" rel="noopener">${esc(e.url)}</a> · ${esc(e.section)}</p>
      <blockquote class="ev-quote">${esc(e.passage)}</blockquote>
      <dl class="ev-dl">
        <dt>Supports</dt><dd>${esc(e.supports)}</dd>
        <dt>Codokey application</dt><dd>${esc(e.codokeyApplication)}</dd>
        <dt>Limitations</dt><dd>${esc(e.limitations)}</dd>
        <dt>Layers · controls</dt><dd>${e.layers.map(x => `<a href="${layerSpecPath(x)}">${layerById[x].name}</a>`).join(', ')} · ${e.controls.map(ctlLink).join(', ')}</dd>
        <dt>Verified</dt><dd>${REG.verifiedOn}</dd>
      </dl>
    </article>`).join('\n');
  const claims = REG.codokeyClaims.map(c => `        <tr><td>${esc(c.claim)}</td><td>${c.claimClass}</td><td>${c.evidence.length ? c.evidence.map(evLink).join(', ') : '—'}</td><td>${esc(c.note)}</td></tr>`).join('\n');
  const body = `
  <div class="content-wrap">
    <div class="eyebrow">Evidence Register v${REG.version} · verified ${REG.verifiedOn}</div>
    <h1 class="spec-h1">Evidence Register</h1>
    <p class="content-body">Every external source that Codokey relies on, with the exact passage, what it supports, and what it does not. Use it to check a claim rather than trust it. The machine-readable register is at <a href="/reference/evidence-register.json">/reference/evidence-register.json</a>.</p>
    <p class="content-body"><strong>Method.</strong> ${esc(REG.method)}</p>
    <table class="ref-table">
      <caption>Claim classes</caption>
      <tbody>
${Object.entries(REG.claimClasses).map(([k, v]) => `        <tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('\n')}
      </tbody>
    </table>
    <p class="content-body">No source listed here endorses Codokey, and none of them defines "AI Code Access Governance". Mandatory force comes only from a regulation or contract that adopts a standard; the NIST and OWASP documents below are guidance unless your organization has adopted them.</p>
  </div>

  <section class="content-wrap" aria-labelledby="claims-h">
    <h2 class="spec-h2" id="claims-h">Codokey's principal claims and their status</h2>
    <div class="table-scroll"><table class="ref-table">
      <thead><tr><th scope="col">Claim</th><th scope="col">Class</th><th scope="col">Evidence</th><th scope="col">Note</th></tr></thead>
      <tbody>
${claims}
      </tbody>
    </table></div>
  </section>

  <section class="content-wrap ev-list" aria-labelledby="entries-h">
    <h2 class="spec-h2" id="entries-h">Register entries (${REG.entries.length})</h2>
${cards}
  </section>

  <section class="content-wrap" aria-labelledby="gaps-h">
    <h2 class="spec-h2" id="gaps-h">Considered, excluded, and open gaps</h2>
    <h3 class="spec-h3">Considered but not cited</h3>
    <ul class="spec-list">
${REG.consideredNotCited.map(c => `      <li><a href="${esc(c.url)}" rel="noopener">${esc(c.title)}</a> (${esc(c.date)}) — ${esc(c.reason)}</li>`).join('\n')}
    </ul>
    <h3 class="spec-h3">Claims excluded from authoritative support</h3>
    <ul class="spec-list">
${REG.excludedClaims.map(c => `      <li><strong>${esc(c.claim)}</strong> — ${esc(c.reason)}</li>`).join('\n')}
    </ul>
    <h3 class="spec-h3">Open research gaps</h3>
    <ul class="spec-list">
${REG.gaps.map(g => `      <li>${esc(g)}</li>`).join('\n')}
    </ul>
  </section>

  <div class="internal-links">
    <div class="internal-links-title">Related</div>
    <div class="internal-links-grid">
      <a href="/governance-scorecard/">Scorecard — every control lists its sources</a>
      <a href="/protocol/">Protocol layer specifications</a>
      <a href="/review/">Challenge an entry — Open Review</a>
    </div>
  </div>
`;
  return page({
    title: 'Evidence Register — Sources Behind the Codokey Protocol',
    description: `${REG.entries.length} verified external sources (NIST, OWASP, GitHub, GitLab, MCP, SLSA and others) with exact passages, supported claims, claim class and limitations for AI Code Access Governance.`,
    path: '/evidence/',
    jsonld: { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Codokey Evidence Register', description: 'External sources, exact passages and claim classifications supporting the Codokey Protocol and Governance Scorecard.', version: REG.version, dateModified: REG.verifiedOn, url: BASE + '/evidence/', distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: BASE + '/reference/evidence-register.json' }, creator: { '@type': 'Organization', name: 'Codokey' } },
    fileHeader: { path: 'codokey / evidence /', name: 'evidence-register.json', lang: `REGISTER v${REG.version}`, a: `+${REG.entries.length} verified passages`, r: `−${REG.excludedClaims.length} claims excluded` },
    body, footerMeta: `Evidence Register v${REG.version} · verified ${REG.verifiedOn}`, footerTag: 'Evidence'
  });
}

// ---------------------------------------------------------------- cases
function caseReadme(c) {
  const layers = c.layers.map(id => `${layerById[id].num} ${layerById[id].name}`).join(', ');
  const exp = JSON.parse(readFileSync(join(ROOT, 'cases', c.dir, 'expected.json'), 'utf8'));
  const runs = exp.runs.map(r => `node tools/codokey-check.mjs ${r.command} ${Object.entries(r.args).map(([k, v]) => `--${k} cases/${c.dir}/${v}`).join(' ')}   # expect ${r.verdict}${r.failing.length ? ' (' + r.failing.join(', ') + ')' : ''}`).join('\n');
  return `<!-- Generated by tools/build.mjs from tools/content/cases.mjs — edit the source, not this file. -->
# Reference Case ${c.letter} — ${c.title}

**Codokey Reference Cases v${VERSIONS.cases} · validator \`tools/codokey-check.mjs\`**

> ${c.thesis}

## Scenario

${c.scenario}

## Assumptions

${c.assumptions.map(a => `- ${a}`).join('\n')}

## Synthetic inputs

${c.inputs.map(a => `- ${a}`).join('\n')}

All values are synthetic. No real credentials, repositories, or systems are used.

## Protocol layers

${layers}

## Control expectations

${c.expectations.map(a => `- ${a}`).join('\n')}

## Observable pass/fail conditions

| Check | Condition |
|---|---|
${c.passFail.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## Evidence requirements (real-world equivalent)

${c.evidence}

## Reproduce

\`\`\`sh
${runs}
\`\`\`

## Expected outcome

${c.expected}

## Limitations

${c.limitations.map(a => `- ${a}`).join('\n')}

## Sources

${c.refs.map(r => `- ${r} — ${evById[r].title} (${evById[r].publisher})`).join('\n')}
`;
}

function casesPage() {
  const sections = CASES.map(c => {
    const exp = JSON.parse(readFileSync(join(ROOT, 'cases', c.dir, 'expected.json'), 'utf8'));
    const runs = exp.runs.map(r => `node tools/codokey-check.mjs ${r.command} \\\n  ${Object.entries(r.args).map(([k, v]) => `--${k} cases/${c.dir}/${v}`).join(' \\\n  ')}\n# expect ${r.verdict}${r.failing.length ? ' — failing ' + r.failing.join(', ') : ''}`).join('\n\n');
    return `  <section class="content-wrap case" id="${c.slug}" aria-labelledby="${c.slug}-h">
    <div class="eyebrow">Case ${c.letter} · layers ${c.layers.map(id => layerById[id].num).join(', ')}</div>
    <h2 class="spec-h2 case-h" id="${c.slug}-h">${esc(c.title)}</h2>
    <p class="spec-question">${esc(c.thesis)}</p>
    <h3 class="spec-h3">Scenario</h3><p class="content-body">${esc(c.scenario)}</p>
    <h3 class="spec-h3">Control expectations</h3>
    <ul class="spec-list">${c.expectations.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
    <h3 class="spec-h3">Pass / fail conditions</h3>
    <div class="table-scroll"><table class="ref-table"><thead><tr><th scope="col">Check</th><th scope="col">Condition</th></tr></thead><tbody>${c.passFail.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
    <h3 class="spec-h3">Reproduce</h3>
    <pre class="code-block"><code>${esc(runs)}</code></pre>
    <p class="content-body"><strong>Expected outcome.</strong> ${esc(c.expected)}</p>
    <p class="content-body"><strong>Real-world evidence.</strong> ${esc(c.evidence)}</p>
    <h3 class="spec-h3">Limitations</h3>
    <ul class="spec-list">${c.limitations.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
    <p class="content-body">Fixtures: <a href="/cases/${c.dir}/README.md">cases/${c.dir}/</a> · Sources: ${c.refs.map(evLink).join(', ')}</p>
  </section>`;
  }).join('\n');
  const body = `
  <div class="content-wrap">
    <div class="eyebrow">Reference Cases v${VERSIONS.cases} · validator v${VERSIONS.validator}</div>
    <h1 class="spec-h1">Reference Cases</h1>
    <p class="content-body">Four reproducible cases that turn protocol controls into observable pass/fail conditions. Each case ships synthetic inputs — a governed and an ungoverned variant — and a zero-dependency validator, <code>tools/codokey-check.mjs</code>, that evaluates them. Expected outcomes are pinned in <code>cases/*/expected.json</code> and checked by the test suite.</p>
    <p class="content-body"><strong>What these are not.</strong> The validator reads declared configuration files. It does not connect to GitHub, GitLab, or any agent, does not scan live repositories, and a PASS is not certification. To use a case on a real system, export the equivalent settings into the same JSON shape — and remove secret values first.</p>
    <ul class="spec-list">
${CASES.map(c => `      <li><a href="#${c.slug}">Case ${c.letter} — ${esc(c.title)}</a></li>`).join('\n')}
    </ul>
    <pre class="code-block"><code># Node 18+, no install step
node --test tests/*.test.mjs</code></pre>
  </div>
${sections}
  <div class="internal-links">
    <div class="internal-links-title">Related</div>
    <div class="internal-links-grid">
      <a href="/governance-scorecard/">Governance Scorecard</a>
      <a href="/reference-kit/">Reference Kit</a>
      <a href="/review/">Report a false positive or negative</a>
    </div>
  </div>
`;
  return page({
    title: 'Reference Cases — Reproducible AI Code Access Governance Checks',
    description: 'Four reproducible cases with synthetic fixtures: agent access to secrets, excessive agent authority, AI-generated code approaching production, and audit reconstruction.',
    path: '/reference-cases/',
    jsonld: articleLd({ headline: 'Codokey Reference Cases', description: 'Reproducible pass/fail cases for AI Code Access Governance controls.', path: '/reference-cases/', version: VERSIONS.cases }),
    fileHeader: { path: 'codokey / cases /', name: 'reference-cases.md', lang: `CASES v${VERSIONS.cases}`, a: '+4 reproducible cases', r: '−0 live systems touched' },
    body, footerMeta: `Reference Cases v${VERSIONS.cases} · synthetic fixtures only`, footerTag: 'Reproducible'
  });
}

// ---------------------------------------------------------------- kit page
const KIT = [
  ['agent-access-policy.md', 'Agent access policy', 'Declare each agent\'s identity, repositories, permissions, tools, lifetime and forbidden zones before it runs. JSON example included.', ['CK-AA-01', 'CK-AA-02', 'CK-AA-05', 'CK-OR-02']],
  ['repository-access-boundary-checklist.md', 'Repository access-boundary checklist', 'Twelve checks to run before enabling an agent on a repository.', ['CK-AA-05', 'CK-KE-03', 'CK-RB-01', 'CK-RB-04']],
  ['secrets-exposure-review.md', 'Secrets-exposure review', 'Contain first, then determine which agent sessions had a secret in reach.', ['CK-AM-04', 'CK-KE-05']],
  ['ai-pr-review-checklist.md', 'AI-generated PR review checklist', 'What the independent approver checks on agent pull requests — authority changes first.', ['CK-RB-01', 'CK-RB-02', 'CK-RB-03']],
  ['production-authorization-checklist.md', 'Production authorization checklist', 'Confirm the human gate between merge and production.', ['CK-DC-01', 'CK-DC-02', 'CK-KE-06']],
  ['audit-evidence-specification.md', 'Audit evidence specification', 'The minimum records to answer eight reconstruction questions about an agent session (original Codokey proposal).', ['CK-AM-01', 'CK-AM-02', 'CK-AM-03']]
];
function kitPage() {
  const rows = KIT.map(([f, t, d, ctls]) => `        <tr><th scope="row"><a href="/kit/${f}">${esc(t)}</a></th><td>${esc(d)}</td><td>${ctls.map(ctlLink).join(', ')}</td></tr>`).join('\n');
  const body = `
  <div class="content-wrap">
    <div class="eyebrow">Reference Kit v${VERSIONS.kit} · ${BUILD_DATE}</div>
    <h1 class="spec-h1">Reference Kit</h1>
    <p class="content-body">Templates and specifications an engineering or security team can use directly, whether or not it ever engages with Codokey. Each resource is plain text (Markdown or JSON), names the scorecard controls it supports, and states its limitations.</p>
    <div class="table-scroll"><table class="ref-table">
      <thead><tr><th scope="col">Resource</th><th scope="col">Purpose</th><th scope="col">Controls</th></tr></thead>
      <tbody>
${rows}
        <tr><th scope="row"><a href="/reference/controls.json">Control catalog (JSON)</a> · <a href="/reference/protocol-control-map.csv">map (CSV)</a></th><td>All ${M.CONTROLS.length} controls with layer, severity, forbidden zone, evidence, remediation and sources — for import into your own tracker.</td><td>all</td></tr>
      </tbody>
    </table></div>
    <h2 class="spec-h2">How the pieces fit</h2>
    <ol class="spec-list">
      <li>Write an <strong>agent access policy</strong> entry per agent, then compare it with granted credentials (Reference Case B).</li>
      <li>Run the <strong>repository checklist</strong> before enabling an agent on a repository.</li>
      <li>Give approvers the <strong>PR review checklist</strong>; confirm deployment with the <strong>production checklist</strong> (Reference Case C).</li>
      <li>Configure logging to the <strong>audit evidence specification</strong> (Reference Case D); use the <strong>secrets-exposure review</strong> when something leaks.</li>
      <li>Record status in the <a href="/governance-scorecard/">scorecard</a> and export it as your gap register.</li>
    </ol>
    <h2 class="spec-h2">Terms and status</h2>
    <p class="content-body">Version ${VERSIONS.kit}. Not externally reviewed. Templates are vendor-neutral with platform-specific notes; they are not certification criteria or legal advice. Reuse terms have not yet been published — until a license is published, contact <a href="mailto:inquiry@codokey.com">inquiry@codokey.com</a> before redistributing.</p>
  </div>
  <div class="internal-links">
    <div class="internal-links-title">Related</div>
    <div class="internal-links-grid">
      <a href="/reference-cases/">Reference Cases</a>
      <a href="/protocol/">Protocol specifications</a>
      <a href="/evidence/">Evidence Register</a>
    </div>
  </div>
`;
  return page({
    title: 'Reference Kit — AI Agent Access Policy & Review Templates',
    description: 'Vendor-neutral templates for AI Code Access Governance: agent access policy, repository checklist, secrets-exposure review, AI PR review, production authorization and audit evidence specification.',
    path: '/reference-kit/',
    jsonld: articleLd({ headline: 'Codokey Reference Kit', description: 'Templates for governing AI coding agent access.', path: '/reference-kit/', version: VERSIONS.kit }),
    fileHeader: { path: 'codokey / kit /', name: 'README.md', lang: `KIT v${VERSIONS.kit}`, a: `+${KIT.length + 1} resources`, r: '−0 vendor lock-in' },
    body, footerMeta: `Reference Kit v${VERSIONS.kit} · vendor-neutral templates`, footerTag: 'Adoption'
  });
}

// ---------------------------------------------------------------- review page
function reviewPage() {
  const body = `
  <div class="content-wrap">
    <div class="eyebrow">Open Review · package v${VERSIONS.review}</div>
    <h1 class="spec-h1">Open Review</h1>
    <p class="content-body"><strong>No independent review of Codokey has taken place yet.</strong> This page provides what a reviewer needs to evaluate the protocol, the scorecard model, the evidence register, and the reference cases — and a structured way to report what is wrong. Reviews received will be listed in the <a href="/review/REVIEW_LOG.md">review log</a> only with the reviewer's permission.</p>
    <h2 class="spec-h2">What to challenge</h2>
    <div class="table-scroll"><table class="ref-table">
      <thead><tr><th scope="col">Artifact</th><th scope="col">Questions for a reviewer</th></tr></thead>
      <tbody>
        <tr><th scope="row"><a href="/protocol/">Protocol v${M.PROTOCOL_VERSION}</a></th><td>Are the six boundaries the right ones? What failure scenario falls between layers?</td></tr>
        <tr><th scope="row"><a href="/governance-scorecard/#methodology">Scorecard model v${M.MODEL_VERSION}</a></th><td>Are severities and forbidden-zone gates defensible? Is "more than half of critical controls" the right C threshold? Can an unsafe organization score well?</td></tr>
        <tr><th scope="row"><a href="/evidence/">Evidence Register v${REG.version}</a></th><td>Is any passage misquoted, outdated, or stretched beyond what it supports? Is any claim in the wrong class?</td></tr>
        <tr><th scope="row"><a href="/reference-cases/">Reference Cases</a></th><td>Construct an input the validator wrongly passes (false negative) or wrongly fails (false positive).</td></tr>
        <tr><th scope="row"><a href="/reference-kit/">Reference Kit</a></th><td>Could a team adopt the templates as written? What is missing?</td></tr>
      </tbody>
    </table></div>
    <h2 class="spec-h2">Reproduce in two minutes</h2>
    <pre class="code-block"><code>node --test tests/*.test.mjs         # Node 18+, no dependencies
node tools/build.mjs --check         # generated pages match their sources</code></pre>
    <h2 class="spec-h2">Rubric</h2>
    <p class="content-body">Classify each finding by type — false negative, false positive, missing control, severity/gate, evidence defect, claim-class error, usability — and rate impact (3 material, 2 significant, 1 minor) and confidence (high/medium/low). Full rubric: <a href="/review/RUBRIC.md">RUBRIC.md</a>. Template: <a href="/review/FEEDBACK_TEMPLATE.md">FEEDBACK_TEMPLATE.md</a>. Package overview: <a href="/review/README.md">README.md</a>.</p>
    <h2 class="spec-h2">Send findings</h2>
    <p class="content-body">Open an issue in the project repository using the "Review finding" form, or email <a href="mailto:inquiry@codokey.com">inquiry@codokey.com</a>. Never include real secrets or confidential configuration.</p>
  </div>
  <div class="internal-links">
    <div class="internal-links-title">Related</div>
    <div class="internal-links-grid">
      <a href="/evidence/">Evidence Register</a>
      <a href="/reference-cases/">Reference Cases</a>
      <a href="/governance-scorecard/#methodology">Scoring methodology</a>
    </div>
  </div>
`;
  return page({
    title: 'Open Review — Challenge the Codokey Protocol and Scorecard',
    description: 'Review package for security engineers: reproduce the Codokey reference cases, inspect the evidence register, and report false positives, false negatives and missing controls.',
    path: '/review/',
    jsonld: articleLd({ headline: 'Codokey Open Review', description: 'Structured external review of the Codokey reference model.', path: '/review/', version: VERSIONS.review }),
    fileHeader: { path: 'codokey / review /', name: 'README.md', lang: `REVIEW v${VERSIONS.review}`, a: '+0 reviews received', r: '−0 endorsements claimed' },
    body, footerMeta: `Open Review · package v${VERSIONS.review} · no external review recorded`, footerTag: 'Review'
  });
}

// ---------------------------------------------------------------- data exports
function controlsJson() {
  return JSON.stringify({
    catalog: 'codokey-governance-controls', modelVersion: M.MODEL_VERSION, protocolVersion: M.PROTOCOL_VERSION, generated: BUILD_DATE,
    statuses: M.STATUS_LABELS, forbiddenZones: M.FORBIDDEN_ZONES, grades: M.GRADES,
    layers: M.LAYERS.map(l => ({ id: l.id, number: l.num, name: l.name, tag: l.tag, specification: BASE + layerSpecPath(l.id) })),
    controls: M.CONTROLS.map(c => ({ id: c.id, legacyCheck: c.legacy, layer: c.layer, severity: c.severity, forbiddenZone: c.forbiddenZone || null, title: c.title, evidence: c.evidence, remediation: c.remediation, sources: c.refs }))
  }, null, 2) + '\n';
}
function controlsCsv() {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const rows = [['control_id', 'legacy_check', 'layer_number', 'layer', 'severity', 'forbidden_zone', 'title', 'acceptable_evidence', 'sources']];
  for (const c of M.CONTROLS) rows.push([c.id, c.legacy, layerById[c.layer].num, layerById[c.layer].name, c.severity, c.forbiddenZone || '', c.title, c.evidence, c.refs.join(' ')]);
  return rows.map(r => r.map(q).join(',')).join('\n') + '\n';
}

// ---------------------------------------------------------------- normalize hand-written pages
function htmlFiles(dir = ROOT, out = []) {
  for (const n of readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules' || n === 'cases') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (n === 'index.html') out.push(p);
  }
  return out;
}
const urlPathOf = file => '/' + relative(ROOT, dirname(file)).split(sep).join('/').replace(/^\.?$/, '') + (relative(ROOT, dirname(file)) ? '/' : '');

function normalize(html, file) {
  const path = urlPathOf(file);
  if (!html.includes('class="site-footer"')) return html; // print briefs use their own layout
  html = html.replace(/<nav class="footer-nav"[^>]*>[\s\S]*?<\/nav>/, footerNav(path));
  html = html.replace(/<div class="nav-badge"[^>]*>[^<]*<\/div>/, navBadge());
  html = html.replace(/<nav>\n  <div class="nav-tabs">/, '<nav aria-label="Reference files">\n  <div class="nav-tabs">');
  html = html.replace(/assets\/social-preview\.svg/g, 'assets/social-preview.png').replace(/content="image\/svg\+xml"/g, 'content="image/png"');
  if (!html.includes('class="skip-link"')) html = html.replace('<body>\n', '<body>\n<a class="skip-link" href="#main">Skip to content</a>\n');
  html = html.replace(/<main>/, '<main id="main">');
  html = html.replace('<div class="cur" id="cur"></div>', '<div class="cur" id="cur" aria-hidden="true"></div>').replace('<div class="cur-r" id="curR"></div>', '<div class="cur-r" id="curR" aria-hidden="true"></div>');
  return html;
}

// ---------------------------------------------------------------- sitemap
function sitemap(files) {
  const urls = files.map(([p, html]) => ({ p, html }))
    .filter(({ html }) => /<meta name="robots" content="index/.test(html))
    .map(({ p }) => p).sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE}${u}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- main
const outputs = new Map();
outputs.set('governance-scorecard/index.html', scorecardPage());
M.LAYERS.forEach((l, i) => outputs.set(`protocol/${l.slug}/index.html`, layerPage(l, i)));
outputs.set('evidence/index.html', evidencePage());
outputs.set('reference-cases/index.html', casesPage());
outputs.set('reference-kit/index.html', kitPage());
outputs.set('review/index.html', reviewPage());
CASES.forEach(c => outputs.set(`cases/${c.dir}/README.md`, caseReadme(c)));
outputs.set('reference/controls.json', controlsJson());
outputs.set('reference/protocol-control-map.csv', controlsCsv());

for (const f of htmlFiles()) {
  const rel = relative(ROOT, f).split(sep).join('/');
  if (outputs.has(rel)) continue;
  outputs.set(rel, normalize(readFileSync(f, 'utf8'), f));
}
const pages = [...outputs.entries()].filter(([k]) => k.endsWith('index.html')).map(([k, v]) => [urlPathOf(join(ROOT, k)), v]);
outputs.set('sitemap.xml', sitemap(pages));

let stale = [];
for (const [rel, content] of outputs) {
  const p = join(ROOT, rel);
  const current = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (current === content) continue;
  if (CHECK) stale.push(rel);
  else { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); console.log('wrote ' + rel); }
}
if (CHECK) {
  if (stale.length) { console.error('Out of date (run node tools/build.mjs):\n  ' + stale.join('\n  ')); process.exit(1); }
  console.log(`build check: ${outputs.size} files up to date`);
}

// Every command shown in documentation code blocks must run as written.
// Sources: Markdown fenced blocks (```sh / ```) and HTML <pre class="code-block">
// on generated pages. Validator commands are executed and their exit code is
// compared with the documented expectation ("# expect PASS|FAIL").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const docs = ['README.md', 'review/README.md', 'SCORING.md', ...readdirSync(join(ROOT, 'cases')).filter(d => /^[a-d]-/.test(d)).map(d => `cases/${d}/README.md`)];
const pages = ['reference-cases/index.html', 'review/index.html'];

function blocks() {
  const out = [];
  for (const f of docs) for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(/```(?:sh|bash|shell)?\n([\s\S]*?)```/g)) out.push([f, m[1]]);
  for (const f of pages) for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(/<pre class="code-block"><code>([\s\S]*?)<\/code><\/pre>/g)) out.push([f, unescape(m[1])]);
  return out;
}

// Join "\" continuations; keep a trailing or following "# expect ..." comment with its command.
function commands() {
  const out = [];
  for (const [file, text] of blocks()) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      while (/\\\s*$/.test(line) && i + 1 < lines.length) line = line.replace(/\\\s*$/, ' ') + lines[++i].trim();
      if (!/^\s*(node|git|npm|npx)\b/.test(line)) continue;
      let expect = (line.match(/#\s*expect\s+(PASS|FAIL)/) || [])[1];
      if (!expect && /^#\s*expect\s+(PASS|FAIL)/.test(lines[i + 1] || '')) expect = lines[i + 1].match(/(PASS|FAIL)/)[1];
      out.push({ file, cmd: line.replace(/\s+#.*$/, '').trim(), expect });
    }
  }
  return out;
}

const all = commands();
test('documentation contains commands to check', () => assert.ok(all.length >= 10, String(all.length)));

test('no command contains an unfilled placeholder', () => {
  for (const c of all) assert.doesNotMatch(c.cmd, /<[^>]+>/, `${c.file}: ${c.cmd}`);
});

test('clone commands use the real repository URL and directory', () => {
  const origin = execFileSync('git', ['-C', ROOT, 'remote', 'get-url', 'origin']).toString().trim().replace(/\.git$/, '').replace(/^.*github\.com[/:]/, '');
  for (const c of all.filter(c => c.cmd.startsWith('git clone'))) {
    const m = c.cmd.match(/^git clone (https:\/\/github\.com\/([^ ]+?)\.git) && cd ([^ ]+)$/);
    assert.ok(m, `${c.file}: ${c.cmd}`);
    assert.equal(m[2], origin.endsWith('Sohadot/Codokey') ? 'Sohadot/Codokey' : origin, c.file);
    assert.equal(m[3], m[2].split('/')[1], c.file);
  }
});

for (const c of all.filter(c => c.cmd.startsWith('node tools/codokey-check.mjs'))) {
  test(`runs as documented (${c.file}): ${c.cmd.slice(0, 90)}`, () => {
    const r = spawnSync('sh', ['-c', c.cmd], { cwd: ROOT, encoding: 'utf8' });
    const expected = c.expect === 'PASS' ? 0 : c.expect === 'FAIL' ? 1 : 0;
    assert.equal(r.status, expected, `${r.stdout}\n${r.stderr}`);
  });
}

test('other documented node commands reference existing scripts and run where offline-safe', () => {
  for (const c of all.filter(c => c.cmd.startsWith('node ') && !c.cmd.startsWith('node tools/codokey-check.mjs'))) {
    if (c.cmd.startsWith('node --test')) {
      const glob = c.cmd.split(/\s+/)[2];
      assert.equal(glob, 'tests/*.test.mjs', c.file);
      assert.ok(readdirSync(join(ROOT, 'tests')).some(f => f.endsWith('.test.mjs')));
      continue;
    }
    const script = c.cmd.split(/\s+/)[1];
    assert.ok(existsSync(join(ROOT, script)), `${c.file}: ${script}`);
    if (c.cmd === 'node tools/build.mjs --check') {
      assert.equal(spawnSync('node', ['tools/build.mjs', '--check'], { cwd: ROOT }).status, 0);
    }
    // tests/ui/scorecard.ui.mjs (needs a browser) and tools/verify-evidence.mjs (needs network) run in CI / manually.
  }
});

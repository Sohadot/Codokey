/*
 * Codokey Governance Scorecard — browser UI (model 2.0.0)
 * All state stays in this page. Nothing is stored or transmitted.
 * Scoring logic lives in scorecard-model.js and is unit-tested separately.
 */
(function () {
  'use strict';
  var M = window.CodokeyScorecard;
  var form = document.getElementById('scorecardForm');
  if (!M || !form) return;

  var state = {};
  var notes = {};

  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function readForm() {
    M.CONTROLS.forEach(function (c) {
      var checked = form.querySelector('input[name="st-' + c.id + '"]:checked');
      state[c.id] = checked ? checked.value : 'unknown';
      var note = form.querySelector('textarea[name="note-' + c.id + '"]');
      notes[c.id] = note ? note.value.trim() : '';
    });
  }

  function controlLink(id) {
    var c = M.controlById(id);
    var li = el('li');
    var a = el('a', null, id);
    a.href = '#' + id;
    li.appendChild(a);
    var sev = el('span', 'cl-sev ' + (c.severity === 'critical' ? 'sev-c' : c.severity === 'high' ? 'sev-h' : 'sev-m'), c.forbiddenZone ? 'Forbidden zone' : c.severity);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(sev);
    li.appendChild(document.createTextNode(' ' + c.title));
    return li;
  }

  function fillList(id, ids, emptyText, limit) {
    var ul = $(id);
    if (!ul) return;
    ul.innerHTML = '';
    var list = limit ? ids.slice(0, limit) : ids;
    if (!list.length) { ul.appendChild(el('li', 'sc-empty', emptyText)); return; }
    list.forEach(function (cid) { ul.appendChild(controlLink(cid)); });
    if (limit && ids.length > limit) ul.appendChild(el('li', 'sc-empty', '+ ' + (ids.length - limit) + ' more below'));
  }

  function render() {
    readForm();
    var r = M.evaluate(state);

    // Status line per control
    M.CONTROLS.forEach(function (c) {
      var fs = $(c.id);
      if (fs) fs.setAttribute('data-status', r.statuses[c.id]);
    });
    M.LAYERS.forEach(function (l) {
      var b = r.byLayer[l.id];
      setText('lc-' + l.id, b.pass + ' impl · ' + b.fail + ' not · ' + b.unknown + ' unassessed');
    });

    // Headline
    var gradeEl = $('scGrade');
    var title, cls, shown;
    if (r.state === 'determined') {
      shown = r.grade; cls = M.GRADES[r.grade].cls; title = M.GRADES[r.grade].title;
    } else if (r.state === 'provisional') {
      shown = '?'; cls = 'grade-pending'; title = 'Provisional — range ' + r.floor + ' to ' + r.ceiling;
    } else {
      shown = '—'; cls = 'grade-pending'; title = 'Not assessed';
    }
    gradeEl.textContent = shown;
    gradeEl.className = 'sc-grade ' + cls;
    gradeEl.setAttribute('aria-label', r.state === 'determined' ? 'Grade ' + r.grade : title);
    setText('scTitle', title);
    setText('scSub', M.describe(r));

    setText('cntPass', r.counts.pass);
    setText('cntFail', r.counts.fail);
    setText('cntUnknown', r.counts.unknown);
    setText('scCoverage', r.coveragePct + '% assessed');
    var fill = $('pFill'); if (fill) fill.style.width = r.coveragePct + '%';
    setText('pCount', (r.counts.pass + r.counts.fail) + ' / ' + r.counts.total + ' assessed');
    setText('doneCount', '+' + r.counts.pass + ' implemented');
    setText('remainCount', '−' + r.counts.fail + ' not · ' + r.counts.unknown + ' unassessed');

    // Gates
    var g = r.gates;
    setText('gateFz', g.forbiddenZoneFailures.length ? 'FAILED — ' + g.forbiddenZoneFailures.join(', ') + ' (grade capped at C)'
      : g.forbiddenZoneUnknown.length ? 'UNVERIFIED — ' + g.forbiddenZoneUnknown.join(', ') : 'passed');
    setText('gateCrit', g.criticalFailed + ' not implemented · ' + g.criticalUnknown + ' unassessed of ' + r.bySeverity.critical.total);
    setText('gateAp', r.grade === 'A+' ? 'met' : 'not met — requires every control implemented');

    fillList('scRisks', r.primaryRisks, r.counts.fail ? '' : 'No control is marked not implemented.');
    fillList('scVerify', r.unassessed, 'Every control has been assessed.', 5);
    var na = r.nextAction;
    setText('scNext', (na.control ? na.control + ': ' : '') + na.text);
    var exp = $('scExport'); if (exp) exp.disabled = (r.counts.pass + r.counts.fail) === 0;
  }

  form.addEventListener('change', render);
  form.addEventListener('input', function (e) { if (e.target && e.target.tagName === 'TEXTAREA') readForm(); });

  var reset = $('scReset');
  if (reset) reset.addEventListener('click', function () {
    if (!window.confirm('Clear every answer and note on this page?')) return;
    form.reset();
    render();
  });

  var exportBtn = $('scExport');
  if (exportBtn) exportBtn.addEventListener('click', function () {
    readForm();
    var data = M.exportAssessment(state, notes);
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'codokey-assessment-' + data.generatedAt.slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // Expose current state for automated UI tests and for users inspecting the page.
  window.codokeyScorecardState = function () { readForm(); return M.evaluate(state); };

  var js = $('scJsRequired'); if (js) js.hidden = true;
  var out = $('scorecardOut'); if (out) out.hidden = false;
  render();
})();

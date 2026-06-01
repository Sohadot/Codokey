(function () {
  'use strict';

  var TOTAL = 32;
  var grpTotals = [4, 6, 6, 5, 5, 6];
  var done = 0;
  var grpDone = [0, 0, 0, 0, 0, 0];

  var grades = [
    { min: 0, max: 39, grade: 'C', cls: 'grade-c', title: 'Ungoverned AI Code Access', sub: 'Significant governance gaps. Agent sessions are creating untracked risk.', gap: 'Key Exposure — critical checks unresolved', next: 'Exclude .env and production credentials from agent read scope' },
    { min: 40, max: 69, grade: 'B', cls: 'grade-b', title: 'Partially Governed', sub: 'Core controls in place. Several high-risk gaps remain open.', gap: 'Agent Authority — scope and permission definitions incomplete', next: 'Document explicit scope for each agent class in your policy' },
    { min: 70, max: 84, grade: 'A', cls: 'grade-a', title: 'Controlled With Gaps', sub: 'Strong governance posture. Minor gaps require attention before scaling agents.', gap: 'Audit Memory — logging and retention not fully configured', next: 'Ensure immutable audit logs cover all agent sessions' },
    { min: 85, max: 100, grade: 'A+', cls: 'grade-ap', title: 'Codokey Ready', sub: 'Full governance posture achieved. Agents can operate with confidence at speed.', gap: 'None — all critical checks resolved', next: 'Schedule quarterly governance debt review and re-audit' }
  ];

  function updateScorecard() {
    var pct = Math.round(done / TOTAL * 100);
    var pFill = document.getElementById('pFill');
    var pCount = document.getElementById('pCount');
    var pPct = document.getElementById('pPct');
    var doneCount = document.getElementById('doneCount');
    var remainCount = document.getElementById('remainCount');

    if (pFill) pFill.style.width = pct + '%';
    if (pCount) pCount.textContent = done + ' / ' + TOTAL;
    if (pPct) pPct.textContent = pct + '%';
    if (doneCount) doneCount.textContent = '+' + done + ' resolved';
    if (remainCount) remainCount.textContent = '\u2212' + (TOTAL - done) + ' pending';

    var sc = document.getElementById('scorecardOut');
    if (sc) sc.classList.add('visible');

    var g = grades.find(function (x) { return pct >= x.min && pct <= x.max; }) || grades[0];
    var gradeEl = document.getElementById('scGrade');
    if (gradeEl) {
      gradeEl.textContent = g.grade;
      gradeEl.className = 'sc-grade ' + g.cls;
    }
    var scTitle = document.getElementById('scTitle');
    var scSub = document.getElementById('scSub');
    var scGap = document.getElementById('scGap');
    var scNext = document.getElementById('scNext');
    var scPct = document.getElementById('scPct');
    if (scTitle) scTitle.textContent = g.title;
    if (scSub) scSub.textContent = g.sub;
    if (scGap) scGap.textContent = g.gap;
    if (scNext) scNext.textContent = g.next;
    if (scPct) scPct.textContent = pct + '%';
  }

  window.tick = function (line, gi) {
    var box = line.querySelector('.cl-box');
    var checked = box.classList.toggle('ticked');
    line.classList.toggle('done', checked);
    done += checked ? 1 : -1;
    grpDone[gi] += checked ? 1 : -1;
    var gEl = document.getElementById('g' + gi);
    if (gEl) gEl.textContent = grpDone[gi] + '/' + grpTotals[gi];
    updateScorecard();
  };

  updateScorecard();
})();

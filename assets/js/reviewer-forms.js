/* Browser-only reviewer worksheet. No network calls, analytics, or persistence. */
(() => {
  'use strict';
  const form = document.querySelector('#reviewForm');
  if (!form) return;

  const questions = [...form.querySelectorAll('[data-review-question]')];
  const result = document.querySelector('#reviewResult');
  const report = document.querySelector('#reviewReportText');
  const message = document.querySelector('#reviewMessage');
  const generate = document.querySelector('#reviewGenerate');
  const progress = document.querySelector('#reviewProgress');
  const fill = document.querySelector('#reviewProgressFill');
  const kind = form.dataset.reviewKind;
  const values = {
    'no-issue': 'No issue observed',
    'false-safe': 'Potential false-safe result (unsafe passed)',
    'false-block': 'Potential false-block result (safe failed)',
    'uncertain': 'Needs more evidence',
    'defensible': 'Defensible',
    'challenge': 'I challenge this decision',
    'not-assessed': 'Not assessed'
  };

  function selectedCount() {
    return questions.filter(q => q.querySelector('input[type="radio"]:checked')).length;
  }

  function update() {
    const count = selectedCount();
    progress.textContent = `${count} of ${questions.length} sections answered`;
    fill.style.width = `${Math.round(100 * count / questions.length)}%`;
    generate.disabled = count === 0;
    message.textContent = count === 0
      ? 'Choose a judgment in at least one section to generate a report.'
      : 'Your answers are only on this page. Generate a report, then choose where to send it.';
    result.hidden = true;
  }

  function buildReport() {
    const stamp = new Date().toISOString();
    const title = kind === 'security' ? 'Security Challenge — Cases A–D' : 'Scorecard Challenge — Governance Gates';
    const lines = [
      'CODOKEY — INDEPENDENT REVIEW SUBMISSION (SELF-REPORTED)',
      'Track: ' + title,
      'Generated (UTC): ' + stamp,
      'Reference: https://codokey.com/review/' + (kind === 'security' ? 'security-challenge/' : 'scorecard-challenge/'),
      'Review method: ' + form.elements.method.selectedOptions[0].textContent,
      'Reviewed commit/version: ' + (form.elements.revision.value.trim() || 'Not provided'),
      'Scorecard model: ' + form.dataset.modelVersion,
      'Validator: ' + form.dataset.validatorVersion,
      'Sections answered: ' + selectedCount() + ' / ' + questions.length,
      '',
      'FINDINGS',
      '--------'
    ];
    for (const question of questions) {
      const id = question.dataset.id;
      const choice = question.querySelector('input[type="radio"]:checked');
      const note = question.querySelector('textarea').value.trim();
      lines.push(id + ' — ' + question.querySelector('h2').textContent);
      lines.push('Judgment: ' + (choice ? values[choice.value] : 'Unanswered'));
      lines.push('Evidence / rationale: ' + (note || 'Not supplied'));
      lines.push('');
    }
    lines.push('OVERALL COMMENTS', '----------------', document.querySelector('#reviewOverall').value.trim() || 'Not supplied', '');
    lines.push('IMPORTANT LIMITS', '----------------');
    lines.push('This submission reflects the reviewer’s statements only. The page does not verify them.');
    lines.push('A passing synthetic validator result does not prove platform enforcement.');
    lines.push('No secrets or confidential configuration should be included.');
    return lines.join('\n');
  }

  async function copyText(value) {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(value);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('reset', () => {
    // A reset event fires BEFORE native fields are reset. Wait until default action finishes.
    setTimeout(update, 0);
  });

  generate.addEventListener('click', () => {
    if (generate.disabled) return;
    report.textContent = buildReport();
    result.hidden = false;
    message.textContent = 'Report generated locally — it has not been submitted.';
    result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });

  document.querySelector('#reviewCopy').addEventListener('click', async () => {
    try {
      await copyText(report.textContent);
      message.textContent = 'Report copied. Open GitHub or email below and paste it to submit.';
    } catch {
      message.textContent = 'Clipboard access was blocked. Select the report text and copy it manually, or download the .txt file.';
      report.focus();
    }
  });

  document.querySelector('#reviewDownload').addEventListener('click', () => {
    const file = new Blob([report.textContent + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codokey-${kind}-review.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent = 'Report downloaded locally. It has not been submitted.';
  });

  document.querySelectorAll('[data-copy-command]').forEach(button => {
    button.addEventListener('click', async () => {
      const commands = button.closest('details').querySelector('code').textContent;
      try {
        await copyText(commands);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select commands above to copy';
      }
    });
  });

  update();
})();

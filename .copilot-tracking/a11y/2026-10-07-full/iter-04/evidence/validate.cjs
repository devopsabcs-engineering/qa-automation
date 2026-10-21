const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.dirname(__dirname);
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const result = read('findings.json');
const previous = read(path.join('..', 'iter-03', 'findings.json'));
const ids = new Set();
const fingerprints = new Set();
for (const finding of result.findings) {
  assert(!ids.has(finding.id));
  ids.add(finding.id);
  assert(!fingerprints.has(finding.fingerprint));
  fingerprints.add(finding.fingerprint);
  assert(fs.existsSync(path.resolve(process.cwd(), finding.location.file)));
  for (const state of finding.location.states) assert(result.target.states.includes(state), state);
  const prior = previous.findings.find(p => p.fingerprint === finding.fingerprint);
  if (prior) assert.equal(finding.id, prior.id);
  assert.equal(typeof finding.autoFixable, 'boolean');
  assert(finding.wcag.length > 0);
  assert(finding.location.line > 0);
}
const open = result.findings.filter(f => ['new', 'persisting', 'regressed'].includes(f.status));
const weights = { critical: 10, serious: 7, moderate: 3, minor: 1 };
assert.equal(result.summary.score, 100 - open.reduce((n, f) => n + weights[f.severity], 0));
for (const severity of Object.keys(weights)) {
  assert.equal(result.summary.open[severity], open.filter(f => f.severity === severity).length);
}
assert.equal(result.summary.needsReview, result.findings.filter(f => f.status === 'needs-review').length);
assert.equal(open.length, 2);
assert.equal(open.filter(f => ['serious', 'critical'].includes(f.severity)).length, 1);
const states = read(path.join('evidence', 'all-states.json'));
assert.equal(states.length, 9);
for (const state of states) {
  assert.equal(state.axe.version, '4.10.3');
  assert.equal(state.axe.violations.length, 0);
  assert.equal(state.skipTarget.id, 'main-content');
  assert(state.narrow.documentWidth <= 320);
  assert(fs.existsSync(path.join(__dirname, `keyboard-${state.key}.json`)));
}
for (const name of ['report.md', path.join('inbox', '20261021T154500Z-ait-qa-test-a11y-04.md')]) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  assert(/^---\r?\n/.test(text), `Missing frontmatter: ${name}`);
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split('#')[0];
    if (!/^https?:/.test(link)) {
      assert(fs.existsSync(path.resolve(dir, path.dirname(name), link)), `Broken link: ${link}`);
    }
  }
}
const rejection = read(path.join('evidence', 'client-invalid-notification.json'));
assert.equal(rejection.runs.length, 3);
for (const run of rejection.runs) {
  assert.equal(run.after.focus, 'submit-request');
  assert.equal(run.after.summary, false);
  assert.equal(run.before.errors.length, 2);
  assert.equal(run.after.errors.length, 3);
  assert(run.after.errors.every(error => !error.liveAncestor));
}
const spacing = read(path.join('evidence', 'spacing-error-confirmed.json'));
assert.equal(spacing.viewport, 320);
assert.equal(spacing.scrollWidth, 339);
assert.equal(spacing.scrollLeftAfter, 19);
console.log('PASS: finding fields, stable IDs, states, score/counts, nine axe/keyboard artifacts, three rejection reproductions, exact overflow measurements, frontmatter and report links');

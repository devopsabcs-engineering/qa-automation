const fs = require('node:fs');
const path = require('node:path');
const iteration = path.dirname(__dirname);
const previous = JSON.parse(fs.readFileSync(path.join(iteration, '..', 'iter-03', 'findings.json')));
const states = JSON.parse(fs.readFileSync(path.join(__dirname, 'all-states.json')));
const targetStates = states.map(s => `${s.route}#${s.state}`);
const findings = previous.findings.map(f => ({
  ...f,
  notes: f.id === 'A11Y-011'
    ? 'No human decision has been recorded. The duplicate text and distinct destinations remain; landmark context may make the purpose sufficient under 2.4.4. This is not a confirmed A/AA failure.'
    : 'Previously fixed; source and current runtime checks reconfirm the correction. No resolver claims were supplied for this iteration.'
}));
const focus = findings.find(f => f.id === 'A11Y-007');
focus.evidence = 'Actual Chromium keyboard focus computes a solid 3px rgb(26,26,26) outline, 2px offset, and 6px yellow halo. The dark outline is 17.4:1 against white. See keyboard-new-empty.json.';
const privacy = findings.find(f => f.id === 'A11Y-011');
privacy.location.states = targetStates;
privacy.evidence = 'Primary navigation: Privacy -> /Privacy. Footer: Privacy -> https://www.ontario.ca/page/privacy-statement. Both have the accessible name Privacy. Distinct header/footer context is present, so whether the purposes are sufficiently clear remains a content/context review.';
findings.push({
  id: 'A11Y-013',
  fingerprint: 'client-error-notification|src/OntarioCsc.Web/Pages/Shared/_ValidationScriptsPartial.cshtml|#new-request-form',
  status: 'new', attempts: 0, severity: 'serious', rule: 'client-error-notification',
  wcag: [{ sc: '4.1.3', name: 'Status Messages', level: 'AA' }],
  principle: 'Robust', detectedBy: ['interaction:form-errors', 'static'],
  location: {
    file: 'src/OntarioCsc.Web/Pages/Shared/_ValidationScriptsPartial.cshtml',
    line: 14, selector: '#new-request-form',
    states: ['/Requests/New#errors-client-invalid']
  },
  evidence: 'Reproduced 3/3: enter Full name X, Email invalid-email, select the first real category, Description short; click Submit request. Before clicking, name/email errors exist. The click adds the description error while focus remains #submit-request after 1000ms. No error summary or live region exists, no invalid field receives focus, and the title stays New service request. DOM mutation/focus traces and the Chromium accessibility tree are in evidence/client-invalid-notification.json. Keyboard Enter returns focus to Description; the empty-form path focuses Full name, so this is specific to the partially completed pointer path, not all submissions.',
  userImpact: 'A screen reader user submitting through pointer or simulated-click interaction gets no programmatic status notification that the form was rejected and a new error appeared. Returning to each field is required to discover the problem.',
  fix: 'Wire the client validator invalid-form/invalidHandler flow to the same accessible error-summary experience as the server path: populate field-linked text, update the error title, and reliably focus the summary after rejection. Alternatively announce the new errors through an appropriate pre-existing live region without moving focus. Keep stable aria-describedby IDs and aria-invalid behavior; regression-test the exact pointer path as well as keyboard, empty, and server paths.',
  autoFixable: true,
  notes: 'This is not an axe violation. Field-to-error relationships are correct; the missing notification is a separate root cause from the previously fixed A11Y-003/004/005. No claim is made about a particular screen reader spoken output.'
});
findings.push({
  id: 'A11Y-014',
  fingerprint: 'text-spacing|src/OntarioCsc.Web/Pages/Error.cshtml|ASPNETCORE_ENVIRONMENT',
  status: 'new', attempts: 0, severity: 'moderate', rule: 'text-spacing',
  wcag: [
    { sc: '1.4.12', name: 'Text Spacing', level: 'AA' },
    { sc: '1.4.10', name: 'Reflow', level: 'AA' }
  ],
  principle: 'Perceivable', detectedBy: ['interaction:text-spacing', 'static'],
  location: {
    file: 'src/OntarioCsc.Web/Pages/Error.cshtml', line: 26,
    selector: 'strong', states: ['/Error#default']
  },
  evidence: 'At 320x640 the unmodified page has document width 320. With line-height 1.5, letter-spacing .12em, word-spacing .16em and paragraph margin-bottom 2em, the strong ASPNETCORE_ENVIRONMENT token has a 338.84375px text range and document width is 339. Horizontal scrolling moves scrollX from 0 to 19. This is prose, not an exempt data table. See spacing-error-confirmed.json and spacing-error-default.png.',
  userImpact: 'Users who enlarge text spacing on a narrow viewport must pan horizontally to read the environment-setting word.',
  fix: 'Allow this long technical token to wrap, for example by marking it as code (the existing code selector uses overflow-wrap:anywhere), or applying equivalent wrapping to the relevant prose. Retest both normal and increased spacing at 320px; preserve the setting name.',
  autoFixable: true,
  notes: 'Distinct from A11Y-008: the request ID code block still wraps correctly. No default-spacing reflow regression was observed.'
});
findings.push({
  id: 'A11Y-015',
  fingerprint: 'aria-prohibited-attr|src/OntarioCsc.Web/Pages/Requests/New.cshtml|#error-summary',
  status: 'needs-review', attempts: 0, severity: 'moderate', rule: 'aria-prohibited-attr',
  wcag: [{ sc: '4.1.2', name: 'Name, Role, Value', level: 'A' }],
  principle: 'Robust', detectedBy: ['axe-core:incomplete', 'interaction:form-errors'],
  location: {
    file: 'src/OntarioCsc.Web/Pages/Requests/New.cshtml', line: 40,
    selector: '#error-summary', states: ['/Requests/New#errors-server']
  },
  evidence: 'axe 4.10.3 reports aria-labelledby on the generic div as incomplete: naming is not well supported without a valid role. Chromium nevertheless exposes a focusable generic named There is a problem, focused=true, with a labelledby relation to the h2. All four summary links focus the correct fields. See axe-new-errors-server.json and summary-accessibility-tree.json.',
  userImpact: 'The summary name is exposed in Chromium, but reliable announcement of a named generic container in other browser/assistive-technology combinations is not established.',
  fix: 'Have an accessibility reviewer verify the focused summary with supported screen reader/browser combinations. If semantics need strengthening, give the summary an appropriate named region/group role and retest focus and linked errors. Do not treat axe incomplete as a confirmed violation.',
  autoFixable: false,
  notes: 'Review candidate, excluded from score and blocking count. Prior Chromium evidence is reconfirmed, not contradicted.'
});
const open = findings.filter(f => ['new', 'persisting', 'regressed'].includes(f.status));
const weights = { critical: 10, serious: 7, moderate: 3, minor: 1 };
const score = Math.max(0, 100 - open.reduce((n, f) => n + weights[f.severity], 0));
const document = {
  schemaVersion: '1.0', run: previous.run, iteration: 4, generatedAt: new Date().toISOString(),
  target: { baseUrl: 'http://localhost:5158', states: targetStates },
  engines: [
    { name: 'static', version: '1.0' },
    { name: 'axe-core', version: '4.10.3', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    { name: 'interaction', checks: ['keyboard', 'focus-visible', 'skip-link', 'focus-not-obscured', 'reflow', 'text-spacing', 'target-size', 'form-errors', 'navigation-state', 'titles-headings', 'reduced-motion'] }
  ],
  summary: {
    score, grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    verdict: 'FAIL',
    open: Object.fromEntries(Object.keys(weights).map(s => [s, open.filter(f => f.severity === s).length])),
    delta: { fixed: 0, new: 2, persisting: 0, regressed: 0 },
    needsHuman: 0, needsReview: 2
  },
  findings
};
fs.writeFileSync(path.join(iteration, 'findings.json'), JSON.stringify(document, null, 2) + '\n');
const staticReview = {
  routes: ['/', '/Privacy', '/Requests', '/Requests/New', '/Error'],
  source: 'All project-owned Razor views, page models, Program.cs and wwwroot/css/ontario.css; no project-owned JS files outside inline Razor scripts.',
  checks: {
    imageAlt: 'No img elements; decorative ON mark aria-hidden=true; logo anchor has an accessible name.',
    noninteractiveClicks: 'No onclick handlers on div/span.',
    tabindex: 'No positive tabindex; main, summary, confirmation use -1 for programmatic focus; table scroll region uses 0.',
    zoom: 'Viewport does not prohibit scaling.',
    titles: 'Every page sets ViewData Title; server rejection and confirmation have state-specific titles; client rejection does not, recorded with A11Y-013.',
    labels: 'Four visible asp-for labels; rendered labels, required, name/email autocomplete and stable describedby IDs verified.',
    errors: 'Field relations and invalid state pass; client notification fails on exact path in A11Y-013.',
    table: 'Caption and scoped column headings present; a simple column-header table does not require row th solely because a reference column exists. Labeled keyboard scroll region works.',
    headings: 'One h1 per rendered state, no skipped heading levels.',
    focus: 'Native auto focus outline retained on links/buttons; screenshots confirm a contrasting white component on dark surfaces despite computed auto outline RGB. Authored form outlines are solid 3px with a yellow halo.',
    textContrast: 'No axe violations; hero gradient manually bounded at 11.42:1 for #333 text and 15.74:1 for #1a text. Opaque textarea colors manually checked. See manual-contrast.json.',
    motion: 'Reduced-motion duration override computed as .00001s.',
    layout: 'All states pass normal 320px reflow; error prose overflows with spacing overrides, A11Y-014.',
    duplicateLinks: 'Privacy links still need content/context review, A11Y-011.'
  },
  excludedFalseAlarms: [
    'Offscreen skip link is deliberately 1x1 when unfocused; first Tab reveals it and Enter focuses main. It is not a clipped-text/target-size defect.',
    'Native auto focus computed RGB alone does not describe the white contrast edge visible in Chromium screenshots.',
    'Table horizontal scrolling is contained and exempt; no body horizontal overflow in the seeded table state.',
    'axe gradient/textarea contrast incomplete results were manually assessed, not counted as violations.'
  ],
  coverageLimits: ['Chromium only', 'No live screen reader session', 'No exhaustive browser/AT or forced-colors matrix', 'No plain-language/legal/content review', 'No exhaustive combinations of arbitrary user-entered content']
};
fs.writeFileSync(path.join(__dirname, 'static-review.json'), JSON.stringify(staticReview, null, 2) + '\n');
console.log(JSON.stringify(document.summary));

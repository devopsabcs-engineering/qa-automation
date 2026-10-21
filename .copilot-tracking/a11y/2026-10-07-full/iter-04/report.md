---
title: "Accessibility report: full app, iteration 04"
description: "WCAG 2.2 AA source, axe-core and interaction audit of the Ontario CSC web app"
ms.date: 2026-10-21
---

## Result

**FAIL** | **90/100 (A)** | Change **-10** since iter-03 | **1 blocking** | WCAG 2.2 AA

The score is a root-cause-weighted engineering metric, not a conformance percentage.
There are two confirmed issues and two unresolved review candidates. Axe reported
zero automatic violations; scripted interaction checks found both confirmed issues.
Application code was not modified.

| Fixed | New | Persisting | Regressed | Needs human | Needs review |
|------:|----:|-----------:|----------:|------------:|-------------:|
| 0     | 2   | 0          | 0         | 0           | 2            |

Eleven historical fixes were reconfirmed, not counted again as newly fixed.
There was no remediation log in iter-03 to adjudicate. This is iteration four
of the existing full-app run; the default five-iteration limit is not reached.

## Blocking findings

| ID       | Severity | WCAG         | Location                                                                                          | Problem                                                               | Fix direction                                                            |
|----------|----------|--------------|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|--------------------------------------------------------------------------|
| A11Y-013 | serious  | 4.1.3 (AA)   | [_ValidationScriptsPartial.cshtml:14](../../../../src/OntarioCsc.Web/Pages/Shared/_ValidationScriptsPartial.cshtml#L14) | Partial client rejection adds errors without focus transfer or live notification | Integrate the client invalid handler with a focused, field-linked summary |

### A11Y-013 reproduction and evidence

1. Open `/Requests/New` with JavaScript enabled.
2. Enter `X` as Full name, `invalid-email` as Email address, the first real service category, and `short` as Description.
3. Click Submit request.
4. Observe that focus remains on Submit, no error summary or live region exists,
   and the newly inserted description error is not the description of the focused control.

This reproduced **3/3 times**, with a one-second wait after each click.
The focus trace contains only `focusin: submit-request`; the accessibility tree
contains no live notification. The title remains `New service request`.
This establishes a missing programmatic notification, not a claim about the exact
spoken output of any particular screen reader.

The empty-form path correctly focuses Full name. Keyboard Enter after the same
invalid values returns focus to Description. Server rejection correctly focuses
the summary. Preserve those working paths and the existing field error associations.

Evidence: [mutation and focus traces](evidence/client-invalid-notification.json),
[comparison paths](evidence/form-followup.json),
[rendered rejection](evidence/client-invalid-notification.png).

## Other open findings

### Perceivable

| ID       | Severity | WCAG                      | Location                                                                         | Problem                                                                       | Fix direction                                                 |
|----------|----------|---------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------|---------------------------------------------------------------|
| A11Y-014 | moderate | 1.4.12 (AA), 1.4.10 (AA)   | [Error.cshtml:26](../../../../src/OntarioCsc.Web/Pages/Error.cshtml#L26)          | `ASPNETCORE_ENVIRONMENT` forces horizontal prose scrolling with increased spacing | Allow the technical token to wrap, using existing code styling |

At a 320x640 viewport, normal-spacing document width is **320px**.
With line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em and paragraph
spacing 2em, the token measures **338.84375px** and document width becomes **339px**.
Horizontal scroll moves from 0 to **19px**. The prose is not an exempt data table.

Evidence: [measured overflow](evidence/spacing-error-confirmed.json),
[spacing screenshot](evidence/spacing-error-default.png).
The request ID still wraps correctly; this is not a regression of A11Y-008.

## Review decisions

Review candidates are not confirmed violations and do not reduce the score.
They still prevent a conformance PASS under the loop contract.

| ID       | Candidate WCAG | Location                                                                                          | Evidence and decision                                                                                                                     | Options                                                                                 |
|----------|----------------|---------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| A11Y-011 | 2.4.4 (A)      | [_Layout.cshtml:51](../../../../src/OntarioCsc.Web/Pages/Shared/_Layout.cshtml#L51)                 | Navigation and footer both say Privacy but point to different notices. Landmark context may sufficiently distinguish them; prior review is unresolved. | Distinguish the labels, or have a human explicitly accept the contextual wording         |
| A11Y-015 | 4.1.2 (A)      | [New.cshtml:40](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L40)                       | Axe flags naming a generic div as incomplete. Chromium exposes the focused summary as a generic named There is a problem; other AT support is unverified. | Verify supported screen reader/browser combinations, or adopt a suitable named container |

A11Y-015 evidence: [axe incomplete](evidence/axe-new-errors-server.json)
and [Chromium accessibility tree](evidence/summary-accessibility-tree.json).
All four summary links move focus to their respective invalid fields.

## Reconfirmed historical fixes

| IDs                   | Current confirmation                                                                                  |
|-----------------------|-------------------------------------------------------------------------------------------------------|
| A11Y-001              | Logo text remains white in focus; actual browser screenshot confirms a visible native focus indicator |
| A11Y-002, A11Y-008     | Seeded requests scroll inside their labeled table region; request ID wraps without body overflow       |
| A11Y-003, A11Y-004     | All invalid controls have matching error descriptions and `aria-invalid=true`                         |
| A11Y-005              | Server rejection focuses the linked summary and prefixes the title with Error                         |
| A11Y-006              | Visible required wording, native required attributes and bound labels remain                          |
| A11Y-007              | Form keyboard focus computes a solid 3px dark outline with yellow halo                                |
| A11Y-009              | Matching primary navigation links expose `aria-current=page`                                          |
| A11Y-010              | Confirmation has a distinct title and focus moves to its heading                                      |
| A11Y-012              | Reduced-motion overrides compute transition/animation duration of 0.00001s                             |

## Coverage

| Page / state                         | Static | Axe violations | Keyboard and skip | Reflow 320px | Text spacing          | Form behavior                          |
|--------------------------------------|--------|---------------:|-------------------|--------------|-----------------------|----------------------------------------|
| `/` default                          | done   | 0              | pass              | pass         | pass                  | not applicable                         |
| `/Privacy` default                   | done   | 0              | pass              | pass         | pass                  | not applicable                         |
| `/Requests` seeded                   | done   | 0              | pass              | pass         | pass                  | not applicable                         |
| `/Requests/New` empty                | done   | 0              | pass              | pass         | pass                  | required/label/autocomplete pass       |
| `/Requests/New` errors-client        | done   | 0              | pass              | pass         | pass                  | focuses first error; field states pass |
| `/Requests/New` errors-server        | done   | 0              | pass              | pass         | pass                  | summary, title and field links pass    |
| `/Requests/New` errors-client-invalid| done   | 0              | tab sequence pass | pass         | pass                  | A11Y-013 notification failure          |
| `/Requests/New` submitted            | done   | 0              | pass              | pass         | pass                  | confirmation title and focus pass      |
| `/Error` default                     | done   | 0              | pass              | pass         | A11Y-014 at 320px      | not applicable                         |

All five Razor routes were discovered and scanned, with nine explicit page states.
The submitted state used synthetic local data. A separate JavaScript-disabled
submission verified that server rejection still renders all error messages and
associations. No production or deployed-app data was changed.

Additional checks covered visible focus, obscuration, target dimensions, heading
sequence, navigation state, reduced motion and desktop spacing at 1280px.
Every visible standalone target met 24x24px in the narrow snapshots.
No keyboard trap or completely obscured focus target was observed.
The intentionally hidden, unfocused skip link was excluded from clipping and
target-size conclusions; first Tab reveals it and Enter focuses main.

### Engine review

* Axe-core **4.10.3** ran on all nine states with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice`.
* Hero gradient contrast was manually bounded at **11.42:1** for body/eyebrow text and **15.74:1** for the heading.
* Textarea contrast candidates involved opaque authored colors: dark text against white or pale error red. Both exceed 4.5:1; they are not counted as violations.
* Native `outline:auto` computed RGB does not describe its entire painted indicator. [Header focus](evidence/focus-header-logo.png) and [footer focus](evidence/focus-footer.png) screenshots show a contrasting white outline component on dark surfaces.
* The generic-summary `aria-prohibited-attr` incomplete is retained for review, not promoted to a violation.

Evidence: [all state results](evidence/all-states.json),
[static review](evidence/static-review.json),
[manual contrast calculations](evidence/manual-contrast.json).
Raw axe output and individual keyboard traces are preserved in [evidence](evidence/).
The reproducible audit harness is [audit.cjs](evidence/audit.cjs).

### Validation and limitations

* Fresh application build passed with **0 warnings and 0 errors**; localhost returned HTTP 200.
* Browser scans and the targeted three-run rejection reproduction completed successfully.
* Audit harness syntax was checked with `node --check`; normalized findings are checked for IDs, fingerprints, states, counts and score.
* No source changes were made, so application unit/regression suites were not rerun.
* Actual screen reader speech, non-Chromium engines, forced-colors rendering, legal/content review and exhaustive arbitrary-input combinations were not tested. This audit is not a guarantee that no other accessibility barriers exist.

## Next action

**Fix blocking findings** with the A11y Resolver, preserving the evidence and
detector-owned findings. Then fix A11Y-014 and rerun the detector.
For review decisions, choose distinct Privacy wording or explicitly accept context;
verify the focused summary with supported screen readers or strengthen its semantics.
The local app remains running at <http://localhost:5158>.

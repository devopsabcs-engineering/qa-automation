# Accessibility report: full app, iteration 01 (baseline)

> **FAIL** · Score **62/100 (D)** · baseline · **3 blocking** · WCAG 2.2 AA

| Fixed | New | Persisting | Regressed | Needs human | Needs review |
|------:|----:|-----------:|----------:|------------:|-------------:|
| 0     | 10  | 0          | 0         | 0           | 1            |

axe-core found **0 violations** on all 8 page states. Every barrier below came from interaction checks and source review, which is exactly the gap automated rules leave.

## Blocking findings

| ID       | Sev     | WCAG             | Location                                                                                 | Problem                                                                 | Fix direction                                              |
|----------|---------|------------------|------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------|
| A11Y-001 | serious | 1.4.3 (AA)       | [ontario.css:64](../../../../src/OntarioCsc.Web/wwwroot/css/ontario.css#L64)             | Logo text turns #00478f on black when focused or hovered (1.90:1)       | Scoped `.ontario-header__logo:hover/:focus` colour         |
| A11Y-002 | serious | 1.4.10 (AA)      | [Requests/Index.cshtml:27](../../../../src/OntarioCsc.Web/Pages/Requests/Index.cshtml#L27) | At 320px the table stretches the whole page to 663px                    | Wrap table in focusable scroll region                      |
| A11Y-003 | serious | 1.3.1 (A), 3.3.1 (A) | [Requests/New.cshtml:35](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L35) | Server-rendered errors not tied to their fields (no `aria-describedby`) | `id` on validation spans + `aria-describedby` on controls  |

## Other open findings

### Perceivable

| ID       | Sev      | WCAG                   | Location                                                                     | Problem                                                              | Fix direction                          |
|----------|----------|------------------------|------------------------------------------------------------------------------|----------------------------------------------------------------------|----------------------------------------|
| A11Y-007 | moderate | 1.4.11 (AA), 2.4.7 (AA) | [ontario.css:340](../../../../src/OntarioCsc.Web/wwwroot/css/ontario.css#L340) | Form focus ring is yellow on white (1.47:1); border shift only 2.27:1 | Dark ring with yellow halo             |
| A11Y-008 | moderate | 1.4.10 (AA)            | [Error.cshtml:13](../../../../src/OntarioCsc.Web/Pages/Error.cshtml#L13)     | Request ID `<code>` overflows to 367px at 320px                      | `code { overflow-wrap: anywhere; }`    |

### Operable

| ID       | Sev   | WCAG                 | Location                                                                           | Problem                                                       | Fix direction                         |
|----------|-------|----------------------|------------------------------------------------------------------------------------|---------------------------------------------------------------|---------------------------------------|
| A11Y-010 | minor | 2.4.2 (best practice) | [Requests/New.cshtml:15](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L15) | Success page keeps the "New service request" title; focus on body | "Request submitted" title, focus heading |

### Understandable

| ID       | Sev      | WCAG       | Location                                                                           | Problem                                                                    | Fix direction                                  |
|----------|----------|------------|------------------------------------------------------------------------------------|----------------------------------------------------------------------------|------------------------------------------------|
| A11Y-004 | moderate | 3.3.1 (A)  | [Requests/New.cshtml:35](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L35) | No `aria-invalid` on invalid fields (client or server path)                | ModelState-driven attribute + Validate highlight |
| A11Y-005 | moderate | 3.3.1 (A)  | [Requests/New.cshtml:31](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L31) | Failed server POST: no error summary, focus on body, title unchanged      | Error summary + focus + "Error: " title prefix |
| A11Y-006 | moderate | 3.3.2 (A)  | [Requests/New.cshtml:34](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L34) | All fields are required but nothing says so before submit                  | "(required)" flags + `aria-required`           |

### Robust

| ID       | Sev   | WCAG                  | Location                                                                         | Problem                                            | Fix direction            |
|----------|-------|-----------------------|----------------------------------------------------------------------------------|----------------------------------------------------|--------------------------|
| A11Y-009 | minor | 1.3.1 (best practice) | [_Layout.cshtml:20](../../../../src/OntarioCsc.Web/Pages/Shared/_Layout.cshtml#L20) | No `aria-current="page"` on the active nav link   | `aria-current` helper    |

## Needs review

| ID       | WCAG      | Question for a human                                                                                       | Options                                                                    |
|----------|-----------|------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| A11Y-011 | 2.4.4 (A) | Two links are named "Privacy": the nav goes to the app's demo notice, the footer goes to ontario.ca. Rename one? | A: footer "Ontario.ca privacy statement" · B: nav "Demo privacy notice" · C: accept (landmark context) |

## Coverage

| Page / state                  | Static | axe-core            | Keyboard | Reflow 320px | Form errors |
|-------------------------------|--------|---------------------|----------|--------------|-------------|
| `/` (default)                 | done   | 0 viol., 1 resolved | pass     | pass         | n/a         |
| `/Privacy` (default)          | done   | 0 viol.             | pass     | pass         | n/a         |
| `/Requests` (seeded)          | done   | 0 viol.             | pass     | **fail**     | n/a         |
| `/Requests/New` (empty)       | done   | 0 viol., 1 resolved | pass     | pass         | n/a         |
| `/Requests/New` (errors, client) | done | 0 viol.            | pass     | n/a          | 1 issue     |
| `/Requests/New` (errors, server) | done | 0 viol.            | pass     | n/a          | 3 issues    |
| `/Requests/New` (submitted)   | done   | 0 viol.             | pass     | n/a          | 1 advisory  |
| `/Error` (default)            | done   | 0 viol.             | pass     | **fail**     | n/a         |

Passed across all states: skip link moves focus into `<main>`, logical tab order with no traps, visible UA focus ring on links and buttons, unique titles, one `<h1>` and no skipped heading levels, `lang="en"`, bound labels, `autocomplete` on name and email, table caption and `scope="col"`, text spacing without clipping, targets at least 24×24.

axe `incomplete` items resolved manually: hero text over the yellow-light gradient (worst case 11.4:1) and the empty textarea (17.4:1).

Engines: static source review; axe-core 4.10.3 (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice); scripted interaction checks. Evidence: [axe-all-states.json](evidence/axe-all-states.json), [interaction-checks.json](evidence/interaction-checks.json), [focus-logo.png](evidence/focus-logo.png), [focus-input.png](evidence/focus-input.png), [reflow-requests-320.png](evidence/reflow-requests-320.png).

Not covered by automation: screen reader announcement quality, cognitive load, plain-language review, Windows High Contrast mode.

## Next action

Hand off to the A11y Resolver with **Fix blocking findings** (all 3 are auto-fixable); A11Y-004 to A11Y-010 are auto-fixable too if you choose **Fix all open findings**.

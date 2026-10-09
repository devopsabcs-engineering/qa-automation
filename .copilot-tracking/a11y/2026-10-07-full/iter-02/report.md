---
title: "Accessibility report: full app, iteration 02"
description: "WCAG 2.2 AA accessibility findings for the Ontario CSC application"
ms.date: 2026-10-09
---

## Result

> **FAIL** · Score **61/100 (D)** · ▼ -1 since iter-01 · **3 blocking** · WCAG 2.2 AA

| Fixed | New | Persisting | Regressed | Needs human | Needs review |
| ----: | --: | ---------: | --------: | ----------: | -----------: |
| 0     | 1   | 10         | 0         | 0           | 1            |

Axe-core found zero violations across all eight states. The blocking barriers came from source analysis and scripted interaction checks.

## Blocking findings

| ID       | Sev     | WCAG                 | Location                                                                                   | Problem                                                          | Fix direction                                |
| -------- | ------- | -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------- |
| A11Y-001 | serious | 1.4.3 (AA)           | [ontario.css:64](../../../../src/OntarioCsc.Web/wwwroot/css/ontario.css#L64)               | Logo hover/focus text is blue on black at 1.90:1                 | Preserve white or another 3:1 state color    |
| A11Y-002 | serious | 1.4.10 (AA)          | [Requests/Index.cshtml:27](../../../../src/OntarioCsc.Web/Pages/Requests/Index.cshtml#L27) | Requests page expands to 695px at a 320px viewport               | Add a labeled, focusable table scroll region |
| A11Y-003 | serious | 1.3.1 (A), 3.3.1 (A) | [Requests/New.cshtml:35](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L35)     | Server-rendered field errors have no `aria-describedby` relation | Link each control to its validation span     |

## Other open findings

### Perceivable

| ID       | Sev      | WCAG                    | Location                                                                       | Problem                                        | Fix direction                    |
| -------- | -------- | ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------- |
| A11Y-007 | moderate | 1.4.11 (AA), 2.4.7 (AA) | [ontario.css:340](../../../../src/OntarioCsc.Web/wwwroot/css/ontario.css#L340) | Yellow-only form focus ring is 1.47:1 on white | Dark ring with yellow outer halo |
| A11Y-008 | moderate | 1.4.10 (AA)             | [Error.cshtml:13](../../../../src/OntarioCsc.Web/Pages/Error.cshtml#L13)       | Unbroken request ID expands the page to 367px  | Add `overflow-wrap: anywhere`    |

### Operable

| ID       | Sev   | WCAG                  | Location                                                                               | Problem                                                   | Fix direction                       |
| -------- | ----- | --------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| A11Y-010 | minor | 2.4.2 (best practice) | [Requests/New.cshtml:15](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L15) | Success state keeps the old title and focus position      | Update title and focus confirmation |
| A11Y-012 | minor | 2.3.3 (AAA)           | [ontario.css:275](../../../../src/OntarioCsc.Web/wwwroot/css/ontario.css#L275)         | Reduced-motion preference leaves 0.15s transitions active | Add reduced-motion media override   |

### Understandable

| ID       | Sev      | WCAG      | Location                                                                               | Problem                                                        | Fix direction                           |
| -------- | -------- | --------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| A11Y-004 | moderate | 3.3.1 (A) | [Requests/New.cshtml:35](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L35) | Invalid fields have no `aria-invalid`                          | Render server and client invalid state  |
| A11Y-005 | moderate | 3.3.1 (A) | [Requests/New.cshtml:31](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L31) | Server failure has no populated/focused summary or error title | Linked summary, focus, and title prefix |
| A11Y-006 | moderate | 3.3.2 (A) | [Requests/New.cshtml:34](../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L34) | Required fields are not identified before submission           | Visible required wording and state      |

### Robust

| ID       | Sev   | WCAG                  | Location                                                                            | Problem                                 | Fix direction             |
| -------- | ----- | --------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | ------------------------- |
| A11Y-009 | minor | 1.3.1 (best practice) | [_Layout.cshtml:20](../../../../src/OntarioCsc.Web/Pages/Shared/_Layout.cshtml#L20) | Navigation has no `aria-current="page"` | Render current-page state |

## Needs review

| ID       | WCAG      | Decision needed                                                             | Options                                                                                       |
| -------- | --------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A11Y-011 | 2.4.4 (A) | Two links named Privacy lead to the app notice and the Ontario.ca statement | Rename footer, rename navigation link, or accept the landmark context with recorded rationale |

## Coverage

| Page or state                 | Static | axe-core     | Focus order | Reflow 320px | Form errors |
| ----------------------------- | ------ | ------------ | ----------- | ------------ | ----------- |
| `/` default                   | done   | 0 violations | pass        | pass         | n/a         |
| `/Privacy` default            | done   | 0 violations | pass        | pass         | n/a         |
| `/Requests` seeded            | done   | 0 violations | pass        | **fail**     | n/a         |
| `/Requests/New` empty         | done   | 0 violations | pass        | pass         | n/a         |
| `/Requests/New` client errors | done   | 0 violations | pass        | pass         | **fail**    |
| `/Requests/New` server errors | done   | 0 violations | pass        | pass         | **fail**    |
| `/Requests/New` submitted     | done   | 0 violations | pass        | pass         | advisory    |
| `/Error` default              | done   | 0 violations | pass        | **fail**     | n/a         |

Axe reported four `color-contrast` incomplete nodes. Manual token analysis resolves the home gradient at at least 11.4:1 and the textarea states at at least 5.84:1 for error text and 17.4:1 for entered text.

The integrated browser did not advance focus in response to synthetic Tab presses. The detector therefore enumerated the native focusable DOM order, directly focused controls to inspect styles, activated the skip link, and checked target dimensions and obscuration. Skip-link activation moved focus to `#main-content`; visible standalone targets were at least 24 by 24 CSS pixels. No text-spacing clipping was found beyond intentionally hidden skip-link and screen-reader-only caption techniques.

Engines: static source review, axe-core 4.10.3, and scripted interaction checks. Evidence is stored in [evidence](evidence/).

Not covered by automation: screen reader announcement quality, cognitive load, plain-language review, Windows High Contrast mode, and a physical Tab-key walk in this iteration.

## Next action

Hand off to the A11y Resolver with **Fix blocking findings**. All three blocking findings are auto-fixable.

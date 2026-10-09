---
title: "Accessibility report: full app, iteration 03"
description: "WCAG 2.2 AA accessibility findings for the Ontario CSC application"
ms.date: 2026-10-09
---

## Result

> **CONDITIONAL** · Score **100/100 (A)** · ▲ +39 since iter-02 · **0 blocking** · WCAG 2.2 AA

| Fixed | New | Persisting | Regressed | Needs human | Needs review |
| ----: | --: | ---------: | --------: | ----------: | -----------: |
| 11    | 0   | 0          | 0         | 0           | 1            |

All 11 resolver claims are confirmed. Axe-core found zero violations across all eight states. The unresolved content decision in A11Y-011 prevents a PASS verdict.

## Needs review

| ID       | WCAG      | Decision needed                                                             | Options                                                                                       |
| -------- | --------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A11Y-011 | 2.4.4 (A) | Two links named Privacy lead to the app notice and the Ontario.ca statement | Rename footer, rename navigation link, or accept the landmark context with recorded rationale |

## Resolved this iteration

| ID       | Rule                       | Confirmed by                                                    |
| -------- | -------------------------- | --------------------------------------------------------------- |
| A11Y-001 | `color-contrast-state`     | Scoped rendered style and source rule                           |
| A11Y-002 | `reflow`                   | Requests document width 310px at a 320px viewport               |
| A11Y-003 | `aria-describedby-error`   | Four controls linked to populated error containers              |
| A11Y-004 | `aria-invalid`             | Client and server invalid controls expose `aria-invalid=true`   |
| A11Y-005 | `error-summary`            | Error title, focused summary, and four field links              |
| A11Y-006 | `required-fields`          | Visible required wording and native required state              |
| A11Y-007 | `focus-appearance`         | Matching 3px dark outline and 6px yellow halo rule              |
| A11Y-008 | `reflow`                   | Error document width 310px at a 320px viewport                  |
| A11Y-009 | `aria-current-page`        | Current link exposed on all four primary navigation routes      |
| A11Y-010 | `status-message`           | Submitted title and focused confirmation heading                |
| A11Y-012 | `prefers-reduced-motion`   | Computed animation and transition durations of 0.00001s         |

## Coverage

| Page or state                 | Static | axe-core     | Focus order   | Reflow 320px | Text spacing | Form errors |
| ----------------------------- | ------ | ------------ | ------------- | ------------ | ------------ | ----------- |
| `/` default                   | done   | 0 violations | fallback pass | pass         | pass         | n/a         |
| `/Privacy` default            | done   | 0 violations | fallback pass | pass         | pass         | n/a         |
| `/Requests` seeded            | done   | 0 violations | fallback pass | pass         | pass         | n/a         |
| `/Requests/New` empty         | done   | 0 violations | fallback pass | pass         | pass         | n/a         |
| `/Requests/New` client errors | done   | 0 violations | fallback pass | pass         | pass         | pass        |
| `/Requests/New` server errors | done   | 0 violations | fallback pass | pass         | pass         | pass        |
| `/Requests/New` submitted     | done   | 0 violations | fallback pass | pass         | pass         | pass        |
| `/Error` default              | done   | 0 violations | fallback pass | pass         | pass         | n/a         |

Axe reported contrast incompletes on the home gradient and textarea because it could not determine gradient or partially obscured backgrounds. Manual review confirmed dark text on the light gradient or white at greater than 4.5:1. Its `aria-prohibited-attr` incomplete on `#error-summary` was also reviewed: Chromium exposes the focused generic with the accessible name "There is a problem," so it is not recorded as a violation.

The integrated browser did not advance focus in response to synthetic Tab presses. The detector used native focusable DOM order, checked for positive tabindex and traps, directly focused destinations, and activated the skip link. The skip link moved focus to `#main-content`. No target-size failures, obscured focus, duplicate IDs, text-spacing overlaps, or content clipping were found. The intentionally off-screen skip link remained clipped until focus and is exempt.

Engines: static source review, axe-core 4.10.3, and scripted interaction checks. Evidence is stored in [evidence](evidence/).

Not covered by automation: screen reader announcement quality, cognitive load, plain-language review, Windows High Contrast mode, and a physical Tab-key walk in this iteration.

## Next action

Exit criterion 2 applies: only A11Y-011 remains in `needs-review`. Choose distinct Privacy link wording or explicitly accept the landmark context, then re-scan for a PASS verdict.

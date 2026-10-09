---
title: "Accessibility remediation log: iteration 02"
description: "Resolver claims and verification evidence for iteration 02 of the full-app accessibility run"
ms.date: 2026-10-09
---

## Summary

> 11 of 11 targeted findings addressed · 6 files changed · build OK · tests 23/23 · spot checks 11/11

| ID       | Outcome | Change                                                                      | Files                                            |
| -------- | ------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-001 | fixed   | Preserved white logo text during hover and focus                            | `ontario.css`                                    |
| A11Y-002 | fixed   | Contained the requests table in a labeled keyboard-scrollable region        | `Index.cshtml`, `ontario.css`                    |
| A11Y-003 | fixed   | Linked every form control to a stable server error container                | `New.cshtml`                                     |
| A11Y-004 | fixed   | Exposed invalid state during server and client validation                   | `New.cshtml`, `_ValidationScriptsPartial.cshtml` |
| A11Y-005 | fixed   | Added a linked, focused server error summary and error title                | `New.cshtml`, `_ViewImports.cshtml`              |
| A11Y-006 | fixed   | Added visible required wording and native required state                    | `New.cshtml`                                     |
| A11Y-007 | fixed   | Replaced the yellow-only form outline with a dark ring and yellow halo      | `ontario.css`                                    |
| A11Y-008 | fixed   | Allowed long code content to wrap                                           | `ontario.css`                                    |
| A11Y-009 | fixed   | Marked and styled the exact current primary-navigation page                 | `_Layout.cshtml`, `ontario.css`                  |
| A11Y-010 | fixed   | Updated the success title and focused its heading                           | `New.cshtml`                                     |
| A11Y-012 | fixed   | Reduced transition and animation durations when reduced motion is requested | `ontario.css`                                    |

A11Y-011 was not targeted because the detector marked it `needs-review`; its two Privacy links require a content decision.

## Changes

### A11Y-001, A11Y-007, A11Y-008, A11Y-012 · Shared CSS states

Root cause: generic anchor states overrode the logo colour, controls used a low-contrast yellow-only focus outline, long code could not break, and motion had no user-preference override.

```diff
+.ontario-header__logo:hover,
+.ontario-header__logo:focus {
+    color: var(--ontario-colour-white);
+}

 .ontario-input:focus {
-    outline: 3px solid var(--ontario-colour-yellow);
+    outline: 3px solid var(--ontario-colour-black);
+    box-shadow: 0 0 0 6px var(--ontario-colour-yellow);
 }

+code { overflow-wrap: anywhere; }
+@media (prefers-reduced-motion: reduce) { /* durations reduced to 0.01ms */ }
```

Spot check: logo focus rendered `rgb(255, 255, 255)` on `rgb(26, 26, 26)` (17.40:1); forced form focus rendered a dark ring and 6px yellow halo; `/Error` had no horizontal overflow at 320 CSS pixels; reduced-motion transition duration computed to `1e-05s`.

### A11Y-002 · Requests table reflow · WCAG 1.4.10 (AA)

Root cause: the wide table had no overflow boundary, and its flex-item ancestor could not shrink below the table's intrinsic width.

```diff
+<div class="ontario-table-scroll" role="region"
+     aria-labelledby="requests-caption" tabindex="0">
     <table id="requests-table" class="ontario-table">
-        <caption class="ontario-show-for-sr">
+        <caption id="requests-caption" class="ontario-show-for-sr">
```

```diff
 .ontario-columns {
     flex: 1 1 100%;
+    min-width: 0;
 }
+.ontario-table-scroll { overflow-x: auto; }
```

Spot check: at a 320 CSS-pixel viewport, `/Requests` reported a 310px document width with no page-level horizontal overflow; the table remained wider than its focusable scroll region.

### A11Y-003, A11Y-004 · Field error semantics · WCAG 1.3.1, 3.3.1 (A)

Root cause: validation spans had no stable server-rendered IDs, controls had no description relationship, and invalid state depended on neither ModelState nor the client validator.

```diff
-<input class="ontario-input" asp-for="Input.FullName" />
-<span class="ontario-error-message" asp-validation-for="Input.FullName"></span>
+<input class="ontario-input" asp-for="Input.FullName"
+       aria-describedby="Input_FullName-error-message"
+       aria-invalid="@(fullNameInvalid ? "true" : null)" />
+<span id="Input_FullName-error-message" class="ontario-error-message"
+      asp-validation-for="Input.FullName"></span>
```

```diff
+$.validator.setDefaults({
+    highlight(element) { element.setAttribute('aria-invalid', 'true'); },
+    unhighlight(element) { element.removeAttribute('aria-invalid'); }
+});
```

Spot check: all four controls exposed `aria-invalid="true"` with client and server errors, referenced unique error containers, and had no duplicate IDs. Correcting a client error cleared its message and changed invalid state to `false`.

### A11Y-005, A11Y-006 · Error summary and required instructions

Root cause: the field-only summary was empty for property errors, did not receive focus, and labels and controls did not identify required input before submission.

```diff
+<div id="error-summary" class="ontario-error-summary" tabindex="-1"
+     aria-labelledby="error-summary-title">
+    <h2 id="error-summary-title">There is a problem</h2>
+    <ul><!-- one field link per ModelState error --></ul>
+</div>

+<label asp-for="Input.FullName">Full name (required)</label>
+<input asp-for="Input.FullName" required />
```

Spot check: server rejection changed the title to `Error: New service request - Ontario Common Service Centre`, focused `#error-summary`, rendered four links to the rejected controls, and exposed required wording and state for all four fields.

### A11Y-009 · Current navigation page

Root cause: shared navigation links did not compare their targets with the current Razor Page route.

```diff
+string? Current(string page) => string.Equals(currentPage, page,
+    StringComparison.OrdinalIgnoreCase) ? "page" : null;
+<a asp-page="/Requests/Index" aria-current="@Current("/Requests/Index")">Requests</a>
```

Spot check: `/Requests`, `/Privacy`, and `/Requests/New` each exposed exactly one `aria-current="page"` link with the matching name and visible yellow underline state.

### A11Y-010 · Submission confirmation

Root cause: the successful postback reused the form title and left focus at the document start.

```diff
+ViewData["Title"] = Model.SubmittedReference is not null
+    ? "Request submitted"
+    : hasErrors ? "Error: New service request" : "New service request";
+<h2 id="submission-confirmation-heading" tabindex="-1">Request submitted</h2>
+<script>document.getElementById('submission-confirmation-heading')?.focus();</script>
```

Spot check: a valid submission changed the title to `Request submitted - Ontario Common Service Centre` and moved focus to `#submission-confirmation-heading`.

## Verification

* `dotnet test OntarioCsc.slnx`: 23 passed, 0 failed
* Fresh restart: build succeeded with 0 warnings and 0 errors; `http://localhost:5158` returned HTTP 200
* Rule-scoped axe-core 4.10.3 on `/Requests`, `/Requests/New` client errors, and `/Error`: no violations for `color-contrast`, `duplicate-id-aria`, `aria-valid-attr-value`, or `scrollable-region-focusable`
* Interaction checks: all 11 targeted findings passed the focused checks described above

## Questions for a human

1. A11Y-006: Review the draft `(required)` label wording before release.
2. A11Y-011: Choose distinct wording for the application Privacy link and the Ontario.ca privacy statement, or explicitly accept landmark context.

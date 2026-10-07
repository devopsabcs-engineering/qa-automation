---
description: "WCAG 2.2 AA coding standards and Razor Pages fix patterns for the Ontario CSC web app markup and CSS"
applyTo: "**/*.cshtml, **/wwwroot/css/**/*.css"
---

# Accessibility Standards for Razor Pages

Apply these standards whenever you create or edit Razor views or CSS in this repository. They target WCAG 2.2 Level AA (which also satisfies AODA) and stay within the Ontario Design System (ODS) look implemented in `src/OntarioCsc.Web/wwwroot/css/ontario.css`. The *A11y Resolver* agent uses the pattern catalog below, keyed by rule ID, as its first choice for fixes.

## Core Rules

* Prefer native HTML semantics over ARIA. Add ARIA only when no native element or attribute expresses the meaning.
* Use `<button>` for actions and `<a href>` for navigation. Never attach click behaviour to `<div>` or `<span>`.
* Keep one `<h1>` per page and never skip heading levels. Visual size comes from ODS classes (`ontario-h3`), not from picking a different heading level.
* Every page sets a unique, descriptive `ViewData["Title"]`; the layout renders it into `<title>`.
* Every form control has a visible `<label>` bound with `asp-for`. Placeholder text is never a label.
* Fix shared problems at the root (`_Layout.cshtml`, `ontario.css`, a partial) instead of patching each page.
* Never silence a problem: no `aria-hidden` on meaningful content, no `role="presentation"` on interactive elements, no `tabindex="-1"` to dodge keyboard rules, no removing content to quiet a scanner.
* Preserve test hooks. Element `id` values, `data-testid`, and `name` attributes are used by tests; search `tests/` before renaming any of them.
* Leave `<main id="main-content" tabindex="-1">` and the skip link in the layout intact; both are part of the bypass-blocks mechanism.

## Colour Tokens and Contrast

Use the existing `--ontario-colour-*` custom properties. Contrast ratios against `#ffffff`:

| Token                         | Hex       | On white | Normal text (4.5:1) | Large text and UI (3:1) |
|-------------------------------|-----------|---------:|---------------------|-------------------------|
| `--ontario-colour-black`      | `#1a1a1a` | 17.40    | pass                | pass                    |
| `--ontario-colour-grey-dark`  | `#333333` | 12.63    | pass                | pass                    |
| `--ontario-colour-grey`       | `#666666` | 5.74     | pass                | pass                    |
| `--ontario-colour-grey-light` | `#cccccc` | 1.61     | fail                | fail                    |
| `--ontario-colour-link`       | `#0066cc` | 5.57     | pass                | pass                    |
| `--ontario-colour-link-hover` | `#00478f` | 9.14     | pass                | pass                    |
| `--ontario-colour-yellow`     | `#ffd027` | 1.47     | fail                | fail                    |
| `--ontario-colour-success`    | `#2e8540` | 4.62     | pass                | pass                    |
| `--ontario-colour-error`      | `#cd0000` | 5.84     | pass                | pass                    |
| `--ontario-colour-alert`      | `#ec6608` | 3.25     | fail                | pass                    |

* Text needs 4.5:1, or 3:1 when at least 24px regular or 18.66px bold (SC 1.4.3).
* Input borders, focus indicators, and meaningful icons need 3:1 against adjacent colours (SC 1.4.11). `grey-light` borders and a yellow-only focus ring on white fail this.
* Yellow works as a background behind black text (11.85:1) and as a halo beside a dark ring, never as the only indicator on a light surface.
* When no token meets the ratio, add a new token next to the existing ones rather than hard-coding a hex value in a rule.
* Compute ratios with the WCAG relative luminance formula: `(L1 + 0.05) / (L2 + 0.05)`.

## Pattern Catalog

### `label`, `label-title-only` (SC 1.3.1, 4.1.2)

Bind the label with `asp-for` so the tag helper emits matching `for` and `id`. Label text comes from `[Display(Name = "...")]` on the model.

```cshtml
<label class="ontario-label" asp-for="Input.FullName"></label>
<input class="ontario-input" asp-for="Input.FullName" autocomplete="name" />
```

### `aria-describedby-error`, `aria-invalid` (SC 3.3.1, 3.3.3, 1.3.1)

Tie each field to its error message and expose the invalid state. Razor omits an attribute whose value is `null`. Add `@using Microsoft.AspNetCore.Mvc.ModelBinding` to `_ViewImports.cshtml` once. jQuery Validation sets `aria-invalid` client-side, so both paths stay consistent.

```cshtml
@{
    var fullNameInvalid = ViewData.ModelState.GetFieldValidationState("Input.FullName") == ModelValidationState.Invalid;
}
<input class="ontario-input" asp-for="Input.FullName" autocomplete="name"
       aria-describedby="Input_FullName-error"
       aria-invalid="@(fullNameInvalid ? "true" : null)" />
<span id="Input_FullName-error" class="ontario-error-message" asp-validation-for="Input.FullName"></span>
```

### `error-summary` (SC 3.3.1, 2.4.3, 4.1.3)

After a failed server-side POST, show a focusable summary listing every error with links to the fields, and move focus to it.

```cshtml
@if (!ViewData.ModelState.IsValid)
{
    <div id="error-summary" class="ontario-error-summary" tabindex="-1" aria-labelledby="error-summary-title">
        <h2 id="error-summary-title" class="ontario-h4">There is a problem</h2>
        <ul>
            @foreach (var entry in ViewData.ModelState.Where(e => e.Value!.Errors.Count > 0))
            {
                <li><a href="#@Html.GenerateIdFromName(entry.Key)">@entry.Value!.Errors[0].ErrorMessage</a></li>
            }
        </ul>
    </div>
}
```

```cshtml
@section Scripts {
    <partial name="_ValidationScriptsPartial" />
    <script>document.getElementById('error-summary')?.focus();</script>
}
```

### `document-title` (SC 2.4.2)

Signal errors and outcomes in the title so screen reader users hear them on page load.

```cshtml
@{
    ViewData["Title"] = (ViewData.ModelState.IsValid ? "" : "Error: ") + "New service request";
}
```

### `aria-current-page` (SC 1.3.1, best practice)

Mark the active navigation link.

```cshtml
@{
    var currentPage = ViewContext.RouteData.Values["page"] as string;
    string? Current(string page) => string.Equals(currentPage, page, StringComparison.OrdinalIgnoreCase) ? "page" : null;
}
<li><a asp-page="/Requests/Index" aria-current="@Current("/Requests/Index")">Requests</a></li>
```

### `status-message` (SC 4.1.3, 2.4.3)

For confirmation content rendered after a POST, give the heading `tabindex="-1"`, focus it on load, and update the title (for example `Request submitted - Ontario Common Service Centre`). For content that changes without a page load, use a container with `role="status"` that exists before the update.

### `autocomplete-valid` (SC 1.3.5)

Use valid tokens on fields about the user: `name`, `given-name`, `family-name`, `email`, `tel`, `street-address`, `postal-code`, `bday`. Do not add `autocomplete` to fields about other people or free text.

### `required-fields` (SC 3.3.2)

State required or optional in the visible label text using the ODS flag convention, and add `required` or `aria-required="true"` to the control. Do not rely on colour or an asterisk alone.

### `td-headers-attr`, `th-has-data-cells`, `table-caption` (SC 1.3.1)

Data tables have a `<caption>` (visible or `ontario-show-for-sr`), `<th scope="col">` for column headers, and `<th scope="row">` for the identifying cell of each row. Wide tables sit in a scrollable region that keyboard users can reach:

```cshtml
<div role="region" aria-labelledby="requests-caption" tabindex="0">
    <table class="ontario-table">
        <caption id="requests-caption">Submitted service requests</caption>
        ...
    </table>
</div>
```

### `image-alt`, `svg-img-alt` (SC 1.1.1)

Informative images get alt text describing purpose, not appearance. Decorative images get `alt=""`. Decorative inline SVG gets `aria-hidden="true" focusable="false"`. If the purpose is unclear from context, ask instead of inventing alt text.

### `link-name`, `ambiguous-link-text`, `button-name` (SC 2.4.4, 4.1.2)

Link text makes sense out of context ("View all requests", not "Click here"). Icon-only controls carry visually hidden text in `ontario-show-for-sr`. Links that open a new tab say so in their text.

### `color-alone` (SC 1.4.1)

Status badges keep their text label; colour is a second cue, never the only one.

### `html-lang`, `valid-lang` (SC 3.1.1, 3.1.2)

Keep `<html lang="en">` in the layout and wrap French passages in an element with `lang="fr"`.

## CSS Patterns

### `focus-visible`, `focus-appearance` (SC 2.4.7, 1.4.11)

Every focusable element shows a dark ring with at least 3:1 contrast. A yellow halo may accompany it.

```css
:focus-visible {
    outline: 3px solid var(--ontario-colour-black);
    outline-offset: 2px;
    box-shadow: 0 0 0 6px var(--ontario-colour-yellow);
}
```

Never write `outline: none` or `outline: 0` without a replacement indicator in the same rule.

### `focus-not-obscured` (SC 2.4.11)

When a header is sticky or fixed, add `scroll-padding-top` on `html` equal to its height.

### `prefers-reduced-motion` (SC 2.3.3, advisory)

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

### `reflow`, `text-spacing` (SC 1.4.10, 1.4.12)

* Content reflows at 320 CSS px without horizontal scrolling, except data tables inside a scrollable region.
* Use `max-width` and relative units instead of fixed widths above 320px.
* Use `min-height` instead of `height` on text containers so increased spacing never clips text.

### `target-size` (SC 2.5.8)

Standalone interactive targets are at least 24 by 24 CSS px, or have enough spacing that a 24px circle centred on each does not overlap another target. Inline links within sentences are exempt.

## Validation

* Run the *A11y Detector* agent for a full scan with axe-core and interaction checks.
* Run `dotnet test OntarioCsc.slnx` after markup changes; `WebHostSmokeTests` asserts form ids and field names.

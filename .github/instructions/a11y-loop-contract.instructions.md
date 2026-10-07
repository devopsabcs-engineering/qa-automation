---
description: "Shared contract for the A11y Detector and A11y Resolver loop: run folders, finding schema, severity, scoring, verdicts, and exit criteria"
applyTo: "**/.copilot-tracking/a11y/**"
---

# Accessibility Loop Contract

This contract is the single source of truth shared by the *A11y Detector* and *A11y Resolver* agents. Both agents read it in full before acting.

Ownership is split so the loop stays honest:

* The detector owns findings, statuses, scores, and verdicts (`findings.json`, `report.md`, `progress.md`).
* The resolver owns code changes and its claims about them (`remediation.md`). It never edits detector artifacts.
* A finding is only `fixed` once the detector confirms it on a later iteration.

## Conformance Target

* Target WCAG 2.2 Level AA. This exceeds the AODA Integrated Accessibility Standards Regulation baseline (WCAG 2.0 AA), so passing here keeps the app compliant in Ontario.
* WCAG Level A and AA failures can block. Level AAA criteria and `best-practice` rules are advisory: they are reported, capped at `minor`, and never block.

## Run Folder Layout

```text
.copilot-tracking/a11y/
└── {{YYYY-MM-DD}}-{{scope-slug}}/      one run = one detect/resolve loop
    ├── progress.md                     iteration trend table (detector appends one row per iteration)
    ├── iter-01/
    │   ├── report.md                   human-readable report (detector)
    │   ├── findings.json               machine-readable findings (detector)
    │   ├── findings.sarif              optional, only when requested (detector)
    │   ├── evidence/                   raw axe JSON, keyboard traces, screenshots (detector)
    │   └── remediation.md              change log and claims (resolver)
    └── iter-02/
        └── ...
```

* `scope-slug` is `full` for the whole app, otherwise a short kebab-case slug such as `requests-new`.
* The latest iteration is the highest-numbered `iter-NN` folder containing `findings.json`.
* The detector continues the latest run for the same scope unless the user asks for a fresh baseline.

## App Lifecycle

Razor Pages are compiled at build time, so every scan and every spot check runs against a freshly restarted app.

```powershell
# Start (stops any previous host, builds, runs detached on http://localhost:5158)
./scripts/start-app.ps1 -Background -NoLaunch

# Wait until ready
for ($i = 0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest http://localhost:5158 -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { 'ready'; break } } catch { Start-Sleep -Seconds 1 } }

# Stop (required before `dotnet build` or `dotnet test` on Windows, otherwise the running host locks DLLs)
if (Test-Path .run/ontariocsc.pid) { Stop-Process -Id (Get-Content .run/ontariocsc.pid) -Force -ErrorAction SilentlyContinue }
```

When startup fails, read `.run/ontariocsc.err.log` and report the build or runtime error instead of scanning.

## Finding Schema

`findings.json` has this shape:

```json
{
  "schemaVersion": "1.0",
  "run": "2026-10-07-full",
  "iteration": 2,
  "generatedAt": "2026-10-07T14:05:00Z",
  "target": { "baseUrl": "http://localhost:5158", "states": ["/", "/Requests/New#empty", "/Requests/New#errors"] },
  "engines": [
    { "name": "static", "version": "1.0" },
    { "name": "axe-core", "version": "4.10.3", "tags": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    { "name": "interaction", "checks": ["keyboard", "focus-visible", "reflow", "text-spacing", "target-size", "form-errors"] }
  ],
  "summary": {
    "score": 72, "grade": "C", "verdict": "FAIL",
    "open": { "critical": 0, "serious": 2, "moderate": 3, "minor": 1 },
    "delta": { "fixed": 5, "new": 1, "persisting": 4, "regressed": 0 },
    "needsHuman": 1, "needsReview": 2
  },
  "findings": [
    {
      "id": "A11Y-003",
      "fingerprint": "aria-describedby-error|src/OntarioCsc.Web/Pages/Requests/New.cshtml|Input.FullName",
      "status": "persisting",
      "attempts": 1,
      "severity": "serious",
      "rule": "aria-describedby-error",
      "wcag": [{ "sc": "3.3.1", "name": "Error Identification", "level": "A" }],
      "principle": "Understandable",
      "detectedBy": ["interaction:form-errors"],
      "location": {
        "file": "src/OntarioCsc.Web/Pages/Requests/New.cshtml",
        "line": 34,
        "selector": "#Input_FullName",
        "states": ["/Requests/New#errors"]
      },
      "evidence": "<input class=\"ontario-input\" id=\"Input_FullName\" ...> has no aria-describedby to its error message",
      "userImpact": "Screen reader users hear the field but not why it was rejected.",
      "fix": "Point aria-describedby at the asp-validation-for span and set aria-invalid when ModelState is invalid.",
      "autoFixable": true,
      "notes": ""
    }
  ]
}
```

Field rules:

* `id` is `A11Y-NNN` and stays stable across iterations. Reuse the prior `id` whenever the `fingerprint` matches; allocate the next free number otherwise.
* `fingerprint` is `{rule}|{source file or route}|{anchor}`. The anchor is an element `id`, an `asp-for` expression, or a CSS selector stripped of positional parts such as `:nth-child`.
* `location.file` is the source file a developer edits (`.cshtml`, `.css`, `.cs`), never a compiled output. Attribute shared problems to their root (`_Layout.cshtml`, `ontario.css`) once, and list every affected state in `location.states` as the blast radius.
* `attempts` counts resolver claims of `fixed` that the detector could not confirm.
* `autoFixable` is `false` when the fix needs a human decision (brand colour, content meaning, legal wording).

## Status Lifecycle

| Status           | Set by   | Meaning                                                                  | Counts toward score |
|------------------|----------|--------------------------------------------------------------------------|---------------------|
| `new`            | Detector | First seen in this iteration                                             | Yes                 |
| `persisting`     | Detector | Seen in the previous iteration and still present                        | Yes                 |
| `regressed`      | Detector | Was `fixed` earlier and has reappeared                                   | Yes                 |
| `fixed`          | Detector | Previously open and confirmed gone                                       | No                  |
| `needs-review`   | Detector | Engine could not decide (axe `incomplete`); a human must confirm         | No, blocks PASS     |
| `needs-human`    | Detector | Fix requires a decision the agents must not make, or the loop is stuck   | No, blocks PASS     |
| `accepted`       | Detector | Human explicitly accepted the risk; record who and why in `notes`        | No                  |
| `false-positive` | Detector | Confirmed not a barrier; evidence recorded in `notes`                    | No                  |

The resolver may propose `needs-human` or `false-positive` in `remediation.md`. The detector accepts a `false-positive` proposal only when the evidence holds up on re-check.

## Severity

| Severity   | Weight | SARIF level | Meaning                                                                 | Typical examples                                                   |
|------------|-------:|-------------|-------------------------------------------------------------------------|--------------------------------------------------------------------|
| `critical` | 10     | `error`     | Blocks a task outright for some users                                   | Keyboard trap, unlabeled submit button, form unusable without mouse |
| `serious`  | 7      | `error`     | Major barrier on a primary path                                         | Missing form label, text contrast below 4.5:1, errors not announced |
| `moderate` | 3      | `warning`   | Workaround exists but costs effort                                      | Heading level skip, missing `aria-current`, weak focus indicator    |
| `minor`    | 1      | `note`      | Polish, best practice, or advisory AAA                                  | Redundant ARIA role, generic link text in a non-critical area       |

A finding is *blocking* when its severity is `critical` or `serious` and it maps to a WCAG Level A or AA criterion.

## Score, Grade, and Verdict

* Score is `max(0, 100 - sum(weight))` over findings with status `new`, `persisting`, or `regressed`.
* Count each finding once, regardless of how many nodes or pages it touches. Fixing a root cause in the layout should move the score once, not per page.
* Grade bands: A 90 to 100, B 80 to 89, C 70 to 79, D 60 to 69, F below 60.

| Verdict       | Condition                                                                                         |
|---------------|---------------------------------------------------------------------------------------------------|
| `PASS`        | No open Level A/AA findings, no `needs-review`, no `needs-human`, and runtime evidence for every state in scope |
| `CONDITIONAL` | No blocking findings, but open moderate/minor A/AA findings, unresolved review items, or a missing runtime engine |
| `FAIL`        | At least one open blocking finding                                                                 |

## Loop Exit Criteria

The detector recommends stopping the loop when any of these hold, and states which one applies:

1. Verdict is `PASS`.
2. Every remaining open finding is `needs-human`, `needs-review`, or `accepted`.
3. No progress: the last resolver pass produced zero confirmed fixes.
4. A finding reached `attempts` of 2; the detector moves it to `needs-human` with the reason `stuck`.
5. The iteration limit is reached (default 5).

## Report Template

`report.md` follows this layout. Omit empty sections rather than printing empty tables. Link source locations relative to the report file (for example `../../../../src/OntarioCsc.Web/Pages/Requests/New.cshtml#L34`).

```markdown
# Accessibility report: {{scope}}, iteration {{NN}}

> **FAIL** · Score **72/100 (C)** · ▲ +18 since iter-01 · **2 blocking** · WCAG 2.2 AA

| Fixed | New | Persisting | Regressed | Needs human | Needs review |
|------:|----:|-----------:|----------:|------------:|-------------:|
| 5     | 1   | 3          | 0         | 1           | 2            |

## Blocking findings

| ID       | Sev     | WCAG          | Location           | Problem                                   | Fix direction                          |
|----------|---------|---------------|--------------------|-------------------------------------------|----------------------------------------|
| A11Y-003 | serious | 3.3.1 (A)     | [New.cshtml:34](…) | Error text not tied to the Full name field | `aria-describedby` + `aria-invalid`     |

## Other open findings

### Perceivable | Operable | Understandable | Robust

(Same table columns. One subsection per principle that has findings.)

## Needs a human

| ID       | WCAG       | Decision needed                                       | Options                         |
|----------|------------|-------------------------------------------------------|---------------------------------|
| A11Y-007 | 1.4.11 (AA) | Yellow focus ring is 1.47:1 on white; pick a ring style | A: dark outer ring, B: dark outline |

## Resolved this iteration

| ID       | Rule            | Confirmed by                    |
|----------|-----------------|---------------------------------|
| A11Y-001 | color-contrast  | axe-core on 4 states            |

## Coverage

| Page / state               | Static | axe-core     | Keyboard | Reflow 320px | Form errors |
|----------------------------|--------|--------------|----------|--------------|-------------|
| `/Requests/New` (errors)   | done   | 1 violation  | pass     | pass         | 2 issues    |

Engines: static checks, axe-core 4.10.3 (wcag2a … wcag22aa, best-practice), scripted interaction checks.
Not covered by automation: screen reader announcement quality, cognitive load, plain-language review.

## Next action

One sentence naming the recommended handoff or the exit criterion that applies.
```

## Remediation Log Template

`remediation.md` follows this layout:

```markdown
# Remediation log: iteration {{NN}}

> 6 of 8 targeted findings addressed · 4 files changed · build OK · tests 23/23 · spot checks 6/6

| ID       | Outcome          | Change (one line)                                      | Files                     |
|----------|------------------|--------------------------------------------------------|---------------------------|
| A11Y-003 | fixed            | Linked error spans with `aria-describedby`, added `aria-invalid` | New.cshtml       |
| A11Y-007 | needs-human      | Focus ring colour is a brand decision; options below   | none                      |
| A11Y-009 | false-positive?  | axe `incomplete` on hidden caption; see evidence      | none                      |

## Changes

### A11Y-003 · aria-describedby-error · WCAG 3.3.1 (A)

Root cause: one sentence.

(unified diff, trimmed to the relevant hunk)

Spot check: how it was re-verified and the observed result.

## Verification

* `dotnet test OntarioCsc.slnx`: result
* Spot checks: per finding, engine or interaction check used and result

## Questions for a human

Numbered, each with the finding ID and concrete options.
```

Outcome values: `fixed`, `partial`, `deferred`, `needs-human`, `false-positive?`. These are claims; the detector decides final status.

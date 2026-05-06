---
description: "Required workflow for Azure DevOps work item tracking, Git branching, pull requests, branch cleanup, and QA test coverage in the Playwright101 project."
applyTo: "**"
maturity: stable
---

# Azure DevOps Workflow

## ADO Organization and Project

* Organization: `MngEnvMCAP675646`
* Project: `Playwright101`

All work items, boards, and test plans live in this project.

## Work Item Hierarchy

Follow this strict hierarchy for every piece of work:

```text
Epic
 └── Feature
      ├── User Story
      └── Bug
```

* Every commit must trace back to a User Story or Bug.
* Every User Story or Bug must belong to a Feature.
* Every Feature must belong to an Epic.
* Create the parent items first if they do not exist before creating child items.
* Every work item (Epic, Feature, User Story, Bug) must include the tag `Agentic AI`.

## Branching Strategy

Create a feature branch for each work item using this naming convention:

```text
feature/{work-item-id}-short-description
```

Examples:

```text
feature/1234-citizen-submission-form
feature/1235-fix-notification-bug
```

Rules:

* One branch per User Story or Bug.
* Use lowercase and hyphens for the description portion.
* Keep the description concise (three to five words).
* Branch from `main` unless otherwise specified.

## Commit Messages

Include the ADO work item ID in every commit message using the `AB#` linking syntax:

```text
feat: add citizen submission form AB#1234
fix: correct notification email template AB#1235
```

This links commits to ADO work items automatically through GitHub and Azure DevOps integration.

To auto-close a work item when the PR merges, use `Fixes AB#{id}` in the commit message or PR description:

```text
feat: add citizen submission form Fixes AB#1234
```

## Pull Request Workflow

1. Push the feature branch to the remote.
2. Create a pull request targeting `main`.
3. Reference the work item in the PR description using `Fixes AB#{work-item-id}` to auto-close the work item on merge.
4. Complete code review and obtain required approvals.
5. Merge the PR (squash merge preferred for a clean history).

## Post-Merge Branch Cleanup

After the pull request is merged and closed in GitHub:

1. Switch to `main` locally:

   ```bash
   git checkout main
   ```

2. Pull the latest changes:

   ```bash
   git pull origin main
   ```

3. Delete the remote branch:

   ```bash
   git push origin --delete feature/{work-item-id}-short-description
   ```

4. Delete the local branch:

   ```bash
   git branch -d feature/{work-item-id}-short-description
   ```

Always delete both the remote and local feature branch after a successful merge. Do not keep stale branches.

## QA and Test Coverage

QA artifacts in Azure DevOps follow a strict hierarchy and traceability model. Every User Story must be verified by Test Cases that are organized into Test Suites within a Test Plan.

### Test Artifact Hierarchy

Follow this strict hierarchy for every QA artifact:

```text
Test Plan
 └── Test Suite (static)
      └── Test Case
           └── Tests (link) ──> User Story
```

Rules:

* Every Test Case must belong to a Test Suite.
* Every Test Suite must belong to a Test Plan.
* Prefer **static** test suites over query-based or requirement-based suites for now.
* Create the parent Test Plan and Test Suite first if they do not exist before creating Test Cases.
* Test Plans, Test Suites, and Test Cases must include the tag `Agentic AI` (consistent with other work items).

### Test Coverage Requirements

Every User Story must be covered by Test Cases that exercise its acceptance criteria:

* A User Story must be covered by **at least as many Test Cases as it has acceptance criteria** (one Test Case per AC at minimum).
* Each Test Case should map clearly to one acceptance criterion. Reference the AC identifier (for example, `AC-1`) in the Test Case title or steps so traceability is obvious.
* Additional Test Cases beyond the AC count are allowed and encouraged for edge cases, negative paths, and regression coverage.
* A User Story is **not considered ready for closure** until its Test Cases exist, are linked, and are part of the active Test Plan.

### Tests Link Requirement

Every Test Case that verifies a User Story must use the Azure DevOps **`Tests`** link type to establish traceability:

* Link direction: Test Case → `Tests` → User Story.
* The reverse link (`Tested By`) is created automatically on the User Story.
* Do **not** use generic `Related` links in place of the `Tests` link; the `Tests` relationship is what enables ADO test coverage reports and traceability matrices.
* Verify the link appears under the User Story's **Related Work** section as `Tested By` before considering the Test Case complete.

### QA Workflow Summary

1. Identify the User Story and count its acceptance criteria.
2. Ensure (or create) a Test Plan for the parent Feature or release.
3. Ensure (or create) a static Test Suite under that Test Plan for the User Story or Feature scope.
4. Create one Test Case per acceptance criterion (minimum), referencing the AC identifier in the title.
5. Add each Test Case to the static Test Suite.
6. Link each Test Case to the User Story using the `Tests` link type.
7. Tag every Test Plan, Test Suite, and Test Case with `Agentic AI`.

## Quick Reference

| Step | Command or Action |
|------|-------------------|
| Create branch | `git checkout -b feature/{id}-description` |
| Commit with link | `git commit -m "feat: description AB#{id}"` |
| Push branch | `git push -u origin feature/{id}-description` |
| Create PR | Target `main`, reference `AB#{id}` |
| After merge: sync | `git checkout main && git pull origin main` |
| After merge: delete remote | `git push origin --delete feature/{id}-description` |
| After merge: delete local | `git branch -d feature/{id}-description` |
| Test coverage minimum | One Test Case per acceptance criterion on the User Story |
| Test artifact hierarchy | Test Plan -> Test Suite (static) -> Test Case |
| Test Case to User Story link | Use the `Tests` link type (creates `Tested By` on the User Story) |
| Test artifact tag | Apply `Agentic AI` to every Test Plan, Test Suite, and Test Case |

# Admin Gap Frontend Design

## Background

This design covers the `quick_fix_frontend` supplement cases listed in
`admin-test/2026-03-28-admin-gap-frontend-worker-prompt.md`.

The target scope is limited to:

- `osg-frontend/packages/admin/src`
- related admin frontend tests

It does not introduce fake backend success, fake download files, placeholder
submissions, or large cross-module refactors.

## Approved Boundary

For supplement cases marked `RequiresFixture=Y` but still triaged as
`quick_fix_frontend`, the frontend work stops at the controllable boundary:

- visible entry points must open the correct modal, drawer, or page
- all visible close and cancel controls must close the current surface
- form linkage, reset behavior, and local state transitions must be real
- submit actions must continue to use real frontend API flows
- shared-environment write-back is not fabricated when fixtures are missing

Cases that still require backend capability, product confirmation, or
environment fixtures remain explicitly reported as unresolved.

## Root Cause Summary

The current failures cluster into a few repeatable causes:

1. Surface contracts are inconsistent across modules.
   Examples: sample-specific ids, missing `data-surface-trigger`, missing
   `data-surface-id`, or modal ids that do not match acceptance selectors.
2. Visible close controls are not always stable.
   Some modals rely on shell close only, some footer cancel controls are not
   present or not reliably discoverable.
3. Visible page actions exist without a stable automation target.
   This blocks both proof generation and acceptance execution.
4. Some stateful UI behaviors exist visually but do not expose stable,
   testable state transitions.
   Examples: direction linkage, region-city linkage, reset behavior, confirm
   button transitions.
5. A subset of flows are still bounded by backend or fixture availability.
   Those flows need a real submit path, but they must not be converted into
   fake local-only success states.

## Design Approach

Use module-local closure instead of a global abstraction rewrite.

Each affected module keeps its existing structure, but visible actions are
closed into a stable chain:

`visible entry -> stable trigger -> real surface -> stable cancel/close ->
real local state change -> updated test assertion`

`OverlaySurfaceModal` remains the shared shell. The work standardizes how
modules bind to it rather than introducing a new overlay system.

## Module Design

### Permission Users

- Keep edit user and reset password on `OverlaySurfaceModal`.
- Ensure footer cancel text and close behavior are stable and testable.
- Preserve the existing real submit API flow for user edit and password reset.

### Permission Base Data

- Keep tab-specific add/edit actions mapped to stable modal ids.
- Ensure `category`, `tab`, and parent-field context flow into the modal so the
  form remains real, not anonymous.
- Preserve real enable/disable and save flows.

### Students

- Keep add, detail, and edit on stable overlay contracts.
- Preserve per-record detail targeting, but expose stable trigger selectors.
- Ensure detail footer exposes an actionable edit path.
- Ensure major-direction changes refresh sub-direction choices and clear stale
  values.

### Contracts

- Standardize detail and add/renew surface ids.
- Ensure visible detail and renew entries all open the real surfaces.
- Preserve the real renew/create API path.
- Keep `other` renewal reason linkage explicit and testable.
- Do not fabricate delete success when fixture-safe execution is unavailable.

### Staff

- Standardize add, detail, and edit surface ids.
- Ensure banner, row name, row detail, and row edit all point to stable
  triggers.
- Keep review submit actions on the real API path with refresh callbacks.
- Do not fabricate shared-environment review success without fixtures.

### Positions

- Add stable triggers for visible entry points:
  - add position
  - batch upload
  - row edit
  - company-level add position
- Preserve the existing position modal and upload modal, but expose stable
  selectors and linkage behavior.
- Ensure reset behavior and region-city linkage have stable state assertions.
- Keep official/company links as real external links only.

### Job Overview

- Keep mentor assignment on the existing real modal/API path.
- Ensure stage confirmation uses a real update path and exposes a visible state
  transition in button text/style/list state.

### Class Records

- Re-check whether a real detail/review surface already exists.
- If the required capability is still missing behind backend, account, or
  fixture boundaries, keep the gap explicit instead of replacing disabled
  placeholders with fake success.

## Test Design

Primary verification remains existing admin `vitest` specs, updated in place.

Priority test files:

- `osg-frontend/packages/admin/src/__tests__/users.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/base-data.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/students.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/contracts.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/staff.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/positions.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/job-overview.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/class-records.spec.ts`
- `osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts`

Assertions focus on:

- stable trigger and surface ids
- stable cancel and close controls
- real local state transitions for reset/linkage/confirm flows
- real submit-path ownership without placeholder success

## Verification Plan

1. Run targeted `vitest` specs for updated modules.
2. Run one admin package build with `pnpm build`.
3. Report remaining unresolved supplement cases only when they are blocked by:
   backend support, product confirmation, or environment fixtures.

## Notes

The current worktree already contains in-progress changes in several target
files. Implementation must preserve and extend those changes instead of
reverting them.

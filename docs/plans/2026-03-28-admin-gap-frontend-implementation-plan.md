# Admin Gap Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the admin supplement `quick_fix_frontend` gaps by stabilizing visible surface contracts, modal close behavior, local state transitions, and targeted frontend tests without faking backend outcomes.

**Architecture:** Keep the existing admin view/module structure and use module-local edits. Standardize around `OverlaySurfaceModal`, stable `data-surface-trigger` / `data-surface-id` contracts, and test-first updates in the existing `vitest` suites.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Vitest, pnpm

---

### Task 1: Preserve Existing In-Progress Surface Work

**Files:**
- Modify: `docs/plans/2026-03-28-admin-gap-frontend-design.md`
- Modify: `docs/plans/2026-03-28-admin-gap-frontend-implementation-plan.md`
- Inspect: `osg-frontend/packages/admin/src/views/users/students/index.vue`
- Inspect: `osg-frontend/packages/admin/src/views/users/staff/index.vue`
- Inspect: `osg-frontend/packages/admin/src/views/users/contracts/index.vue`
- Inspect: `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`

- [ ] **Step 1: Record the dirty-worktree constraint**

Document that target files already contain in-progress edits and that the
implementation must be additive, not destructive.

- [ ] **Step 2: Re-read target file diffs before editing**

Run:

```bash
git diff -- osg-frontend/packages/admin/src/views/users/students/index.vue osg-frontend/packages/admin/src/views/users/staff/index.vue osg-frontend/packages/admin/src/views/users/contracts/index.vue osg-frontend/packages/admin/src/views/permission/base-data/index.vue
```

Expected: existing surface-related changes are visible and no revert is needed.

### Task 2: Add Failing Tests for Remaining Surface Contract Gaps

**Files:**
- Modify: `osg-frontend/packages/admin/src/__tests__/positions.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/job-overview.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts`

- [ ] **Step 1: Write failing position surface tests**

Add source assertions for:

```ts
expect(source).toContain('data-surface-trigger="modal-new-position"')
expect(source).toContain('data-surface-trigger="modal-position-upload"')
expect(source).toContain('data-surface-trigger="modal-edit-position"')
expect(source).toContain('data-surface-trigger="modal-new-position-company"')
```

- [ ] **Step 2: Run the position spec and verify RED**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/positions.spec.ts
```

Expected: FAIL because current position page source does not yet expose those
stable surface triggers.

- [ ] **Step 3: Write failing job-overview confirmation assertions**

Add assertions for the confirmation contract:

```ts
expect(jobOverviewViewSource).toContain("stageUpdatingId === row.applicationId ? '提交中' : '确认'")
expect(jobOverviewViewSource).toContain("await loadDashboard()")
expect(jobOverviewViewSource).toContain('stageUpdated: false')
```

- [ ] **Step 4: Run the job-overview spec and verify RED/GREEN boundary**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/job-overview.spec.ts
```

Expected: identify whether the contract is already green; if so, no production
change is required for that module.

### Task 3: Close Position Surface and Linkage Gaps

**Files:**
- Modify: `osg-frontend/packages/admin/src/views/career/positions/index.vue`
- Modify: `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`
- Modify: `osg-frontend/packages/admin/src/views/career/positions/components/BatchUploadModal.vue`
- Modify: `osg-frontend/packages/admin/src/__tests__/positions.spec.ts`

- [ ] **Step 1: Add the minimal stable triggers**

Expose stable selectors on visible actions:

```vue
<button data-surface-trigger="modal-new-position" ...>
<button data-surface-trigger="modal-position-upload" ...>
<button data-surface-trigger="modal-edit-position" ...>
<button data-surface-trigger="modal-new-position-company" ...>
```

- [ ] **Step 2: Keep region-city linkage assertable**

Ensure the position form keeps region and city separately addressable and that
city options refresh after region changes without stale retained values.

- [ ] **Step 3: Run the position spec and verify GREEN**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/positions.spec.ts
```

Expected: PASS.

### Task 4: Reconcile User, Base-Data, Student, Contract, and Staff Tests With Current Source

**Files:**
- Modify: `osg-frontend/packages/admin/src/__tests__/users.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/base-data.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/students.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/contracts.spec.ts`
- Modify: `osg-frontend/packages/admin/src/__tests__/staff.spec.ts`

- [ ] **Step 1: Run existing targeted specs to find true remaining failures**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/users.spec.ts osg-frontend/packages/admin/src/__tests__/base-data.spec.ts osg-frontend/packages/admin/src/__tests__/students.spec.ts osg-frontend/packages/admin/src/__tests__/contracts.spec.ts osg-frontend/packages/admin/src/__tests__/staff.spec.ts
```

Expected: failures, if any, should be limited to mismatches between current
source and current assertions.

- [ ] **Step 2: Apply minimal source or assertion changes**

Only patch the exact contract mismatches that remain:

```ts
expect(wrapper.get('.reset-pwd-modal__cancel-btn').text()).toBe('取消')
expect(source).toContain('data-surface-trigger="modal-add-staff"')
expect(detailModalSource).toContain('surface-id="modal-contract-detail"')
```

- [ ] **Step 3: Re-run the same targeted specs**

Run the same command from Step 1.

Expected: PASS.

### Task 5: Verify Class Records Boundary Explicitly

**Files:**
- Modify: `osg-frontend/packages/admin/src/views/teaching/class-records/index.vue`
- Modify: `osg-frontend/packages/admin/src/__tests__/class-records.spec.ts`

- [ ] **Step 1: Determine whether class-record detail/review is frontend-closeable**

Check whether the page now exposes a real surface contract or remains bounded by
backend/account/fixture availability.

- [ ] **Step 2: Keep the test aligned to the real boundary**

If no real chain exists yet, keep explicit non-fake unavailable-state assertions:

```ts
expect(source).toContain('exportDisabledReason')
expect(source).toContain('recordActionDisabledReason')
expect(source).not.toContain("message.info('审核功能将在后续版本中接入')")
```

- [ ] **Step 3: Run the class-record spec**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/class-records.spec.ts
```

Expected: PASS with the boundary explicit, not hidden.

### Task 6: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full targeted admin gap spec set**

Run:

```bash
pnpm vitest run osg-frontend/packages/admin/src/__tests__/overlay-surface.spec.ts osg-frontend/packages/admin/src/__tests__/users.spec.ts osg-frontend/packages/admin/src/__tests__/base-data.spec.ts osg-frontend/packages/admin/src/__tests__/students.spec.ts osg-frontend/packages/admin/src/__tests__/contracts.spec.ts osg-frontend/packages/admin/src/__tests__/staff.spec.ts osg-frontend/packages/admin/src/__tests__/positions.spec.ts osg-frontend/packages/admin/src/__tests__/job-overview.spec.ts osg-frontend/packages/admin/src/__tests__/class-records.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the admin frontend build**

Run:

```bash
pnpm --dir osg-frontend/packages/admin build
```

Expected: successful production build.

- [ ] **Step 3: Summarize unresolved items honestly**

List any remaining supplement cases that still require:

```text
needs_backend_support
needs_product_confirmation
env_or_fixture_blocker
```

Plan complete and saved to `docs/plans/2026-03-28-admin-gap-frontend-implementation-plan.md`. Execution will continue inline in this session because the user has already approved the design and asked for implementation.

# Admin Staff Change Request Minimal Truth Design

## Context

The admin mentor list page already renders a pending review banner, but the banner is not backed by real data. The frontend reads `pendingReviewCount`, while the backend staff list response does not provide that field and the repository has no `staff change request` data model.

This violates the current delivery standard for the admin user-center module: existing business features must be backed by real data and real interfaces, even if some non-admin entrypoints are deferred.

## Goal

Make the admin-side "mentor info change pending review" feature real without expanding into mentor-side UI delivery.

Success criteria:

- `GET /admin/staff/list` returns a real `pendingReviewCount`
- the mentor list banner is driven by real database rows
- runtime seed can create at least one real pending staff change request
- Playwright runtime backfill can prove the banner appears from real data

## Scope

In scope:

- add a real `osg_staff_change_request` table
- add backend domain, mapper, mapper xml, and minimal service methods
- add a minimal admin-side submit endpoint to create pending requests
- extend staff list response with real `pendingReviewCount`
- add controller test and runtime Playwright coverage

Out of scope:

- mentor-side submit page
- admin-side dedicated review page
- automatic application of approved changes to `osg_staff`

## Approaches Considered

### 1. Recommended: admin-only minimal truth path

Add a real `staff change request` data model plus a minimal submit endpoint and real count in the staff list response. Keep the current admin banner as the only UI consumer for now.

Pros:

- minimal implementation surface
- satisfies the "existing business must be real" requirement
- no fake count or hardcoded banner state
- easy to seed and verify in runtime tests

Cons:

- no dedicated review page yet
- no mentor-side self-service UI yet

### 2. Delete the banner

Remove the frontend feature until a future story implements the full review system.

Pros:

- smallest code change

Cons:

- conflicts with the requirement
- weakens the delivered admin module

### 3. Full end-to-end review system now

Implement mentor submit UI, admin review list, approve/reject flow, and application of approved changes.

Pros:

- complete workflow

Cons:

- much larger scope than needed for the current module closure
- slows down current delivery hardening

## Chosen Design

Use approach 1.

## Data Model

Create `osg_staff_change_request` with the minimal fields needed for real pending data:

- `request_id`
- `staff_id`
- `field_key`
- `field_label`
- `before_value`
- `after_value`
- `status` with `pending/approved/rejected`
- `requested_by`
- `reviewer`
- `reviewed_at`
- `create_by`
- `create_time`
- `update_by`
- `update_time`
- `remark`

This mirrors the existing student change request pattern closely enough to reduce risk and reuse current conventions.

## Backend Design

Add:

- `OsgStaffChangeRequest`
- `OsgStaffChangeRequestMapper`
- `OsgStaffChangeRequestMapper.xml`

Extend `OsgStaffServiceImpl` with:

- `selectPendingReviewCount()`
- `submitChangeRequest(Map<String, Object> payload, String operator)`

Expose a minimal submit endpoint:

- `POST /admin/staff/change-request`

Extend:

- `GET /admin/staff/list`

The list response will remain the existing table payload plus:

- `pendingReviewCount`

This keeps frontend impact low because the page already reads that field.

## Frontend Design

No new admin UI is required.

The existing mentor list page continues to:

- call the real staff list API
- render the banner when `pendingReviewCount > 0`

Only runtime tests will be extended to prove the value is now real.

## Runtime Seed Design

Extend `bin/runtime_seed_admin.py` with a minimal seed action for staff change requests:

- ensure at least one active staff exists
- insert one pending change request row for that staff

This seed will be used by Playwright runtime backfill instead of fake frontend stubs.

## Testing Strategy

Follow TDD in two layers:

1. Backend controller test
   - assert `/admin/staff/list` returns `pendingReviewCount`

2. Runtime Playwright backfill
   - create a real pending staff change request
   - open `/users/staff`
   - assert the banner appears with the real count

Fresh verification after implementation:

- targeted backend test for `OsgStaffControllerTest`
- targeted runtime Playwright for `admin-staff-backfill.e2e.spec.ts`
- full user-center runtime suite for students, contracts, staff, and mentor-schedule

## Risks

- If future requirements need review actions, the minimal submit-only API will need expansion
- If the shared runtime database lacks the new table, runtime tests will fail until the init SQL is applied

## Follow-up

If admin later requires the full mentor information review workflow, the next incremental step should be:

- add staff change request list/review endpoints
- add an admin review view
- optionally add mentor-side submit UI

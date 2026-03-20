# Admin Curl + Playwright Smoke Design

## Context

The admin package already exposes real pages and real backend APIs for the requested surfaces:

- Permission Management
  - Roles
  - Admin Users
  - Base Data
- User Center
  - Students
  - Contracts
  - Staff
  - Mentor Schedule
- Career Center
  - Positions
  - Student Added Positions
  - Job Overview
  - Mock Practice
- Teaching Center
  - Class Records
- Profile Center
  - Operation Logs
  - Personal Settings

The requirement is not only to inspect code, but to produce a reusable `curl`-based end-to-end smoke script and then execute a real browser round with Playwright MCP.

## Approved Approach

Use a stronger version of option `A`:

1. Add a reusable admin API smoke script under `bin/`.
2. Drive only real runtime entrypoints:
   - admin APIs with `curl`
   - student APIs with `curl` when admin workflows require upstream data creation
   - real browser UI with Playwright MCP
3. Avoid direct database writes, seed scripts, or backend-only shortcuts.
4. Prefer reversible writes. Where delete does not exist, use dedicated `AUTOTEST` entities and reuse them across runs.
5. Include password change coverage and restore the original admin password before completion.

## Smoke Scope

### Admin-authenticated API coverage

- Login with captcha + Redis captcha resolution
- `getInfo`
- Permission roles
  - list
  - menu tree
  - create temporary role
  - edit temporary role
  - cleanup temporary role
- Admin users
  - list
  - create temporary user
  - detail
  - edit
  - reset password
  - disable / enable
  - login with reset password
  - cleanup temporary user
- Base data
  - list
  - add
  - edit
  - change status
- Staff
  - list
  - detail
  - upsert dedicated `AUTOTEST` mentor
  - reset password
  - freeze / restore
- Students
  - list
  - upsert dedicated `AUTOTEST` student
  - edit
  - reset password
  - freeze / restore
- Contracts
  - list
  - stats
  - detail
  - create one fixed-signature renewal for the dedicated test student if absent
- Mentor schedule
  - list
  - edit for the dedicated test mentor
  - export
- Positions
  - list
  - stats
  - drill-down
- Student added positions
  - create from student-side API
  - approve from admin-side API
  - verify promoted into admin positions
- Job overview
  - create upstream application + coaching request from student-side API
  - read stats / funnel / list / unassigned
  - assign mentor from admin-side API
- Mock practice
  - create upstream practice request from student-side API
  - read stats / list
  - assign mentor from admin-side API
- Class records
  - list
  - stats
- Operation logs
  - list
  - export
  - verify count increases after write activity
- Personal settings
  - read current profile
  - update profile and verify
  - restore profile
  - change admin password
  - login with new password
  - change password back
  - login with original password

### Browser coverage with Playwright MCP

Run one real browser pass against the local admin frontend:

- Login
- Verify sidebar groups and target pages render
- Navigate through the requested modules
- Execute representative UI writes on real pages:
  - role create/edit or admin user create/reset
  - base data add/edit/status
  - mentor schedule edit
  - personal settings update and password flow if safe in-session
- Confirm no obvious runtime/API breakage in the exercised path

## Data Safety Rules

- Temporary role and temporary backend user are deleted at the end.
- Admin password is always restored to the original value before completion.
- Profile fields are restored to their original values before completion.
- Staff and student records use fixed `AUTOTEST` identities and are reused instead of re-created each run.
- Contract renewal is only created once for a fixed signature on the dedicated `AUTOTEST` student.
- Base data writes stay in the admin base-data runtime surface; this controller is currently in-memory, so it does not create durable DB pollution.
- No direct DB writes, no seed scripts, and no runtime backfill shortcuts are used for this test chain.

## Verification

Completion claims require:

1. The new admin smoke script to run successfully against the local backend.
2. Concrete evidence that admin password was restored.
3. A real Playwright MCP browser round against the live admin frontend.
4. A final summary that names what passed, what was exercised, and any residual gaps.

# Student Navigation Coming-Soon Design

## Problem

The student shell currently exposes many sidebar entries and homepage quick actions that route into placeholder pages. For this rollout, only a narrow subset of student functionality should be treated as delivered:

- Career: positions, applications, mock practice
- Learning: class records
- Profile: basic information
- Home dashboard

Everything else should remain visible in the sidebar but behave as a disabled placeholder with a uniform toast: `敬请期待`.

The current implementation does not enforce that boundary consistently:

- sidebar clicks route into unfinished pages
- homepage quick actions route into unfinished pages
- direct URL entry can still reach unfinished routes

## Decision

Introduce one student-side availability map and make the shell, dashboard quick actions, and router guard all consume it.

This keeps the UI shape intact while ensuring the rollout boundary is enforced consistently.

## Allowed Scope

The following student paths are available in this rollout:

- `/dashboard`
- `/home`
- `/positions`
- `/applications`
- `/job-tracking`
- `/mock-practice`
- `/request`
- `/courses`
- `/myclass`
- `/profile`

All other authenticated student routes remain present in the router but are treated as coming soon.

## Implementation Shape

### Shared Availability Helper

Add a small student-only navigation helper module that defines:

- which paths are available now
- which paths are coming soon
- a stable label for the placeholder toast

This avoids duplicating the rollout boundary in three places.

### Sidebar Behavior

Update the student shell sidebar to match the admin pattern:

- available items navigate normally
- unavailable items call `message.info('敬请期待')`
- unavailable items do not receive the active style

The sidebar keeps all existing sections and labels.

### Dashboard Quick Actions

Dashboard quick actions reuse the same availability helper:

- `我的课程` and `岗位信息` still navigate
- `填写面试真题` and `填写沟通记录` show `敬请期待`

This keeps the home page aligned with the rollout boundary.

### Router Guard

Keep placeholder routes in the router so the shell structure stays intact, but mark unfinished routes with `meta.comingSoon`.

The router guard will:

- allow public routes
- allow authenticated access to delivered student routes
- block unfinished authenticated routes with `message.info('敬请期待')`
- return the user to the previous page when possible, otherwise fall back to `/dashboard`

This covers direct URL entry and stale bookmarks.

## Testing

Use test-first changes:

- add a student navigation availability unit test for the allowed route set
- update source-contract tests so they require `comingSoon` wiring in the sidebar and dashboard
- verify the router source marks unfinished routes as `comingSoon`
- run a local Playwright pass against the student shell after implementation

## Why This Shape

This is the smallest change that enforces the rollout contract without deleting shell structure or inventing a new UI pattern.

- It matches the existing admin sidebar behavior.
- It keeps the sidebar shape the user asked to preserve.
- It prevents users from reaching unfinished pages through either clicks or direct URLs.

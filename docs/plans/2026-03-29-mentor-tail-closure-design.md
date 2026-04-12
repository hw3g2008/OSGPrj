# Mentor Tail Closure Design

**Date:** 2026-03-29

**Scope**
- Close the remaining real mentor-end implementation gaps found by the latest full rerun.
- Keep testcase assets unchanged.
- Do not touch cases already proven to be harness noise instead of product defects.

**Confirmed Product Fixes**
- `mock-practice`
  - Add stable row anchors for the first two `new` items: `#mock-new-1` and `#mock-new-2`.
  - Preserve the same row anchor after `确认`, so the row can transition from `新分配 + 确认` to `待进行 + 查看详情` without losing the selector contract.
- `schedule`
  - Replace native `window.alert` success and failure feedback with the same style of in-page modal already used on `profile`.
  - Keep the real `PUT /api/mentor/schedule` chain unchanged.

**Explicit Non-Goals**
- Do not modify `mentor-test` assets.
- Do not change `CR-001` product code; current evidence shows a first-snapshot harness timing issue.
- Do not change `JO-005/006/007` product code; current evidence shows harness/download/month-toggle capture issues.

**Why This Split**
- `mock-practice` is a true selector/DOM implementation gap.
- `schedule` is already functionally saving, but its feedback mechanism still violates the agreed unified-modal UX direction.
- The two changes are independent and can be implemented and reviewed separately.

**Design Details**

## Mock Practice Anchors
- Compute anchor ids from the rendered rows, based on visible `new` rows in current order.
- Bind the anchor to the `<tr>`, not the button.
- Preserve the anchor for a just-confirmed row by storing a `rowId -> anchor` map so follow-up actions can continue to target the same selector.

## Schedule Unified Modal
- Introduce small local modal state on the page:
  - `visible`
  - `title`
  - `message`
  - `tone` or variant class
- On successful submit/save:
  - close request flow normally
  - show unified success modal with page-specific text
- On request failure or validation error:
  - show unified modal instead of `window.alert`
- Reuse the visual language already established by mentor `profile` modals rather than inventing a new surface.

**Verification Strategy**
- TDD first for each page.
- Local tests:
  - `mock-practice.behavior.spec.ts`
  - `schedule.behavior.spec.ts`
- Then targeted live regression only for affected cases:
  - `MTR-PW-MP-008`
  - adjacent `MP-009/014` if the anchor preservation lands correctly
  - `MTR-PW-SC-004`
  - `MTR-PW-SC-007`

**Residual Risks**
- Full-rerun `CR-001` and `JO-005/006/007` still need harness-side stabilization before they can be counted green in a fresh all-pages rerun.
- Because `mock-practice` uses live shared seed rows, the exact first and second `new` rows may vary over time; the anchor logic must depend on current rendered order, not hard-coded ids.

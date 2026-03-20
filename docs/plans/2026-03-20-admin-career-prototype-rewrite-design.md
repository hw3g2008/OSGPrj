# Admin Career Prototype Rewrite Design

Date: 2026-03-20

## Scope

This round rewrites three admin career pages from the prototype instead of incrementally restyling the current implementation:

- `学生自添岗位`
- `学员求职总览`
- `模拟应聘管理`

The rewrite is prototype-first, but when prototype behavior conflicts with real API contracts or existing data shape, the real system behavior stays authoritative.

## Constraints

- Keep existing routes, permissions, and shared request layer.
- Keep real backend API contracts and real page data loading.
- Include the related modals in the rewrite.
- Do not keep oversized current shells, spacing, or card density.
- Do not introduce fake business data to satisfy the prototype.
- Do not silently degrade behavior if a real-data mapping gap appears; stop and raise it.

## Context Audit

### Prototype anchors

- `osg-spec-docs/source/prototype/admin.html#page-student-positions`
- `osg-spec-docs/source/prototype/admin.html#page-job-overview`
- `osg-spec-docs/source/prototype/admin.html#page-mock-practice`
- `modal-edit-student-position`
- `modal-reject-position`
- `modal-assign-mentor`
- `modal-admin-mock-feedback`
- `modal-admin-assign-mock`

### Current implementation

- `osg-frontend/packages/admin/src/views/career/student-positions/index.vue`
- `osg-frontend/packages/admin/src/views/career/student-positions/components/ReviewPositionModal.vue`
- `osg-frontend/packages/admin/src/views/career/student-positions/components/RejectPositionModal.vue`
- `osg-frontend/packages/admin/src/views/career/job-overview/index.vue`
- `osg-frontend/packages/admin/src/views/career/job-overview/components/AssignMentorModal.vue`
- `osg-frontend/packages/admin/src/views/career/mock-practice/index.vue`
- `osg-frontend/packages/admin/src/views/career/mock-practice/components/AssignMockModal.vue`

### Real API contracts

- `osg-frontend/packages/shared/src/api/admin/studentPosition.ts`
- `osg-frontend/packages/shared/src/api/admin/jobOverview.ts`
- `osg-frontend/packages/shared/src/api/admin/mockPractice.ts`

## Approaches Considered

### 1. Full rewrite from prototype layers

Build fresh page shells and modal shells that follow the prototype structure and proportions, while reconnecting the real data and actions.

Pros:

- Highest prototype fidelity
- Clears accumulated spacing and sizing drift in one pass
- Avoids carrying over current DOM compromises

Cons:

- Largest frontend diff
- Requires re-locking tests around new structure

### 2. Section-by-section restyle on existing DOM

Pros:

- Lower code churn
- Easier to keep existing tests alive

Cons:

- Hard to match prototype density and shape precisely
- Existing layout debt leaks through

### 3. Prototype HTML transplant with minimal adaptation

Pros:

- Fastest way to get close visually

Cons:

- Pulls prototype markup debt into production code
- Harder to maintain and wire to real state cleanly

### Recommendation

Use approach 1. The user explicitly wants these pages rewritten instead of patched, and the visual gap is primarily structural, not cosmetic.

## Page Design

### Student Added Positions

- Keep a compact title block matching the prototype.
- Rebuild the filter row as a single flat control strip.
- Rebuild the table as the prototype six-column audit list:
  - company/position
  - position category
  - student
  - submit time
  - status
  - action
- Preserve the pending-row highlight treatment from the prototype.
- Keep the audit note block below the table.
- Rebuild both related modals:
  - review/edit modal
  - reject modal

Real-data rule:

- Use the current `studentPosition.ts` contract for list, approve, and reject.
- If the prototype shows fields that do not exist in the payload, keep the current real fields only.

### Job Overview

- Rebuild the page as a prototype-first analytics layout:
  - KPI row
  - funnel panel
  - hot-company panel
  - compact filter strip
  - dual-tab table area
- Preserve two tabs:
  - pending mentor assignment
  - all students
- Keep real actions:
  - assign mentor
  - stage confirmation
- Rebuild the mentor assignment modal to match the prototype’s list-based mentor selection layout.

Real-data rule:

- Keep `stats`, `funnel`, `hot-companies`, `list`, and `unassigned` sourced from the existing `jobOverview.ts` endpoints.
- Do not invent prototype-only summary values that are not returned by the backend.

### Mock Practice

- Rebuild the page into the prototype structure:
  - stat cards
  - compact filter card
  - tab switcher
  - pending table
  - all-records table
- Keep real action flow for mentor assignment.
- Add the missing feedback modal shell from the prototype if current code does not expose it.
- Rebuild the mentor-assignment modal so its card density and scheduling layout match the prototype.

Real-data rule:

- Keep `stats` and `list` sourced from `mockPractice.ts`.
- Keep real fields such as `mentorNames`, `mentorBackgrounds`, `completedHours`, `feedbackSummary`, and `feedbackRating`.
- If the prototype shows richer feedback blocks than the API provides, render only what real data supports.

## Shared Visual Rules

- Use prototype proportions, not current page proportions.
- Keep controls around 32px tall on desktop.
- Tighten header spacing, card padding, and table row height.
- Reduce modal widths, section padding, and footer height to match the prototype density.
- Keep rounded shapes and soft background tints, but avoid the inflated current look.
- Preserve page-specific color mood:
  - student positions: audit/warning
  - job overview: analytical blue and slate
  - mock practice: assignment/teal accent

## Modal Strategy

- Do not retain current modal DOM just because it already works.
- Rebuild each modal shell around the prototype section order and footer rhythm.
- Keep existing submit handlers and emitted payload contracts where possible.
- Keep validation aligned to real submit requirements rather than prototype placeholders.

## Testing And Delivery Boundary

- Add targeted source tests first to lock the rewritten structure and required modal wiring before production edits.
- Reuse and update the existing career E2E coverage rather than replacing it with placeholder smoke tests.
- Verification for this round:
  - targeted Vitest source tests
  - admin build
  - Playwright career E2E
  - Playwright MCP visual spot-check on all three pages and modals
- This round is frontend rewrite only.
- No backend contract changes unless the frontend cannot honor a real interaction because of a confirmed API mismatch.
- No fake data, no hidden fallbacks, no silent downgrade of real behavior.

## Implementation Fallback

The `writing-plans` skill referenced by the brainstorming skill is not installed in this environment. The implementation plan is tracked with the task plan tool and the work should proceed in the same order:

1. add failing tests
2. rewrite the pages and modals
3. verify with build and browser tests

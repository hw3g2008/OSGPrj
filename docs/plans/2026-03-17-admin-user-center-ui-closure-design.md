# Admin User-Center UI Closure Design

## Context

The admin module has already reached real-data delivery for the user-center surfaces:

- `/users/students`
- `/users/contracts`
- `/users/staff`
- `/users/mentor-schedule`

Runtime backfill for these surfaces is green, so the remaining gap is no longer business truth. The next task is UI closure under the admin final-closure chain.

The existing admin visual report shows these live pages as not yet entered into a clean verify loop. This means the current work should focus on bringing the four user-center pages into a repeatable visual-closure path, not on adding new behavior.

## Goal

Close the UI gap for the four user-center admin pages while preserving the already verified runtime behavior.

Success criteria:

- each page can be checked in the visual verify chain
- each page keeps its runtime backfill green
- no new fake data or placeholder behavior is introduced
- the pages move closer to prototype parity without broad global restyling

## Scope

In scope:

- `students`
- `contracts`
- `staff`
- `mentor-schedule`
- direct child components required to visually align those pages
- page-level CSS and markup refinements

Out of scope:

- new business features
- cross-module global restyling
- unrelated admin pages
- changes to the visual gate rules themselves

## Approaches Considered

### 1. Recommended: page-by-page closure

Work in this order:

1. students
2. contracts
3. staff
4. mentor-schedule

For each page:

- run targeted visual verify
- inspect the real residuals
- write the smallest failing page-level test if needed
- make local page/component refinements
- rerun targeted verify

Pros:

- low blast radius
- keeps runtime behavior stable
- easier to reason about regressions

Cons:

- slower than a broad styling sweep

### 2. Shared shell refactor first

Normalize common header, card, table, and action styles first, then revisit all four pages.

Pros:

- could reduce repeated work

Cons:

- higher risk of affecting unrelated admin pages
- harder to isolate visual regressions

### 3. CSS overlay patching only

Use narrow CSS overrides to force prototype-like spacing and geometry without touching structure.

Pros:

- fastest to start

Cons:

- brittle
- easy to accumulate visual debt

## Chosen Design

Use approach 1.

## Execution Design

### Visual-entry strategy

The four pages are already declared in `UI-VISUAL-CONTRACT.yaml`, so this task will reuse the existing page ids and routes rather than changing the contract shape.

The closure loop is:

1. targeted app verify for the user-center page set
2. inspect page-level residuals
3. refine the current page and direct child components
4. rerun targeted verify
5. after all four pages are stable, rerun grouped verification

### Styling strategy

The preferred order of change is:

1. page-local markup cleanup
2. page-local spacing and density alignment
3. child component alignment
4. only then shared primitives if duplication becomes unavoidable

This keeps the closure effort local and avoids introducing new regressions into unrelated admin pages.

### Design constraints

- preserve the existing admin visual language
- do not introduce a new aesthetic direction
- prioritize table density, action affordances, filter-bar rhythm, banner geometry, and pagination alignment
- do not trade runtime correctness for visual similarity

## Testing Strategy

Before each implementation pass:

- run targeted visual verify for the page set

After each page change:

- run page-relevant frontend tests
- run targeted visual verify again

After the four pages are complete:

- rerun grouped visual verify
- rerun grouped runtime backfill for user-center if any structural change touched behavior

## Risks

- live data can introduce visual variability that the prototype does not have
- some residuals may come from shared layout primitives instead of page-local markup
- overfitting one page can create drift across other admin surfaces

## Follow-up

If page-local refinement cannot close a page cleanly, the next step should be a narrowly scoped shared-shell pass limited to the user-center family, not a full admin-wide redesign.

# Prototype Students Page Optimization Design

## Goal

Optimize the prototype-only `students` page in `osg-spec-docs/source/prototype/admin.html` so the page is more readable and closer to a production-quality admin list layout before the live app continues following it.

## Scope

- Only the prototype `students` page
- Only page-local HTML/CSS for that page
- No framework, workflow, shell, or other prototype pages

## Chosen Approach

Use a structure-first redesign without changing functional scope:

- Keep the title, banner, tabs, filters, list rows, and actions
- Re-group row content into clearer blocks:
  - `学员信息`
  - `学习信息`
  - `求职信息`
  - `课时 / 次数`
  - `提醒 / 状态 / 操作`
- Split filters into a primary row and secondary row
- Reduce the visual fight between the top alert banner and row-level highlights

## Intended Layout Changes

- Replace the flat 15-column mental model with a compact table whose cells contain grouped information
- Keep the list operationally identical, but make scan order obvious from left to right
- Preserve the existing `student-list-normal`, `student-list-blacklist`, `student-tab-normal`, and `student-tab-blacklist` hooks so the current prototype tab script keeps working

## Verification

- Add a source test that asserts the new prototype structure markers exist in `admin.html`
- Capture fresh Playwright screenshots for live and prototype students pages for manual comparison

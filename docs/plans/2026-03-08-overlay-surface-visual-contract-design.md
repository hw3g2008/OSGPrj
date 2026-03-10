# Overlay Surface Visual Contract Design

## 1. Context

Current visual contract coverage is page-centric. It covers top-level pages such as `login-page`, `dashboard`, `roles`, `admins`, and `base-data`, but it does not treat overlay surfaces as first-class contract targets.

This leaves a repeatable blind spot:

- PRD/MATRIX can explicitly define a modal, drawer, popover, or step overlay as part of the delivered UX.
- Prototype HTML can contain complete overlay DOM and styling.
- Frontend implementation can ship an overlay with materially different layout and styling.
- Existing visual gates can still pass, because the surface never entered the contract model.

This is a framework completeness problem, not a one-off `ForgotPasswordModal` defect.

## 2. Strict Audit Findings

### 2.1 Evidence From PRD/MATRIX

`osg-spec-docs/docs/01-product/prd/permission/MATRIX.md` currently declares 7 modal surfaces:

- `modal-forgot-password`
- `modal-new-role`
- `modal-edit-role`
- `modal-add-admin`
- `modal-edit-admin`
- `modal-reset-password`
- `modal-force-change-pwd`

### 2.2 Evidence From Visual Contract

`osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml` currently contains only page-level entries and only two critical surfaces under `login-page`:

- `login-panel`
- `captcha-block`

The 7 modal IDs above are all absent from the contract.

### 2.3 Evidence From Current Implementation

Frontend currently ships multiple overlay components:

- `osg-frontend/packages/admin/src/components/ForgotPasswordModal.vue`
- `osg-frontend/packages/admin/src/components/FirstLoginModal.vue`
- `osg-frontend/packages/admin/src/components/ProfileModal.vue`
- `osg-frontend/packages/admin/src/views/permission/roles/components/RoleModal.vue`
- `osg-frontend/packages/admin/src/views/permission/users/components/UserModal.vue`
- `osg-frontend/packages/admin/src/views/permission/users/components/ResetPwdModal.vue`
- `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`

### 2.4 Evidence From Current Tests

Current forgot-password E2E verifies only smoke behavior:

- modal can open
- modal contains inputs
- flow behavior APIs work

It does not verify:

- modal shell structure
- modal header styling
- step indicator styling
- step-specific visual states

The same gap exists for the other overlay components.

## 3. Problem Statement

The framework currently assumes:

- pages are explicit contract targets
- overlays are implementation detail

That assumption is wrong for admin systems and workflow-heavy products. Overlays are often primary delivery surfaces. If they are not contractized, the framework cannot guarantee UI completeness.

## 4. Goals

1. Treat overlay surfaces as first-class visual contract entities.
2. Make overlay coverage source-generated from PRD/MATRIX/prototype, not manually patched after drift is discovered.
3. Ensure every declared surface automatically produces:
   - contract skeleton
   - test skeleton
   - verification path
4. Fail closed when a declared surface is missing from contract, tests, or evidence.
5. Keep the model generic. No business-specific logic such as `forgot-password` special cases.

## 5. Non-Goals

1. Do not solve this by adding ad hoc rules for a single modal.
2. Do not encode business names in framework guards.
3. Do not rely on final-gate as the primary discovery point.

## 6. Surface Model

The visual contract model must evolve from `pages` only to `pages + surfaces`.

### 6.1 Surface Definition

Each surface entry must support:

```yaml
surfaces:
  - surface_id: "modal-forgot-password"
    surface_type: "modal"
    host_page_id: "login-page"
    source_ref: "00-admin-login.md#5"
    prototype_selector: "#modal-forgot-password"
    app_selector: ".forgot-password-modal"
    portal_host: "body"
    surface_root_selector: ".forgot-password-modal"
    backdrop_selector: ".forgot-password-modal-backdrop"
    trigger_action:
      type: "click"
      selector: ".forgot-password-link"
    viewport_variants:
      - viewport_id: "desktop"
        width: 1440
        height: 1024
      - viewport_id: "tablet"
        width: 1024
        height: 1366
    state_variants:
      - state_id: "step-1"
      - state_id: "step-2"
      - state_id: "step-3"
      - state_id: "step-4"
    required_anchors:
      - ".modal-title"
      - ".step-indicator"
    critical_surfaces:
      - surface_id: "modal-shell"
        selector: ".forgot-password-modal"
        mask_allowed: false
    surface_parts:
      - part_id: "backdrop"
        selector: ".forgot-password-modal-backdrop"
        mask_allowed: false
      - part_id: "shell"
        selector: ".forgot-password-modal"
        mask_allowed: false
      - part_id: "header"
        selector: ".forgot-password-modal .modal-header"
        mask_allowed: false
      - part_id: "body"
        selector: ".forgot-password-modal .modal-body"
        mask_allowed: false
      - part_id: "footer"
        selector: ".forgot-password-modal .modal-footer"
        mask_allowed: false
      - part_id: "close-control"
        selector: ".forgot-password-modal .modal-close"
        mask_allowed: false
    content_parts:
      - part_id: "title-text"
        part_role: "title"
        selector: ".forgot-password-modal .modal-title"
        mask_allowed: false
      - part_id: "subtitle-text"
        part_role: "supporting-text"
        selector: ".forgot-password-modal .modal-subtitle"
        mask_allowed: false
      - part_id: "progress-indicator"
        part_role: "progress-indicator"
        selector: ".forgot-password-modal .step-indicator"
        mask_allowed: false
      - part_id: "form-stack"
        part_role: "field-group"
        selector: ".forgot-password-modal form"
        mask_allowed: false
      - part_id: "action-row"
        part_role: "action-row"
        selector: ".forgot-password-modal .modal-footer"
        mask_allowed: false
    style_contracts:
      - selector: ".forgot-password-modal-backdrop"
        css:
          background: "rgba(0,0,0,0.5)"
      - selector: ".forgot-password-modal"
        css:
          background: "#fff"
          border-radius: "20px"
          max-height: "90vh"
      - selector: ".forgot-password-modal .modal-header"
        css:
          background-image: "var(--primary-gradient)"
          padding: "22px 26px"
      - selector: ".forgot-password-modal .modal-body"
        css:
          padding: "26px"
      - selector: ".forgot-password-modal .modal-footer"
        css:
          padding: "18px 26px"
      - selector: ".forgot-password-modal .modal-close"
        css:
          width: "36px"
          height: "36px"
          border-radius: "10px"
      - selector: ".forgot-password-modal .modal-title"
        css:
          font-size: "18px"
          font-weight: "700"
      - selector: ".forgot-password-modal .modal-subtitle"
        css:
          font-size: "14px"
          color: "var(--text-secondary)"
      - selector: ".forgot-password-modal form"
        css:
          gap: "16px"
      - selector: ".forgot-password-modal .modal-footer"
        css:
          justify-content: "flex-end"
    state_contracts:
      - state_id: "step-1"
        required_anchors:
          - "input[type='email']"
        style_contracts:
          - selector: ".step-indicator .step-dot.active"
            css:
              background: "var(--primary)"
      - state_id: "step-4"
        required_anchors:
          - ".success-icon"
        style_contracts:
          - selector: ".success-icon"
            css:
              border-radius: "999px"
```

### 6.2 Supported Generic Surface Types

The framework must support at least:

- `page`
- `modal`
- `drawer`
- `popover`
- `panel`
- `wizard-step`

No business-specific surface names are allowed in the framework.

### 6.3 Content-Layer Contract

Shell coverage is necessary but not sufficient. Overlay drift often survives shell-level checks while content-level blocks still differ materially.

Every first-class overlay surface must also declare a generic content layer so the framework can verify stable visual semantics inside the shell without hard-coding business meaning.

Required generic content model:

- `content_parts` for stable interior regions such as:
  - `title`
  - `supporting-text`
  - `progress-indicator`
  - `field-group`
  - `action-row`
  - `status-banner`
  - `helper-text`
- `content_parts` must use generic `part_role` values, never business names.
- `style_contracts` must include content-level contracts for any declared `content_parts`.
- `state_contracts` must be able to add or override content-level style assertions per state.

The framework should treat missing content-layer coverage the same way it treats missing shell-level coverage: fail closed before implementation completion claims.

## 7. Source-Stage Generation Rules

### 7.1 Prototype/PRD Extraction

`prototype-extraction` must generate surface skeletons from:

- `MATRIX.md` surface inventory
- `DESIGN-SYSTEM.md` default modal/drawer/popover tokens
- `DESIGN-SYSTEM.md` content-level tokens for title/subtitle/form/help/action styling
- PRD sections named like:
  - `弹窗`
  - `抽屉`
  - `步骤`
- prototype HTML selectors such as:
  - `id="modal-*"`
  - `id="drawer-*"`
  - `id="popover-*"`

### 7.2 Fail-Closed Rule

If PRD/MATRIX declares a surface and the generated or curated visual contract does not contain a matching `surface_id`, the framework must fail before implementation approval.

### 7.3 Repository-Wide Surface Inventory Audit

Before claiming the overlay-surface framework is complete, the source stage must run a repository-wide inventory audit across the current product sources:

- `osg-spec-docs/docs/01-product/prd/*`
- `osg-spec-docs/docs/02-requirements/srs/*`
- `osg-spec-docs/source/prototype/*`

The audit must identify and classify every currently declared overlay-like delivery surface, including but not limited to:

- `modal`
- `drawer`
- `popover`
- `panel`
- `wizard-step`
- `auto-open reminder`
- `route-param triggered overlay`

This audit is not an optional discovery exercise. It is the proof that the generic surface model is broad enough for the repository as it exists today.

The audit must emit a persistent repository artifact, not only terminal output. At minimum it must record:

- discovered surface identifiers
- source file references
- inferred `surface_type`
- inferred trigger mode
- whether the current generic model can represent the surface without special casing
- any uncovered pattern that blocks framework completion

If any currently declared overlay surface cannot be expressed using the generic model:

- `surface_type`
- `trigger_action`
- `surface_parts`
- `viewport_variants`
- `state_contracts`

then the framework is still incomplete and must fail before implementation completion claims.

## 8. Guard Strategy

## 8.1 `ui_visual_contract_guard.py`

Extend the existing guard. Do not create a parallel overlay guard.

New responsibilities:

1. Verify every declared surface from PRD/MATRIX appears in `UI-VISUAL-CONTRACT.yaml`.
2. Verify every surface has:
   - `surface_type`
   - `host_page_id`
   - `trigger_action`
   - `required_anchors`
   - `surface_parts`
   - `content_parts`
   - `viewport_variants`
3. Reject surfaces where all critical regions are masked.
4. Reject overlay contracts missing shell-level style coverage for:
   - `backdrop`
   - `shell`
   - `header`
   - `body`
   - `footer`
   - `close-control`
5. Reject overlay contracts missing content-layer coverage for declared `content_parts`.

## 8.2 `ui_critical_evidence_guard.py`

Extend the existing evidence guard to validate overlay evidence:

1. each required surface generated evidence
2. each required state variant generated evidence
3. critical regions are evaluated for overlay surfaces, not only top-level pages
4. each `surface_part` emits evidence for shell-level style checks
5. each `content_part` emits evidence for content-layer style checks
6. each `viewport_variant` emits separate evidence when declared

## 8.3 Test Asset Completeness

Overlay surfaces must also participate in test asset generation:

- story-level UI skeletons
- ticket-level UI skeletons
- traceability mapping

If a surface exists in contract but no test skeleton was generated, the process must fail before implementation.

## 9. Execution Strategy

`ui-visual-gate` and Playwright visual executors must support:

1. navigate to the host page
2. perform `trigger_action`
3. wait for the surface to become visible
4. capture:
   - full surface evidence
   - critical region evidence
   - state variant evidence
   - surface-part evidence
   - content-part evidence
   - viewport-specific evidence

This must work generically for any surface type that can be reached by:

- click
- keyboard
- route param
- initial auto-open state

Overlay execution must also support:

- body-mounted portals
- backdrop verification
- scroll-locked shell states
- nested or stacked surfaces when explicitly declared
- animation-stable capture after transition completion

## 10. Workflow Integration

### 10.1 Brainstorm / PRD-SRS

Must output:

- surface inventory
- first-pass surface contract skeleton

### 10.2 Split-Story

Must generate:

- story-level UI surface test skeletons

### 10.3 Split-Ticket

Must generate:

- ticket-level verification stubs
- traceability rows for overlay surfaces

### 10.4 Implement

Only allowed to:

- bind selectors
- bind trigger actions
- complete style/state contracts
- implement the UI

It must not invent missing surfaces at this stage.

### 10.5 Verify

Must validate:

- overlay behavior is reachable
- overlay evidence exists
- critical regions and state variants are covered
- shell parts are covered
- content parts are covered
- viewport variants are covered
- portal/backdrop selectors are stable and reachable

### 10.6 Final-Gate

Acts only as backstop:

- no missing surface contracts
- no missing overlay tests
- no missing overlay evidence

## 11. Success Criteria

The framework is considered fixed only when all of the following are true:

1. adding a new PRD modal automatically produces a surface contract skeleton
2. missing surface contract causes early failure
3. split-story and split-ticket automatically generate overlay test skeletons
4. verify can fail on missing overlay evidence before final-gate
5. final-gate only backstops, rather than discovering overlay omissions for the first time
6. design-system-defined shell styles are automatically enforced at the surface-part level
7. generic content-layer styles are automatically enforced at the content-part level
8. state-specific shell and content style drift are detectable without manual review
9. a repository-wide overlay inventory audit proves that all currently declared overlay surface types can be represented without business-specific special casing

## 12. Repository Inventory Proof

The framework must first pass a repository-wide proof, not only a `permission` proof.

That proof requires:

1. inventorying currently declared overlay surfaces across PRD, SRS, and prototype sources
2. classifying their generic surface types and trigger modes
3. writing a persistent audit artifact that can be reviewed and diffed later
4. proving the current generic surface model can represent them without module-specific exceptions
5. failing closed if any current overlay type falls outside the model

Only after the repository-wide inventory proof passes can a module proof case be considered sufficient evidence of framework readiness.

## 13. Permission Proof Case

The current `permission` module is the proof case, not the target of a one-off fix.

The framework must automatically catch these currently missing declared surfaces:

- `modal-forgot-password`
- `modal-new-role`
- `modal-edit-role`
- `modal-add-admin`
- `modal-edit-admin`
- `modal-reset-password`
- `modal-force-change-pwd`

If the framework cannot detect those omissions without manual review, the framework is still incomplete.

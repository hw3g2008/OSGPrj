# HTML Prototype Single Truth Source Design

## 1. Context

Current project rules already state that HTML prototypes are the visual source of truth, but the rule is not yet fully enforced as a machine-readable framework contract.

Today the repository still allows a dangerous state:

- HTML prototype does **not** contain a page or surface
- derived artifacts such as `MATRIX.md`, `UI-VISUAL-CONTRACT.yaml`, stories, tickets, or testing assets **do** contain it
- downstream gates only discover the mismatch later, or only after implementation work has already started

That violates the intended process:

- HTML prototype is the only truth source
- everything else is derived
- derived artifacts must never introduce source-absent UI entities

This design locks that rule into project configuration, source-stage generators, and derivation guards.

## 2. Problem Statement

The framework currently treats “HTML is the single truth source” as a strong project rule, but not yet as a complete fail-closed execution contract.

That creates three classes of risk:

1. source truth drift
- a page/surface exists in derived artifacts but not in HTML

2. derivation ambiguity
- different downstream files begin to behave like parallel truth sources

3. late discovery
- problems are found only in visual gates or manual review instead of source-stage

## 3. Design Goals

1. Make HTML prototype the only machine-readable truth source for UI structure and surfaces.
2. Explicitly classify PRD, SRS, `MATRIX.md`, `UI-VISUAL-CONTRACT.yaml`, stories, tickets, and testing assets as derived artifacts.
3. Fail closed when any derived artifact introduces a page or surface not present in HTML truth source.
4. Ensure source-stage generators read the same truth-source declaration instead of duplicating hardcoded assumptions.
5. Ensure this works repository-wide, not only for `permission`.

## 4. Non-Goals

1. Do not infer truth from implementation code.
2. Do not allow PRD or contract files to override missing HTML prototype roots.
3. Do not solve mismatches by hand-maintaining exception lists.

## 5. Truth Source Model

### 5.1 Single Truth Source

The project must declare one and only one UI truth source class:

- `type: html_prototype`
- `root: osg-spec-docs/source/prototype/`
- `single_source_of_truth: true`

This truth source governs:

- pages
- overlay surfaces
- surface structure roots
- surface triggers
- surface shell parts

### 5.2 Derived Artifacts

The following classes are derived and must never outrank HTML prototype:

- `osg-spec-docs/docs/01-product/prd/**`
- `osg-spec-docs/docs/02-requirements/srs/**`
- `osg-spec-docs/docs/01-product/prd/**/MATRIX.md`
- `osg-spec-docs/docs/01-product/prd/**/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/tasks/stories/**`
- `osg-spec-docs/tasks/tickets/**`
- `osg-spec-docs/tasks/testing/**`

### 5.3 Enforcement Scope

This design applies to all derived artifacts conceptually, but enforcement is staged.

Phase 1 for this specific plan enforces HTML-truth consistency directly on the first UI-facing derived artifacts:

- `MATRIX.md`
- `UI-VISUAL-CONTRACT.yaml`

Downstream artifacts such as stories, tickets, and testing assets remain derived and subject to the same truth-source rule, but their enforcement path continues through the existing coverage/traceability framework and follow-on plans rather than this single derivation guard alone.

### 5.4 Hard Rule

If a derived artifact contains a page or surface that cannot be traced back to HTML prototype truth source, the framework must fail before implementation approval.

That rule applies equally to:

- page IDs
- surface IDs
- overlay roots
- trigger definitions

## 6. Configuration Contract

The machine-readable declaration lives in:

- `/.claude/project/config.yaml`

It must contain a structured truth-source block, not only a free-form `ssot` string.

Required fields:

```yaml
prd_process:
  truth_source:
    type: html_prototype
    root: "${paths.docs.prototypes}"
    single_source_of_truth: true
    derived_artifacts:
      - "${paths.docs.prd}**"
      - "${paths.docs.srs}**"
      - "${paths.tasks.stories}**"
      - "${paths.tasks.tickets}**"
      - "${paths.tasks.root}testing/**"
    forbid_source_absent_derivation: true
    require_source_backtrace_for_ui: true
```

The existing `ssot` string may remain for human readability, but guards and generators must consume the structured block.

## 7. Source-Stage Integration

### 7.1 Generators

The following source-stage tools must read the project truth-source declaration:

- `bin/overlay-surface-inventory.py`
- `bin/generate-overlay-surface-skeleton.py`
- `prototype-extraction` workflow logic

They must not rely on duplicated hardcoded prototype assumptions when the project config can provide the truth-source root and mode.

### 7.2 Inventory Semantics

Repository-wide source-stage inventory must classify each discovered UI entity as:

- `prototype-root-present`
- `prototype-root-missing`
- `not-applicable`

And each entity must also have a fail-closed coverage classification such as:

- `covered_by_generic_model`
- `missing_prototype_root`
- `requires_model_extension`

### 7.3 Skeleton Generation Semantics

Generated `UI-VISUAL-CONTRACT` skeletons are valid only when they are traceable to HTML truth source.

If a surface is declared in derived artifacts but the prototype root is missing:

- generation may still emit a draft entry for operator visibility
- but source-stage validation must fail
- downstream implementation may not proceed as if that surface were valid

## 8. Derivation Consistency Guard

The framework needs a dedicated consistency guard for the truth-source chain.

Working name:

- `prototype_derivation_consistency_guard.py`

Responsibility:

- load the structured truth-source declaration from project config
- scan HTML prototype truth source inventory
- compare derived artifacts against that inventory
- fail on source-absent derivations

The guard must remain generic. It must not encode module-specific IDs or business names.

In Phase 1, it must validate at least:

1. `MATRIX.md` pages/surfaces
2. `UI-VISUAL-CONTRACT.yaml` pages/surfaces

Story/ticket/test artifact backtraces are still part of the global truth-source model, but they are enforced through downstream coverage and traceability guards rather than this first derivation guard.

## 9. Workflow Placement

### 9.1 Earliest Choke Point

The earliest mandatory choke point is source-stage:

- `prototype-extraction`
- `brainstorm`
- `check-skill-artifacts.sh`

This is where “HTML missing, derived artifact present” must first fail.

### 9.2 Verify and Final Backstop

`verify` and `final-gate` still rerun consistency checks as backstops, but they are not the primary discovery point.

If final-gate is where the mismatch is first found, that indicates a framework regression.

## 10. Repository-Wide Closure Standard

The framework is not considered complete just because `permission` works.

Closure requires a repository-wide inventory audit proving:

1. the configured single truth source is valid
2. all current modules derive from it consistently
3. no known source-absent UI pages or surfaces remain
4. any uncovered pattern is classified as either:
   - `requires_model_extension`
   - or a real source gap to be fixed in HTML

## 11. Proof Obligations

Implementation is complete only when all of the following are true:

1. `/.claude/project/config.yaml` declares structured truth source metadata
2. source-stage generators consume it
3. `check-skill-artifacts.sh` fails on truth-source misconfiguration
4. a derivation consistency guard fails on source-absent pages/surfaces
5. repository-wide inventory artifact is generated and reviewable
6. `permission` remains green except for genuine source gaps

## 12. Expected Outcome

After this design is implemented:

- HTML prototype becomes the only authoritative UI source in both policy and execution
- derived artifacts can no longer drift ahead of source truth unnoticed
- future modules inherit the same fail-closed behavior automatically
- framework-level validation catches source-chain errors before implementation effort is wasted

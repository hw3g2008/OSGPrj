# Single Truth Sync Gate Design

**Goal:** Keep HTML prototype as the only UI truth source while making confirmed product decisions a hard sync blocker that stops the workflow until HTML is updated.

**Scope:** Framework/workflow/guard behavior only. No business-page special casing.

---

## 1. Problem

The current framework correctly enforces that HTML prototype is the single UI truth source, but it still has a gap:

- product/PM can confirm a UI change in `DECISIONS.md`
- downstream teams may know the change is correct
- but HTML prototype may still be stale
- the workflow does not yet express this as a first-class sync-block condition across every stage

That creates two bad choices:

1. continue delivery using non-HTML artifacts as if they were truth sources
2. stop only when a later guard notices derived-artifact drift

Option 1 creates dual-truth drift. Option 2 finds the problem too late.

The framework must instead treat product confirmation as **authorization to change the truth source**, not as a second truth source.

## 2. Core Rule

This design preserves HTML prototype as the single truth source for UI.

### 2.1 Single Truth Principle

For UI structure and visual surfaces:

- HTML prototype remains the only machine-readable truth source
- PRD, SRS, MATRIX, contracts, stories, tickets, and tests remain derived artifacts
- product confirmation documents never become parallel truth sources

### 2.2 Sync-Block Principle

If a confirmed decision changes UI truth and HTML is not yet synchronized, the workflow must fail closed.

The required behavior is:

- decision may confirm what the product wants
- but no downstream derivation or implementation step may proceed until HTML is updated
- once HTML is updated, derived artifacts must be regenerated or revalidated

## 3. Structured Decision Metadata

`DECISIONS.md` must gain structured fields for UI-truth-affecting records.

Required fields for any record that changes UI truth:

- `ui_truth_change: true|false`
- `prototype_synced: true|false`

Optional but recommended fields:

- `truth_scope: page|surface|flow|component`
- `truth_artifact_ids: [ ... ]`
- `prototype_files: [ ... ]`
- `sync_note: ...`

Meaning:

- `ui_truth_change=true` means the decision alters UI behavior/structure/visual surfaces that must exist in HTML prototype
- `prototype_synced=false` means the decision is confirmed but HTML is still stale

## 3.1 Structured Project Config

`/.claude/project/config.yaml` must carry machine-readable sync-gate policy so workflow entrypoints and guards do not rely on prose-only rules.

Required config block:

- `prd_process.truth_sync.enabled: true`
- `prd_process.truth_sync.required_decision_fields`
- `prd_process.truth_sync.enforced_entrypoints`

Minimum enforced entrypoints:

- `brainstorm`
- `approve_brainstorm`
- `split_story`
- `split_ticket`
- `verify`
- `final_gate`

This keeps the single-truth rule machine-readable and prevents workflow drift between docs and scripts.

## 4. Guard Model

### 4.1 Reuse / Collision Decision

Existing guards are not sufficient alone:

- `decisions_guard.py` only checks decision completeness/resolution
- `prototype_derivation_consistency_guard.py` only checks HTML vs derived artifacts

Neither expresses the intermediate state:

- decision confirmed
- sync required
- HTML not yet updated

Therefore a dedicated guard is justified:

- `truth_sync_guard.py`

Responsibility:

- read module decision records
- detect confirmed `ui_truth_change=true` records
- fail when any such record has `prototype_synced=false`

This is distinct from:

- decision completeness
- derivation consistency

so responsibility collision is low.

### 4.2 Guard Semantics

`truth_sync_guard.py` must:

1. pass when no UI-truth-changing decision exists
2. pass when all UI-truth-changing decisions have `prototype_synced=true`
3. fail when any confirmed UI-truth-changing decision has `prototype_synced=false`
4. print blocking decision IDs and affected artifact IDs/files

## 5. Workflow Behavior

### 5.1 Brainstorm

`brainstorm` remains the stage where product clarification and decision capture happen.

If Phase 0 / Phase 4 produces a UI decision:

- record it in `DECISIONS.md`
- if that decision changes UI truth, mark `ui_truth_change=true`
- until HTML is updated, set `prototype_synced=false`
- rerunning `/brainstorm {module}` must fail closed before proceeding into downstream derivation

### 5.1b Approve Brainstorm

`/approve brainstorm` must not become a bypass path.

If a resolved decision includes:

- `ui_truth_change=true`
- `prototype_synced=false`

then approval may record the decision outcome, but it must not advance the workflow into normal downstream derivation. The only valid path remains:

- update HTML prototype
- mark `prototype_synced=true`
- rerun brainstorm / derivation guards

### 5.2 Split-Story / Split-Ticket

These stages must not continue if UI truth is known stale.

If `truth_sync_guard` fails:

- no new stories
- no new tickets
- no new test skeleton expansion

### 5.3 Verify / Final Gate

These stages remain downstream backstops.

They must still run `truth_sync_guard`, but a failure here means upstream process missed a choke point and the framework should be considered incomplete.

## 6. What Happens When Truth Is Inconsistent

This must be deterministic.

When any stage finds:

- confirmed `ui_truth_change=true`
- and `prototype_synced=false`

then the workflow must do all of the following:

1. stop the current stage immediately
2. report `truth_source_out_of_sync`
3. identify the blocking decision IDs
4. require HTML prototype update before any downstream continuation
5. require regeneration/revalidation of derived artifacts after HTML sync

This is not a patch-up flow. It is a hard workflow stop.

## 7. Source-Stage Integration Path

No second truth source is introduced.

The generation path remains:

- HTML prototype
- prototype-extraction
- PRD / MATRIX / UI-VISUAL-CONTRACT
- story split
- ticket split
- verification

`DECISIONS.md` only influences whether the workflow may continue. It does not generate downstream artifacts directly.

## 8. Stage Placement

`truth_sync_guard.py` must be wired to:

- `brainstorm`
- `approve_brainstorm`
- `split-story`
- `split-ticket`
- `verify`
- `final-gate`

Recommended principle:

- earliest fail wins
- later stages are backstops only

## 9. Non-Goals

This design intentionally does **not**:

- create supplemental truth sources
- allow PRD or SRS to override HTML
- auto-heal stale HTML from decision records
- let implementation proceed while UI truth is stale

## 10. Acceptance Criteria

The framework is correct only if all of the following are true:

1. HTML remains the only configured UI truth source
2. config contains machine-readable truth-sync policy for required decision fields and enforced entrypoints
3. a confirmed UI decision with `prototype_synced=false` blocks `brainstorm`, `approve brainstorm`, `split-story`, `split-ticket`, `verify`, and `final-gate`
4. no downstream artifact treats `DECISIONS.md` as a derivation source
5. after HTML is updated and `prototype_synced=true`, the workflow continues normally
6. repo-backed verification proves the rule at the earliest stage, not only at final-gate

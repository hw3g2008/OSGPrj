# Admin Dict Single-Source Execution Checklist

> For this cleanup, the target end state is one runtime source of truth only: `sys_dict_type + sys_dict_data`. Old `basedata` should be treated as a temporary compatibility surface, not a second source.

**Goal:** Consolidate admin "base data" and "dict" handling into one source of truth without breaking seeded environments, smoke scripts, or runtime closure flows.

**Recommended rollout:** Two phases.
- Phase 1: Keep a thin `basedata` compatibility facade, but move every repo-owned consumer to dict APIs and dict permissions.
- Phase 2: Delete the compatibility facade only after runtime callers, seeds, and verification assets are fully migrated.

**Do not do:** Delete `/system/basedata/*` first and migrate later.

---

## 1. Final Decision

- Keep: current dict truth
  - `sys_dict_type`
  - `sys_dict_data`
  - dict controllers / registry controllers
  - current "字典管理" page
- Remove eventually:
  - `/system/basedata/*` compatibility endpoints
  - old compatibility permissions:
    - documentation/controller-era `system:baseData:*`
    - seed/menu-era `admin:base-data:list`
  - old menu seed naming and route targets that imply a separate "基础数据" system
- Keep for now if it reduces churn:
  - frontend route path `/permission/base-data`
  - component directory `views/permission/base-data`
  - `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`
  - test/file naming such as `base-data.spec.ts` and `base-data.e2e.spec.ts` until route/file rename is intentionally scheduled

Reason:
- Route and file names are not a second source of truth.
- Runtime APIs, permissions, seeds, and scripts are the real boundaries.

---

## 2. Current Risk Boundaries

These boundaries must be migrated before deleting compatibility:

### Runtime / automation

- `bin/admin-api-smoke.sh`
  - still calls `GET/POST/PUT /system/basedata*`
- `bin/admin-api-smoke-selftest.sh`
  - sources `bin/admin-api-smoke.sh`
- `bin/osg-five-end-runtime-closure.sh`
  - sources `bin/admin-api-smoke.sh`

### Seed / environment bootstrap

- `sql/osg_menu_init.sql`
- `sql/osg_dict_cleanup.sql`
- `deploy/mysql-init/02_osg_menu_init.sql`
- `sql/osg_role_menu_init.sql`
- `deploy/mysql-init/04_osg_role_menu_init.sql`

These still seed:
- menu name: `基础数据管理`
- menu path: `base-data`
- component path: `admin/permission/baseData/index`
- permission: `admin:base-data:list`

Current risks:
- `sql/osg_dict_cleanup.sql` still renames menu `2013` back to `基础数据管理`
- role-menu seed files still describe menu `2013` using old semantics in comments and menu maps

### Permission / RBAC truth mismatch

- current frontend runtime uses dict permission semantics
- old migration-era docs and some guards still mention `system:baseData:list`
- current seed SQL still provisions `admin:base-data:list`

Rule for this rollout:
- final runtime permission must be **`system:dict:list`**
- `system:baseData:*` is treated as legacy design-era wording unless a live runtime caller is rediscovered
- `admin:base-data:list` is treated as seed-era compatibility that must be migrated away

### Workflow / gate config

- `.claude/project/config.yaml`

Current risks:
- `module_final_gate_overrides.admin-dict.backend_test_command` still references `OsgBaseDataControllerTest`
- `module_final_gate_overrides.admin-dict.backend_test_command` also includes `OsgMentorProfileControllerTest`, which appears outside the admin-dict module boundary unless intentionally kept as a cross-module guard
- `module_final_gate_overrides.admin-dict.frontend_test_command` still uses `base-data.spec.ts` naming
- `module_prototype_map.admin-dict` still anchors this slice to the `admin.html` base-data surface, which is correct, but any route/contract rename must remain aligned with that source truth

Rule for this rollout:
- removing compat controller/test requires updating final gate config in the same phase
- route naming can remain `base-data` if desired, but gate commands must not reference deleted backend tests

### Compatibility assumptions still documented in repo

- `docs/plans/2026-04-02-admin-dict-phase1-design.md`
- `docs/plans/2026-04-02-admin-dict-phase1-implementation-plan.md`

### Legacy permission-module evidence that may remain after main migration

- `osg-spec-docs/tasks/testing/permission-test-cases.yaml`
- `osg-spec-docs/tasks/testing/permission-traceability-matrix.md`
- `osg-spec-docs/tasks/audit/S-006-story-evidence.md`
- `osg-spec-docs/tasks/audit/S-006-final-evidence.md`

Current risks:
- these legacy permission assets still reference `OsgBaseDataControllerTest` and old `base-data` verification paths
- they are not the primary execution boundary for `admin-dict`, but they will prevent a repo-wide "zero residual reference" claim if left untouched

Rule for this rollout:
- treat these as optional final cleanup unless current workflow tooling actively consumes them
- do not block `admin-dict` execution on historical evidence rewrite unless a live guard or gate points at them

### Source-stage truth that still models compat explicitly

- `osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md`
- `osg-spec-docs/docs/01-product/prd/admin-dict/DELIVERY-CONTRACT.yaml`
- `osg-spec-docs/docs/01-product/prd/admin-dict/MATRIX.md`
- `osg-spec-docs/docs/01-product/prd/admin-dict/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/docs/02-requirements/srs/admin-dict.md`
- `osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md`

Current risks:
- `OVERVIEW.md` still lists `/system/basedata/*` as supported compatibility interfaces
- `DELIVERY-CONTRACT.yaml` still defines `admin-dict-compat` as a required capability
- `MATRIX.md` still lists `/system/basedata/*` as in-scope
- `admin-dict.md` still defines FR-005 / compatibility interfaces as normative requirement text
- `admin-dict-DECISIONS.md` still resolves the strategy as "keep `/system/basedata/*` as compat facade"
- `admin-dict/UI-VISUAL-CONTRACT.yaml` binds the retained live route `/permission/base-data`, so any later route rename must update source-stage visual truth in the same phase

Rule for this rollout:
- if compat is still intentionally retained during the migration window, these source-stage docs must remain aligned with the surviving facade semantics
- if compat is deleted in the final phase, these source-stage docs must be updated in the same phase so source truth does not continue to require deleted capabilities

### Stage-regression assets

- `osg-spec-docs/tasks/audit/behavior-contract-admin-dict-2026-04-03.json`
- `osg-spec-docs/docs/01-product/prd/admin/UI-VISUAL-CONTRACT.yaml`
- `osg-spec-docs/tasks/testing/admin-dict-test-cases.yaml`
- `osg-spec-docs/tasks/testing/admin-dict-traceability-matrix.md`

Current risks:
- behavior contract still treats `/system/basedata/*` as accepted compat evidence
- admin visual contract still mocks `/api/system/basedata/list`
- admin-dict test cases and traceability still include `runtime/admin-dict-facade-check`

Rule for this rollout:
- compatibility deletion is blocked until these assets are either migrated or intentionally re-baselined
- visual and behavior contracts are part of the execution boundary, not optional follow-up cleanup

### Current frontend truth

- current admin UI already presents this page as `字典管理`
- current page runtime uses dict APIs, not `baseData.ts`

---

## 3. Recommended Rollout

### Phase 0: Stabilize Current Branch

Objective: undo unsafe boundary breakage before continuing cleanup.

- [ ] Restore `OsgBaseDataController` as a facade.
  - current branch reality: file is already absent while repo-owned smoke paths still depend on `/system/basedata/*`
- [ ] Restore `OsgBaseDataControllerTest`.
  - current branch reality: file is already absent while `admin-dict` final-gate config still references it
- [ ] Keep runtime access checks accepting both permissions during the migration window:
  - `system:dict:list`
  - `admin:base-data:list`
- [ ] Run an explicit repo search for `system:baseData:*` before touching runtime code.
  - if no live runtime caller exists, do not re-introduce it
- [ ] Do not re-introduce `system:baseData:list` into runtime code unless a live runtime caller is found.
  - today it should be treated as legacy documentation vocabulary, not target runtime truth
- [ ] Ensure `.claude/project/config.yaml` does not point at a deleted compat test in the current branch state.
  - restoring `OsgBaseDataControllerTest` is sufficient for Phase 0 stabilization
  - do not narrow final-gate test scope in Phase 0 unless needed to restore branch stability
- [ ] Do not restore `osg-frontend/packages/admin/src/api/baseData.ts` unless a real frontend caller exists.
  - current frontend page already uses `adminDict.ts`

Exit condition:
- repo-owned smoke and closure scripts can still run without 404 on `/system/basedata/*`
- `admin-dict` final-gate config no longer points at a deleted compat test

### Phase 1: Migrate Repo-Owned Runtime Callers to Dict APIs

Objective: remove live repo dependency on `/system/basedata/*`

- [ ] Update `bin/admin-api-smoke.sh`
  - replace `base-data.list` checks with dict list / registry checks
  - replace create/update/disable calls to `/system/basedata/*`
  - use `/system/dict/data` CRUD instead
  - rename pass labels from `base-data.*` to `admin-dict.*` where appropriate
- [ ] Update `bin/admin-api-smoke-selftest.sh` if smoke-library behavior or exported helpers change
- [ ] Verify `bin/osg-five-end-runtime-closure.sh` still works through the updated smoke library
- [ ] Review any other `bin/*` scripts that call `/system/basedata/*`
- [ ] Review repo-owned test helpers or API parity fixtures that intentionally mention `basedata`
  - keep only if they are historical self-tests
  - migrate if they are part of live delivery gates
- [ ] Update `.claude/project/config.yaml`:
  - remove `OsgBaseDataControllerTest` from `module_final_gate_overrides.admin-dict.backend_test_command`
  - review and remove unrelated non-admin-dict backend tests such as `OsgMentorProfileControllerTest` unless they are intentionally retained as cross-module guards
  - keep module-level frontend verification aligned with surviving tests
- [ ] Review `osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md`
  - keep compat wording only while facade is intentionally retained
  - remove `/system/basedata/*` as normative source-stage truth in the same phase where compat is removed
- [ ] Review `osg-spec-docs/docs/01-product/prd/admin-dict/DELIVERY-CONTRACT.yaml`
  - decide whether `admin-dict-compat` remains a required capability during the migration window
  - remove or downgrade that capability when compat is intentionally retired
- [ ] Review `osg-spec-docs/docs/01-product/prd/admin-dict/MATRIX.md`
  - keep `/system/basedata/*` in scope only while compat is intentionally retained
  - remove it from in-scope matrix rows in the same phase where compat is removed
- [ ] Review `osg-spec-docs/docs/01-product/prd/admin-dict/UI-VISUAL-CONTRACT.yaml`
  - keep `/permission/base-data` only while route naming remains intentionally unchanged
  - if route/path naming is renamed later, update this visual source truth in the same phase
- [ ] Review `osg-spec-docs/docs/02-requirements/srs/admin-dict.md`
  - align `FR-005` and compatibility interface sections with the chosen migration window
  - ensure SRS no longer requires `/system/basedata/*` after compat retirement
- [ ] Review `osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md`
  - keep DEC-001 aligned with the chosen compat-retirement timing
  - update the decision record when compat is finally retired so it does not preserve obsolete migration intent
- [ ] Review `osg-spec-docs/tasks/audit/behavior-contract-admin-dict-*.json`
  - migrate compat scenarios if compat is still intentionally retained
  - otherwise replace `/system/basedata/*` evidence with dict-native evidence
- [ ] Review `osg-spec-docs/docs/01-product/prd/admin/UI-VISUAL-CONTRACT.yaml`
  - replace `/api/system/basedata/list` fixture routes only in the same phase where runtime callers are migrated
- [ ] Review `osg-spec-docs/tasks/testing/admin-dict-test-cases.yaml`
  - replace `runtime/admin-dict-facade-check` references when compat is no longer part of accepted runtime truth
- [ ] Review `osg-spec-docs/tasks/testing/admin-dict-traceability-matrix.md`
  - ensure final/ticket/story verification chains no longer require compat after compat retirement

Exit condition:
- `rg "/system/basedata" bin osg-frontend/tests ruoyi-admin/src/test` returns only intentional historical references or archived worktree content

### Phase 2: Migrate Seeded Menu / Permission Truth

Objective: make fresh environments land on dict semantics by default.

- [ ] Update `sql/osg_menu_init.sql`
- [ ] Update `sql/osg_dict_cleanup.sql`
- [ ] Update `deploy/mysql-init/02_osg_menu_init.sql`
- [ ] Update `sql/osg_role_menu_init.sql`
- [ ] Update `deploy/mysql-init/04_osg_role_menu_init.sql`
- [ ] Replace seeded menu title:
  - from `基础数据管理`
  - to `字典管理`
- [ ] Replace seeded component target:
  - from `admin/permission/baseData/index`
  - to the actual route/component convention used now
- [ ] Replace seeded permission:
  - from `admin:base-data:list`
  - to **`system:dict:list`**
- [ ] Replace `sql/osg_dict_cleanup.sql` menu rename direction:
  - from `基础数据管理`
  - to `字典管理`
- [ ] Update role-menu comments and menu assumptions that still describe menu `2013` as `基础数据管理`
- [ ] Update role-menu comments so menu `2013` is described as `字典管理`
- [ ] Do not change `insert into sys_role_menu values (..., 2013)` data rows merely because the label changed.
  - menu id `2013` remains the same record; this phase changes naming/permission semantics, not the numeric foreign key itself
- [ ] Update any seed-time component target comments that still point at `admin/permission/baseData/index`

Exit condition:
- a fresh DB/menu bootstrap produces the same visible navigation and permission model as the running frontend

### Phase 3: Normalize Permission Boundary

Objective: eliminate dual permission logic once old consumers are gone.

- [ ] Search for `system:baseData:*` across repo
- [ ] Search for `admin:base-data:list` across repo
- [ ] Remove fallback permission checks from controllers after Phase 1 and 2 are complete
- [ ] Keep only dict permissions in:
  - controllers
  - frontend menu metadata
  - permission tests
  - seed SQL

Exit condition:
- `rg "system:baseData|admin:base-data:list"` in the main repo returns only historical docs, archived notes, or deleted-file references

### Phase 4: Delete Compatibility Surface

Objective: remove the old facade only after all runtime consumers are off it.

- [ ] Delete `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java`
- [ ] Delete `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgBaseDataControllerTest.java`
- [ ] Confirm no runtime script, smoke flow, or seeded environment still expects `/system/basedata/*`
- [ ] Decide whether to also remove the `base-data` route name/path
  - this is optional cleanup, not required for single-source truth
- [ ] Decide whether to also rename retained frontend artifacts:
  - `base-data.spec.ts`
  - `base-data.e2e.spec.ts`
  - `BaseDataModal.vue`
  - keep if route naming stays
  - rename only as a separate cleanup once runtime truth migration is complete

Exit condition:
- deleting `/system/basedata/*` does not break smoke, closure, seeded menus, or page access

### Phase 5: Optional Legacy Evidence Cleanup

Objective: remove repo-level residual references outside the active admin-dict execution chain.

- [ ] Review `osg-spec-docs/tasks/testing/permission-test-cases.yaml`
- [ ] Review `osg-spec-docs/tasks/testing/permission-traceability-matrix.md`
- [ ] Review `osg-spec-docs/tasks/audit/S-006-story-evidence.md`
- [ ] Review `osg-spec-docs/tasks/audit/S-006-final-evidence.md`
- [ ] Decide whether each legacy permission asset should:
  - remain as frozen historical evidence
  - be updated to point at dict-native verification
  - be archived out of active discovery paths

Exit condition:
- repo-wide residual references to deleted compat tests are either intentionally archived or fully migrated

---

## 4. Verification Checklist

Run these at the end of each phase, not only at the end of the whole effort.

### Code search checks

- [ ] `rg "/system/basedata" bin osg-frontend/tests ruoyi-admin/src/test --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`
- [ ] `rg "system:baseData|admin:base-data:list" . --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`
- [ ] `rg "admin/permission/baseData/index" sql deploy --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`
- [ ] `rg "OsgBaseDataControllerTest|/api/system/basedata/list" .claude/project/config.yaml osg-spec-docs --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`
- [ ] `rg "admin-dict-compat|runtime/admin-dict-facade-check|/system/basedata|FR-005|DEC-001|/permission/base-data" osg-spec-docs/docs/01-product/prd/admin-dict osg-spec-docs/docs/02-requirements/srs osg-spec-docs/tasks/testing osg-spec-docs/tasks/audit --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`
- [ ] `rg "OsgBaseDataControllerTest|base-data.e2e.spec.ts|base-data.spec.ts" osg-spec-docs/tasks/testing osg-spec-docs/tasks/audit --glob '!.claude/worktrees/**' --glob '!.worktrees/**'`

### Focused tests

- [ ] `pnpm --dir osg-frontend/packages/admin test src/__tests__/base-data.spec.ts`
- [ ] `pnpm --dir osg-frontend/packages/admin test src/__tests__/permission-menu.spec.ts`
- [ ] `pnpm --dir osg-frontend exec playwright test tests/e2e/base-data.e2e.spec.ts --project=chromium`
- [ ] `mvn test -pl ruoyi-admin -am -Dtest=OsgAdminDictRegistryControllerTest -Dsurefire.failIfNoSpecifiedTests=false`
- [ ] run the `admin-dict` module final-gate command from `.claude/project/config.yaml` after config migration

### Runtime / flow checks

- [ ] run the updated `bin/admin-api-smoke.sh` path
- [ ] run the dependent `bin/osg-five-end-runtime-closure.sh` path if this module is part of the release boundary

### Seed consistency checks

- [ ] inspect seeded `sys_menu` row for menu `2013`
- [ ] verify the seeded permission matches frontend menu metadata

---

## 5. Go / No-Go Rules

### Safe to continue deleting compatibility only if all are true

- [ ] no active repo script still calls `/system/basedata/*`
- [ ] no seeded environment still provisions old base-data permission/path as the live entry
- [ ] no cleanup SQL still renames menu `2013` back to `基础数据管理`
- [ ] no role-menu seed still documents menu `2013` as a separate "基础数据管理" capability
- [ ] no module final-gate command still references deleted compat tests
- [ ] no active behavior/visual contract still depends on `/system/basedata/*` as live evidence
- [ ] no source-stage `admin-dict` document still requires compat as a normative capability after compat retirement
- [ ] no admin-dict test case or traceability asset still requires `runtime/admin-dict-facade-check` after compat retirement
- [ ] no admin-dict matrix or SRS section still lists compat as in-scope / required after compat retirement
- [ ] no admin-dict decision record or visual source-truth file still preserves obsolete compat / obsolete route truth after the migration decision changed
- [ ] no controller still needs dual permission compatibility
- [ ] smoke and closure flows are green after migration

### Additional rule for repo-wide zero-residual cleanup

If you want to claim the repo is globally clean rather than "admin-dict execution-ready", also require:

- [ ] no legacy permission-module testing/evidence asset still points at deleted compat tests or obsolete base-data verification paths

### Stop immediately if any are true

- [ ] a repo-owned script still calls `/system/basedata/*`
- [ ] fresh seed SQL still provisions old menu/permission truth
- [ ] cleanup SQL still reverts menu `2013` back to `基础数据管理`
- [ ] a closure flow depends on `admin-api-smoke.sh` and has not been updated
- [ ] `.claude/project/config.yaml` still points admin-dict gate to deleted compat tests
- [ ] `admin-dict` behavior contract or admin visual contract still treats `/system/basedata/*` as active runtime truth
- [ ] `admin-dict` source-stage docs still define compat as required after compat is removed
- [ ] `admin-dict` test cases / traceability still mandate `runtime/admin-dict-facade-check` after compat is removed
- [ ] `admin-dict-DECISIONS.md` or `admin-dict/UI-VISUAL-CONTRACT.yaml` still preserves obsolete compat/route truth after the migration decision changed
- [ ] `admin-dict` matrix or SRS still marks compat as in-scope / required after compat is removed
- [ ] legacy permission-module testing/evidence assets still reference deleted compat tests and someone is trying to claim repo-wide cleanup anyway
- [ ] the only reason a change "works" is that current local DB state hides the seed mismatch

---

## 6. Recommended Execution Order

1. Restore stability if the facade was already deleted.
2. Migrate `bin/admin-api-smoke.sh`.
3. Re-run the closure dependency path.
4. Update menu seed SQL and permission truth.
5. Remove dual permission checks.
6. Delete `OsgBaseDataController`.
7. Optionally rename route/path/file naming later.

---

## 7. Short Recommendation

Use this rule:

- **Single source now:** dict
- **Compatibility for one migration window:** `basedata` facade only
- **Delete facade only after scripts + seeds + permissions are migrated**

This gets us to one real source of truth without creating hidden regressions in smoke, closure, or environment bootstrap.

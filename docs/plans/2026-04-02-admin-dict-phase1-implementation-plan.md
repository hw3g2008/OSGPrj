# Admin Dict Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 admin 基础数据管理收口为独立 `admin-dict` requirement，并把运行时真源切到 `sys_dict_type + sys_dict_data`。

**Architecture:** 新建 `admin-dict` source-stage 资产和 `DICT-REGISTRY.yaml` 作为机器真相；后端新增 registry 读取能力并把 `/system/basedata/*` 改成兼容 facade；前端保留 `/permission/base-data` 入口，但页面和弹窗改为 registry + 标准 dict 驱动。

**Tech Stack:** Markdown, YAML, Spring Boot, MyBatis, Vue 3, TypeScript, Vitest, Playwright, Bash

---

Date: 2026-04-02  
Status: Draft  
Owner: admin-dict  
Scope: admin 端基础数据管理页、标准字典真源、兼容 facade、独立 RPIV requirement  
Non-goal: 其他端和其他页面下拉接字典、动态权限菜单树重构、全量移除 `/system/basedata/*`

**Design Doc:** `docs/plans/2026-04-02-admin-dict-phase1-design.md`

**Execution Order:** source docs -> registry seed -> backend registry/facade -> frontend page refactor -> compatibility tests -> RPIV asset bootstrap

**DoD:**  
1. `admin-dict` source-stage 文档独立存在且不混入旧 `permission` requirement。  
2. 基础数据页从本地常量改为 registry 驱动。  
3. 页面 CRUD 使用标准 dict 真源。  
4. `OsgBaseDataController` 不再维护内存 `seedRows()`。  
5. `/system/basedata/*` 保留兼容，但所有读写都委托 dict 真源。  
6. 新测试链覆盖 `list/create/edit/status_toggle` 四类 operation。  
7. 兼容 smoke + 新页面测试通过。

---

## File Structure

### Source-stage docs

- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md`
- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml`
- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/UI-VISUAL-CONTRACT.yaml`
- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/DELIVERY-CONTRACT.yaml`
- Create: `osg-spec-docs/docs/02-requirements/srs/admin-dict.md`
- Create: `osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md`
- Modify: `osg-spec-docs/docs/01-product/prd/permission/04-admin-base-data.md`
- Modify: `osg-spec-docs/docs/02-requirements/srs/permission.md`

### Backend

- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgAdminDictRegistryService.java`
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAdminDictRegistryServiceImpl.java`
- Create: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryController.java`
- Modify: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java`
- Create: `sql/osg_admin_dict_seed.sql`

### Frontend

- Create: `osg-frontend/packages/admin/src/api/adminDict.ts`
- Modify: `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`
- Modify: `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`
- Modify: `osg-frontend/packages/admin/src/router/index.ts`
- Modify: `osg-frontend/packages/admin/src/layouts/MainLayout.vue`

### Tests

- Create: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryControllerTest.java`
- Modify: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgBaseDataControllerTest.java`
- Modify: `osg-frontend/packages/admin/src/__tests__/base-data.spec.ts`
- Modify: `osg-frontend/tests/e2e/base-data.e2e.spec.ts`
- Modify: `bin/admin-api-smoke.sh`

### RPIV assets

- Create: `osg-spec-docs/tasks/testing/admin-dict-test-cases.yaml`
- Create: `osg-spec-docs/tasks/testing/admin-dict-traceability-matrix.md`

---

### Task 1: Create Independent `admin-dict` Source-Stage Docs

**Files:**
- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md`
- Create: `osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml`
- Create: `osg-spec-docs/docs/02-requirements/srs/admin-dict.md`
- Create: `osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md`
- Modify: `osg-spec-docs/docs/01-product/prd/permission/04-admin-base-data.md`
- Modify: `osg-spec-docs/docs/02-requirements/srs/permission.md`

- [ ] **Step 1: Write the failing structure check**

```bash
test -f osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md
```

Expected: FAIL because the new requirement docs do not exist yet.

- [ ] **Step 2: Create the registry truth file**

```yaml
groups:
  - group_key: job
    group_label: 求职相关
    icon: mdi-briefcase
    order: 10
    dict_types:
      - dict_type: osg_job_category
        dict_name: 岗位分类
        has_parent: false
      - dict_type: osg_company_name
        dict_name: 公司/银行名称
        has_parent: true
        parent_dict_type: osg_company_type
```

- [ ] **Step 3: Create the SRS truth**

```markdown
# 软件需求规格说明书 — Admin Dict

## §1 目标
- 将基础数据管理页升级为标准字典管理中心
- 运行时真源统一为 sys_dict_type + sys_dict_data

## §2 功能需求
- REQ-001: registry 驱动分类与 tab
- REQ-002: list/create/edit/status_toggle 四类操作
- REQ-003: 兼容 facade `/system/basedata/*`
```

- [ ] **Step 4: Mark old permission docs as migrated**

```markdown
> 迁移说明：基础数据未来态已迁移到 `admin-dict` requirement。
> 本文档仅保留历史实现说明，不再作为未来迭代真相。
```

- [ ] **Step 5: Verify docs exist and are isolated**

Run:

```bash
test -f osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md && \
test -f osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml && \
test -f osg-spec-docs/docs/02-requirements/srs/admin-dict.md
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  osg-spec-docs/docs/01-product/prd/admin-dict/OVERVIEW.md \
  osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml \
  osg-spec-docs/docs/02-requirements/srs/admin-dict.md \
  osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md \
  osg-spec-docs/docs/01-product/prd/permission/04-admin-base-data.md \
  osg-spec-docs/docs/02-requirements/srs/permission.md
git commit -m "docs: add admin-dict source-stage truth"
```

### Task 2: Seed Standard Dict Types and Values

**Files:**
- Create: `sql/osg_admin_dict_seed.sql`
- Reference: `sql/ry_20250522.sql`
- Reference: `osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml`

- [ ] **Step 1: Write the failing seed check**

```bash
rg -n "osg_job_category|osg_major_direction|osg_expense_type" sql/osg_admin_dict_seed.sql
```

Expected: FAIL because the seed file does not exist yet.

- [ ] **Step 2: Add dict type seed statements**

```sql
insert into sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
values
  ('岗位分类', 'osg_job_category', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","order":10,"hasParent":false}', 'admin', sysdate()),
  ('主攻方向', 'osg_major_direction', '0', '{"groupKey":"student","groupLabel":"学员相关","icon":"mdi-account-school","order":20,"hasParent":false}', 'admin', sysdate());
```

- [ ] **Step 3: Add dict data seed statements**

```sql
insert into sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
values
  (10, '全职招聘', 'full_time', 'osg_job_category', 'N', '0', '{}', 'admin', sysdate()),
  (10, '金融', 'finance', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),
  (10, '投行', 'ib', 'osg_sub_direction', 'N', '0', '{"parentValue":"finance"}', 'admin', sysdate());
```

- [ ] **Step 4: Add idempotent cleanup comments and execution note**

```sql
-- Execute after ry_20250522.sql
-- If rerunning locally, remove existing osg_* dict_type rows first.
```

- [ ] **Step 5: Verify seed vocabulary**

Run:

```bash
rg -n "osg_job_category|osg_company_type|osg_company_name|osg_region|osg_city|osg_recruit_cycle|osg_school|osg_major_direction|osg_sub_direction|osg_course_type|osg_expense_type" sql/osg_admin_dict_seed.sql
```

Expected: PASS with 11 dict types present.

- [ ] **Step 6: Commit**

```bash
git add sql/osg_admin_dict_seed.sql
git commit -m "docs: add admin-dict seed specification"
```

### Task 3: Build Registry Service and Controller

**Files:**
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgAdminDictRegistryService.java`
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAdminDictRegistryServiceImpl.java`
- Create: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryController.java`
- Test: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryControllerTest.java`

- [ ] **Step 1: Write the failing controller test**

```java
@Test
void registryEndpointShouldReturnGroupedDictTypes() throws Exception {
    mockMvc.perform(get("/system/admin-dict/registry"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.groups[0].groupKey").value("job"));
}
```

- [ ] **Step 2: Add the service contract**

```java
public interface IOsgAdminDictRegistryService {
    List<Map<String, Object>> loadRegistryGroups();
}
```

- [ ] **Step 3: Implement registry loading from YAML**

```java
public List<Map<String, Object>> loadRegistryGroups() {
    Path path = Paths.get("osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml");
    Map<String, Object> root = yaml.load(Files.readString(path));
    return (List<Map<String, Object>>) root.getOrDefault("groups", List.of());
}
```

- [ ] **Step 4: Expose the controller endpoint**

```java
@RestController
@RequestMapping("/system/admin-dict")
public class OsgAdminDictRegistryController extends BaseController {
    @PreAuthorize("@ss.hasAnyPermi('system:dict:list,system:baseData:list')")
    @GetMapping("/registry")
    public AjaxResult registry() {
        return success(registryService.loadRegistryGroups());
    }
}
```

- [ ] **Step 5: Run the focused backend test**

Run:

```bash
mvn test -pl ruoyi-admin -am -Dtest=OsgAdminDictRegistryControllerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgAdminDictRegistryService.java \
  ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAdminDictRegistryServiceImpl.java \
  ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryController.java \
  ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgAdminDictRegistryControllerTest.java
git commit -m "feat: add admin-dict registry endpoint"
```

### Task 4: Turn `OsgBaseDataController` into a Compatibility Facade

**Files:**
- Modify: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java`
- Test: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgBaseDataControllerTest.java`
- Reference: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysDictDataController.java`

- [ ] **Step 1: Write the failing compatibility test**

```java
@Test
void listShouldDelegateToDictDataInsteadOfSeedRows() throws Exception {
    String source = Files.readString(Path.of("ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java"));
    assertFalse(source.contains("seedRows()"));
}
```

- [ ] **Step 2: Remove in-memory storage**

```java
// delete:
// private final List<Map<String, Object>> rows = seedRows();
```

- [ ] **Step 3: Delegate list/add/edit/changeStatus**

```java
@GetMapping("/list")
public TableDataInfo list(String name, String category, String tab) {
    String dictType = registryService.resolveDictType(category, tab);
    List<SysDictData> rows = dictDataService.selectDictDataList(buildQuery(dictType, name));
    return getDataTable(rows.stream().map(adapter::toBaseDataRow).toList());
}
```

- [ ] **Step 4: Delegate categories to registry**

```java
@GetMapping("/categories")
public AjaxResult categories() {
    return success(Map.of("categories", registryService.loadRegistryGroups()));
}
```

- [ ] **Step 5: Run the backend compatibility suite**

Run:

```bash
mvn test -pl ruoyi-admin -am -Dtest=OsgBaseDataControllerTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: PASS and source no longer contains `seedRows()`.

- [ ] **Step 6: Commit**

```bash
git add \
  ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java \
  ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgBaseDataControllerTest.java
git commit -m "feat: route basedata facade through dict truth"
```

### Task 5: Replace Frontend Base-Data API and Page Model

**Files:**
- Create: `osg-frontend/packages/admin/src/api/adminDict.ts`
- Modify: `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`
- Modify: `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`
- Test: `osg-frontend/packages/admin/src/__tests__/base-data.spec.ts`

- [ ] **Step 1: Write the failing frontend unit expectation**

```ts
it('loads categories from registry instead of local constant arrays', () => {
  expect(baseDataViewSource).toContain("getAdminDictRegistry")
  expect(baseDataViewSource).not.toContain("const categories = [")
})
```

- [ ] **Step 2: Add the new API layer**

```ts
export function getAdminDictRegistry() {
  return http.get<{ groups: AdminDictGroup[] }>('/system/admin-dict/registry')
}

export function getAdminDictItems(params: { dictType: string; dictLabel?: string; status?: string }) {
  return http.get('/system/dict/data/list', { params })
}
```

- [ ] **Step 3: Replace hardcoded categories in the page**

```ts
const registryGroups = ref<AdminDictGroup[]>([])

onMounted(async () => {
  const res = await getAdminDictRegistry()
  registryGroups.value = res.groups || []
})
```

- [ ] **Step 4: Replace modal submit payloads with standard dict fields**

```ts
await addAdminDictItem({
  dictType: props.dictType,
  dictLabel: formState.dictLabel,
  dictValue: formState.dictValue,
  dictSort: formState.dictSort,
  status: formState.status,
  remark: JSON.stringify({ parentValue: formState.parentValue }),
})
```

- [ ] **Step 5: Run the admin unit test**

Run:

```bash
pnpm --dir osg-frontend/packages/admin test src/__tests__/base-data.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  osg-frontend/packages/admin/src/api/adminDict.ts \
  osg-frontend/packages/admin/src/views/permission/base-data/index.vue \
  osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue \
  osg-frontend/packages/admin/src/__tests__/base-data.spec.ts
git commit -m "feat: refactor base-data page to admin-dict registry"
```

### Task 6: Update Compatibility Smoke and Browser Tests

**Files:**
- Modify: `bin/admin-api-smoke.sh`
- Modify: `osg-frontend/tests/e2e/base-data.e2e.spec.ts`
- Modify: `osg-spec-docs/tasks/testing/admin-dict-test-cases.yaml`
- Modify: `osg-spec-docs/tasks/testing/admin-dict-traceability-matrix.md`

- [ ] **Step 1: Add a failing smoke expectation for new registry**

```bash
rg -n '/system/admin-dict/registry' bin/admin-api-smoke.sh
```

Expected: FAIL because the smoke script does not call the new registry yet.

- [ ] **Step 2: Add registry + dict CRUD smoke**

```bash
admin_dict_registry_response="$(request_json GET "/system/admin-dict/registry" "" "${ADMIN_TOKEN}")"
dict_city_response="$(request_json GET "/system/dict/data/type/osg_city" "" "${ADMIN_TOKEN}")"
```

- [ ] **Step 3: Keep one compatibility smoke path**

```bash
base_data_list_response="$(request_json GET "/system/basedata/list?pageNum=1&pageSize=100&tab=city" "" "${ADMIN_TOKEN}")"
pass "basedata.compat.list" "delegated to dict truth"
```

- [ ] **Step 4: Update Playwright to assert registry-driven rendering**

```ts
test('base data page renders registry-driven tabs', async ({ page }) => {
  await page.goto('/permission/base-data')
  await expect(page.getByText('求职相关')).toBeVisible()
  await expect(page.getByText('岗位分类')).toBeVisible()
})
```

- [ ] **Step 5: Run smoke + browser verification**

Run:

```bash
bash bin/admin-api-smoke.sh
pnpm --dir osg-frontend exec playwright test tests/e2e/base-data.e2e.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  bin/admin-api-smoke.sh \
  osg-frontend/tests/e2e/base-data.e2e.spec.ts \
  osg-spec-docs/tasks/testing/admin-dict-test-cases.yaml \
  osg-spec-docs/tasks/testing/admin-dict-traceability-matrix.md
git commit -m "test: cover admin-dict registry and compatibility flow"
```

### Task 7: Bootstrap `admin-dict` into RPIV

**Files:**
- Modify: `osg-spec-docs/tasks/STATE.yaml`
- Create: `osg-spec-docs/tasks/stories/` assets through standard split flow
- Create: `osg-spec-docs/tasks/tickets/` assets through standard split flow

- [ ] **Step 1: Prepare the new requirement pointer**

```yaml
current_requirement: admin-dict
current_requirement_path: osg-spec-docs/docs/01-product/prd/admin-dict/
```

- [ ] **Step 2: Run the source-stage commands**

Run:

```bash
/brainstorm admin-dict
/split story
```

Expected: new `admin-dict` SRS and Story assets generated without touching old `permission` archive.

- [ ] **Step 3: Verify operation obligations exist**

```bash
python3 - <<'PY'
import yaml, glob
for path in glob.glob('osg-spec-docs/tasks/stories/S-*.yaml'):
    data = yaml.safe_load(open(path, 'r', encoding='utf-8'))
    if data.get('requirements') and 'REQ-001' in ''.join(data.get('requirements', [])):
        print(path, data.get('required_test_operations'))
PY
```

- [ ] **Step 4: Run the framework guard**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module admin-dict --stage verify
```

Expected: PASS after split assets are complete.

- [ ] **Step 5: Commit**

```bash
git add osg-spec-docs/tasks/STATE.yaml osg-spec-docs/tasks/stories osg-spec-docs/tasks/tickets osg-spec-docs/tasks/testing
git commit -m "chore: bootstrap admin-dict into rpiv"
```

---

## Self-Review

### Spec coverage

This plan covers:

1. 独立 requirement 建立
2. 标准 dict 真源
3. registry 驱动页面
4. 兼容 facade
5. smoke / unit / e2e / RPIV asset guard

Remaining later-phase items intentionally excluded:

1. 学生端、导师端、班主任端、助教端接字典
2. 全量删除 `/system/basedata/*`
3. 动态权限模块重构

### Placeholder scan

Checked for:

- `TBD`
- `TODO`
- “适当处理”
- “类似 Task N”

None intentionally left in the plan body.

### Type consistency

Key names are kept consistent across tasks:

- `DICT-REGISTRY.yaml`
- `admin-dict`
- `getAdminDictRegistry`
- `sys_dict_type`
- `sys_dict_data`
- `/system/admin-dict/registry`

---

Plan complete and saved to `docs/plans/2026-04-02-admin-dict-phase1-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

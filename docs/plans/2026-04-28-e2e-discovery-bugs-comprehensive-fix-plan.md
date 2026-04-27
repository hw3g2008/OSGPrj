# E2E 发现 Bug 综合修复方案

**日期**: 2026-04-28  
**触发**: 跨端 E2E（Story1-4）测试中发现共 6 个 Bug  
**状态**: Bug #1 / #2 已修；本方案处理 Bug #3 / #4 / #5；Bug #6 拆为独立 ticket

---

## 总览

| # | Bug | 严重度 | 类型 | 状态 |
|---|---|---|---|---|
| 1 | leadMentorId/assistantId 未做 staffId→userId 转换 | Critical | 后端 | ✅ 已修 |
| 2 | OsgStaffMapper student_count 用错字段 | High | 后端 SQL | ✅ 已修 |
| 3 | `updateApplyStatus(false)` 物理删除 osg_job_application | **Critical** | 后端逻辑 | 🔧 本方案 |
| 4 | LM 端 class-records 整页用硬编码 mock 数据 | High | 前端集成 | 🔧 本方案 |
| 5 | sys_user 测试账号 email 重复 | Low | 测试数据 | 🔧 本方案 |
| 6 | LM 端 MENTOR_DIRECTORY 硬编码 mock 导师 | Critical | 前端集成 + 后端缺接口 | 📌 独立 ticket（本次不做，证据见末节）|

---

## Bug #3 修复方案：`updateApplyStatus(false)` 软删除化

### 根因证据

**位置**: `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:350-363`

```java
private int deleteMainApplicationIfPresent(Long positionId, ...) {
    OsgJobApplication existing = jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(...);
    if (existing == null) return 0;
    return jobApplicationMapper.deleteJobApplicationByApplicationId(existing.getApplicationId());  // ❌ 硬删
}
```

**触发路径**：
1. 学生在岗位列表点"已投递"按钮（已是 applied 状态）
2. `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/positions/index.vue:1357-1369` → `updateStudentPositionApply({applied: false})`
3. 后端 `updateApplyStatus(applied=false)` → `deleteMainApplicationIfPresent` → DELETE FROM osg_job_application

**后果**：
- 整条 application 物理消失，stage / interview_time / lead_mentor / requested_mentor_count 全部丢失
- 关联的 osg_coaching 因外键阻断（fk_coaching_application）但若已被删过 coaching 则无声丢失
- 学生意图是"取消投递标记"，结果是"业务数据消失"

### 修复策略：软删除（current_stage='withdrawn'）

**改动 1 — 后端**：`PositionServiceImpl.deleteMainApplicationIfPresent` 改为状态变更

```java
private int deleteMainApplicationIfPresent(Long positionId, PositionReference positionReference, Long userId) {
    OsgStudent student = identityResolver.resolveStudentByUserId(userId);
    Map<String, Object> position = positionReference.position();
    String companyName = stringValue(position.get("company"));
    String positionName = stringValue(position.get("title"));
    OsgJobApplication existing = jobApplicationMapper.selectLatestByStudentAndCompanyAndPosition(
            student.getStudentId(), companyName, positionName);
    if (existing == null || existing.getApplicationId() == null) {
        return 0;
    }

    // 软删除：标记 current_stage='withdrawn'，保留历史数据与外键关系
    OsgJobApplication patch = new OsgJobApplication();
    patch.setApplicationId(existing.getApplicationId());
    patch.setCurrentStage("withdrawn");
    patch.setUpdateBy(String.valueOf(userId));
    patch.setRemark("学生取消投递标记");
    return jobApplicationMapper.updateJobApplicationStage(patch);
}
```

**改动 1.1 — 后端（防御性）**：清理 mapper 层 delete 方法

- 删除 `OsgJobApplicationMapper.deleteJobApplicationByApplicationId` 接口方法
- 删除 `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:296-298` 的 `<delete id="deleteJobApplicationByApplicationId">` 块
- grep 验证仅 `deleteMainApplicationIfPresent` 一处调用（已确认，改动 1 后无调用方）
- 防止未来误用硬删

**改动 2 — 后端**：8 个 list 调用方逐个评估过滤策略

`osg_job_application` 列表查询有 8 个 service 层调用方，**必须逐个评估**是否过滤 `current_stage='withdrawn'`：

| # | 调用方 | 场景 | 是否过滤 |
|---|---|---|---|
| 1 | `PositionServiceImpl.selectStudentApplicationRecords` (×3 处) | 学生端列表/dashboard/meta | ✅ 必过滤 |
| 2 | `OsgPositionServiceImpl.selectJobApplicationList` | admin 岗位的申请人列表 | ✅ 必过滤 |
| 3 | `OsgJobTrackingServiceImpl.selectJobApplicationList` | admin job-tracking | ✅ 必过滤 |
| 4 | `OsgUserJobOverviewServiceImpl.selectJobApplicationList` (×4 处) | LM/Assistant/Mentor 三端 overview | ✅ 必过滤 |
| 5 | `OsgLeadMentorStudentServiceImpl.selectJobApplicationList` | LM 学员视角 | ✅ 必过滤 |
| 6 | `OsgLeadMentorPositionServiceImpl.selectJobApplicationList` (×2) | LM 岗位视角 | ✅ 必过滤 |
| 7 | `OsgJobOverviewServiceImpl.selectJobApplicationList` | overview 通用 | ✅ 必过滤 |
| 8 | `OsgUserJobOverviewServiceImpl.selectByStudentIds` (×2) | Assistant 端 | ✅ 必过滤 |
| 🚫 保留 | `selectLatestByStudentAndCompanyAndPosition` | upsert 复用依赖 | ❌ **必须不过滤** |

**实施方式**（最小改动）：
- 在 mapper SQL `selectStudentApplicationRecords` / `selectJobApplicationList` / `selectByStudentIds` 加 `AND current_stage != 'withdrawn'`
- `selectLatestByStudentAndCompanyAndPosition` 不动，保留 withdrawn 行用于 upsert 复用
- **stats 计数**（`pendingCount` / `approvedCount` / `totalCount` 等）同步排除 withdrawn 以保证一致性

**改动 3 — 后端**：`updateApplyStatus(true)` 重新投递时复用 withdrawn 行（已自动满足）

已验证 `upsertMainApplication` 调用 `selectLatestByStudentAndCompanyAndPosition`（能找到 withdrawn 行）+ `updateJobApplicationStage`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:283-294`，支持 currentStage 字段更新）。patch.setCurrentStage('applied') 能正常覆盖 'withdrawn'。无需额外代码。

**改动 4 — 前端**：可选 UX 改进
- 学生取消投递按钮改为 confirm 弹窗 `Modal.confirm({ content: '确认取消投递标记？已分配的导师辅导记录将保留但变为未关联状态' })`
- 本次修复**不强制做**，留作后续

### 测试覆盖

**单元测试**：`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`
- 新增：`updateApplyStatusFalseSoftDeletes_keepsApplicationRowWithWithdrawnStage()`
- 新增：`updateApplyStatusTrueAfterWithdrawn_restoresExistingRow()`

**回归用例**：
- 学生 markApplied(true) → 数据库新增 application 行
- 学生 markApplied(false) → application 行存在但 current_stage='withdrawn'
- 学生再次 markApplied(true) → 同一行 current_stage 变回 'applied'，无新增行
- LM/Mentor 端列表页不显示 withdrawn 行

### 工作量估计
**1.5-2.5 小时**（PositionServiceImpl 软删除改动 + mapper 接口/XML 删除 + 8 个 list 调用方过滤 + stats 一致性 + 2-3 个测试用例）

---

## Bug #4 修复方案：LM 端 class-records 对接真实 API（参考 Assistant 实现）

### 根因证据

**位置**: `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue:502-727`

```typescript
const initialMineRows: ClassRecordRow[] = [
  { recordId: '#R231780', studentName: '张三', ... },  // 全部硬编码
  ...
]
const initialManagedRows: ClassRecordRow[] = [...]  // 全部硬编码
```

整个 view 不调任何 API，且 `MENTOR_DIRECTORY` 在 `views/career/job-overview/index.vue:420-424` 也是硬编码导师 mock。

### 后端就绪情况

**已有 API**: `OsgLeadMentorClassRecordController`
- `GET /lead-mentor/class-records/list` - 列表查询
- `GET /lead-mentor/class-records/stats` - tab 计数 + 汇总
- `POST /lead-mentor/class-records` - 新增上报（前端已对接）

**Assistant 端等价实现**（`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/class-records/index.vue` 901 行 + `/api/assistantClassRecords.ts`）几乎一一对应：
- `getAssistantClassRecordList(filters)` → `getLeadMentorClassRecordList(filters)`
- `getAssistantClassRecordStats(filters)` → `getLeadMentorClassRecordStats(filters)`
- 字段命名、tab 切换、scope 处理、stats badge 计算逻辑完全一致

### 修复策略：后端扩展 scope + 前端参考 Assistant 实现

**改动 0 — 后端扩展 scope 字段**（本次新增，实施前提）：

LM 端当前后端不接 scope（`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorClassRecordController.java:41-47`），需扩展：

1. `OsgLeadMentorClassRecordController` list/stats 接收 `@RequestParam(value = "scope", required = false) String scope`
2. `OsgClassRecordServiceImpl.selectLeadMentorClassRecordList` / `selectLeadMentorClassRecordStats` 新增 `String scope` 参数
3. 实现 scope 过滤逻辑：
   - `mine`: mentor_id == leadMentorUserId（LM 自己上报的记录）
   - `managed`: 领导的学员的记录（需 osg_student.lead_mentor_id == leadMentorUserId 关联）
   - 为空/null: 保持现有 `filterLeadMentorOwnedRows` 逻辑（后兼容）
4. 补充后端单测覆盖 scope=mine / scope=managed / scope=null 三种分支

**估时**：后端 1-1.5h（controller param + service 过滤表达式 + 单测）

**改动 1 — 扩充 shared API**（文件已存在）：

直接扩充 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/class-records.ts`（该文件已含 `createLeadMentorClassRecord`，不新建文件避免碎片化）：

```typescript
export interface LeadMentorClassRecordFilters {
  keyword?: string
  courseType?: string
  classStatus?: string
  courseSource?: string
  tab?: string
  classDateStart?: string
  classDateEnd?: string
  scope?: 'mine' | 'managed'  // LM 端有两 scope
  pageNum?: number
  pageSize?: number
}

export interface LeadMentorClassRecordRow {
  recordId: number
  studentName: string
  studentId: number
  reporterName?: string
  coachingType: string
  coachingDetail: string
  classDate: string
  durationHours: number
  status: string
  rating?: number
  // ... 与 AssistantClassRecordRow 字段对齐
}

export interface LeadMentorClassRecordStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export function getLeadMentorClassRecordList(filters: LeadMentorClassRecordFilters = {}) {
  return http.get<{ rows: LeadMentorClassRecordRow[]; total: number }>(
    '/lead-mentor/class-records/list', { params: filters, timeout: 60000 }
  )
}

export function getLeadMentorClassRecordStats(filters: LeadMentorClassRecordFilters = {}) {
  return http.get<LeadMentorClassRecordStats>(
    '/lead-mentor/class-records/stats', { params: filters }
  )
}
```

**改动 2 — 重写 LM class-records view**：

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue`：
- 删除 `initialMineRows` / `initialManagedRows` 硬编码
- 复制 Assistant 端 `class-records/index.vue` 的 `loadList` / `loadStats` / `handleScopeChange` / `tabCount` 函数结构
- import 改为 `getLeadMentorClassRecordList` / `getLeadMentorClassRecordStats`
- onMounted + watch 触发 loadList
- 保留 LM 端独有 UI 元素（如 `我的申报` / `我管理的学员` 双 scope tabs）

**改动 3 — 路由与 sidebar**：

无需改动。LM 端 sidebar 的"课程记录 Class Records"链接已存在。

### 测试覆盖

**前端单测**：参考 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/__tests__/`
- 新增：`class-records-shell.spec.ts` — mock API 返回 → 验证渲染 + tab 切换 + 筛选 + scope 切换
- （已 grep 验证：LM __tests__/ 无任何文件引用 initialMineRows / R231 / 张三，无需修改现有测试）

**E2E 验证**：Mentor 提交课程记录 → Admin 审核通过 → LM 端"我管理的学员"tab 应能看到该记录

### 工作量估计
**6-8 小时**（后端 scope 扩展 1-1.5h + shared API 定义 1h + view 重写 2-3h + 测试 1.5-2h）

---

## Bug #5 修复方案：sys_user 测试账号去重

### 根因证据

```sql
SELECT email, GROUP_CONCAT(user_id) FROM sys_user 
WHERE email LIKE 'test-%@osg-test.local' GROUP BY email HAVING COUNT(*) > 1;
-- 输出（修复前）：
-- test-lead-mentor@osg-test.local | 12808,12814
-- test-assistant@osg-test.local | 12809,12813
```

历史测试脚本多次插入相同 email，sys_user 表无 email UNIQUE 约束。

### 修复策略：清理重复账号（保留较新 ID）

**前置验证**（重要）：清理前必须确认保留的 max user_id 有有效的角色关联，否则软删后可能登录失效：

```sql
-- 验证保留的 user_id 有角色关联
SELECT u.user_id, u.email, COUNT(ur.role_id) AS role_count
FROM sys_user u LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
WHERE u.email LIKE 'test-%@osg-test.local' AND u.del_flag='0'
GROUP BY u.user_id;
-- 期望：每个将要保留的 max user_id 都有 role_count > 0
-- 若 max user_id role_count = 0 但较小的 user_id role_count > 0 → 需交换保留策略（改为保留有角色关联的 user_id）
```

**改动**：执行去重 SQL（一次性脚本，放 `sql/migrations/`）

```sql
-- File: sql/migrations/2026-04-28-cleanup-duplicate-test-users.sql
-- 软删除每组重复 email 中除最大 user_id 外的其他记录

UPDATE sys_user 
SET del_flag = '2' 
WHERE email IN (
  'test-lead-mentor@osg-test.local',
  'test-assistant@osg-test.local',
  'test-mentor@osg-test.local'  -- 防御性扩展
)
AND del_flag = '0'
AND user_id NOT IN (
  SELECT max_id FROM (
    SELECT MAX(user_id) AS max_id 
    FROM sys_user 
    WHERE del_flag = '0' 
    GROUP BY email
  ) t
);

-- 验证
SELECT email, COUNT(*) FROM sys_user 
WHERE email LIKE 'test-%@osg-test.local' AND del_flag = '0' 
GROUP BY email;
-- 期望：每个 email 仅 1 条
```

### 不做的事

**不加 unique index on email**：若依框架本身允许同 email 多账号（如不同租户/组织），加唯一索引可能破坏其他流程。本次仅做数据清理。

### 工作量估计
**15-30 分钟**（写 SQL + 执行 + 验证）

---

## 执行顺序

> **顺序调整说明**：原顺序 #3 → #5 → #4 改为 #5 → #3 → #4。原因：#5 是数据清理（15 min），先做让后续 E2E 验证不被 sys_user 重复账号污染。

1. **Phase 1 — Bug #5**（15 min）
   - 写并执行清理 SQL
   - 验证 `SELECT email, COUNT(*) FROM sys_user WHERE del_flag='0' GROUP BY email HAVING COUNT(*) > 1` 返回 0 行

2. **Phase 2 — Bug #3**（1.5-2.5h）
   - 改 `PositionServiceImpl.deleteMainApplicationIfPresent`为软删除
   - 删除 mapper.deleteJobApplicationByApplicationId 接口与 XML（防御性）
   - 8 个 list 调用方加过滤（mapper SQL 或 service 层）
   - stats 计数同步排除 withdrawn
   - 加单元测试覆盖 markApplied(false) 软删 + markApplied(true) 复用
   - 跑 `mvn -pl ruoyi-system test -Dtest=PositionServiceImplTest`

3. **Phase 3 — Bug #4**（6-8 小时）
   - 后端扩展 scope 参数（controller + service）
   - 后端单测覆盖 mine/managed/null 三种 scope
   - 加 shared/api `getLeadMentorClassRecordList` + `getLeadMentorClassRecordStats`
   - 重写 LM `class-records/index.vue`（参考 Assistant 实现，含 mine/managed scope）
   - 加前端测试
   - E2E 验证三端一致性
   - （MENTOR_DIRECTORY 清理不包含在本 phase，见 Bug #6 独立 ticket）

4. **Phase 4 — 综合回归**
   - 重启后端 + 5 个前端
   - 跑跨端 E2E：学生取消投递 → 数据保留 / LM 端课程记录可见 / sys_user 无重复

---

## 风险与回滚

| Phase | 风险 | 回滚 |
|---|---|---|
| #3 | mapper 删除 `deleteJobApplicationByApplicationId` 后发现遗漏调用 | git revert；grep 验证后重应用改动 1.1 |
| #3 | 8 个 list SQL 加过滤后某个场景实际需要 withdrawn 可见 | 修改该 service 中的 query 参数表达式，绕过过滤 |
| #5 | 误删活跃测试账号 | sys_user.del_flag 改回 '0' |
| #4 | LM 端测试断言变更 | git revert，旧 mock 仍可工作 |

所有改动均**单文件级别原子**，git 可分 phase commit，便于回滚。

---

## 验收标准

- [ ] **Bug #3**：学生 markApplied(false) 后查 DB，application 行存在 current_stage='withdrawn'；**列表 UI + stats 计数均不含该投递**；重新 markApplied(true) 复用同一行
- [ ] **Bug #3 防御性**：`grep -r "deleteJobApplicationByApplicationId"` 在源码中返回 0 处（mapper 接口与 SQL 均已删除）
- [ ] **Bug #4**：LM 端 class-records 页显示真实数据库记录（含本次 R274278），mock 数据 张三/李四/Jerry Li 完全消失；新增/筛选/tab 切换/scope 切换功能正常
- [ ] **Bug #5**：`SELECT email, COUNT(*) FROM sys_user WHERE del_flag='0' GROUP BY email HAVING COUNT(*) > 1` 返回 0 行；保留的 max user_id 能成功登录三端
- [ ] 现有 backend 测试 + 前端测试全绿
- [ ] 跨端 E2E：mentor 提交 → admin 审核 → student/LM/assistant 三端均见

> **E2E 范围说明**：本次跨端 E2E **不验证 LM 端导师匹配功能**（依赖 Bug #6 独立 ticket），mentor 分配路径需经 admin 端完成。Bug #6 修复后需补跨 LM 分配场景的 E2E。

---

## Bug #6 调查证据（独立 ticket starting point）

### 现象
LM 端 `AssignMentorModal.vue` 显示硬编码 mock 导师列表（Jerry Li/Mike Wang/Sarah Chen/Tom Zhang）。点击"确认匹配"时提交虚假 staffId（9001/9002 等），后端 `OsgIdentityResolver.resolveUserIdByStaffId(9001)` 抛 `ServiceException("员工主数据不存在")`，前端 silent 吞错（`catch (_error)`），用户感觉成功但实际未生效。

### 根因证据

**前端 mock 数据位置**:
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue:420-424` — `MENTOR_DIRECTORY = [{ id: 9001, name: 'Jerry Li' }, ...]`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/components/AssignMentorModal.vue:233-279` — `mentorOptions` 硬编码导师卡片
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue:765-786` — `collectAssignPayload` 用 mock id 构造 `mentorIds`

**后端可参考实现**:
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorMockPracticeServiceImpl.java:395-454` — `selectMentorOptions(practice)` 已实现 mentor 列表筛选 + schedule 检查 + selected 状态标记

**确认无现成可复用 endpoint**:
- `/admin/staff/list` 需要 `admin:staff:list` 权限，LM 账号无权访问
- LM 端 8 个 controller 全 grep，无 `/lead-mentor/mentors` 或等价端点

### 修复策略（建议）

**方案 A — 复用 mock-practice 模式**（推荐，最小改动）：
在 `OsgLeadMentorJobOverviewController.detail(applicationId)` 的响应里附带 `mentorOptions` 字段，参考 `OsgLeadMentorMockPracticeServiceImpl.selectMentorOptions` 实现。前端 `AssignMentorModal` 改接 prop。

**方案 B — 独立 endpoint**（更通用）：
新增 `GET /lead-mentor/mentors` 返回完整可分配导师池（含 schedule、direction filter）。

### 工作量估计
**3-4 小时**（后端 service 抽象 1-1.5h + endpoint 扩展 0.5h + 前端 modal 改造 1-1.5h + 测试 1h）

# 模拟应聘 + 课消上报跨端 fix plan

- **日期**：2026-05-15
- **范围**：导师端 / 学生端 / 班主任端 / 助教端 / 后台 5 端围绕 `osg_mock_practice` + `osg_class_record` 的跨端流转
- **触发**：用户口述 4 条 bug
- **方法**：按 `/fix` 轻流程，单 fix ≤ 60min，单一职责，可独立验收

---

## 0. 用户原始 Bug 反馈

| # | Bug | 端 |
|---|---|---|
| 1 | 导师端模拟应聘管理无法确认任务及上报课消 | mentor |
| 2 | 模拟面试排课后学生端无更新 | student |
| 3 | 导师无法 log 课时 | LM / mentor |
| 4 | 未加学生 list 的导师无法 log 学生课时 | mentor |

## 0.1 关联文档（已读）

| 文档 | 内容 |
|---|---|
| `docs/plans/stage-coaching-request/04-mock-practice-management.md` | 5 端模拟应聘管理需求文档（§2 导师端只有"上报课消"按钮） |
| `docs/plans/stage-coaching-request/03-class-report-reference-revision.md` | 课消上报 reference 修订 |
| `docs/plans/stage-coaching-request/10-coaching-flow-routing-fix-plan.md` §B5/B7/§9 | mentor /api/ 前缀 + B5 提交时间字段修复 |
| `docs/plans/2026-05-10-lead-mentor-mentor-bugfix-plan.md` #1 | LM 端课时上报学生聚合（coaching.mentor_ids ∪ student.lead_mentor_id/ids） |
| `docs/architecture/mock-practice-unification/01-business-enum-alignment.md` | 5 端 mock-practice status enum SSOT 收敛方案 |

---

## 1. Bug 拆解与根因

### 1.1 Bug 1 — mentor 端确认按钮死分支 + 上报课消 silently fail

**根因（双重）**：

- **A. 确认按钮的 status 永远不匹配**：`OsgMockPracticeServiceImpl.normalizeMentorVisibleStatus`（`OsgMockPracticeServiceImpl.java:361-369`）映射逻辑永远不输出 `'new'`，但前端 `mentor/views/mock-practice/index.vue:77` 用 `v-if="record.status === 'new'"` —— **按钮永远不显示**
- **B. 需求文档不要求"确认"按钮**：`04-mock-practice-management.md §2.3` 明确导师端操作列**只有"上报课消"**

→ 结论：删 mentor 端确认按钮 + `confirmMock` 函数 + 关联后端 `/mentor/mock-practice/{id}/confirm` 接口（保留，因 LM 端可能调用，需 grep 确认）

**上报课消按钮本身没问题**，但 `confirmMock` `try{}catch{}` 静默吞错是劣化项，删除一并处理。

### 1.2 Bug 2 — 排课后学生端无更新（**根因唯一确定**）

**根因**：`StudentMockPracticeServiceImpl.projectPracticeRecords`（`StudentMockPracticeServiceImpl.java:367-394`）在返回 Map 里**没 put `scheduledAt`**：

```java
// 当前：返回的 Map 仅含 id/type/typeValue/content/appliedAt/mentor/hours/feedback/status/statusValue
// 缺失：scheduledAt（DB 已写、mapper 已 SELECT、Java entity 已绑定，但 service 投影漏字段）
```

→ 前端 `selectedRecord.scheduledAt ?? '待安排'` 永远命中兜底"待安排"。

**修复成本**：1 行后端 + 单测。

### 1.3 Bug 3 — confirm-from-reject 走裸 POST 绕开 validator

**根因**：mentor `views/courses/index.vue:694-728` `submitConfirm` 函数处理"驳回后重提交"用裸 POST `/mentor/class-records`，**不走 `ClassReportFlowModal`**：

- `mapConfirmClassStatus` 把 `networking → networking_midterm` 映射到 `classStatus`，但 `courseType` 字段未对齐 backend 合法值 → validator 抛 400
- 没传 `referenceType` / `referenceId` → `validateReferenceTypeConsistency` 抛 400

→ 改造 `submitConfirm` 走 `ClassReportFlowModal`（已有 prefilled 锁定逻辑，复用即可）。

> B7 `/api/` 前缀已修（`145c9dcf`），不再是 404 路径，是字段契约问题。

### 1.4 Bug 4 — 未加学生 list 的导师无法 log

**重要：用户假设不成立**

- `OsgStudent` schema 没有 `mentor_id` 字段（只有 `leadMentorId / assistantId`）
- mentor 端不存在"永久学生 list"概念
- mentor reportable 现状（`OsgClassRecordServiceImpl.java:244-269`）：
  ```java
  // 唯一来源：coaching.mentor_ids ∪ mock_practice.mentor_ids 含当前 user_id
  ```

**真实根因（待 DB 验证）**：admin/lead-mentor 端"分配 mentor"接口可能：
1. 写 `coaching.mentor_ids` 时用 `staff_id` 而非 `user_id`（ID 空间错位）
2. 或事务回滚导致 `mentor_ids` 未持久化
3. 或 LM 端 `assignMentors` 走旧 application 维度而非 coaching 维度

→ Phase 0.B 必须先 DB 抓证据：实际复现样本的 `osg_coaching.mentor_ids` 值是 user_id 还是 staff_id 还是 NULL。

---

## 2. 修复方案

### FIX-1 mentor 端删确认按钮 + confirmMock

**变更点**：
1. `osg-frontend/packages/mentor/src/views/mock-practice/index.vue:75-86`
   - 删 `<a-button v-if="record.status === 'new'" class="btn-confirm">确认</a-button>` 整段
   - 删 `confirmMock` 函数 (`line 206-216`)
   - 删 `.btn-confirm` 关联 css (`line 275-276`)
2. `osg-frontend/packages/mentor/src/api/mockPractice.ts` 删 `confirmMockPractice` export（如存在）
3. `osg-frontend/packages/mentor/src/__tests__/mock-practice.behavior.spec.ts` 删确认按钮相关断言

**后端接口 `PUT /mentor/mock-practice/{id}/confirm`**：
- grep 其他端是否调用，无调用则删 controller 方法 + service
- 有调用则保留（不归 mentor 端 scope）

**验收**：
- mentor 端模拟应聘列表无"确认"按钮
- 单测 mentor 端 mock-practice spec 全过

---

### FIX-2 学生端模拟应聘 scheduledAt 字段补投影

**变更点**：
1. `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java:367-394`
   - `projectPracticeRecords()` 内补：
     ```java
     record.put("scheduledAt", row.getScheduledAt() == null ? null
         : DateFormatUtils.format(row.getScheduledAt(), "yyyy-MM-dd HH:mm"));
     ```
2. 单测 `StudentMockPracticeServiceImplTest`（如不存在则新建）
   - 插入一条 `osg_mock_practice scheduled_at='2026-05-20 10:00'`
   - 断言 `selectOverview(userId).practiceRecords[0].get("scheduledAt")` 非 null

**验收**：
- DB 排课后立即 `/student/mock-practice/overview` 返回 `scheduledAt` 字段
- 学生端详情弹窗"预约时间"显示真实时间而非"待安排"

---

### FIX-3 mentor 端 confirm-from-reject 走 ClassReportFlowModal

**变更点**：
1. `osg-frontend/packages/mentor/src/views/courses/index.vue:694-728`
   - 删 `submitConfirm` 函数中裸 POST `/mentor/class-records` 逻辑
   - 改为：触发 `ClassReportFlowModal` 弹窗，prefilled fields 注入原 reject 记录的 `studentId / referenceType / referenceId / courseType`
   - 用户在 modal 内补反馈后走 modal 自己的提交路径（统一 validator）
2. `ClassReportFlowModal` 已支持 prefilled + 锁定 referenceType/Id，无需改动
3. 单测 `courses.behavior.spec.ts` 更新断言

**验收**：
- mentor 端"驳回后重提交"按钮触发标准 modal，提交后 backend 不再 400
- 与正常上报路径行为一致

---

### FIX-4 mentor 端学生可见性诊断 + 修复

**Phase 4.1 — DB 抓证据**（必须先做）：

```sql
-- 1. coaching 维度 mentor_ids 是不是 user_id CSV
SELECT c.coaching_id, c.student_id, c.mentor_ids,
       s.user_name AS test_mentor_username, s.user_id AS test_mentor_userid
FROM osg_coaching c
LEFT JOIN sys_user s ON s.user_id IN (
  SELECT CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(c.mentor_ids, ',', n.n), ',', -1) AS UNSIGNED)
  FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3) n
)
WHERE c.mentor_ids IS NOT NULL AND c.mentor_ids <> ''
LIMIT 10;

-- 2. mock_practice 同样验
SELECT practice_id, student_id, mentor_ids FROM osg_mock_practice
WHERE mentor_ids IS NOT NULL AND mentor_ids <> '' LIMIT 10;

-- 3. 反查：daoshi58 (user_id=12866) 应该被哪些 coaching/practice 关联
SELECT 'coaching' AS src, coaching_id AS id, mentor_ids FROM osg_coaching
WHERE FIND_IN_SET('12866', mentor_ids)
UNION ALL
SELECT 'practice', practice_id, mentor_ids FROM osg_mock_practice
WHERE FIND_IN_SET('12866', mentor_ids);
```

**Phase 4.2 — 根据证据修复**：

- 如果 `mentor_ids` 是 staff_id：修写入侧（`OsgJobOverviewServiceImpl.assignMentors` / `OsgLeadMentorMockPracticeServiceImpl.assignMentors`），加 `resolveUserIdByStaffId` 转换
- 如果 `mentor_ids` 是 NULL（事务回滚）：查 service @Transactional + 异常处理
- 如果 ID 空间正确但仍漏：在 `OsgClassRecordServiceImpl.collectReportableStudentIds` mentor 分支补 `osg_class_record.mentor_id=currentUserId AND class_date >= N days` 历史回溯

**验收**：
- 给 daoshi58 通过 LM 端"分配 mentor"绑定一个新学生，mentor 端"上报课消"弹窗的"学员"下拉立即出现该学生
- 单测覆盖 `OsgClassRecordServiceImpl.collectReportableStudentIds("mentor")` 三种路径（coaching / mock_practice / 历史 class_record）

---

## 3. 测试方案

### 3.1 单测

每个 FIX 各加 1-2 个针对性单测（已列在各 §）。

### 3.2 5 端 E2E（统一测试）

新增 `osg-frontend/tests/e2e/mock-practice-class-record-five-end.e2e.spec.ts`：

```
1. admin 创建一条 osg_mock_practice (student=hw01, type=mock_interview)
2. LM 端登录 yanyabanzhuren，分配 mentor=daoshi58
3. DB 断言：osg_mock_practice.mentor_ids 含 user_id(daoshi58)
4. LM 端排课 scheduled_at='2026-05-20 10:00'
5. mentor 端登录 daoshi58
   - 列表显示该 practice（assignedTime 正确）
   - 无"确认"按钮（FIX-1 验收）
   - 点"上报课消" → 弹窗学员下拉含 hw01（FIX-4 验收）
   - 提交一条课消（reference_type=mock_interview, reference_id=practice_id）
6. student 端登录 hw01
   - mock-practice 列表 scheduledAt 显示 '2026-05-20 10:00'（FIX-2 验收）
   - 详情弹窗"预约时间"显示真实值
7. assistant 端登录 zhujiao58
   - "我管理的学员" tab 显示该 practice + 已上报课消数=1
8. admin 端审核刚才那条 class_record 通过
9. mentor 端列表"已上报课消数"+1
10. 如有驳回路径：admin 驳回 → mentor "重提交"按钮触发标准 modal（FIX-3 验收）→ 不再 400
```

E2E 时长目标 < 90s，加入 CI optional 队列。

### 3.3 回归

跑现有：
- `mvn test -pl ruoyi-system,ruoyi-admin`
- `pnpm --dir osg-frontend/packages/mentor test`
- `pnpm --dir osg-frontend/packages/student test`
- `pnpm --dir osg-frontend/packages/shared test`

---

## 4. 执行顺序与依赖

| 序 | FIX | 工作量 | 依赖 |
|---|---|---|---|
| 1 | FIX-2 学生端 scheduledAt | 20 min | 无（最易，最大确定性）|
| 2 | FIX-1 mentor 删确认按钮 | 30 min | 无（纯前端删 + 单测） |
| 3 | FIX-4 mentor 可见性 | 60-120 min | 必须先 DB 抓证据（4.1 阶段） |
| 4 | FIX-3 confirm-from-reject 走 modal | 60-90 min | 无（独立路径） |

**串行不可并发**，但 FIX-1/2 简单不会冲突，可作首先提交基线。

---

## 5. 风险

- FIX-1 删 backend `/mentor/mock-practice/{id}/confirm` 前必须 grep 5 端 + e2e 测试是否引用
- FIX-2 加 scheduledAt 字段返回，前端类型已声明，0 兼容风险
- FIX-3 改 confirm-from-reject 改动用户感知最大，需 CDP 验视觉
- FIX-4 若证据显示 ID 空间错位，可能涉及数据治理（修历史 mentor_ids 值），范围放大

---

## 6. 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-15 | 首版，基于双 agent code audit + 需求文档 |
| 2026-05-15 | **FIX-1 + FIX-2 已落地**：mvn test 11/11 全过；CDP 验证 mentor 端 mock-practice 列表显示 daoshi58 的 3 条记录 + 无确认按钮（符合需求 §2.3）；CDP 验证 student 端模拟面试详情弹窗显示真实预约时间 `2026-05-21 10:00`（FIX-2 前永远显示「待安排」）。FIX-3 + Bug 4 改 P2 挂起待用户后续验证。 |

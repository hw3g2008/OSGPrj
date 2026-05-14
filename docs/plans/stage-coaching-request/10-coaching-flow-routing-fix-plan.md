# 辅导申请流转链路 bug 修复方案

- **日期**：2026-05-13
- **触发**：学生 `hw01 / hwyellow222@126.com` 申请 Goldman Sachs First Round 辅导（coaching_id=5220），班主任 / 助教端**完全收不到流转**，只在 admin 端兜底列表里能看到。链路与 RULE-A 公共流转设计不一致。
- **关联**：
  - `00-overview.md`（双层 application / coaching 模型）
  - `02-job-overview-coaching-anchor-revision.md`（公共流转 coaching 锚点）
  - `08-master-bug-spec.md` RULE-A（4 端字段对齐，未覆盖 admin coaching 维度 + profile 显示）
  - `09-rule-a-alignment-fix-plan.md`（学生/班主任/助教/导师端 UI 对齐方案）
- **状态**：📝 方案文档，**未动代码**，待用户确认后分批执行

---

## 0. ID 语义校准（重要前置）

校验后**确认**以下字段的 ID 空间，方案 SQL / 代码以此为准：

| 字段 | ID 空间 | 来源 |
|---|---|---|
| `osg_student.lead_mentor_id` | **user_id** (sys_user.user_id) | OsgStudentServiceImpl:138-148 通过 `resolveStaffIdsToUserIds` 转换后写入 |
| `osg_student.lead_mentor_ids` | **user_id CSV** | 同上 |
| `osg_student.assistant_id / assistant_ids` | **user_id (CSV)** | 同上 |
| `osg_job_application.lead_mentor_id` | **user_id** | OsgUserJobOverviewServiceImpl:573 用 `SecurityUtils.getUserId()` 过滤可证 |
| `osg_coaching.mentor_ids` | **user_id CSV** | OsgJobOverviewServiceImpl:153 `resolveUserIdByStaffId` 转换后写入 |
| admin student detail API 出参 `leadMentorIds` | **staff_id** | 出口处用 `resolveStaffIdByUserId` 反向转换显示 |
| `osg_staff ↔ sys_user` | **通过 email** 关联，无外键 | OsgIdentityResolver:52-62 |

**实证**：student 25112 (hw01) `lead_mentor_id=12814` → `sys_user.user_id=12814` (email `test-lead-mentor@osg-test.local`) → `osg_staff.staff_id=99901`（同 email），admin API 出参就显示 99901。

**结论**：回填 SQL `a.lead_mentor_id ← s.lead_mentor_id` 两边都是 user_id，**无须转换**。

---

## 1. 现场证据

### 1.1 DB 直查

```sql
-- coaching #5220 真实存在
SELECT * FROM osg_coaching WHERE coaching_id=5220;
-- coaching_id=5220, application_id=300, student_id=25112
-- interview_stage=first, interview_time=2026-05-14 19:23
-- status=pending, mentor_ids=NULL, requested_mentor_count=1

-- 学生 hw01 实际有班主任 + 助教
SELECT student_id, lead_mentor_id, lead_mentor_ids, assistant_ids FROM osg_student WHERE student_id=25112;
-- lead_mentor_id=12814, lead_mentor_ids='12814,12858', assistant_ids='12813,12867'

-- application 没回填 lead_mentor_id（fixture 写入 + 学生换班主任不同步）
SELECT application_id, lead_mentor_id, create_by FROM osg_job_application WHERE application_id IN (300,301,302);
-- 三条全 NULL, create_by=NULL（说明是 fixture 直插，未走 service）

-- osg_student_profile 表的 lead_mentor / assistant_name 全是 dead column
SELECT total=8, null_lm=8 FROM osg_student_profile;
-- 所有记录这两个字段都是 "-" 或空
```

### 1.2 影响面统计

```sql
SELECT COUNT(*) AS total, SUM(CASE WHEN lead_mentor_id IS NULL THEN 1 ELSE 0 END) AS null_lm
FROM osg_job_application;
-- total=51, null_lm=4 → 4 条 application 流转断链
```

### 1.3 链路实测（admin 端 Playwright）

- `GET /api/admin/job-overview/unassigned` 返回 22 条，**包含** application 300（hw01 / Goldman Sachs / Summer Analyst-IB）
- 班主任端登录后查 `/lead-mentor/job-overview/list?scope=pending` 应该看到这条 → 实测过滤条件 `lookupQuery.setLeadMentorId(currentUserId)` 因 application.lead_mentor_id=NULL 而漏过
- 学生端 `/api/student/profile` 返回 `leadMentor: '-', assistantName: '-'`，与 admin student detail 里返回的 leadMentorNames=['Test Lead Mentor', 'yanyabanzhuren'] 完全不一致

---

## 2. Bug 清单

### B1 🔴 P0 — `osg_job_application.lead_mentor_id` 与学生班主任绑定不同步

**根因**：

- `PositionServiceImpl.upsertMainApplication`（`PositionServiceImpl.java:1984`）已写 `created.setLeadMentorId(student.getLeadMentorId())`，但：
  - **fixture / 数据迁移直接 INSERT** 不会经过该 service，于是 4 条 application 漏填
  - **学生换班主任后** `OsgStudentServiceImpl.updateStudent`（`OsgStudentServiceImpl.java:148`）只改 `osg_student.lead_mentor_id`，**不刷新** 已存在的 application 记录
- 后果：班主任端 / 助教端走 `osg_job_application.lead_mentor_id` 过滤的所有"待分配 / 待辅导 / 我管理的"列表对该学生**全失效**

**影响范围**：
- 当前 4 条 application 已断链（含 hw01 三条）
- 任何"换班主任"或"补绑班主任"操作之后，旧 application 永远不同步

---

### B2 🔴 P0 — 学生端 profile 不显示班主任 / 助教

**根因**：

- `osg_student_profile` 表有冗余字段 `lead_mentor / assistant_name`，但它们**从来没被回写**：
  - `StudentProfileServiceImpl.ensureProfile`（`StudentProfileServiceImpl.java:183-184`）首次创建固定写 "-"
  - `overlayApprovedMainStudent`（`StudentProfileServiceImpl.java:213-236`）从 `osg_student` 覆盖 9 个字段，**唯独漏 lead_mentor / assistant_name**
  - 学生数据更新（`OsgStudentServiceImpl.updateStudent`）只改 `osg_student.lead_mentor_id`，不写 profile 表
- `osg_student_profile` API 返回的 `leadMentor`/`assistantName` 是单字符串，无法表达多班主任（hw01 有 2 个班主任 + 2 个助教）

**影响范围**：
- 8 条 osg_student_profile 记录的两个字段全为 "-"
- 所有学生端 "我的资料 → 导师配置" 永远显示 "-"

---

### B3 🟠 P1 — admin 端"学员求职总览"仍是 application 维度，未对齐 RULE-A

**根因**：

- `OsgAdminJobOverviewController` 只有 `/unassigned` + `/assign-mentor`（按 applicationId），无 coaching 维度端点
- `OsgJobOverviewServiceImpl.selectUnassignedList` 返回 application 维度，前端 admin/job-overview 也按 applicationId 显示
- `assignMentors` 调 `selectCoachingByApplicationId(applicationId)` 只取一条 coaching → 同一 application 多条阶段级 coaching 时，**只能分配第一条，后续 coaching 永远拿不到导师**
- `08-master-bug-spec.md` A-JO-001~004 已列 admin 端 4 条改造，**漏列 coaching 维度切换** → 应补 A-JO-005

**影响范围**：
- coaching #5220 当前能被 admin 看到（因为 application 300 下只有这一条 coaching），但**链路不稳**
- 一旦学生对同一岗位申请第 2 个阶段辅导，admin 端将看不到 / 分配不到

---

### B4 🟡 P2 — admin / lead-mentor / 学员求职总览搜索框只匹配 studentName

**根因**：

- 搜索"hwyellow"匹配 0 条，因 backend SQL 走 `osg_student.student_name LIKE`，不含 email / studentId
- 用户用邮箱定位学生时找不到

**影响范围**：
- 仅影响搜索体验，不影响数据正确性

---

## 3. 修复方案

### 3.1 B1 修复：application.lead_mentor_id 与 student.lead_mentor_id 强同步

#### 3.1.1 一次性回填脚本（DB SQL）

```sql
UPDATE osg_job_application a
JOIN osg_student s ON s.student_id = a.student_id
SET a.lead_mentor_id = s.lead_mentor_id,
    a.update_time = NOW(),
    a.update_by = 'data_fix_2026_05_13'
WHERE a.lead_mentor_id IS NULL
  AND s.lead_mentor_id IS NOT NULL;
```

**验收**：
- 执行后 `SELECT COUNT(*) FROM osg_job_application WHERE lead_mentor_id IS NULL` 仅剩学生本身 lead_mentor_id 也为 NULL 的极少数
- 班主任 staff_id=12814 对应 user_id 登录 lead-mentor 端，"待分配导师" Tab 出现 hw01 的辅导申请 #5220

#### 3.1.2 代码修复：学生班主任变更时同步刷新 application

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentServiceImpl.java`

在 `updateStudent` 方法 line 148-151 之后追加：

```java
// §B1 修复：班主任 / 助教变更时同步刷新该学生所有未结束 application
Long newLeadMentorUserId = update.getLeadMentorId();
if (!Objects.equals(existing.getLeadMentorId(), newLeadMentorUserId))
{
    jobApplicationMapper.updateLeadMentorByStudent(studentId, newLeadMentorUserId);
}
```

**新增 Mapper 方法**：`OsgJobApplicationMapper.updateLeadMentorByStudent(Long studentId, Long leadMentorUserId)`

```xml
<update id="updateLeadMentorByStudent">
    UPDATE osg_job_application
    SET lead_mentor_id = #{leadMentorUserId},
        update_time = NOW()
    WHERE student_id = #{studentId}
</update>
```

> **校准**：`osg_job_application` 表**没有 `status` 列**，"已结束"只能由 `current_stage IN ('offer', 'rejected', 'withdrawn')` 表达（且 `withdrawn` 在 service 层被 normalize 为 `cancelled`）。原方案曾建议加 `current_stage NOT IN` 过滤，校验后**移除**：班主任变更属于学生关系变更，应**全量同步**，已 offer / rejected 的同步也无副作用（它们在 coaching.status / assign_status 层已被流转列表过滤掉）。

**验收**：
- 单测：修改学生 lead_mentor → 该学生**所有** application.lead_mentor_id 同步更新
- E2E：admin 端给 hw01 改绑班主任 → lead-mentor 端切换登录可见 hw01 的辅导申请

#### 3.1.3 防御：service 入口兜底回填

在 `PositionServiceImpl.upsertMainApplication` line 1975-2003，把 "existing != null" 分支也加上：

```java
if (existing.getLeadMentorId() == null && student.getLeadMentorId() != null)
{
    OsgJobApplication patch = new OsgJobApplication();
    patch.setApplicationId(existing.getApplicationId());
    patch.setLeadMentorId(student.getLeadMentorId());
    jobApplicationMapper.updateJobApplication(patch);
}
```

防止历史数据被"惰性修复"——学生下次 upsert 时自动补齐。

---

### 3.2 B2 修复：学生端 profile 显示真实班主任 / 助教

#### 3.2.1 后端：从 osg_student 解析班主任 / 助教姓名

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentProfileServiceImpl.java`

`overlayApprovedMainStudent` 方法（line 213-236）末尾追加：

```java
// §B2 修复：从 osg_student.lead_mentor_ids / assistant_ids 解析 staff 姓名列表
List<String> leadMentorNames = resolveStaffNames(parseCsvLongs(student.getLeadMentorIds()));
List<String> assistantNames = resolveStaffNames(parseCsvLongs(student.getAssistantIds()));
profile.put("leadMentor", leadMentorNames.isEmpty() ? "-" : String.join(", ", leadMentorNames));
profile.put("assistantName", assistantNames.isEmpty() ? "-" : String.join(", ", assistantNames));
// 同时透出数组，前端可改 pill 渲染
profile.put("leadMentorNames", leadMentorNames);
profile.put("assistantNames", assistantNames);
```

需新增辅助方法（复用现有 `identityResolver`）：

```java
private List<String> resolveStaffNames(List<Long> userIds)
{
    if (userIds == null || userIds.isEmpty()) return List.of();
    return userIds.stream()
        .map(uid -> Optional.ofNullable(userService.selectUserById(uid))
            .map(SysUser::getNickName)
            .orElse(null))
        .filter(Objects::nonNull)
        .toList();
}
```

#### 3.2.2 前端：支持数组渲染

**文件**：`osg-frontend/packages/shared/src/api/profile.ts`

```ts
export interface StudentProfileRecord {
  // ...
  leadMentor: string              // 保留 fallback
  leadMentorNames: string[]       // §B2 新增
  assistantName: string
  assistantNames: string[]        // §B2 新增
  // ...
}
```

**文件**：`osg-frontend/packages/student/src/views/profile/index.vue`

line 33-37 改为 pill 数组渲染：

```vue
<a-card title="导师配置" :bordered="false" size="small" class="info-block">
  <a-descriptions :column="{ xs: 1, sm: 2 }" :colon="false">
    <a-descriptions-item label="班主任">
      <template v-if="profile.leadMentorNames?.length">
        <a-tag v-for="name in profile.leadMentorNames" :key="name">{{ name }}</a-tag>
      </template>
      <template v-else>-</template>
    </a-descriptions-item>
    <a-descriptions-item label="助教">
      <template v-if="profile.assistantNames?.length">
        <a-tag v-for="name in profile.assistantNames" :key="name">{{ name }}</a-tag>
      </template>
      <template v-else>-</template>
    </a-descriptions-item>
  </a-descriptions>
</a-card>
```

#### 3.2.3 不动 osg_student_profile 表

- `lead_mentor / assistant_name` 列保留为 dead column（不删，避免回归）
- 后续可在数据治理阶段统一清理

**验收**：
- hw01 登学生端 → "我的资料" 看到班主任 = "Test Lead Mentor, yanyabanzhuren"，助教 = "Test Assistant, zhujiao58"
- 单测：`StudentProfileServiceImplTest` 加 case：学生有 2 个班主任时返回数组长度=2

---

### 3.3 B3 修复：admin 端切到 coaching 维度

> **依赖**：本期定稿 RULE-A 的 admin 段当前只列了删卡片 / 全部学员 / 删分配状态筛选三项，没列 coaching 维度切换。本方案补一条 A-JO-005。

#### 3.3.1 后端新增 coaching 维度端点

**文件**：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAdminJobOverviewController.java`

新增：

```java
@PreAuthorize(JOB_OVERVIEW_ACCESS)
@GetMapping("/unassigned-coachings")
public AjaxResult unassignedCoachings(@RequestParam(required = false) String studentName,
                                     @RequestParam(required = false) String companyName,
                                     @RequestParam(required = false) Long leadMentorId)
{
    List<Map<String, Object>> rows = jobOverviewService.selectUnassignedCoachingList(studentName, companyName, leadMentorId);
    return AjaxResult.success().put("rows", rows);
}

@PreAuthorize(JOB_OVERVIEW_ACCESS)
@PostMapping("/coaching/{coachingId}/assign-mentor")
public AjaxResult assignMentorByCoaching(@PathVariable Long coachingId, @RequestBody Map<String, Object> body)
{
    body.put("coachingId", coachingId);
    Map<String, Object> result = jobOverviewService.assignMentorsByCoaching(body, resolveOperator());
    return AjaxResult.success("导师分配成功", result);
}
```

#### 3.3.2 Service 层实现

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java`

复用 LM 端 `OsgUserJobOverviewServiceImpl.assignMentorsByCoaching` 已有逻辑，admin 版不限定 leadMentorId：

```java
public List<Map<String, Object>> selectUnassignedCoachingList(String studentName, String companyName, Long leadMentorId)
{
    // 1) 拉所有 status=pending + mentor_ids 为空的 coaching
    // 2) JOIN application, student
    // 3) 按 leadMentorId 可选过滤（admin 默认 null = 全部）
    // 4) 按 submittedAt DESC 返回
}

public Map<String, Object> assignMentorsByCoaching(Map<String, Object> body, String operator)
{
    Long coachingId = toLong(body.get("coachingId"));
    // 数量校验：mentorIds.size() == coaching.requestedMentorCount
    // 仅 update 目标 coaching，不影响 application 状态
    // status: pending → assigned
}
```

#### 3.3.3 前端切换

**文件**：`osg-frontend/packages/admin/src/views/career/job-overview/index.vue`

待分配 Tab 数据源从 `getUnassignedJobOverviewList` 改为 `getUnassignedCoachingList`（新增 shared API）。row key 改为 `coachingId`，列里展示 interview_stage / interview_time（来自 coaching 不是 application）。

分配导师弹窗 submit 改为 `assignMentorByCoachingApi(coachingId, payload)`。

#### 3.3.4 兼容期

- 保留旧 `/unassigned` + `/assign-mentor` 端点，新端点上线后逐步切走
- 待 admin 前端全部切到 coaching 维度后再 deprecate 旧 API

**验收**：
- 单测：admin 端 unassigned-coachings 返回 coaching 维度行，一个 application 多 coaching 时显示多行
- E2E：学生对同一 application 创建第 2 条 coaching → admin "待分配" Tab 两行都能见 + 分别可分配

#### 3.3.5 在 `08-master-bug-spec.md` A-JO 段新增

```
| A-JO-005 | 后台学员求职总览切到 coaching 维度（按 RULE-A） | ▶ TODO | 后端新增 /unassigned-coachings + /coaching/{id}/assign-mentor；前端切数据源 |
```

---

### 3.4 B4 修复：admin / lead-mentor 搜索框支持 email / studentId

#### 3.4.1 后端 SQL 扩展

`OsgJobOverviewServiceImpl.selectApplications` 当前按 `student_name LIKE`。改为：

```sql
WHERE (s.student_name LIKE CONCAT('%', #{studentName}, '%')
       OR s.email LIKE CONCAT('%', #{studentName}, '%')
       OR CAST(s.student_id AS CHAR) = #{studentName})
```

> **校准**：**保留 `studentName` 入参名**不重命名，避免破坏现有 controller / 前端 / shared API 类型契约（admin / lead-mentor / assistant / mentor 四端都用了该参数名）。只在语义层扩展。

#### 3.4.2 前端 placeholder

```diff
- placeholder="搜索学员姓名..."
+ placeholder="搜索学员姓名 / 邮箱 / 学号..."
```

**验收**：
- 搜 "hwyellow" → 命中 hw01
- 搜 "25112" → 命中 hw01
- 搜 "hw01" → 命中 hw01

---

## 4. 修复顺序与依赖

| Step | Bug | 类型 | 依赖 | 工作量 |
|---|---|---|---|---|
| S1 | B1 §3.1.1 | DB 回填脚本 | 无 | 0.5 人日（含回归验证）|
| S2 | B1 §3.1.2/3 | 后端代码 | S1 | 1 人日 |
| S3 | B2 §3.2 | 后端 + 前端 | 无 | 1 人日 |
| S4 | B3 §3.3 | 后端新端点 + 前端切换 | 无（与 S1~S3 解耦）| 2 人日 |
| S5 | B4 §3.4 | 后端 SQL + 前端 | 无 | 0.5 人日 |

**建议先做 S1+S2+S3**（修复流转主链 + 学生端可见），再做 S4（admin 端 RULE-A 对齐）。

---

## 5. 验收用例（端到端）

### 5.1 用 hw01 (hwyellow222@126.com) 跑通

1. **DB**：执行 S1 SQL → application 300/301/302 lead_mentor_id 填上 12814
2. **学生端 profile**：登 hw01 → 班主任 = "Test Lead Mentor, yanyabanzhuren"，助教 = "Test Assistant, zhujiao58"
3. **班主任端**：登 staff_id=12814（Test Lead Mentor）→ /career/job-overview → "待分配导师" Tab → 看到 coaching #5220（学生 hw01 / Goldman Sachs / Summer Analyst-IB / First Round / 2026-05-14 19:23）
4. **班主任分配**：点 "分配导师" → 选 1 位导师 → status 变 assigned
5. **导师端**：被分配的导师登录 → /job-overview "待辅导的学员" Tab → 看到 hw01 这条
6. **admin 端**：A-JO-005 完成后 → /career/job-overview "待分配" Tab 默认全部学员 + 行维度 coaching

### 5.2 回归

- 现有 22 条 admin 待分配 application 仍能见 + 分配
- 修学生班主任后 → application 自动同步
- 学生 profile 编辑保存后不影响班主任 / 助教展示

---

## 6. 风险与已知局限

### 6.1 多班主任限制（**本方案不解决**，仅标注）

- `osg_student.lead_mentor_ids` 是 CSV（如 `12814,12858`），但 `osg_student.lead_mentor_id` 只存第一个 user_id
- `osg_job_application.lead_mentor_id` 也只有一个列
- 班主任端 `OsgUserJobOverviewServiceImpl:573` 走 `application.lead_mentor_id = currentUserId` **等值匹配**
- 当前 hw01 有 2 个班主任 (12814, 12858)，**回填后只有 12814（主班主任）能看到**该学生的 application，12858 看不见
- 修复需要把 `application.lead_mentor_id` 列改为 `lead_mentor_ids` CSV + 用 `FIND_IN_SET` 过滤，是较大的表结构 + 多端 SQL 改造
- **判断**：本期不在主链改造范围（08-master-bug-spec 与 09-rule-a-alignment 均未列）；若用户认为需要纳入，应单独立 ticket

### 6.2 执行风险

- **B1 回填脚本**：在生产执行前先 `SELECT COUNT(*)` + 备份 `osg_job_application` 表（dump 一份 CSV / SQL）
- **B3 双端点共存期**：旧 `/unassigned` + `/assign-mentor` 仍被现有 admin 前端使用，新端点上线后**先在前端切换 + 灰度验证**，再 deprecate 旧 API；不要直接删
- **B2 性能**：批量 `userService.selectUserById` 改为单次 `userMapper.selectUserListByIds(List<Long>)`（如不存在则新增）—— 避免 N+1
- **B1 §3.1.3 兜底回填可能掩盖问题**：写 application 时 `existing.lead_mentor_id` 为空时静默修复，长期掩盖 fixture / 数据迁移漏洞；建议加 log 记录被兜底的 application_id，便于事后排查源头

---

## 7. 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-13 | 首版：基于 hw01 / coaching #5220 实测证据，整理 B1~B4 修复方案 |
| 2026-05-13 | 校验修正：①增加 §0 ID 语义校准（user_id vs staff_id 明确）；②B1 §3.1.2 移除 current_stage 过滤条件（osg_job_application 无 status 列，且全量同步更安全）；③B4 保留 studentName 参数名不重命名；④§6 新增多班主任限制说明 + N+1 查询规避 |
| 2026-05-13 | **本地端到端验证完成**：B1/B2/B3/B4 后端代码 + 前端代码 + 单测 + UI 实测全部 PASS。Step 1（学生 hw01 申请 Morgan Stanley 辅导 → admin UI 看到 2 条 coaching）+ Step 2（admin 编辑 hw01 班主任 → §3.1.2 sync 触发 → 3 条 application.lead_mentor_id 同步刷新 → lead-mentor 端 yanyabanzhuren 看到 3 条 hw01 申请）+ Step 3（班主任分配 e2e_mt → coaching #5220 status=assigned）全部端到端贯通 |
| 2026-05-13 | **新发现 B5 / 撤回伪 bug**：见 §8 |
| 2026-05-14 | **新发现 B6 + B7（mentor 端）**：B6 mentor 列表样式与 LM 不一致；B7 mentor `/mentor/class-records/*` 全部 404，根因 controller mapping 带 `/api/` 前缀 + vite proxy passthrough 未生效（详见 §8.3 / §8.4） |
| 2026-05-14 | **§9 闭环合并**：B5/B6/B7 + C 弹窗类型映射 + D 简历类型合并 + E enum 修正一起落地（commit `145c9dcf`）；P2-4 死分支清理（`390c20ca`）+ P2-5 弹窗视觉打磨（`7cfef7c7`）。详见 §9 |

---

## 8. 端到端验证后新发现 / 撤回

### 8.1 ✅ 新 bug B5 — lead-mentor 端 "提交时间" 字段未切到 coaching 维度

**根因**：

`OsgUserJobOverviewServiceImpl.toOverviewPayload`（`OsgUserJobOverviewServiceImpl.java:983`）：

```java
payload.put("submittedAt", application.getSubmittedAt());  // ❌ 仍用 application 投递时间
```

虽然 stage / interviewTime / city / requestedMentorCount 都已经按 `coaching` 优先 fallback `application`，但 **submittedAt 字段漏改**。

**实测现象**：

yanyabanzhuren 班主任端 "待分配导师" Tab 显示：

| 学员 | 公司 | 提交时间显示 | 实际 coaching.create_time |
|---|---|---|---|
| hw01 | Goldman Sachs | 2026-05-10 10:00 ❌ | 2026-05-13 19:23 ✅ |
| hw01 | Morgan Stanley | 2026-05-08 09:00 ❌ | 2026-05-13 22:38 ✅ |
| hw01 | JPMorgan | 2026-05-05 08:00 ❌ | (无 coaching 行) |

这与 RULE-A 定稿 `02-job-overview-coaching-anchor-revision.md §4.3` 明确要求"**提交时间应使用辅导申请提交时间，而不是岗位投递时间**"不符。

**严重度**：🟠 P1（不影响主链流转，仅 UI 数据错位）

**修复方案**（极小改动）：

新增辅助方法 `resolveOverviewSubmittedAt(application, coaching)`：

```java
private Date resolveOverviewSubmittedAt(OsgJobApplication application, OsgCoaching coaching)
{
    return coaching != null && coaching.getCreateTime() != null
        ? coaching.getCreateTime()
        : application.getSubmittedAt();
}
```

`toOverviewPayload` line 983 改为：

```java
payload.put("submittedAt", resolveOverviewSubmittedAt(application, coaching));
```

**影响面**：lead-mentor "待分配导师" / "待辅导的学员" / "我管理的学员" 三栏的 submittedAt 字段。assistant / mentor 端同接口同改进。

**验收**：
- yanyabanzhuren 班主任端 → hw01 Goldman Sachs 行 → "提交时间" 显示 `2026-05-13 19:23`（不再是 05-10）

---

### 8.2 ❌ 撤回伪 bug — lead-mentor 前端 login API 字段

之前 §6.2 草拟 "lead-mentor 前端 login 字段不匹配"。重审代码：

- `osg-frontend/packages/lead-mentor/src/views/login/index.vue:151` 实际提交的就是 `{ username, password }`
- 后端 `OsgLeadMentorAuthController:43` `loginBody.getUsername()` 接 `username` 字段

**两端字段名一致，不存在 bug**。我前面在 Playwright 中 `page.fill('邮箱', ...)` 触发 500 是因为浏览器内 Vue v-model 未在 `fill_form` 模式下正确 sync，跟生产代码无关。**撤回**该条记录。

---

### 8.3 ✅ 新 bug B6 — mentor 端 "学员求职总览" 列表样式与 lead-mentor 不一致

**现象**：mentor 端 `/job-overview` 列表行使用红色背景 + 左侧竖线，与 lead-mentor 端的中性表格行视觉差异大。

**严重度**：🟡 P2（UI 一致性，不影响功能）

**根因**：mentor 端独立的 row class，没复用共享样式 token。

**修复方向**（待详细 audit 后落地）：
- 抹平 mentor `/views/job-overview/index.vue` 的 row 高亮 CSS，使用与 lead-mentor 一致的 `mentor-item` / `pending-item` 样式
- 或抽取共享 `<JobOverviewTable>` 组件，5 端共用

**验收**：mentor / lead-mentor 端 "学员求职总览" 列表行底色、间距、列分隔线视觉一致。

---

### 8.4 ✅ 新 bug B7 — mentor 端 `class-records/reference-candidates` 等接口 404

**现象**：mentor 端登录后点"待辅导的学员"→"上报课消"，弹窗调 `/mentor/class-records/reference-candidates` → 报错 `No static resource mentor/class-records/reference-candidates`，整个上报课消流程被堵死。

**严重度**：🔴 P0（mentor 端核心流程不可用，流转下一步走不通）

**根因（路径不匹配）**：

- `OsgClassRecordController.java` mentor 端 5 个端点 mapping 全部带 `/api/` 前缀：
  - `@GetMapping("/api/mentor/class-records/list")`（line 158）
  - `@GetMapping("/api/mentor/class-records/{id}")`（line 166）
  - `@PostMapping("/api/mentor/class-records")`（line 172）
  - `@GetMapping("/api/mentor/class-records/reportable-students")`（line 181）
  - `@GetMapping("/api/mentor/class-records/reference-candidates")`（line 188）
- 而 `OsgLeadMentorClassRecordController.java:30` 用 `@RequestMapping("/lead-mentor/class-records")` —— **不带 `/api/`**
- mentor 端 `vite.config.ts:8` 用 `passthroughPrefixes: ['/api/mentor']` 想保留 `/api`，但 vite 的 proxy key 匹配优先级让 `/api` 这条 strip 规则先命中，最终 backend 收到的是去掉 `/api/` 后的 `mentor/class-records/...`
- 与 backend mapping `/api/mentor/class-records/...` 不匹配 → 404 fallback 到 static resource 处理器 → 错误信息 "No static resource mentor/class-records/reference-candidates"

**深度调研结果（2026-05-14）**：

#### 历史原因

- 由 commit `33e8360a`（2026-03-18 hwyellow@126.com `feat(mentor): implement mentor portal - 8 stories, 44 tickets`）引入。**不是设计要求**，是初期实现遗留 — lead-mentor / assistant 后续都没跟风。
- `48c6b071`（2026-03-25）把 proxy 逻辑统一成 `createApiProxyConfig` 时固化了 `passthroughPrefixes: ['/api/mentor']` 的特殊处理。

#### 完整影响面（13 处 controller mapping + 32 处 spec mock）

**后端 13 处带 `/api/mentor/` 前缀的 mapping**（**唯一带前缀的 5 端之一**）：

| 文件 | 行 | mapping |
|---|---|---|
| `OsgClassRecordController.java` | 158 | `/api/mentor/class-records/list` |
| `OsgClassRecordController.java` | 166 | `/api/mentor/class-records/{id}` |
| `OsgClassRecordController.java` | 172 | `/api/mentor/class-records` (POST) |
| `OsgClassRecordController.java` | 181 | `/api/mentor/class-records/reportable-students` |
| `OsgClassRecordController.java` | 188 | `/api/mentor/class-records/reference-candidates` |
| `OsgMentorProfileController.java` | 16 | `@RequestMapping("/api/mentor/profile")` |
| `OsgMentorStudentController.java` | 34 | `@RequestMapping("/api/mentor/students")` |
| `OsgMentorScheduleController.java` | 13 | `@RequestMapping("/api/mentor/schedule")` |
| `OsgMentorJobOverviewController.java` | 38 | `@RequestMapping("/api/mentor/job-overview")` |
| `OsgMockPracticeController.java` | 69 | `/api/mentor/mock-practice/list` |
| `OsgMockPracticeController.java` | 77 | `/api/mentor/mock-practice/{id}/confirm` |
| `OsgMockPracticeController.java` | 96 | `/api/mentor/mock-practice/{id}` |

**前端 32 处 spec mock URL**（按文件）：

| 测试文件 | 数量 |
|---|---|
| `vite-proxy-entry.spec.ts` | 5 |
| `courses.behavior.spec.ts` | 7 |
| `mock-practice.behavior.spec.ts` | 5 |
| `page-interactions.spec.ts` | 3 |
| `job-overview.behavior.spec.ts` | 2 |
| `schedule.behavior.spec.ts` | 2 |
| `mentor-nav-badge.spec.ts` | 2 |
| `profile.behavior.spec.ts` | 1 |
| 其它（如 courses.behavior 内 students/list 等） | 5 |

#### ⚠️ 新发现的跨端依赖

`osg-frontend/packages/assistant/vite.config.ts` 同样在用 `passthroughPrefixes: ['/api/mentor', '/assistant']`。assistant 端也通过 `/api/mentor/*` 路径调用 mentor 接口（如查看导师课消等场景）。如果方案 A 改了 backend mapping，assistant 这个 passthrough 也要同步清理。

#### 矛盾点：vite-proxy-entry.spec.ts 反向锁定

`packages/mentor/src/__tests__/vite-proxy-entry.spec.ts:54-59` 明确测试：
```ts
expect(proxy['/api/mentor'].rewrite?.('/api/mentor/profile') ?? '/api/mentor/profile').toBe('/api/mentor/profile')
```
**期望 `/api/mentor` passthrough 不带 rewrite，原样转发到 backend `/api/mentor/...`**。

这说明现有设计是「passthrough 原样转发 + backend mapping 带 `/api/`」**配套** 的。所以方案 A 必须**同时改两边**：去掉 backend `/api/` 前缀 + 去掉 vite proxy passthrough + 改 spec 期望。

#### 方案对比

| 维度 | 方案 A（去掉 `/api/`） | 方案 B（修 proxy 逻辑） |
|---|---|---|
| 改动点数 | 13 mapping + 32 spec + 2 vite config = ~47 处 | ~6 处 viteProxy.ts + assistant 端验证 |
| 风险等级 | 低（改动局限于 mentor + assistant 部分） | 高（涉及 5 端共享 createApiProxyConfig） |
| 一致性 | ✅ 5 端统一 `/{end}/...` | ❌ mentor 仍是特例 |
| 可读性 | 优（路径即命名空间） | 差（passthrough strip 魔法隐藏在配置里） |
| 长期维护 | 简单 | 需要文档解释为何 mentor 不一样 |

#### 最终推荐：方案 A

理由：
1. **架构一致性**：5 端都用 `/{end}/...` 命名空间，消除 mentor 这个特例
2. **改动机械可控**：47 处替换，全是字符串改动，无逻辑复杂度
3. **删除遗留 hack**：viteProxy.ts 的 passthroughPrefixes 逻辑可以保留给真正的跨端场景，但 mentor 不再依赖它
4. **assistant 端也跟着清爽**：删掉 `passthroughPrefixes: ['/api/mentor', '/assistant']` 中的 `/api/mentor`

#### 修复 checklist（方案 A）

**后端**：
- [ ] 13 处 mapping 去掉 `/api/` 前缀
- [ ] 编译验证 `mvn -pl ruoyi-system,ruoyi-admin -am -DskipTests compile -q`
- [ ] 后端单测 `mvn test`（controller test 用 mockMvc.perform(get("/mentor/...")) 不带 baseURL，受影响可控）

**前端**：
- [ ] 32 处 spec mock URL `/api/mentor/` → `/mentor/`
- [ ] `packages/mentor/vite.config.ts` 删除 `passthroughPrefixes: ['/api/mentor']` + 重新评估 `customRewritePrefixes` 中的 `/api/mentor/forgot-password`
- [ ] `packages/assistant/vite.config.ts` 清理 `passthroughPrefixes` 中的 `/api/mentor`（如有）
- [ ] `vite-proxy-entry.spec.ts` 改期望
- [ ] `pnpm --filter @osg/mentor test` 全部 PASS

**E2E 验收**：
- mentor 端 `/job-overview` "上报课消" → 弹窗打开
- 关联申请下拉 → 列出 hw01 #5220 / 5221
- 提交一条课消 → DB 写入 osg_class_record（reference_id=5220）

---

### 8.5 ⚠️ 已知遗留（不在本期 4 + B5 范围）

- **B1 §3.1.1 历史脏数据**：跑 Step 2 sync 后 hw01 三条 application.lead_mentor_id 已自然回填为 12858。**仍剩 1 条其它学生 application.lead_mentor_id=NULL**（fixture 漏填，未触发任何 sync 路径）。如需全量补齐，跑回填 SQL（§3.1.1）。
- **admin "已分配" Tab（"全部学员"）coaching 维度切换**：本次只切了"待分配" Tab 用 coaching 维度新端点。"全部学员" Tab 仍用 `/admin/job-overview/list`（application 维度）。如要全员对齐，需类似改造。
- **多班主任限制**：osg_student.lead_mentor_id 只存第一个 user_id；osg_job_application.lead_mentor_id 列也只有一个。一个学生绑 2 个班主任时，只有"主班主任"能看到流转，副班主任看不到（见 §6.1）。本期不修，需单独立 ticket。
- **lead-mentor 端 "我辅导的学员" 操作列 "上报课消"**：与本次 4 个 bug 无关，但流转链路下一步要走（mentor / lead-mentor 分配后上报课消 → 学生看到）。属 RULE-C 范围。
- **mentor 端"操作"列定稿名称澄清**：定稿 RULE-A（08-master-bug-spec §2）明确 mentor 端是「上报课消」按钮，不是旧 PRD_LeadMentor 里的「确认」按钮。**这不是 bug**，是产品迭代后的结果，仅记录消除认知混淆。

---

## 9. 后续闭环合并（2026-05-14）

§8 完成后又集中处理一批衍生问题，合并入 commit `145c9dcf` 一次落地，后续两条 chore/style commit 收尾。

### 9.1 B5 / B6 / B7 — §8 三条悬挂 bug 实际修复

| Bug | 方案 | 落地点 |
|---|---|---|
| B5 lead-mentor "提交时间" 字段未切 coaching 维度 | 新增 `resolveOverviewSubmittedAt(application, coaching)` 工具方法，三栏统一调用 | `OsgUserJobOverviewServiceImpl.java` |
| B6 mentor 列表样式与 LM 不一致 | 抹平 mentor `/job-overview` row CSS，使用与 lead-mentor 一致的中性表格行 | `osg-frontend/packages/mentor/src/views/job-overview/index.vue` |
| B7 mentor `/api/mentor/class-records/*` 404 | 走 **方案 A**：后端去掉 `/api/` 前缀；前端 spec mock URL + vite proxy passthrough 同步清理 | 13 处 controller mapping + 32 处 spec + mentor/assistant `vite.config.ts` |

**验收**：mentor 端 "上报课消" 弹窗能正常调 `/mentor/class-records/reference-candidates`，关联申请下拉列出 hw01 #5220 / 5221；提交一条课消写入 `osg_class_record(reference_id=5220)`。

---

### 9.2 §C 课消上报弹窗 — 关联类型 label 字典化 + reference 候选 + 单屏滚动版

**C1 label 字典化**：弹窗 "关联类型 / 关联申请" 下拉 label 从硬编码 enum value 切到 `osg_interview_stage` / `osg_coaching_status` / `osg_practice_type` / `osg_mock_practice_status` 4 个字典。字典初始化 SQL 落 `docs/plans/stage-coaching-request/11-class-report-label-dict.sql`（详见 §E 修正历史）。

**C3 单屏滚动版**：`ClassReportFlowModal` 从 step wizard 改造为 5 个 section 并列 + 单屏滚动（废弃 currentStep 切换逻辑）。

**C8 视觉打磨**（2026-05-14，commit `7cfef7c7`）：
- modal 外框：border-radius 12px + 多层阴影，告别"扁平贴图"
- header / body / footer 三段分层（白 / `#f5f7fa` 浅灰 / 白）
- 5 个 section 卡片化（白底 + border + 轻 shadow + 圆角）
- 标题层级：modal title 18px / 600；field label 13px / 500
- 走 `wrap-class-name="class-report-flow-modal-wrap"` 限定全局 style 作用域

---

### 9.3 §D 简历类型合并

**问题**：原 BASE_CATEGORY 有 `new_resume`（写新简历）+ `resume_update`（改简历）两个一级类目，UI 上学员选一级 + 二级体验割裂。

**方案**：
- 前端：一级类目合并为 `resume`，新增二级 radio `resumeSubType ∈ { 'new', 'update' }`
- 提交时按 `resumeSubType` 派生为后端 enum：`new` → `new_resume`，`update` → `resume_update`
- DB enum / 后端 service 0 改动，纯 UI 层适配

**落地点**：
- `osg-frontend/packages/shared/src/components/ClassReportFlowModal/index.vue:349-359`（submit 派生）
- `BaseCourseFeedback.vue` UI 调整 + `BaseCourseTopicPicker` 联动

---

### 9.4 §E enum 修正 — `mock_interview / communication_test / midterm_exam` 三态对齐 DB

**根因**：mentor 端 `resolveReportReferenceType` 历史错映射 `midterm_exam` → `communication_test`，导致期中考试上报拉不到 reference 候选。

**DB 实际 enum 现实**（修正后）：
| value | 学生卡片 | label |
|---|---|---|
| `mock_interview` | mock | 模拟面试 |
| `communication_test` | networking | 人际关系测试 |
| `midterm_exam` | midterm | 期中考试 |

> `relation_test` 是历史虚构 enum，DB 永不出现。

**修复点**：
- 前端 `mentor/views/mock-practice/index.vue:218-224` `resolveReportReferenceType` 改 1:1 映射，删 `relation_test` 错映射
- `shared/types/classReport.ts` ReferenceType 加 `midterm_exam`
- 后端 `OsgClassReportConstants.java` 加 `REFERENCE_TYPE_MIDTERM_EXAM`
- 后端 `OsgClassRecordServiceImpl.java:361-367` `listReferenceCandidates` switch 新增 `midterm_exam` 分支（之前默认空分支吞掉）
- `OsgClassReportConstantsTest.java` 加常量断言

**E2E 验收**：mentor 端三种 referenceType + 两种负向（`relation_test` / 未知）API 全 PASS。

---

### 9.5 P2-4 死分支清理（commit `390c20ca`）

**对象**：`StepReference.vue` 中 `relation_test` 三处死分支（3-4 行）：注释列举、`isReferenceBranch` computed OR 分支、`referenceTypeOptions` switch case。

**约束 scope**：仅这一个文件；其余 37 处 `relation_test` 引用（backend constants / types / tests / docs / SQL seed）保留，后续统一清理。

**验证**：shared package 中 3 个 relation_test 直接相关的 spec（`classReport-constants`, `class-report-flow-modal-prefill`, `classReport-types`）全 PASS（150 测试通过）。其余 18 个 spec 因 pre-existing `@vue/server-renderer` 缺失而 fail，与本改动无关。

---

### 9.6 P2-5 弹窗视觉打磨（commit `7cfef7c7`）

见 §9.2 末段。

---

### 9.7 P0 配套核对

- **P0-1 字典 SQL 上库**：`11-class-report-label-dict.sql` 已由别处会话于 2026-05-14 15:52:57 写入共享 DB（4 dict_type + 20 dict_data，含 §E 修正后的 `osg_practice_type`）。**实际行数 20**，原文件头注释"21 data"为笔误。所有 label/value 与 spec 逐行一致。无需重跑。
- **P0-2 daoshi58 密码**：当前 hash 与 hw01 (admin123) **完全一致**，无需重置。但 backend 检测 `pwd_update_date IS NULL` 触发"修改默认密码"强制弹窗 — 在 mentor 端走一次密码修改（新密码仍设 admin123），同步 `pwd_update_date = NOW()` 即可消除弹窗（已于 P2-5 视觉打磨前操作）。

---

### 9.8 已知遗留（不本期处理）

- **B1 §3.1.1 历史 NULL 回填**：跑 Step 2 sync 后 hw01 三条 application.lead_mentor_id 已自然回填。**仍剩 1 条其它学生 application.lead_mentor_id=NULL**（fixture 漏填）。因 §3.1.2 sync 代码已上线，新数据自愈；该学生不活跃就 0 影响。回填 SQL 可选，未跑。
- **assistant 8 个占位符页面**（`communication / settlement / expense / files / online-test-bank / interview-bank / notice / faq`）：当前是占位符路由，需按需求补实页面。
- **`relation_test` 其余 37 处引用**：backend constants / types / tests / docs / SQL seed，待集中清理。
- **`StepReference.vue` `communication_test` label 与 DB 字典口径**：StepReference switch 给 `communication_test` 标 "沟通测评"；DB 字典 `osg_practice_type` 中 `communication_test` label 是 "人际关系测试"。前后端 label 当前矛盾，下次清理 `relation_test` 残留时统一对齐。



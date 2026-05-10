# Fix Plan — 班主任端 / 导师端 7 项问题修复

> 日期：2026-05-10
> 关联反馈：用户 2026-05-10 反馈 7 条
> 影响端：lead-mentor（班主任端）、mentor（导师端）、student（学生端）、后端
> 状态：待执行

---

## 0. 背景与二次确认结论

| # | 反馈 | 二次确认结论 | 依据（代码位置） |
|---|---|---|---|
| 1 | 班主任既能给"辅导学员"又能给"管理学员"上报课时 | ✅ 已修，本计划不再处理 | 后端 `OsgClassRecordServiceImpl.java:244-281` 同时聚合 `coaching.mentor_ids + student.lead_mentor_id/lead_mentor_ids`；前端弹窗 `shared/.../ClassReportFlowModal/StepBasicInfo.vue` 共用该数据源 |
| 2 | 班主任端能看到后台所有岗位，但与后台信息对不上 | ❌ 待修 | `lead-mentor/views/career/positions/index.vue:140` 走独立 `/lead-mentor/positions/list`；`OsgLeadMentorPositionController.java` 走独立 service，与 admin 列表字段不对齐 |
| 3 | 菜单：学员列表→学员中心；课程列表→教学中心 | ❌ 待修 | `lead-mentor/src/layouts/MainLayout.vue:74-97` 仅有"教学中心"，学员/课程都挂在该组下，无"学员中心" |
| 4 | 岗位列表"地区"显示错误，"主攻方向"与填写不一致 | ⚠️ 部分修 | `lead-mentor/views/career/positions/index.vue:733` `location = row.department \|\| row.city \|\| row.region` 直接展示原始字符串；主攻方向 `row.targetMajors`（CSV）由 `PositionsListTable.vue:99` 直接 split 渲染，未做字典 label 映射；与岗位填表用的字典 key 不一致 |
| 5a | 求职总览加面试时间筛选 | ✅ 已修 | `lead-mentor/views/career/job-overview/index.vue:36-44` 已有 `<a-range-picker>` |
| 5b | 学生提交辅导申请时面试时间允许"未确定" | ❌ 待修 | `student/views/applications/index.vue:317-331` 面试时间 `<DatePicker>` 强制 `required`，无"未确定"开关 |
| 6 | 导师端：只显示分配给我；删日历；筛选只保留面试状态 | ⚠️ 部分修 | 后端 `OsgMentorJobOverviewController.java:51` `listByMentor(query, userId)` 已按 mentor 过滤；前端 `mentor/views/job-overview/index.vue:17` 仍渲染 `<InterviewCalendar>`；筛选区有公司+状态，未精简 |
| 7 | 导师端列表只保留：学员/公司/岗位/面试状态/面试时间 | ⚠️ 部分修 | `mentor/views/job-overview/index.vue:491-498` 当前列：student / company（含 position 子标题）/ stage / interviewTime / coachingStatus / actions = 6 列；缺独立"岗位"列，多"辅导状态/操作" |

---

## 1. 修复任务拆分

### FIX-A | 班主任端岗位与后台对齐（#2）

**目标**：班主任端"岗位信息"列表显示的岗位数据与 admin 端一致（同一数据源 / 同一字段语义）。

**根因**：班主任端 `/lead-mentor/positions/list` 与 admin `/system/osg/position/list` 走两套 service / 两套字段映射，导致 lead-mentor 端漏字段或字段语义偏移。

**变更点**：
1. `IOsgLeadMentorPositionService.selectPositionList()` 实现内部直接复用 admin 用的 `IOsgPositionService.selectPositionList()`（或对应 mapper），仅在外层补 lead-mentor 权限校验，不再保留独立查询逻辑。
2. 字段对齐清单（必须返回，与 admin 列表一致）：
   - `positionId / positionName / companyName / industry / positionCategory / department(地区) / city / region / targetMajors / recruitmentCycle / projectYear / publishTime / deadline / studentCount / companyWebsite / positionUrl / status`
3. 前端 `lead-mentor/api/leadMentorPositions.ts`（如存在）与 `LeadMentorPositionListItem` 类型补齐缺失字段。
4. 移除/合并 `OsgLeadMentorPositionMapper` 中独立 SQL（如有），统一走 `OsgPositionMapper`。

**验证**：
- 同一个 positionId 在 admin 列表与 lead-mentor 列表返回字段值一一相等（写一条对比单测）。
- 手测：`localhost:3005`（admin）与班主任端同时打开岗位列表，逐字段比对随机 5 条。

---

### FIX-B | 班主任端菜单分组（#3）

**目标**：菜单结构改为
- **学员中心 Student Center** → 学员列表
- **教学中心 Teaching** → 课程记录（保留 `课程记录`、剔除"学员列表"）

**变更点**：`osg-frontend/packages/lead-mentor/src/layouts/MainLayout.vue:74-97`

```diff
   {
-    title: '教学中心 Teaching',
+    title: '学员中心 Student Center',
     items: [
       {
         path: '/teaching/students',
         label: '学员列表 Student List',
         iconClass: 'mdi-account-group',
         activePaths: ['/teaching/students'],
       },
+    ],
+  },
+  {
+    title: '教学中心 Teaching',
+    items: [
       {
         path: '/teaching/class-records',
         label: '课程记录 Class Records',
         iconClass: 'mdi-book-open-variant',
         activePaths: ['/teaching/class-records'],
       },
       { path: '/teaching/communication', label: '人际关系沟通记录 Records', ..., hidden: true },
     ],
   },
```

**注意**：
- 路由保持不变（`/teaching/students` / `/teaching/class-records`），仅菜单 grouping 调整。
- 同步修改面包屑（如有 hardcode 在 router/index.ts 的 group 名称需对齐）。
- 跑 `lead-mentor` 单测确认 menu 结构 spec 通过；如 spec 写死 group 数 = 5，需 +1。

---

### FIX-C | 岗位列表"地区/主攻方向"显示（#4）

**目标**：
- "地区"显示标准字典 label（与岗位编辑表单的字典源一致），命中字典 key → 字典 label，未命中显示原值。
- "主攻方向"显示字典 label（多值时多个 tag），未命中字典 key 时显示原值并标灰。

**根因**：
- `positions/index.vue:733` 直接拼 `row.department || row.city || row.region`，三者既可能是字典 key 也可能是自由文本，未走 dictMap 回显。
- `PositionsListTable.vue:97-101` `targetMajors` 仅做 `splitCsv(record.targetMajors)`，把字典 key（如 `tech`/`apac`）当 label 直出。

**变更点**：
1. `lead-mentor/views/career/positions/index.vue`
   - `onMounted` 内 `loadDictMaps(['osg_region', 'osg_major_direction'])`，保存到本地 `regionMap.value` / `majorMap.value`。
   - `toPositionJob()` 中 location 改为：
     ```ts
     location: resolveDictLabel(regionMap.value, row.region) ||
               resolveDictLabel(regionMap.value, row.department) ||
               row.city ||
               row.department ||
               row.region ||
               '-'
     ```
   - `targetMajors` 字段在 mapping 阶段就转成 label CSV：
     ```ts
     targetMajors: (row.targetMajors || '')
       .split(',')
       .map(k => resolveDictLabel(majorMap.value, k.trim()) || k.trim())
       .filter(Boolean)
       .join(',')
     ```
2. `shared/components/positions/PositionsListTable.vue:97-101` 保持不变（已经按 CSV 渲染 tag），但 cyan 改为基线 indigo（与表内其他字典 tag 调性一致），可单独 issue 处理。

**字典 SSOT**：
- 严格遵循 `dict-ssot-remediation` 规则：找不到 key 时回退原值兜底，不抛异常。
- 字典加载放 `onMounted`，不要每行查询。

**验证**：
- 选 1 个 `region=apac` 的岗位 → 地区列展示"亚太"（字典 label）。
- 选 1 个 `targetMajors=tech,finance` 的岗位 → 主攻方向 2 个 tag："科技","金融"。

---

### FIX-D | 学生端面试时间允许"未确定"（#5b）

**目标**：学生提交"辅导申请 / 阶段更新"时，面试时间字段：
- 增加"面试时间未确定"选项（checkbox 或 radio）
- 勾选时禁用 DatePicker 并清空，提交时 `interviewTime = null`、`interviewTimeUndetermined = true`
- 未勾选时回退强制必填

**变更点**：
1. `osg-frontend/packages/student/src/views/applications/index.vue:317-331` 改造：
   ```vue
   <a-form-item label="面试时间" :required="!progressForm.interviewTimeUndetermined" class="rich-form-field">
     <a-checkbox v-model:checked="progressForm.interviewTimeUndetermined" style="margin-bottom: 6px">
       面试时间未确定
     </a-checkbox>
     <DatePicker
       id="update-interview-time"
       v-model:value="progressForm.interviewTime"
       :disabled="progressForm.interviewTimeUndetermined"
       show-time format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DDTHH:mm"
       style="width: 100%"
     />
   </a-form-item>
   ```
2. `progressForm` 默认值新增 `interviewTimeUndetermined: false`。
3. submit handler 中：
   ```ts
   if (progressForm.interviewTimeUndetermined) progressForm.interviewTime = null
   ```
4. 后端 `OsgJobApplication` / `OsgCoaching` 已有 `interview_time` 列（可空），无需 schema 改动；只在 service 写入时允许 null + 在 listByLeadMentor 返回时把 `interviewTime=null` 透传给前端。
5. 班主任端"求职总览"列表 `面试时间` 列在 null 时显示 `待定`（不显示 `-`），便于运营识别。

**验证**：
- 学生勾选"未确定"提交 → 数据库 `interview_time IS NULL`。
- 班主任端列表对应行显示 `待定`。
- 班主任端"面试时间"筛选区间不命中该行（保持原 range 语义）。

---

### FIX-E | 导师端求职总览精简（#6 + #7）

**目标**：
1. 删除 `<InterviewCalendar>`。
2. 筛选区只保留"面试状态"单个 select。
3. 列表列固定为 5 列：学员 / 公司 / 岗位 / 面试状态 / 面试时间。
4. 列表数据继续走 `/api/mentor/job-overview/list`（已按 mentor_id 过滤，无需后端改动）。

**变更点**：`osg-frontend/packages/mentor/src/views/job-overview/index.vue`

1. **删除日历**：line 17 `<InterviewCalendar :events="allCalendarEvents" @event-click="openCalendarHighlight" />` 整段删除；同步删除 `allCalendarEvents` computed、`openCalendarHighlight` handler、`InterviewCalendar` import 与对应 sass。

2. **精简筛选区**：line 26-57，仅保留：
   ```vue
   <a-select v-model:value="selectedStatus" placeholder="全部面试状态" allow-clear style="width: 180px">
     <a-select-option value="new">新申请</a-select-option>
     <a-select-option value="coaching">面试中</a-select-option>
     <a-select-option value="completed">已完成</a-select-option>
     <a-select-option value="cancelled">已取消</a-select-option>
   </a-select>
   ```
   删除：搜索输入、公司 select、搜索按钮。`applySearch` 改为 watch `selectedStatus` 自动触发。

3. **重定义列**：line 491-498
   ```ts
   const jobColumns = [
     { title: '学员', key: 'student', dataIndex: 'studentName' },
     { title: '公司', key: 'company', dataIndex: 'company' },
     { title: '岗位', key: 'position', dataIndex: 'position' },
     { title: '面试状态', key: 'stage', dataIndex: 'interviewStage', width: 120 },
     { title: '面试时间', key: 'interviewTime', dataIndex: 'interviewTime', width: 160 },
   ]
   ```
   删除 `coachingStatus` 列、`actions` 列（含确认按钮 / 详情按钮）、`CompanyPositionCell` 用法 — 改为 `company` 直出公司名、`position` 直出岗位名。
   `面试时间` 为 null 时显示 `待定`（与 FIX-D 对齐）。

4. **删除/隐藏不再用到的副作用**：`confirmJob` / `openJobDetail` / `closeJobDetail` / `selectedRow` / `loadStudentDetailRecords` / 详情弹窗模板与 styles — 如不再有入口可全删（同步删除测试 spec）。
   ⚠️ 若产品后续仍想保留"查看详情"入口，只删 actions 列；该决策由用户确认后再选择 strict mode。
   **本计划默认 strict 模式：5 列 + 无操作列。**

5. **标题描述**：line 7 `description="查看我辅导学员的求职进度"` 改为 `查看分配给我的学员求职进度`，明确"分配给我"语义。

**测试**：
- `mentor` 包 `__tests__/job-overview*.spec.ts` 全部更新或删除。
- E2E：`mentor` 用户登录 → 进 Job Overview → 断言无日历 dom、表头精确 5 列、所有行 mentorId == 当前登录 userId。

---

### FIX-F | 后端 mentor 列表显式按 mentorId 过滤（防御性）

**当前**：`OsgMentorJobOverviewController:51` `listByMentor(query, SecurityUtils.getUserId())` 已传 userId；但需确认 service 内部 SQL 真的有 `WHERE mentor_id = #{userId}` 等价条件，避免依赖前端筛。

**任务**：
1. 跑测试用例 `OsgMentorJobOverviewControllerTest`，覆盖"查 A 用户登录态时不返回 B 用户辅导学员"。
2. 如缺，补一条 mock 用户切换 + 断言 rows 严格按 mentorId 收口。

---

## 2. 优先级与排期

| 优先级 | Ticket | 端 | 工时估 | 依赖 |
|---|---|---|---|---|
| P0 | FIX-E | mentor | 2h | — |
| P0 | FIX-D | student + 后端透传 | 1.5h | — |
| P0 | FIX-B | lead-mentor | 0.5h | — |
| P1 | FIX-C | lead-mentor + shared | 1h | 字典 osg_region / osg_major_direction 已存在 |
| P1 | FIX-A | lead-mentor + 后端 | 3h | 需后端 service 重构 |
| P2 | FIX-F | 后端测试补强 | 0.5h | FIX-E 后做 |

合计：~8.5h。

---

## 3. 验收清单

- [ ] FIX-A：admin 与 lead-mentor 同 positionId 字段全等（写自动化对比单测 1 条）
- [ ] FIX-B：班主任端左菜单出现"学员中心"独立分组，"学员列表"在其下
- [ ] FIX-C：岗位列表地区显示字典 label；主攻方向多 tag 显示字典 label
- [ ] FIX-D：学生端勾选"面试时间未确定" → 提交成功、DB `interview_time IS NULL`、班主任端列表显示"待定"
- [ ] FIX-E：导师端 Job Overview 无日历、筛选只剩 1 个状态 select、表头精确 5 列
- [ ] FIX-F：后端 mentor 列表测试覆盖跨用户隔离

---

## 4. 不在本计划范围

- 班主任端"模拟应聘管理"等其他菜单项
- 岗位字典治理升级（osg_region 全量补数据等运维动作）
- 导师端"查看详情"入口的产品归属决策（strict 模式默认删除）

---

## 5. 修改历史

| 日期 | 修订人 | 变更说明 |
|---|---|---|
| 2026-05-10 | claude | 初版 |

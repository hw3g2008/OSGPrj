# 助教端 课程记录 双主 Tab + 申报入口 补齐方案（产品确认版）

> **日期**: 2026-04-23
> **状态**: 待评审（未进入实施）
> **关联上一版计划**: [`docs/plans/2026-04-23-assistant-class-records-antd-alignment-plan.md`](./2026-04-23-assistant-class-records-antd-alignment-plan.md)（Ant Design 对齐，已实施完成）
> **产品确认源**: [`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-design.md`](./five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-design.md) + [`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`](./five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md)
> **原型真源**: `osg-spec-docs/source/prototype/assistant.html` L1457-1648（mine tab）+ L1536-1648（managed tab）
> **视觉对照**: `osg-spec-docs/source/prototype/lead-mentor.html`（班主任端原型，与助教端同结构）

---

## 一、背景

### 1.1 上一版成果

上一版 `2026-04-23-assistant-class-records-antd-alignment-plan.md` 已完成：

- 整页升级 Ant Design Vue 4（PageHeader / a-card / a-table / a-tabs 等）
- 筛选 5 项对齐（搜索 / 辅导类型 / 课程内容 / 申报人 / 时间范围）
- 11 列表格 + 详情 Modal
- 状态子 Tab（全部 / 待审核 / 已通过 / 已驳回）
- localStorage 持久化
- 4 统计卡片 + 流程 Banner

### 1.2 上一版留下的缺口

当时标为「V1 不实现（偏离 #1）」的两项：

1. PageHeader 右侧「+ 上报课程记录」按钮 — **原型有，V1 省略**
2. 「我的申报 / 我管理的学员」双主 Tab — **原型有，V1 省略**

### 1.3 本方案触发点

用户核对原型后明确：

1. 要求补齐双主 Tab 与上报入口，与班主任端原型视觉 1:1
2. 质疑后端是否支持「我的申报」区分

经核查 `docs/plans/five-end-course-flow/2026-03-27-*` 五端流转设计（产品已确认）与现有代码：

- **助教是合法申报人**（Decision Lock 3）— `POST /assistant/class-records` 接口已存在
- **申报人 ID 已写入 `mentor_id` 字段**（`OsgClassRecordController.createAssistantRecord` @L188）
- **申报人角色已写入 `course_source` 字段**（`OsgClassRecordServiceImpl.createAssistantClassRecord` @L94，设为 `'assistant'`）
- **现有字段已完整支撑双主 Tab 语义，不需 schema 变更**

### 1.4 与上一版的关系

- 本方案是上一版的续作，**仅补齐上一版定义为「V1 不实现」的两项**
- 不重写上一版任何落地成果
- 上一版 CR-1 至 CR-44 的任务状态保持不变
- 本方案新任务统一编号为 **DR-1 至 DR-N**（Dual tab + Report）

---

## 二、业务语义锁定

### 2.1 五端职责口径（引自设计稿 §5）

| 端 | 分配导师 | 审批课程记录 | 申报课程记录 |
|---|:---:|:---:|:---:|
| 学生端 | ❌ | ❌ | ❌ |
| 导师端 | ❌ | ❌ | ✅ 主提交 |
| **助教端** | ❌ | ❌ | ✅ 补录 |
| 班主任端 | ✅ | ❌ | ✅ 补录 |
| 后台端 | ✅ | ✅ 唯一审批 | — |

**助教端与班主任端在课程记录页上的区别**：零。两端在此页上的功能完全对等，差异只在「分配导师」页面（不在本页范围）。

### 2.2 申报流转链路（引自设计稿 §4.2 + 实施计划 Decision Lock 3）

```
导师/班主任/助教 提交课程记录
    ↓ POST /api/mentor/class-records（导师主入口）
    ↓ POST /lead-mentor/class-records（班主任补录）
    ↓ POST /assistant/class-records（助教补录）  ← 本方案关注
        ↓
    后台审核（PUT /admin/report/{id}/approve|reject）
        ↓
    学生端可见（仅 status=approved）
```

### 2.3 助教端角色定位

**允许**（V1 实施）：

- 作为「独立补录人」提交课程记录（不伪装为原导师署名，Decision Lock 3）
- 查看自身提交的课程记录（→ 我的申报 Tab）
- 查看辅导范围内所有学员的课程记录（→ 我管理的学员 Tab）

**禁止**（本方案明确排除）：

- 分配导师（班主任/后台专属）
- 审批课程记录（admin 专属）
- 跨辅导范围查看其他助教的数据

### 2.4 双主 Tab 业务含义

| Tab | 业务含义 | 后端查询条件 | Tab Badge |
|-----|----------|-------------|-----------|
| **我的申报** | 当前助教作为独立补录人提交的课程记录 | `mentor_id = currentUserId AND course_source = 'assistant'` | `stats.mineCount` |
| **我管理的学员** | 当前助教辅导范围内所有学员的课程记录（不区分是谁提交） | `student_id IN (SELECT student_id FROM osg_student WHERE assistant_id = currentUserId)` | `stats.managedCount` |

**默认 Tab**：`managed`（我管理的学员）— 与上一版单视图语义一致，避免老用户切换体验突变。

**Tab 切换行为**：驱动后端请求（`scope=mine|managed`），**不在前端对同一数据集本地过滤**。与上一版状态子 Tab 行为一致。

### 2.5 关键字段语义表

| 字段 | 来源 | 取值 | 作用 |
|------|------|------|------|
| `mentor_id` | `OsgClassRecord.mentor_id` | 申报人 userId（无论角色） | 识别「谁提交的」 |
| `course_source` | `OsgClassRecord.course_source` | `'mentor'` / `'clerk'` / `'assistant'` | 识别申报人角色 |
| `student.assistant_id` | `OsgStudent.assistant_id` | 助教 userId | 识别「学员的辅导助教」 |
| `status` | `OsgClassRecord.status` | `'pending'` / `'approved'` / `'rejected'` | 审核状态 |

**「我的申报」为什么带上 `course_source = 'assistant'` 约束**：
防止同一助教账号以其他角色（如 mentor）提交的记录混入。确保 mine tab 严格对应「助教补录链」，与 Decision Lock 3 一致。

---

## 三、数据契约

### 3.1 后端接口契约

#### 3.1.1 `GET /assistant/class-records/list`

**新增参数**：

| 参数 | 类型 | 必填 | 取值 | 含义 |
|------|------|:---:|------|------|
| `scope` | string | ❌ | `mine` / `managed` / 省略 | 视角过滤 |

**语义**：

- `scope=mine`：返回当前助教作为申报人（`mentor_id = currentUserId AND course_source = 'assistant'`）的记录
- `scope=managed`（默认）：返回辅导范围内所有记录（现有 `filterAssistantOwnedRows` 逻辑保持不变）
- 省略 `scope`：与 `managed` 等价（向后兼容）

**其他参数保持不变**：`keyword` / `courseType` / `classStatus` / `courseSource` / `tab`（状态 tab） / `classDateStart` / `classDateEnd` / `pageNum` / `pageSize`

#### 3.1.2 `GET /assistant/class-records/stats`

**新增参数**：同 list（`scope`）

**响应结构调整**：

```json
{
  "code": 200,
  "data": {
    "totalCount": 0,
    "pendingCount": 0,
    "approvedCount": 0,
    "rejectedCount": 0,
    "pendingSettlementAmount": 0,
    "flowSteps": [...],

    // === 本方案新增 ===
    "mineCount": 0,
    "managedCount": 0
  }
}
```

**语义**：

- `mineCount` / `managedCount`：**不受 `scope` 参数影响**，始终返回两个视角的总记录数（用于 Tab Badge 稳定展示）
- `totalCount` / `pendingCount` / `approvedCount` / `rejectedCount` / `pendingSettlementAmount`：**受 `scope` 参数影响**，对应当前 Tab 的统计
- `flowSteps`：不受 `scope` 影响，保持现有返回

**兼容说明**：未传 `scope` 时，4 个 count 字段等价于 `scope=managed` 时的结果，保证老调用方不破坏。

#### 3.1.3 `POST /assistant/class-records`

**不变**。现有接口签名与字段：

```json
{
  "studentId": 0,
  "courseType": "string",
  "classStatus": "string",
  "classDate": "YYYY-MM-DD",
  "durationHours": 0.0,
  "courseFee": 0.0,
  "teachingContent": "string",
  "mentorFeedback": "string",
  "comments": "string"
}
```

后端自动注入 `mentorId / mentorName / createBy / updateBy / courseSource='assistant'`。

### 3.2 前端类型扩展

**`packages/shared/src/api/admin/classRecord.ts`**（基础类型）：

```typescript
// ClassRecordFilters 扩展
export interface ClassRecordFilters {
  // ...existing...
  scope?: 'mine' | 'managed'  // ← 新增
}

// ClassRecordStats 扩展
export interface ClassRecordStats {
  // ...existing...
  mineCount?: number       // ← 新增，可选以兼容 admin 端
  managedCount?: number    // ← 新增，可选以兼容 admin 端
}
```

**`packages/shared/src/api/assistantClassRecords.ts`**：

- `AssistantClassRecordFilters` 自动继承 `scope` 字段（`= ClassRecordFilters`）
- `AssistantClassRecordStats` 自动继承新 count 字段
- `AssistantClassRecordCreatePayload` 保持不变
- `createAssistantClassRecord` 函数已存在，不改动

### 3.3 不改 DB Schema 的确认

**严格遵守**实施计划 `2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md` §Decision Locks 第 5 节：

> 本轮默认不做数据库 schema 变更
> `osg_class_record`：本轮继续使用现有 `status / classStatus / rate`，不新增字段

**本方案不新增任何字段、不修改任何表结构**。所有业务能力通过现有字段组合表达：

- `mentor_id` + `course_source='assistant'` → 识别助教申报
- `student.assistant_id` → 识别辅导归属

---

## 四、后端改造清单

### DR-B1：Controller 参数扩展

**文件**：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantClassRecordController.java`

- `list` 方法加 `@RequestParam(value = "scope", required = false) String scope` 参数
- `stats` 方法加同名参数
- 两处参数透传到 Service 层

### DR-B2：Service 接口扩展

**文件**：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`

- `selectAssistantClassRecordList` 签名追加 `String scope` 参数
- `selectAssistantClassRecordStats` 签名追加 `String scope` 参数
- 新增私有方法 `filterByScope(List<OsgClassRecord>, String scope, Long assistantUserId)`：
  - `scope='mine'`：过滤 `row.mentorId == assistantUserId && 'assistant'.equals(row.courseSource)`
  - `scope='managed'` 或 null：保持 `filterAssistantOwnedRows` 原逻辑
- 保留旧方法签名（无 scope 参数），内部委托为 `scope=null`，避免破坏其他调用方

### DR-B3：Stats 双 count 计算

**文件**：同 B2

- `selectAssistantClassRecordStats` 在过滤后计算时，**额外计算两个独立集合**：
  - `mineCount`：基于 `filterByScope(..., 'mine', assistantUserId).size()`
  - `managedCount`：基于 `filterAssistantOwnedRows(..., assistantUserId).size()`
- 两个 count 不受 `scope` / `tab` 参数影响（独立计算），保证 Tab Badge 稳定
- 原有 `totalCount / pendingCount / approvedCount / rejectedCount / pendingSettlementAmount` 仍基于「当前 scope 过滤后的集合」计算，与 list 一致
- 新增 2 字段到返回 Map：`result.put("mineCount", ...)`, `result.put("managedCount", ...)`

### DR-B4：单元测试补齐

**文件**：`ruoyi-system/src/test/java/.../OsgClassRecordServiceImplTest.java`（若不存在则新建）

- `test_selectAssistantClassRecordList_scope_mine_filters_by_mentor_id_and_course_source`
- `test_selectAssistantClassRecordList_scope_managed_keeps_ownership_logic`
- `test_selectAssistantClassRecordList_scope_null_equals_managed`
- `test_selectAssistantClassRecordStats_returns_mine_count_and_managed_count`
- `test_selectAssistantClassRecordStats_mine_count_unaffected_by_scope_param`

---

## 五、前端改造清单

### DR-F1：类型扩展

**文件**：`osg-frontend/packages/shared/src/api/admin/classRecord.ts`

- `ClassRecordFilters` 加 `scope?: 'mine' | 'managed'`
- `ClassRecordStats` 加可选 `mineCount?: number` / `managedCount?: number`

### DR-F2：PageHeader 补「+ 上报课程记录」按钮

**文件**：`osg-frontend/packages/assistant/src/views/class-records/index.vue`

- PageHeader 使用 `actions` slot：

```vue
<PageHeader
  title="课程记录"
  subtitle="Class Records"
  description="查看和上报课程记录（包括我的申报和我管理的学员）"
>
  <template #actions>
    <a-button type="primary" @click="openReportModal()">
      <template #icon><PlusOutlined /></template>
      上报课程记录
    </a-button>
  </template>
</PageHeader>
```

- `description` 文案更新为原型口径 `查看和上报课程记录（包括我的申报和我管理的学员）`（替换上一版 CR-1 的 `查看我管理学员的课程记录、审核状态和反馈摘要`）
- 先确认 `PageHeader.vue` 已支持 `actions` slot（已核查：其他助教页面如 `students/index.vue` 已使用）

### DR-F3：双主 Tab 组件

**文件**：同 F2

- 在 PageHeader 与 stats 卡片之间插入主 Tab：

```vue
<a-tabs v-model:activeKey="activeScope" type="card" class="scope-tabs" @change="onScopeChange">
  <a-tab-pane key="mine">
    <template #tab>
      <UserOutlined /> 我的申报
      <a-badge :count="stats?.mineCount ?? 0" :number-style="{ backgroundColor: '#1D4ED8' }" />
    </template>
  </a-tab-pane>
  <a-tab-pane key="managed">
    <template #tab>
      <TeamOutlined /> 我管理的学员
      <a-badge :count="stats?.managedCount ?? 0" :number-style="{ backgroundColor: '#64748B' }" />
    </template>
  </a-tab-pane>
</a-tabs>
```

- 默认 `activeScope.value = 'managed'`
- `onScopeChange` 触发后：重置 `pagination.current = 1` → 调 `loadRecords()` + `loadStats()` → `persistState()`

### DR-F4：请求参数注入 scope

**文件**：同 F2

- `loadRecords` / `loadStats` 内构造 params 时追加 `scope: activeScope.value`
- 扩展 `FilterState`（或独立 `scopeState`）—— 保持 filter 与 scope 分离：
  - filters 含：keyword / courseType / classStatus / courseSource / classDateRange（已存在）
  - activeScope 独立 ref：`ref<'mine' | 'managed'>('managed')`
- 与子 Tab（`activeTab`）独立：`scope` 与 `tab` 组合使用（先 scope 过滤，再 tab 状态过滤，均在后端完成）

### DR-F5：localStorage 持久化扩展

**文件**：同 F2

- `persistState` 保存 key 扩展：`{ filters, pagination.current, activeTab, activeScope }`
- `restoreState` 恢复时兼容旧数据（无 `activeScope` 时默认 `'managed'`）

### DR-F6：上报入口事件

**文件**：同 F2

- 新增响应式 `reportModalVisible = ref(false)`
- 新增方法 `openReportModal()`：`reportModalVisible.value = true`
- 引入上报 Modal 组件（见第六章）并绑定 v-model

### DR-F7：上报成功回调

**文件**：同 F2

- Modal emit `submitted` 事件后：
  1. 关闭 Modal
  2. **主 Tab 保持不动**（新记录同时出现在「我的申报」∩「我管理的学员」，A ⊆ B 关系，用户当前在哪都能看见）
  3. **子 Tab 智能切换**：若当前 `activeTab ∈ {'approved', 'rejected'}`，切到 `'pending'`；若为 `'all'` / `'pending'` 则保持
  4. `pagination.current = 1`
  5. 调 `loadRecords()` + `loadStats()` + `persistState()`
  6. `message.success('课程记录已提交，等待后台审核')`

### DR-F8：测试更新

**文件**：`osg-frontend/packages/assistant/src/__tests__/class-records.spec.ts`

保持 source string 匹配模式，新增断言分组 **DR-1 至 DR-N**：

- DR-1：import `PlusOutlined / UserOutlined / TeamOutlined`
- DR-2：模板含 `@click="openReportModal"`
- DR-3：模板含 `<a-tabs v-model:activeKey="activeScope"`
- DR-4：模板含 `key="mine"` 和 `key="managed"`
- DR-5：模板含「我的申报」和「我管理的学员」文案
- DR-6：script 含 `activeScope = ref` 和默认值 `'managed'`
- DR-7：script 含 `scope: activeScope.value` 传参
- DR-8：script 含上报 Modal 的 v-model 绑定
- DR-9：防回归 — 模板**不含**审批按钮相关文本（`审批 / 通过 / 驳回` 操作按钮），保证助教端 UI 不误做审批角色

---

## 六、上报 Modal 契约

### 6.1 组件位置

**新建文件**：`osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue`

**参考蓝本**：`osg-frontend/packages/lead-mentor/src/views/teaching/class-records/LeadMentorClassReportFlowModal.vue`

**关键差异**：

- 使用 Ant Design Vue（`a-modal` / `a-form` / `a-select` / `a-date-picker` / `a-input-number` / `a-textarea`），不复用 lead-mentor 的原生 HTML 风格（与助教端本轮 AntDv 改造保持一致）
- 接口调用 `createAssistantClassRecord` 而非 lead-mentor 的 `createLeadMentorClassRecord`

### 6.2 组件 Props / Emits

```typescript
// Props
interface Props {
  open: boolean  // v-model:open
}

// Emits
interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void  // 提交成功后通知父组件
}
```

### 6.3 表单字段契约

| 字段 | 必填 | 类型 | 组件 | 数据源 |
|------|:---:|------|------|--------|
| `studentId` | ✅ | number | `a-select` 远程加载 | `getAssistantStudents` / 复用助教端学员 API |
| `courseType` | ✅ | string | `a-select` | 固定 `[岗位辅导 / 模拟应聘]` |
| `classStatus`（课程内容） | ✅ | string | `a-select` | 固定 7 项（沿用上一版 CR-9 选项） |
| `classDate` | ✅ | string `YYYY-MM-DD` | `a-date-picker` | 用户选择 |
| `durationHours` | ✅ | number | `a-input-number` | min=0.5, max=8, step=0.5 |
| `courseFee` | ❌ | number | `a-input-number` | min=0, 可留空由后端计算 |
| `teachingContent` | ❌ | string | `a-textarea` | 最多 500 字 |
| `mentorFeedback` | ❌ | string | `a-textarea` | 最多 500 字 |
| `comments` | ❌ | string | `a-textarea` | 最多 200 字 |

### 6.4 提交流程

1. 前端校验通过
2. 调 `createAssistantClassRecord(payload)` → POST `/assistant/class-records`
3. 成功：
   - `message.success('课程记录已提交，等待后台审核')`
   - emit `submitted`
   - emit `update:open` false（关闭）
4. 失败：
   - 403 `没有权限` → `message.error` + 不关闭
   - 400 `学员无权限补录` → `message.error` + 不关闭（提示只能给辅导范围内学员补录）
   - 其他 → `message.error(错误信息)` + 不关闭

### 6.5 学员下拉数据源策略

**方案**：复用现有助教端「我管理的学员」API（`/assistant/students` 或同等口径，具体路径待实施阶段核查 `assistantStudents.ts`）

**兜底**：若无现成 API，使用 `/lead-mentor/class-records/students-options` 或同等的助教上下文端点（实施阶段第 1 步确认）

**不允许**：跨范围选择（UI 层不做限制是允许的，后端 `requireAssistantOwnedStudent` 会兜底拦截）

### 6.6 测试文件

**新建**：`osg-frontend/packages/assistant/src/__tests__/assistant-class-report-flow-modal.spec.ts`

- source string 匹配模式
- 断言表单 9 个字段都存在
- 断言 submit 函数调用 `createAssistantClassRecord`
- 断言成功后 emit `submitted`

---

## 七、测试追加清单

### 7.1 后端单元测试

见 §DR-B4。

### 7.2 后端契约测试（curl）

**文件**：`bin/assistant-api-smoke.sh`（若不存在则追加）

- `GET /assistant/class-records/list?scope=mine` — 断言返回 200 且结果集内所有 row 的 `mentorId == currentUserId`
- `GET /assistant/class-records/list?scope=managed` — 断言包含 mine 子集
- `GET /assistant/class-records/stats?scope=mine` — 断言 `mineCount > 0` 且 `managedCount >= mineCount`
- `POST /assistant/class-records` — 提交一条 → 立即 GET mine 断言新记录出现

### 7.3 前端单元测试（source string）

见 §DR-F8 + §6.6。

### 7.4 Playwright E2E（助教端）

**新建**：`osg-frontend/packages/assistant/tests/e2e/class-records-dual-tab.spec.ts`（目录不存在则创建）

场景：

1. 登录 `test_asst@osg.local` / `admin123`
2. 进入「课程记录」页
3. 断言默认 Tab 是「我管理的学员」
4. 切到「我的申报」Tab → 断言 URL 未变 + 表格数据发生刷新
5. 点「+ 上报课程记录」→ 填表 → 提交
6. 断言成功 toast + 主 Tab 保持用户原选择 + 若子 Tab 原为 approved/rejected 则已切到 pending（否则保持）
7. 断言新记录出现在表格

---

## 八、不改动项（Decision Locks 继承）

以下事项**严格不动**，引用五端流转实施计划 §Decision Locks：

1. **Schema 变更**：不新增 `osg_class_record.reporter_user_id` 或任何字段（Decision Lock 5）
2. **审批接口**：不新增助教端审批能力，审批严格归 `/admin/report/*`（Decision Lock 3）
3. **分配导师**：不新增助教端分配导师能力（Workstream E 已明确）
4. **状态字段**：`status / classStatus / rate` 语义不改（Decision Lock 5）
5. **学生端可见规则**：课程记录仅 `status=approved` 对学生可见，本方案不触碰（Decision Lock 3）
6. **carrier route**：助教端复用 `/api/mentor/*` 读取 job/practice 数据的现状不改（Decision Lock 4）
7. **上一版任务**：上一版计划 CR-1 至 CR-44 的实施结果保持原样，不重做

---

## 九、偏离声明

### 偏离 #11：`mine` Tab 仅展示 `course_source='assistant'` 子集

**原型**：未明确是否仅显示本人补录，还是所有「本人涉及」的记录

**实施**：仅显示 `mentor_id = currentUserId AND course_source = 'assistant'`

**理由**：

- 符合 Decision Lock 3「按独立补录人身份入链，不伪装为原导师记录」
- 避免与导师端数据混淆（若同一账号兼任助教与导师）
- 保持与班主任端同构（班主任的 mine 也是 `course_source='clerk'` 子集）

**影响**：若存在历史 `course_source` 为空但 `mentor_id` 是助教的数据，不会出现在 mine Tab — 属于数据清理问题，不是功能缺陷。

**边界说明**：若同一账号既是助教又是导师（角色并存），走 `POST /api/mentor/class-records` 提交的记录（`course_source='mentor'`）**不会**进入 mine Tab（因 course_source 不匹配），但会进入 managed Tab（因学员仍归助教管）。这是符合语义的行为：mine 只展示「以助教身份补录」的记录，不涵盖「以导师身份主提交」的记录。

### 偏离 #12：上报 Modal 使用 Ant Design Vue，不复用 lead-mentor 原生 HTML

**原型**：lead-mentor 与 assistant 原型视觉一致，均为原生 HTML Modal

**实施**：助教端 Modal 改用 AntDv 组件

**理由**：

- 助教端本轮全页已完成 AntDv 升级，Modal 应保持技术栈一致
- 避免引入原生 CSS / 自制组件带来维护负担
- 视觉上 AntDv Modal 与原生 Modal 功能对等，用户体验无明显差异

**影响**：样式细节可能略异（如圆角、阴影），不影响功能。

### 偏离 #13：上报 Modal 成功后保持主 Tab + 智能切子 Tab

**原型**：未明确成功后行为

**实施**：提交成功后
- **主 Tab**：保持用户当前所在（不强制切换）
- **子 Tab**：若当前为 `'approved'` / `'rejected'`，切到 `'pending'`；否则保持
- **分页**：重置到第 1 页

**理由**：
- 新记录同时出现在「我的申报」与「我管理的学员」（数学关系：A ⊆ B，因 `requireAssistantOwnedStudent` 强制校验），主 Tab 保持即可看见新记录
- 新记录状态必为 `pending`，子 Tab 切到 pending 确保可见
- 最小干扰用户当前上下文（筛选条件、主 Tab 选择）
- 更符合「我管理的学员」视角更常用的产品预期

### 偏离 #14（继承自上一版 #9）：搜索框仅按 `mentor_name` / `student_name` 匹配

后端 `OsgClassRecordMapper.xml` L117-122 `keyword` 仅按姓名匹配，ID 搜索不生效。placeholder 保留原型文案 `搜索学员姓名/ID`，不在本方案修复。待后续后端补字段后自然启用。

### 偏离 #15：默认 Tab 为 `managed`，与原型和班主任端不一致

**原型**：`osg-spec-docs/source/prototype/assistant.html:L1465` — mine Tab 是激活状态（`style="background:var(--primary);color:#fff"` 表明默认选中）

**班主任端实现**：`osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue` — `activeScope = ref<ScopeKey>('mine')` 默认 mine

**本方案实施**：默认 `activeScope.value = 'managed'`

**理由**：
- 上一版方案是单视图（语义等价于 managed），沿用 managed 作为默认让老用户无感迁移
- 已用户确认（讨论中明确选定）

**影响**：首次打开页面进入「我管理的学员」而非「我的申报」，与原型默认选中态有偏差。不影响功能，仅影响首次进入的默认视角。

---

## 十、验收标准

当以下条件**同时成立**，本方案才算实施完成：

### 10.1 视觉验收

- [ ] 助教端课程记录页 header 与班主任端原型 1:1（标题 + 描述 + 右上「+ 上报课程记录」按钮）
- [ ] 双主 Tab「我的申报」/「我管理的学员」在 PageHeader 下方展示，与原型 L1469 结构一致
- [ ] Tab Badge 稳定显示数值，切 Tab 后 Badge 不消失

### 10.2 功能验收

- [ ] 默认打开页面，Tab 为「我管理的学员」
- [ ] 切换到「我的申报」后，表格只显示当前助教作为申报人的记录
- [ ] 刷新页面后，Tab 选择被持久化
- [ ] 点击「+ 上报课程记录」，弹出 Modal，表单 9 字段齐全
- [ ] 提交 Modal 后，成功提示 + 主 Tab 保持不动 + 子 Tab 确保新记录可见（approved/rejected 时切到 pending）+ 新记录出现在列表中

### 10.3 接口验收

- [ ] `GET /assistant/class-records/list?scope=mine` 返回符合条件的记录子集
- [ ] `GET /assistant/class-records/list?scope=managed` 与现状等价
- [ ] `GET /assistant/class-records/list` 不传 scope 时，与 `managed` 等价（向后兼容）
- [ ] `GET /assistant/class-records/stats` 返回 `mineCount` 与 `managedCount` 两个字段
- [ ] `POST /assistant/class-records` 提交后，后端写入 `mentor_id = 当前用户` 与 `course_source = 'assistant'`

### 10.4 边界验收

- [ ] 切换 Tab / 切换子 Tab / 刷新页面过程中，Tab Badge 始终稳定
- [ ] 助教补录只能给辅导范围内学员补录（后端 `requireAssistantOwnedStudent` 拦截）
- [ ] 页面**不出现**审批按钮（防回归断言）

### 10.5 测试验收

- [ ] 后端单元测试 5 个全部通过（§DR-B4）
- [ ] 前端 source string 测试断言 DR-1 至 DR-9 全部通过
- [ ] Playwright E2E 场景 1-7 全部通过
- [ ] `mvn test` 与 `pnpm --filter assistant test` 零失败

---

## 十一、执行顺序

```
Step 0: ✅ 评审本方案 → 用户批准
Step 1: ✅ 后端类型 + 接口扩展（DR-B1 ~ DR-B4）
  1.1 ✅ Controller 加参数
  1.2 ✅ Service 加过滤逻辑
  1.3 ✅ Stats 双 count 计算
  1.4 ✅ 单测补齐 + 跑过 (14 tests, 0 failures)
Step 2: ✅ 前端类型扩展（DR-F1）
  2.1 ✅ classRecord.ts 加 scope / mineCount / managedCount
Step 3: ✅ 上报 Modal 组件（§6）
  3.1 ✅ 新建 AssistantClassReportFlowModal.vue (AntDv 9 字段)
  3.2 ✅ 新建 Modal 测试文件 (6 tests pass)
  3.3 ✅ vue-tsc 编译通过
Step 4: ✅ 主页面集成（DR-F2 ~ DR-F7）
  4.1 ✅ PageHeader 补按钮 + PlusOutlined
  4.2 ✅ 双主 Tab (mine/managed)
  4.3 ✅ 请求参数注入 scope
  4.4 ✅ localStorage 持久化扩展 (activeScope)
  4.5 ✅ Modal 事件绑定 + handleReportSubmitted
Step 5: ✅ 测试更新（DR-F8）
  5.1 ✅ class-records.spec.ts 追加 DR-1~DR-9 断言组
  5.2 ✅ 7 tests pass
Step 6: ✅ 后端契约测试（§7.2）
  6.1 ✅ assistant-api-smoke.sh 新建 (scope/stats 5 场景)
  6.2 🟡 待本地环境跑过
Step 7: ✅ Playwright E2E（§7.4）
  7.1 ✅ 新建 class-records-dual-tab.spec.ts (8 场景)
  7.2 🟡 待本地登录 test_asst 跑过
Step 8: 最终验收
  8.1 逐条对照 §十 验收标准
  8.2 更新上一版计划的偏离 #1 状态为「已补齐」
```

**预计工作量**：4-5 小时（不含评审与本地环境问题排查）

---

## 十二、风险与兜底

| 风险 | 概率 | 影响 | 兜底 |
|------|:---:|------|------|
| 助教学员下拉 API 不存在 | 中 | Modal 无法选学员 | 实施 Step 3 第一步优先确认 API；若真无则先做 placeholder 下拉（只允许手动输入 studentId），并在测试中 mark 为 TODO |
| `mentor_id` 字段未被所有助教补录记录填满（历史数据） | 低 | mine Tab 可能遗漏历史记录 | **本方案不做兜底**。若出现历史数据缺失，作为数据清理专项单独处理。偏离 #11 已声明此边界属于数据清理问题，不影响本方案的功能正确性 |
| `course_source='assistant'` 历史数据不完整 | 低 | mine 数据偏少 | **本方案不做兜底**。同上理由 |
| 上报 Modal 提交后 Tab 切换但表格未刷新 | 中 | 用户体感卡顿 | 强制 `loadRecords` 在 `activeScope` 变更的 nextTick 后执行；加 loading 态覆盖 |
| 前端 `ClassRecordFilters` 字段变更破坏 admin 端 | 低 | admin 页面编译失败 | `scope` / `mineCount` / `managedCount` 都是**可选**字段，admin 端不使用即可，typescript 向后兼容 |

---

## 十三、附录

### 13.1 本方案涉及文件总览

**后端**：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantClassRecordController.java`（修改）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`（修改）
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImplTest.java`（新建或修改）

**前端共享**：

- `osg-frontend/packages/shared/src/api/admin/classRecord.ts`（修改，类型扩展）

**前端助教**：

- `osg-frontend/packages/assistant/src/views/class-records/index.vue`（修改）
- `osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue`（新建）
- `osg-frontend/packages/assistant/src/__tests__/class-records.spec.ts`（修改）
- `osg-frontend/packages/assistant/src/__tests__/assistant-class-report-flow-modal.spec.ts`（新建）
- `osg-frontend/packages/assistant/tests/e2e/class-records-dual-tab.spec.ts`（新建）

**脚本**：

- `bin/assistant-api-smoke.sh`（若存在则追加；若不存在留待后续独立专项补）

### 13.2 不涉及文件

- 任何 DB migration SQL（**严格禁止**）
- admin 端 `OsgClassRecordController` / `OsgReportController`（审批归它，本方案不碰）
- lead-mentor 端 class-records（独立的 Ticket，不在本方案范围）
- student 端课程记录页（无关）

### 13.3 关联链接

- 五端流转设计：`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-design.md`
- 五端流转实施：`docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`
- 上一版 alignment plan：`docs/plans/2026-04-23-assistant-class-records-antd-alignment-plan.md`
- 学员列表对齐 plan（测试风格样板）：`docs/plans/2026-04-22-assistant-student-list-antd-alignment-plan.md`
- 班主任端参考实现：`osg-frontend/packages/lead-mentor/src/views/teaching/class-records/`

---

**END of 方案文档。等待评审反馈后进入实施阶段。**

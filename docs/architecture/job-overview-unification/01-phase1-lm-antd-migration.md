# Phase 1：Lead-Mentor Job-Overview antd 化改造

- **所属 Epic**：`docs/architecture/job-overview-unification/00-epic-overview.md`
- **Phase 编号**：1（第一阶段·前置工程）
- **预计工作量**：3–4h
- **独立性**：✅ 可单窗口独立执行，不依赖其他 Phase
- **状态**：✅ **已完成 2026-04-24**
  - 📉 代码行数：1337 → 1125（-212 / -16%）
  - 🟢 LM 单测：115 passed / 43 test files
  - 📸 浏览器实拍：`e2e-review/lead-mentor/antd-phase1/`（3 Tab 全通过）
  - 📐 行数未达 ~500 目标的原因：保留各 Tab 独立 `<a-table>` + 完整 bodyCell slot，避免在 Phase 3 抽共享组件前引入预耦合

---

## 一、任务目标

把 Lead-Mentor 的 `job-overview` 页面从"1337 行原生 HTML + 自定义 class" 重写为 "~500 行 antd 实现"，以 Assistant 为 SSOT 参考。

**硬约束**：
1. ✅ 业务行为完全等价（pending/coaching/managed 3 Tab + 分配导师 + 确认阶段更新全部保留）
2. ✅ 路由查询参数 `?studentName=...&typeFilter=...&companyName=...&currentStage=...` 兼容不变
3. ✅ LM 115 个单测全部保持绿色（如有 DOM 选择器变更，同步更新测试）
4. ✅ InterviewCalendar 不动（已在 Round 1 完成）
5. ✅ `<LeadMentorJobDetailModal>` / `<LeadMentorAssignMentorModal>` 两个独立 modal 组件保持不变（Phase 1 不抽 modal）

---

## 二、当前 LM 代码画像

### 2.1 文件 + 测试

| 项 | 路径 | 行数 |
|---|---|---|
| 主文件 | `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue` | 1,337 |
| Shell 测试 | `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/__tests__/job-overview-shell.spec.ts` | — |
| Real-flow 测试 | `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/__tests__/job-overview-real-flow.spec.ts` | — |
| 关联 Modal | `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/components/LeadMentorJobDetailModal.vue` | 不动 |
| 关联 Modal | `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/components/LeadMentorAssignMentorModal.vue` | 不动 |

### 2.2 现有结构

```
<template>
├── <div class="page-header">
│     ├── <h1 class="page-title">学员求职总览<span class="page-title-en">Job Overview</span></h1>
│     └── <button class="btn btn-outline">导出</button>
├── <InterviewCalendar :events="calendarEvents" />   ✅ 已 shared
├── <section class="filters">
│     ├── <input class="form-input" v-model="filters.studentName">
│     ├── <select class="form-select" v-model="filters.typeFilter">
│     ├── <select class="form-select" v-model="filters.companyName">
│     ├── <select class="form-select" v-model="filters.currentStage">
│     └── <button class="btn btn-outline">搜索</button>
├── <section class="card">
│     ├── <div class="tabs">
│     │     ├── <button id="lm-job-tab-pending">待分配导师 {{ pending.length }}</button>
│     │     ├── <button id="lm-job-tab-coaching">我辅导的学员 {{ coaching.length }}</button>
│     │     └── <button id="lm-job-tab-managed">我管理的学员 {{ managed.length }}</button>
│     ├── <div id="lm-job-content-pending">
│     │     ├── <div class="panel-banner panel-banner--danger">以下学员申请了辅导...</div>
│     │     └── <table class="table"> ... </table>
│     ├── <div id="lm-job-content-coaching">
│     │     └── <table class="table"> ... </table>
│     └── <div id="lm-job-content-managed">
│           └── <table class="table"> ... </table>
└── <LeadMentorJobDetailModal ... />
    <LeadMentorAssignMentorModal ... />
```

### 2.3 业务函数清单（全部保留）

| 函数 | 作用 | 保留 |
|---|---|---|
| `handleSearch` | 点"搜索"按钮，刷新 3 Tab 数据 | ✅ |
| `handleTypeFilterChange` | 类型筛选下拉切换，同步 activeTab | ✅ |
| `openJobDetail` | 点"查看详情"打开详情 Modal | ✅ |
| `openAssignMentorFromPending` | pending Tab 点"分配导师"打开分配 Modal | ✅ |
| `handleRequestMentorChange` | 详情 Modal 内"请求更换导师"打开分配 Modal | ✅ |
| `handleConfirmAssignMentor` | 分配 Modal 点"确认"提交 API | ✅ |
| `handleAcknowledgeStage` | 点"确认阶段更新" | ✅ |
| `applyRouteFilters` / `syncRouteQuery` | 路由查询参数同步 | ✅ |
| `loadAllScopes` / `loadScope` / `loadCalendar` | 数据加载 | ✅ |
| `toOverviewRow` / `buildJobDetailPreview` / `buildAssignMentorPreview` | 数据适配 | ✅ |

---

## 三、目标结构（按 Assistant 改造）

### 3.1 目标 template 骨架

```vue
<template>
  <div class="osg-page">
    <!-- 页头（本地 PageHeader，Phase 3 再抽 shared） -->
    <PageHeader title="学员求职总览" subtitle="Job Overview" description="查看我辅导和管理的学员求职进度">
      <template #actions>
        <a-button @click="showUpcomingToast">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <!-- 面试日历（Round 1 已抽）-->
    <InterviewCalendar :events="calendarEvents" />

    <!-- 筛选栏 -->
    <div class="filter-row">
      <a-input v-model:value="filters.studentName" placeholder="搜索学员姓名..." allow-clear style="width: 180px;" @press-enter="handleSearch" />
      <a-select v-model:value="filters.typeFilter" placeholder="全部类型" allow-clear style="width: 140px;" @change="handleTypeFilterChange">
        <a-select-option value="coaching">辅导学员</a-select-option>
        <a-select-option value="managed">管理学员</a-select-option>
      </a-select>
      <a-select v-model:value="filters.companyName" placeholder="全部公司" allow-clear style="width: 140px;">
        <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-select v-model:value="filters.currentStage" placeholder="全部状态" allow-clear style="width: 140px;">
        <a-select-option v-for="option in stageOptions" :key="option" :value="option">{{ option }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch">
        <template #icon><SearchOutlined /></template>
        搜索
      </a-button>
    </div>

    <!-- 3 Tab 表格区 -->
    <a-card :bordered="false">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="pending">
          <template #tab>
            <span><AccountClockOutlined /> 待分配导师 <a-badge :count="tabCounts.pending" /></span>
          </template>
          <a-alert type="warning" show-icon message="以下学员申请了辅导，需要您分配导师" style="margin-bottom: 12px;" />
          <a-table
            :columns="pendingColumns"
            :data-source="pendingRows"
            :row-key="(r) => r.applicationId"
            :pagination="false"
            :scroll="{ x: 1100 }"
          >
            <template #bodyCell="{ column, record }">
              <!-- 学员 / 公司岗位 / 阶段 / 面试时间 / 需求导师 / 申请时间 / 操作（分配导师按钮）-->
              ...
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="coaching">
          <template #tab>
            <span><SchoolOutlined /> 我辅导的学员 <a-badge :count="tabCounts.coaching" /></span>
          </template>
          <a-table :columns="coachingColumns" :data-source="coachingRows" ... />
        </a-tab-pane>

        <a-tab-pane key="managed">
          <template #tab>
            <span><UserGroupOutlined /> 我管理的学员 <a-badge :count="tabCounts.managed" /></span>
          </template>
          <a-table :columns="managedColumns" :data-source="managedRows" ... />
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- Modal 不动 -->
    <LeadMentorJobDetailModal
      v-if="isJobDetailModalOpen"
      ...
    />
    <LeadMentorAssignMentorModal
      v-if="isAssignMentorModalOpen"
      ...
    />
  </div>
</template>
```

### 3.2 目标 script 结构

- 保留所有现有 `computed` / `ref` / `reactive` / 业务函数（**零逻辑改动**）
- 仅把 columns 定义出来（3 个：`pendingColumns` / `coachingColumns` / `managedColumns`）
- 删除所有与原生 HTML 耦合的 class 计算（如 `row.stageTone` / `row.statusTone` 改为在 antd `<a-tag :color>` 里直接用 color 值）

### 3.3 目标 style（大幅精简）

- 删除 `.page-header / .page-title / .filters / .card / .tabs / .tab / .table / .panel-banner / .row-highlight / .btn` 等所有自定义 class
- 保留极少量（如 `.filter-row` 的 flex 布局、`.osg-page` 的页面容器）
- antd 默认主题基本够用

---

## 四、改造步骤（严格 10 步）

### Step 0：前置启动

```bash
# 后端确保已启（健康检查）
curl -fsS http://127.0.0.1:28080/actuator/health
# 若未启，在另一个窗口运行 /run-backend-dev

# 启动 LM 前端（3003 端口）
bash bin/run-frontend-dev.sh lead-mentor
curl -s -o /dev/null -w "HTTP: %{http_code}\n" http://localhost:3003/
```

### Step 1：基线快照（浏览器实拍原 LM 页面）

- 登录 LM 账号 → 访问 `/career/job-overview`
- 3 个 Tab 各截图 1 张（存 `e2e-review/lead-mentor/phase1-baseline-{pending,coaching,managed}.png`）
- 记录任一功能完整的"分配导师"操作结果（作为回归基准）

### Step 2：读懂当前代码（不动代码）

- 通读 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue` 1337 行
- 重点关注：
  - `scopeRows.value.{pending,coaching,managed}` 数据结构
  - `pendingRows` / `coachingRows` / `managedRows` 3 个 computed 的输出字段
  - `resolveStageTone` / `resolveStatusTone` / `resolveRowTone` 的 class 返回值
- 核对 Assistant 实现 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/career/job-overview/index.vue` 作为 SSOT 参考

### Step 3：跑基线测试（确认现状全绿）

```bash
pnpm --filter @osg/lead-mentor test 2>&1 | tail -5
```

预期输出：`Tests 115 passed`。若有 fail，先不动，记录下来（它是 pre-existing，本任务不负责修）。

### Step 4：改造 template（一次性完整替换）

用 §3.1 的目标骨架替换现有 template（1337 行文件的 L1-L325）。

**关键映射表**（原生 class → antd 组件）：

| 原生 HTML | antd 等价 |
|---|---|
| `<button class="btn btn-outline">` | `<a-button>` |
| `<button class="btn">` | `<a-button type="primary">` |
| `<button class="btn btn-sm">` | `<a-button size="small">` |
| `<input class="form-input">` | `<a-input v-model:value allow-clear>` |
| `<select class="form-select">` | `<a-select v-model:value>` |
| `<div class="tabs">` + `<button class="tab">` | `<a-tabs v-model:active-key>` + `<a-tab-pane key>` |
| `<table class="table">` + `<thead>` + `<tbody>` | `<a-table :columns :data-source>` |
| `<span class="tag tag--success">` | `<a-tag color="green">` |
| `<span class="tag tag--warning">` | `<a-tag color="orange">` |
| `<span class="tag tag--info">` | `<a-tag color="blue">` |
| `<span class="tag tag--danger">` | `<a-tag color="red">` |
| `<span class="tag tag--muted">` | `<a-tag>` |
| `<div class="panel-banner panel-banner--danger">` | `<a-alert type="warning" show-icon>` |
| `<div class="avatar">` | 保留内联 div，Phase 3 抽成 `<StudentAvatar>` |
| `<span class="tab-count">` | `<a-badge :count>` |
| `<i class="mdi mdi-xxx">` | `@ant-design/icons-vue` 对应图标（见下表） |

**mdi 图标 → antd icons 映射表**：

| mdi | antd |
|---|---|
| `mdi-export` | `ExportOutlined` |
| `mdi-magnify` | `SearchOutlined` |
| `mdi-account-clock` | `ClockCircleOutlined`（pending tab）|
| `mdi-school` | `BookOutlined` 或保留 `mdi-school`|
| `mdi-account-group` | `TeamOutlined` |
| `mdi-alert-circle` | `ExclamationCircleOutlined` |
| `mdi-account-plus` | `UserAddOutlined` |

### Step 5：改造 columns 定义（script 部分）

新增 3 个 columns 定义（参考 Assistant L177-194）：

```ts
const pendingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: '公司/岗位', dataIndex: 'company', key: 'company', width: 200 },
  { title: '阶段', dataIndex: 'stage', key: 'stage', width: 120 },
  { title: '面试时间', dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: '需求导师', dataIndex: 'mentorDemand', key: 'mentorDemand', width: 120 },
  { title: '申请时间', dataIndex: 'appliedAt', key: 'appliedAt', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 140, fixed: 'right' as const },
]

const coachingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: '公司/岗位', dataIndex: 'company', key: 'company', width: 200 },
  { title: '阶段', dataIndex: 'stage', key: 'stage', width: 120 },
  { title: '面试时间', dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: '辅导状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const },
]

const managedColumns = [
  ...coachingColumns.slice(0, 4),
  { title: '辅导状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 140 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const },
]
```

### Step 6：清理 style（删除所有不再引用的 class）

- 删除 `.page-header / .page-title / .page-title-en / .page-sub / .filters / .card / .card-header / .card-body / .tabs / .tab / .tab-count / .tab-count--managed / .table / .table-wrap / .panel-banner / .panel-banner--danger / .row-highlight / .btn / .btn-outline / .btn-sm / .tag / .tag--success / .tag--warning / .tag--info / .tag--danger / .tag--muted / .company-name / .student-cell / .student-name / .student-meta / .accent / .table-stack / .form-input / .form-select`
- 保留：`.osg-page`（页面容器）、`.filter-row`（筛选栏 flex）、`.avatar`（Phase 3 会抽）、`.detail-label / .detail-value`（Modal 用）

**删除时小心**：如果有 class 也被 Modal 组件引用（比如 `.detail-label`），保留。

### Step 7：修复测试

跑 `pnpm --filter @osg/lead-mentor test` 看失败清单。典型修复：

| 失败原因 | 修复 |
|---|---|
| 选择器 `#lm-job-tab-pending` 不存在 | antd `<a-tabs>` 生成的 class 不同，改用 `wrapper.findAll('.ant-tabs-tab').at(0)` 或测试通过文字 "待分配导师" 定位 |
| 选择器 `.row-highlight--warning` 不存在 | antd `<a-table>` 的 row 没这个 class。若原测试验证"是否高亮"，改为通过 `rowClassName` prop 返回的 class 验证；若只是找 row，用 `wrapper.find('tbody tr')` |
| 选择器 `.btn` 不存在 | antd `<a-button>` 渲染为 `.ant-btn`，测试里用 `wrapper.findAll('button').find(b => b.text().includes('分配导师'))` |
| `[data-surface-trigger="modal-assign-mentor"]` 不存在 | antd 按钮上加 `data-surface-trigger` 属性：`<a-button data-surface-trigger="modal-assign-mentor">` |

**禁止**：不要删测试用例。用例是业务意图的验证，只能更新 DOM 选择器。

### Step 8：视觉回归验证

```bash
# 重启 LM 前端（应用新代码）
bash bin/run-frontend-dev.sh lead-mentor
```

- 浏览器 MCP 重新访问 `/career/job-overview`
- 3 个 Tab 各截 1 张图（存 `e2e-review/lead-mentor/phase1-after-{pending,coaching,managed}.png`）
- 对比 baseline：
  - 3 个 Tab 标题 + 计数 visible ✅
  - 表格列完整 ✅
  - pending Tab 警示条 visible ✅
  - 分配导师按钮点击 → AssignMentorModal 打开 ✅
  - 详情按钮点击 → JobDetailModal 打开 ✅
  - 路由查询参数 `?studentName=...` 同步正常 ✅

### Step 9：最终测试

```bash
pnpm --filter @osg/lead-mentor test 2>&1 | tail -5
# 预期：Tests 115 passed（若有调整，至少保持 baseline 数量）

# 其他端不受影响验证
pnpm --filter @osg/assistant test 2>&1 | grep Tests
pnpm --filter @osg/mentor test 2>&1 | grep Tests
```

### Step 10：更新 Epic 文档

在 `00-epic-overview.md` 的"阶段性交付物清单"中把 Phase 1 标记 ✅，并记录实际行数（如 `1337 → 487 行`）。

---

## 五、业务行为等价性验证清单

逐项在浏览器 MCP 里验证：

- [ ] 三个 Tab 切换正常
- [ ] pending Tab 显示"以下学员申请了辅导"警示条
- [ ] pending Tab 的"分配导师"按钮 → 打开 `<LeadMentorAssignMentorModal>`
- [ ] 分配 Modal 选择导师 → 确认 → API 调用 → Tab 切到 coaching + 列表刷新
- [ ] coaching/managed Tab 点"查看详情" → 打开 `<LeadMentorJobDetailModal>`
- [ ] 详情 Modal 内"请求更换导师" → 关闭详情 + 打开分配 Modal
- [ ] "确认阶段更新"按钮点击 → 本地 `stageUpdated` 变 false + 提示成功
- [ ] 筛选：输入学员名 + 点搜索 → 3 Tab 数据刷新 + URL 同步 `?studentName=...`
- [ ] 筛选：类型下拉选"辅导学员" → activeTab 自动切 coaching
- [ ] 导出按钮 → `showUpcomingToast()` 提示

---

## 六、风险与应对

| 风险 | 概率 | 应对 |
|---|---|---|
| antd `<a-tabs>` 的切换动画影响 `v-show` 已渲染的内容 | 低 | 用 `forceRender` prop 让所有 Tab 预渲染 |
| 测试里用 `querySelector('#lm-job-tab-pending')` 大量出现 | 中 | 统一改为 `wrapper.findAll('.ant-tabs-tab-btn').at(0)` 或通过文字定位 |
| `<a-table>` 的 row-class-name 接口与原 `:class="row.rowTone"` 用法不同 | 低 | 用 `:row-class-name="(r) => r.rowTone"` 传函数 |
| `data-surface-id` / `data-surface-trigger` 属性在 antd 组件上丢失 | 中 | antd 组件支持透传 attrs，直接在 `<a-button data-xxx>` 上写即可 |
| Modal 组件仍使用旧的 `data-surface-id="modal-assign-mentor"` 选择器 | 低 | Modal 组件本身不改，保留其内部 data-surface-id |

---

## 七、不做什么（Phase 1 范围外）

| 不做 | 归属 |
|---|---|
| 把 `<StudentAvatar>` / `<CoachingStatusTag>` 抽到 shared | Phase 3 |
| 把 `<LeadMentorJobDetailModal>` 重写为 antd | 不改 Modal 组件（Phase 4 或更晚） |
| 把 `<LeadMentorAssignMentorModal>` 重写为 antd | 同上 |
| 修复 LM 已有 pre-existing 测试 fail | 不归本任务 |
| 改 LM 的其他页面（schedule / students 等） | 其他任务 |
| 修改 shared API 或后端 | 本任务零 API / 零后端改动 |

---

## 八、启动 Prompt（给另一个 Cascade 窗口）

```
请执行 Phase 1：Lead-Mentor Job-Overview antd 化。

完整任务书在：docs/architecture/job-overview-unification/01-phase1-lm-antd-migration.md
总体 Epic：docs/architecture/job-overview-unification/00-epic-overview.md

强制要求：
1. 先完整读任务书再动手
2. 代码修改前必须征求用户确认（遵守 user rules）
3. 严格按 §四 的 10 步顺序推进，每完成一步更新 todo_list
4. Step 1 基线截图必做（视觉回归基准）
5. Step 9 最终测试必须 115 passed（或维持 baseline 数量）
6. 不做 §七 列出的任何范围外内容

前置条件：
- 后端已启（http://127.0.0.1:28080/actuator/health 返回 UP）
- LM 前端启动 `bash bin/run-frontend-dev.sh lead-mentor`
- 有可登录的 LM 测试账号

产出：
1. 重写后的 index.vue（~500 行 antd 实现）
2. 更新的测试（选择器适配 antd，用例不删不弱化）
3. 视觉回归对比报告（baseline 截图 vs 改造后截图）
4. 00-epic-overview.md 的 Phase 1 状态更新为 ✅
```

---

## 九、成功标准

- [ ] LM `job-overview/index.vue` ≤ 550 行
- [ ] `pnpm --filter @osg/lead-mentor test` 通过数 ≥ 115（baseline 不降）
- [ ] 3 Tab + 分配导师 + 确认阶段 + 详情 Modal + 路由查询 全部功能等价
- [ ] Assistant + Mentor 测试不受影响
- [ ] Epic 文档的 Phase 1 标记 ✅
- [ ] 视觉回归截图存于 `e2e-review/lead-mentor/`

完成后用户可直接进入 Phase 2（Mentor antd 化）或 Phase 3（抽 shared 组件）。

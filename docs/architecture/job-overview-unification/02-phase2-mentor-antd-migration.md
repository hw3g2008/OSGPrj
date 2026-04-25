# Phase 2：Mentor Job-Overview antd 化改造

- **所属 Epic**：`docs/architecture/job-overview-unification/00-epic-overview.md`
- **Phase 编号**：2（第二阶段·前置工程）
- **预计工作量**：4-5h（相比 Phase 1 增加 Modal antd 化 scope）
- **独立性**：✅ 可单窗口独立执行，不依赖其他 Phase
- **状态**：⏳ **待执行（任务书 2026-04-24 草稿）**
- **Scope 决策**：**扩大 scope** — 页面外壳 + 4 统计卡 + 筛选栏 + 表格 + **内嵌 Modal** 全部 antd 化

---

## 一、任务目标

把 Mentor 的 `job-overview` 页面从"741 行原生 HTML + 自定义 class + 内嵌 Modal" 重写为 "antd 实现（含 Modal）"，以 Assistant 为 SSOT 参考。

**硬约束**：
1. ✅ 业务行为完全等价（4 统计卡 + "确认收徒" + "查看详情" + Modal 内全部内容保留）
2. ✅ InterviewCalendar 不动（已在 Round 1 完成，当前 working tree 已接入）
3. ✅ `job-overview.behavior.spec.ts` 保持 6 passed（DOM 选择器变更要同步更新测试）
4. ✅ 其他 5 个历史 failed 测试文件（nav-badge/page-interactions/page-smoke 等）**保持 5 failed 基线不变**（不在本 Phase scope 内）
5. ✅ 其他端（admin/assistant/student/lead-mentor）零回归
6. ⚠️ **Modal antd 化不影响** 业务字段和 API 契约（只换 UI 外壳）

---

## 二、当前 Mentor 代码画像

### 2.1 文件 + 测试

| 文件 | 角色 | 行数 | 状态 |
|---|---|---|---|
| `osg-frontend/packages/mentor/src/views/job-overview/index.vue` | 页面主文件 | **741** | working tree 已接入 InterviewCalendar（未 commit）|
| `osg-frontend/packages/mentor/src/__tests__/job-overview.behavior.spec.ts` | 行为测试 | 改动 +3/-144 | **6 passed / 6** |
| `osg-frontend/packages/shared/src/api/jobOverview.ts` 等 5 个 | shared 配套 | +18/-7 | 需一起 commit（Round 1 扫尾）|

### 2.2 当前 template 结构（741 行）

```
<div id="page-job-overview">
├── <div class="page-header">            # L3-12, 10 行
│     ├── <h1 class="page-title">学员求职总览</h1>
│     └── <button class="btn btn-outline">导出</button>
├── <InterviewCalendar />                # L14, 共享组件（不动）
├── <div class="stats-grid">             # L16-21, 6 行，4 统计卡
│     ├── 新分配 {{ stats.newCount }}   (红色)
│     ├── 待进行 {{ stats.pendingCount }} (蓝色)
│     ├── 已完成 {{ stats.completedCount }} (绿色)
│     └── 已取消 {{ stats.cancelledCount }} (灰色)
├── <div class="filter-bar">             # L23-46, 24 行
│     ├── <input class="form-input" placeholder="搜索学员姓名...">
│     ├── <select class="form-select" v-model="selectedCompany">
│     ├── <select class="form-select" v-model="selectedStatus">
│     └── <button class="btn btn-outline">搜索</button>
├── <div class="card">                   # L48-116, 69 行
│     └── <table class="table">          # 6 列：学员/公司岗位/阶段/面试时间/辅导状态/操作
│           └── 操作列：
│               ├── v-if new → <button class="btn btn-confirm">确认</button>      ★ 确认收徒业务
│               ├── v-else if coaching → <button class="btn btn-text">查看详情</button>
│               └── v-else → '--'
└── <div v-if="selectedRow" class="modal job-detail-modal">  # L118-274, 157 行
    ├── 遮罩 <button class="job-detail-backdrop">
    ├── <section class="hero-card">                # 学员 + 岗位
    │     ├── 学员信息（avatar + name + id + 班主任）
    │     └── 申请岗位（company + position + 招聘周期）
    ├── <section>求职进度（timeline）               # 5 步 step
    │     └── <div class="interview-card">面试时间+倒计时
    ├── <section>辅导信息                          # 4 张紫色小卡
    │     └── 辅导状态 / 分配导师 / 已上课时 / 申请时间
    ├── <section>课程记录（最近3条）                # 列表 + 查看全部切换
    │     └── v-for record in recentRecords/fullRecords
    ├── <section>学员备注                          # 单段文字
    └── <div class="modal-footer">关闭
```

### 2.3 业务函数清单（全部保留，零逻辑改动）

| 函数 | 作用 | 保留 |
|---|---|---|
| `handleExport` | 点"导出"按钮 | ✅ |
| `applySearch` | 点"搜索" / Enter 触发筛选 | ✅ |
| `confirmJob(row)` | 点"确认"收徒业务 ★ | ✅ |
| `openJobDetail(row)` / `closeJobDetail` | 打开/关闭详情 Modal | ✅ |
| `openCalendarHighlight` | 点日历事件跳到详情 | ✅ |
| `loadStudentDetailRecords(studentId)` | 加载课程记录 | ✅ |
| `formatInterviewTime` / `formatApplyTime` / `formatRecordDate` / `buildCountdownText` | 日期格式化 | ✅ |
| `normalizeJobOverview` / `normalizeDetailRecord` / `createJobDetailPreview` | 数据适配 | ✅ |
| `contentLabel` / `gradeLabel` / `gradeTone` / `recordTone` | 标签/颜色辅助 | ✅ |

---

## 三、目标结构（antd 化，含 Modal）

### 3.1 目标 template 骨架

```vue
<template>
  <a-config-provider :auto-insert-space-in-button="false">
    <div class="osg-page">
      <!-- 页头 -->
      <div class="page-header">
        <div>
          <h1 class="page-title">学员求职总览 <span class="page-title-en">Job Overview</span></h1>
          <p class="page-sub">查看我辅导学员的求职进度</p>
        </div>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </div>

      <!-- 面试日历（Round 1 已抽）-->
      <InterviewCalendar :events="allCalendarEvents" @event-click="openCalendarHighlight" />

      <!-- 4 统计卡 → a-row + 4 a-card -->
      <a-row :gutter="16" class="stats-row">
        <a-col :span="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="新分配" :value="stats.newCount" :value-style="{ color: '#EF4444' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="待进行" :value="stats.pendingCount" :value-style="{ color: '#3B82F6' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="已完成" :value="stats.completedCount" :value-style="{ color: '#22C55E' }" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="已取消" :value="stats.cancelledCount" :value-style="{ color: '#94A3B8' }" />
          </a-card>
        </a-col>
      </a-row>

      <!-- 筛选栏 -->
      <div class="filter-row">
        <a-input
          v-model:value="draftKeyword"
          placeholder="搜索学员姓名..."
          allow-clear
          style="width: 180px;"
          @press-enter="applySearch"
        />
        <a-select v-model:value="selectedCompany" placeholder="全部公司" allow-clear style="width: 140px;">
          <a-select-option v-for="c in companies" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="selectedStatus" placeholder="全部状态" allow-clear style="width: 140px;">
          <a-select-option value="new">新申请</a-select-option>
          <a-select-option value="coaching">面试中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
        </a-select>
        <a-button type="primary" @click="applySearch">
          <template #icon><SearchOutlined /></template>
          搜索
        </a-button>
      </div>

      <!-- 表格 -->
      <a-card :bordered="false">
        <a-table
          :columns="jobColumns"
          :data-source="filteredRows"
          :row-key="(r) => r.id"
          :pagination="false"
          :row-class-name="(record) => rowClass(record)"
        >
          <template #bodyCell="{ column, record }">
            <!-- student / company / stage / time / coaching-status / actions -->
            <template v-if="column.key === 'student'">
              <a-avatar :style="{ background: avatarColor(record) }">{{ record.studentName?.[0] || '?' }}</a-avatar>
              <span class="student-name">{{ record.studentName }}</span>
              <div class="text-muted">ID: {{ record.studentId }}</div>
            </template>
            <template v-else-if="column.key === 'company'">
              <div>{{ record.company }}</div>
              <div class="text-muted">{{ record.position }} · {{ record.location }}</div>
            </template>
            <template v-else-if="column.key === 'stage'">
              <a-tag :color="stageColor(record)">{{ record.interviewStage || '-' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'time'">
              <span v-if="record.interviewTime">{{ formatInterviewTime(record.interviewTime) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-else-if="column.key === 'coachingStatus'">
              <a-tag v-if="record.coachingStatus === 'new'" color="red">
                <template #icon><BellOutlined /></template> 新申请
              </a-tag>
              <a-tag v-else-if="record.coachingStatus === 'coaching'" color="purple">
                <template #icon><BookOutlined /></template> 辅导中
              </a-tag>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button v-if="record.coachingStatus === 'new'" type="primary" size="small" @click="confirmJob(record)">
                确认
              </a-button>
              <a-button v-else-if="record.coachingStatus === 'coaching'" type="link" size="small" @click="openJobDetail(record)">
                查看详情
              </a-button>
              <span v-else class="text-muted">--</span>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- 详情 Modal -->
      <a-modal
        :open="selectedRow !== null"
        title="学员求职详情"
        width="720"
        :footer="null"
        @cancel="closeJobDetail"
      >
        <template v-if="selectedRow">
          <!-- 学员+岗位 a-descriptions -->
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="学员">
              <a-avatar>{{ jobDetailPreview.studentName?.[0] }}</a-avatar>
              <span>{{ jobDetailPreview.studentName }}</span>
              <div class="text-muted">ID: {{ jobDetailPreview.studentId }} · 班主任: {{ jobDetailPreview.leadMentorName }}</div>
            </a-descriptions-item>
            <a-descriptions-item label="申请岗位">
              <div>{{ jobDetailPreview.companyName }}</div>
              <div class="text-muted">{{ jobDetailPreview.positionName }}</div>
              <div class="text-muted">招聘周期: {{ jobDetailPreview.recruitmentCycle }}</div>
            </a-descriptions-item>
          </a-descriptions>

          <!-- 求职进度 a-steps -->
          <div class="section-title"><ClockCircleOutlined /> 求职进度</div>
          <a-steps :current="2" size="small">
            <a-step title="已投递" description="01/05" />
            <a-step title="HireVue" description="01/10" />
            <a-step title="First Round" description="当前" />
            <a-step title="Final" />
            <a-step title="Offer" />
          </a-steps>
          <a-alert
            type="warning"
            :message="`面试时间: ${jobDetailPreview.interviewTime}`"
            :description="jobDetailPreview.countdownText"
            show-icon
            style="margin-top: 12px;"
          />

          <!-- 辅导信息 4 张 a-card -->
          <div class="section-title"><BookOutlined /> 辅导信息</div>
          <a-row :gutter="12">
            <a-col :span="6"><a-card size="small" class="coaching-card">
              <a-statistic title="辅导状态" :value="jobDetailPreview.coachingStatus" />
            </a-card></a-col>
            <a-col :span="6"><a-card size="small" class="coaching-card">
              <a-statistic title="分配导师" :value="jobDetailPreview.mentorName" />
            </a-card></a-col>
            <a-col :span="6"><a-card size="small" class="coaching-card">
              <a-statistic title="已上课时" :value="jobDetailPreview.lessonHours" />
            </a-card></a-col>
            <a-col :span="6"><a-card size="small" class="coaching-card">
              <a-statistic title="申请时间" :value="jobDetailPreview.applyTime" />
            </a-card></a-col>
          </a-row>

          <!-- 课程记录 a-list -->
          <div class="section-head">
            <div class="section-title"><BookOpenOutlined /> 课程记录 (最近3条)</div>
            <a-button type="link" size="small" @click="showAllRecords = true">查看全部 →</a-button>
          </div>
          <a-list
            :data-source="showAllRecords ? fullRecords : recentRecords"
            :loading="studentDetailRecordsLoading"
            :locale="{ emptyText: '暂无课程记录' }"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <span>{{ item.date }}</span>
                <a-tag :color="item.tagTone">{{ item.label }}</a-tag>
                <span>{{ item.hours }}</span>
                <span>{{ item.summary }}</span>
                <a-tag :color="item.tagTone">{{ item.grade }}</a-tag>
              </a-list-item>
            </template>
          </a-list>

          <!-- 备注 -->
          <div class="section-title"><FormOutlined /> 学员备注</div>
          <a-typography-paragraph>{{ jobDetailPreview.notes }}</a-typography-paragraph>
        </template>
      </a-modal>
    </div>
  </a-config-provider>
</template>
```

### 3.2 目标 script 结构

- **保留所有** 现有 `computed` / `ref` / 业务函数（零逻辑改动）
- **新增** `jobColumns` 常量定义表格列结构
- **替换** `stageClass(row)` → `stageColor(record)` 返回 antd `<a-tag :color>` 的色值（warning→orange, success→green, danger→red）
- **删除** 旧 `rowClass` 里跟原生 class 耦合的计算（改用 antd rowClassName）

### 3.3 目标 style（大幅精简）

**删除**：
- `.btn / .btn-outline / .btn-text / .btn-confirm`（antd a-button 覆盖）
- `.form-input / .form-select`（antd a-input/a-select 覆盖）
- `.table / tr / td / .tag / .pulse-tag / .coaching-tag`（antd a-table/a-tag 覆盖）
- `.stats-grid / .stat-card / .stat-value / .stat-label`（antd a-row/a-card/a-statistic 覆盖）
- `.modal / .job-detail-shell / .job-detail-header / .job-detail-body / .job-detail-footer / .modal-close / .modal-section`（antd a-modal 覆盖）
- `.hero-card / .hero-block / .hero-avatar / .hero-value / .hero-meta`（a-descriptions 覆盖）
- `.timeline / .timeline-step / .timeline-badge / .timeline-line / .timeline-copy`（a-steps 覆盖）
- `.interview-card`（a-alert 覆盖）
- `.coaching-grid / .coaching-card`（a-row + a-card + a-statistic 覆盖）
- `.records / .record-item / .record-date / .record-tag / .record-hours / .record-summary / .record-grade`（a-list 覆盖）
- `.full-records / .full-records-title`（合并到同一 a-list 的 showAllRecords 切换）

**保留极少量**：
- `.page-header / .page-title / .page-title-en / .page-sub`（和其他页面统一样式，不改）
- `.osg-page`（页面外层容器）
- `.filter-row` 的 flex 布局（与 Phase 1 LM 一致）
- `.section-title`（Modal 内小节标题，antd 没有直接对应）

**预计行数**：741 → **~500 行**（-241 / -32%；若延续 Phase 1 保留 bodyCell slot 完整定义的策略，可能 ~550）

---

## 四、改造步骤（严格 10 步）

### Step 0：前置启动（已完成基线）

- ✅ 后端 UP：`http://127.0.0.1:28080`（远程 DB `47.94.213.128:23306/ry-vue`）
- ✅ Mentor 前端 UP：`http://localhost:3002`（Background ID: 591）
- ✅ 测试账号：`e2e-test-mentor@test.com / Osg@2026`
- ✅ 基线截图：`e2e-review/mentor/antd-phase2-baseline/01-list.png + 02-modal.png`
- ✅ 基线测试：`job-overview.behavior.spec.ts` 6/6 passed

### Step 1：确认测试环境配置（复用 Phase 1 经验）

检查 Mentor 是否已有 `setup.ts`：

```bash
ls osg-frontend/packages/mentor/src/__tests__/setup.ts 2>/dev/null || echo "需要新建"
```

若不存在，创建 `osg-frontend/packages/mentor/src/__tests__/setup.ts`（复用 LM 套路）：

```ts
import { vi } from 'vitest'

// jsdom polyfills for antd components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ResizeObserverPolyfill {
  observe() {}; unobserve() {}; disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverPolyfill as any

class IntersectionObserverPolyfill {
  observe() {}; unobserve() {}; disconnect() {}
  takeRecords() { return [] }
  root = null; rootMargin = ''; thresholds = []
}
globalThis.IntersectionObserver = IntersectionObserverPolyfill as any
```

并在 `vitest.config.ts` 加 `setupFiles: ['./src/__tests__/setup.ts']`。

### Step 2：antd 化 template（按 §3.1 骨架）

按 §3.1 的 template 骨架改写 `index.vue`：
1. 外层包 `<a-config-provider :auto-insert-space-in-button="false">`
2. 页头保留（不变）
3. InterviewCalendar 不动
4. 4 统计卡 → `<a-row> + 4 <a-col> + <a-card> + <a-statistic>`
5. 筛选栏 → `<a-input> + <a-select> + <a-button>`
6. 表格 → `<a-table>` + `jobColumns` + `bodyCell` slot
7. Modal → `<a-modal>` + `<a-descriptions>` + `<a-steps>` + `<a-alert>` + 4 `<a-card>` + `<a-list>` + `<a-typography>`

### Step 3：antd 化 script

1. 新增 `jobColumns` 数组定义表格列
2. 替换 `stageClass` → `stageColor`（返回 antd 色值）
3. 保留其他业务函数零改动

### Step 4：删除废弃 style

按 §3.3 清单删除旧 class 定义，保留 `.osg-page / .page-header / .page-title / .page-title-en / .page-sub / .filter-row / .section-title / .section-head`。

### Step 5：跑 job-overview.behavior.spec.ts 并修复

```bash
cd osg-frontend/packages/mentor && npx vitest run src/__tests__/job-overview.behavior.spec.ts
```

预计失败项（参考 Phase 1 LM 修复套路）：
- **选择器从旧 class → antd class**：
  - `.form-input` → `input[placeholder="搜索学员姓名..."]`
  - `.form-select` → `.ant-select-selector`
  - `.table` → `.ant-table`
  - `tr/td` → `.ant-table-row / .ant-table-cell`
  - `.tag` → `.ant-tag`
  - `.btn-confirm` → `button[type="button"]` + text '确认'（注意 antd 两字按钮空格问题 → 已由 ConfigProvider 禁用）
  - `.modal` → `.ant-modal`
  - `.stat-value` → `.ant-statistic-content-value`
- **mock antd 改用 importActual**：
  ```ts
  vi.mock('ant-design-vue', async () => {
    const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue')
    return { ...actual, message: messageMocks }
  })
  ```
- **mount 时 `app.use(Antd)` 全局注册**

### Step 6：跑全量 Mentor 测试确认其他 fail 不受影响

```bash
cd osg-frontend/packages/mentor && npx vitest run
```

**硬约束**：5 个历史 failed 测试文件（nav-badge/page-interactions/page-smoke 等）保持 5 failed 基线（不新增/不减少 failed 测试，除了本 Phase scope 内的 `job-overview.behavior.spec.ts` 必须绿）。

### Step 7：浏览器视觉回归（2 张对比）

```
登录 http://localhost:3002 → e2e-test-mentor@test.com / Osg@2026
访问 /job-overview → 截图 antd 后的 list
点击第 1 行"查看详情" → 截图 antd 后的 Modal
```

对比 `e2e-review/mentor/antd-phase2-baseline/` 下的 01-list.png / 02-modal.png。

**视觉验收标准**：
- ✅ 4 统计卡数值保持一致（0/2/0/0）
- ✅ 表格 2 行数据保持一致
- ✅ 日历不变
- ✅ Modal 打开/关闭正常
- ✅ timeline 5 步正确
- ✅ 辅导信息 4 卡正确
- ✅ 课程记录空态正确
- ⚠️ 视觉风格会从"渐变色 + 自定义 tag"变为"antd 标准 tag"——属于预期改动，非回归

截图存到 `e2e-review/mentor/antd-phase2/01-list.png + 02-modal.png`。

### Step 8：其他端无回归（pnpm workspace 隔离）

Mentor 的改动只在 `packages/mentor/**`，pnpm workspace 保证不影响 admin/assistant/student/lead-mentor。

**快速冒烟**：
```bash
cd osg-frontend/packages/assistant && npx vitest run src/__tests__/student-list.spec.ts 2>&1 | tail -5
cd osg-frontend/packages/lead-mentor && npx vitest run src/__tests__/job-overview-shell.spec.ts 2>&1 | tail -5
```

### Step 9：Round 1 扫尾单独 commit（可选推荐）

在开始 Phase 2 实施前（或 Phase 2 commit 之前），**分离** Round 1 扫尾 commit（保持 commit 历史清洁）：

```bash
git add osg-frontend/packages/mentor/src/views/job-overview/index.vue \
        osg-frontend/packages/mentor/src/__tests__/job-overview.behavior.spec.ts \
        osg-frontend/packages/shared/src/api/jobOverview.ts \
        osg-frontend/packages/shared/src/types/interviewCalendar.ts \
        osg-frontend/packages/shared/src/api/assistantCareer.ts \
        osg-frontend/packages/shared/src/api/assistantClassRecords.ts \
        osg-frontend/packages/shared/src/api/admin/classRecord.ts
git commit -m "refactor(mentor): Round 1 扫尾 - 接入 @osg/shared/InterviewCalendar"
```

注意：这一步由**用户批准后才执行**。Phase 2 实施过程中 `index.vue` 会再次大改，本 commit 只是"Round 1 接入"的前置基线。

### Step 10：Phase 2 commit 存档 + 更新 Epic 文档

```bash
git add osg-frontend/packages/mentor/src/views/job-overview/index.vue \
        osg-frontend/packages/mentor/src/__tests__/setup.ts \
        osg-frontend/packages/mentor/vitest.config.ts \
        osg-frontend/packages/mentor/src/__tests__/job-overview.behavior.spec.ts \
        docs/architecture/job-overview-unification/00-epic-overview.md \
        docs/architecture/job-overview-unification/02-phase2-mentor-antd-migration.md \
        e2e-review/mentor/antd-phase2/
git commit -m "feat(mentor): Phase 2 - job-overview antd 化（含 Modal）

业务改动：
- Mentor job-overview/index.vue 从 741 → ~500 行
- 4 统计卡 → a-row + a-card + a-statistic
- 筛选栏 → a-input + a-select + a-button
- 表格 → a-table + columns + bodyCell slot
- 详情 Modal → a-modal + a-descriptions + a-steps + a-alert + a-card + a-list + a-typography
- 保留业务：确认收徒 / 查看详情 / 日历跳转

验证结果：
- job-overview.behavior.spec.ts 6/6 passed
- 其他 5 历史 failed 测试基线不变
- 2 张浏览器实拍对比通过"
```

更新 `00-epic-overview.md`：
- 顶部状态 → Phase 2 ✅
- 交付物清单 Phase 2 部分标记完成

---

## 五、风险与缓冲

| 风险 | 缓冲方案 |
|---|---|
| `confirmJob` 业务在 antd `<a-button>` 上触发异常 | 先做 E2E 点击实测，若失败回退该按钮到原生 `<button>` |
| 内嵌 Modal 改 `<a-modal>` 影响 `data-surface-id` 锚点（`modal-job-detail`）| 给 `<a-modal>` 加 `:root-class-name="'job-detail-modal'"` 保留锚点，或改用 wrapClassName |
| timeline 硬编码 5 步（01/05 / 01/10 / 当前 / Final / Offer）| Phase 2 保留硬编码，等 Phase 3 抽 shared 时再做动态化 |
| `<a-alert>` 的 message + description 组合在 jsdom 下渲染差异 | 已有 polyfill 覆盖，若还出问题则用 `<a-card><div></div></a-card>` 降级 |
| 课程记录 `<a-list>` 在加载中 spinner 不显示 | `:loading="studentDetailRecordsLoading"` 对应 antd API 正确，若失效则回退为 v-if/v-else 空态 |

---

## 六、DoD（完成定义）

1. ✅ `osg-frontend/packages/mentor/src/views/job-overview/index.vue` 全部 antd 化（含 Modal）
2. ✅ `job-overview.behavior.spec.ts` 6 passed
3. ✅ 其他历史 5 failed 测试基线不变
4. ✅ 浏览器 2 张实拍对比通过（`e2e-review/mentor/antd-phase2/`）
5. ✅ 其他端无回归（Assistant/Lead-Mentor 关键 spec 快速冒烟绿）
6. ✅ Epic overview 文档 Phase 2 标 ✅
7. ✅ Commit 进入 main 分支

---

## 七、后续衔接（Phase 3 预热）

Phase 2 完成后，**Assistant（450 行）/ Lead-Mentor（1125 行）/ Mentor（~500 行）** 3 端 job-overview 全部 antd 化。Phase 3 可开始抽以下 shared 组件：

| 组件 | 3 端共性 | Phase 3 抽取 |
|---|---|---|
| `<PageHeader>` | 3 端都有（title/subtitle/description/actions）| ✅ |
| `<JobOverviewTable>` | 3 端都有 `<a-table>` + 学员/公司/阶段 等列 | ✅ |
| `<JobOverviewFilter>` | 3 端筛选栏结构一致 | ✅ |
| `<JobDetailModal>`（简化版）| Mentor 和 LM 都有 Modal，Assistant 是内嵌 card | ⚠️ 评估后决定 |
| `useJobOverviewData()` | 3 端加载/筛选/stats 逻辑 | ✅ composable |

**Phase 2 保留的 bodyCell slot 完整定义在 Phase 3 会自然迁移到 shared 组件的 slot 传递机制**。

---

## 八、参考

- Phase 1 任务书：`docs/architecture/job-overview-unification/01-phase1-lm-antd-migration.md`
- Phase 1 实施经验：Epic overview §八「Phase 1 → Phase 2 可复用经验」
- 五端账号密码 Memory：`OSG 五端测试账号密码（2026-04-24 v2）`
- SSOT 参考：`osg-frontend/packages/assistant/src/views/career/job-overview/index.vue`（Assistant antd 版）

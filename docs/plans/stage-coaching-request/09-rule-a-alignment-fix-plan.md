# RULE-A 求职辅导主链 4 端 UI 对齐修复方案

- **日期**：2026-05-11
- **作用**：把现有 4 端实施与产品需求 RULE-A 全量对齐
- **状态**：📝 方案文档，**未动代码**，待用户逐项确认后再分批执行
- **关联**：
  - `00-overview.md` / `01-student-applications.md` / `02-job-overview-coaching-anchor-revision.md`
  - `06-requirement-index-by-end.md` Step 1 / Step 2 / Step 3 / Step 4 完成态
  - `08-master-bug-spec.md` §2 RULE-A 已定主链规则

---

## 1. 背景与对照口径

### 1.1 修复对象（4 端 + 1 端联动）

| 端 | 页面 | 主入口 |
|---|---|---|
| **学生端** | 我的求职 | `osg-frontend/packages/student/src/views/applications/index.vue` |
| **班主任端** | 学员求职总览 | `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue` |
| **助教端** | 学员求职总览 | `osg-frontend/packages/assistant/src/views/career/job-overview/index.vue` |
| **导师端** | 学员求职总览 | `osg-frontend/packages/mentor/src/views/job-overview/index.vue` |

### 1.2 输入需求（用户 2026-05-11 文字版）

> **学生端我的求职**：
> - 列表字段：岗位名称、公司、行业、岗位分类、地区、招聘周期、投递时间、求职状态
> - 操作区只有一个「申请辅导」按钮
> - 申请辅导可以申请 7 个面试阶段：HireVue/Online Test、Screening Call、First Round、Second Round、Third Round and Beyond、Case study Round、Superday/AC
> - 申请辅导后岗位行可展开显示辅导记录
> - 辅导记录行字段：面试阶段、面试时间、城市、导师、最近评分
> - 操作：查看详情 + 修改（修改只能改面试时间和公司面试官）
>
> **班主任端学员求职总览** 3 栏：
> - 第一栏「我管理的学员」（默认）：面试日历、筛选（公司/面试阶段/面试时间）、列表 9 字段（学生ID/学生姓名/岗位/公司/城市/面试阶段/面试时间/导师/最近评分）、操作查看详情
> - 第二栏「待辅导的学员」：筛选（公司/面试阶段/面试时间/是否上报课消）、列表 8 字段（学生ID/学生姓名/岗位/公司/城市/面试阶段/面试时间/已上报课消数）、操作上报课消
> - 第三栏「待分配导师」：列表 8 字段（学生ID/学生姓名/岗位/公司/城市/面试阶段/面试时间/提交时间）、操作分配导师
>
> **助教端**1 栏「我管理的学员」：面试日历、筛选 3 项、列表 9 字段、操作查看详情
>
> **导师端**1 栏「待辅导的学员」：筛选 4 项（公司/面试阶段/面试时间/是否上报课消）、列表 8 字段、操作上报课消

### 1.3 本文档原则

- **最小修改**：能改前端不动后端、能复用现有字段不新增字段
- **不破坏现状**：班主任端 + 助教端 + 导师端的 coaching 锚点改造已完成（Step 2/3 ✅），本方案不重写已成型部分
- **文档先行**：每一项修改先在本文档列出方案，等用户确认后才动代码

---

## 2. 差异汇总速查表

### 2.1 严重程度分级

| 等级 | 含义 | 推进策略 |
|---|---|---|
| 🔴 **P0** | 阻塞 5 端联动主链起点 | 必修，优先做 |
| 🟠 **P1** | 字段不对齐影响业务可用性 | 必修，按依赖顺序做 |
| 🟡 **P2** | 命名/展示/多余元素不影响主链 | 可推迟，按需调整 |

### 2.2 4 端差异速查表

| 端 | 偏差点 | 等级 | 修复涉及 |
|---|---|---|---|
| 学生端 | 操作列无「申请辅导」按钮，弹窗无打开入口 | 🔴 P0 | 前端 |
| 学生端 | 申请辅导只有 6 个阶段，缺 HireVue 进入辅导主链 | 🔴 P0 | 前端 + 后端阶段枚举 |
| 学生端 | 列表 8 字段全部错位（缺 6 项，多 3 项） | 🟠 P1 | 前端 + 后端字段透出 |
| 学生端 | 展开行缺城市字段 | 🟠 P1 | 前端 |
| 导师端 | 筛选 4 项全缺 | 🟠 P1 | 前端 + 后端筛选参数 |
| 导师端 | 列表缺学生ID 列 | 🟠 P1 | 前端 |
| 班主任端 | 「公司/岗位」合并为一列 | 🟡 P2 | 前端 |
| 助教端 | 「公司/岗位」合并未发生（保持分两列） | ✅ 已对齐 | — |
| 助教端 | KPI 横条多余 | 🟡 P2 | 前端 |
| 助教端 | 导师/最近评分占位 `-` | ⚠ 关联 Step 4 | 后端 F1（已立项 AS-001） |
| 导师端 | 列名「面试状态」应为「面试阶段」 | 🟡 P2 | 前端 |
| 学生端 | 展开行多了公司面试官/已上报课消（需求无） | 🟡 P2（可保留为辅助信息） | — |

---

## 3. 修复方案分项

### 3.1 P0-1 学生端「申请辅导」入口缺失

#### 现状

- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:136-140` 操作列 cell：仅渲染只读的 stage Tag
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:608` `progressModalOpen` 定义为 `ref(false)`
- **全文件没有任何地方设置 `progressModalOpen.value = true`**（grep 验证）
- 弹窗 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:176-187` 标题为「更新状态 & 申请辅导」，但无打开入口
- 主链起点失效：学生根本无法在「我的求职」页发起阶段辅导申请

#### 修复方案

**第 1 步：操作列改为单按钮**

在 `index.vue:681-694` columns 定义中：
- 删除 `{ title: '辅导状态', key: 'coachingStatus' }` / `{ title: '导师', key: 'mentor' }` / `{ title: '课时/反馈', key: 'hoursFeedback' }`（P1 一并处理，见 §3.3）
- 操作列 `width` 调整为 `120`，cell 渲染替换为：

```vue
<template v-else-if="column.key === 'actions'">
  <a-button type="primary" size="small" @click="openApplyCoachingModal(record)">
    申请辅导
  </a-button>
</template>
```

**第 2 步：新增 `openApplyCoachingModal` 函数**

```ts
function openApplyCoachingModal(record: StudentApplicationRecord) {
  selectedApplicationId.value = record.id
  // 重置弹窗表单到默认空值，避免上次输入残留
  progressForm.value = createInitialProgressForm()
  progressModalOpen.value = true
}
```

**第 3 步：弹窗内容裁剪**

- 弹窗标题 `index.vue:178` 由「更新状态 & 申请辅导」改为「申请辅导」
- 移除"更新岗位状态"相关分支（仅保留申请辅导路径）
- 删除/隐藏「mentorHelp」字段（无需让学生选「是否需要导师」，进入此弹窗即视为申请辅导）

#### 涉及文件

- `osg-frontend/packages/student/src/views/applications/index.vue`（仅前端）

#### 验收标准

- 学生端「我的求职」列表每行操作列只显示「申请辅导」按钮
- 点击「申请辅导」打开弹窗，标题为「申请辅导」
- 弹窗里只能选 7 个面试阶段（见 §3.2），不能选 applied/offer/rejected/withdraw
- 提交后调用 `requestStudentApplicationCoaching(applicationId, payload)`，新增一条 `osg_coaching`
- 提交成功后列表的对应 application 行可展开看到新 coaching 记录

#### 工作量

- 前端：~1 人日

---

### 3.2 P0-2 学生端 7 个面试阶段缺失

#### 现状

- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:605` `interviewStages = ['screening', 'first', 'second', 'third', 'case', 'superday']` — **6 个**
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:218` HireVue 走独立分支，需 `mentorHelp === 'yes'` 才触发申请辅导，不在 7 阶段下拉中统一选择
- 后端阶段枚举常量需核对（`OsgCoaching.interviewStage` 字段是否允许 `hirevue`）

#### 修复方案

**第 1 步：合并 hirevue 到 7 阶段**

将 `interviewStages` 改为：

```ts
const interviewStages = ['hirevue', 'screening', 'first', 'second', 'third', 'case', 'superday']
```

**第 2 步：弹窗下拉选项**

`stageDropdownOptions(currentStage)` 函数返回的选项需限定在 7 阶段范围，不能再返回 `applied / offer / rejected / withdraw`（这些是岗位状态，不是面试阶段）。

**第 3 步：HireVue 分支不删除**

需求里 HireVue 是申请辅导的 7 个阶段之一，但当前 hirevue 分支有 VI/OT 链接 + 截止时间 + 上传截图等特殊字段。**保留这些字段作为 HireVue 阶段的扩展信息**，进入辅导申请时一并写入 `requestNote`。

**第 4 步：后端枚举一致性**

- 核对 `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgCoaching.java` 的 `interviewStage` 字段是否限制可选值
- 核对 `OsgClassReportConstants` / `application-extension.yml` 字典中阶段枚举
- 如有 enum 校验，需新增 `hirevue` 选项

#### 涉及文件

- `osg-frontend/packages/student/src/views/applications/index.vue`
- 可能涉及 `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`（如有阶段白名单校验）
- 可能涉及 `osg_dict_data` 或硬编码字典

#### 验收标准

- 学生端申请辅导弹窗下拉里能选 7 个阶段：
  1. HireVue / Online Test
  2. Screening Call
  3. First Round
  4. Second Round
  5. Third Round and Beyond
  6. Case study Round
  7. Superday / AC
- 选 HireVue 时可填 VI/OT 信息（保留现有 hirevue 分支）
- 选其他 6 阶段时只需填面试时间 + 城市 + 导师数量 + 备注
- 提交后新增 `osg_coaching.interview_stage` 写入对应值
- 各端求职总览的 stageLabel 能正确显示 HireVue 阶段

#### 工作量

- 前端：~0.5 人日
- 后端：~0.5 人日（枚举校验 + 字典）

---

### 3.3 P1-1 学生端列字段全量重构

#### 现状（实际 7 列）

```ts
[
  { title: '公司/岗位', key: 'job' },
  { title: '阶段', key: 'stage' },
  { title: '面试时间', key: 'interviewTime' },
  { title: '辅导状态', key: 'coachingStatus' },
  { title: '导师', key: 'mentor' },
  { title: '课时/反馈', key: 'hoursFeedback' },
  { title: '操作', key: 'actions' }
]
```

#### 需求（8 字段 + 操作）

```ts
[
  { title: '岗位名称', key: 'positionName' },
  { title: '公司', key: 'companyName' },
  { title: '行业', key: 'industry' },
  { title: '岗位分类', key: 'category' },
  { title: '地区', key: 'region' },
  { title: '招聘周期', key: 'recruitmentCycle' },
  { title: '投递时间', key: 'submittedAt' },
  { title: '求职状态', key: 'applicationStatus' },
  { title: '操作', key: 'actions' }
]
```

#### 字段缺口分析（2026-05-11 复核：表字段全部已存在）

`osg_position` 表已经持有所有需求字段，**无需 DDL**（`OsgPosition.java:14/16/32` + `OsgPositionMapper.xml:9/10/18`）。当前缺的只是 `selectStudentApplicationRecords` SQL 没 JOIN select 出来 + Service 没附 dict label。

| 需求字段 | 后端表是否有 | 当前是否透到前端 | 备注 |
|---|---|---|---|
| 岗位名称 | ✅ `app.position_name` | ✅ as `position` | 仅前端 columns 拆出 |
| 公司 | ✅ `app.company_name` | ✅ as `company` | 仅前端 columns 拆出 |
| 行业 | ✅ `osg_position.industry` | ❌ 当前 SQL 只 JOIN 但仅用于派生 `companyType`（`OsgJobApplicationMapper.xml:86-90`） | SQL 加 select + Service 附 industryLabel |
| 岗位分类 | ✅ `osg_position.position_category` | ❌ 未 select | SQL 加 select + dict label |
| 地区 | ✅ `osg_position.region` | ⚠ 目前用 `coalesce(app.city, app.region, '')` 拼为 `location` | 改 select `position_ref.region` 单独输出 regionLabel |
| 招聘周期 | ✅ `osg_position.recruitment_cycle` | ❌ 未 select | SQL 加 select |
| 投递时间 | ✅ `app.submitted_at` | ✅ as `appliedDate` | 改 alias 为 `submittedAt` 或前端复用 |
| 求职状态 | ✅ `app.current_stage` + 业务派生 | ⚠ 当前透为 `bucket / stage / coachingStatus` 三个口径 | 新增 `applicationStatus` 字段，按 5 态映射（见下） |

**「求职状态」5 态定义（按 01 §7.1 + 08 RULE-A 已定）**：

| applicationStatus 枚举 | applicationStatusLabel | 派生规则 |
|---|---|---|
| `applying` | 投递中 | `current_stage = applied` |
| `interviewing` | 面试中 | `current_stage IN (hirevue, screening, first, second, third, case, superday)` |
| `offer` | 已 Offer | `current_stage = offer` |
| `rejected` | 已拒绝 | `current_stage = rejected` |
| `withdrawn` | 已撤回 | `current_stage IN (cancelled, withdrawn)`（但当前 SQL 已过滤这两态，5 态枚举仍保留以备未来恢复展示）|

地区采用 `osg_position.region`（岗位地区），非面试城市；面试城市归 `osg_coaching.city`，展开行展示。

#### 修复方案

**第 1 步：后端透字段**

在 `osg-frontend/packages/shared/src/api/applications.ts` `StudentApplicationRecord` 接口新增：

```ts
export interface StudentApplicationRecord {
  // ... 现有字段保留兼容
  industryLabel: string         // 行业标签（从 osg_position.industry → osg_industry_dict 反查）
  categoryLabel: string         // 岗位分类标签（osg_position.category → osg_position_category 反查）
  regionLabel: string           // 地区标签（osg_position.region → osg_region 反查）
  recruitmentCycle: string      // 招聘周期（osg_position.recruitment_cycle 直读）
  submittedAt: string           // 投递时间（osg_job_application.submitted_at 或 create_time）
  applicationStatus: string     // 求职状态枚举（'applying' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn'）
  applicationStatusLabel: string // 状态展示标签
}
```

后端 `PositionServiceImpl.selectApplicationList` 需在返回每条 application 时关联 `osg_position` 表读取行业/分类/地区/招聘周期，并从 `osg_job_application` 读 `submitted_at`。

**第 2 步：前端 columns 重构**

将 `columns` 定义改为需求 8 列 + 操作。删除「辅导状态」「导师」「课时/反馈」3 列（这些信息应在展开行展示，与 §3.4 联动）。

**第 3 步：前端模板 bodyCell 切换**

在 `index.vue:88-141` bodyCell 模板里：
- 删除 `column.key === 'stage'` / `'coachingStatus'` / `'mentor'` / `'hoursFeedback'` 分支
- 新增 `'industry'` / `'category'` / `'region'` / `'recruitmentCycle'` / `'submittedAt'` / `'applicationStatus'` 6 个简单文字 cell
- 「求职状态」cell 用 `<a-tag>` + 颜色编码渲染 **`applicationStatusLabel`**（字典中文），不渲染 `applicationStatus` 英文 value
- 「行业」「岗位分类」「招聘周期」「面试阶段」等所有 status / 枚举字段同理：渲染 `xxxLabel`，禁止 `xxxLabel || xxx` fallback（按 RULE-E）
- 找不到 label 时统一显示 `-`，不显示英文 value

**第 4 步：现有 bucket/coachingStatus 字段保留**

不删除 `StudentApplicationRecord` 现有的 `bucket / coachingStatus / mentor / hoursFeedback / feedback` 字段，避免破坏：
- 展开行渲染（仍要用 mentor）
- 学生端测试（`applications.spec.ts`）
- 现有数据流

但 columns 不再展示这些字段。

#### 涉及文件

- `osg-frontend/packages/shared/src/api/applications.ts`（接口类型）
- `osg-frontend/packages/student/src/views/applications/index.vue`（columns + bodyCell）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`（selectApplicationList 字段补齐）
- `ruoyi-system/src/main/resources/mapper/system/PositionMapper.xml`（SQL JOIN 调整）
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`（测试用例对齐）

#### 验收标准

- `GET /student/application/list` 返回的每条 application 包含 8 个需求字段
- 学生端列表显示 8 列 + 操作列
- 「求职状态」列正确显示 `applying / interviewing / offer / rejected / withdrawn` 5 态之一
- 「投递时间」按 ISO 日期格式或本地化格式展示，不为空
- 现有 `applications.spec.ts` 不破坏

#### 工作量

- 后端：~0.5 人日（SQL JOIN select + Service 附 label + 测试。表字段已存在，无 DDL）
- 前端：~0.5 人日（接口类型 + columns + bodyCell）

#### 待澄清问题

**全部已澄清（2026-05-11 与 01 / 06 / 08 历史文档对齐）**。详见上方"字段缺口分析"的 5 态枚举表与字段映射。无遗留问号。

---

### 3.4 P1-2 学生端展开行加城市字段

#### 现状

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/student/src/views/applications/index.vue:876-889` 展开行 `renderApplicationCoachings` 函数当前渲染：

```ts
[
  stage-tag + coachingId,
  `${interviewTime} · ${companyInterviewer}`,
  `导师：${mentorNames} · 最新评分：${latestRating} · 已上报课消：${reportedLessonCount}`,
  操作按钮
]
```

需求字段：面试阶段、面试时间、**城市**、导师、最近评分。**缺城市**。

`StudentApplicationCoachingRecord` 接口 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/applications.ts:3-21` 已有 `city` / `cityLabel` 字段（Step 1 后端已透）。

#### 修复方案

将 meta1 行改为：

```ts
`${interviewTime || '-'} · ${cityLabel || city || '-'} · ${companyInterviewer || '面试官待补充'}`
```

或拆为两行更清晰：

```ts
`面试时间：${interviewTime || '-'}  城市：${cityLabel || '-'}`,
`公司面试官：${companyInterviewer || '-'}  导师：${mentorNames || '-'}  最近评分：${latestRating || '-'}`
```

#### 涉及文件

- `osg-frontend/packages/student/src/views/applications/index.vue`（仅前端）

#### 验收标准

- 学生端「我的求职」每行展开后，每条辅导记录显示 5 项字段：面试阶段、面试时间、城市、导师、最近评分

#### 工作量

- 前端：~0.5 小时

---

### 3.5 P1-3 导师端筛选 4 项 + 学生 ID 列

#### 现状

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/mentor/src/views/job-overview/index.vue:17-29` 仅一个「全部面试状态」下拉，列表 columns 缺学生 ID 列。

#### 修复方案

**第 1 步：筛选改造**

参考班主任端 `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue:19-60` 的筛选行设计，将导师端 `filter-row` 改为：

```vue
<div class="filter-row">
  <a-select v-model:value="filters.companyName" placeholder="全部公司" ... />
  <a-select v-model:value="filters.currentStage" placeholder="全部面试阶段" ... />
  <a-range-picker v-model:value="filters.interviewRange" ... />
  <a-select v-model:value="filters.lessonReported" placeholder="是否上报课消" ... />
  <a-button type="primary" @click="handleSearch">搜索</a-button>
</div>
```

删除「全部面试状态」（new/coaching/completed/cancelled）下拉，因为这是 coachingStatus 不是 interviewStage。

**第 2 步：filters reactive state**

新增：

```ts
const filters = ref({
  companyName: '',
  currentStage: '',
  interviewRange: null as [string, string] | null,
  lessonReported: undefined as boolean | undefined
})
```

**第 3 步：列加学生 ID**

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/mentor/src/views/job-overview/index.vue:185-195` `jobColumns` 数组首位加：

```ts
{ title: '学生ID', dataIndex: 'studentId', key: 'studentId', width: 100, fixed: 'left' as const }
```

并把现有「学员」列的 fixed 取消，按需要保留。

**第 4 步：后端筛选参数**

后端 `OsgMentorJobOverviewController.list` 接收新的 4 个筛选参数，传给 service：

- `companyName`（模糊匹配 `osg_position.company`）
- `currentStage`（精确匹配 `osg_coaching.interview_stage`）
- `interviewTimeBegin / interviewTimeEnd`（范围匹配 `osg_coaching.interview_time`）
- `lessonReported`（boolean，true=已上报 / false=未上报）

参考班主任端已实现的 `OsgUserJobOverviewServiceImpl.listForLeadMentor` 的过滤逻辑。

**第 5 步：列名修正**

`'面试状态'` 列名（`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/mentor/src/views/job-overview/index.vue:191`）改为「面试阶段」。

#### 涉及文件

- `osg-frontend/packages/mentor/src/views/job-overview/index.vue`（前端 UI + filter state）
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMentorJobOverviewController.java`（接收筛选参数）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java`（mentor 过滤逻辑）
- `ruoyi-system/src/main/resources/mapper/...`（SQL 增加 WHERE 子句）

#### 验收标准

- 导师端筛选条 4 项：公司、面试阶段、面试时间、是否上报课消
- 搜索按钮触发 list 调用，参数透传到后端
- 列表第 1 列为「学生ID」
- 「面试阶段」列名正确（不是「面试状态」）
- 各筛选组合查询结果正确（精确/模糊/范围/布尔）

#### 工作量

- 前端：~0.5 人日
- 后端：~0.5 人日

---

### 3.6 P2-1 班主任端「公司/岗位」拆为两列

#### 现状

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue:385/396/407` 三栏 columns 都用 `{ title: '公司/岗位', dataIndex: 'company', key: 'company' }` 合并显示。

#### 修复方案

将三栏 columns 中合并的「公司/岗位」拆为两列：

```ts
{ title: '岗位', dataIndex: 'position', key: 'position', width: 160 },
{ title: '公司', dataIndex: 'company', key: 'company', width: 160 },
```

并更新对应的 `CompanyPositionCell` 组件渲染逻辑（如有需要拆分）。

#### 涉及文件

- `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue`
- 可能涉及 `osg-frontend/packages/shared/src/components/CompanyPositionCell/index.vue`（如该组件是合并展示）

#### 验收标准

- 班主任端三栏列表 「岗位」和「公司」两列分开显示
- 现有数据流不变（OverviewRow 已有 `position` 和 `company` 字段）

#### 工作量

- 前端：~0.5 人日

#### 是否做的判断

**必做**。08 RULE-A §2 班主任端 9 字段明确把「岗位」「公司」列为两列（08:69-79）。当前合并显示与 RULE-A 不符，按规则拆开，不再以"UI 紧凑"为由保留合并。

---

### 3.7 P2-2 助教端 KPI 横条删除

#### 现状

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/career/job-overview/index.vue:12-42` 有 4 张 KPI 卡片：管理学员 / 面试中 / 收 Offer / 即将面试。

需求未提及 KPI 横条。`08-master-bug-spec.md` §2 RULE-A 助教端只提"面试日历 + 筛选 + 列表"。

#### 修复方案

删除 `.ajo-kpi-strip` 整段模板 + 对应 `kpis` reactive state 计算。

#### 涉及文件

- `osg-frontend/packages/assistant/src/views/career/job-overview/index.vue`

#### 验收标准

- 助教端页面不再显示 KPI 横条
- 现有 `career-pages.spec.ts` 不破坏

#### 工作量

- 前端：~0.5 小时

#### 是否做的判断

**必做**。08 RULE-A §2 助教端只列「面试日历 + 筛选 + 列表」，**未包含 KPI 横条**（08:80-85）。原始需求与产品口径均未出现 KPI，按 RULE-A 删除，不再以"产品意图"为由保留。

---

### 3.8 P2-3 助教端 Step 4 后端透字段（关联 AS-001/002）

#### 现状

- `08-master-bug-spec.md` AS-001 / AS-002 标记 ⚠ 部分：前端 UI 已收口，**后端 coachingId / mentorName / latestRating / reportedLessonCount 未透**
- 列表中导师/最近评分占位 `-`

#### 修复方案

按 `06-requirement-index-by-end.md` Step4-F1 / Step4-F3 计划执行：

- 后端新增 `listByAssistant` 方法，按 `coaching_id` 透出 mentorName / latestRating
- 后端新增 `selectAssistantMockPracticeDetail` 方法（mock-practice 也有同样问题）
- 走 `hasAssistantOwnership` 鉴权

#### 涉及文件

- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java`
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMockPracticeServiceImpl.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantJobOverviewController.java`（如已存在）

#### 验收标准

- 助教端「我管理的学员」列表「导师」「最近评分」列有真实值（不再是 `-`）
- 助教端「我管理的学员」查看详情能看到导师填写的多条课消详情
- 鉴权正确：助教只能看到自己管理的学生

#### 工作量

- 后端：~1.5 人日（参考 lead-mentor 已有实现）

---

### 3.9 P2-4 导师端列名「面试状态」改「面试阶段」

#### 现状

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/mentor/src/views/job-overview/index.vue:191` 列标题为「面试状态」（dataIndex 是 `interviewStage`）。

#### 修复方案

字面修改：

```ts
{ title: '面试阶段', key: 'stage', dataIndex: 'interviewStage', width: 120 }
```

#### 涉及文件

- `osg-frontend/packages/mentor/src/views/job-overview/index.vue`

#### 验收标准

- 导师端「学员求职总览」列名为「面试阶段」

#### 工作量

- 前端：~5 分钟

---

## 4. 推进顺序建议

### 4.1 强依赖关系图

```
P0-1 学生端「申请辅导」入口
   ↓ 依赖
P0-2 学生端 7 阶段
   ↓ 依赖（同步）
P1-1 学生端列字段重构（后端透字段 + 前端列改）
   ↓ 影响 Step 6 跨端测试主链起点

P1-2 学生端展开行加城市字段（独立，与 P0/P1-1 解耦）

P1-3 导师端筛选 + 学生ID（独立）

P2-1 班主任端合并列拆分（独立）
P2-2 助教端 KPI 横条删除（独立）
P2-3 助教端 Step 4 后端透字段（独立，可推迟）
P2-4 导师端列名（独立）
```

### 4.2 建议批次

**批次 1（P0 主链起点修复，1-1.5 人日）**
- §3.1 P0-1 学生端「申请辅导」入口
- §3.2 P0-2 7 阶段统一

**批次 2（P1 字段对齐，1.5-2 人日）**
- §3.3 P1-1 学生端列字段重构（前端 + 后端联动）
- §3.4 P1-2 学生端展开行加城市

**批次 3（P1 导师端补齐，1 人日）**
- §3.5 P1-3 导师端筛选 4 项 + 学生 ID 列 + 列名修正

**批次 4（P2 微调，0.5-1 人日，可推迟）**
- §3.6 P2-1 班主任合并列拆分（待确认是否做）
- §3.7 P2-2 助教 KPI 删除（待确认）
- §3.8 P2-3 助教 Step 4 后端透字段（与 AS-001/002 联动）

**批次 5（Step 6 跨端验收，0.5 人日）**
- 启动 Playwright 无头跨端测试
- 出 5 端联动测试报告

### 4.3 时间估算

- 全量批次 1-5：5-6.5 人日
- 仅 P0+P1（必修）：4-5 人日
- 仅 P0 主链起点：1.5 人日

---

## 5. 验收检查清单

执行完所有批次后逐项核对：

### 5.1 学生端

- [ ] 列表显示 8 字段：岗位名称 / 公司 / 行业 / 岗位分类 / 地区 / 招聘周期 / 投递时间 / 求职状态
- [ ] 操作列只有「申请辅导」按钮
- [ ] 点击「申请辅导」打开弹窗，标题为「申请辅导」
- [ ] 弹窗下拉显示 7 个面试阶段
- [ ] HireVue 阶段可继续填 VI/OT/截图等信息
- [ ] 提交后岗位行可展开
- [ ] 展开行 5 字段：面试阶段 / 面试时间 / 城市 / 导师 / 最近评分
- [ ] 展开行操作列「查看详情」+「修改」
- [ ] 修改只能改面试时间和公司面试官
- [ ] 现有 student vitest 测试通过

### 5.2 班主任端

- [ ] 三栏结构 + 默认第一栏 ✅（已实现，回归即可）
- [ ] 我管理的学员：面试日历 + 3 项筛选 + 列字段对齐
- [ ] 待辅导的学员：4 项筛选（含是否上报课消）+ 列字段对齐 + 上报课消按钮
- [ ] 待分配导师：列字段对齐（含提交时间）+ 分配导师按钮
- [ ] 分配导师强制选数量 = `requested_mentor_count`
- [ ] 现有 lead-mentor vitest 测试通过

### 5.3 助教端

- [ ] 单栏「我管理的学员」
- [ ] 面试日历 + 3 项筛选
- [ ] 列字段 9 项对齐
- [ ] 导师 / 最近评分有真实值（依赖 §3.8 Step 4 后端透）
- [ ] KPI 横条已删除（如执行 §3.7）
- [ ] 查看详情显示导师填写的多条课消（依赖 §3.8）
- [ ] 现有 assistant vitest 测试通过

### 5.4 导师端

- [ ] 单栏「待辅导的学员」
- [ ] 4 项筛选：公司 / 面试阶段 / 面试时间 / 是否上报课消
- [ ] 列字段第 1 列为「学生ID」
- [ ] 列名「面试阶段」（不是「面试状态」）
- [ ] 操作列「上报课消」按钮
- [ ] 现有 mentor vitest 测试通过

### 5.5 跨端联动（Step 6）

- [ ] 学生申请阶段辅导 → 班主任「待分配」栏看到该 coaching
- [ ] 班主任按 `requested_mentor_count` 分配导师 → 导师「待辅导」栏看到该 coaching
- [ ] 导师上报课消（reference_type=job_coaching, reference_id=coaching_id）
- [ ] 学生展开行看到「最近评分」更新 + 详情中有该课消
- [ ] 班主任 + 助教详情口径一致
- [ ] 同 application 下两条 coaching（First Round + Second Round）数据不串

---

## 6. 已知风险（2026-05-11 复核后全部关闭）

> 原 §6.1~§6.5 5 条风险经与 01 / 06 / 08 历史文档对齐后**全部解除**。当前不存在阻塞项。

### 6.1 ~~学生端列字段重构数据库依赖~~ ✅ 关闭

`osg_position` 表已含 `industry / position_category / recruitment_cycle / region` 字段（`OsgPosition.java:14/16/32`），`OsgPositionMapper.xml:9/10/18` 已映射，**无需 DDL**。仅 `OsgJobApplicationMapper.xml:80-153` `selectStudentApplicationRecords` 没 select 这些字段——属代码缺漏，不是 schema 缺漏。字典 `osg_position_industry` 在 `PositionServiceImpl.java:309` 已加载使用，存在且可用。

### 6.2 ~~「求职状态」语义不明~~ ✅ 关闭

`applicationStatus` 5 态定义已写入 §3.3"字段缺口分析"末尾的映射表，从 `app.current_stage` 直接派生，不与 `coachingStatus` 混用。出处 01 §7.1 line 221、08 RULE-A line 55。

### 6.3 ~~班主任合并列 vs 拆开~~ ✅ 关闭

08 RULE-A §2 班主任 9 字段明确「岗位」「公司」为两列（08:69-79）。按 RULE-A 必须拆开。`CompanyPositionCell` shared 组件如成为障碍，改组件而非保留合并。

### 6.4 ~~助教 KPI 横条~~ ✅ 关闭

08 RULE-A §2 助教端字段表未含 KPI（08:80-85）。按 RULE-A 必删。

### 6.5 ~~Step 4 助教后端依赖~~ ✅ 关闭（已实施）

2026-05-11 代码复核：`OsgUserJobOverviewServiceImpl.java:1298` `listByAssistant` 已透 `mentorName / latestRating`；`OsgMockPracticeServiceImpl.java:140` `selectMentorMockPracticeDetail` 已实现并返回 `reportedLessonCount`。原 ⚠ 部分项升级为 ✅ DONE，08 状态表待同步。

---

## 7. 修改文件清单（汇总）

### 7.1 前端文件

- `osg-frontend/packages/student/src/views/applications/index.vue`（§3.1/§3.2/§3.3/§3.4）
- `osg-frontend/packages/mentor/src/views/job-overview/index.vue`（§3.5/§3.9）
- `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue`（§3.6，可选）
- `osg-frontend/packages/assistant/src/views/career/job-overview/index.vue`（§3.7，可选）
- `osg-frontend/packages/shared/src/api/applications.ts`（§3.3，类型扩展）
- 可能涉及 `osg-frontend/packages/shared/src/components/CompanyPositionCell/index.vue`（§3.6）

### 7.2 后端文件

- `ruoyi-system/src/main/java/com/ruoyi/system/domain/StudentApplicationVo.java`（如有）（§3.3）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`（§3.3）
- `ruoyi-system/src/main/resources/mapper/system/PositionMapper.xml`（§3.3）
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java`（§3.5/§3.8）
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMentorJobOverviewController.java`（§3.5）
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantJobOverviewController.java`（§3.8）

### 7.3 测试文件

- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/PositionServiceImplTest.java`（§3.3）
- `osg-frontend/packages/student/src/__tests__/applications.spec.ts`（§3.1-§3.4）
- `osg-frontend/packages/mentor/src/__tests__/job-overview.spec.ts`（§3.5）
- `osg-frontend/packages/lead-mentor/src/__tests__/career-pages.spec.ts`（§3.6，如改）
- `osg-frontend/packages/assistant/src/__tests__/career-pages.spec.ts`（§3.7-§3.8）

---

## 8. 与已有文档关系

- **不重写**：本文档不重写 `01-student-applications.md` / `02-job-overview-coaching-anchor-revision.md`，那两份是产品口径方案，本文档是 UI 对齐修复
- **补 §08 偏差**：`08-master-bug-spec.md` 中 ST-006/007/011 + LM-009 + MT-005 + AS-001/002 等 ⚠/▶ 项在本方案中明确了"如何做"
- **接力 Step 6**：本方案执行完成后才能正式启动 `06-requirement-index-by-end.md` §8 Step 6 跨端回归

---

## 9. 执行约定

- **逐项确认**：每一批次（§3.x）执行前必须输出修改清单（具体文件 + 代码片段），等用户明确"确认修复"后才动代码
- **TDD 优先**：批次 1/2 / 3 都涉及业务逻辑，按 `tdd` skill 走 RED → GREEN → REFACTOR
- **不删测试**：不删除现有 `applications.spec.ts` / `career-pages.spec.ts` 已有测试，只增量改
- **不混批次**：一个批次完成 + verification 通过后再开下一批
- **不自动 commit**：每批次完成后只汇报变更，不自动 `git commit`

---

## 10. 与原始需求 16 段对照（2026-05-11 补章）

> **背景**：用户 2026-05-11 提供的"原始需求 16 段"远超本文档覆盖范围（本文档仅锚定原需求段 1-4 求职总览 4 端 + 我的求职）。本节把原需求 16 段对照到既有 `00-08` 文档与实际代码状态，避免读者误以为 09 plan = 全部需求。

### 10.1 文档索引（中间补充与仲裁）

| 文档 | 覆盖原需求段 | 角色 |
|---|---|---|
| `00-overview.md` | 总纲 | 五端联动主链总纲 |
| `01-student-applications.md` | 段 1（学生我的求职）| 学生端方案 |
| `02-job-overview-coaching-anchor-revision.md` | 段 2/3/4（求职总览 3 端）| 锚点修正 |
| `03-class-report-reference-revision.md` | 段 12（上报课消 reference）| 课消锚点 |
| `04-mock-practice-management.md` | 段 5/6/7/9（模拟应聘 4 端）| 模拟应聘方案 |
| `05-admin-and-student-profile-followups.md` | 段 10/11/14/15/16（排期/字典/自添岗位/导师变更）| 收口零散项 |
| `07-conflict-clarifications.md` | C-1~C-5 全关闭 | 业务方向仲裁（账号 4 态 / 岗位可见性 / 班主任双角色 / 黑名单 / 字段直改 vs 审核）|
| `08-master-bug-spec.md` | RULE-A~F 全规则 + 5 端 TODO 矩阵 | **唯一开发依据** |
| `09-rule-a-alignment-fix-plan.md`（本文档）| 段 1-4 求职总览主链对齐 | 本文档 |

### 10.2 原需求 16 段 × 实现状态对照表

| # | 原需求段 | 覆盖文档 | 代码状态 | 备注 |
|---|---|---|---|---|
| 1 | 学生端我的求职（8 列 + 申请辅导 + 7 阶段 + 展开 5 字段 + 修改/详情）| 01 / 09 §3.1-§3.4 | ❌ 未动代码 | 09 plan P0-1/P0-2/P1-1/P1-2 待批次 1-2 |
| 2 | 班主任端学员求职总览 3 栏 | 02 / 09 §3.6 | ⚠ 三栏结构 ✅，公司/岗位需拆两列（P2-1 必做） | `lead-mentor/career/job-overview/index.vue:64-227` |
| 3 | 助教端学员求职总览（单栏 + 9 字段）| 02 / 09 §3.7-§3.8 | ⚠ 前端 UI ✅，后端字段 ✅（已核 2026-05-11），KPI 横条需删（P2-2 必做）| — |
| 4 | 导师端学员求职总览（单栏 + 4 筛选）| 02 / 09 §3.5/§3.9 | ❌ 筛选 4 项缺、学生 ID 列缺 | 批次 3 待做 |
| 5 | 导师端模拟应聘（删卡片+4 筛选+列）| 04 + RULE-B | ✅ DONE | `mentor/src/views/mock-practice/index.vue` |
| 6 | 班主任端模拟应聘（删卡片+3 栏）| 04 + RULE-B | ✅ DONE | LM-008 已收口 |
| 7 | 助教端模拟应聘（删卡片+单栏）| 04 + RULE-B | ⚠ 前端 ✅，后端 detail 端点已实现（2026-05-11 复核）| AS-002 状态升级，待 08 同步 |
| 8 | 班主任分配导师数量校验（= `requested_mentor_count`）| 08 LM-009 | ✅ DONE | `lead-mentor/career/mock-practice/index.vue:579-583` |
| 9 | 后台模拟应聘默认全部列 | 08 A-MP-001 | ✅ DONE | `admin/career/mock-practice/index.vue:241,318` |
| 10 | 导师端/班主任端排期未填强制弹窗 | 05 §4 + 08 MT-002/LM-010 | ✅ DONE | `mentor/schedule/index.vue:12` banner + `lead-mentor/profile/schedule/index.vue:382` forceScheduleModal |
| 11 | 导师端排期按钮显示问题 | 05 §5 + 08 MT-003 | ⏸ HOLD | 缺截图复现 |
| 12 | 上报课消三端一致 + 旷课/课程类型 5 分支 + T01-T24 + B0-B7 + 不显课时费 | 03 + 08 RULE-C / CR-001~CR-007 | ✅ 95% | 仅 **CR-005 人际关系 5 项详细说明** 仍为 TBD 占位（`constants.ts:44-48`）|
| 13 | 后台课程记录 | 08 A-CR-001 | ⏸ HOLD | 依赖 RULE-C 全完成才能跑端到端测试 |
| 14 | 学生自添岗位审核（合并/新增）| 05 §1 + 08 RULE-D / §9 RD-001~RD-004 | ⚠ 新增分支 ✅，**合并分支 ❌ 待做** | 详见 08 §9 方案 |
| 15 | 后台导师列表审核变更信息 | 05 §2 + 08 A-AU-001 | ❌ 未实现 | `OsgMentorProfileController` 只有 submit 端点、无审核 API |
| 16 | 学生端修改信息字段字典化 | 05 §3 + 08 ST-009 | ✅ DONE | `student/views/profile/index.vue` 用 `useDictFacade` 5 个字典 |

**统计**：✅ 完全实现 8 段 / ⚠ 部分实现 3 段 / ❌ 待做 3 段 / ⏸ 阻塞 2 段。

### 10.3 09 plan 未覆盖但真正剩余 TODO

本文档 §3 全部 P0/P1/P2 项之外，下列项**不在 09 plan 范围**，需走单独 fix / Story：

| 优先级 | ID | 标题 | 主依据文档 |
|---|---|---|---|
| 🟠 P1 | RD-001/002/003/004 | 学生自添岗位「合并到已有」分支（后端 approve 加 `mergeToPositionId` + 前端 ReviewPositionModal 加 radio + 学生侧文案 + 跨端测）| 08 §9 RULE-D |
| 🟠 P1 | A-AU-001 | 后台导师变更信息审核入口（审核 API + 列表筛选 + 审核弹窗）| 05 §2 + 08 A-AU-001 |
| 🟡 P2 | CR-005 | 人际关系 5 项评分"详细说明"文案补齐（替换 TBD 占位）| 08 RULE-C / CR-005 |
| 🟡 P2 | MT-003 | 导师端排期按钮显示 bug（HOLD 缺截图）| 05 §5 + 08 MT-003 |
| 🟡 P2 | A-CR-001 | 后台课程记录回归测试（HOLD 等 RULE-C 全完成）| 08 A-CR-001 |

### 10.4 推进顺序建议（重排）

把"原需求 16 段口径"叠在 §4 批次顺序上：

```
批次 1（本文档 §3.1 + §3.2）            学生端申请辅导入口 + 7 阶段              [原需求 1] P0
批次 2（本文档 §3.3 + §3.4）            学生端列字段 + 展开行城市                  [原需求 1] P1
批次 3（本文档 §3.5 + §3.9）            导师端筛选 + 学生 ID + 列名               [原需求 4] P1
批次 3.5（新增，来自 08 §9）            RD-001~004 自添岗位合并分支               [原需求 14] P1
批次 4（本文档 §3.6-§3.8 + 08 A-AU-001） 班主任合并列 / 助教 KPI / 导师变更审核     [原需求 2/3/15] P2
批次 5（08 CR-005）                     人际关系详细说明文案补齐                   [原需求 12] P2
批次 6（Step 6 跨端验收）               5 端联动 Playwright + A-CR-001 课程记录回归 [原需求 12/13] —
```

### 10.5 给本文档读者的提示

- **不要把 09 plan 当作"原始需求全集"** — 它只对齐求职总览主链。其余 11 段需求散落在 00-08 文档。
- **08 是单一开发依据** — 任何端的待办按 08 的 ID（A-* / ST-* / LM-* / MT-* / AS-* / RD-* / CR-* / GL-*）追踪状态。本文档 §3 编号（P0-1 等）只在本文档范围内有效。
- **07 仲裁结论是底线** — C-2 学生灰显 / C-3 班主任三栏分操作 / C-4 黑名单双语义 / C-5 字段直改这 4 条是产品已拍板的不可逆决策，任何后续方案不能颠覆。

---

## 11. 真实状态终审（2026-05-11 23:50）

> 用户反馈"上次开干没问任何问题，不知道什么时候干偏了"。本节以**代码事实**为准、绕开 `06 状态跟踪表` 的 ✅ 声明，给出客观状态。

### 11.1 06 状态表 vs 代码现状对照（关键偏差）

| 06 声称 | 代码事实 | 偏差 |
|---|---|---|
| Step1-F5 学生端我的求职主表 + 展开行 ✅ | 展开行 ✅ done（`student/applications/index.vue:85` `expanded-row-render`）；**列表 columns 仍是旧 7 列**（`index.vue:686-693` 公司/岗位 合并 + 辅导状态 + 导师 + 课时反馈）| **主表 8 字段未做** |
| Step1-F6 申请辅导弹窗 7 阶段 ✅ | `interviewStages` 仍 6 个，**缺 hirevue**（`index.vue:605`）；操作列**没"申请辅导"按钮**（`index.vue:136-140` 只显 stage tag）；弹窗标题仍是「更新状态 & 申请辅导」（`index.vue:178`）| **入口 + 7 阶段未做** |
| Step1-F6/F7 接入 coaching API ✅ | `requestStudentApplicationCoaching` 已调用（line 519, 978, 984）；`coachings[]` 子列表展开渲染 ✅ | 这部分**确实 done** |
| Step1-F1 后端列表返回 application + coachings ✅ | `selectApplicationList` 在 `PositionServiceImpl.java:339` 已 `buildApplicationCoachings` 附 coaching 子列表 ✅；但 SQL `selectStudentApplicationRecords` **未 select industry/category/recruitment_cycle/region**（`OsgJobApplicationMapper.xml:80-153`）| **后端 5 字段透传未做** |

**结论**：上次开干干完了"展开行 + coaching API 接入 + 后端 coaching 子列表组装"，但**学生端列表的 8 字段重构 + 7 阶段 + 申请辅导按钮 + 后端 RULE-A 字段透传** 4 件事都没做。06 把 F5/F6 标 ✅ 是错的。

### 11.2 全局真实状态（按原始需求 16 段重新评估）

| # | 原需求段 | 真实状态 | 关键证据 |
|---|---|---|---|
| 1 | 学生端我的求职 | ⚠ **部分**（展开行+API ✅；列表字段+申请辅导按钮+7 阶段 ❌）| 见 §11.1 |
| 2 | 班主任端 3 栏 | ⚠ **部分**（三栏结构 ✅；公司/岗位需拆两列 ❌）| `lead-mentor/.../job-overview/index.vue:385/396/407` |
| 3 | 助教端单栏 | ⚠ **部分**（前端 UI + 后端字段 ✅；KPI 横条需删 ❌）| `assistant/.../job-overview/index.vue:12-42` |
| 4 | 导师端单栏 | ❌ **大头未做**（筛选 4 项缺、学生ID 列缺、列名「面试状态」未改）| `mentor/.../job-overview/index.vue:17-29, 185-195` |
| 5 | 导师端模拟应聘 | ✅ DONE | `mentor/.../mock-practice/index.vue` |
| 6 | 班主任端模拟应聘 | ✅ DONE | LM-008 |
| 7 | 助教端模拟应聘 | ✅ DONE（含后端 detail 端点）| AS-002 升级 |
| 8 | 分配导师数量校验 | ✅ DONE | `lead-mentor/.../mock-practice/index.vue:579-583` |
| 9 | 后台模拟应聘默认全部列 | ✅ DONE | A-MP-001 |
| 10 | 导师/班主任排期未填强制弹窗 | ✅ DONE | `mentor/schedule:12` + `lead-mentor/profile/schedule:382` |
| 11 | 导师端排期按钮 bug | ⏸ HOLD 缺截图 | MT-003 |
| 12 | 上报课消三端 + 全部子需求 | ✅ 95%（仅 CR-005 人际关系 5 项详细说明文案为 TBD）| `constants.ts:44-48` |
| 13 | 后台课程记录 | ⏸ HOLD 等 RULE-C 全完 | A-CR-001 |
| 14 | 自添岗位审核合并/新增 | ⚠ 新增 ✅，**合并分支 ❌**（08 §9 已有方案）| RD-001~004 |
| 15 | 后台导师变更审核 | ❌ 未实现 | `OsgMentorProfileController` 只有 submit |
| 16 | 学生修改信息字典化 | ✅ DONE | ST-009 |

**统计**：✅ 完全 7 段 / ⚠ 部分 4 段 / ❌ 完全没做 2 段 / ⏸ HOLD 2 段 / TBD 文案 1 段。

### 11.3 现在到底是什么状态——一句话

**主链 60% 完成、求职总览 4 端 UI 字段层 0% 完成、自添岗位合并 + 导师变更审核 0% 完成、其余零散项已 ✅**。

**2026-05-12 01:50 更新**：批次 1 / 1.5 / 2 / 3 / 3.5 / 4 全部交付，原始需求 16 段中 14 段 ✅ 落地，剩余批次 5（CR-005 人际关系 5 项文案，需产品提供）+ 批次 6（Step 6 Playwright 跨端回归 + 后台课程记录回归 A-CR-001）。

具体卡点：

1. **求职总览 4 端**（原需求段 1-4）：上次开干只动了"后端 + 展开行 + API"这一层，**列表字段层从来没动过**——这是 09 plan §3 P0/P1 的全部内容。
2. **自添岗位合并分支**（原需求段 14）：08 §9 RD-001~004 方案就绪、未动代码。
3. **导师变更审核**（原需求段 15）：方案+代码都缺。

### 11.4 已无阻塞，可立即开干的执行顺序

历史决策已对齐、所有"待澄清"已清零。建议执行顺序（无依赖间断）：

| 批次 | 内容 | 人日 | 阻塞 |
|---|---|---|---|
| 1 | §3.1 + §3.2 学生端入口 + 7 阶段（纯前端，含顺手清理本文件 RULE-E fallback）| 1.0 | 无 |
| 1.5 | 5 端 RULE-E label 兜底全局扫描清理（grep `Label \|\| `, `\|\| record\.stage` 等模式）| 0.5 | 无 |
| 2 | §3.3 + §3.4 学生端 8 字段重构（后端 SQL select + Service 附 label + 前端 columns）| 1.0 | 无（osg_position 表字段已就绪）|
| 3 | §3.5 + §3.9 导师端筛选 4 项 + 学生 ID + 列名 | 1.0 | 无 |
| 3.5 | 08 §9 RD-001~004 自添岗位合并分支 | 1.5 | 无 |
| 4 | §3.6 班主任拆列 + §3.7 助教删 KPI + §3.8 助教详情透字段（已部分 done）+ A-AU-001 导师变更审核 | 1.5 | A-AU-001 需先确认变更表结构 |
| 5 | 08 CR-005 人际关系 5 项详细说明文案 | 0.2 | 需产品给文案 |
| 6 | Step 6 跨端 Playwright + A-CR-001 后台课程记录回归 | 0.5 | 需批次 1-3 完成 |

**总计**：**7.2 人日** 把原需求 16 段全部清掉（不含 MT-003 HOLD 项）。

---

## 12. 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-11 22:00 | 首版：基于用户文字需求 + 4 端代码核对结果，输出 P0/P1/P2 分级修复方案 |
| 2026-05-11 23:30 | §10 补章：原始需求 16 段对照 + 文档索引 + 真实剩余 TODO 重排；澄清 09 plan 仅覆盖求职总览主链，非全集 |
| 2026-05-11 23:50 | §6 风险全关闭 / §3.3 字段缺口分析按代码事实重写（osg_position 表字段已存在，无需 DDL）/ §3.3 待澄清清零 / §3.6 §3.7 由"待确认"改为"按 RULE-A 必做" / 新增 §11 真实状态终审，标记 06 状态表与代码偏差 |
| 2026-05-12 00:10 | 接入 RULE-E 新条款「状态展示统一用字典中文 label」：§3.3 bodyCell 渲染规则改为 `applicationStatusLabel` + 禁止 `label \|\| value` fallback；08 §2 RULE-E 同步追加 |
| 2026-05-12 00:30 | **批次 1 完成** — 学生端「申请辅导」入口 + 7 阶段 + 弹窗标题 + mentorHelp 移除 + RULE-E 兜底清理；构建 ✅ 测试 8/8 ✅ |
| 2026-05-12 00:35 | **批次 1.5 完成** — 5 端 RULE-E 全局扫描：student/positions / assistant/job-overview / lead-mentor/AssignMentorModal / admin/StudentDetailModal 共 4 处 label-fallback 修正 |
| 2026-05-12 00:55 | **批次 2 完成** — 学生端 8 字段重构：后端 OsgJobApplicationMapper.xml SQL JOIN industry/category/region/recruitment_cycle + applicationStatus 5 态派生；Service 附 industryLabel/categoryLabel/regionLabel/applicationStatusLabel；前端 columns 重构 + bodyCell 渲染；StudentApplicationRecord 类型扩展；后端测试 selectApplicationListAttachesRuleAFieldLabels ✅；构建 ✅ |
| 2026-05-12 01:05 | **批次 3 完成** — 导师端 4 项筛选（公司/面试阶段/面试时间/上报课消）+ 学生 ID 列 + 列名「面试阶段」；后端 OsgJobApplication 已支持 4 筛选字段；前端 filters 重构 + 测试 15/15 ✅ |
| 2026-05-12 01:25 | **批次 3.5 完成** — RD-001 后端 approveStudentPosition 加 mergeToPositionId 分支 + dedup 改 soft hint；RD-002 admin ReviewPositionModal 加合并/新增 radio + 公共岗位搜索；shared/api/admin/studentPosition.ts payload 类型 + searchPublicPositionsForMerge 接口；admin 构建 ✅ |
| 2026-05-12 01:45 | **批次 4 完成** — §3.6 班主任端 3 栏 columns「公司/岗位」拆为「岗位」+「公司」两列 + 移除 CompanyPositionCell；§3.7 助教 KPI 已无（基线已删，跳过）；§3.8 助教后端字段已就绪；A-AU-001 admin 端导师变更审核：mapper 加 select/update + Service 加 list/approve/reject + 新增 OsgMentorProfileChangeReviewController；ruoyi-admin 编译 ✅ |
| 2026-05-12 01:50 | 全端最终验证：student/mentor/lead-mentor/admin 4 端构建 ✅；定向测试 31/32（1 skip）✅；批次 5（CR-005 文案）/ 批次 6（Step 6 跨端）保留为产品文案 / 跨端 Playwright 阶段 |
| 2026-05-12 14:30 | **批次 7 + 7.5 新增章节 §13**：学生账号状态机重构（冻结独立成 flag + 退费重新加入续签流程）|

---

## 13. 批次 7 + 7.5 学生账号状态机重构（2026-05-12 新需求）

> **背景**：用户 2026-05-12 反馈两条核心 bug：
> 1. 退费 (status=3) 学员无法重新加入（缺续签合同流程入口）
> 2. 合同结束 (status=2) 与冻结 (status=1) 当前是同一字段互斥 enum，
>    无法表达「合同结束 + 已冻结」叠加状态（影响课消是否能 log）

### 13.1 当前状态机（待重构）

`OsgStudent.accountStatus` 是 4 态单字段 enum：

| value | 中文 | 当前行为 |
|---|---|---|
| `0` | 正常 | 能登录 / 看求职 / 课消 |
| `1` | 冻结 | ❌ 拒登录（`UserDetailsServiceImpl:66`）/ ❌ 拒课消（`OsgClassRecordServiceImpl:1334`）|
| `2` | 合同结束 | ✅ 能登录 / ❌ 求职（`PositionServiceImpl:173`）/ ✅ 能课消 |
| `3` | 退费 | ❌ 拒登录 / ❌ 拒课消 / ⚠️ 求职鉴权漏拦（未触发因登录已拒，仍属潜在 bug） |

互斥 enum 缺陷：

- `1 冻结` 与 `2 合同结束` 不能并存
- 退费学员没有"重新加入"回正常路径

### 13.2 重构后状态模型

**accountStatus 改为只表达 lifecycle**（去掉 1）：

| value | 中文 | 含义 |
|---|---|---|
| `0` | 正常 | 在读 |
| `2` | 合同结束 | 已结业 |
| `3` | 退费 | 已退费 / 终态（可通过续签重新加入恢复为 0）|

**新增独立 boolean 标记**：

| 字段 | 含义 |
|---|---|
| `osg_student.frozen TINYINT DEFAULT 0` | 是否冻结（独立 flag，与 lifecycle 正交） |

> **黑名单**仍走独立 `osg_student_blacklist` 表（不动），与 frozen 维度不同。

### 13.3 行为矩阵（重构后）

| accountStatus | frozen | 能登录 | 看求职 | 导师 log 课 | 列展示 |
|---|---|---|---|---|---|
| 0 正常 | 0 | ✅ | ✅ | ✅ | 「正常」 |
| 0 正常 | 1 | ❌ frozen | — | ❌ frozen | 「冻结」 |
| 2 合同结束 | 0 | ✅ | ❌ ended | ✅（有课时） | 「合同结束」 |
| 2 合同结束 | 1 | ❌ frozen | — | ❌ frozen | 「合同结束 · 冻结」 |
| 3 退费 | — | ❌ refunded | — | ❌ refunded | 「退费」 |

**关键不变量**：

- 「正常」状态下，`frozen` 是**独立**开关（freeze/unfreeze 不影响 lifecycle）
- 「合同结束」状态下，`frozen` 是**关联**开关（合同结束允许课消，再冻结才彻底锁课消）
- 「退费」状态下，`frozen` 字段**忽略**（lifecycle 已是终态）

### 13.4 操作菜单（admin 端学生列表）

| 当前状态 | 可见菜单项 | action 后端值 |
|---|---|---|
| 正常 (0/0) | **冻结** / 结束合同 / 退费 / 加入黑名单 | `freeze` / `end_contract` / `refund` / `blacklist` |
| 正常·冻结 (0/1) | **解冻** / 结束合同 / 退费 | `unfreeze` / `end_contract` / `refund` |
| 合同结束 (2/0) | **再冻结** / 退费 | `freeze` / `refund` |
| 合同结束·冻结 (2/1) | **解冻** / 退费 | `unfreeze` / `refund` |
| 退费 (3/–) | **重新加入** → 续签合同 | `rejoin`（带 contract payload） |

> 操作语义清晰化：
> - `freeze` / `unfreeze`：只切 `frozen` 列，**不动 accountStatus**
> - `end_contract`：`accountStatus = 2`，**不动 frozen**
> - `refund`：`accountStatus = 3`，**不动 frozen**
> - `rejoin`：先创建新合同 → `accountStatus = 0` + `frozen = 0`

### 13.5 鉴权改造点（后端）

| 检查点 | 文件:行 | 当前 | 改后 |
|---|---|---|---|
| 登录拦截 | `UserDetailsServiceImpl.java:66` | `"1".equals(accountStatus)` | `student.frozen == 1` |
| 登录拦截 | `UserDetailsServiceImpl.java:71` | `"3".equals(accountStatus)` | （保留） |
| 求职可见 | `PositionServiceImpl.java:173` | `"2".equals(accountStatus)` | （保留）+ 增 `"3".equals(...)` 兜底 |
| 课消 log | `OsgClassRecordServiceImpl.java:1334` | `"1".equals(accountStatus)` | `student.frozen == 1` |
| 课消 log | `OsgClassRecordServiceImpl.java:1338` | `"3".equals(accountStatus)` | （保留） |
| controller `resolveAccountStatus` | `OsgStudentController.java:447` | 4 action 映射 | 拆 freeze/unfreeze 独立路径 |

### 13.6 「重新加入」流程（批次 7.5）

```
admin 端学生列表 退费行
  → 点「重新加入」按钮
  → 复用 RenewContractModal（已存在的续签合同弹窗）
  → 提交时 payload 加 reactivateAccount=true
  → 后端 /admin/contract/renew 创建新合同 + status='active'
  → 触发 PUT /admin/students/status action='rejoin'
  → 后端 service: accountStatus='0', frozen=0
  → 返回成功 → admin 列表刷新，学员行回到「正常」状态
  → 操作日志记录「学员 X 通过续签合同重新加入，新合同 Y」
```

### 13.7 DB Migration

```sql
-- 1. 加 frozen 列
ALTER TABLE osg_student ADD COLUMN frozen TINYINT DEFAULT 0 COMMENT '是否冻结（独立标记）';

-- 2. 把现有 status='1'（冻结）迁移到 status='0' + frozen=1
UPDATE osg_student
SET frozen = 1, account_status = '0'
WHERE account_status = '1';

-- 3. 操作日志（可选）
INSERT INTO osg_audit_log (action, target_id, before, after, operator, op_time)
SELECT 'frozen_split_migration', student_id, '{"accountStatus":"1"}',
       '{"accountStatus":"0","frozen":1}', 'system', NOW()
FROM osg_student WHERE frozen = 1;
```

### 13.8 前端 admin 改造点

| 文件 | 改 |
|---|---|
| `admin/views/users/students/index.vue` | 操作菜单按 §13.4 重组；状态展示按 §13.3 双 tag |
| `admin/views/users/students/columns.ts` | 状态列 customRender 输出 「正常」/「冻结」/「合同结束 · 冻结」等组合 |
| `admin/views/users/students/components/StudentDetailModal.vue` | 显示 accountStatus + frozen 两个独立字段 |
| `admin/views/users/students/components/RenewContractModal.vue` | 加可选 `reactivateAccount: true` 标记参数 |

### 13.9 chain e2e 新增（批次 8）

| Case | 验证 |
|---|---|
| CHAIN-15 合同结束·冻结叠加 | admin 把学员设为 ended → 再 freeze → 验证导师 log 课被拒；解冻后 → log 课允许 |
| CHAIN-16 退费重新加入 | admin 退费学员 → 点「重新加入」→ 续签合同弹窗 → 提交 → 学员 accountStatus 回 0 + frozen=0 → 学员能登录 + 看求职 + 导师能 log 课 |
| CHAIN-17 正常·冻结独立 | admin 把学员 freeze（不结束）→ 学员登录被拒 + 导师 log 课被拒；解冻后恢复正常 |

### 13.10 工作量估算

| 块 | 估时 |
|---|---|
| 后端 `frozen` 字段 + DB migration + entity / mapper.xml 同步 | 0.5 人日 |
| 后端 access guard 4 个点改造 + `resolveAccountStatus` 拆 action | 0.5 人日 |
| 后端 `rejoin` action 实现 + 续签合同 service 联动 | 0.5 人日 |
| admin 前端菜单结构 + 状态展示 + RenewContractModal 集成 | 0.5 人日 |
| chain e2e CHAIN-15/16/17 + 跑通 | 0.5 人日 |
| 兼容历史数据 + 回归测试 | 0.5 人日 |
| **合计** | **~3 人日** |

### 13.11 风险 & 兼容性

| 风险 | 应对 |
|---|---|
| 历史 status='1' 数据 migration 失败 / 漏迁 | migration 加 SELECT-then-UPDATE 校验 + 操作日志；可逆 |
| 既有代码隐式依赖 status='1'（grep 漏） | 已 grep 出 5 处（见 §13.5）；改后跑全量 backend test |
| 前端组件其它处显示 status=1 | grep `accountStatus.*1` 在前端 5 端全跑一遍清理 |
| 续签合同流程目前要求"既存学员有 active 合同"才允许 | rejoin 走不同路径：先校验 status=3 → 创建合同（不要求既存合同）→ 激活账号 |
| 黑名单与 frozen 重叠语义 | 维度不同：黑名单只禁求职，frozen 全禁。允许并存。|

### 13.12 i18n / 文案补丁

| key | 中文 |
|---|---|
| `student.account.frozen` | "账号已冻结，无法登录" |
| `student.account.refunded` | "账号已退费，无法登录" |
| `student.position.contract_ended` | "合同已结束，无法查看求职信息" |
| `student.position.refunded` | "账号已退费，无法查看求职信息" |
| `class_record.student.frozen` | "学员已冻结，无法上报课消" |
| `class_record.student.refunded` | "学员已退费，无法上报课消" |
| `student.rejoin.success` | "学员已通过续签合同重新加入" |

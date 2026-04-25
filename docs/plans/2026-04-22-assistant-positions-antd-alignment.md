# Assistant 端 · 岗位信息页 Ant Design 对齐方案

> 日期：2026-04-22
> 目标文件：`osg-frontend/packages/assistant/src/views/career/positions/index.vue`（当前 1285 行）
> 参考实现：`osg-frontend/packages/admin/src/views/career/positions/index.vue`（937 行）
> 约束：**组件/框架/交互对齐 admin，颜色保留 assistant 自身 tone 体系**

---

## 一、改造范围（只改一个页面）

只重写 `packages/assistant/src/views/career/positions/index.vue` 及其附属物。**不**改 shared API、不改 useIndustryMeta、不改后端。

---

## 二、保留（assistant 既有且正确的部分）

| 保留项 | 理由 |
|---|---|
| `useIndustryMeta()` 消费 `osg_company_type` 字典 | 与 admin 同路径 |
| `resolveIndustryGroupMeta()` fallback（未归类 → `slate` + `mdi-briefcase`） | 符合设计规范 |
| `categoryLabelMap`（5 种课程分类） | 助教端独有文案 |
| `getAssistantPositionDrillDown` / `getAssistantPositionStudents` API | 已修好 |
| 学员弹窗 `studentModal` + `openStudents` / `openCompanyStudents` | 助教端业务逻辑 |
| Industry tone 色系（`gold / violet / blue / amber / teal / indigo / slate`） | **不与 admin 对齐颜色**，保留 |
| `flattenIndustries` / `buildLogoText` / `formatDate` / `formatLocation` / `cycleTone` / `statusToneClass` / `displayStatusLabel` | 工具函数 |

---

## 三、新增 / 替换（框架对齐 admin）

### 3.1 新增 `PageHeader` 组件（复制 admin 版本）

新建 `packages/assistant/src/components/PageHeader.vue`，内容复制 admin 同名组件（65 行，零依赖、无 props 变动）。

### 3.2 Template 结构改造（对齐 admin）

| 原 assistant | 改造后（对齐 admin） |
|---|---|
| 自定义 `<div class="page-header">` | `<PageHeader title="岗位信息" subtitle="Job Tracker" description="追踪各大公司招聘岗位与关联学员">` |
| `<button class="btn">下钻/列表视图</button>` | `<a-radio-group v-model:value="viewMode" button-style="solid" size="small">` + 2 个 `<a-radio-button>` |
| ❌ 无统计卡片 | **新增**：4 个 `<a-card>` + `<a-statistic>`（总岗位 / 开放中 / 已关闭 / 关联学员） |
| 原生 `<select>` + `<input>` 筛选 | `<a-form layout="inline">` + `<a-form-item>` + `<a-select allow-clear show-search>` + `<a-input allow-clear>` + **搜索/重置按钮** |
| `<table class="table">` 下钻 | `<a-table :columns :data-source :pagination="false" size="small">` + 自定义 bodyCell |
| 行业 section `<article class="category-section">` 全展开 | **折叠**：`expandedIndustries` + `expandedCompanies` 两级 `Set`，点击 header toggle |
| **默认 drilldown 全展开** | **默认 list 视图**（对齐 admin，首屏直接看全量）|
| `<table class="table list-table">` list | `<a-table :columns :data-source :pagination="tablePagination" :scroll="{ x: 1400 }" @change="handleTableChange">` ← **解决"左右不能滑动"** |
| 自定义 state-card loading/empty | `<a-spin :spinning="loading">` 包裹；内部 `<a-empty description="当前筛选下暂无岗位">` |
| 底部 `page-footer-stats`（"助教学员"文案） | 保留位置，改用统一 Ant 风格；文案改"我的学员"，**新增"已关闭"指标**（对齐原型清单 #6/#7/#8） |
| 原生 `<div class="modal-backdrop">` 学员弹窗 | `<a-modal v-model:open="studentModal.visible" :footer="null" width="720">` + 内部 `<a-table>` |

### 3.3 删除

| 删除项 | 原因 |
|---|---|
| 原自定义 CSS（约 500 行 scoped style） | Ant 组件自带样式 |
| "排序" 按钮 | admin 没有、原型没有 |
| `resolveCompanyColor`（单独颜色映射） | 改用 industry tone（company logo 用 industry 的 tone color） |
| `headerStyle`（`{ background: '#f3f4f6' }` 硬编码背景） | 改用 industry tone 动态背景 |

---

## 四、关键交互行为（对齐 admin）

### 4.1 视图切换（`viewMode`）
- 默认 `'list'`（**当前 assistant 是 `'drilldown'`，这是 bug**）
- `<a-radio-group>` button-style 切换

### 4.2 Drilldown 折叠
```ts
const expandedIndustries = ref(new Set<string>())  // industry key
const expandedCompanies  = ref(new Set<string>())  // `${industry}::${companyName}` key

function toggleIndustry(key: string) { ... }
function toggleCompany(industry: string, companyName: string) { ... }
```
- **默认全部折叠**（点击 header 展开第一级；展开第一级后公司再点击展开第二级的 a-table）
- 与 admin 行为完全一致

### 4.3 List 视图分页
```ts
const tablePagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`,
})
function handleTableChange(pag: any) {
  tablePagination.current = pag.current
  tablePagination.pageSize = pag.pageSize
}
```
- **前端分页**（因 drill-down 返回全量数据，不走后端分页，与 admin 同）

### 4.4 左右滚动
- `<a-table :scroll="{ x: 1400 }">` — 列宽总和超过容器时自动出现水平滚动条

### 4.5 列定义（列表视图，共 9 列，`industry` 右移到"公司"后）
```ts
const listColumns = [
  { title: '岗位名称', dataIndex: 'positionName',     width: 280, fixed: 'left' },
  { title: '公司',     dataIndex: 'companyName',      width: 200 },
  { title: '行业',     dataIndex: 'industry',         width: 140 },
  { title: '岗位分类', dataIndex: 'positionCategory', width: 100 },
  { title: '地区',     dataIndex: 'location',         width: 140 },
  { title: '招聘周期', dataIndex: 'recruitmentCycle', width: 120 },
  { title: '发布时间', dataIndex: 'publishTime',      width: 110 },
  { title: '状态',     dataIndex: 'displayStatus',    width: 100 },
  { title: '我的学员', dataIndex: 'studentCount',     width: 110, fixed: 'right' },
]
// 总宽 = 1200 px，container < 1200 时水平滚动
```

### 4.6 列定义（下钻视图内嵌，共 8 列，无公司列）
```ts
const drilldownColumns = [
  { title: '岗位名称', dataIndex: 'positionName',     width: 260 },
  { title: '岗位分类', dataIndex: 'positionCategory', width: 100 },
  { title: '部门',     dataIndex: 'department',       width: 100 },
  { title: '地区',     dataIndex: 'location',         width: 120 },
  { title: '招聘周期', dataIndex: 'recruitmentCycle', width: 120 },
  { title: '发布时间', dataIndex: 'publishTime',      width: 110 },
  { title: '状态',     dataIndex: 'displayStatus',    width: 100 },
  { title: '我的学员', dataIndex: 'studentCount',     width: 110 },
]
```

### 4.7 统计卡片（新增，对齐 admin）
```
| 总岗位    | 开放中      | 已关闭         | 关联学员（人次）  |
| 22       | 18         | 4              | 12               |
```
- 取自 `filteredPositions` computed

---

## 五、颜色方案（**保留 assistant 的**，不对齐 admin）

保留现有 `industry-${tone}` class 体系（7 个 tone → 7 色系）：
- industry-gold（Bulge Bracket）
- industry-violet（Elite Boutique）
- industry-blue（Middle Market）
- industry-amber（Buyside）
- industry-teal（Consulting）
- industry-indigo（SWE/PM）
- industry-slate（Other/Fallback）

这些 class 用于 `<a-tag>` 的 class 覆盖 + industry header 的背景渐变。具体 CSS 放在组件 scoped style 里保留。

---

## 六、测试影响

- 现有测试：`packages/assistant/src/__tests__/career-pages.spec.ts` / `career-api-contract.spec.ts`
- 预计需要更新：`career-pages.spec.ts` 的 DOM 选择器（从 `.category-section` / `.company-section` 改为 `.positions-drilldown__industry` 等 admin 风格 class）
- **改造时一并更新测试**，保证 `pnpm --filter assistant test` 绿色

---

## 七、风险 & 回滚

- 风险 1：折叠后用户看不到全量 → 默认 list 视图（与 admin 一致），drilldown 做辅助查看
- 风险 2：大改样式可能影响 e2e 脚本 → 预留保证主要交互按 `data-*` 属性或 Ant 原生结构定位
- 回滚：单文件 `index.vue` + 新增 `PageHeader.vue`，git revert 即可完整回滚

---

## 八、实施步骤（原子）

1. **新增** `packages/assistant/src/components/PageHeader.vue`（复制 admin 同名文件）
2. **重写** `packages/assistant/src/views/career/positions/index.vue`
   - 2.1 template：PageHeader / a-radio-group / 统计卡片 / a-form 筛选 / a-spin / list 分支 / drilldown 分支 / 底部统计 / a-modal 学员弹窗
   - 2.2 script：新增 `expandedIndustries` / `expandedCompanies` / `tablePagination` / `listColumns` / `drilldownColumns` / `statsCards` / `stats` computed
   - 2.3 删除：`headerStyle` 硬编码背景、`resolveCompanyColor`、"排序"相关 ref
   - 2.4 script 保留：`useIndustryMeta`、API 调用、`studentModal`、工具函数
3. **更新测试** `career-pages.spec.ts`（如选择器失效）
4. **手动验证**：
   - 登录 assistant:3004 访问 `/career/positions`
   - 默认列表视图 ✅
   - 切换下钻 ✅，行业 header 点击折叠 ✅，公司点击折叠 ✅
   - 列表左右滑动 ✅
   - 分页切换 ✅
   - 学员弹窗 ✅
   - 控制台 0 error ✅

---

## 九、预估改动

| 指标 | 值 |
|---|---|
| 新增文件 | 1（`PageHeader.vue` 65 行） |
| 修改文件 | 1（`positions/index.vue` 约 1285 → ~900 行） |
| 测试更新 | 1（可能） |
| 工作量 | 90-120 分钟 |

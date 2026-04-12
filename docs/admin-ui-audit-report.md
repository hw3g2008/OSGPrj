# Admin 端 UI 统一审计报告

> 生成时间: 2026-04-08
> 扫描范围: `osg-frontend/packages/admin/src/views/` 下所有 index.vue（共 31 页）

## 一、风格分类

| 风格 | 数量 | 特征 | 代表页面 |
|------|------|------|----------|
| **A-NEW（目标风格）** | 6 | 原生HTML + mdi图标 + `page-title-en` + `permission-button` + 自定义CSS class | staff, students, contracts |
| **B-ANT（Ant Design）** | 6 | `<a-table>` `<a-button>` `<a-input>` + Ant 组件 | logs, menu, complaints |
| **C-RAW（原型直出）** | 9 | `page-eyebrow` + `ghost-button`/`primary-button`/`link-button` + 英文标签 | positions, settlement, files |
| **D-MIX（混合/不完整）** | 10 | 部分有mdi/en标题，但缺少统一的按钮/筛选样式 | dashboard, base-data, feedback |

## 二、逐页详情

### ✅ A-NEW — 已完成统一（6页，无需修改）

| 页面 | 行数 | 说明 |
|------|------|------|
| `users/staff` | 1467 | ✅ 标杆页面 |
| `users/students` | 2041 | ✅ 标杆页面 |
| `users/contracts` | 1023 | ✅ 标杆页面 |
| `permission/roles` | 536 | ✅ 已统一 |
| `permission/users` | 1192 | ✅ 已统一 |
| `career/job-tracking` | 618 | ✅ 已统一 |

### 🟡 B-ANT — 使用 Ant Design 组件（6页，需替换为原生风格）

| 页面 | 行数 | 修改量估计 | 说明 |
|------|------|-----------|------|
| `permission/menu` | 597 | 中 | 有 a-button/a-input，但也有 mdi 和 page-title-en（半改状态）|
| `profile/logs` | 187 | 小 | a-table + a-button + a-input，页面简单 |
| `profile/complaints` | 213 | 小 | a-table + a-button，页面简单 |
| `profile/notice` | 187 | 小 | a-table + a-button，页面简单 |
| `profile/mailjob` | 224 | 小 | a-table*2 + a-button*5，页面简单 |
| `login` | 468 | 跳过 | 登录页风格独立，不需要统一为列表页风格 |

### 🟠 C-RAW — 原型直出风格（9页，需替换 class 命名和结构）

| 页面 | 行数 | 修改量估计 | 说明 |
|------|------|-----------|------|
| `career/positions` | 1624 | 大 | 22个mdi图标已有，但用 ghost-button/link-button/primary-button |
| `finance/expense` | 377 | 中 | page-eyebrow + 17个非标按钮 |
| `finance/settlement` | 522 | 中 | page-eyebrow + 10个非标按钮 |
| `resources/files` | 275 | 小 | page-eyebrow + 12个非标按钮 |
| `resources/interview-bank` | 493 | 中 | page-eyebrow + 22个非标按钮 |
| `resources/online-test-bank` | 505 | 中 | page-eyebrow + 22个非标按钮 |
| `resources/qbank` | 280 | 小 | page-eyebrow + 11个非标按钮 |
| `resources/questions` | 568 | 中 | page-eyebrow + 20个非标按钮 |
| `teaching/all-classes` | 777 | 中 | 无eyebrow但有 ghost-button，7个mdi |

### 🔴 D-MIX — 混合/不完整风格（10页，需全面统一）

| 页面 | 行数 | 修改量估计 | 说明 |
|------|------|-----------|------|
| `career/job-overview` | 1263 | 大 | 有mdi+en标题，但缺permission-button |
| `career/mock-practice` | 894 | 大 | 有mdi+en标题，缺统一按钮 |
| `career/student-positions` | 747 | 中 | 有mdi+en标题，缺统一按钮 |
| `permission/base-data` | 601 | 中 | 有mdi但无en标题，混合ant(a-input) |
| `teaching/class-records` | 723 | 中 | 有mdi+en标题，但缺permission-button |
| `teaching/communication` | 289 | 小 | 有mdi+en标题，缺permission-button |
| `teaching/feedback` | 633 | 中 | 无en标题，大量原生表单(8 select, 9 input) |
| `teaching/reports` | 714 | 中 | 无en标题，有12个mdi |
| `users/mentor-schedule` | 750 | 中 | 有mdi但无en标题 |
| `dashboard` | 167 | 小 | 首页，风格特殊，可能需要单独设计 |

## 三、统一标准（基于 A-NEW 标杆）

以 `users/staff` 和 `users/students` 为标杆，统一标准为：

1. **页面头部**: `.page-header` > `.page-title` + `.page-title-en` + `.page-sub`
2. **操作按钮**: `.permission-button--primary` / `.permission-button--default` + mdi 图标
3. **筛选栏**: 原生 `<input>` + `<select>` + 自定义 class（`xxx-field`, `xxx-input`, `xxx-select`）
4. **数据表格**: 原生 `<table>` + 自定义 class
5. **分页**: 自定义分页组件
6. **弹窗/Modal**: 原生 dialog 或自定义 modal
7. **图标**: 统一使用 `mdi-xxx`
8. **不使用**: `<a-table>`, `<a-button>`, `<a-input>` 等 Ant Design 组件（login 页除外）
9. **不使用**: `page-eyebrow`, `ghost-button`, `primary-button`, `link-button` 等非标 class

## 四、建议修改优先级和分批计划

### 第 1 批：小页面 + 快速见效（5页，~1000行修改）
- `profile/logs` (187L) — B-ANT → A-NEW
- `profile/complaints` (213L) — B-ANT → A-NEW
- `profile/notice` (187L) — B-ANT → A-NEW
- `profile/mailjob` (224L) — B-ANT → A-NEW
- `teaching/communication` (289L) — D-MIX → A-NEW

### 第 2 批：D-MIX 中等页面（5页，~3000行修改）
- `permission/base-data` (601L)
- `permission/menu` (597L)
- `teaching/class-records` (723L)
- `teaching/reports` (714L)
- `users/mentor-schedule` (750L)

### 第 3 批：C-RAW 小中页面（5页，~2000行修改）
- `resources/files` (275L)
- `resources/qbank` (280L)
- `finance/expense` (377L)
- `resources/interview-bank` (493L)
- `resources/online-test-bank` (505L)

### 第 4 批：C-RAW + D-MIX 大页面（6页，~5000行修改）
- `finance/settlement` (522L)
- `resources/questions` (568L)
- `teaching/feedback` (633L)
- `career/student-positions` (747L)
- `teaching/all-classes` (777L)
- `career/mock-practice` (894L)

### 第 5 批：超大页面（2页，~2900行修改）
- `career/job-overview` (1263L)
- `career/positions` (1624L)

### 单独处理
- `dashboard` (167L) — 首页，布局不同于列表页，需单独设计
- `login` (468L) — 登录页，风格独立，保持现状

## 五、总量估计

- **需要修改的页面**: 25 页（排除 6 个 A-NEW + login + dashboard 可选）
- **预计总修改量**: ~12,000 行代码变更
- **预计分 5 批完成**

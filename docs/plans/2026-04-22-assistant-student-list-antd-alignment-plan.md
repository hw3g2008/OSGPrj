# 助教端 学员列表 页面 Ant Design 对齐改造计划

> **日期**: 2026-04-22
> **目标文件**: `packages/assistant/src/views/students/index.vue`（当前 813 行）
> **参考原型**: `osg-spec-docs/source/prototype/assistant.html` L1371-1458
> **参考 Admin**: `packages/admin/src/views/users/students/index.vue`
> **测试文件**: `packages/assistant/src/__tests__/student-list.spec.ts`

---

## 一、原型 vs 当前实现 差异总结

| # | 区域 | 原型设计 | 当前实现 | 偏差等级 |
|---|------|----------|----------|----------|
| 1 | 根元素 | — | `#page-student-list` | 🟡 需改 `.osg-page` |
| 2 | PageHeader | 标题+副标题+描述 | 手写 `.page-header` | 🟡 需替换 `<PageHeader>` |
| 3 | Description | `查看我教的学员和助教为我的全部学员信息及求职数据` | `查看我教的学员和助教为我的全部学员信息、服务状态与课程进度` | 🟡 文案不符 |
| 4 | 筛选: 学员类型 | `我教的学员 / 助教为我`（select） | **缺失** | 🔴 原型有，当前缺失（见偏离说明 #1） |
| 5 | 筛选: 学校 | `<input>` 文本框 | `<select>` 动态选项 | 🟡 组件类型不符 |
| 6 | 筛选: 账号状态 | **原型无此筛选** | 有（正常/冻结/已结束/退款） | 🟢 原型增强，保留 |
| 7 | 筛选组件 | 原生 input/select/button | 原生 input/select/button | 🟡 需改 Ant Design |
| 8 | 筛选按钮 | `搜索` + `重置` | `搜索` + `重置` | 🟡 文案一致，需改 Ant Design 按钮 |
| 9 | 表列: 关系 | Tag: `我教的`(蓝) / `助教为我`(靛) | **替代为「班主任」**（文本） | 🔴 见偏离说明 #2 |
| 10 | 表列: 投递 | 数字(蓝 #0284C7) | **替代为「求职辅导」**(jobCoachingCount) | 🔴 见偏离说明 #3 |
| 11 | 表列: 面试 | 数字(琥珀 #F59E0B) | **替代为「基础课」**(basicCourseCount) | 🔴 见偏离说明 #3 |
| 12 | 表列: Offer | 数字(绿 #22C55E / 灰 #6B7280) | **替代为「模拟应聘」**(mockInterviewCount) | 🔴 见偏离说明 #3 |
| 13 | 表列: 求职目标 | **原型无此列** | 有（targetPosition） | 🟢 原型增强 |
| 14 | 表列: 服务状态 | **原型无此列** | 有（合同状态/待审核/提醒） | 🟢 原型增强 |
| 15 | 表格组件 | 原生 `<table>` | 原生 `<table>` | 🟡 需改 `<a-table>` |
| 16 | 分页 | 手写按钮（共N条+上一页/页码/下一页） | 手写按钮 | 🟡 需改 `<a-pagination>` 或 table 内置分页 |
| 17 | 名字样式 | primary 色 bold | primary 色 bold | ✅ 一致 |
| 18 | 主攻方向 Tag | 彩色 Tag：咨询(蓝) / 量化(靛) | 彩色 Tag：finance/consulting/tech/quant | ✅ 基本一致 |
| 19 | 剩余课时色 | 低→danger(红), 0→muted(灰)（原型 2 档） | success/warning/muted 三档（≥8h 添加绿色） | 🟢 原型增强（多出 ≥8h 绿档） |
| 20 | localStorage 持久化 | 原型无此功能 | 有（筛选+分页状态） | 🟢 原型增强，保留 |
| 21 | CSS | — | ~360 行手写 CSS | 🟡 需精简 |

---

## 二、改造任务清单

### Phase 1: 布局与组件壳

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-1 | 根元素 `class="osg-page"` + `<PageHeader title="学员列表" subtitle="Student List" description="查看我教的学员和助教为我的全部学员信息及求职数据">` 替换手写 header（description 严格采用原型文案） | template L1-11 | 🔲 |
| SL-2 | import PageHeader 组件 + SearchOutlined / ReloadOutlined 图标 | script imports | 🔲 |

### Phase 2: 筛选

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-3 | 筛选改 Ant Design: `<a-input>` 搜索姓名 + `<a-input>` 学校（改回文本框匹配原型） + `<a-select>` 主攻方向（保持动态选项，因实际方向可能超出原型固定4项） + `<a-select>` 账号状态（原型增强保留） | template filters | 🔲 |
| SL-4 | 筛选按钮改 `<a-button>`: 「搜索」(primary, SearchOutlined) + 「重置」(text, ReloadOutlined) | template filters | 🔲 |
| SL-5 | 「学员类型」筛选暂不添加（见偏离说明 #1，后端无对应字段），保留 TODO 注释 | — | 🔲 |

### Phase 3: 表格

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-6 | 改用 `<a-table>` 替换原生 `<table>`, 使用 `:columns` + `:data-source` + `#bodyCell` slot | template table | 🔲 |
| SL-7 | 列位置对齐原型（列名差异见偏离 #2/#3）: ID→英文姓名→邮箱→班主任→学校→主攻方向→求职辅导→基础课→模拟应聘→剩余课时→账号状态→操作；额外增强列（求职目标、服务状态）插入剩余课时与账号状态之间，最终 14 列顺序: ID→英文姓名→邮箱→班主任→学校→主攻方向→求职辅导→基础课→模拟应聘→剩余课时→求职目标→服务状态→账号状态→操作 | script columns | 🔲 |
| SL-8 | bodyCell 渲染（按 SL-7 最终 14 列顺序）: ID(`<a-tag color="blue">#xxx</a-tag>`), 英文姓名(primary bold `<strong>`), 邮箱(small muted text), 班主任(文本, 空值 `待补充班主任`), 学校(文本 + `<a-tooltip>` 截断), 主攻方向(`<a-tag>` 彩色), 求职辅导/基础课/模拟应聘(彩色数字, 蓝/琥珀/绿), 剩余课时(条件色: ≥8h 绿 / <8h 红 / 0h 灰), 求职目标(文本), 服务状态(合同Tag+待审核Tag+提醒), 账号状态(`<a-tag>`), 操作(查看求职 `<a-button type="link">`) | template bodyCell | 🔲 |
| SL-9 | 使用 `<a-table>` 内置 `:pagination` 替代手写分页组件，保留分页参数与 localStorage 同步 | template + script | 🔲 |
| SL-10 | 表格 `:scroll="{ x: 'max-content' }"` 横向滚动（列较多） | template | 🔲 |
| SL-11 | 空状态: `:locale="{ emptyText: '暂无可查看学员' }"` | template | 🔲 |
| SL-12 | 错误状态: `<a-alert type="error">` 替代手写 `.state-card--error`; 加载状态: `:loading` prop | template | 🔲 |

### Phase 4: Script 适配

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-13 | columns 定义数组（TypeScript typed, 含 dataIndex / title / width / ellipsis） | script | 🔲 |
| SL-14 | 保留现有业务逻辑: formatCount, formatHours, formatMentor, formatAccountStatus, formatContractStatus, formatReminder, directionToneClass, remainingHoursToneClass 等 | script | 🔲 |
| SL-15 | 分页改 `<a-table>` pagination 格式: `{ current, pageSize, total, showTotal, onChange }`, 替代手写 goPrev/goNext | script | 🔲 |
| SL-16 | localStorage 持久化保留, 适配新分页格式 | script | 🔲 |

### Phase 5: 样式清理

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-17 | 删除手写的 `.page-header`, `.filters`, `.form-input`, `.form-select`, `.btn`, `.card`, `.table`, `.pagination`, `.pager-btn`, `.state-card` 等旧 CSS（~300 行） | style | 🔲 |
| SL-18 | 保留 / 新增必要样式: 主攻方向 Tag 色、剩余课时条件色、名字 primary 色、服务状态 stack 布局 | style | 🔲 |
| SL-19 | 响应式: 依赖 `<a-table>` 自带 scroll，删手写 `@media` 规则 | style | 🔲 |

### Phase 6: 测试 + 验证

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| SL-20 | 更新 `student-list.spec.ts` 改 source string 匹配（与 career-pages.spec.ts 一致模式） | test file | 🔲 |
| SL-21 | 验证 vue-tsc 零错误 | — | 🔲 |
| SL-22 | 验证 vitest 通过 | — | 🔲 |
| SL-23 | MCP 浏览器验证（真实接口数据） | — | 🔲 |

---

## 三、原型关键设计参考

### 3.1 筛选区域（原型 L1380-1397）

```
[ 搜索姓名 ] [ 学员类型▼ ] [ 学校 ] [ 主攻方向▼ ] [🔍 搜索] [↻ 重置]
```

学员类型选项: 我教的学员 / 助教为我
主攻方向选项: 金融 Finance / 咨询 Consulting / 科技 Tech / 量化 Quant

### 3.2 表格列（原型 L1402-1414）

| ID | 英文姓名 | 邮箱 | 关系 | 学校 | 主攻方向 | 投递 | 面试 | Offer | 剩余课时 | 账号状态 | 操作 |

### 3.3 数据样式参考（原型 L1418-1445）

- **英文姓名**: `color: var(--primary); font-weight: bold`
- **关系 Tags**:
  - 我教的: `background: #DBEAFE; color: #1D4ED8`
  - 助教为我: `background: #E0E7FF; color: #4338CA`
- **主攻方向 Tags**:
  - 咨询 Consulting: `background: #DBEAFE; color: #1D4ED8`
  - 量化 Quant: `background: #E0E7FF; color: #4338CA`
- **数字列**:
  - 投递: `color: #0284C7; font-weight: 600`
  - 面试: `color: #F59E0B; font-weight: 600`
  - Offer(有): `color: #22C55E; font-weight: 600`
  - Offer(无): `color: #6B7280`
- **剩余课时**（当前代码阈值: ≥8h 绿, 0<x<8h 红, 0h 灰）:
  - 充足(≥8h): `color: #22C55E; font-weight: 600`
  - 偏低(<8h): `color: var(--danger); font-weight: 600`（原型示例 2.5h 用此色）
  - 无(0h): `color: var(--muted)`
- **账号状态 Tags**:
  - 正常: `class="tag success"` (green)
  - 已结束: `background: #F3F4F6; color: #6B7280` (muted)

### 3.4 分页（原型 L1450-1457）

```
共 2 条记录                [上一页] [1] [下一页]
```

---

## 四、Admin 框架参考点

| 组件 | Admin 用法 | Assistant 对齐方式 |
|------|-----------|-------------------|
| PageHeader | `<PageHeader title="学员列表" subtitle="Student List" description="...">` | 相同（无 #actions slot，助教端不需要「新增学员」按钮） |
| 筛选 | Admin 用独立 `<FilterBar>` 组件 | Assistant 用内联 `<a-input>` + `<a-select>` + `<a-button>` |
| 表格 | `<a-table :columns :data-source :pagination :row-key :scroll>` + `#bodyCell` slot | 相同 |
| ID 列 | `<a-tag color="blue">#{{ record.studentId }}</a-tag>` | 相同 |
| 名字列 | `<a-button type="link">` 可点击 | Assistant 用 `<strong style="color: var(--primary)">` (不需要弹详情) |
| 邮箱列 | `<span style="color: #566178; font-size: 12px">` | 相同 |
| 主攻方向列 | `<a-tag :color="getDirectionColor(...)">` | 相同 |
| 数字列 | 彩色 bold 数字 | 相同 |
| 剩余课时 | `<strong :style="{ color: getRemainingHoursColor(...) }">` | 相同 |
| 账号状态 | `<a-tag :color="getStatusTagColor(...)">` | 相同 |
| 服务状态 | Admin 有 blacklist/contract status/review status | Assistant 简化版（合同状态+待审核+提醒） |

---

## 五、不改动项

- API 调用函数 `getAssistantStudentList` 不变
- 路由配置不变
- 后端 `OsgAssistantStudentController.java` 不变
- 数据模型 `StudentListItem` 接口不变
- 业务逻辑（筛选条件、分页、localStorage 持久化）保持现有语义
- 助教端只读原则：不包含 Admin 的「新增学员」「编辑学员」「重置密码」等管理操作
- `handleViewJob` 跳转逻辑不变

---

## 六、原型偏离说明

本方案不完全照搬原型，以下为已知偏离及原因：

### 偏离 #1: 「学员类型」筛选暂不实现

**原型设计**: 下拉筛选 `我教的学员 / 助教为我`
**实际情况**: 后端 `OsgAssistantStudentController` 仅通过 `student.setAssistantId(getUserId())` 过滤，返回的全部是「助教为我」的学员。无法区分「我教的学员」，因为:
- 后端无「关系类型」字段
- `StudentListParams` 无对应筛选参数
- 区分逻辑需后端新增查询维度

**处理**: 暂不添加该筛选，在代码中留 TODO 注释待后端支持后补充。

### 偏离 #2: 「关系」列 → 「班主任」列

**原型设计**: 「关系」列显示彩色 Tag（我教的=蓝 / 助教为我=靛）
**实际情况**: 后端返回 `leadMentorName` 但不返回关系类型，无法确定每条记录是「我教的」还是「助教为我」。
**处理**: 保留当前「班主任」列（显示 leadMentorName），作为实用替代。未来后端支持后可改为「关系」列。

### 偏离 #3: 表列 7/8/9 语义不同

| 原型列名 | 原型语义 | 当前列名 | 当前语义 | 后端字段 |
|---------|---------|---------|---------|---------|
| 投递 | 岗位申请数 | 求职辅导 | 求职辅导课次数 | jobCoachingCount |
| 面试 | 面试次数 | 基础课 | 基础课次数 | basicCourseCount |
| Offer | Offer 数量 | 模拟应聘 | 模拟应聘次数 | mockInterviewCount |

**原型的「投递/面试/Offer」是求职漏斗指标**（申请→面试→Offer），但后端返回的是**服务交付指标**（求职辅导/基础课/模拟应聘次数）。这是两套完全不同的数据。

**处理**: 保留当前列名和语义（使用后端实际返回的数据），样式沿用原型色值（蓝/琥珀/绿）。未来后端支持求职漏斗数据后可按原型列名展示。

### 原型增强项

| # | 增强项 | 理由 |
|---|--------|------|
| 1 | 「账号状态」筛选 | 原型无此筛选，但助教需快速过滤冻结/已结束学员，保留 |
| 2 | 「求职目标」列 | 原型无此列，但展示 targetPosition 对助教有实用价值 |
| 3 | 「服务状态」列 | 原型无此列，但合同状态/待审核/提醒信息对助教工作很重要 |
| 4 | 学校筛选改 `<a-input>` | 原型为 input 文本框，当前为 select 动态选项；因学校可能很多且不可枚举，改回 `<a-input>` 匹配原型更合理 |
| 5 | localStorage 筛选持久化 | 原型无此功能，保留（用户体验增强） |
| 6 | ID 列 `<a-tag>` 包裹 | 原型 ID 为纯文本，但 Admin 统一用 `<a-tag color="blue">` 包裹，对齐 Admin 风格 |

---

## 七、最终列结构（14 列）

| # | 列名 | dataIndex | 来源 | 渲染 | 备注 |
|---|------|-----------|------|------|------|
| 1 | ID | studentId | 后端 | `<a-tag color="blue">#xxx</a-tag>` | **原型增强**: 原型为纯文本，对齐 Admin 风格 |
| 2 | 英文姓名 | studentName | 后端 | `<strong style="color: var(--primary)">` | |
| 3 | 邮箱 | email | 后端 | small muted text | |
| 4 | 班主任 | leadMentorName | 后端 | 文本, 空值显示 `待补充班主任` | 原型为「关系」, 见偏离 #2 |
| 5 | 学校 | school | 后端 | 文本, `<a-tooltip>` 截断 | |
| 6 | 主攻方向 | majorDirection | 后端 | `<a-tag :color>` 彩色 | |
| 7 | 求职辅导 | jobCoachingCount | 后端 | `color: #0284C7; font-weight: 700` | 原型为「投递」, 见偏离 #3 |
| 8 | 基础课 | basicCourseCount | 后端 | `color: #F59E0B; font-weight: 700` | 原型为「面试」, 见偏离 #3 |
| 9 | 模拟应聘 | mockInterviewCount | 后端 | `color: #22C55E; font-weight: 700` | 原型为「Offer」, 见偏离 #3 |
| 10 | 剩余课时 | remainingHours | 后端 | 条件色: ≥8h 绿, >0 红(danger), 0 灰(muted) | |
| 11 | 求职目标 | targetPosition | 后端 | 文本 | **原型增强** |
| 12 | 服务状态 | contractStatus+ | 后端 | 合同Tag + 待审核Tag + 提醒文本 | **原型增强** |
| 13 | 账号状态 | accountStatus | 后端 | `<a-tag>` 正常(green)/冻结(blue)/已结束(gray)/退款(gray) | |
| 14 | 操作 | — | — | `<a-button type="link">查看求职</a-button>` | |

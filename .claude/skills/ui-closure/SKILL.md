---
name: ui-closure
description: "通用独立 UI 收口引擎 — 对任意模块执行 UI 还原与视觉验证，不依赖 RPIV 工作流"
metadata:
  invoked-by: "command"
  auto-execute: "true"
---

# UI Closure Engine

## 概览

独立 UI 收口引擎。给定一个模块的原型文件 + zone 定义 YAML，对该模块执行完整的 UI 还原比对、修复与验证。

不依赖 STATE.yaml / config.yaml / RPIV 工作流状态。Zone YAML 是唯一输入。

## 真源声明（SSOT）

**HTML 原型是 UI 的唯一真源。**

- `osg-spec-docs/source/prototype/{module}.html` 是所有 UI 元素的最终权威
- PRD / MATRIX / UI-VISUAL-CONTRACT / DELIVERY-CONTRACT 都是**派生产物**，不得超前于 HTML 真源
- 如果派生产物声明了 HTML 中不存在的页面或 surface，必须视为**真源链错误**，先修正派生产物
- 不允许把当前 Vue 实现结果、视觉基线或手工补写的契约当作第二真源
- 所有比对、修复、验证的参照物只有一个：HTML 原型文件中的精确行号范围

## 架构

```
┌─────────────────────────────────────────────────┐
│              ui-closure 引擎                      │
│                                                   │
│  Layer 1: Zone 发现（Phase 0）                    │
│    └─ 读取 zones/{module}.yaml                    │
│       → 自动获取原型文件、zone 列表、页面映射      │
│                                                   │
│  Layer 2: Zone 执行（Phase 1-5，Agent 并行）      │
│    └─ 对每个 zone 分派独立 Agent 执行 5-Phase     │
│                                                   │
│  Layer 3: Module 收口（Phase 6-9）                │
│    └─ build + RPIV UI gate + 语义级验证           │
└─────────────────────────────────────────────────┘
```

## 用法

```bash
/ui-closure admin                              # 全模块收口（所有 zone 并行）
/ui-closure admin --zone users                 # 单 zone 全部页面
/ui-closure admin --zone users,career          # 多 zone 收口
/ui-closure admin --zone profile:logs          # profile zone 下只跑 logs 页面
/ui-closure admin --zone profile:logs,notice   # profile zone 下跑 logs + notice
/ui-closure admin --mode module                # 仅跑模块级验证（所有 zone 已完成后）
```

### `--zone` 参数语法

```
--zone <zone_id>[:<page_id>[,<page_id>...]][,<zone_id>[:<page_id>...]]
```

| 示例 | 含义 |
|------|------|
| `users` | users zone 全部页面 + 全部 modal |
| `profile:logs` | profile zone 下只跑 logs 页面 + logs 关联的 modal |
| `profile:logs,notice` | profile zone 下跑 logs + notice + 关联 modal |
| `users,career` | users 全部 + career 全部 |
| `users,profile:logs` | users 全部 + profile 只跑 logs |

**页面级过滤规则：**
- 指定 `zone:page` 时，只读取/比对/修复/验证该页面的 Vue 文件
- Modal 自动收窄：只验证与指定页面关联的 modal（通过 prototype_lines 范围重叠判定）
- Phase 4 验证只针对指定页面（表格列、Tab、状态标签等）
- 不指定 `:page` 则为整个 zone（向后兼容）

## 执行流程

```
Layer 1: Zone 发现
  → 读取 zones/{module}.yaml，验证原型文件

Layer 2: Agent Team 并行执行
  → 创建 Agent Team，每个 zone 一个 teammate
  → 共享任务列表，teammate 自行认领并执行 Phase 1-5
  → teammate 之间可直接通信（发现跨 zone 问题时）
  → Lead 等待所有 teammate 完成

Layer 3: Module 收口
  → Lead 执行 Phase 7-9（build + RPIV gate + 语义验证）
```

编排者（Lead）执行步骤：

1. 读取 zone YAML，确定 target_zones
2. 解析 `--zone` 参数：
   - `profile` → zone=profile, pages=全部
   - `profile:logs` → zone=profile, pages=[logs]
   - `profile:logs,notice` → zone=profile, pages=[logs, notice]
3. 用自然语言 prompt 创建 Agent Team，描述任务和团队结构
4. 为每个 zone（或 zone:page 组合）创建任务到共享任务列表
5. Teammate 自行认领任务并执行 Phase 1-5（仅针对指定页面）
6. Lead 等待所有 teammate 完成
7. 全模块模式下，Lead 执行 Module 收口（Phase 7-9）

## Layer 1: Zone 发现（Phase 0）

```python
def discover(module):
    zone_file = f".claude/skills/ui-closure/zones/{module}.yaml"
    if not exists(zone_file):
        STOP(f"模块 '{module}' 未定义。请在 zones/ 下创建 {module}.yaml")

    zones_def = load_yaml(zone_file)
    prototype_file = zones_def.prototype_file
    if not exists(prototype_file):
        STOP(f"原型文件不存在: {prototype_file}")

    # 可选：检测 UI-VISUAL-CONTRACT（增强验证，不强制）
    contract_path = f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml"
    contract = load_yaml(contract_path) if exists(contract_path) else None

    # 可选：检测 DELIVERY-CONTRACT（增强验证，不强制）
    delivery_path = f"osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml"
    delivery = load_yaml(delivery_path) if exists(delivery_path) else None

    return zones_def, prototype_file, contract
```

## Layer 2: Zone 执行（Phase 1-5）— Agent Team 模式

使用 Claude Code 官方 Agent Teams 功能（需 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）。

Lead（执行 `/ui-closure` 的 Claude）通过自然语言 prompt 创建 team，每个 zone 分配一个 teammate。Teammate 之间共享任务列表、可直接通信。

### 创建 Agent Team 的 Prompt

Lead 在完成 Phase 0（Zone 发现）后，用以下自然语言创建 team：

**全模块模式（`/ui-closure admin`）：**

```
创建一个 agent team 来并行执行 admin 模块的 UI 收口。

根据 zone 定义文件 .claude/skills/ui-closure/zones/admin.yaml，
原型文件为 osg-spec-docs/source/prototype/admin.html。

分派 {N} 个 teammate，每人负责一个 zone：
- teammate "users": 负责用户中心（4 页面 7 弹窗）
- teammate "career": 负责求职中心（5 页面 11 弹窗）
- teammate "teaching": 负责教学中心（5 页面 9 弹窗）
- teammate "profile": 负责个人中心（4 页面 3 弹窗）

每个 teammate 使用 Sonnet 模型。
要求 plan approval —— teammate 完成 Phase 2 比对后先提交比对报告给 Lead 审批，
审批通过后再执行 Phase 3 修复。

每个 teammate 的具体任务见下方共享任务列表。
```

**指定 zone 模式（`/ui-closure admin --zone users,career`）：**

```
创建一个 agent team 来并行执行 admin 模块的 UI 收口。
只处理以下 zone：users, career。

分派 2 个 teammate：
- teammate "users": 负责用户中心
- teammate "career": 负责求职中心

（其余同上）
```

### Teammate Spawn Prompt

每个 teammate 被 spawn 时收到的 prompt（Lead 在创建 team 时指定）：

```markdown
你是 UI 收口 teammate，负责 {module} 模块的 **{zone.name}** zone。

你的工作是将该 zone 所有页面的 Vue 实现严格对齐 HTML 原型。
HTML 原型是唯一真源（SSOT），PRD/CONTRACT/当前实现都不能作为比对基准。

请严格按 Phase 1 → 2 → 3 → 4 → 5 顺序执行。
Phase 2 完成后，将比对报告发送给 Lead 等待审批，审批通过后再执行 Phase 3。

Zone 定义文件: .claude/skills/ui-closure/zones/{module}.yaml
原型文件: {prototype_file}

{完整的 Phase 1-5 指令，见下方 Zone Agent Prompt 模板}
```

### Zone Agent Prompt 模板

```markdown
## 任务：{zone.name} UI 收口

你是 frontend-admin agent，负责将 {module} 模块的 **{zone.name}** 所有页面的 Vue 实现严格对齐 HTML 原型。

### Phase 1: 原型读取

逐页面读取原型 HTML（精确行号范围）+ 关联 modal HTML。

真实来源 (SSOT): `{prototype_file}`

页面范围：
{for page in zone.pages}
- **{page.label}** ({page.page_id}): 行 {page.prototype_lines[0]}-{page.prototype_lines[1]}
  Vue 文件: {page.vue_files}
{endfor}

Modal 范围：
{for modal in zone.modals}
- **{modal.label}** ({modal.modal_id}): 行 {modal.prototype_lines[0]}-{modal.prototype_lines[1]}
{endfor}

Vue 文件根目录: `{zone.vue_dir}`

### Phase 2: Vue 比对

逐页面读取 Vue 文件，与原型 HTML 逐元素严格比对。以下每一项都必须检查：

**2a. 表格审计**
- 列数是否一致
- 列名（表头文字）是否一致、顺序是否一致
- 列宽比例是否合理
- 可排序列标记是否一致
- 操作列按钮文字、数量、顺序

**2b. 筛选条件审计**
- 搜索框：placeholder 文字、位置、宽度（原型 style width）
- 下拉框：选项文字、默认值、宽度
- 日期选择器：类型（date / daterange）、placeholder
  - 组件映射：原型两个 `<input type="date">` + `~` → `<a-range-picker>` 是合规的
- 筛选条件排列顺序（左→右）
- 筛选栏间距（原型 gap 值）
- 重置/搜索按钮文字

**2c. 按钮审计**
- 按钮文字完全匹配原型
- 按钮类型（primary / default / danger / link）
  - 组件映射：原型 `btn-outline` → `<a-button>` (default) 是合规的
- 按钮位置（页头右侧 / 表格操作列 / Modal 底部）
- 按钮图标（如有）
- 按钮禁用/启用状态逻辑

**2d. Tab 审计**
- Tab 数量一致
- Tab 名称文字完全匹配
- Tab 顺序一致
- 默认激活 Tab

**2e. Modal / 弹窗审计（逐个 modal_id）**
- Modal 标题文字
- 表单字段数量、顺序
- 每个字段：标签文字、输入类型（input/select/textarea/datepicker/radio/checkbox）
- 必填标记（*）是否一致
- placeholder 文字
- 下拉选项文字
- Modal 底部按钮（确定/取消/其他）文字和顺序
- Modal 宽度（如原型有指定）

**2f. 状态标签 / Badge 审计**
- 标签文字完全匹配
- 标签颜色与原型 class 映射：
  - `.badge-success` / `green` → `<a-tag color="success">` 或 `color="green"`
  - `.badge-warning` / `orange` → `<a-tag color="warning">` 或 `color="orange"`
  - `.badge-danger` / `red` → `<a-tag color="error">` 或 `color="red"`
  - `.badge-info` / `blue` → `<a-tag color="processing">` 或 `color="blue"`
  - `.badge-default` / `gray` → `<a-tag>` 或 `color="default"`
- 所有状态值都有对应标签（多状态全覆盖）

**2g. 颜色 Token 审计**
- 所有颜色必须引用主题 Token 或 SCSS 变量，禁止硬编码 hex/rgb
- 主色 `#3b82f6` → `@primary-color` 或 `token.colorPrimary`
- 成功色 `#22c55e` → `@success-color` 或 `token.colorSuccess`
- 警告色 `#f97316` → `@warning-color` 或 `token.colorWarning`
- 危险色 `#ef4444` → `@error-color` 或 `token.colorError`
- 背景色、边框色、文字色均需引用 Token
- 检查 `<style>` 中是否有硬编码颜色值

**2h. 统计卡片审计**
- 卡片数量一致
- 卡片标题文字
- 卡片图标（如有）
- 卡片数值格式

**2i. 分页组件审计**
- 分页组件是否存在
- 位置（底部居右）
- 是否显示总条数
- 每页条数选项

**2j. 空状态审计**
- 空数据时是否显示空状态组件
- 空状态文字

**2k. 尺寸与间距审计**
- 输入框宽度：原型 `style="width:Npx"` → Vue 对应 CSS class 或 inline style 宽度一致
- 下拉框宽度：同上
- 筛选栏间距：原型 `gap:12px` → Vue flex gap 一致
- 表格外层 card padding：原型 `padding:0` → Vue `:body-style="{ padding: 0 }"`
- Modal 宽度：原型 `max-width:Npx` → Vue `:width="N"`
- 页面整体间距（page header 与 filter bar 之间、filter bar 与 table 之间）

**2l. 排版与字体审计**
- 页面标题：字号、字重（原型 `<h1>` → Vue `<h1>` 或对应样式）
- 页面副标题：字号、颜色
- 表格内文字：加粗列（原型 `<strong>` → Vue `<strong>`）
- 表格操作列按钮：link 类型、size=small

**2m. 组件外形审计**
- 输入框圆角：Ant Design 默认圆角与原型方角的差异记录为**已知映射差异**，不视为 FAIL
- 按钮圆角：同上
- 卡片边框：原型 `.card` → Vue `<a-card :bordered="true">`
- 卡片阴影：原型有无 box-shadow → Vue 对应
- Tag/Badge 圆角：Ant Design `<a-tag>` 默认样式，记录为已知映射差异

**2n. 组件映射差异声明**
以下差异属于 HTML 原型 → Ant Design Vue 的标准组件映射，不视为 FAIL：
- 原型方角 input → Ant Design 圆角 `<a-input>`（框架默认）
- 原型 `btn-outline` → `<a-button>` default 类型
- 原型两个 `<input type="date">` + `~` → `<a-range-picker>`
- 原型 `.tag` → `<a-tag>`（圆角、padding 差异为框架默认）
- 原型 `.table` → `<a-table>`（行高、hover 效果为框架默认）
- 原型 `.modal` → `<a-modal>`（动画、遮罩为框架默认）
- 原型 `.pagination` → `<a-pagination>`（样式为框架默认）

这些映射差异在 Phase 5 报告中必须**显式列出**，标记为 `MAPPED`（非 PASS 非 FAIL）。

### Phase 3: 修复

修改 Vue 文件对齐原型。每个变更必须记录：
- 改了什么
- 对应的原型行号
- 修改原因

### Phase 4: Zone 级验证

**4a. Lint 检查**
`{zones_def.lint_command}`
失败则尝试自动修复，仍失败则 zone FAIL。

**4b. Modal 全覆盖验证（硬阻塞）**
逐个检查 zone.modals 中定义的每个 modal_id：
- Vue 中是否有对应的 `<a-modal>` 组件实现
- Modal 标题文字是否与原型一致
- 表单字段数量是否与原型一致
- 每个字段的标签文字、输入类型是否与原型一致
- Modal 底部按钮文字是否与原型一致
缺失任何一个 modal → zone FAIL。

**4c. 表格列一致性验证（硬阻塞）**
对 zone 中每个包含表格的页面：
- 从原型 HTML 提取 `<th>` 列表
- 从 Vue 提取 `columns` 定义
- 比对：列数、列名、列顺序必须完全一致
不一致 → zone FAIL。

**4d. Tab 一致性验证（硬阻塞）**
对 zone 中每个包含 Tab 的页面：
- 从原型 HTML 提取 tab 名称列表
- 从 Vue 提取 `<a-tab-pane>` 或 `items` 定义
- 比对：Tab 数量、名称、顺序必须完全一致
不一致 → zone FAIL。

**4e. 颜色 Token 合规检查（硬阻塞）**
扫描 zone 内所有 Vue 文件的 `<style>` 块：
- 检测硬编码颜色值（#xxx, #xxxxxx, rgb(), rgba()）
- 白名单：`#fff`, `#ffffff`, `#000`, `#000000`, `transparent`, `inherit`
- 其余硬编码颜色 → zone FAIL，列出违规文件和行号

**4f. 状态标签全覆盖验证**
对 zone 中每个有状态标签的页面/弹窗：
- 从原型提取所有状态值（如：正常/冻结/黑名单）
- 从 Vue 提取状态→颜色映射
- 每个状态值必须有对应的 `<a-tag>` 且颜色正确
缺失状态 → zone FAIL。

**4g. 逐页面视觉验证（CONTRACT 存在时）**
`bash bin/ui-visual-case-verify.sh {module} {page_id}`
失败记录 FAIL，继续其他页面。

**4h. Surface 缺口告警（advisory，不阻塞）**
检查 zone 中的页面/弹窗是否在 UI-VISUAL-CONTRACT 中有对应 surface 定义。
缺失时输出告警，不阻塞。

### Phase 5: Zone 报告

**强制输出规则：以下每个表格/清单都必须输出，缺任何一项 → zone FAIL。**
**每项必须包含"原型值"和"Vue 值"的精确对比，不允许只写 PASS/FAIL 而不列出实际值。**

#### 5.1 表格列矩阵（对应 2a）

| page_id | 原型列 | Vue 列 | 匹配 | 状态 |
|---------|--------|--------|------|------|
| logs | 时间,操作人,角色,操作类型,操作内容,IP地址 | 时间,操作人,角色,操作类型,操作内容,IP地址 | ✓ | PASS |

#### 5.2 筛选条件矩阵（对应 2b）

| page_id | 组件 | 原型值 | Vue 值 | 状态 |
|---------|------|--------|--------|------|
| logs | 搜索框 placeholder | "搜索操作人/内容..." | "搜索操作人/内容..." | PASS |
| logs | 搜索框宽度 | 200px | class="filter-input" (200px) | PASS |
| logs | 类型下拉选项 | 登录/新增/修改/删除 | 登录/新增/修改/删除 | PASS |
| logs | 类型下拉宽度 | 120px | class="filter-select" (120px) | PASS |
| logs | 日期选择器 | 2×date input + "~" | a-range-picker | MAPPED |
| logs | 筛选栏间距 | gap:12px | gap:12px | PASS |
| logs | 筛选栏排列顺序 | 搜索→类型→日期→按钮 | 搜索→类型→日期→按钮 | PASS |

#### 5.3 按钮矩阵（对应 2c）

| page_id | 位置 | 原型文字 | 原型类型 | Vue 文字 | Vue 类型 | 状态 |
|---------|------|---------|---------|---------|---------|------|
| logs | 页头右侧 | 导出日志 | outline | 导出日志 | default | MAPPED |

#### 5.4 Tab 矩阵（对应 2d）

| page_id | 原型 Tab | Vue Tab | 状态 |
|---------|---------|---------|------|
| logs | 无 | 无 | N/A |

#### 5.5 Modal 覆盖矩阵（对应 2e）

| modal_id | 原型行号 | Vue 实现 | 标题 | 字段数 | 底部按钮 | 状态 |
|----------|---------|---------|------|--------|---------|------|

（无关联 modal 时输出空表 + "N/A"）

#### 5.6 状态标签矩阵（对应 2f）

| page_id | 标签文字 | 原型 class | 期望颜色 | Vue 颜色 | 状态 |
|---------|---------|-----------|---------|---------|------|
| logs | 登录 | tag info | processing | processing | PASS |
| logs | 新增 | tag success | success | success | PASS |
| logs | 修改 | tag warning | warning | warning | PASS |
| logs | 删除 | — | error | error | PASS |
| logs | Admin | tag purple | purple | purple | PASS |
| logs | Clerk | tag (default) | default | default | PASS |

#### 5.7 颜色 Token 合规（对应 2g）

| 文件 | 硬编码颜色 | 行号 | 状态 |
|------|-----------|------|------|
| logs/index.vue | 无 | — | PASS |

（列出每个 Vue 文件，无硬编码则标 PASS，有则列出具体值和行号）

#### 5.8 统计卡片矩阵（对应 2h）

| page_id | 原型卡片数 | Vue 卡片数 | 状态 |
|---------|-----------|-----------|------|
| logs | 0 | 0 | N/A |

#### 5.9 分页组件（对应 2i）

| page_id | 原型有分页 | Vue 有分页 | 状态 |
|---------|-----------|-----------|------|
| logs | 无 | 无 | N/A |

#### 5.10 空状态（对应 2j）

| page_id | 原型有空状态 | Vue 有空状态 | 状态 |
|---------|------------|------------|------|
| logs | 未定义 | 未实现 | WARN |

#### 5.11 尺寸与间距矩阵（对应 2k）

| page_id | 元素 | 原型值 | Vue 值 | 状态 |
|---------|------|--------|--------|------|
| logs | 搜索框宽度 | 200px | 200px | PASS |
| logs | 下拉框宽度 | 120px | 120px | PASS |
| logs | 筛选栏 gap | 12px | 12px | PASS |
| logs | card padding | 0 | { padding: 0 } | PASS |

#### 5.12 排版与字体矩阵（对应 2l）

| page_id | 元素 | 原型 | Vue | 状态 |
|---------|------|------|-----|------|
| logs | 页面标题 | `<h1>` 操作日志 | `<h1>` 操作日志 | PASS |
| logs | 副标题 | 查看系统操作记录 | 查看系统操作记录 | PASS |
| logs | 表格加粗列 | 操作人 `<strong>` | 操作人 `<strong>` | PASS |

#### 5.13 组件外形矩阵（对应 2m）

| 元素 | 原型外形 | Vue 外形 | 状态 |
|------|---------|---------|------|
| 输入框圆角 | 方角 | Ant Design 圆角 | MAPPED |
| 卡片边框 | .card | `<a-card :bordered="true">` | PASS |
| Tag 圆角 | .tag | `<a-tag>` | MAPPED |

#### 5.14 组件映射差异清单（对应 2n）

| 原型组件 | Vue 组件 | 差异类型 |
|---------|---------|---------|
| 2×`<input type="date">` + `~` | `<a-range-picker>` | 框架标准映射 |
| `.btn-outline` | `<a-button>` default | 框架标准映射 |
| 方角 `.form-input` | 圆角 `<a-input>` | 框架默认样式 |
| `.tag` | `<a-tag>` | 框架默认样式 |
| `.table` | `<a-table>` | 框架默认样式 |

**此清单必须显式列出所有 MAPPED 项。未列出的差异视为遗漏。**

#### 5.15 页面级变更清单

每个修改必须记录：改了什么 + 对应原型行号 + 修改原因。
无修改时输出："无变更（0 处修改）"。

#### 5.16 Lint 结果

PASS / FAIL（单页面模式可跳过全模块 lint，但必须声明）

#### 5.17 最终结论

```
zone:page 结论: PASS / FAIL / PARTIAL
PASS 项: N 项
FAIL 项: N 项
MAPPED 项: N 项（框架映射差异，非 FAIL）
WARN 项: N 项（告警，不阻塞）
N/A 项: N 项
```

### 组件映射表

{zones_def.component_map 内容}

### 硬约束

1. 不得修改 zone 外的文件
2. 不得新建文件，只修改已有 Vue 文件
3. 不得修改路由/权限/API 逻辑
4. 每个变更必须有原型行号出处
5. 所有颜色引用主题 Token，禁止硬编码色值
```

### Agent Team 协调机制

**共享任务列表：**

Lead 为每个 zone 创建任务，teammate 自行认领：

```
任务列表（admin 全模块）：
1. [pending] users zone: 用户中心 UI 收口（4 页面 7 弹窗）
2. [pending] career zone: 求职中心 UI 收口（5 页面 11 弹窗）
3. [pending] teaching zone: 教学中心 UI 收口（5 页面 9 弹窗）
4. [pending] profile zone: 个人中心 UI 收口（4 页面 3 弹窗）
5. [pending] module closure: 模块级收口验证（blocked by 1,2,3,4）
```

任务 5 依赖任务 1-4 全部完成，由 Lead 执行。

**Teammate 间通信场景：**

- 发现跨 zone 的共享组件问题 → 广播给其他 teammate
- 发现原型行号范围有重叠 → 直接 message 相关 teammate 协调
- 某个 zone 提前完成 → 自动认领下一个未分配任务

**Plan Approval 流程：**

```
Teammate 执行 Phase 1-2（读取 + 比对）
  ↓
Teammate 提交比对报告给 Lead
  ↓
Lead 审批：
  - 通过 → Teammate 继续 Phase 3-5（修复 + 验证 + 报告）
  - 驳回 + 反馈 → Teammate 修正比对后重新提交
```

审批标准：比对报告必须包含每个页面/弹窗的差异清单 + 原型行号。

**Team 生命周期：**

```
Lead 创建 team → Teammate spawn → 认领任务 → 执行 Phase 1-5
  → 所有 teammate 完成 → Lead 执行 Module 收口（Phase 7-9）
  → Lead 清理 team
```

### 指定多个 zone 的行为

| 命令 | Teammate 数 | 行为 |
|------|------------|------|
| `/ui-closure admin` | N（YAML 中所有 zone） | N 个 teammate 并行 + Module 收口 |
| `/ui-closure admin --zone users` | 1 | users 全部页面 + 无 Module 收口 |
| `/ui-closure admin --zone users,career` | 2 | 2 个 teammate 并行 + 无 Module 收口 |
| `/ui-closure admin --zone profile:logs` | 1 | profile zone 只跑 logs 页面 + 无 Module 收口 |
| `/ui-closure admin --zone profile:logs,notice` | 1 | profile zone 跑 logs+notice + 无 Module 收口 |
| `/ui-closure admin --zone users,profile:logs` | 2 | users 全部 + profile 只跑 logs |
| `/ui-closure admin --mode module` | 0 | 跳过 zone，Lead 直接跑 Phase 7-9 |

## Layer 3: Module 收口（Phase 6-9）

继承 RPIV 框架的收口标准 + ui-closure 自有的语义级验证。

```python
def module_closure(module, zones_def):
    audit_dir = "osg-spec-docs/tasks/audit"
    date = today()
    contract_path = f"osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml"
    delivery_path = f"osg-spec-docs/docs/01-product/prd/{module}/DELIVERY-CONTRACT.yaml"

    # ─── Phase 6: 校验所有 Zone 通过 ───
    # 如果是全模块模式，zone 结果已在 Layer 2 汇总
    # 任何 zone FAIL → STOP

    # ─── Phase 7: Full Build + Lint ───
    build_cmd = zones_def.get("build_command",
        f"pnpm --dir osg-frontend/packages/{module} build")
    result = Bash(build_cmd)
    if result.exit_code != 0:
        STOP("Build 失败")

    lint_cmd = zones_def.get("lint_command", "cd osg-frontend && pnpm lint")
    Bash(lint_cmd)

    # ─── Phase 8: RPIV UI Gate（继承 final-gate） ───

    # 8a. UI Visual Gate（核心 — final-gate Step 4.5）
    if exists(contract_path):
        Bash(f"bash bin/ui-visual-gate.sh {module}")
    else:
        warn("UI-VISUAL-CONTRACT 不存在，跳过 visual gate")

    # 8b. UI Critical Evidence Guard（final-gate Step 4.6）
    if exists(contract_path):
        page_report = f"{audit_dir}/ui-visual-page-report-{module}-{date}.json"
        Bash(f"python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py "
             f"--contract {contract_path} "
             f"--page-report {page_report} "
             f"--stage final-gate")

    # 8c. Delivery Truth Guard（final-gate Step 0.16）— 必须执行
    Bash(f"python3 .claude/skills/workflow-engine/tests/delivery_truth_guard.py "
         f"--module {module} "
         f"--stage final-gate")

    # 8d. Delivery Content Guard（final-gate Step 0.16b）— 必须执行
    if exists(delivery_path):
        Bash(f"python3 .claude/skills/workflow-engine/tests/delivery_content_guard.py "
             f"--contract {delivery_path} "
             f"--stage final-gate")

    # 8e. Prototype Derivation Consistency Guard（final-gate Step 0.16c）
    module_dir = f"osg-spec-docs/docs/01-product/prd/{module}"
    Bash(f"python3 .claude/skills/workflow-engine/tests/prototype_derivation_consistency_guard.py "
         f"--module-dir {module_dir}")

    # 8f. Menu Route View Guard（final-gate Step 0.5）
    Bash(f"python3 .claude/skills/workflow-engine/tests/menu_route_view_guard.py "
         f"--module {module} --stage final-gate")

    # 8g. Permission Code Consistency Guard（final-gate Step 0.6）
    Bash(f"python3 .claude/skills/workflow-engine/tests/permission_code_consistency_guard.py "
         f"--module {module} --stage final-gate")

    # ─── Phase 9: ui-closure 语义级验证（框架增强） ───

    # 9a. 全模块 Modal 覆盖率验证
    #     汇总所有 zone 的 modal 定义，逐个检查 Vue 实现
    all_modals = collect_all_modals(zones_def)
    for modal in all_modals:
        vue_file = find_modal_vue(modal, zones_def)
        if not vue_file:
            FAIL(f"Modal {modal.modal_id} ({modal.label}) 无 Vue 实现")
        # 读取原型 modal HTML
        proto_html = read_lines(zones_def.prototype_file,
                                modal.prototype_lines[0], modal.prototype_lines[1])
        # 提取字段数、标题、按钮
        proto_fields = extract_form_fields(proto_html)
        vue_fields = extract_vue_form_fields(vue_file)
        if len(proto_fields) != len(vue_fields):
            FAIL(f"Modal {modal.modal_id}: 原型 {len(proto_fields)} 字段, "
                 f"Vue {len(vue_fields)} 字段")

    # 9b. 全模块表格列一致性验证
    for zone in zones_def.zones:
        for page in zone.pages:
            proto_html = read_lines(zones_def.prototype_file,
                                    page.prototype_lines[0], page.prototype_lines[1])
            proto_columns = extract_table_columns(proto_html)
            if proto_columns:  # 页面有表格
                vue_columns = extract_vue_columns(zone.vue_dir, page.vue_files)
                assert_columns_match(page.page_id, proto_columns, vue_columns)

    # 9c. 全模块颜色 Token 合规扫描
    for zone in zones_def.zones:
        for vue_file in glob(f"{zone.vue_dir}/**/*.vue"):
            style_block = extract_style_block(vue_file)
            hardcoded = find_hardcoded_colors(style_block,
                whitelist=["#fff", "#ffffff", "#000", "#000000",
                           "transparent", "inherit", "currentColor"])
            if hardcoded:
                FAIL(f"{vue_file}: 硬编码颜色 {hardcoded}")

    # 9d. 全模块状态标签全覆盖验证
    for zone in zones_def.zones:
        for page in zone.pages:
            proto_html = read_lines(zones_def.prototype_file,
                                    page.prototype_lines[0], page.prototype_lines[1])
            proto_tags = extract_status_tags(proto_html)
            if proto_tags:
                vue_tags = extract_vue_status_tags(zone.vue_dir, page.vue_files)
                for tag in proto_tags:
                    if tag.text not in vue_tags:
                        FAIL(f"Page {page.page_id}: 状态标签 '{tag.text}' 缺失")
                    if vue_tags[tag.text].color != expected_color(tag.css_class):
                        FAIL(f"Page {page.page_id}: 状态标签 '{tag.text}' "
                             f"颜色不匹配 (期望 {expected_color(tag.css_class)}, "
                             f"实际 {vue_tags[tag.text].color})")

    # 9e. 全模块 Tab 一致性验证
    for zone in zones_def.zones:
        for page in zone.pages:
            proto_html = read_lines(zones_def.prototype_file,
                                    page.prototype_lines[0], page.prototype_lines[1])
            proto_tabs = extract_tabs(proto_html)
            if proto_tabs:
                vue_tabs = extract_vue_tabs(zone.vue_dir, page.vue_files)
                assert_tabs_match(page.page_id, proto_tabs, vue_tabs)

    # ─── 输出模块收口报告 ───
    report_module_result(module)
```

### Module 收口 Gate 清单

#### Phase 7: 构建验证

| # | Gate | 来源 | 阻塞级别 |
|---|------|------|----------|
| 7a | Build | final-gate Step 6 | 硬阻塞 |
| 7b | Lint | — | 硬阻塞 |

#### Phase 8: RPIV UI Gate（继承 final-gate）

| # | Gate | 来源 | 阻塞级别 |
|---|------|------|----------|
| 8a | ui-visual-gate.sh | final-gate Step 4.5 | CONTRACT 存在时硬阻塞 |
| 8b | ui_critical_evidence_guard | final-gate Step 4.6 | CONTRACT 存在时硬阻塞 |
| 8c | delivery_truth_guard | final-gate Step 0.16 | **必须执行** |
| 8d | delivery_content_guard | final-gate Step 0.16b | DELIVERY-CONTRACT 存在时硬阻塞 |
| 8e | prototype_derivation_consistency_guard | final-gate Step 0.16c | 硬阻塞 |
| 8f | menu_route_view_guard | final-gate Step 0.5 | 硬阻塞 |
| 8g | permission_code_consistency_guard | final-gate Step 0.6 | 硬阻塞 |

#### Phase 9: ui-closure 语义级验证（框架增强，RPIV 无此层）

| # | Gate | 检查内容 | 阻塞级别 |
|---|------|---------|----------|
| 9a | Modal 全覆盖 | 每个 modal_id 有 Vue 实现 + 字段数一致 + 标题一致 | 硬阻塞 |
| 9b | 表格列一致性 | 列数、列名、列顺序与原型 HTML 完全一致 | 硬阻塞 |
| 9c | 颜色 Token 合规 | `<style>` 中无硬编码颜色（白名单除外） | 硬阻塞 |
| 9d | 状态标签全覆盖 | 每个状态值有对应 `<a-tag>` + 颜色正确 | 硬阻塞 |
| 9e | Tab 一致性 | Tab 数量、名称、顺序与原型完全一致 | 硬阻塞 |

### 不执行的 Gate（非 UI 范畴）

以下 gate 属于 RPIV 全量收口，ui-closure 不执行：

| Gate | 原因 |
|------|------|
| plan_standard_guard | 需求文档结构，非 UI |
| srs_guard / decisions_guard | 需求完整性，非 UI |
| requirements_coverage_guard | 需求→Story 覆盖，非 UI |
| story_ticket_coverage_guard | Story→Ticket 覆盖，非 UI |
| traceability_guard | AC→TC 追溯，非 UI |
| done_ticket_evidence_guard | Ticket 证据，非 UI |
| e2e-api-gate.sh | E2E API 测试，非 UI |
| Backend tests (mvn test) | 后端测试，非 UI |
| API smoke tests | API 冒烟，非 UI |
| security_contract_guard | 安全契约，非 UI |
| behavior_contract_guard | 行为场景测试，非 UI 还原 |

**推荐工作流**：`/ui-closure` 快速迭代 UI → 全部 OK → `/final-closure` 全量验收

## Zone YAML Schema

```yaml
# zones/{module}.yaml — 引擎唯一输入，自包含所有必要信息
module: admin
prototype_file: "osg-spec-docs/source/prototype/admin.html"

# 可选：覆盖默认命令
build_command: "pnpm --dir osg-frontend/packages/admin build"
lint_command: "cd osg-frontend && pnpm lint"

# 可选：组件映射表（原型 class → Vue 组件）
component_map:
  ".table": "<a-table>"
  ".btn-primary": '<a-button type="primary">'
  ".modal": "<a-modal>"
  ".select": "<a-select>"
  ".card": "<a-card>"
  ".pagination": "<a-pagination>"
  ".tab": "<a-tabs>"
  ".stat-card": "<a-card> + <a-statistic>"
  ".filter-bar": "<a-space> + <a-form>"
  ".search-box": "<a-input-search>"
  ".badge-success": '<a-tag color="success">'
  ".input": "<a-input>"

zones:
  - name: "用户中心"
    id: users
    vue_dir: "osg-frontend/packages/admin/src/views/users/"
    pages:
      - page_id: students
        label: "学员管理"
        prototype_lines: [502, 832]
        vue_files:
          - "students/index.vue"
          - "students/components/*.vue"
    modals:
      - modal_id: modal-status-change
        label: "状态修改"
        prototype_lines: [1338, 1375]
```

## 硬约束

1. **HTML 原型是唯一真源** — PRD/CONTRACT/当前实现都不能作为比对基准
2. **不依赖 STATE.yaml / config.yaml / RPIV 工作流状态**
3. **Zone YAML 是唯一输入**，自包含所有必要信息
4. **Agent 不得修改 zone 外的文件**
5. **不得新建文件**，只修改已有 Vue 文件
6. **不得修改路由/权限/API 逻辑**
7. **每个变更必须有原型行号出处**
8. **禁止硬编码颜色值** — 所有颜色必须引用主题 Token 或 SCSS 变量
9. **Modal 全覆盖** — zone 中定义的每个 modal_id 必须有 Vue 实现且字段数一致
10. **表格列严格一致** — 列数、列名、列顺序必须与原型完全匹配
11. **状态标签全覆盖** — 每个状态值必须有对应 `<a-tag>` 且颜色正确
12. **Tab 严格一致** — Tab 数量、名称、顺序必须与原型完全匹配
13. **delivery_truth_guard 必须执行** — 不因 CONTRACT 缺失而跳过

## 失败处理

| 失败 | 阶段 | 行为 |
|------|------|------|
| zone YAML 不存在 | Phase 0 | STOP，提示创建 |
| 原型文件不存在 | Phase 0 | STOP |
| Vue 文件不存在 | Phase 1 | STOP，列出缺失文件 |
| Lint 失败 | Phase 4a | 尝试修复，仍失败则 zone FAIL |
| Modal 未实现 | Phase 4b | zone FAIL |
| Modal 字段数不一致 | Phase 4b | zone FAIL |
| 表格列不一致 | Phase 4c | zone FAIL |
| Tab 不一致 | Phase 4d | zone FAIL |
| 硬编码颜色 | Phase 4e | zone FAIL，列出违规文件和行号 |
| 状态标签缺失/颜色错误 | Phase 4f | zone FAIL |
| 视觉验证失败 | Phase 4g | 记录 FAIL，继续其他页面 |
| Surface 缺口 | Phase 4h | 告警，不阻塞 |
| Zone 报告缺失 | Phase 6 | STOP，列出缺失 zone |
| Build 失败 | Phase 7 | STOP |
| Visual gate 失败 | Phase 8a | STOP，输出 page report |
| delivery_truth_guard 失败 | Phase 8c | STOP |
| prototype_derivation 失败 | Phase 8e | STOP |
| menu_route_view 失败 | Phase 8f | STOP |
| permission_code 失败 | Phase 8g | STOP |
| 全模块 Modal 覆盖率不足 | Phase 9a | STOP，列出缺失 modal |
| 全模块表格列不一致 | Phase 9b | STOP，列出不一致页面 |
| 全模块颜色违规 | Phase 9c | STOP，列出违规文件 |
| 全模块状态标签缺失 | Phase 9d | STOP，列出缺失状态 |
| 全模块 Tab 不一致 | Phase 9e | STOP，列出不一致页面 |

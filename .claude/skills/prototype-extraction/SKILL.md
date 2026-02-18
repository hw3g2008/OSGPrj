---
name: prototype-extraction
description: "标准化 HTML 原型需求提取流程 — 被 brainstorming Phase 0 调用，确保逐端逐页面全量提取，防止遗漏"
metadata:
  invoked-by: "skill:brainstorming"
  auto-execute: "true"
---

# Prototype Extraction Skill

## 概览

从 HTML 原型中系统化提取需求信息，生成页面级 PRD 文档。本 Skill 是 brainstorming Phase 0 的子流程，确保：
- **零遗漏**：每个端的每个页面都被提取
- **源码级深度**：不仅看渲染结果，还看 HTML/JS 源码
- **差异可追溯**：相似页面必须明确记录差异点

## 何时使用

- brainstorming Phase 0 发现 PRD 不存在时自动调用
- 用户手动要求重新提取原型信息时

## ⚠️ 铁律

```
1. 禁止跳过任何端 — 即使"看起来相同"也必须实际验证
2. 禁止仅靠截图 — 必须同时检查 HTML 源码
3. 禁止假设 — 每个差异结论必须有源码证据
4. 每个端的每个页面都必须生成独立 PRD（或明确的差异附录）
```

---

## 执行流程

```
开始
  │
  ▼
┌─ Step 1: 建立端×页面全量矩阵 ─────────────────┐
│ [1.1] 扫描 config.prd_process.module_prototype_map  │
│       获取模块对应的所有 HTML 原型文件              │
│ [1.2] 对每个 HTML 文件，grep 提取侧边栏菜单:      │
│       grep "showPage\(" {file} → 提取所有页面 ID   │
│ [1.2b] 扫描前置/全局页面（非菜单页面）:           │
│       grep 登录页/错误页/全局组件等独立区块        │
│       扫描结果为空是正常情况，不报错               │
│ [1.3] 合并 [1.2]+[1.2b]，按模块关键词过滤生成矩阵│
│       前置页面标注 🔑，端(行) × 页面(列) = 是否存在│
│ [1.4] 输出矩阵，人工确认无遗漏                    │
│ [1.5] 空矩阵检查: 如果无匹配页面 → 失败退出      │
└─────────────────────────────────────────────────┘
  │
  ▼
┌─ Step 2: 逐端逐页面提取（双通道） ────────────────┐
│                                                     │
│ 对矩阵中每个 ✅ 单元格:                           │
│                                                     │
│ ┌─ 通道 A: 浏览器实测 ──────────────────────┐     │
│ │ [2.1] 启动 HTTP 服务器                     │     │
│ │ [2.2] 浏览器打开页面，登录                 │     │
│ │ [2.3] 导航到目标页面                       │     │
│ │ [2.4] 获取 accessibility snapshot          │     │
│ │ [2.5] 截图保存                             │     │
│ │ [2.6] 展开折叠区域、点击弹窗，重复 2.4-2.5│     │
│ └────────────────────────────────────────────┘     │
│                                                     │
│ ┌─ 通道 B: 源码分析 ────────────────────────┐     │
│ │ [2.7] grep 定位页面 HTML 区块:             │     │
│ │       id="page-{pageId}" 到下一个 page div │     │
│ │ [2.8] 提取表格结构: <thead>/<th> 列定义    │     │
│ │ [2.9] 提取表单字段: <input>/<select>/<textarea> │ │
│ │ [2.10] 提取弹窗: id="modal-*" 的完整内容  │     │
│ │ [2.11] 提取 JS 交互: onclick/onchange 逻辑│     │
│ │ [2.12] 提取 Tab 切换: tab 按钮和对应内容  │     │
│ │ [2.13] 提取隐藏区域: display:none 的区块   │     │
│ │ [2.14] 提取统计卡片: 数字+标签组合        │     │
│ └────────────────────────────────────────────┘     │
│                                                     │
│ [2.15] 合并通道 A + B 的信息，生成页面 PRD        │
└─────────────────────────────────────────────────────┘
  │
  ▼
┌─ Step 3: 跨端差异分析 ────────────────────────────┐
│ [3.1] 对同一页面 ID 在不同端的实现进行对比:       │
│       - Tab 数量和名称                             │
│       - 表格列差异（多列/少列/列名不同）          │
│       - 筛选项差异                                 │
│       - 操作按钮差异                               │
│       - 统计卡片差异                               │
│       - 数据范围差异                               │
│       - 权限差异                                   │
│ [3.2] 生成差异对比表（Markdown 表格）             │
│ [3.3] 每个差异点必须标注源码行号作为证据          │
└─────────────────────────────────────────────────────┘
  │
  ▼
┌─ Step 4: 生成 PRD 文档 ──────────────────────────┐
│ [4.1] 为每个端的每个页面生成独立 PRD 文件:        │
│       命名规则: {NN}-{role}-{page}.md             │
│       前置页面(🔑)用 00 编号: 00-admin-login.md   │
│       菜单页面从 01 开始: 01-student-positions.md  │
│       如: 06-mentor-job-overview.md                │
│           07-assistant-job-overview.md             │
│ [4.2] 相似页面不合并，但在 PRD 中标注差异来源    │
│ [4.3] 生成 DECISIONS.md 记录产品决策              │
│ [4.4] 生成 MATRIX.md 记录端×页面全量矩阵         │
└─────────────────────────────────────────────────────┘
  │
  ▼
┌─ Step 5: 完整性校验 ─────────────────────────────┐
│ [5.1] 矩阵覆盖率: 矩阵中每个 ✅ 是否都有 PRD？  │
│ [5.2] 源码覆盖率: 每个 PRD 是否引用了源码证据？  │
│ [5.3] 差异覆盖率: 相似页面是否都有差异分析？      │
│ [5.4] 弹窗覆盖率: 所有 modal-* 是否都被提取？    │
│ [5.5] 隐藏区域覆盖率: display:none 区块是否提取？│
│ [5.6] Tab 覆盖率: 所有 Tab 内容都被提取？         │
│                                                     │
│ 每次重试必须输出进度:                              │
│   🔄 完整性校验 {retry}/{max_retries}              │
│   - V1 矩阵覆盖率: ✅/❌                          │
│   - V2 源码覆盖率: ✅/❌                          │
│   - ...                                             │
│                                                     │
│ 任一项不通过 → 回到 Step 2 补充                   │
│ 全部通过 → 输出完成                               │
│ 达到 max_retries → 失败退出                       │
└─────────────────────────────────────────────────────┘
  │
  ▼
输出: prd/{module}/ 目录下的完整 PRD 文档集
```

---

## Step 1 详细规则: 端×页面全量矩阵

### 1.1 扫描原型文件

```python
# 从 config.yaml 获取模块对应的原型文件
prototype_files = config.prd_process.module_prototype_map[module_name]
# 如: ["index.html", "mentor.html", "lead-mentor.html", "assistant.html", "admin.html"]
```

### 1.2 提取侧边栏菜单

```bash
# 对每个 HTML 文件，提取所有 showPage 调用
grep -n "showPage(" {file} | grep -i "{module_keyword}"
```

### 1.2b 扫描前置/全局页面

除侧边栏菜单外，还需扫描不在菜单中但属于模块业务流程的页面：

```bash
# 登录页
grep -n 'class="login' {file}
# 错误页
grep -n 'id="page-403\|id="page-404\|id="error-' {file}
# 其他独立区块（不在 showPage 中的 div.page）
grep -n 'class="page"' {file} | grep -v 'showPage'
```

**规则**：
- 扫描结果为空是正常情况（多数模块无独立前置页面），不报错
- 发现的前置页面在矩阵中标注 🔑（前置），与菜单页面区分
- 前置页面同样需要经过 Step 2 双通道提取

### 1.3 生成矩阵

输出格式（Markdown 表格）:

```markdown
| 页面 (showPage ID) | 学生端 | 导师端 | 班主任端 | 助教端 | 管理后台 |
|---|:--:|:--:|:--:|:--:|:--:|
| positions | ✅ | ❌ | ✅ | ✅ | ✅ |
| job-overview | ❌ | ✅ | ✅ | ✅ | ✅ |
| ...
```

### 1.4 矩阵确认规则

- 矩阵必须包含模块相关的**所有**页面 ID
- 快捷入口（如首页的快捷按钮）也要纳入矩阵
- 如果某端有该页面但不在侧边栏菜单中（如仅在快捷入口），标注 ⚡
- **前置页面检查清单**（每次建立矩阵后必须逐项确认）：
  - [ ] 该模块是否有独立的登录/注册页面？
  - [ ] 该模块是否有错误兜底页面（403/404/500）？
  - [ ] 该模块是否有全局组件（侧边栏、顶部导航）需要单独提取？
  - [ ] 前置页面是否已标注 🔑 并纳入矩阵？

### 1.5 空矩阵检查

- 如果所有 HTML 文件都没有匹配的页面 ID（矩阵为空），立即失败退出
- 返回 `{"status": "failed", "reason": "模块 {module_name} 在所有原型文件中未找到匹配页面"}`
- 可能原因：模块关键词不匹配、原型文件路径错误、模块尚未在原型中实现

---

## Step 2 详细规则: 双通道提取

### 通道 A: 浏览器实测

**必须操作清单**（每个页面都要执行）:

| # | 操作 | 目的 |
|---|------|------|
| A1 | 获取 snapshot | 提取完整 UI 结构 |
| A2 | 全页截图 | 视觉记录 |
| A3 | 展开所有折叠区域 | 发现隐藏内容 |
| A4 | 点击每个 Tab | 确认 Tab 数量和内容差异 |
| A5 | 触发每个弹窗 | 提取弹窗字段 |
| A6 | 检查下拉框选项 | 提取枚举值 |
| A7 | 检查表格操作列 | 提取按钮和交互 |
| A8 | 检查空状态 | 清空筛选/数据后截图，记录空列表展示（占位图/提示文案） |

### 通道 B: 源码分析

**必须检查项**（每个页面都要执行）:

| # | 检查项 | grep 命令 | 目的 |
|---|--------|-----------|------|
| B1 | 页面区块 | `id="page-{pageId}"` | 定位页面 HTML（菜单页面）；前置页面（🔑）按实际结构定位，如 `class="login-container"` |
| B2 | 表格列 | `<th>` 在页面区块内 | 提取表格结构 |
| B3 | 表单字段 | `<input\|<select\|<textarea` | 提取表单 |
| B4 | 弹窗 | `id="modal-"` | 提取弹窗内容 |
| B5 | Tab 按钮 | `class="tab"` 或 `switchTab` | 提取 Tab 结构 |
| B6 | 隐藏区域 | `display:none` | 发现隐藏功能 |
| B7 | JS 交互 | `onclick\|onchange` | 提取交互逻辑 |
| B8 | 统计卡片 | 数字+标签的 div 组合 | 提取统计信息 |
| B9 | CSS 颜色 | `color:\|background` 在页面区块内 | 提取 Tag/Badge/卡片/按钮颜色 |
| B10 | CSS class 语义 | `class="badge-\|tag-\|btn-\|card-"` | 提取组件样式类→颜色映射 |
| B11 | 图标 | `<i class=\|<svg\|<img` 在页面区块内 | 提取图标信息 |
| B12 | 条件渲染 | `style="display\|\.hidden\|classList` | 提取显示/隐藏逻辑 |
| B13 | 表单验证 | `required\|pattern=\|maxlength` | 提取验证规则 |
| B14 | 分页 | `pagination\|page-size\|total` | 提取分页配置 |
| B15 | 默认值+联动 | `selected\|checked\|value=` + onchange | 提取默认值和联动关系 |
| B16 | 全局 CSS 变量 | `:root` 在 `<style>` 标签内 | 提取所有 CSS 自定义属性（颜色/间距/阴影等） |
| B17 | 通用组件样式 | `.btn\|.card\|.table\|.modal\|.form-input\|.tag\|.stat-card\|.tabs` | 提取通用组件的完整 CSS 参数（圆角/padding/字体等） |
| B18 | 全局布局 | `.sidebar\|.main-content\|.app\|body\|.login-page` | 提取布局参数（宽度/padding/flex方向/字体族） |
| B19 | 侧边栏结构 | `sidebar-nav\|nav-section\|nav-item\|nav-group` | 提取菜单分组/图标/Badge/权限映射 |

---

## Step 3 详细规则: 跨端差异分析

### 差异维度清单

对同一页面 ID 在不同端的实现，必须逐项对比:

| 维度 | 对比内容 | 示例 |
|------|----------|------|
| D1-副标题 | 页面副标题文案 | "辅导学员" vs "辅导和管理的学员" |
| D2-Tab | Tab 数量、名称、Badge | 1 Tab vs 3 Tab |
| D3-筛选项 | 筛选下拉框的选项 | 有/无"类型"筛选 |
| D4-表格列 | 列名、列数、列顺序 | 有/无"导师"列 |
| D5-操作列 | 按钮类型和数量 | "确认" vs "查看详情" |
| D6-统计卡片 | 卡片数量和内容 | 有/无统计卡片 |
| D7-数据范围 | 显示的数据范围 | 仅辅导 vs 辅导+管理 |
| D8-弹窗 | 弹窗字段差异 | 不同的表单字段 |
| D9-权限 | 可执行的操作 | 可分配导师 vs 不可 |
| D10-样式 | 高亮、颜色、图标差异 | 不同的行高亮规则 |
| D11-分页 | 分页配置差异 | 不同端每页条数不同 |
| D12-空状态 | 空状态展示差异 | 不同端空列表提示不同 |
| D13-默认值 | 筛选默认值差异 | 不同端默认筛选条件不同 |

### 差异输出格式

```markdown
## {页面名} 跨端差异分析

| 维度 | 学生端 | 导师端 | 班主任端 | 助教端 | 管理后台 | 源码证据 |
|------|--------|--------|---------|--------|---------|---------|
| D2-Tab | N/A | 1个 | 3个 | 2个 | 2个 | mentor.html:L458, lead-mentor.html:L456 |
| ...
```

---

## Step 4 详细规则: PRD 文档生成

### 命名规则

```
{NN}-{role}-{page}.md

NN: 两位数字序号（01-99）
role: student / mentor / lead-mentor / assistant / admin
page: 页面名（如 positions, job-overview, applications）
```

### PRD 文档模板

每个 PRD 文件必须包含以下章节:

```markdown
# {角色名} - {页面标题} ({英文标题})

> 来源：{html文件名} → {页面ID}（浏览器实测 + HTML 源码）

## 1. 页面概览
- 标题 / 副标题 / 右上角按钮

## 2. 组件区块（按页面从上到下）
- 每个区块的详细描述

## 3. 表格结构（如有）
- 列名 | 说明 | 数据类型

## 4. 表单字段（如有）
- 字段名 | 类型 | 必填 | 验证规则 | 选项/说明

## 5. 弹窗（如有）
- 弹窗名 | 触发方式 | 字段列表

## 6. 筛选与搜索
- 筛选项 | 类型 | 选项 | 默认值 | 联动关系

## 7. 交互规则
- 按钮点击、状态切换、联动逻辑

## 8. 数据字典（如有）
- 枚举值定义（如面试阶段、辅导状态的完整选项列表）
- 表格列的数据类型和格式（如日期格式 MM/DD HH:mm）
- Tag 标签的颜色-含义映射
- Badge 的颜色-含义映射
- 图标-含义映射（icon class / SVG / emoji）
- CSS class-语义映射（如 badge-success → 绿色）
- 分页配置（每页条数/默认排序）

## 9. 状态流转（如有）
- 状态机定义（如投递状态、面试阶段的流转规则）
- 状态切换的触发条件和约束

## 10. 与其他端的差异（如适用）
- 差异维度 | 本端 | 对比端 | 源码证据

## 11. 状态 UI（如有）
- 空状态：列表为空时的展示（占位图/提示文案/操作引导）
- 加载状态：数据加载中的展示（骨架屏/spinner）
- 错误状态：请求失败时的展示（错误提示/重试按钮）
```

### DESIGN-SYSTEM.md 模板

从 B16~B18 提取的全局设计系统信息，生成独立文件：

```markdown
# {端名} - 全局设计系统 (Design System)

> 来源：{html文件名} → `<style>` 标签（HTML 源码提取）

## 1. CSS 变量（:root）
| 变量名 | 值 | 用途 |
|--------|---|------|
| --primary | #xxx | 主色调 |
| ... | ... | ... |

## 2. 通用组件样式
### 2.1 按钮 (.btn)
- border-radius / padding / font-size / font-weight
- 变体：btn-primary / btn-outline / btn-text / btn-sm

### 2.2 表单输入 (.form-input)
- border / border-radius / padding / font-size / focus 样式

### 2.3 表格 (.table)
- th 样式 / td 样式 / 行高 / 斑马纹

### 2.4 卡片 (.card)
- border-radius / padding / box-shadow / background

### 2.5 弹窗 (.modal)
- 宽度 / border-radius / padding / overlay 颜色

### 2.6 标签 (.tag)
- 变体及颜色映射：success/warning/danger/info/purple
- border-radius / padding / font-size

### 2.7 统计卡片 (.stat-card)
- 布局 / 数字字体大小 / 标签字体大小

### 2.8 Tab (.tabs)
- 激活态样式 / 非激活态样式 / 切换动画

## 3. 全局布局
| 区域 | 参数 | 值 |
|------|------|---|
| 侧边栏 | width | xxxpx |
| 主内容区 | padding | xxxpx |
| 页面容器 | max-width | xxxpx |
| body | font-family | xxx |
| body | font-size | xxxpx |
| body | line-height | xxx |

## 4. 间距体系
| 级别 | 值 | 使用场景 |
|------|---|---------|

## 5. 圆角体系
| 级别 | 值 | 使用场景 |
|------|---|---------|

## 6. 动画/过渡
| 名称 | 定义 | 使用场景 |
|------|------|---------|
```

### SIDEBAR-NAV.md 模板

从 B19 提取的侧边栏导航结构，生成独立文件：

```markdown
# {端名} - 侧边栏导航结构 (Sidebar Navigation)

> 来源：{html文件名} → 侧边栏 HTML 结构（HTML 源码提取）

## 1. 整体布局
- 宽度 / 背景色 / 位置（fixed/sticky）
- 顶部 Logo 区域
- 底部用户卡片区域

## 2. 菜单分组
| 分组名 | 菜单项 | 图标 | Badge | showPage ID |
|--------|--------|------|-------|-------------|
| 分组1 | 菜单项1 | mdi-xxx | — | page-id |
| ... | ... | ... | ... | ... |

## 3. 权限映射
| 角色 | 可见菜单项 |
|------|-----------|
| super-admin | 全部 |
| ... | ... |

## 4. 交互规则
- 菜单项点击行为
- 分组展开/折叠
- 激活态样式
- Badge 更新逻辑

## 5. 用户卡片
- 头像 / 用户名 / 角色标签
- 下拉菜单项（个人设置/退出登录）
```

### 特殊文件

- `DECISIONS.md` — 产品决策记录（每个决策标注来源）
- `MATRIX.md` — 端×页面全量矩阵 + 差异摘要
- `DESIGN-SYSTEM.md` — 全局设计系统（CSS 变量 + 组件样式 + 布局规范）
- `SIDEBAR-NAV.md` — 侧边栏导航结构（菜单分组 + 图标 + Badge + 权限映射）

---

## Step 5 详细规则: 完整性校验

### 校验清单

| # | 校验项 | 通过条件 | 失败处理 |
|---|--------|----------|----------|
| V1 | 矩阵覆盖率 | 矩阵中每个 ✅ 都有对应 PRD 文件 | 回到 Step 2 补充 |
| V2 | 源码覆盖率 | 每个 PRD 至少引用 1 处源码行号 | 回到 Step 2 补充 |
| V3 | 差异覆盖率 | 同一页面在 ≥2 端存在时有差异分析 | 回到 Step 3 补充 |
| V4 | 弹窗覆盖率 | 页面区块内所有 modal-* 都被提取 | 回到 Step 2 补充 |
| V5 | 隐藏区域覆盖率 | 页面区块内 display:none 区块都被提取 | 回到 Step 2 补充 |
| V6 | Tab 覆盖率 | 所有 Tab 内容都被提取 | 回到 Step 2 补充 |
| V7 | 颜色覆盖率 | 页面中所有 Tag/Badge/卡片的颜色都被提取 | 回到 Step 2 补充 |
| V8 | 图标覆盖率 | 页面中所有图标都被提取 | 回到 Step 2 补充 |
| V9 | 表单验证覆盖率 | 所有表单字段都有验证规则描述 | 回到 Step 2 补充 |
| V10 | 分页覆盖率 | 所有列表页面都有分页配置 | 回到 Step 2 补充 |
| V11 | 空状态覆盖率 | 所有列表页面都有空状态描述 | 回到 Step 2 补充 |
| V12 | HTML 内部一致性 | 同一 HTML 文件内不同位置对同一实体的命名/分组一致 | 记录到 html_issues（不阻塞，返回给调用方处理） |
| V13 | HTML Bug 检测 | JS 引用的页面 ID 都存在对应的页面定义 | 记录到 html_issues（不阻塞，返回给调用方处理） |
| V14 | 设计系统覆盖率 | DESIGN-SYSTEM.md 包含所有 :root 变量和通用组件样式 | 回到 Step 2 补充（B16~B18） |
| V15 | 侧边栏覆盖率 | SIDEBAR-NAV.md 包含所有 nav-item 和权限映射 | 回到 Step 2 补充（B19） |

---

## 伪代码

```python
def extract_prototypes(module_name, config):
    """标准化 HTML 原型需求提取"""
    
    # ========== Step 1: 建立端×页面全量矩阵 ==========
    prototype_files = get_prototype_files(module_name, config)
    matrix = {}  # {html_file: [page_ids]}
    
    for html_file in prototype_files:
        # grep 提取侧边栏菜单中的 showPage 调用
        page_ids = grep_show_page(html_file, module_keywords)
        # 也检查快捷入口
        quick_entries = grep_quick_entries(html_file, module_keywords)
        matrix[html_file] = list(set(page_ids + quick_entries))
    
    # 输出矩阵
    print_matrix(matrix)
    
    # 空矩阵检查
    total_pages = sum(len(pages) for pages in matrix.values())
    if total_pages == 0:
        return {"status": "failed", "reason": f"模块 {module_name} 在所有原型文件中未找到匹配页面"}
    
    # ========== Step 2: 逐端逐页面提取 ==========
    prd_docs = []
    
    for html_file, page_ids in matrix.items():
        role = extract_role(html_file)  # student/mentor/lead-mentor/assistant/admin
        
        for page_id in page_ids:
            # 通道 A: 浏览器实测
            browser_data = browser_extract(html_file, page_id)
            #   - snapshot, screenshot
            #   - 展开折叠, 点击 Tab, 触发弹窗
            #   - 检查下拉框选项
            
            # 通道 B: 源码分析
            source_data = source_extract(html_file, page_id)
            #   - 表格列, 表单字段, 弹窗, Tab
            #   - 隐藏区域, JS 交互, 统计卡片
            
            # 合并生成 PRD
            prd = merge_and_generate_prd(role, page_id, browser_data, source_data)
            prd_docs.append(prd)
    
    # ========== Step 3: 跨端差异分析 ==========
    # 找出同一 page_id 在多个端存在的情况
    page_to_roles = group_by_page_id(matrix)
    
    for page_id, roles in page_to_roles.items():
        if len(roles) >= 2:
            diff_table = compare_across_roles(page_id, roles, prd_docs)
            # 将差异分析附加到每个相关 PRD
            for prd in get_prds_by_page(prd_docs, page_id):
                prd.append_diff_section(diff_table)
    
    # ========== Step 4: 生成 PRD 文档 ==========
    output_dir = f"{config.paths.docs.prd}/{module_name}/"
    
    for i, prd in enumerate(prd_docs):
        filename = f"{i+1:02d}-{prd.role}-{prd.page_id}.md"
        write_file(f"{output_dir}/{filename}", prd.to_markdown())
    
    # 生成 DECISIONS.md
    write_file(f"{output_dir}/DECISIONS.md", generate_decisions(prd_docs))
    
    # 生成 MATRIX.md
    write_file(f"{output_dir}/MATRIX.md", generate_matrix_doc(matrix, prd_docs))
    
    # 生成 DESIGN-SYSTEM.md（从 B16~B18 提取的全局设计系统）
    for html_file in prototype_files:
        design_system = extract_design_system(html_file)  # B16: CSS变量, B17: 组件样式, B18: 布局
        write_file(f"{output_dir}/DESIGN-SYSTEM.md", design_system.to_markdown())
    
    # 生成 SIDEBAR-NAV.md（从 B19 提取的侧边栏结构）
    for html_file in prototype_files:
        sidebar_nav = extract_sidebar_nav(html_file)  # B19: 菜单分组/图标/Badge/权限
        write_file(f"{output_dir}/SIDEBAR-NAV.md", sidebar_nav.to_markdown())
    
    # ========== Step 5: 完整性校验 ==========
    # ⛔ 门控前置检查: 检查 Step 1~4 产物完整性
    gate_result = run_command(f"bash bin/check-skill-artifacts.sh prototype-extraction {module_name} {output_dir}")
    if gate_result.exit_code != 0:
        return failed("Step 1~4 产物不完整，请补充后重试")

    max_retries = 3
    for retry in range(max_retries):
        issues = validate_completeness(matrix, prd_docs, output_dir)
        if not issues:
            print("✅ 完整性校验通过")
            break
        print(f"❌ 完整性校验失败: {len(issues)} 个问题")
        for issue in issues:
            print(f"  - {issue}")
        # 回到 Step 2 补充
        fix_issues(issues, matrix, prd_docs)
    else:
        return {"status": "failed", "reason": f"完整性校验经过 {max_retries} 次重试仍未通过"}
    
    # ========== Step 5b: HTML 内部一致性检测 (V12/V13) ==========
    # 注意: 不阻塞，仅收集问题返回给调用方处理
    html_issues = []
    
    # V12: 同一 HTML 文件内命名/分组一致性
    for html_file in prototype_files:
        # 检查侧边栏菜单名 vs 弹窗/权限配置中的模块名是否一致
        sidebar_names = extract_sidebar_names(html_file)
        modal_names = extract_modal_module_names(html_file)
        for page_id in matrix.get(html_file, []):
            if sidebar_names.get(page_id) != modal_names.get(page_id):
                html_issues.append({
                    "type": "C",  # C类: HTML 内部矛盾
                    "desc": f"{html_file}: 侧边栏名'{sidebar_names[page_id]}' vs 弹窗名'{modal_names[page_id]}' (page: {page_id})",
                    "file": html_file,
                    "page_id": page_id
                })
    
    # V13: JS 引用的页面 ID 是否都存在
    for html_file in prototype_files:
        referenced_ids = extract_js_referenced_page_ids(html_file)
        defined_ids = extract_defined_page_ids(html_file)
        for ref_id in referenced_ids:
            if ref_id not in defined_ids:
                html_issues.append({
                    "type": "D",  # D类: HTML Bug
                    "desc": f"{html_file}: JS 引用了不存在的页面 ID '{ref_id}'",
                    "file": html_file,
                    "ref_id": ref_id
                })
    
    if html_issues:
        print(f"⚠️ 发现 {len(html_issues)} 个 HTML 内部问题（返回给调用方处理）")
        for issue in html_issues:
            print(f"  - [{issue['type']}类] {issue['desc']}")
    
    return {
        "status": "success",
        "prd_count": len(prd_docs),
        "output_dir": output_dir,
        "html_issues": html_issues  # 新增: HTML 内部矛盾/Bug 列表
    }
```

---

## 失败退出规则

```
⚠️ Step 5 完整性校验失败：当 max_retries（默认 3）次重试后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 返回 {"status": "failed", "reason": "...", "issues": [...]}
3. brainstorming Skill 收到失败后，提示用户人工介入
4. 用户可以手动补充 PRD 后重新执行
```

---

## 输出格式

成功时返回：
```python
{
    "status": "success",
    "prd_count": 7,           # 生成的 PRD 文件数
    "output_dir": "prd/career/",
    "matrix": {               # 端×页面矩阵
        "index.html": ["positions", "job-tracking", "mock-practice"],
        "mentor.html": ["job-overview", "mock-practice"],
        # ...
    },
    "diff_pages": ["job-overview", "positions", "mock-practice"],
    "special_files": ["DECISIONS.md", "MATRIX.md"],
    "html_issues": [          # 新增: HTML 内部矛盾/Bug
        {"type": "C", "desc": "admin.html: 侧边栏名'课程记录' vs 弹窗名'全部课程'", ...},
        {"type": "D", "desc": "admin.html: JS 引用了不存在的页面 ID 'resumes'", ...}
    ]
}
```

失败时返回：
```python
{"status": "failed", "reason": "完整性校验经过 3 次重试仍未通过", "issues": [...]}
```

---

## 硬约束

- **禁止跳过任何端** — 即使两个端的页面"看起来相同"，也必须分别提取并记录差异
- **禁止仅靠浏览器** — 必须同时检查 HTML 源码（通道 B）
- **禁止假设** — 每个"相同"或"不同"的结论都必须有源码证据
- **禁止合并 PRD** — 每个端的每个页面都有独立 PRD 文件（可以在差异章节引用其他端）
- **弹窗必须提取** — 页面区块内所有 `id="modal-*"` 都必须被提取
- **隐藏区域必须提取** — `display:none` 的区块可能包含重要功能
- **Tab 必须全部展开** — 每个 Tab 的内容都必须被提取
- **禁止超过 max_retries（3 次）重试** — Step 5 达到上限必须失败退出
- **每次重试必须输出进度** — `🔄 完整性校验 N/3` + 每项校验结果
- **HTML 内部矛盾不阻塞提取** — V12/V13 发现的问题记录到 html_issues 返回给调用方，不在本 Skill 内阻塞
- **禁止自行裁决 HTML 矛盾** — C类问题必须原样返回，不能在 PRD 中自行选择一个版本
- **设计系统必须提取** — 每个 HTML 原型的 `<style>` 中的 `:root` 变量和通用组件样式必须提取到 DESIGN-SYSTEM.md
- **侧边栏必须提取** — 每个 HTML 原型的侧边栏结构（菜单分组/图标/Badge/权限映射）必须提取到 SIDEBAR-NAV.md

---

## 反模式（禁止）

| 反模式 | 正确做法 |
|--------|----------|
| ❌ "助教端与班主任端相同，跳过" | ✅ 分别提取，记录差异（即使差异为零） |
| ❌ 仅截图不看源码 | ✅ 双通道（浏览器+源码）同时提取 |
| ❌ 假设导师端无某功能 | ✅ 实际打开页面 + grep 源码确认 |
| ❌ 合并相似端的 PRD | ✅ 独立 PRD + 差异章节 |
| ❌ 忽略弹窗内容 | ✅ 触发每个弹窗，提取完整字段 |
| ❌ 忽略 display:none 区域 | ✅ 源码中搜索隐藏区域 |

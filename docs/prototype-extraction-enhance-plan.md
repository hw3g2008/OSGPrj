# Prototype-Extraction 加强方案

> 状态：待审批
> 日期：2026-02-14
> 来源：brainstorming workflow 端到端模拟验证 → UI 专项校验数据来源分析

---

## 背景

prototype-extraction 是 SSOT 链路的源头（HTML 原型 → PRD → SRS），其提取质量直接决定下游所有产物的完整性。当前 Skill 在结构层（表格/表单/弹窗/Tab）和交互层（onclick/onchange）的提取较完善，但在**视觉层**（颜色/图标/空状态）、**数据层**（默认值/分页/联动）和**行为层**（表单验证/条件渲染）存在系统性缺失。

---

## 加强总览

### 通道 B 新增提取项（8 项高优 + 9 项中优）

| # | 提取项 | grep 命令/方法 | 优先级 | PRD 章节 |
|---|--------|---------------|--------|---------|
| B9 | CSS 颜色值 | `color:\|background-color:\|background:` | 🔴 高 | §8 数据字典 |
| B10 | CSS class 语义 | `class="badge-\|class="tag-\|class="btn-\|class="card-"` | 🔴 高 | §8 数据字典 |
| B11 | 图标 | `<i class=\|<svg\|<img\|emoji` | 🔴 高 | §8 数据字典 |
| B12 | 条件渲染 | `style="display\|\.hidden\|classList\|if.*show` | 🔴 高 | §7 交互规则 |
| B13 | 表单验证规则 | `required\|pattern=\|maxlength\|minlength\|validate` | 🔴 高 | §4 表单字段 |
| B14 | 分页组件 | `pagination\|page-size\|total\|current-page` | 🔴 高 | §2 组件区块 |
| A8 | 空状态 UI | 浏览器清空数据后截图 | 🔴 高 | 新增 §11 |
| B15 | 默认值+联动 | `selected\|checked\|value=\|default` + onchange 联动 | 🔴 高 | §6 筛选与搜索 |
| B16 | 字体层级 | `font-size\|font-weight\|<h1\|<h2\|<h3` | 🟡 中 | §8 数据字典 |
| B17 | 间距/圆角 | `padding\|margin\|border-radius\|gap` | 🟡 中 | §8 数据字典 |
| B18 | 布局模式 | `display:flex\|display:grid\|position:fixed` | 🟡 中 | §2 组件区块 |
| B19 | 排序指示器 | `sort\|order-by\|sortable` | 🟡 中 | §3 表格结构 |
| B20 | Tooltip/Popover | `title=\|tooltip\|popover` | 🟡 中 | §7 交互规则 |
| B21 | 确认弹窗 | `confirm\|Modal.confirm\|alert` | 🟡 中 | §5 弹窗 |
| B22 | Toast/通知 | `message\|notification\|toast` | 🟡 中 | §7 交互规则 |
| B23 | 数据格式 | `format\|toFixed\|toLocaleString\|moment\|dayjs` | 🟡 中 | §8 数据字典 |
| B24 | 排序规则 | `sort\|order\|ASC\|DESC` | 🟡 中 | §3 表格结构 |

### 通道 A 新增操作项

| # | 操作 | 目的 | 优先级 |
|---|------|------|--------|
| A8 | 清空数据后截图 | 提取空状态 UI（占位图/提示文案） | 🔴 高 |
| A9 | 检查加载状态 | 提取骨架屏/loading spinner（如有） | 🟡 中 |
| A10 | 检查错误状态 | 模拟网络错误，提取错误提示 UI（如有） | 🟡 中 |

---

## 修改 1: 通道 B 源码分析 — 新增高优提取项

### 位置

prototype-extraction/SKILL.md 通道 B 必须检查项表格（第 193-204 行），在 B8 之后新增。

### 新增内容

```markdown
| B9 | CSS 颜色 | `color:\|background` 在页面区块内 | 提取 Tag/Badge/卡片/按钮颜色 |
| B10 | CSS class 语义 | `class="badge-\|tag-\|btn-\|card-"` | 提取组件样式类→颜色映射 |
| B11 | 图标 | `<i class=\|<svg\|<img` 在页面区块内 | 提取图标信息 |
| B12 | 条件渲染 | `style="display\|\.hidden\|classList` | 提取显示/隐藏逻辑 |
| B13 | 表单验证 | `required\|pattern=\|maxlength` | 提取验证规则 |
| B14 | 分页 | `pagination\|page-size\|total` | 提取分页配置 |
| B15 | 默认值+联动 | `selected\|checked\|value=` + onchange | 提取默认值和联动关系 |
```

---

## 修改 2: 通道 A 浏览器实测 — 新增操作项

### 位置

prototype-extraction/SKILL.md 通道 A 必须操作清单（第 179-189 行），在 A7 之后新增。

### 新增内容

```markdown
| A8 | 检查空状态 | 清空筛选/数据后截图，记录空列表展示 |
```

---

## 修改 3: PRD 文档模板 — 新增章节

### 位置

prototype-extraction/SKILL.md PRD 文档模板（第 254-293 行），在 §10 之后新增。

### 新增内容

```markdown
## 11. 状态 UI（如有）
- 空状态：列表为空时的展示（占位图/提示文案/操作引导）
- 加载状态：数据加载中的展示（骨架屏/spinner）
- 错误状态：请求失败时的展示（错误提示/重试按钮）
```

### 同步修改

§4 表单字段表格增加"验证规则"列：

```markdown
## 4. 表单字段（如有）
- 字段名 | 类型 | 必填 | 验证规则 | 选项/说明
```

§6 筛选与搜索增加"默认值"和"联动"列：

```markdown
## 6. 筛选与搜索
- 筛选项 | 类型 | 选项 | 默认值 | 联动关系
```

§8 数据字典增加：

```markdown
## 8. 数据字典（如有）
- 枚举值定义
- 表格列的数据类型和格式
- Tag 标签的颜色-含义映射
- Badge 的颜色-含义映射（新增）
- 图标-含义映射（新增）
- CSS class-语义映射（新增）
- 分页配置（每页条数/默认排序）（新增）
```

---

## 修改 4: Step 5 完整性校验 — 新增校验项

### 位置

prototype-extraction/SKILL.md Step 5 校验清单（第 304-313 行），在 V6 之后新增。

### 新增内容

```markdown
| V7 | 颜色覆盖率 | 页面中所有 Tag/Badge/卡片的颜色都被提取 | 回到 Step 2 补充 |
| V8 | 图标覆盖率 | 页面中所有图标都被提取 | 回到 Step 2 补充 |
| V9 | 表单验证覆盖率 | 所有表单字段都有验证规则描述 | 回到 Step 2 补充 |
| V10 | 分页覆盖率 | 所有列表页面都有分页配置 | 回到 Step 2 补充 |
| V11 | 空状态覆盖率 | 所有列表页面都有空状态描述 | 回到 Step 2 补充 |
```

---

## 修改 5: 跨端差异分析 — 新增差异维度

### 位置

prototype-extraction/SKILL.md Step 3 差异维度清单（第 214-225 行），在 D10 之后新增。

### 新增内容

```markdown
| D11-分页 | 分页配置差异 | 不同端每页条数不同 |
| D12-空状态 | 空状态展示差异 | 不同端空列表提示不同 |
| D13-默认值 | 筛选默认值差异 | 不同端默认筛选条件不同 |
```

---

## 实施顺序

1. **修改 1** — 通道 B 新增 7 项高优提取（B9-B15）
2. **修改 2** — 通道 A 新增空状态检查（A8）
3. **修改 3** — PRD 模板新增章节和字段
4. **修改 4** — Step 5 新增 5 项校验（V7-V11）
5. **修改 5** — 跨端差异新增 3 个维度（D11-D13）

---

## 影响范围

| 文件 | 修改量（估） | 风险 |
|------|------------|------|
| prototype-extraction/SKILL.md | ~60 行新增 | 低（纯新增，不修改现有逻辑） |

---

## 中优先级项目（后续可选加强）

以下 9 项为中优先级，可在后续迭代中加入：

B16(字体层级)、B17(间距/圆角)、B18(布局模式)、B19(排序指示器)、B20(Tooltip)、B21(确认弹窗)、B22(Toast/通知)、B23(数据格式)、B24(排序规则)

以及通道 A 的 A9(加载状态)、A10(错误状态)。

---

## 执行状态

> 状态：✅ 已完成
> 执行日期：2026-02-14
> 校验轮次：3 轮（A结构 ✅ → H交叉 ✅ → C数据流 ✅，连续2轮无修改通过）

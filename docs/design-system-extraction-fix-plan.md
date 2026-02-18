# 设计系统提取修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：在 brainstorm 流程中增加"全局设计系统提取"能力，使 PRD/SRS 包含足够的样式信息支撑 1:1 UI 还原
- **验收标准**：
  1. prototype-extraction 自动从 HTML `<style>` 提取 CSS 变量、通用组件样式、布局规范
  2. 自动生成 `05-design-system.md`（设计系统 PRD）和 `06-sidebar-nav.md`（侧边栏结构 PRD）
  3. brainstorming Phase 2 校验设计 Token 精确度（SRS 值 vs HTML 源码值）
  4. brainstorm workflow Phase 4 校验样式精确度
  5. permission 模块的 SRS §8 设计 Token 修正为正确值
  6. permission 模块补充 `05-design-system.md` 和 `06-sidebar-nav.md`

## 二、前置条件与假设

- 假设 1: HTML 原型的 `<style>` 标签中包含完整的 CSS 变量定义（`:root` 块）
- 假设 2: 通用组件样式（.btn, .card, .table, .modal, .form-input 等）定义在全局 `<style>` 中，不在页面级内联样式中
- 假设 3: 侧边栏结构在 `<nav class="sidebar-nav">` 中，包含分组、菜单项、图标、Badge
- 假设 4: 所有端的 HTML 原型遵循相同的 CSS 变量命名规范

## 三、现状分析

### 相关文件

| 文件 | 当前状态 | 问题 |
|------|---------|------|
| `prototype-extraction/SKILL.md` | Step 2 通道 B 有 B1~B15，无全局 CSS 提取 | 只提取页面级元素，遗漏全局样式 |
| `brainstorming/SKILL.md` | UI 专项校验有 5 项，无设计 Token 精确度 | 不校验 SRS 中的颜色值是否与 HTML 一致 |
| `brainstorm.md` (workflow) | Phase 4 校验 7 个维度，无样式精确度 | 不校验 CSS 变量值 |
| `srs/permission.md` §8 | --primary: #7399C6（错误） | 应为 #6366F1，且缺少 9 个关键变量 |
| PRD 模板 | 11 个章节，无设计系统章节 | 全局样式无处安放 |

### 上下游依赖

```
HTML 原型 <style> → prototype-extraction → PRD(设计系统) → brainstorming → SRS §8
                                                                    ↓
                                                          Phase 2 UI 校验
                                                                    ↓
                                                          Phase 4 全量校验
```

### 存在的问题（5 个）

1. **P1-主色调错误**: SRS --primary #7399C6，HTML 实际 #6366F1
2. **P2-缺少设计变量**: 缺 primary-light/dark/gradient、text/text2、card-shadow 等 9 个
3. **P3-缺少布局规范**: 侧边栏 260px、主内容区 padding 28px、字体、圆角体系、间距体系
4. **P4-缺少组件样式**: btn/form-input/table/modal/stat-card/tag 的完整 CSS 参数
5. **P5-缺少侧边栏结构**: 分组、图标、Badge 数字、权限映射

### 根因

prototype-extraction Step 2 通道 B 只有页面级检查项（B1~B15），没有全局级 CSS 提取步骤。PRD 模板也没有设计系统章节。

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 设计系统 PRD 位置 | A: 模块目录下 / B: 全局共享 | A | 按模块组织，不同端可能不同；首个模块提取后可复用 |
| 2 | 侧边栏 PRD | A: 独立文件 / B: 合并到设计系统 | A | 内容足够独立（菜单+图标+Badge+权限） |
| 3 | CSS 提取粒度 | A: 仅 :root / B: 变量+组件+布局 | B | 1:1 还原需要完整信息 |
| 4 | 提取时机 | A: 页面提取前 / B: 页面提取后 | A | 全局样式是基础，先提取可被页面 PRD 引用 |
| 5 | 新增 Step vs 扩展 Step 2 | A: 新增 Step 1.5 / B: 扩展 Step 2 通道 B | B | 最少概念，不增加新 Step，在现有通道 B 中增加检查项 |

## 五、目标状态

### prototype-extraction 流程（变更部分加粗）

```
Step 1: 建立矩阵（不变）
  ↓
Step 2: 逐端逐页面提取
  通道 B 源码分析:
    B1~B15（不变）
    **B16: 全局 CSS 变量 — grep ":root" 提取所有 CSS 变量**
    **B17: 通用组件样式 — grep ".btn|.card|.table|.modal|.form-input|.tag|.stat-card|.tabs" 提取样式参数**
    **B18: 全局布局 — grep ".sidebar|.main|.app|body" 提取布局参数**
    **B19: 侧边栏结构 — grep "sidebar-nav|nav-section|nav-item" 提取菜单结构**
  ↓
Step 3: 跨端差异分析（不变）
  ↓
Step 4: 生成 PRD 文档
  4.1~4.4（不变）
  **4.5: 生成 DESIGN-SYSTEM.md — CSS 变量 + 组件样式 + 布局规范**
  **4.6: 生成 SIDEBAR-NAV.md — 侧边栏完整结构**
  ↓
Step 5: 完整性校验
  V1~V13（不变）
  **V14: 设计系统覆盖率 — DESIGN-SYSTEM.md 是否包含所有 :root 变量和通用组件？**
  **V15: 侧边栏覆盖率 — SIDEBAR-NAV.md 是否包含所有 nav-item？**
```

### brainstorming Phase 2 UI 专项校验（变更部分加粗）

```
原型覆盖 ✅
组件清单 ✅
设计 Token ✅
交互行为 ✅
数据结构 ✅
**设计 Token 精确度 — SRS §8 每个值 vs HTML :root 对应值，必须完全一致**
```

### brainstorm workflow Phase 4 校验维度（变更部分加粗）

```
页面结构 ✅
表格列 ✅
筛选栏选项 ✅
操作按钮 ✅
交互行为 ✅
状态展示 ✅
Badge/Tag 颜色 ✅
**样式精确度 — CSS 变量值、组件样式参数、布局参数是否与 HTML 一致**
```

## 六、执行清单

### 批次 1: 框架修改（3 个 Skill/Workflow 文件）🔴高优

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 1.1 | `prototype-extraction/SKILL.md` Step 2 通道 B | B15 之后 | 无 B16~B19 | 新增 B16（全局 CSS 变量）、B17（通用组件样式）、B18（全局布局）、B19（侧边栏结构） |
| 1.2 | `prototype-extraction/SKILL.md` Step 2 通道 B 表格 | B15 行之后 | 无 | 新增 4 行表格（B16~B19 的 grep 命令和目的） |
| 1.3 | `prototype-extraction/SKILL.md` Step 4 | 4.4 之后 | 无 4.5/4.6 | 新增 4.5（DESIGN-SYSTEM.md 生成规则）和 4.6（SIDEBAR-NAV.md 生成规则） |
| 1.4 | `prototype-extraction/SKILL.md` Step 4 特殊文件 | MATRIX.md 之后 | 2 个特殊文件 | 新增 DESIGN-SYSTEM.md 和 SIDEBAR-NAV.md |
| 1.5 | `prototype-extraction/SKILL.md` Step 5 校验清单 | V13 之后 | 无 V14/V15 | 新增 V14（设计系统覆盖率）和 V15（侧边栏覆盖率） |
| 1.6 | `prototype-extraction/SKILL.md` 伪代码 | Step 4 generate 部分 | 无设计系统生成 | 新增 generate_design_system() 和 generate_sidebar_nav() 调用 |
| 1.7 | `prototype-extraction/SKILL.md` 硬约束 | 硬约束列表末尾 | 无 | 新增"设计系统必须提取"和"侧边栏必须提取"约束 |
| 1.8 | `brainstorming/SKILL.md` Phase 2 UI 专项校验 | 数据结构校验之后 | 5 项 UI 校验 | 新增第 6 项"设计 Token 精确度"校验 |
| 1.9 | `brainstorming/SKILL.md` Phase 2 UI 专项校验伪代码 | data_mismatches 之后 | 无 | 新增 design_token_accuracy 校验代码 |
| 1.10 | `brainstorming/SKILL.md` UI 专项校验表格 | 数据结构行之后 | 5 行 | 新增"设计 Token 精确度"行 |
| 1.11 | `brainstorm.md` (workflow) Phase 4 | 校验维度列表 | 7 个维度 | 新增"样式精确度"维度 |

### 批次 2: permission 模块文档修复 🟡中优

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 2.1 | `srs/permission.md` §8 | --primary 行 | #7399C6 | #6366F1 |
| 2.2 | `srs/permission.md` §8 | --muted 行 | #9CA3AF | #94A3B8 |
| 2.3 | `srs/permission.md` §8 | --border 行 | #E5E7EB | #E2E8F0 |
| 2.4 | `srs/permission.md` §8 | tag-info-text 行 | #1D4ED8 | #1E40AF | ⚠️ HTML 内部 C 类矛盾：class 定义 `#1E40AF` (L84) vs 内联 `#1D4ED8` (L630)，以 class 为准 |
| 2.5 | `srs/permission.md` §8 | tag-purple-bg 行 | #E0E7FF | #EEF2FF | ⚠️ HTML 内部 C 类矛盾：class 用 `var(--primary-light)=#EEF2FF` (L85) vs 内联 `#E0E7FF` (L708)，以 CSS 变量为准 |
| 2.6 | `srs/permission.md` §8 | tag-purple-text 行 | #4338CA | #4F46E5 | ⚠️ HTML 内部 C 类矛盾：class 用 `var(--primary-dark)=#4F46E5` (L85) vs 内联 `#4338CA` (L708)，以 CSS 变量为准 |
| 2.7 | `srs/permission.md` §8 | 缺失变量 | 无 | 新增 --primary-light (#EEF2FF)、--primary-dark (#4F46E5)、--primary-gradient、--text (#1E293B)、--text2 (#64748B)、--card-shadow |
| 2.8 | `prd/permission/05-design-system.md` | 不存在 | 无 | 新建：完整的全局设计系统 PRD |
| 2.9 | `prd/permission/06-sidebar-nav.md` | 不存在 | 无 | 新建：完整的侧边栏导航结构 PRD |

## 七、自校验结果

### 通用校验（G1-G9）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 流程图清晰标注变更部分 |
| G2 目标明确 | ✅ | 6 个验收标准可度量 |
| G3 假设显式 | ✅ | 4 个假设已列出 |
| G4 设计决策完整 | ✅ | 5 个决策点有选项和理由 |
| G5 执行清单可操作 | ✅ | 每项有文件/位置/目标值 |
| G6 正向流程走读 | ✅ | HTML→提取→PRD→SRS→校验 完整链路 |
| G7 改动自洽 | ✅ | 改了 prototype-extraction 同步改了 brainstorming 和 workflow |
| G8 简约不等于省略 | ✅ | 校验项、硬约束、伪代码都有对应修改 |
| G9 场景模拟 | ✅ | 见下方场景走读 |

### 涉及框架流程时追加（F1-F3）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| F1 文件同步 | ✅ | Skill(2个) + Workflow(1个) 同步修改 |
| F2 状态一致性 | ✅ | 不涉及状态机变更 |
| F3 交叉引用 | ✅ | B16~B19/V14~V15/4.5~4.6 在三个文件中一致引用 |

### 场景模拟

**场景 1: 新模块 brainstorm（如 user-center）**
1. Phase 0 调用 prototype-extraction
2. Step 2 通道 B 执行 B16~B19 → 提取 admin.html 的全局 CSS + 侧边栏
3. Step 4 生成 DESIGN-SYSTEM.md + SIDEBAR-NAV.md
4. Step 5 V14/V15 校验通过
5. Phase 1 生成 SRS，§8 从 DESIGN-SYSTEM.md 提取精确值
6. Phase 2 UI 专项校验 → 设计 Token 精确度 → 对比 SRS §8 vs HTML :root → 一致 ✅
7. Phase 4 样式精确度校验 → 通过 ✅

**场景 2: 跨端模块（如 career，涉及 5 个 HTML）**
1. 每个 HTML 都执行 B16~B19
2. 每个端生成独立的 DESIGN-SYSTEM.md
3. 跨端差异分析时对比不同端的 CSS 变量差异
4. SRS §8 合并所有端的设计 Token

**场景 3: 当前 permission 模块修复**
1. 直接修正 SRS §8 错误值（批次 2.1~2.7）
2. 手动生成 05-design-system.md 和 06-sidebar-nav.md（批次 2.8~2.9）
3. 后续模块由框架自动生成

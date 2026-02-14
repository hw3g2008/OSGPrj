# Brainstorming Workflow 模拟验证修复方案

> 状态：待审批
> 日期：2026-02-14
> 来源：brainstorming workflow 端到端模拟验证（25 个验证点）

---

## 修复总览

| # | 文件 | 问题 | 优先级 | 修改类型 |
|---|------|------|--------|---------|
| 1 | STATE.yaml + config.yaml | 模块名不一致（`career` vs `career-center`） | 🟡 中 | 数据修正 |
| 2 | brainstorming/SKILL.md | UI 专项校验定义了但伪代码未实现 | 🟡 中 | 补充代码块 |
| 3 | brainstorming/SKILL.md | 输出模板缺少"数据库变更"和"技术约束"章节 | 🟡 中 | 补充模板 |
| 4 | brainstorming/SKILL.md | 状态更新方式与 workflow-engine 约定不一致 | 🟢 低 | 代码调整 |
| 5 | brainstorm.md + state-machine.yaml | brainstorm_done 后行为矛盾（等审阅 vs 自动继续） | 🟡 中 | 设计决策 |
| 6 | brainstorming/SKILL.md | prototype-extraction 模块名传递依赖 #1 | 🟡 中 | 随 #1 修复 |

---

## 修复 #1：模块名不一致（`career` vs `career-center`）

### 问题描述

三处使用了不同的模块名：

| 位置 | 值 | 用途 |
|------|-----|------|
| `config.yaml` `module_prototype_map` key | `career` | 原型文件映射 |
| PRD 目录 | `prd/career/` | PRD 文档存放 |
| `STATE.yaml` `current_requirement` | `career-center` | 当前需求模块标识 |

### 影响

- brainstorming Skill 的 `extract_module_name()` 如果从 STATE.yaml 读取 `current_requirement`，会得到 `career-center`
- `config.prd_process.module_prototype_map["career-center"]` 找不到映射 → prototype-extraction 失败
- `prd_dir = "osg-spec-docs/docs/01-product/prd/career-center/"` 不存在 → 误判为 PRD 不存在

### 修改方案

**方案 A（推荐）：统一为 `career`**

修改 `osg-spec-docs/tasks/STATE.yaml`：

```yaml
# 当前需求
current_requirement: "career"                    # ← 从 "career-center" 改为 "career"
current_requirement_path: "osg-spec-docs/docs/01-product/prd/career/"
```

**理由**：config.yaml 的 `module_prototype_map` 和 PRD 目录都用 `career`，改 STATE 最小化变更。

**方案 B：增加别名映射**

在 config.yaml 的 `module_prototype_map` 中增加别名：

```yaml
module_prototype_map:
    career: ["index.html", "lead-mentor.html", "assistant.html", "admin.html"]
    career-center: ["index.html", "lead-mentor.html", "assistant.html", "admin.html"]  # 别名
```

**不推荐**：增加维护成本，且 PRD 目录仍然是 `prd/career/`，不是 `prd/career-center/`。

### 优先级

🟡 中 — 用户直接传 `career` 时不受影响，但自动读取 STATE 时会出错。

---

## 修复 #2：UI 专项校验定义了但伪代码未实现

### 问题描述

brainstorming/SKILL.md 第 112-123 行定义了 5 项 UI 专项校验：

| 检查项 | 检查问题 |
|--------|----------|
| 原型覆盖 | 原型中的所有页面是否都有对应需求？ |
| 组件清单 | 是否列出了所有需要实现的 UI 组件？ |
| 设计 Token | 是否定义了颜色、圆角、间距等设计变量？ |
| 交互行为 | 原型中的 JS 交互是否都有对应描述？ |
| 数据结构 | 表格列、表单字段是否与 PRD 数据字典一致？ |

但 Phase 2 伪代码（第 186-232 行）的 while 循环只有：
1. 正向校验（5 项）
2. 反向校验（6 项）
3. PRD 覆盖率校验

**没有 UI 专项校验的执行逻辑。**

### 修改方案

在 Phase 2 伪代码中，PRD 覆盖率校验之后、`break` 之前插入 UI 专项校验：

**位置**：brainstorming/SKILL.md 第 229 行（`print(f"  PRD 覆盖率: ✅ ...")`）之后

```python
        print(f"  PRD 覆盖率: ✅ {len(prd_features)}/{len(prd_features)} = 100%")

        # --- UI 专项校验（当模块涉及 UI 还原时）---
        prototype_dir = config.paths.docs.prototypes
        module_prototypes = config.prd_process.module_prototype_map.get(module_name, [])
        if prototype_dir and module_prototypes:
            ui_issues = []

            # 原型覆盖：原型中的所有页面是否都有对应需求？
            prototype_pages = extract_prototype_pages(prototype_dir, module_prototypes)
            req_pages = extract_requirement_pages(requirement_doc)
            uncovered_pages = prototype_pages - req_pages
            if uncovered_pages:
                ui_issues.append(f"原型覆盖: {len(uncovered_pages)} 个页面未有对应需求")

            # 组件清单：是否列出了所有需要实现的 UI 组件？
            if not has_component_list(requirement_doc):
                ui_issues.append("组件清单: 未列出需要实现的 UI 组件")

            # 设计 Token：是否定义了设计变量？
            if not has_design_tokens(requirement_doc):
                ui_issues.append("设计 Token: 未定义颜色/圆角/间距等设计变量（引用 Agent 定义的 Token）")

            # 交互行为：原型中的 JS 交互是否都有对应描述？
            prototype_interactions = extract_prototype_interactions(prototype_dir, module_prototypes)
            req_interactions = extract_requirement_interactions(requirement_doc)
            uncovered_interactions = prototype_interactions - req_interactions
            if uncovered_interactions:
                ui_issues.append(f"交互行为: {len(uncovered_interactions)} 个交互未有对应描述")

            # 数据结构：表格列、表单字段是否与 PRD 数据字典一致？
            data_mismatches = check_data_structure_consistency(requirement_doc, context["prd_docs"])
            if data_mismatches:
                ui_issues.append(f"数据结构: {len(data_mismatches)} 个字段与 PRD 数据字典不一致")

            if ui_issues:
                print(f"  UI 专项校验: ❌ {len(ui_issues)} 个问题")
                for issue in ui_issues:
                    print(f"    - {issue}")
                requirement_doc = enhance_doc(requirement_doc, ui_issues)
                continue  # 回到正向校验

            print(f"  UI 专项校验: ✅ 5/5 通过")

        break  # Phase 2 通过
```

### 同步修改

1. Phase 2 流程图（第 64-73 行）需要增加 UI 专项校验节点
2. 迭代进度输出格式（第 376-386 行）需要增加 UI 专项校验的输出示例
3. 硬约束部分增加："UI 模块必须执行 UI 专项校验"

### 优先级

🟡 中 — 当前 career 模块有原型文件，应该触发 UI 专项校验。

---

## 修复 #3：输出模板缺少"数据库变更"和"技术约束"章节

### 问题描述

- **brainstorm.md 第 40 行**承诺产物包含：FR（含 PRD 来源）、NFR、AC、接口定义、**数据库变更**、**技术约束**
- **brainstorming/SKILL.md 第 326-355 行**输出模板只有：概述、功能需求、非功能需求、接口定义

缺少"数据库变更"和"技术约束"两个章节。

### 修改方案

在 brainstorming/SKILL.md 的输出格式（第 326-355 行）中补充：

**位置**：第 350 行（`#### 4. 接口定义`）之后

```markdown
#### 5. 数据库变更
| 表名 | 变更类型 | 字段 | 说明 |
|------|---------|------|------|
| sys_xxx | 新增表 | ... | ... |
| sys_yyy | 新增字段 | zzz | ... |

#### 6. 技术约束
- 性能要求：列表查询 < 500ms
- 安全要求：敏感字段加密存储
- 兼容性：与现有 RBAC 系统集成
```

### 同步修改

Skill 伪代码中 `generate_srs(context)` 的返回值应包含 `database_changes` 和 `technical_constraints` 字段。

### 优先级

🟡 中 — Workflow 承诺的产物应与 Skill 模板一致。

---

## 修复 #4：状态更新方式与 workflow-engine 约定不一致

### 问题描述

- brainstorming/SKILL.md 伪代码（第 302-305 行）**直接写 STATE.yaml**：
  ```python
  state.workflow.current_step = "brainstorm_done"
  state.workflow.next_step = "split_story"
  write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
  ```

- workflow-engine/SKILL.md（第 222 行）说 brainstorming 应调用：
  ```python
  update_workflow("/brainstorm", state)
  ```

- workflow-engine 的 `update_workflow` 函数（第 137-140 行）只跳过 `/next` 和 `/verify`，brainstorming 不在跳过列表中。

### 修改方案

**方案 A（推荐）：统一为调用 update_workflow**

修改 brainstorming/SKILL.md 伪代码第 300-307 行：

```python
    # Step 4: 输出结果（仅在 Phase 3 通过后才执行）
    # 更新 workflow 状态（通过 workflow-engine 统一管理）
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    update_workflow("/brainstorm", state)

    return format_output(requirement_doc)
```

**方案 B：在 workflow-engine 文档中说明 brainstorming 也直接写**

不推荐，因为会增加特例。

### 优先级

🟢 低 — 功能不受影响（两种方式结果相同），但代码风格应统一。

---

## 修复 #5：brainstorm_done 后行为矛盾

### 问题描述

- **brainstorm.md 第 44 行**："提示用户审阅需求文档，审阅通过后可执行 `/split story`"
  - 暗示需要用户确认后才继续
- **state-machine.yaml 第 30-34 行**：`brainstorm_done.approval_required: false`
  - workflow-engine 会自动继续执行 `/split story`

### 修改方案

**方案 A（推荐）：Workflow 描述对齐状态机（自动继续）**

修改 brainstorm.md 第 42-45 行：

```markdown
6. **更新状态**
   - 更新 `STATE.yaml` 的 `workflow.current_step` 为 `brainstorm_done`
   - workflow-engine 自动继续执行 `/split story`
```

**理由**：brainstorming 的核心价值是自动迭代校验，不需要人工审阅。如果需要审阅，应该在 config.yaml 中增加审批配置。

**方案 B：增加审批配置**

在 config.yaml 的 `approval` 中增加：

```yaml
approval:
  brainstorm_done: auto  # 或 required
```

在 state-machine.yaml 中增加：

```yaml
  brainstorm_done:
    approval_required: true
    approval_key: brainstorm_done
```

**不推荐**：增加了不必要的审批环节，与"自动迭代"的设计理念矛盾。

### 优先级

🟡 中 — 影响用户体验预期。

---

## 修复 #6：prototype-extraction 模块名传递（随 #1 修复）

### 问题描述

与 #1 直接关联。brainstorming 传给 prototype-extraction 的 `module_name` 必须与 config.yaml 的 `module_prototype_map` key 一致。

### 修改方案

随 #1 修复后自动解决。无需额外修改。

---

## 实施顺序

1. **修复 #1** — STATE.yaml 模块名修正（最简单，影响最大）
2. **修复 #5** — brainstorm.md 描述对齐（设计决策）
3. **修复 #2** — UI 专项校验伪代码补充（最大变更）
4. **修复 #3** — 输出模板补充章节
5. **修复 #4** — 状态更新方式统一

---

## 影响范围

| 文件 | 修改量（估） | 风险 |
|------|------------|------|
| STATE.yaml | 1 行 | 低 |
| brainstorm.md | 3 行 | 低 |
| brainstorming/SKILL.md | ~50 行新增（UI校验）+ ~15 行修改（模板+状态更新） | 中 |

---

## 校验补充（implement-fix-plan 多轮校验发现）

### 补充 #2a：输出模板"校验轮次"缺少 UI 专项校验行

**来源**：轮次2（维度H交叉影响）发现 #2 与 #3 的交叉遗漏

**修改**：在输出格式的"校验轮次"部分增加：
```markdown
- UI 专项校验: ✅ 全部通过（仅 UI 模块）
```

### 补充 #2b：迭代计数强制规则缺少 UI 专项校验输出示例

**来源**：轮次2（维度H交叉影响）发现 #2 同步修改第2点的具体内容缺失

**修改**：在迭代示例的 Phase 2 部分增加：
```
  - UI 专项校验: ✅ 5/5 通过（仅 UI 模块）
```

---

## 执行状态

> 状态：✅ 已完成
> 执行日期：2026-02-14
> 校验轮次：4 轮（A结构 ✅ → H交叉 ❌修复 → H交叉强制 ✅ → B边界 ✅）

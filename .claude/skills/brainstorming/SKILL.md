---
name: brainstorming
description: "Use when user triggers /brainstorm - performs requirement analysis with automatic multi-round validation"
metadata:
  invoked-by: "user"
  auto-execute: "true"
---

# Brainstorming Skill

## 概览

需求头脑风暴与分析，自动迭代正向/反向校验，直到输出完美需求文档。

## 何时使用

- 用户执行 `/brainstorm {模块名}`
- 需要进行需求分析和细化
- 产出 IEEE 830 兼容的需求规格

## ⚠️ 执行模式 - 自动迭代

```
⚠️ 铁律：
1. 不等待用户确认 - 自动继续执行
2. 必须循环迭代 - 直到所有检查项都是 ✅
3. 有任何问题就补充，然后重新校验
```

## 执行流程

```
开始
  │
  ▼
[收集输入]
  │ - 用户需求描述
  │ - 相关规格文档（${config.paths.docs.spec}）
  │ - PRD 源文件（${config.paths.docs.source}，如已配置）
  │ - UI 原型文件（${config.paths.docs.prototypes}，如已配置）
  │ - 已有代码参考
  │
  ▼
[生成初稿]
  │
  ▼
┌─ Phase 2: 领域专项校验（max 10 轮）─┐
│ [正向校验] ── 有问题？───┼── 补充 ──┐
│  ✅                      │           │
│ [反向校验] ── 有问题？───┼── 补充 ──┤
│  ✅                      │           │
│ [PRD覆盖率] ─ 有遗漏？───┼── 补充 ──┘
│  ✅                      │
└──────────────────────────┘
  │ ✅ 全部通过（或达到上限 → 失败退出）
  ▼
┌─ Phase 3: 增强全局终审（参见 quality-gate/SKILL.md）──┐
│ 每轮 = 三维度终审 + 多维度旋转校验（A~I）             │
│ 上轮有修改 → 维度 H；无修改 → 按优先级轮换            │
│ 退出条件：连续两轮无修改                               │
│ 上限：max 10 轮（达到上限 → 失败退出）                │
└────────────────────────────────────────────────────────┘
  │ ✅ 连续两轮无修改
  ▼
[输出结果]
```

## 正向校验项（5 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 细节层级 | 每个功能点是否有输入/输出/约束？ | 全部有 | 任一缺失 |
| 最小路径 | 能否找到遗漏的步骤？ | 不能 | 能找到 |
| 影响分析 | 是否分析了对其他模块的影响？ | 是 | 否 |
| 错误处理 | 每个操作的异常情况是否定义？ | 是 | 否 |
| 标准合规 | 是否符合 IEEE 830 要素？ | 是 | 否 |

## 反向校验项（6 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 用户视角 | 用户能完成目标吗？ | 能 | 不能 |
| 测试视角 | 能写出验收测试吗？ | 能 | 不能 |
| 场景覆盖 | 正常/异常/边界都覆盖了吗？ | 是 | 否 |
| 代码必要 | 需求都需要开发吗？ | 是 | 有冗余 |
| 重复检查 | 有重复的需求吗？ | 没有 | 有 |
| 可复用性 | 有可复用的模块吗？ | 已标注 | 未考虑 |

## PRD 覆盖率校验

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| PRD 功能点覆盖 | PRD 中的每个功能点是否都有对应需求？ | 100% 覆盖 | 有遗漏功能点 |

## UI 模块专项校验（当模块涉及 UI 还原时）

当 `config.paths.docs.prototypes` 已配置，且 `/brainstorm` 的模块名匹配到该目录下的原型文件时，自动追加以下校验项：

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 原型覆盖 | 原型中的所有页面是否都有对应需求？ | 是 | 有遗漏页面 |
| 组件清单 | 是否列出了所有需要实现的 UI 组件？ | 是 | 有遗漏组件 |
| 设计 Token | 是否定义了颜色、圆角、间距等设计变量？ | 是（引用 Agent 定义的 Token） | 否 |
| 交互行为 | 原型中的 JS 交互是否都有对应描述？ | 是 | 有遗漏交互 |
| 数据结构 | 表格列、表单字段是否与 PRD 数据字典一致？ | 是 | 有冲突 |

### 输入来源匹配规则

原型和 PRD 的查找基于 `config.paths.docs` 配置，按模块名自动匹配：

1. **原型文件**：在 `${config.paths.docs.prototypes}` 下查找与模块名同名或相关的子目录/文件
2. **PRD 文档**：在 `${config.paths.docs.source}` 下查找文件名包含模块关键词的 `.md` / `.docx` 文件
3. **规格文档**：在 `${config.paths.docs.spec}` 下查找相关子目录

> 具体的模块名到文件路径的映射关系由各项目在 `config.yaml` 中配置。如未配置映射，则按模块名模糊匹配文件名。

## 校验维度矩阵

| 维度 | 检查内容 | 方法 |
|------|----------|------|
| 结构层 | 编号连续、导航完整 | 逐个计数 |
| 格式层 | ID格式、时间格式、路径格式 | 正则验证 |
| 语义层 | 技术版本、配置值、业务术语 | 与 config.yaml 核对 |
| 逻辑层 | 流程完整、依赖正确、边界处理 | 走读验证 |

## 执行伪代码

```python
def brainstorming(user_input):
    # Step 1: 收集输入
    config = load_yaml(".claude/project/config.yaml")
    
    context = {
        "user_request": user_input,
        "spec_docs": read_dir(config.paths.docs.spec),
        "source_docs": read_matching_docs(config.paths.docs.source, user_input) if config.paths.docs.get("source") else [],
        "prototypes": read_matching_files(config.paths.docs.prototypes, user_input) if config.paths.docs.get("prototypes") else [],
        "existing_code": search_related_code()
    }
    
    # Step 2: 生成初稿
    requirement_doc = generate_requirement(context)
    
    # ========== Phase 2: 领域专项校验 ==========
    max_iterations = 10
    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        print(f"🔄 校验迭代 {iteration}/{max_iterations}")

        # 正向校验（5 项）
        forward_issues = []
        for check in FORWARD_CHECKS:
            result = check.execute(requirement_doc)
            if not result.passed:
                forward_issues.append(result.issue)
        if forward_issues:
            print(f"  正向校验: ❌ {len(forward_issues)} 个问题")
            requirement_doc = enhance_doc(requirement_doc, forward_issues)
            continue

        print("  正向校验: ✅ 5/5 通过")

        # 反向校验（6 项）
        backward_issues = []
        for check in BACKWARD_CHECKS:
            result = check.execute(requirement_doc)
            if not result.passed:
                backward_issues.append(result.issue)
        if backward_issues:
            print(f"  反向校验: ❌ {len(backward_issues)} 个问题")
            requirement_doc = enhance_doc(requirement_doc, backward_issues)
            continue

        print("  反向校验: ✅ 6/6 通过")

        # PRD 覆盖率校验
        prd_features = extract_prd_features(context["source_docs"])
        req_features = extract_requirement_features(requirement_doc)
        uncovered_prd = prd_features - req_features
        if uncovered_prd:
            print(f"  PRD 覆盖率: ❌ {len(uncovered_prd)} 个功能点未覆盖")
            requirement_doc = enhance_doc(requirement_doc, [f"PRD 未覆盖: {f}" for f in uncovered_prd])
            continue

        print(f"  PRD 覆盖率: ✅ {len(prd_features)}/{len(prd_features)} = 100%")
        break  # Phase 2 通过
    else:
        return {"status": "failed", "reason": f"Phase 2 经过 {max_iterations} 轮迭代仍未通过"}

    # ========== Phase 3: 增强全局终审 ==========
    # 参见 quality-gate/SKILL.md 的 enhanced_global_review()
    # 本环节维度优先级: B → C → E → H → A → D → G → F → I
    # 本环节三维度检查:
    #   上游一致性: PRD 功能点 100% 覆盖？
    #   下游可行性: 每个 REQ 可拆分为 Story？
    #   全局完整性: REQ 之间无矛盾？

    dim_priority = ["B", "C", "E", "H", "A", "D", "G", "F", "I"]
    max_enhanced_rounds = 10
    no_change_rounds = 0
    dim_index = 0
    last_had_changes = False

    for round_num in range(1, max_enhanced_rounds + 1):
        all_issues = []

        # --- 3a. 三维度终审（每轮都做） ---
        # 上游一致性
        prd_features = extract_prd_features(context["source_docs"])
        req_features = extract_requirement_features(requirement_doc)
        if prd_features - req_features:
            all_issues.append("上游一致性: PRD 功能点未 100% 覆盖")

        # 下游可行性
        for req in requirement_doc.requirements:
            if not is_splittable_to_story(req):
                all_issues.append(f"下游可行性: {req.id} 无法拆分为 Story")

        # 全局完整性
        contradictions = find_contradictions(requirement_doc.requirements)
        if contradictions:
            for c in contradictions:
                all_issues.append(f"全局完整性: 需求矛盾 {c}")

        # --- 3b. 多维度旋转校验（每轮选一个维度） ---
        if last_had_changes:
            dim = "H"  # 上轮有修改，优先检查交叉影响
        else:
            dim = dim_priority[dim_index % len(dim_priority)]
            dim_index += 1

        dim_issues = check_dimension(requirement_doc, dim, DIMENSION_MEANINGS["brainstorm"][dim])
        all_issues += dim_issues

        # --- 输出进度 ---
        print(f"🔍 终审轮次 {round_num}/{max_enhanced_rounds} (维度 {dim})")

        # --- 判断 ---
        if all_issues:
            print(f"  ❌ {len(all_issues)} 个问题")
            for issue in all_issues:
                print(f"    - {issue}")
            requirement_doc = enhance_doc(requirement_doc, all_issues)
            no_change_rounds = 0
            last_had_changes = True
        else:
            print(f"  ✅ 无问题")
            no_change_rounds += 1
            last_had_changes = False
            if no_change_rounds >= 2:
                print(f"🎉 连续 {no_change_rounds} 轮无修改，终审通过")
                break
    else:
        return {"status": "failed", "reason": f"增强终审经过 {max_enhanced_rounds} 轮仍未通过，请人工介入"}

    # Step 4: 输出结果（仅在 Phase 3 通过后才执行）
    # 更新 workflow 状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.workflow.current_step = "brainstorm_done"
    state.workflow.next_step = "split_story"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return format_output(requirement_doc)
```

## 失败退出规则

```
⚠️ Phase 2 失败：当 max_iterations（默认 10）次迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止自动继续 — 提示用户人工介入
4. 用户可以补充信息后重新执行 /brainstorm

⚠️ Phase 3 失败：当增强终审经过 max_enhanced_rounds（默认 10）轮后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止自动继续 — 提示用户人工介入
4. 用户可以补充信息后重新执行 /brainstorm
```

## 输出格式

```markdown
## 📋 需求分析结果

### 校验轮次
- 总轮次: {iteration}
- 正向校验: ✅ 全部通过
- 反向校验: ✅ 全部通过
- PRD 覆盖率: ✅ 全部覆盖

### 需求规格

#### 1. 概述
{功能概述}

#### 2. 功能需求
| ID | 需求描述 | 优先级 | 验收标准 |
|----|----------|--------|----------|
| REQ-001 | ... | P0 | ... |

#### 3. 非功能需求
...

#### 4. 接口定义
...

### ⏭️ 下一步
执行 `/split story` 将需求拆解为 Stories
```

## 硬约束

- 禁止跳过任何校验项
- 禁止在校验未全部通过时输出
- 禁止停下来等待用户确认
- 必须循环直到全部 ✅
- **禁止超过 max_iterations（10 次）迭代** - Phase 2 达到上限必须失败退出
- **禁止超过 max_enhanced_rounds（10 轮）增强终审** - Phase 3 达到上限必须失败退出
- **连续两轮无修改才算通过** - 不是一轮无修改就通过
- **上轮有修改 → 维度 H** - 任何修改后必须优先检查交叉影响
- **每次迭代必须输出进度** - Phase 2：`🔄 校验迭代 N/10`，Phase 3：`� 终审轮次 N/10 (维度 X)`

---

## 🚨 迭代计数强制规则

**每次校验循环开始时，必须输出迭代进度：**

```
=== Phase 2: 领域专项校验 ===
🔄 校验迭代 1/10
  - 正向校验: 检查中...
  - 反向校验: 检查中...
  - PRD 覆盖率: 检查中...

🔄 校验迭代 2/10 (上轮发现 2 个问题，已补充)
  - 正向校验: ✅ 5/5 通过
  - 反向校验: ✅ 6/6 通过
  - PRD 覆盖率: ✅ 100%

=== Phase 3: 增强全局终审 ===
🔍 终审轮次 1/10 (维度 B — 边界场景)
  三维度终审: ✅ 3/3
  多维度校验 (B): ❌ 2 个问题
    - 缺少空列表场景
    - 缺少超大输入校验

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🔍 终审轮次 3/10 (维度 C — 数据流)
  三维度终审: ✅ 3/3
  多维度校验 (C): ✅ 无问题

🎉 连续 2 轮无修改，终审通过
```

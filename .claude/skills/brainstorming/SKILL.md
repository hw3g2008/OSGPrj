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
┌─ Phase 0: PRD 生成（闭环，max 3 轮）────────────┐
│ [1] PRD 存在？                                     │
│      ├─ 不存在 → 需要生成                        │
│      └─ 已存在 → 询问用户: 重新生成 or 使用已有 │
│                                                      │
│ [2] 闭环（round 1..3）:                           │
│      调用 prototype-extraction 完整5步             │
│      ↓                                              │
│      检查 html_issues                               │
│      ├─ 无问题 → ✅ 退出闭环 → Phase 1          │
│      └─ 有问题:                                    │
│           ├─ 未达安全阀 → 同步询问PM裁决         │
│           │   → 更新PRD → 回到闭环顶部重跑       │
│           └─ 达到安全阀 → 输出 open-questions.md │
│               → brainstorm_pending_confirm → 停止 │
│                                                      │
│ md/docx 文档仅作业务背景参考                      │
└───────────────────────────────────────────────┘
  │
  ▼
[Phase 1: 收集输入 + 生成 SRS 初稿]
  │ - PRD 文档（Phase 0 产物，SSOT 来源）
  │ - 已有代码参考
  │ - 相关规格文档（${config.paths.docs.spec}）
  │ - md/docx 文档（仅作业务背景参考）
  │
  ▼
[生成 SRS 初稿]
  │
  ▼
┌─ Phase 2: 领域专项校验（max 10 轮）─┐
│ [正向校验] ── 有问题？───┼── 补充 ──┐
│  ✅                      │           │
│ [反向校验] ── 有问题？───┼── 补充 ──┤
│  ✅                      │           │
│ [PRD覆盖率] ─ 有遗漏？───┼── 补充 ──┤
│  ✅                      │           │
│ [UI专项校验] ─ 有问题？──┼── 补充 ──┘
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
┌─ Phase 4: HTML↔PRD↔SRS 全量校验 ────────────────┐
│ [1] 按 module_prototype_map 逐端浏览 HTML 原型     │
│ [2] 逐页面截图 + snapshot 对比 PRD/SRS             │
│ [3] 差异处理（HTML 是 SSOT）:                      │
│     A类: HTML有PRD/SRS无 → 直接补充PRD+SRS        │
│     B类: PRD/SRS有HTML无 → 问题确认清单           │
│     C类: HTML自身内部矛盾 → 问题确认清单          │
│     D类: HTML明显Bug → PRD标注+问题确认清单       │
│ [4] 有 A 类补充 → 回到 Phase 2 重新校验            │
│     （max 1 次回退，防死循环）                      │
└────────────────────────────────────────────────────┘
  │
  ├─ 无 B/C/D 类 → [输出结果] → brainstorm_done
  │
  └─ 有 B/C/D 类 → [输出结果 + 疑问清单] → brainstorm_pending_confirm
```

## 正向校验项（6 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 细节层级 | 每个功能点是否有输入/输出/约束？ | 全部有 | 任一缺失 |
| 最小路径 | 能否找到遗漏的步骤？ | 不能 | 能找到 |
| 影响分析 | 是否分析了对其他模块的影响？ | 是 | 否 |
| 错误处理 | 每个操作的异常情况是否定义？ | 是 | 否 |
| 标准合规 | 是否符合 IEEE 830 要素？ | 是 | 否 |
| 业务入口闭环 | 用户从进入系统到完成目标的完整旅程是否覆盖？独立于 PRD 覆盖率检查，直接对照原型 HTML 验证。必须回答：用户如何进入系统？（登录/注册）用户如何离开系统？（退出/超时）是否有错误兜底页面？（403/404/500） | 全部覆盖 | 任一缺失 |

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

## UI 专项校验

Phase 2 中必须执行的 UI 相关校验项：

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 原型覆盖 | 原型中的所有页面是否都有对应需求？ | 是 | 有遗漏页面 |
| 组件清单 | 是否列出了所有需要实现的 UI 组件？ | 是 | 有遗漏组件 |
| 设计 Token | 是否定义了颜色、圆角、间距等设计变量？ | 是（引用 Agent 定义的 Token） | 否 |
| 交互行为 | 原型中的 JS 交互是否都有对应描述？ | 是 | 有遗漏交互 |
| 数据结构 | 表格列、表单字段是否与 PRD 数据字典一致？ | 是 | 有冲突 |
| 设计 Token 精确度 | SRS §8 每个设计变量值是否与 HTML :root 完全一致？ | 是（逐个对比） | 有偏差 |
| 跨区块一致性 | 同一业务概念在 HTML 不同位置（JS变量、下拉选项、表格预置数据、弹窗字段）的数据是否一致？例如：登录选择器角色列表 vs roleMenus key 列表；权限 checkbox 列表 vs 侧边栏页面列表；新增弹窗字段控件 vs 编辑弹窗字段控件。 | 全部一致 | 有矛盾（标记为原型问题） |

### 输入来源优先级（SSOT 原则）

```
优先级 1（唯一真实来源）: HTML 原型 → PRD 文档
优先级 2（工程视角）    : PRD 文档 → SRS（brainstorm 产物）
优先级 3（仅作参考）    : md/docx 文档、已有代码
```

### 输入来源匹配规则

1. **PRD 文档**（主要输入）：在 `${config.paths.docs.prd}/{module}/` 下查找
2. **HTML 原型**（PRD 不存在时的来源）：按 `config.prd_process.module_prototype_map` 查找
3. **md/docx 文档**（仅参考）：在 `${config.paths.docs.source}` 下模糊匹配
4. **规格文档**：在 `${config.paths.docs.spec}` 下查找相关子目录

> 关键原则：PRD 文档是 brainstorm 的主要输入，如果 PRD 不存在，Phase 0 会自动从 HTML 原型生成。

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
    config = load_yaml(".claude/project/config.yaml")
    module_name = extract_module_name(user_input)
    
    # ========== Phase 0: PRD 生成（闭环，max 3 轮）==========
    prd_dir = f"{config.paths.docs.prd}/{module_name}/"
    MAX_PHASE0_ROUNDS = 3
    need_extraction = False
    
    if not exists(prd_dir) or is_empty(prd_dir):
        print(f"⚠️ PRD 不存在，从 HTML 全量生成: {prd_dir}")
        need_extraction = True
    else:
        user_choice = ask_user("PRD 已存在，请选择:", ["重新生成", "使用已有"])
        if user_choice == "重新生成":
            need_extraction = True
        else:
            print(f"✅ 使用已有 PRD: {prd_dir}")
    
    if need_extraction:
        for round_num in range(1, MAX_PHASE0_ROUNDS + 1):
            print(f"🔄 Phase 0 第 {round_num}/{MAX_PHASE0_ROUNDS} 轮")
            
            result = invoke_skill("prototype-extraction", module_name, config)
            if result["status"] == "failed":
                return {"status": "failed", "reason": f"PRD 生成失败: {result['reason']}"}
            
            html_issues = result.get("html_issues", [])
            if not html_issues:
                print(f"✅ Phase 0 通过（第 {round_num} 轮无问题）")
                break  # 进入 Phase 1
            
            # 安全阀：直接阻塞，不继续走 Phase 1~4
            if round_num >= MAX_PHASE0_ROUNDS:
                questions_path = f"{config.paths.docs.srs}{module_name}-open-questions.md"
                write_open_questions(questions_path, html_issues)
                state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
                state.workflow.current_step = "brainstorm_pending_confirm"
                state.workflow.next_step = "approve_brainstorm"
                state.workflow.auto_continue = False
                write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
                print(f"⛔ Phase 0 安全阀：{len(html_issues)} 个问题写入 {questions_path}")
                return  # 停在这里，等 /approve brainstorm
            
            # 同步询问 PM 裁决（不 return，不需要恢复）
            print(f"⚠️ 发现 {len(html_issues)} 个 HTML 内部问题，请 PM 裁决：")
            decisions = ask_user_resolve_issues(html_issues)  # C类选值 / D类处理方式
            apply_decisions_to_prd(decisions, prd_dir)
            # 回到循环顶部重跑 prototype-extraction
    
    # ⛔ 门控点 1: 检查 prototype-extraction 产物完整性
    gate_result = run_command(f"bash bin/check-skill-artifacts.sh prototype-extraction {module_name} {prd_dir}")
    if gate_result.exit_code != 0:
        return failed("prototype-extraction 门控未通过，请补充缺失产物后重试")

    # ========== Phase 1: 收集输入 + 生成 SRS 初稿 ==========
    context = {
        "user_request": user_input,
        "prd_docs": read_dir(prd_dir),                    # 主要输入（SSOT）
        "spec_docs": read_dir(config.paths.docs.spec),    # 规格文档
        "background_docs": read_matching_docs(config.paths.docs.source, module_name),  # 仅参考
        "existing_code": search_related_code()
    }
    
    # 增量更新：如果 SRS 已存在，对比 PRD 差异后增量更新
    existing_srs_path = f"{config.paths.docs.srs}{module_name}.md"
    if exists(existing_srs_path):
        existing_srs = read_file(existing_srs_path)
        prd_diff = compare_prd_vs_srs(context["prd_docs"], existing_srs)
        if prd_diff:
            print(f"⚠️ 发现 {len(prd_diff)} 处 PRD 与 SRS 差异，增量更新")
            requirement_doc = update_srs(existing_srs, prd_diff, context)
        else:
            print("✅ SRS 与 PRD 一致，无需更新")
            requirement_doc = existing_srs
    else:
        # 全新生成 SRS 初稿（每个 FR 必须标注 PRD 来源）
        requirement_doc = generate_srs(context)
    
    # ========== Phase 2: 领域专项校验 ==========
    max_iterations = 10
    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        print(f"🔄 校验迭代 {iteration}/{max_iterations}")

        # 正向校验（6 项）
        forward_issues = []
        for check in FORWARD_CHECKS:
            result = check.execute(requirement_doc)
            if not result.passed:
                forward_issues.append(result.issue)
        if forward_issues:
            print(f"  正向校验: ❌ {len(forward_issues)} 个问题")
            requirement_doc = enhance_doc(requirement_doc, forward_issues)
            continue

        print("  正向校验: ✅ 6/6 通过")

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
        prd_features = extract_prd_features(context["prd_docs"])
        req_features = extract_requirement_features(requirement_doc)
        uncovered_prd = prd_features - req_features
        if uncovered_prd:
            print(f"  PRD 覆盖率: ❌ {len(uncovered_prd)} 个功能点未覆盖")
            requirement_doc = enhance_doc(requirement_doc, [f"PRD 未覆盖: {f}" for f in uncovered_prd])
            continue

        print(f"  PRD 覆盖率: ✅ {len(prd_features)}/{len(prd_features)} = 100%")

        # --- UI 专项校验 ---
        module_prototypes = config.prd_process.module_prototype_map.get(module_name)
        ui_issues = []

        # 原型覆盖：PRD 中的所有页面是否都有对应需求？
        prototype_pages = extract_prd_pages(prd_dir, module_prototypes)
        req_pages = extract_requirement_pages(requirement_doc)
        uncovered_pages = prototype_pages - req_pages
        if uncovered_pages:
            ui_issues.append(f"原型覆盖: {len(uncovered_pages)} 个页面未有对应需求")

        # 组件清单：是否列出了所有需要实现的 UI 组件？
        if not has_component_list(requirement_doc):
            ui_issues.append("组件清单: 未列出需要实现的 UI 组件")

        # 设计 Token：是否定义了设计变量？
        if not has_design_tokens(requirement_doc):
            ui_issues.append("设计 Token: 未定义颜色/圆角/间距等设计变量")

        # 交互行为：PRD 中的交互规则是否都有对应描述？
        prototype_interactions = extract_prd_interactions(prd_dir, module_prototypes)
        req_interactions = extract_requirement_interactions(requirement_doc)
        uncovered_interactions = prototype_interactions - req_interactions
        if uncovered_interactions:
            ui_issues.append(f"交互行为: {len(uncovered_interactions)} 个交互未有对应描述")

        # 数据结构：表格列、表单字段是否与 PRD 数据字典一致？
        data_mismatches = check_data_structure_consistency(requirement_doc, context["prd_docs"])
        if data_mismatches:
            ui_issues.append(f"数据结构: {len(data_mismatches)} 个字段与 PRD 数据字典不一致")

        # 设计 Token 精确度：SRS §8 每个值 vs HTML :root 对应值，必须完全一致
        design_system_prd = find_file(prd_dir, "DESIGN-SYSTEM.md")
        if design_system_prd:
            prd_tokens = extract_design_tokens(design_system_prd)  # 从 PRD 提取的真实值
            srs_tokens = extract_srs_design_tokens(requirement_doc)  # SRS §8 中的值
            token_mismatches = []
            for token_name, prd_value in prd_tokens.items():
                srs_value = srs_tokens.get(token_name)
                if srs_value and srs_value != prd_value:
                    token_mismatches.append(f"{token_name}: SRS={srs_value} vs PRD={prd_value}")
            if token_mismatches:
                ui_issues.append(f"设计 Token 精确度: {len(token_mismatches)} 个值与 PRD/HTML 不一致")

        # 跨区块一致性：同一业务概念在 HTML 不同位置的数据是否一致？
        cross_block_issues = check_cross_block_consistency(module_prototypes)
        # 检查项：登录选择器角色 vs roleMenus keys vs roleNames keys
        #         权限 checkbox 列表 vs 侧边栏 showPage() 页面列表
        #         新增弹窗字段控件类型 vs 编辑弹窗字段控件类型
        if cross_block_issues:
            ui_issues.append(f"跨区块一致性: {len(cross_block_issues)} 处矛盾")

        if ui_issues:
            print(f"  UI 专项校验: ❌ {len(ui_issues)} 个问题")
            for issue in ui_issues:
                print(f"    - {issue}")
            requirement_doc = enhance_doc(requirement_doc, ui_issues)
            continue  # 回到正向校验

        print(f"  UI 专项校验: ✅ 7/7 通过")

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
        prd_features = extract_prd_features(context["prd_docs"])
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

    # ========== Phase 4: HTML↔PRD↔SRS 全量校验（含回退重校验）==========
    MAX_PHASE4_RETRIES = 1
    phase4_retry = 0

    while True:
        module_prototypes_p4 = config.prd_process.module_prototype_map.get(module_name)
        open_questions = []
        has_a_type_fixes = False

        print(f"=== Phase 4: HTML↔PRD↔SRS 全量校验{f'（回退第 {phase4_retry} 次后）' if phase4_retry > 0 else ''} ===")
        server = start_http_server(config.paths.docs.prototypes)

        for prototype_file in module_prototypes_p4:
            pages = get_module_pages(prototype_file, module_name)
            for page in pages:
                print(f"🔍 校验: {prototype_file} → {page.name}")
                screenshot = take_screenshot(page)
                snapshot = take_snapshot(page)
                prd_diff = compare_with_prd(snapshot, context["prd_docs"])
                srs_diff = compare_with_srs(snapshot, requirement_doc)

                for diff in prd_diff + srs_diff:
                    if diff.type == "html_has_doc_missing":  # A类: HTML有PRD/SRS无
                        print(f"  ✅ A类: {diff.description} → 补充到 PRD + SRS")
                        update_prd(diff, context["prd_docs"])
                        requirement_doc = enhance_doc(requirement_doc, [diff.description])
                        has_a_type_fixes = True
                    elif diff.type == "doc_has_html_missing":  # B类: PRD/SRS有HTML无
                        print(f"  ❓ B类: {diff.description} → 待确认")
                        open_questions.append({"type": "B", "desc": diff.description})
                    elif diff.type == "html_internal_conflict":  # C类: HTML自身矛盾
                        print(f"  ❓ C类: {diff.description} → 待产品裁决")
                        open_questions.append({"type": "C", "desc": diff.description})
                    elif diff.type == "html_bug":  # D类: HTML明显Bug
                        print(f"  🐛 D类: {diff.description} → 标注+待确认")
                        open_questions.append({"type": "D", "desc": diff.description})

        server.stop()
        print(f"Phase 4 完成: A类补充={has_a_type_fixes}, B/C/D类={len(open_questions)} 个")

        # A 类补充后回到 Phase 2 重新校验（max 1 次回退）
        if has_a_type_fixes and phase4_retry < MAX_PHASE4_RETRIES:
            phase4_retry += 1
            print(f"⚠️ Phase 4 有 A 类补充，回到 Phase 2 重新校验（第 {phase4_retry} 次回退）")
            # 回到 Phase 2 完整重跑
            # （复用上面的 Phase 2 循环逻辑，此处省略展开，实际执行时完整重跑）
            iteration = 0
            while iteration < max_iterations:
                iteration += 1
                # ... Phase 2 完整校验逻辑（正向+反向+PRD覆盖率+UI专项）...
                pass  # 同上面 Phase 2 代码
            # 回到 Phase 3 完整重跑
            no_change_rounds = 0
            dim_index = 0
            for round_num in range(1, max_enhanced_rounds + 1):
                # ... Phase 3 完整终审逻辑 ...
                pass  # 同上面 Phase 3 代码
            # 回到 while 顶部重新执行 Phase 4
            continue
        else:
            break  # 无 A 类补充，或已达回退上限

    # ⛔ 门控点 2: 检查 brainstorming 产物完整性
    gate_result = run_command(f"bash bin/check-skill-artifacts.sh brainstorming {module_name} {prd_dir}")
    if gate_result.exit_code != 0:
        return failed("brainstorming 门控未通过，请补充缺失产物后重试")

    # ========== 输出结果 ==========
    # 注意：只有 B/C/D 类才算"有问题"，A 类（auto_fixed）不算
    if open_questions:
        questions_path = f"{config.paths.docs.srs}{module_name}-open-questions.md"
        write_open_questions(questions_path, open_questions)
        print(f"📋 需求疑问清单: {questions_path}")

    # 更新 workflow 状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    if open_questions:  # 只有 B/C/D 类
        state.workflow.current_step = "brainstorm_pending_confirm"
        state.workflow.next_step = "approve_brainstorm"
        state.workflow.auto_continue = False
        print("⚠️ 有待确认项，阻塞自动继续。请产品确认后执行 /approve brainstorm")
    else:
        state.workflow.current_step = "brainstorm_done"
        state.workflow.next_step = "split_story"
        state.workflow.auto_continue = True
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return format_output(requirement_doc)
```

## 失败退出规则

```
⚠️ Phase 0 安全阀：当闭环经过 3 轮后仍有 html_issues：
1. 输出 {module}-open-questions.md
2. 设置 workflow.current_step = brainstorm_pending_confirm
3. 停止 — 不继续走 Phase 1~4（上游有问题不往下跑）
4. 等 /approve brainstorm 确认后 → brainstorm_done → 自动 split story

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

⚠️ Phase 4 阻塞：当存在不确定差异时：
1. 输出需求疑问清单（{module}-open-questions.md）
2. 设置 workflow.current_step = brainstorm_pending_confirm
3. 停止自动继续 — 等待产品确认
4. 产品确认后重新执行 /brainstorm（增量更新路径）或 /approve brainstorm
```

## 输出格式

```markdown
## 📋 需求分析结果

### 校验轮次
- 总轮次: {iteration}
- 正向校验: ✅ 全部通过
- 反向校验: ✅ 全部通过
- PRD 覆盖率: ✅ 全部覆盖
- UI 专项校验: ✅ 全部通过

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

#### 5. 数据库变更
| 表名 | 变更类型 | 字段 | 说明 |
|------|---------|------|------|
| ... | 新增表/新增字段/修改字段 | ... | ... |

#### 6. 技术约束
- 性能要求: ...
- 安全要求: ...
- 兼容性: ...

### Phase 4 校验结果
- 浏览页面数: {page_count}
- 确定差异: {certain_count}（已补充）
- 待确认项: {question_count}
- 疑问清单: {module}-open-questions.md（仅在有待确认项时）

### ⏭️ 下一步
- 无待确认项: 执行 `/split story` 将需求拆解为 Stories
- 有待确认项: 请产品确认疑问清单后重新执行 `/brainstorm {module}`
```

## 硬约束

- 禁止跳过任何校验项
- 禁止在校验未全部通过时输出
- 禁止停下来等待用户确认
- 必须循环直到全部 ✅
- **必须执行 UI 专项校验**
- **禁止超过 max_iterations（10 次）迭代** - Phase 2 达到上限必须失败退出
- **禁止超过 max_enhanced_rounds（10 轮）增强终审** - Phase 3 达到上限必须失败退出
- **连续两轮无修改才算通过** - 不是一轮无修改就通过
- **上轮有修改 → 维度 H** - 任何修改后必须优先检查交叉影响
- **每次迭代必须输出进度** - Phase 2：`🔄 校验迭代 N/10`，Phase 3：`🔍 终审轮次 N/10 (维度 X)`
- **Phase 4 必须执行 HTML↔PRD↔SRS 全量校验** - 保证最终结果正确性
- **Phase 4 必须逐端逐页面浏览** - 不能只看 PRD 文档，必须打开浏览器实测
- **A类差异（HTML有PRD/SRS无）直接补充** - HTML 是 SSOT，无需确认
- **B/C/D类差异必须输出问题确认清单** - 不能自作主张决定以谁为准
- **有问题确认清单时必须阻塞** - 不能自动继续 split story
- **禁止 AI 自行裁决 HTML 内部矛盾** - C类必须等产品确认
- **Phase 0 PRD 已存在时必须询问用户** - 由用户决定重新生成还是使用已有
- **Phase 0 闭环必须完整重跑** - PM 裁决后必须重跑 prototype-extraction 完整 5 步
- **Phase 0 max 3 轮** - 安全阀到了直接阻塞（输出 open-questions.md），不带着错误往下跑
- **Phase 0 每轮必须输出进度** - `🔄 Phase 0 第 N/3 轮`
- **Phase 0 完成后必须运行门控脚本** - `bash bin/check-skill-artifacts.sh prototype-extraction` 检查产物完整性
- **门控脚本失败时禁止继续 Phase 1** - 必须回到 prototype-extraction 补充缺失产物
- **Phase 4 发现 B/C/D 类问题时，必须写入 {module}-open-questions.md** — 禁止跳过此步骤
- **Phase 4 有 open_questions 时，必须设置 brainstorm_pending_confirm** — 禁止自动继续 split story

---

## 🚨 迭代计数强制规则

**每次校验循环开始时，必须输出迭代进度：**

```
=== Phase 0: PRD 生成 ===
🔄 Phase 0 第 1/3 轮
  - prototype-extraction: 完成 (7 个 PRD 文件)
  - html_issues: ❌ 2 个问题 (1 个 C类, 1 个 D类)
  → 同步询问 PM 裁决...

🔄 Phase 0 第 2/3 轮 (PM 已裁决 2 个问题)
  - prototype-extraction: 完成 (7 个 PRD 文件)
  - html_issues: ✅ 无问题
  ✅ Phase 0 通过

=== Phase 2: 领域专项校验 ===
🔄 校验迭代 1/10
  - 正向校验: 检查中...
  - 反向校验: 检查中...
  - PRD 覆盖率: 检查中...

🔄 校验迭代 2/10 (上轮发现 2 个问题，已补充)
  - 正向校验: ✅ 6/6 通过
  - 反向校验: ✅ 6/6 通过
  - PRD 覆盖率: ✅ 100%
  - UI 专项校验: ✅ 7/7 通过

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

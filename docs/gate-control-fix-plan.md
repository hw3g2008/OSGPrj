# 门控缺失修复方案

> 状态：待审批。逐项列出每个 Skill 文件需要修改的具体内容和代码。
> 日期：2026-02-13
> 来源：windsurf-cc-integration.md 第 10 节门控分析

---

## 修复总览

| # | 文件 | 缺失项 | 优先级 | 修改类型 |
|---|------|--------|--------|---------|
| 1 | brainstorming/SKILL.md | PRD 覆盖率校验 | 🔴 高 | 新增代码块 |
| 2 | brainstorming/SKILL.md | Phase 3 全局终审 | 🟡 中 | 新增代码块 |
| 3 | story-splitter/SKILL.md | Phase 3 全局终审 | 🟡 中 | 新增代码块 |
| 4 | ticket-splitter/SKILL.md | Phase 3 全局终审 | 🟡 中 | 新增代码块 |
| 5 | deliver-ticket/SKILL.md | Phase 3 全局终审（跨 Ticket 影响） | 🟡 中 | 新增代码块 |
| 6 | verification/SKILL.md | Story AC 覆盖率校验 | 🔴 高 | 新增代码块 |
| 7 | verification/SKILL.md | 多轮迭代 + 自动修复循环 | 🔴 高 | 重写 verify 函数 |
| 8 | verification/SKILL.md | 明确失败退出逻辑 | 🟡 中 | 新增代码块 |
| 9 | verification/SKILL.md | Phase 3 全局终审（独立展开） | 🟡 中 | 新增代码块 |
| 35 | implement-fix-plan.md | 增加"交叉影响"校验维度 H | 🔴 高 | 新增维度+规则 |

---

## 修复 #1：brainstorming/SKILL.md — PRD 覆盖率校验

### 位置

在 `执行伪代码` 的 while 循环内，反向校验之后、`break` 之前插入。

### 当前代码（第 149-164 行附近）

```python
        print("  反向校验: ✅ 6/6 通过")

        # 全部通过
        break
```

### 修改为

```python
        print("  反向校验: ✅ 6/6 通过")

        # --- PRD 覆盖率校验（新增）---
        prd_features = extract_prd_features(context["source_docs"])
        req_features = extract_requirement_features(requirement_doc)
        uncovered_prd = prd_features - req_features

        if uncovered_prd:
            print(f"  PRD 覆盖率: ❌ {len(uncovered_prd)} 个 PRD 功能点未覆盖")
            for feat in uncovered_prd:
                print(f"    - {feat}")
            requirement_doc = enhance_doc(requirement_doc, [f"PRD 功能点未覆盖: {f}" for f in uncovered_prd])
            continue  # 回到正向校验

        print(f"  PRD 覆盖率: ✅ {len(prd_features)}/{len(prd_features)} = 100%")

        # 全部通过
        break
```

### 同步修改

在 `正向校验项` 表格后面新增一节：

```markdown
## PRD 覆盖率校验（新增）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| PRD 功能点覆盖 | PRD 中的每个功能点是否都有对应需求？ | 100% 覆盖 | 有遗漏功能点 |
```

在 `输出格式` 中的校验轮次部分增加：

```markdown
- PRD 覆盖率: ✅ 全部覆盖
```

---

## 修复 #2：brainstorming/SKILL.md — Phase 3 全局终审

### 位置

将现有的 while 循环包裹在外层循环中。Phase 2（逐项校验）通过后执行 Phase 3（全局终审），Phase 3 不通过则回到 Phase 2。

### 当前代码结构

```python
    max_iterations = 10
    iteration = 0
    while iteration < max_iterations:
        # ... 正向校验 + 反向校验 + PRD 覆盖率校验（修复 #1）...
        break
    else:
        raise BrainstormFailure(...)

    # Step 4: 输出结果
```

### 修改为

```python
    # ========== 外层循环：Phase 2 + Phase 3 ==========
    max_global_retries = 3
    for global_retry in range(max_global_retries):
        print(f"🔄 全局校验轮次 {global_retry + 1}/{max_global_retries}")

        # ========== Phase 2: 逐项校验循环 ==========
        max_iterations = 10
        iteration = 0
        phase2_passed = False

        while iteration < max_iterations:
            iteration += 1
            print(f"  🔄 校验迭代 {iteration}/{max_iterations}")

            # 正向校验（5 项）
            forward_issues = []
            for check in FORWARD_CHECKS:
                result = check.execute(requirement_doc)
                if not result.passed:
                    forward_issues.append(result.issue)
            if forward_issues:
                print(f"    正向校验: ❌ {len(forward_issues)} 个问题")
                requirement_doc = enhance_doc(requirement_doc, forward_issues)
                continue

            print("    正向校验: ✅ 5/5 通过")

            # 反向校验（6 项）
            backward_issues = []
            for check in BACKWARD_CHECKS:
                result = check.execute(requirement_doc)
                if not result.passed:
                    backward_issues.append(result.issue)
            if backward_issues:
                print(f"    反向校验: ❌ {len(backward_issues)} 个问题")
                requirement_doc = enhance_doc(requirement_doc, backward_issues)
                continue

            print("    反向校验: ✅ 6/6 通过")

            # PRD 覆盖率校验（修复 #1）
            prd_features = extract_prd_features(context["source_docs"])
            req_features = extract_requirement_features(requirement_doc)
            uncovered_prd = prd_features - req_features
            if uncovered_prd:
                print(f"    PRD 覆盖率: ❌ {len(uncovered_prd)} 个功能点未覆盖")
                requirement_doc = enhance_doc(requirement_doc, [f"PRD 未覆盖: {f}" for f in uncovered_prd])
                continue

            print(f"    PRD 覆盖率: ✅ {len(prd_features)}/{len(prd_features)} = 100%")

            phase2_passed = True
            break
        else:
            raise BrainstormFailure(f"Phase 2 经过 {max_iterations} 轮迭代仍未通过")

        if not phase2_passed:
            continue

        # ========== Phase 3: 全局终审 ==========
        final_review_issues = []

        # 上游一致性：PRD 功能点 100% 覆盖？（再次确认）
        prd_features = extract_prd_features(context["source_docs"])
        req_features = extract_requirement_features(requirement_doc)
        if prd_features - req_features:
            final_review_issues.append("上游一致性: PRD 功能点未 100% 覆盖")

        # 下游可行性：需求可拆分为 Stories？
        for req in requirement_doc.requirements:
            if not is_splittable_to_story(req):
                final_review_issues.append(f"下游可行性: {req.id} 无法拆分为 Story")

        # 全局完整性：需求之间无矛盾？
        contradictions = find_contradictions(requirement_doc.requirements)
        if contradictions:
            for c in contradictions:
                final_review_issues.append(f"全局完整性: 需求矛盾 {c}")

        if not final_review_issues:
            print("  全局终审: ✅ 通过")
            break  # 全局终审通过，退出外层循环

        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        requirement_doc = enhance_doc(requirement_doc, final_review_issues)
        continue  # 回到 Phase 2
    else:
        raise BrainstormFailure(f"全局终审经过 {max_global_retries} 次重试仍未通过")

    # Step 4: 输出结果（仅在 Phase 3 通过后才执行）
```

---

## 修复 #3：story-splitter/SKILL.md — Phase 3 全局终审

### 位置

将现有的 while 循环包裹在外层循环中（与修复 #2 模式一致）。

### 当前代码结构

```python
    max_iterations = 5
    iteration = 0
    while iteration < max_iterations:
        # ... INVEST 校验 + FR↔Story 覆盖率校验 ...
        break
    else:
        return {"status": "failed", ...}

    # 输出覆盖矩阵
    print_coverage_matrix(all_fr_ids, stories)
```

### 修改为

```python
    # ========== 外层循环：Phase 2 + Phase 3 ==========
    max_global_retries = 3
    for global_retry in range(max_global_retries):
        print(f"🔄 全局校验轮次 {global_retry + 1}/{max_global_retries}")

        # ========== Phase 2: 逐项校验循环（现有逻辑）==========
        max_iterations = 5
        iteration = 0
        phase2_passed = False

        while iteration < max_iterations:
            iteration += 1
            # ... INVEST 校验 + FR↔Story 覆盖率校验（现有代码不变）...
            phase2_passed = True
            break
        else:
            return {"status": "failed", "reason": "Phase 2 max_iterations_exceeded"}

        if not phase2_passed:
            continue

        # ========== Phase 3: 全局终审 ==========
        final_review_issues = []

        # 上游一致性：需求文档 FR 100% 覆盖？（再次确认）
        all_fr_ids = extract_all_fr_ids(requirement_doc)
        covered_frs = set()
        for story in stories:
            covered_frs.update(story["requirements"])
        if all_fr_ids - covered_frs:
            final_review_issues.append(f"上游一致性: {len(all_fr_ids - covered_frs)} 个 FR 未覆盖")

        # 下游可行性：每个 Story 可拆为 Tickets？
        for story in stories:
            if not story.get("acceptance_criteria"):
                final_review_issues.append(f"下游可行性: {story['id']} 缺少验收标准")
            if estimate_days(story.get("estimate", "0d")) > 5:
                final_review_issues.append(f"下游可行性: {story['id']} 估算超过 5 天")

        # 全局完整性：Stories 之间无重叠？
        for i, s1 in enumerate(stories):
            for s2 in stories[i+1:]:
                overlap = set(s1["requirements"]) & set(s2["requirements"])
                if overlap:
                    final_review_issues.append(f"全局完整性: {s1['id']} 和 {s2['id']} 覆盖相同 FR: {overlap}")

        if not final_review_issues:
            print("  全局终审: ✅ 通过")
            break

        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        stories = fix_stories(stories, final_review_issues)
        continue  # 回到 Phase 2
    else:
        return {"status": "failed", "reason": f"全局终审经过 {max_global_retries} 次重试仍未通过"}

    # 输出覆盖矩阵（仅 Phase 3 通过后）
    print_coverage_matrix(all_fr_ids, stories)
```

---

## 修复 #4：ticket-splitter/SKILL.md — Phase 3 全局终审

### 位置

将现有的 while 循环包裹在外层循环中（与修复 #2、#3 模式一致）。

### 当前代码结构

```python
    max_iterations = 5
    iteration = 0
    while iteration < max_iterations:
        # ... 质量校验（6项）+ 覆盖率校验 ...
        break
    else:
        raise SplitFailure(...)

    # 输出校验报告
    print_quality_report(tickets, iteration)
```

### 修改为

```python
    # ========== 外层循环：Phase 2 + Phase 3 ==========
    max_global_retries = 3
    for global_retry in range(max_global_retries):
        print(f"🔄 全局校验轮次 {global_retry + 1}/{max_global_retries}")

        # ========== Phase 2: 逐项校验循环（现有逻辑）==========
        max_iterations = 5
        iteration = 0
        phase2_passed = False

        while iteration < max_iterations:
            iteration += 1
            # ... 质量校验（6项）+ 覆盖率校验（现有代码不变）...
            phase2_passed = True
            break
        else:
            raise SplitFailure(f"Phase 2 经过 {max_iterations} 轮迭代仍未通过")

        if not phase2_passed:
            continue

        # ========== Phase 3: 全局终审 ==========
        final_review_issues = []

        # 上游一致性：Story AC 100% 覆盖？（再次确认）
        for ac in story.acceptance_criteria:
            covered = any(ticket_covers_criteria(t, ac) for t in tickets)
            if not covered:
                final_review_issues.append(f"上游一致性: 验收标准未覆盖 '{ac}'")

        # 下游可行性：每个 Ticket 可独立执行？
        for ticket in tickets:
            deps = ticket.get("dependencies", [])
            for dep in deps:
                dep_ticket = find_ticket(tickets, dep)
                if not dep_ticket:
                    final_review_issues.append(f"下游可行性: {ticket['id']} 依赖 {dep} 不存在")

        # 全局完整性：Tickets 依赖链完整无环？
        if has_cycle(tickets):
            final_review_issues.append("全局完整性: 依赖关系存在环")

        # 全局完整性：allowed_paths 无冲突？
        for i, t1 in enumerate(tickets):
            for t2 in tickets[i+1:]:
                overlap = set(t1.get("allowed_paths", {}).get("modify", [])) & \
                          set(t2.get("allowed_paths", {}).get("modify", []))
                if overlap and t1["id"] not in t2.get("dependencies", []) and \
                   t2["id"] not in t1.get("dependencies", []):
                    final_review_issues.append(
                        f"全局完整性: {t1['id']} 和 {t2['id']} 修改相同文件但无依赖关系"
                    )

        if not final_review_issues:
            print("  全局终审: ✅ 通过")
            break

        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        tickets = fix_tickets(tickets, final_review_issues)
        continue  # 回到 Phase 2
    else:
        raise SplitFailure(f"全局终审经过 {max_global_retries} 次重试仍未通过")

    # 输出校验报告（仅 Phase 3 通过后）
    print_quality_report(tickets, iteration)
```

---

## 修复 #5：deliver-ticket/SKILL.md — Phase 3 全局终审

### 位置

在 `Step 4: 自我审查` 之后、`Step 5: 强制验证` 之前插入。

### 当前代码（第 300-308 行附近）

```python
    # Step 4: 自我审查（根据 type 选择对应清单）
    review_result = self_review(ticket, result.code)
    if not review_result.passed:
        fix_review_issues(review_result.issues)

    # ========================================
    # Step 5: 强制验证（不可跳过）
    # ========================================
```

### 修改为

```python
    # Step 4 + Step 4.5 包裹在重试循环中
    max_review_retries = 2
    for review_retry in range(max_review_retries + 1):
        # Step 4: 自我审查
        review_result = self_review(ticket, result.code)
        if not review_result.passed:
            fix_review_issues(review_result.issues)

        # Step 4.5: 全局终审
        final_review_issues = []

        # 上游一致性：Ticket AC 全满足？
        for ac in ticket.acceptance_criteria:
            if not is_criteria_met(ac, result.code):
                final_review_issues.append(f"上游一致性: 验收标准未满足 '{ac}'")

        # 下游可行性：不破坏其他 Ticket 的代码？
        full_test = bash(config.commands.test)
        if full_test.exit_code != 0:
            final_review_issues.append(f"下游可行性: 全量测试失败")

        # 全局完整性：修改都在 allowed_paths 内？
        changed_files = get_changed_files()
        allowed = ticket.get("allowed_paths", {}).get("modify", [])
        for f in changed_files:
            if not matches_any_pattern(f, allowed):
                final_review_issues.append(f"全局完整性: 修改了 allowed_paths 之外的文件 {f}")

        if not final_review_issues:
            print("  全局终审: ✅ 通过")
            break

        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题 (重试 {review_retry+1}/{max_review_retries+1})")
        for issue in final_review_issues:
            print(f"    - {issue}")
        fix_final_review_issues(final_review_issues)
    else:
        return {
            "status": "final_review_failed",
            "errors": final_review_issues,
            "hint": "全局终审经过 3 次重试仍未通过"
        }

    # ========================================
    # Step 5: 强制验证（不可跳过）
    # ========================================
```

---

## 修复 #6：verification/SKILL.md — Story AC 覆盖率校验

### 位置

在 `verify` 函数的前置检查之后、结构层校验之前插入。

### 当前代码（第 176-178 行附近）

```python
        if issues:
            return {"passed": False, "issues": issues, "reason": "Tickets 缺少验证证据，无法验收"}

    # 结构层校验
```

### 修改为

```python
        if issues:
            return {"passed": False, "issues": issues, "reason": "Tickets 缺少验证证据，无法验收"}

    # --- Story AC 覆盖率校验（新增）---
    story = read_yaml(f"osg-spec-docs/tasks/stories/{task.story_id}.yaml")
    for ac in story.acceptance_criteria:
        ac_covered = False
        for ticket_id in story.tickets:
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if ticket_covers_criteria(ticket, ac):
                ac_covered = True
                break
        if not ac_covered:
            issues.append(("coverage", "ac_coverage", f"验收标准未被任何 Ticket 覆盖: '{ac}'"))

    if issues:
        return {"passed": False, "issues": issues, "reason": "Story 验收标准覆盖率不足"}

    # 结构层校验
```

---

## 修复 #7：verification/SKILL.md — 多轮迭代 + 自动修复循环

### 位置

重写 `verify` 函数，将单次校验改为多轮迭代循环。

### 当前代码（第 162-211 行）

```python
def verify(task):
    issues = []
    # ... 前置检查 ...
    # 结构层校验
    # 格式层校验
    # 语义层校验
    # 逻辑层校验
    if issues:
        return {"passed": False, "issues": issues}
    # 验收通过
    ...
```

### 修改为

```python
def verify(task):
    max_iterations = 5

    # 0. 前置检查（不可跳过，不在循环内）
    if task.type == "story":
        pre_check_issues = pre_verify_check(task)
        if pre_check_issues:
            return {"passed": False, "issues": pre_check_issues, "reason": "前置检查失败"}

    # 1. Story AC 覆盖率校验（新增，不在循环内）
    story = read_yaml(f"osg-spec-docs/tasks/stories/{task.story_id}.yaml")
    ac_issues = check_ac_coverage(story)
    if ac_issues:
        return {"passed": False, "issues": ac_issues, "reason": "Story AC 覆盖率不足"}

    # 2. 多轮校验循环
    for iteration in range(1, max_iterations + 1):
        print(f"🔄 验收校验迭代 {iteration}/{max_iterations}")
        issues = []

        # 结构层校验
        for check in STRUCTURE_CHECKS:
            result = check.execute(task)
            if not result.passed:
                issues.append(("structure", check.name, result.issue))

        # 格式层校验
        for check in FORMAT_CHECKS:
            result = check.execute(task)
            if not result.passed:
                issues.append(("format", check.name, result.issue))

        # 语义层校验
        for check in SEMANTIC_CHECKS:
            result = check.execute(task)
            if not result.passed:
                issues.append(("semantic", check.name, result.issue))

        # 逻辑层校验
        for check in LOGIC_CHECKS:
            result = check.execute(task)
            if not result.passed:
                issues.append(("logic", check.name, result.issue))

        if issues:
            print(f"  校验结果: ❌ {len(issues)} 个问题")
            for dim, name, issue in issues:
                print(f"    [{dim}] {name}: {issue}")
            # 自动修复
            fix_verification_issues(task, issues)
            continue  # 回到循环开头全部重跑

        print("  校验结果: ✅ 全部通过")

        # Phase 3: 全局终审（具体检查逻辑见修复 #9）
        final_issues = []

        # 上游一致性：所有 Tickets 有证据？（再次确认）
        for ticket_id in story.tickets:
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if not ticket.get("verification_evidence"):
                final_issues.append(f"上游一致性: {ticket_id} 缺少 verification_evidence")
            elif ticket.verification_evidence.get("exit_code") != 0:
                final_issues.append(f"上游一致性: {ticket_id} 验证失败")

        # 下游可行性：和其他已完成 Stories 集成无冲突？
        completed_stories = get_completed_stories(state)
        for other_story in completed_stories:
            if has_integration_conflict(story, other_story):
                final_issues.append(f"下游可行性: 与 {other_story.id} 集成冲突")

        # 全局完整性：所有 AC 满足？
        for ac in story.acceptance_criteria:
            if not is_ac_satisfied(ac, story.tickets):
                final_issues.append(f"全局完整性: 验收标准未满足 '{ac}'")

        if final_issues:
            print(f"  全局终审: ❌ {len(final_issues)} 个问题")
            fix_verification_issues(task, final_issues)
            continue  # 回到循环开头

        print("  全局终审: ✅ 通过")
        break
    else:
        # 达到最大迭代次数
        print(f"❌ 达到最大迭代次数 ({max_iterations}/{max_iterations})")
        print("验收失败，请人工检查后重新执行 /verify")
        return {"passed": False, "reason": "max_iterations_exceeded"}

    # 验收通过 — 更新 workflow
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.workflow.current_step = "story_done"
    state.workflow.next_step = "approve_story"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return {"passed": True}
```

---

## 修复 #8：verification/SKILL.md — 失败退出逻辑

### 位置

在 `硬约束` 部分之后新增。

### 新增内容

```markdown
## 失败退出规则

​```
⚠️ 当 max_iterations（默认 5）次迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 不更新 workflow.current_step — 保持在 all_tickets_done
3. 停止自动继续 — 提示用户人工介入
4. 用户可以修复后重新执行 /verify
​```
```

---

## 修复 #9：verification/SKILL.md — Phase 3 全局终审（独立展开）

### 说明

修复 #7 的重写 verify 函数中已包含 Phase 3 的调用（`global_final_review_verify(task, story)`），此修复项展开该函数的具体实现。

### 位置

在 verification/SKILL.md 的 `执行伪代码` 部分，新增 `global_final_review_verify` 函数定义。

### 新增代码

```python
def global_final_review_verify(task, story):
    """Phase 3: 全局终审 — /verify 环节"""
    issues = []

    # 上游一致性：所有 Tickets 有 verification_evidence？（再次确认）
    for ticket_id in story.tickets:
        ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
        if not ticket.get("verification_evidence"):
            issues.append(f"上游一致性: {ticket_id} 缺少 verification_evidence")
        elif ticket.verification_evidence.get("exit_code") != 0:
            issues.append(f"上游一致性: {ticket_id} 验证命令失败 (exit_code={ticket.verification_evidence.exit_code})")

    # 下游可行性：和其他已完成 Stories 集成无冲突？
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    completed_stories = [s for s in state.stories if get_story_status(s) == "completed" and s != story.id]
    for other_id in completed_stories:
        other_story = read_yaml(f"osg-spec-docs/tasks/stories/{other_id}.yaml")
        # 检查是否有文件修改冲突
        my_files = get_all_modified_files(story)
        other_files = get_all_modified_files(other_story)
        conflict_files = my_files & other_files
        if conflict_files:
            issues.append(f"下游可行性: 与 {other_id} 修改了相同文件 {conflict_files}")

    # 全局完整性：所有 acceptance_criteria 满足？
    for ac in story.acceptance_criteria:
        ac_satisfied = False
        for ticket_id in story.tickets:
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if ticket.status == "done" and ticket_covers_criteria(ticket, ac):
                ac_satisfied = True
                break
        if not ac_satisfied:
            issues.append(f"全局完整性: 验收标准未满足 '{ac}'")

    # 全局完整性：全量测试通过？
    full_test = bash(config.commands.test)
    if full_test.exit_code != 0:
        issues.append("全局完整性: 全量测试失败")

    return issues
```

---

## 实施顺序

建议按以下顺序修改（先高优先级，后中优先级）：

1. **修复 #7** — verification/SKILL.md 多轮迭代（最大变更，重写 verify 函数）
2. **修复 #6** — verification/SKILL.md AC 覆盖率校验
3. **修复 #9** — verification/SKILL.md Phase 3 全局终审（展开具体逻辑）
4. **修复 #8** — verification/SKILL.md 失败退出逻辑
5. **修复 #1** — brainstorming/SKILL.md PRD 覆盖率校验
6. **修复 #2** — brainstorming/SKILL.md Phase 3 全局终审（外层循环）
7. **修复 #3** — story-splitter/SKILL.md Phase 3 全局终审（外层循环）
8. **修复 #4** — ticket-splitter/SKILL.md Phase 3 全局终审（外层循环）
9. **修复 #5** — deliver-ticket/SKILL.md Phase 3 全局终审（重试循环）

---

## 影响范围

| 文件 | 修改量（估） | 风险 |
|------|------------|------|
| verification/SKILL.md | ~120 行新增/重写 | 中（重写核心函数 + Phase 3） |
| brainstorming/SKILL.md | ~80 行新增 | 低（外层循环 + PRD 覆盖率） |
| story-splitter/SKILL.md | ~50 行新增 | 低（外层循环） |
| ticket-splitter/SKILL.md | ~55 行新增 | 低（外层循环） |
| deliver-ticket/SKILL.md | ~40 行新增 | 低（重试循环） |

## 统一模式总结

所有 Phase 3 全局终审遵循相同的三维检查模式：

| 维度 | 检查内容 | 适用环节 |
|------|---------|---------|
| **上游一致性** | 和上一环节的产物对齐？ | 全部 |
| **下游可行性** | 下一环节能顺利执行？ | 全部 |
| **全局完整性** | 有没有遗漏或冲突？ | 全部 |

回退机制统一为：
- **修复 #2~#4**（brainstorm/split-story/split-ticket）：外层 `for global_retry` 循环，Phase 3 失败 → `continue` 回到 Phase 2
- **修复 #5**（deliver-ticket）：`for review_retry` 循环，Phase 3 失败 → 重新执行自审 + 全局终审
- **修复 #7**（verify）：Phase 3 嵌入在 `for iteration` 循环内，失败 → `continue` 回到 4 维度校验

---

## Workflow 层问题（全环节校验发现）

> 以下问题来自 Workflow ↔ Skill ↔ 状态流转的逐环节交叉校验。

### 修复 #10：/brainstorm Workflow 下一步提示错误

**文件**：`.windsurf/workflows/brainstorm.md` 第 35 行

**问题**：下一步提示写成 `/split-stories`，实际命令是 `/split-story`（无 s）

**修改**：
```diff
-   - 审阅通过后可执行 `/split-stories`
+   - 审阅通过后可执行 `/split-story`
```

**优先级**：🟡 低

---

### 修复 #11：/brainstorm Workflow 缺少 UI 原型输入说明

**文件**：`.windsurf/workflows/brainstorm.md` 第 19-21 行

**问题**：Workflow 只提到"读取 PRD 文档"，但 brainstorming Skill 实际还会读取 UI 原型和已有代码。Workflow 描述不完整。

**修改**：在步骤 2 中补充：
```markdown
2. **读取输入文档**
   - 读取 `current_requirement_path` 指向的目录下所有 PRD 文档
   - 读取 UI 原型文档（如有）
   - 扫描已有代码结构（如有）
   - 理解业务需求、用户角色、功能点
```

**优先级**：🟡 低

---

### 修复 #12：/approve Workflow 与 config.yaml 审批配置不一致

**文件**：`.windsurf/workflows/approve.md` 第 27-31 行

**问题**：Tickets 审批部分要求用户确认，但 `config.yaml` 中 `ticket_split: auto`。如果是 auto，应该跳过审批直接进入 implementing。

**修改方案**：approve.md 应该读取 config.yaml 的审批配置，根据配置决定是否需要用户确认：
```markdown
### Tickets 审批
- 条件：`current_step` 为 `tickets_pending_approval`
- 读取 `config.yaml` 的 `approval.ticket_split` 配置
  - 如果 `required`：列出 Tickets 摘要，等待用户确认
  - 如果 `auto`：自动审批，直接更新状态
- 更新每个 Ticket 状态为 `pending`（可执行）
- 更新 `workflow.current_step` 为 `implementing`
```

**优先级**：🟡 中

---

### 修复 #13：/verify Skill 校验内容与 Workflow 承诺不一致 🔴

**文件**：
- `.windsurf/workflows/verify.md` 第 19-23 行
- `.claude/skills/verification/SKILL.md` 第 78-93 行

**问题**：
- Workflow 承诺检查：`AC 满足 + 集成正确 + 代码质量 + 覆盖率达标`
- Skill 实际做的：`结构层/格式层/语义层/逻辑层` 文档格式校验

Skill 的 4 维度校验是检查 YAML 编号连续、ID 格式正则、时间 ISO 8601 等**文档规范**，而不是验收 Story 的**功能是否实现**。

**修改方案**：重写 verification/SKILL.md 的 Story 验收逻辑（与修复 #7 合并）：

Phase 1（前置检查）：所有 Tickets done + evidence + exit_code=0
Phase 2（功能验收，多轮迭代）：
- AC 覆盖率：每个 Story AC 被至少 1 个已完成 Ticket 覆盖
- 全量测试：运行 `config.commands.test`，exit_code=0（**重中之重**，发现跨 Ticket 回归）
- 覆盖率达标：检查是否达到门槛
Phase 3（全局终审）：上游一致性 + 下游可行性 + 全局完整性

删除原有的 4 维度文档格式校验（结构/格式/语义/逻辑），这些应在 P 阶段生成时保证。

**优先级**：🔴 高（与修复 #7 合并处理）

---

### 修复 #14：/next → /verify 状态流转断裂 🔴

**文件**：
- `.windsurf/workflows/next.md` 第 30-35 行
- `.windsurf/workflows/rpiv.md` 第 39-41 行

**问题**：
- `rpiv.md` 用 `story_tickets_done` 触发 V 阶段
- `next.md` 完成所有 Tickets 后只是"提示执行 /verify"，**没有更新 `current_step` 为 `story_tickets_done`**
- 导致 `/rpiv` 无法自动判断应该进入 V 阶段

**修改方案**：在 `next.md` 步骤 5 中增加状态更新：
```markdown
5. **更新状态**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 是 → 更新 `workflow.current_step` 为 `all_tickets_done`，提示执行 `/verify`
     - 否 → 提示继续执行 `/next`
```

同时 `rpiv.md` 的 V 阶段触发条件改为：
```markdown
**触发条件**：`current_step` 为 `all_tickets_done`
```

**优先级**：🔴 高

---

### 更新后的修复总览

| # | 文件 | 缺失项 | 优先级 | 类型 |
|---|------|--------|--------|------|
| 1-9 | Skills | 门控缺失（见上方） | 🔴/🟡 | Skill 层 |
| 10 | brainstorm.md | 下一步提示错误 | 🟡 低 | Workflow 层 |
| 11 | brainstorm.md | 缺少 UI 原型输入说明 | 🟡 低 | Workflow 层 |
| 12 | approve.md | 与 config 审批配置不一致 | 🟡 中 | Workflow 层 |
| 13 | verification/SKILL.md | 校验内容与 Workflow 不一致 | 🔴 高 | Skill + Workflow 层 |
| 14 | next.md + rpiv.md | 状态流转断裂 | 🔴 高 | Workflow 层 |
| 15 | state-machine.yaml | 缺少 `implementing` 状态定义 | 🔴 高 | 状态机层 |
| 16 | state-machine.yaml | 缺少 `story_verified` 状态定义 | 🔴 高 | 状态机层 |
| 17 | state-machine.yaml | 缺少 `verification_failed` 状态定义 | 🔴 高 | 状态机层 |
| 18 | state-machine.yaml + workflow-engine | deliver-ticket 绕过 workflow-engine 直接管理状态 | 🔴 高 | 状态机层 |
| 19 | approve.md | story_verified → /approve → story_done → approve_story 循环 | 🔴 高 | Workflow 层 |
| 20 | split-story.md | 状态名 `stories_pending_approval` 与 state-machine 不一致 | 🟡 中 | Workflow 层 |
| 21 | split-ticket.md | 状态名 `tickets_pending_approval` 与 state-machine 不一致 | 🟡 中 | Workflow 层 |
| 22 | approve.md | Stories 审批条件 `stories_pending_approval` 与实际状态不匹配 | 🟡 中 | Workflow 层 |
| 23 | rpiv.md | R 阶段触发条件漏了 `not_started` | 🟢 低 | Workflow 层 |
| 24 | verify.md | 与重写后的 verification Skill 不一致 | 🔴 高 | Workflow 层 |
| 25 | next.md | 与 deliver-ticket 实际行为不一致 | 🔴 高 | Workflow 层 |
| 26 | state-machine.yaml | `/verify` 映射 + rollback 规则未覆盖新状态 | 🟡 中 | 状态机层 |
| 27 | cc-review.md | 缺少状态更新语义 | 🟡 中 | Workflow 层 |
| 28 | rpiv.md | V 阶段描述需更新为 story_verified/verification_failed 分支 | 🟡 中 | Workflow 层 |
| 29 | approve.md | Stories 审批后缺少设置 `current_story` | 🔴 高 | Workflow 层 |
| 30 | approve.md / #12 | Tickets 审批后状态应为 `tickets_approved` 而非 `implementing` | 🟡 中 | Workflow 层 |
| 31 | state-machine.yaml | `verification_failed` 不应自动重试，应暂停等用户修复 | 🔴 高 | 状态机层 |
| 32 | workflow-engine/SKILL.md | `update_workflow` 需处理 `/next` 和 `/verify` 绕过逻辑 | 🟡 中 | 状态机层 |
| 33 | #27 cc-review.md | CC 不通过时 `next_step` 应为 `null`（与 #31 暂停设计一致） | 🔴 高 | Workflow 层 |
| 34 | #24 verify.md | 验收失败时 `next_step` 应为 `null`（与 #31 暂停设计一致） | 🔴 高 | Workflow 层 |

---

## 修复 #15~#23：全流程模拟校验发现（2026-02-14）

> 来源：以"权限管理模块"为样例，从 not_started 到 all_stories_done 端到端模拟校验

---

### 修复 #15：state-machine.yaml — 缺少 `implementing` 状态

**文件**：`.claude/skills/workflow-engine/state-machine.yaml`

**问题**：deliver-ticket/SKILL.md（第376行）、approve.md（第31行）、rpiv.md（第35行）、split-ticket.md（第39行）都引用 `implementing`，但 state-machine.yaml 没有定义。

**修改**：在 `tickets_approved` 之后、`ticket_done` 之前新增：

```yaml
  implementing:
    phase: implement
    description: "正在实现 Tickets"
    next_action: next
    approval_required: false
```

**优先级**：🔴 高

---

### 修复 #16：state-machine.yaml — 缺少 `story_verified` 状态

**文件**：`.claude/skills/workflow-engine/state-machine.yaml`

**问题**：deliver-ticket/SKILL.md（第364行）设置 `story_verified`，但 state-machine.yaml 没有定义。

**修改**：在 `all_tickets_done` 之后、`story_done` 之前新增：

```yaml
  story_verified:
    phase: validate
    description: "Story 验收通过，等待用户选择 /cc-review 或 /approve"
    next_action: null  # 用户自行选择
    approval_required: false
```

**优先级**：🔴 高

---

### 修复 #17：state-machine.yaml — 缺少 `verification_failed` 状态

**文件**：`.claude/skills/workflow-engine/state-machine.yaml`

**问题**：deliver-ticket/SKILL.md（第371行）设置 `verification_failed`，但 state-machine.yaml 没有定义。

**修改**：在 `story_verified` 之后新增：

```yaml
  verification_failed:
    phase: validate
    description: "Story 验收失败，需修复后重试 /verify"
    next_action: verify
    approval_required: false
```

**优先级**：🔴 高

---

### 修复 #18：state-machine.yaml + workflow-engine — deliver-ticket 绕过 workflow-engine

**文件**：
- `.claude/skills/workflow-engine/state-machine.yaml`（command_to_state + special_branches）
- `.claude/skills/workflow-engine/SKILL.md`（update_workflow 函数）

**问题**：deliver-ticket/SKILL.md 直接写 STATE.yaml 设置 `implementing`/`story_verified`/`verification_failed`，绕过了 workflow-engine 的 `update_workflow()` 函数。state-machine.yaml 的 `command_to_state["/next"] = ticket_done` 和 `special_branches.next_completion` 与 Skill 实际行为不一致。

**设计决策**：保持 deliver-ticket 自己管理状态（因为它有复杂的分支逻辑：implementing/story_verified/verification_failed），但 state-machine.yaml 和 workflow-engine 需要同步更新以反映实际行为。

**修改 state-machine.yaml**：

1. 更新 `command_to_state`：
```yaml
  "/next": implementing  # 默认进入 implementing（还有 pending tickets）
```

2. 更新 `special_branches.next_completion`：
```yaml
  next_completion:
    condition: "no_pending_tickets(current_story)"
    true_branch:
      condition: "verify_story_passed(current_story)"
      true_state: story_verified
      false_state: verification_failed
    false_state: implementing
```

3. 新增 `special_branches.verify_completion`：
```yaml
  verify_completion:
    condition: "verify_story_passed(current_story)"
    true_state: story_verified
    false_state: verification_failed
```

**修改 workflow-engine/SKILL.md** 的 `update_workflow` 函数：

在 `/next` 的特殊处理中更新：
```python
if command_completed == "/next":
    if no_pending_tickets(state):
        # deliver-ticket 会自动调用 verify_story()
        # 状态由 deliver-ticket 直接设置（implementing/story_verified/verification_failed）
        # workflow-engine 不需要额外处理
        return  # deliver-ticket 已经更新了 STATE.yaml
```

**优先级**：🔴 高

---

### 修复 #19：approve.md — story_verified → /approve 循环问题

**文件**：`.windsurf/workflows/approve.md`

**问题**：当用户从 `story_verified` 执行 `/approve`（跳过 CC），如果 approve.md 设置 `story_done`，workflow-engine 会自动执行 `approve_story`（`/approve story`），又回到 approve.md，形成循环。

**修改方案**：approve.md 新增 Story 审批分支时，从 `story_verified` 直接设置 `story_approved`（跳过 `story_done`）：

```markdown
### Story 验收审批
- 条件：`current_step` 为 `story_verified`
- 列出 Story 验收报告摘要
- 用户确认后：
  - 更新 Story 状态为 `done`
  - 更新 `workflow.current_step` 为 `story_approved`（直接跳到 approved，不经过 story_done）
  - 检查是否有下一个 Story
```

同时保留 `story_done` 状态用于 CC 审核通过后的路径：
```markdown
### Story 完成审批（CC 审核后）
- 条件：`current_step` 为 `story_done`
- 读取 `config.yaml` 的 `approval.story_done` 配置
  - `required`：等待用户确认
  - `auto`：自动审批
- 更新 `workflow.current_step` 为 `story_approved`
```

**优先级**：🔴 高

---

### 修复 #20：split-story.md — 状态名不一致

**文件**：`.windsurf/workflows/split-story.md` 第32行

**问题**：Workflow 写 `stories_pending_approval`，但 story-splitter/SKILL.md 实际设置 `story_split_done`，state-machine.yaml 定义的也是 `story_split_done`。

**修改**：
```diff
- 更新 `workflow.current_step` 为 `stories_pending_approval`
- 用户审批后更新为 `stories_approved`
+ 更新 `workflow.current_step` 为 `story_split_done`
+ 等待用户审批（`/approve`）
```

**优先级**：🟡 中

---

### 修复 #21：split-ticket.md — 状态名不一致

**文件**：`.windsurf/workflows/split-ticket.md` 第38-39行

**问题**：Workflow 写 `tickets_pending_approval`，但 ticket-splitter/SKILL.md 实际设置 `ticket_split_done`。

**修改**：
```diff
- 更新 `workflow.current_step` 为 `tickets_pending_approval`
- 用户审批后更新为 `implementing`
+ 更新 `workflow.current_step` 为 `ticket_split_done`
+ 等待用户审批（`/approve`），审批后进入 `implementing`
```

**优先级**：🟡 中

---

### 修复 #22：approve.md — Stories 审批条件不匹配

**文件**：`.windsurf/workflows/approve.md` 第22行

**问题**：条件写 `stories_pending_approval`，但实际到达审批时 current_step 是 `story_split_done`。Cascade 按 Workflow 文字执行，条件不匹配会导致审批逻辑不触发。

**修改**：
```diff
  ### Stories 审批
- - 条件：`current_step` 为 `stories_pending_approval`
+ - 条件：`current_step` 为 `story_split_done`
```

同时修改 Tickets 审批条件：
```diff
  ### Tickets 审批
- - 条件：`current_step` 为 `tickets_pending_approval`
+ - 条件：`current_step` 为 `ticket_split_done`
```

**优先级**：🟡 中

---

### 修复 #23：rpiv.md — R 阶段触发条件漏了 `not_started`

**文件**：`.windsurf/workflows/rpiv.md` 第20行

**问题**：R 阶段触发条件写 `idle` 或 `requirement_analysis`，但 state-machine.yaml 的初始状态是 `not_started`。

**修改**：
```diff
- **触发条件**：`current_step` 为 `idle` 或 `requirement_analysis` 且没有 Stories
+ **触发条件**：`current_step` 为 `not_started`、`idle` 或 `requirement_analysis` 且没有 Stories
```

**优先级**：🟢 低

---

### 修复 #24：verify.md — 与重写后的 verification Skill 不一致（补充 #13）

**文件**：`.windsurf/workflows/verify.md`

**问题**：verify.md 的检查项描述（"AC 满足 + 集成正确 + 代码质量 + 覆盖率达标"）与重写后的 verification/SKILL.md（Phase 1 前置检查 + Phase 2 全量测试/AC/覆盖率 + Phase 3 全局终审）不一致。且 verify.md 的状态更新逻辑（"验收通过更新为 done，不通过保持 implementing"）与 deliver-ticket 的 story_verified/verification_failed 设计不一致。

**修改**：重写 verify.md

```markdown
---
description: 手动重试 Story 验收 - 调用统一验收引擎 verify_story()
---

# 手动重试 Story 验收

## 使用场景

- `workflow.current_step = verification_failed`
- 已修复验收失败的问题，需要手动重试

## 执行步骤

1. **读取状态与目标 Story**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 获取 `current_story`

2. **调用统一验收引擎**
   - 调用 verification skill 的 `verify_story(story_id)`
   - 验收逻辑包含：
     - Phase 1：前置检查（Tickets done + evidence + exit_code=0）
     - Phase 2：功能验收（全量测试 + AC 覆盖率 + 覆盖率门槛）
     - Phase 3：全局终审（上游一致性 + 下游可行性 + 全局完整性）

3. **处理结果**
   - 如果 `passed = true`：
     - 设置 `workflow.current_step = story_verified`
     - 设置 `workflow.next_step = null`（用户自行选择）
     - 输出两个选项：
       - `/cc-review` — CC 交叉验证（二次校验）
       - `/approve` — 跳过 CC，直接审批
   - 如果 `passed = false`：
     - 设置 `workflow.current_step = verification_failed`
     - 设置 `workflow.next_step = verify`
     - 输出失败原因和问题列表

4. **写回状态**
   - 将更新后的 `STATE.yaml` 写回磁盘
```

**优先级**：🔴 高

---

### 修复 #25：next.md — 与 deliver-ticket 实际行为对齐（补充 #14）

**文件**：`.windsurf/workflows/next.md`

**问题**：next.md 步骤5 说"是 → 提示执行 /verify"，但 deliver-ticket/SKILL.md 实际行为是自动调用 verify_story()，直接设置 story_verified/verification_failed。Workflow 描述与 Skill 行为不一致。

**修改**：重写 next.md 步骤4~5

```markdown
4. **分层验证**
   - deliver-ticket skill 自动执行：
     - **Level 1 单元验证**：当前 Ticket 的验证命令
     - **Level 2 回归验证**：全量测试，确保不破坏已完成功能
   - 确认 verification_evidence 存在且 exit_code = 0

5. **更新状态**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 否 → 设置 `current_step = implementing`，提示继续执行 `/next`
     - 是 → **自动执行 Story 验收**（Level 4，调用 verification skill 的 verify_story）
       - 验收通过：设置 `current_step = story_verified`，用户选择 `/cc-review` 或 `/approve`
       - 验收失败：设置 `current_step = verification_failed`，提示执行 `/verify` 重试
```

**优先级**：🔴 高

---

### 修复 #26：state-machine.yaml — `/verify` 映射 + rollback 规则（补充 #18）

**文件**：`.claude/skills/workflow-engine/state-machine.yaml`

**问题 1**：`command_to_state["/verify"]` 仍为 `story_done`，但 verify Workflow 自己管理状态（设置 story_verified 或 verification_failed），与 deliver-ticket 绕过 workflow-engine 的模式一致。

**修改 1**：
```yaml
  "/verify": story_verified  # 默认；verify Workflow 自己管理分支（story_verified/verification_failed）
```

**问题 2**：rollback 规则未覆盖新增的 implementing/story_verified/verification_failed 状态。

**修改 2**：在 rollback 部分补充：
```yaml
  - from: [implementing]
    to: tickets_approved
    trigger: "/rollback"
    condition: "实现过程中需要重新拆分 Tickets"

  - from: [story_verified, verification_failed]
    to: implementing
    trigger: "/rollback"
    condition: "验收后需要重新实现"
```

**优先级**：🟡 中

---

### 修复 #27：cc-review.md — 缺少状态更新语义

**文件**：`.windsurf/workflows/cc-review.md`

**问题**：cc-review.md 只有 CLI Prompt 模板，没有定义 CC 审核通过/不通过后的状态更新逻辑。在 story_verified → /cc-review → ? 的路径中，缺少状态流转。

**修改**：在 cc-review.md 的"Story 完成审核"部分末尾新增：

```markdown
3. 处理 CC 审核结果：
   - **CC 审核通过**：
     - 设置 `workflow.current_step = story_done`
     - 设置 `workflow.next_step = approve_story`
     - 提示执行 `/approve` 完成 Story 审批
   - **CC 审核不通过**：
     - 设置 `workflow.current_step = verification_failed`
     - 设置 `workflow.next_step = verify`
     - 输出 CC 发现的问题列表
     - 提示修复后执行 `/verify` 重新验收
```

**优先级**：🟡 中

---

### 修复 #28：rpiv.md — V 阶段描述更新（补充 #14）

**文件**：`.windsurf/workflows/rpiv.md`

**问题**：rpiv.md 的 V 阶段写的是"当前 Story 的所有 Tickets 都已完成 → 执行 /verify"，但实际流程是 deliver-ticket 自动调用 verify_story()，结果为 story_verified 或 verification_failed。rpiv.md 需要描述这两个状态的处理分支。

**修改**：将现有 V 阶段替换为：

```markdown
### 阶段 V-1（Verify Retry）— 验收重试

**触发条件**：`current_step` 为 `verification_failed`

执行 `/verify` 手动重试当前 Story 验收

### 阶段 V-2（Verify Optional）— 可选二次校验

**触发条件**：`current_step` 为 `story_verified`

当前 Story 已通过 I 阶段自动验收，用户可选择：
1. 执行 `/cc-review` 进行 CC 二次校验
2. 执行 `/approve` 跳过 CC，直接进入审批

### 阶段 A（Approval）— Story 审批

**触发条件**：`current_step` 为 `story_done`

1. 执行 `/approve`
2. 审批通过后检查是否还有下一个 Story
   - 有 → 回到阶段 I
   - 没有 → 所有 Stories 完成，执行最终交付审核
```

**优先级**：🟡 中

---

## 修复 #29~#32：端到端模拟实测发现（2026-02-14）

> 来源：假设 #1~#28 全部应用后，以"权限管理模块"（2 Stories, 3 Tickets/Story）端到端模拟

---

### 修复 #29：approve.md — Stories 审批后缺少设置 `current_story`

**文件**：`.windsurf/workflows/approve.md`

**问题**：Stories 审批通过后，`current_step` 更新为 `stories_approved`，`next_action = split_ticket`，但 `current_story` 仍为 `null`。导致 `/split ticket {current_story}` 变成 `/split ticket null`。

simulation.py 第79行已正确处理（`self.current_story = self.pending_stories[0]`），但 approve.md Workflow 文档没有写这个逻辑。

**修改**：在 approve.md Stories 审批步骤中补充：

```markdown
### Stories 审批
- 条件：`current_step` 为 `story_split_done`
- 列出所有待审批 Stories 的摘要
- 用户确认后：
  - 更新每个 Story 状态为 `approved`
  - **设置 `current_story` 为第一个 Story（按优先级排序）**
  - 更新 `workflow.current_step` 为 `stories_approved`
```

**优先级**：🔴 高

---

### 修复 #30：approve.md — Tickets 审批后状态应为 `tickets_approved`（修正 #12）

**文件**：`.windsurf/workflows/approve.md`

**问题**：#12 方案写的是 Tickets 审批后更新为 `implementing`，但 state-machine.yaml 的 `command_to_state["/approve tickets"] = tickets_approved`。应该统一为 `tickets_approved`，让 workflow-engine 自动流转到 `implementing`。

**修改**：修正 #12 方案中的状态名：

```markdown
### Tickets 审批
- 条件：`current_step` 为 `ticket_split_done`
- 读取 `config.yaml` 的 `approval.ticket_split` 配置
  - 如果 `required`：列出 Tickets 摘要，等待用户确认
  - 如果 `auto`：自动审批，直接更新状态
- 更新每个 Ticket 状态为 `pending`（可执行）
- 更新 `workflow.current_step` 为 `tickets_approved`（由 workflow-engine 自动流转到 implementing）
```

**优先级**：🟡 中

---

### 修复 #31：state-machine.yaml — `verification_failed` 应暂停等待用户修复

**文件**：`.claude/skills/workflow-engine/state-machine.yaml`

**问题**：`verification_failed.next_action = verify`，`approval_required = false`。workflow-engine 会自动执行 `/verify`，但用户可能还没修复验收失败的问题。应该暂停等待用户手动修复后再执行 `/verify`。

**修改**：

```yaml
  verification_failed:
    phase: validate
    description: "Story 验收失败，需修复后重试 /verify"
    next_action: null  # 暂停，等待用户修复后手动执行 /verify
    approval_required: false
```

同时更新 deliver-ticket/SKILL.md 第371-374行的输出提示：
```python
        state.workflow.current_step = "verification_failed"
        state.workflow.next_step = None  # 改为 None，不自动重试
        print(f"❌ Story 验收失败: {verify_result['reason']}")
        print("请修复问题后手动执行 /verify 重新验收")
```

**优先级**：🔴 高

---

### 修复 #32：workflow-engine/SKILL.md — `update_workflow` 处理 `/next` 和 `/verify` 绕过

**文件**：`.claude/skills/workflow-engine/SKILL.md` 第130-156行

**问题**：deliver-ticket 和 verify Workflow 直接写 STATE.yaml，绕过 `update_workflow()`。但 workflow-engine 的"供其他 Skill 调用的接口"部分（第219-228行）仍然建议 deliver-ticket 调用 `update_workflow("/next", state)`。需要更新文档说明。

**修改**：

1. 在 `update_workflow` 函数中增加 `/next` 和 `/verify` 的跳过逻辑：
```python
def update_workflow(command_completed, state):
    sm = load_yaml(".claude/skills/workflow-engine/state-machine.yaml")

    # deliver-ticket 和 verify 自己管理状态，不需要 update_workflow
    if command_completed in ("/next", "/verify"):
        return  # 状态已由对应 Skill/Workflow 直接写入 STATE.yaml

    new_state = sm.command_to_state[command_completed]
    # ... 后续逻辑不变
```

2. 更新"供其他 Skill 调用的接口"文档：
```python
# 在 brainstorming skill 完成时
update_workflow("/brainstorm", state)

# 在 story-splitter skill 完成时
update_workflow("/split story", state)

# ⚠️ deliver-ticket 和 verify 不调用 update_workflow
# 它们直接写 STATE.yaml（因为有复杂的分支逻辑）
```

**优先级**：🟡 中

---

## 修复 #33~#34：第3轮端到端模拟发现（2026-02-14）

> 来源：覆盖 CC 不通过路径和 verify 失败路径时发现 next_step 与 #31 暂停设计矛盾

---

### 修复 #33：cc-review.md — CC 不通过时 `next_step` 应为 `null`（修正 #27）

**文件**：`.windsurf/workflows/cc-review.md`

**问题**：#27 方案中 CC 不通过时设置 `next_step = verify`，但 #31 修复后 `verification_failed` 的设计是暂停等用户修复（`next_action = null`）。如果 cc-review.md 直接写 `next_step = verify`，workflow-engine 会读到非 null 的 next_step 并自动执行 `/verify`，绕过了 #31 的暂停设计。

**修改**：修正 #27 方案中 CC 不通过的状态更新：

```markdown
   - **CC 审核不通过**：
     - 设置 `workflow.current_step = verification_failed`
     - 设置 `workflow.next_step = null`  ← 修正：暂停等用户修复
     - 输出 CC 发现的问题列表
     - 提示修复后执行 `/verify` 重新验收
```

**优先级**：🔴 高

---

### 修复 #34：verify.md — 验收失败时 `next_step` 应为 `null`（修正 #24）

**文件**：`.windsurf/workflows/verify.md`

**问题**：#24 方案中验收失败时设置 `next_step = verify`，与 #31 暂停设计矛盾。

**修改**：修正 #24 方案中验收失败的状态更新：

```markdown
   - 如果 `passed = false`：
     - 设置 `workflow.current_step = verification_failed`
     - 设置 `workflow.next_step = null`  ← 修正：暂停等用户修复
     - 输出失败原因和问题列表
     - 提示修复后手动执行 `/verify` 重新验收
```

**优先级**：🔴 高

---

## 修复 #35：implement-fix-plan.md — 增加"交叉影响"校验维度（2026-02-14）

> 来源：分析 #33/#34 延迟发现的根因，发现 implement-fix-plan 校验维度缺少交叉影响检查

---

### 修复 #35：implement-fix-plan.md — 校验维度表增加维度 H + 强制交叉检查规则

**文件**：`.windsurf/workflows/implement-fix-plan.md`

**问题**：校验维度表（A~G）缺少"交叉影响"维度。当新增或修改某个修复项时，没有强制检查所有引用/依赖该修复项的其他项是否仍然一致。这是导致 #33/#34 延迟发现的直接原因——添加 #31（`verification_failed` 暂停）后，没有立即用交叉影响维度检查所有写入 `verification_failed` 的地方（#24 verify.md、#27 cc-review.md）。

**修改 1**：在校验维度表中增加维度 H

```markdown
| **H 交叉影响** | 修改项与其他修改项/现有组件的交互 | 修改了状态 X，是否检查了所有读写 X 的地方？ |
```

**修改 2**：在"关键规则"中增加强制交叉检查规则

```markdown
- 当某轮校验新增或修改了修复项时，下一轮必须优先使用**维度 H（交叉影响）**检查所有受影响的关联项
```

**优先级**：🔴 高

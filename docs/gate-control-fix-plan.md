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

在 while 循环的 `break` 之后、`# Step 4: 输出结果` 之前插入。

### 当前代码（第 164-176 行附近）

```python
        # 全部通过
        break
    else:
        # 达到最大迭代次数...
        ...

    # Step 4: 输出结果（仅在全部校验通过后才执行）
```

### 修改为

```python
        # 全部通过
        break
    else:
        # 达到最大迭代次数...
        ...

    # ========== Phase 3: 全局终审（新增）==========
    final_review_issues = []

    # 上游一致性：PRD 功能点 100% 覆盖？
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

    if final_review_issues:
        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        # 回到 Phase 2 重新修复
        requirement_doc = enhance_doc(requirement_doc, final_review_issues)
        # 重新执行整个校验循环（重置 iteration 计数器的剩余次数）
        # 注意：这里需要一个外层循环来支持 Phase 3 → Phase 2 的回退
        raise NeedRevalidation("全局终审未通过，需要重新校验")

    print("  全局终审: ✅ 通过")

    # Step 4: 输出结果（仅在全部校验通过后才执行）
```

### 注意

Phase 3 → Phase 2 的回退需要一个外层循环。建议将整个流程包装为：

```python
max_global_retries = 3
for global_retry in range(max_global_retries):
    # Phase 2: 逐项校验循环
    ...（现有 while 循环）...

    # Phase 3: 全局终审
    final_issues = global_final_review(requirement_doc, context)
    if not final_issues:
        break  # 全局终审通过
    else:
        requirement_doc = enhance_doc(requirement_doc, final_issues)
        continue  # 回到 Phase 2
else:
    raise BrainstormFailure("全局终审经过 3 次重试仍未通过")
```

---

## 修复 #3：story-splitter/SKILL.md — Phase 3 全局终审

### 位置

在 while 循环的 `break` 之后、`# 输出覆盖矩阵` 之前插入。

### 当前代码（第 179-187 行附近）

```python
        # 全部通过
        break
    else:
        ...

    # 输出覆盖矩阵
    print_coverage_matrix(all_fr_ids, stories)
```

### 修改为

```python
        # 全部通过
        break
    else:
        ...

    # ========== Phase 3: 全局终审（新增）==========
    final_review_issues = []

    # 上游一致性：需求文档 FR 100% 覆盖？
    # （Phase 2 已检查，这里再次确认修复后没有引入新遗漏）
    all_fr_ids = extract_all_fr_ids(requirement_doc)
    covered_frs = set()
    for story in stories:
        covered_frs.update(story["requirements"])
    if all_fr_ids - covered_frs:
        final_review_issues.append(f"上游一致性: {len(all_fr_ids - covered_frs)} 个 FR 未覆盖")

    # 下游可行性：每个 Story 可拆为 Tickets？
    for story in stories:
        if not story.get("acceptance_criteria"):
            final_review_issues.append(f"下游可行性: {story['id']} 缺少验收标准，无法拆 Tickets")
        if estimate_days(story.get("estimate", "0d")) > 5:
            final_review_issues.append(f"下游可行性: {story['id']} 估算超过 5 天")

    # 全局完整性：Stories 之间无重叠？
    for i, s1 in enumerate(stories):
        for s2 in stories[i+1:]:
            overlap = set(s1["requirements"]) & set(s2["requirements"])
            if overlap:
                final_review_issues.append(f"全局完整性: {s1['id']} 和 {s2['id']} 覆盖了相同的 FR: {overlap}")

    if final_review_issues:
        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        stories = fix_stories(stories, final_review_issues)
        # 回到 Phase 2 重新校验（需要外层循环支持）
        raise NeedRevalidation("全局终审未通过")

    print("  全局终审: ✅ 通过")

    # 输出覆盖矩阵
    print_coverage_matrix(all_fr_ids, stories)
```

---

## 修复 #4：ticket-splitter/SKILL.md — Phase 3 全局终审

### 位置

在 while 循环的 `break` 之后、`# 输出校验报告` 之前插入。

### 当前代码（第 287-296 行附近）

```python
        # 全部通过
        break
    else:
        ...

    # ========== 输出校验报告 ==========
    print_quality_report(tickets, iteration)
```

### 修改为

```python
        # 全部通过
        break
    else:
        ...

    # ========== Phase 3: 全局终审（新增）==========
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

    # 全局完整性：Tickets 依赖链完整无环？（再次确认）
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
                    f"全局完整性: {t1['id']} 和 {t2['id']} 修改相同文件 {overlap} 但无依赖关系"
                )

    if final_review_issues:
        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        tickets = fix_tickets(tickets, final_review_issues)
        raise NeedRevalidation("全局终审未通过")

    print("  全局终审: ✅ 通过")

    # ========== 输出校验报告 ==========
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
    # Step 4: 自我审查（根据 type 选择对应清单）
    review_result = self_review(ticket, result.code)
    if not review_result.passed:
        fix_review_issues(review_result.issues)

    # ========================================
    # Step 4.5: 全局终审（新增，不可跳过）
    # ========================================
    final_review_issues = []

    # 上游一致性：Ticket AC 全满足？
    for ac in ticket.acceptance_criteria:
        if not is_criteria_met(ac, result.code):
            final_review_issues.append(f"上游一致性: 验收标准未满足 '{ac}'")

    # 下游可行性：不破坏其他 Ticket 的代码？
    # 运行全量测试（不仅是当前 Ticket 的测试）
    full_test = bash(config.commands.test)
    if full_test.exit_code != 0:
        final_review_issues.append(f"下游可行性: 全量测试失败，可能破坏了其他代码")

    # 全局完整性：修改都在 allowed_paths 内？
    changed_files = get_changed_files()
    allowed = ticket.get("allowed_paths", {}).get("modify", [])
    for f in changed_files:
        if not matches_any_pattern(f, allowed):
            final_review_issues.append(f"全局完整性: 修改了 allowed_paths 之外的文件 {f}")

    if final_review_issues:
        print(f"  全局终审: ❌ {len(final_review_issues)} 个问题")
        for issue in final_review_issues:
            print(f"    - {issue}")
        # 修复后需要重新执行自审和全局终审
        fix_final_review_issues(final_review_issues)
        # 重新执行 Step 4 + Step 4.5（最多重试 2 次）

    print("  全局终审: ✅ 通过")

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

        # Phase 3: 全局终审
        final_issues = []
        # 上游一致性：所有 Tickets 有证据？（再次确认）
        # 下游可行性：和其他 Stories 集成无冲突？
        # 全局完整性：所有 AC 满足？
        final_issues = global_final_review_verify(task, story)

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

## 实施顺序

建议按以下顺序修改（先高优先级，后中优先级）：

1. **修复 #7** — verification/SKILL.md 多轮迭代（最大变更，重写 verify 函数）
2. **修复 #6** — verification/SKILL.md AC 覆盖率校验
3. **修复 #8** — verification/SKILL.md 失败退出逻辑
4. **修复 #1** — brainstorming/SKILL.md PRD 覆盖率校验
5. **修复 #2** — brainstorming/SKILL.md Phase 3 全局终审
6. **修复 #3** — story-splitter/SKILL.md Phase 3 全局终审
7. **修复 #4** — ticket-splitter/SKILL.md Phase 3 全局终审
8. **修复 #5** — deliver-ticket/SKILL.md Phase 3 全局终审

---

## 影响范围

| 文件 | 修改量（估） | 风险 |
|------|------------|------|
| verification/SKILL.md | ~80 行新增/重写 | 中（重写核心函数） |
| brainstorming/SKILL.md | ~50 行新增 | 低（追加代码块） |
| story-splitter/SKILL.md | ~30 行新增 | 低（追加代码块） |
| ticket-splitter/SKILL.md | ~35 行新增 | 低（追加代码块） |
| deliver-ticket/SKILL.md | ~25 行新增 | 低（追加代码块） |

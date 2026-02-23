---
name: verification
description: "Use when verifying a Story - runs full tests, checks AC coverage, validates code coverage thresholds, and performs global final review"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Verification Skill

## 概览

Story 级别统一验收引擎。定义 `verify_story()` 函数，被 I 阶段（WS 自动验收）、手动 `/verify`、V 阶段（CC 二次校验）共用。核心价值：全量测试发现跨 Ticket 回归。

## ⚠️ 铁律

```
证据先于断言

任何"完成"声明必须有：
- 命令输出截图/日志
- 验证通过记录（测试结果 / lint+build 结果，取决于 Ticket type）
- 可复现的验证步骤
```

## 门控函数

```python
def can_claim_done(task):
    """在声明完成前必须通过此检查"""
    
    # 1. 必须有执行证据
    if not task.execution_log:
        return False, "缺少执行日志"
    
    # 2. 根据 type 选择验证策略
    if task.type in ("backend", "database"):
        # 后端/数据库：必须有测试结果且通过
        if not task.test_result:
            return False, "缺少测试结果"
        if task.test_result.status != "passed":
            return False, "测试未通过"
    
    elif task.type == "frontend-ui":
        # UI 还原：必须有 lint + build 结果
        if not task.lint_result or task.lint_result.status != "passed":
            return False, "Lint 检查未通过"
        if not task.build_result or task.build_result.status != "passed":
            return False, "构建检查未通过"
    
    elif task.type == "frontend":
        # 前端功能：lint + build（测试可选）
        if not task.lint_result or task.lint_result.status != "passed":
            return False, "Lint 检查未通过"
        if not task.build_result or task.build_result.status != "passed":
            return False, "构建检查未通过"

    elif task.type == "test":
        # 测试类：必须有测试结果且通过
        if not task.test_result:
            return False, "缺少测试结果"
        if task.test_result.status != "passed":
            return False, "测试未通过"

    elif task.type == "config":
        # 配置类：必须有执行证据（通用检查已在上方完成），无额外专属验证
        pass
    
    # 3. 所有验收标准必须满足（通用）
    for criteria in task.acceptance_criteria:
        if not criteria.verified:
            return False, f"验收标准未满足: {criteria}"
    
    return True, "可以声明完成"
```

## Story 验收检查项

| 阶段 | 检查项 | 检查方法 | 通过条件 |
|------|--------|----------|----------|
| **Phase 1 前置检查** | Ticket 状态 | 读取 YAML status 字段 | 所有 Tickets status=done |
| | 验证证据 | 检查 verification_evidence 字段 | 所有 Tickets 有证据且 exit_code=0 |
| **Phase 2 功能验收** | 全量测试 🔴 | 执行 mvn test / pnpm test | exit_code=0 |
| | AC 覆盖率 | 逐条检查 Story AC | 每个 AC 被至少 1 个已完成 Ticket 覆盖 |
| | 覆盖率汇总 | 解析 JaCoCo/Vitest 报告 | 达到 config 中定义的门槛 |
| | 集成测试 | 执行 `mvn verify -Pintegration-test` | exit_code=0（仅当 config.testing.integration.enabled） |
| **Phase 3 增强全局终审** | 三维度终审 | 上游一致性+下游可行性+全局完整性 | 全部通过 |
| | 多维度旋转校验 | A~I 维度按优先级轮换（参见 quality-gate） | 连续两轮无修改 |
| | 退出条件 | 连续 2 轮无修改，或达到 max 10 轮 | 连续 2 轮无修改 |

## 常见失败对照表

| 陈述 | 实际证据 | 正确做法 |
|------|----------|----------|
| "构建成功" | 构建命令: exit 0 | Linter 通过不代表构建成功 |
| "Bug 修好了" | 测试原症状: 通过 | 代码改了不代表修好了 |
| "测试通过" | 测试框架输出 | 运行实际测试命令 |
| "文件已更新" | 文件时间戳 | 检查实际内容 |

## 反合理化表格

| 借口 | 现实检查 |
|------|----------|
| "应该工作了" | 运行验证命令 |
| "我确定没问题" | 信心 ≠ 证据 |
| "之前测过了" | 再测一次 |
| "变更太小" | 小变更也可能引入 bug |

## 红旗 - 立即停止

- ❌ 没有运行任何验证命令就说"完成"
- ❌ 测试失败但声称"应该是环境问题"
- ❌ 跳过验证因为"太简单了"
- ❌ 使用"根据我的理解"而非实际证据

---

## 🚨 调用场景

本 Skill 定义的 `verify_story()` 是统一验收引擎，被以下场景调用：

| 调用者 | 触发时机 | 说明 |
|--------|---------|------|
| **deliver-ticket** (I阶段) | 所有 Tickets 完成后自动调用 | WS 主力执行，首次验收 |
| **/verify** (手动重试) | 验收失败后用户手动触发 | 修复问题后重新验收 |
| **/cc-review** (V阶段，可选) | I阶段验收通过后用户选择执行 | CC 执行相同逻辑，二次校验防止自我欺骗 |

> **纯函数设计**：`verify_story()` 只做验收判断，返回 passed/failed，**不更新 STATE.yaml**。状态更新由调用方负责。
>
> **事件审计**：`verify_story()` 不写事件。调用方在更新 STATE.yaml 后必须调用 `append_workflow_event()`（见 workflow-engine/SKILL.md §6）。

## 执行伪代码

```python
def verify_story(story_id):
    """统一验收引擎 — I阶段(WS)和V阶段(CC)共用"""

    story = read_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml")
    config = read_yaml(".claude/project/config.yaml")

    # ============================================
    # Phase 1: 前置检查（不可跳过，不在循环内）
    # ============================================
    pre_issues = []

    for ticket_id in story.tickets:
        ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")

        # 1.1 Ticket 状态必须为 done
        if ticket.status != "done":
            pre_issues.append(f"{ticket_id}: 状态为 {ticket.status}，非 done")

        # 1.2 必须有 verification_evidence
        if not ticket.get("verification_evidence"):
            pre_issues.append(f"{ticket_id}: 缺少 verification_evidence")
            continue

        # 1.3 exit_code 必须为 0
        if ticket.verification_evidence.get("exit_code") != 0:
            pre_issues.append(
                f"{ticket_id}: exit_code={ticket.verification_evidence.exit_code}")

    if pre_issues:
        print("Phase 1 前置检查: ❌ 失败")
        for issue in pre_issues:
            print(f"  - {issue}")
        return {
            "passed": False,
            "phase": "pre_check",
            "issues": pre_issues,
            "reason": "前置检查失败，无法进入验收"
        }

    print("Phase 1 前置检查: ✅ 通过")

    # ============================================
    # Phase 2: 功能验收（独立循环）
    # ============================================
    max_iterations = 5

    for iteration in range(1, max_iterations + 1):
        print(f"🔄 验收迭代 {iteration}/{max_iterations}")
        issues = []

        # ------------------------------------------
        # 2.1 🔴 全量测试 + 覆盖率（合并执行，避免重复跑测试）
        # ------------------------------------------
        # 后端：mvn test jacoco:report（一次执行同时完成测试和覆盖率报告）
        if has_backend_tickets(story):
            backend_result = bash(config.commands.test_coverage)  # mvn test jacoco:report
            if backend_result.exit_code != 0:
                issues.append(("full_test", "backend",
                    f"后端全量测试失败: {extract_failure_summary(backend_result)}"))
            else:
                # 测试通过，检查覆盖率
                coverage = parse_jacoco_report(config.commands.coverage_report)
                thresholds = get_coverage_thresholds("backend")  # {branch: 100, line: 90}
                if coverage["branch"]["percentage"] < thresholds["branch"]:
                    issues.append(("coverage", "backend_branch",
                        f"后端分支覆盖率 {coverage['branch']['percentage']}% < {thresholds['branch']}%"))
                if coverage["line"]["percentage"] < thresholds["line"]:
                    issues.append(("coverage", "backend_line",
                        f"后端行覆盖率 {coverage['line']['percentage']}% < {thresholds['line']}%"))

        # 前端：pnpm test:coverage（一次执行同时完成测试和覆盖率报告）
        if has_frontend_tickets(story):
            frontend_result = bash(config.commands.frontend.test_coverage)  # pnpm test:coverage
            if frontend_result.exit_code != 0:
                issues.append(("full_test", "frontend",
                    f"前端全量测试失败: {extract_failure_summary(frontend_result)}"))
            else:
                # 测试通过，检查覆盖率
                coverage = parse_vitest_report(config.commands.frontend.coverage_report)
                thresholds = get_coverage_thresholds("frontend")  # {branch: 90, line: 80}
                if coverage["branch"]["percentage"] < thresholds["branch"]:
                    issues.append(("coverage", "frontend_branch",
                        f"前端分支覆盖率 {coverage['branch']['percentage']}% < {thresholds['branch']}%"))
                if coverage["line"]["percentage"] < thresholds["line"]:
                    issues.append(("coverage", "frontend_line",
                        f"前端行覆盖率 {coverage['line']['percentage']}% < {thresholds['line']}%"))

        # ------------------------------------------
        # 2.1b 集成测试（如果启用）
        # ------------------------------------------
        if config.get("testing", {}).get("integration", {}).get("enabled"):
            integration_result = bash(config.testing.integration.command)
            if integration_result.exit_code != 0:
                issues.append(("integration_test", "all",
                    f"集成测试失败: {extract_failure_summary(integration_result)}"))

        # ------------------------------------------
        # 2.2 Story AC 覆盖率检查
        # ------------------------------------------
        for ac in story.acceptance_criteria:
            ac_covered = False
            for ticket_id in story.tickets:
                ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
                if ticket.status == "done" and ticket_covers_criteria(ticket, ac):
                    ac_covered = True
                    break
            if not ac_covered:
                issues.append(("ac_coverage", ac,
                    f"验收标准未被任何已完成 Ticket 覆盖: '{ac}'"))

        # ------------------------------------------
        # 2.3 判断 Phase 2 结果
        # ------------------------------------------
        if issues:
            print(f"  Phase 2 功能验收: ❌ {len(issues)} 个问题")
            for category, name, desc in issues:
                print(f"    [{category}] {name}: {desc}")
            fix_verification_issues(story, issues)
            continue  # 回到迭代开头

        print("  Phase 2 功能验收: ✅ 全部通过")
        break  # Phase 2 通过
    else:
        print(f"❌ Phase 2 达到最大迭代次数 ({max_iterations}/{max_iterations})")
        print("验收失败，请人工检查后重新执行 /verify")
        return {
            "passed": False,
            "phase": "phase2_max_iterations",
            "issues": issues,
            "reason": f"Phase 2 经过 {max_iterations} 轮迭代仍未通过"
        }

    # ============================================
    # Phase 3: 增强全局终审（独立循环）
    # ============================================
    # 参见 quality-gate/SKILL.md 的 enhanced_global_review()
    # 本环节维度优先级: I → H → C → D → B → E → G → A → F
    # 本环节三维度检查:
    #   上游一致性: 所有 Tickets 证据有效？
    #   下游可行性: 与其他已完成 Stories 无文件冲突？
    #   全局完整性: 所有 AC 满足？

    dim_priority = ["I", "H", "C", "D", "B", "E", "G", "A", "F"]
    max_enhanced_rounds = 10
    no_change_rounds = 0
    dim_index = 0
    last_had_changes = False

    for round_num in range(1, max_enhanced_rounds + 1):
        all_issues = []

        # --- 3a. 三维度终审（每轮都做） ---
        # 上游一致性：所有 Tickets 证据仍然有效？
        for ticket_id in story.tickets:
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if not ticket.get("verification_evidence"):
                all_issues.append(f"上游一致性: {ticket_id} 缺少证据")
            elif ticket.verification_evidence.get("exit_code") != 0:
                all_issues.append(f"上游一致性: {ticket_id} 验证失败")

        # 下游可行性：与其他已完成 Stories 集成无冲突？
        state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
        completed_stories = [s for s in state.get("completed_stories", [])
                             if s != story_id]
        for other_id in completed_stories:
            other = read_yaml(f"osg-spec-docs/tasks/stories/{other_id}.yaml")
            my_files = get_all_modified_files(story)
            other_files = get_all_modified_files(other)
            conflict = my_files & other_files
            if conflict:
                all_issues.append(
                    f"下游可行性: 与 {other_id} 修改了相同文件 {conflict}")

        # 全局完整性：所有 AC 满足？（再次确认）
        for ac in story.acceptance_criteria:
            if not any(
                ticket_covers_criteria(
                    read_yaml(f"osg-spec-docs/tasks/tickets/{tid}.yaml"), ac
                ) for tid in story.tickets
            ):
                all_issues.append(f"全局完整性: AC 未满足 '{ac}'")

        # --- 3b. 多维度旋转校验（每轮选一个维度） ---
        if last_had_changes:
            dim = "H"  # 上轮有修改，优先检查交叉影响
        else:
            dim = dim_priority[dim_index % len(dim_priority)]
            dim_index += 1

        dim_issues = check_dimension(story, dim, DIMENSION_MEANINGS["verification"][dim])
        all_issues += dim_issues

        # --- 输出进度 ---
        print(f"🔍 终审轮次 {round_num}/{max_enhanced_rounds} (维度 {dim})")

        # --- 判断 ---
        if all_issues:
            print(f"  ❌ {len(all_issues)} 个问题")
            for issue in all_issues:
                print(f"    - {issue}")
            fix_verification_issues(story, all_issues)
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
        print(f"❌ Phase 3 增强终审经过 {max_enhanced_rounds} 轮仍未通过")
        print("验收失败，请人工检查后重新执行 /verify")
        return {
            "passed": False,
            "phase": "phase3_enhanced_review",
            "issues": all_issues,
            "reason": f"增强终审经过 {max_enhanced_rounds} 轮仍未通过"
        }

    # ============================================
    # 验收通过 — 返回结果（不更新 STATE，由调用方负责）
    # ============================================
    return {
        "passed": True,
        "full_test_result": "all_passed",
        "ac_coverage": "100%"
    }


def has_backend_tickets(story):
    """检查 Story 是否包含后端类型的 Tickets"""
    for ticket_id in story.tickets:
        ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
        if ticket.type in ("backend", "database", "test"):
            return True
    return False


def has_frontend_tickets(story):
    """检查 Story 是否包含前端类型的 Tickets"""
    for ticket_id in story.tickets:
        ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
        if ticket.type in ("frontend", "frontend-ui"):
            return True
    return False
```

## 输出格式

### Story 验收通过

```markdown
## ✅ Story 验收报告

**Story**: {story_id} - {story_title}
**验收迭代**: {iteration} 轮

### Phase 1: 前置检查
- Tickets 状态: ✅ 全部 done ({ticket_count}/{ticket_count})
- 验证证据: ✅ 全部有效

### Phase 2: 功能验收

#### 全量测试 🔴
- 后端: `mvn test` → exit_code=0, Tests: {n} passed, 0 failed
- 前端: `pnpm test` → exit_code=0, Tests: {n} passed, 0 failed

#### AC 覆盖率
| # | 验收标准 | 覆盖 Ticket | 状态 |
|---|----------|------------|------|
| 1 | {ac_1} | T-001, T-002 | ✅ |
| 2 | {ac_2} | T-003 | ✅ |
覆盖率: {n}/{n} = 100% ✅

#### 覆盖率汇总
| 类型 | 分支覆盖 | 行覆盖 | 门槛 | 状态 |
|------|---------|--------|------|------|
| 后端 | 100% | 92% | 100%/90% | ✅ |
| 前端 | 93% | 85% | 90%/80% | ✅ |

### Phase 3: 全局终审
- 上游一致性: ✅
- 下游可行性: ✅
- 全局完整性: ✅

### ⏭️ 下一步
- `/cc-review` — CC 交叉验证（二次校验）
- `/approve` — 跳过 CC，直接审批
```

### Story 验收失败

```markdown
## ❌ Story 验收报告

**Story**: {story_id} - {story_title}
**验收迭代**: {iteration}/{max_iterations} 轮
**失败阶段**: Phase {n}

### 未通过项
| # | 类别 | 问题 |
|---|------|------|
| 1 | full_test | 后端全量测试失败: XxxTest.testYyy |
| 2 | ac_coverage | 验收标准未覆盖: '...' |

### ⏭️ 下一步
修复以上问题后执行 `/verify` 重新验收
```

## 失败退出规则

```
⚠️ Phase 1 失败：前置检查未通过（Ticket 状态非 done / 缺少证据 / exit_code 非 0）：
1. 输出失败报告（列出所有未通过的 Ticket 及原因）
2. 返回 {"passed": False, "phase": "pre_check"} — 不更新任何状态（纯函数）
3. 调用方负责状态处理
4. 用户需修复 Ticket 问题后重新执行 /verify

⚠️ Phase 2 失败：当 max_iterations（默认 5）次迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 返回 {"passed": False, ...} — 不更新任何状态（纯函数）
3. 调用方负责状态处理
4. 用户可以修复后重新执行 /verify

⚠️ Phase 3 失败：当增强终审经过 max_enhanced_rounds（默认 10）轮后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 返回 {"passed": False, ...} — 不更新任何状态（纯函数）
3. 调用方负责状态处理
4. 用户可以修复后重新执行 /verify
```

## 迭代计数强制规则

每轮验收迭代和增强终审必须输出进度，格式如下：

```
=== Phase 2: 功能验收 ===
🔄 验收迭代 1/5
  全量测试: ✅ 后端 mvn test → exit_code=0
  AC 覆盖率: ❌ 1 个 AC 未覆盖
  覆盖率: ✅ 分支 100%, 行 92%

🔄 验收迭代 2/5
  全量测试: ✅ 通过
  AC 覆盖率: ✅ 8/8 = 100%
  覆盖率: ✅ 达标

Phase 2 功能验收: ✅ 全部通过

=== Phase 3: 增强全局终审 ===
🔍 终审轮次 1/10 (维度 I — 命名一致性)
  三维度终审:
    上游一致性: ✅ 所有 Tickets 证据有效
    下游可行性: ✅ 无文件冲突
    全局完整性: ✅ 所有 AC 满足
  多维度校验 (I): ✅ 无问题

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🎉 连续 2 轮无修改，终审通过
```

## 硬约束

- 禁止跳过任何验收阶段（Phase 1/2/3）
- 禁止没有全量测试通过就声明验收
- 禁止 AC 覆盖率不是 100% 就声明验收
- 禁止用假设替代验证
- 禁止伪造测试结果或覆盖率数据
- 必须记录验证过程
- **全量测试是重中之重** — Phase 2 的核心价值在于发现跨 Ticket 回归
- **禁止超过 max_iterations（5 次）迭代** - Phase 2 达到上限必须失败退出
- **禁止超过 max_enhanced_rounds（10 轮）增强终审** - Phase 3 达到上限必须失败退出
- **连续两轮无修改才算通过** - 不是一轮无修改就通过
- **上轮有修改 → 维度 H** - 任何修改后必须优先检查交叉影响

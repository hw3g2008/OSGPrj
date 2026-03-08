---
name: deliver-ticket
description: "Use when executing /next command and a Ticket is assigned - implements the Ticket following the appropriate workflow (TDD / UI restoration / frontend / test / config) with mandatory test design, execution, and verification"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Deliver-Ticket Skill

## 概览

执行单个 Ticket 的实现。根据 Ticket 的 `type` 字段选择对应流程：TDD（backend/database/test）、UI 还原（frontend-ui）、前端功能（frontend）或配置变更（config）。

**🚨 重要变更**：测试环节是重中之重，必须：
1. 先设计测试用例（调用 `test-design` Skill）
2. 精确覆盖所有 if-else 分支
3. 执行测试并验证覆盖率（调用 `test-execution` Skill）
4. 分支覆盖率必须达到 100%

## 何时使用

- `/next` 命令分配了一个 Ticket
- Ticket 状态为 `pending` 或 `in_progress`
- 需要实现代码变更

## ⚠️ 执行模式

```
⚠️ 铁律（所有 type）：
1. 只修改 allowed_paths 中的文件
2. 完成后必须运行自我审查清单
3. 完成声明必须附带验证证据
4. 🚨 verification_evidence 必须存在且 exit_code = 0 才能更新状态

⚠️ TDD 铁律（type: backend / database / test）：
5. 🚨 必须先设计测试用例（调用 test-design Skill）
6. 🚨 测试用例必须覆盖所有 if-else 分支（分支覆盖率 100%）
7. 必须先写测试，再写代码（Red-Green-Refactor）
8. 测试必须通过且覆盖率达标才能完成

⚠️ UI / 前端铁律（type: frontend-ui / frontend）：
9. lint + build 必须通过才能完成
10. 前端功能类建议编写单元测试（分支覆盖率 ≥ 90%）
11. 含真实副作用 / 关键状态变更的能力必须通过 `delivery_truth_guard.py --stage next`
12. 含 critical_surfaces 的页面必须通过 `ui_critical_evidence_guard.py --stage next`

⚠️ 配置铁律（type: config）：
13. 修改后必须验证配置正确性（语法检查、启动验证等）
```

## 执行流程

根据 Ticket 的 `type` 字段选择不同流程：

### 流程 A：TDD 流程（type: backend / database / test）

```
开始
  │
  ▼
[读取 Ticket] ─→ 获取 ticket_id, allowed_paths, acceptance_criteria
  │
  ▼
[创建 Checkpoint] ─→ 保存当前状态
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Phase 1: 测试用例设计（调用 test-design Skill）          │
├─────────────────────────────────────────────────────────────┤
│ 1. 分析目标代码的所有分支点                                  │
│    - if/else 语句                                           │
│    - switch/case 语句                                       │
│    - 三元运算符                                              │
│    - 短路求值 (&&, ||)                                      │
│    - try/catch 块                                           │
│    - 循环边界                                                │
│                                                             │
│ 2. 应用 5 种测试设计方法                                     │
│    - 等价类划分 (Equivalence Partitioning)                  │
│    - 边界值分析 (Boundary Value Analysis)                   │
│    - 决策表测试 (Decision Table Testing)                    │
│    - 状态转换测试 (State Transition Testing)                │
│    - 因果图法 (Cause-Effect Graphing)                       │
│                                                             │
│ 3. 生成测试用例矩阵                                          │
│    - 每个分支至少 1 个测试用例                               │
│    - 正向测试 + 负向测试 + 边界测试 + 异常测试               │
│                                                             │
│ 4. 验证分支覆盖率 = 100%                                     │
│    - 有遗漏则补充测试用例                                    │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
[读取测试矩阵文件] ─→ 从 {config.paths.tasks.test_matrices}/{ticket_id}.yaml 读取
  │                     （文件不存在则先调用 test-design 生成）
  ▼
[TDD: RED] ─→ 根据测试用例矩阵编写失败测试
  │              ⚠️ 运行测试必须失败（exit_code ≠ 0），否则拒绝进入 GREEN
  │              （测试不失败说明：无断言、断言条件错误、或未依赖被测代码）
  ▼
[TDD: GREEN] ─→ 写最少的代码让测试通过
  │
  ▼
[TDD: REFACTOR] ─→ 优化代码（保持测试通过）
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Phase 2: 测试执行与覆盖率验证（调用 test-execution Skill）│
├─────────────────────────────────────────────────────────────┤
│ 1. 运行所有测试                                              │
│    - 命令: ${config.commands.test_coverage}                 │
│    - 必须全部通过                                            │
│                                                             │
│ 2. 生成覆盖率报告                                            │
│    - JaCoCo (Java) / Vitest (TypeScript)                    │
│                                                             │
│ 3. 验证覆盖率门槛                                            │
│    - 分支覆盖率: 100% (backend/database/test)               │
│    - 行覆盖率: ≥ 90%                                        │
│                                                             │
│ 4. 如果覆盖率不达标                                          │
│    - 列出未覆盖的代码行/分支                                 │
│    - 补充测试用例                                            │
│    - 重新运行测试                                            │
└─────────────────────────────────────────────────────────────┘
  │
  ├── 测试失败或覆盖率不达标 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
┌─ 增强全局终审（max 10 轮）──────────────────────┐
│ [自我审查清单] ── 有问题？──→ 修复                    │
│  ✅                                                   │
│ [三维度终审 + 多维度旋转校验（A~I）]                   │
│  退出条件：连续两轮无修改                              │
│  达到上限 → 失败退出                                   │
└────────────────────────────────────────────────────────┘
  │ ✅ 连续两轮无修改
  ▼
[Level 1 单元验证] ─→ 验证命令 exit_code = 0
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[Level 2 回归验证] ─→ 全量测试
  │
  ├── 失败 ──→ 停止（回归检测）
  │
  ▼ 通过
[记录验证证据] ─→ 写入 verification_evidence
  │
  ▼
[更新状态] ─→ ticket.status = done
  │
  ▼
[Level 3 增量 Story 验证]
  │
  ▼
[输出结果]
```

### 流程 B：UI 还原流程（type: frontend-ui）

当 Ticket 的 `type` 为 `frontend-ui` 时，跳过 TDD，使用以下流程：

```
开始
  │
  ▼
[读取 Ticket] ─→ 获取 ticket_id, allowed_paths, prototype_ref, acceptance_criteria
  │
  ▼
[创建 Checkpoint] ─→ 保存当前状态
  │
  ▼
[读取原型] ─→ 读取 prototype_ref 指定的 HTML 文件，提取目标区域结构和样式
  │
  ▼
[组件映射] ─→ 将原型 HTML 元素映射为目标 UI 框架组件（映射表由项目 Agent 定义）
  │
  ▼
[实现代码] ─→ 编写组件 + 样式代码，对齐原型视觉效果
  │
  ▼
[Lint 检查] ─→ 运行 lint 命令
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[构建检查] ─→ 运行 build 命令
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[UI 自我审查清单]
  │
  ├── 有问题 ──→ 修复
  │
  ▼ 全部通过
[更新状态] ─→ ticket.status = done
  │
  ▼
[输出结果]
```

> ❗ **注意**：流程 B 完成后，仍需经过增强终审（Step 4.5）+ Level 1/2 验证（Step 5~6）+ 写入 evidence（Step 7）+ 更新状态（Step 8），与流程 A 的 Step 4~8 相同。

### 流程 C：前端功能流程（type: frontend）

与流程 A 类似，但验收标准为 lint + build 通过，无强制单元测试要求。详见 `42_实现细节.md` 的前端测试策略。

### 流程 D：测试流程（type: test）

与流程 A 的 TDD 流程一致（Red → Green → Refactor），验收标准为测试全部通过。

### 流程 E：配置流程（type: config）

```
开始
  │
  ▼
[读取 Ticket] ─→ 获取 ticket_id, allowed_paths, acceptance_criteria
  │
  ▼
[创建 Checkpoint] ─→ 保存当前状态
  │
  ▼
[实现配置变更] ─→ 修改配置文件
  │
  ▼
[验证配置] ─→ 语法检查 / 启动验证
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[自我审查清单]
  │
  ├── 有问题 ──→ 修复
  │
  ▼ 全部通过
[更新状态] ─→ ticket.status = done
  │
  ▼
[输出结果]
```

> ❗ **注意**：流程 E 完成后，仍需经过增强终审（Step 4.5）+ Level 1/2 验证（Step 5~6）+ 写入 evidence（Step 7）+ 更新状态（Step 8），与流程 A 的 Step 4~8 相同。

## 自我审查清单

### 通用审查（所有 type）

#### 完整性检查
- [ ] 所有 acceptance_criteria 都满足？
- [ ] 所有修改都在 allowed_paths 内？
- [ ] 没有遗漏的 TODO/FIXME？

#### 质量检查
- [ ] 代码符合项目规范？
- [ ] 没有硬编码值？
- [ ] 错误处理完整？

### TDD 审查（type: backend / database / test）

#### 测试检查
- [ ] 测试覆盖所有场景？
- [ ] 测试命名清晰？
- [ ] 没有跳过的测试？

### UI 还原审查（type: frontend-ui）

#### 视觉还原检查
- [ ] 布局结构与原型一致？（侧边栏、TopBar、内容区域）
- [ ] 颜色使用主题 Token，未硬编码？
- [ ] 间距、圆角、阴影与原型匹配？
- [ ] 响应式表现合理（表格不溢出、卡片自适应）？

#### 组件映射检查
- [ ] 原型中的交互元素已正确映射为目标 UI 框架组件？
- [ ] 表格列定义完整（字段名、宽度、对齐）？
- [ ] 状态标签（badge）颜色与原型匹配？
- [ ] 按钮类型和位置与原型一致？

#### 工程检查
- [ ] lint 命令通过？
- [ ] build 命令通过？
- [ ] 无编译 / 类型错误？
- [ ] 样式作用域隔离，无全局污染？

## 执行伪代码

```python
def deliver_ticket(ticket_id):
    config = load_yaml(".claude/project/config.yaml")
    ticket_path = f"{config.paths.tasks.tickets}{ticket_id}.yaml"

    # Step 0: 前置检查
    if not ticket_id:
        return failed("当前 Story 无 pending Ticket，请执行 /verify 或 /approve")

    if not exists(ticket_path):
        return failed(f"Ticket 文件不存在: {ticket_path}")

    # Step 1: 读取 Ticket
    ticket = read_yaml(ticket_path)

    if ticket.status not in ["pending", "in_progress"]:
        return failed(f"Ticket {ticket_id} 状态为 {ticket.status}，需要 pending 或 in_progress")

    module = read_yaml("osg-spec-docs/tasks/STATE.yaml").workflow.current_requirement
    truth_guard = bash(
        "python3 .claude/skills/workflow-engine/tests/delivery_truth_guard.py "
        f"--module {module} --stage next"
    )
    if truth_guard.exit_code != 0:
        return failed("delivery_truth_guard 未通过：存在降级实现、缺失 provider/runtime 声明或缺失真实性证据路径")

    critical_ui_guard = bash(
        "python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py "
        f"--contract osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml "
        f"--page-report osg-spec-docs/tasks/audit/ui-visual-page-report-{module}-{today()}.json "
        "--stage next"
    )
    if critical_ui_guard.exit_code != 0:
        return failed("ui_critical_evidence_guard 未通过：关键 surface 被 mask 或关键 UI 证据包缺失")

    # Step 2: 创建 Checkpoint
    checkpoint_id = create_checkpoint(ticket_id)

    # Step 3: 根据 type 选择流程
    if ticket.type in ("backend", "database"):
        # 流程 A: TDD
        result = execute_tdd_flow(ticket, config)
    elif ticket.type == "frontend-ui":
        # 流程 B: UI 还原
        result = execute_ui_flow(ticket, config)
    elif ticket.type == "test":
        # 流程 D: 测试（TDD 流程）
        result = execute_tdd_flow(ticket, config)
    elif ticket.type == "config":
        # 流程 E: 配置变更
        result = execute_config_flow(ticket, config)
    else:
        # 流程 C: 前端功能
        result = execute_frontend_flow(ticket, config)

    if not result.passed:
        return {
            "status": "needs_review",
            "checkpoint": checkpoint_id,
            "errors": result.errors
        }

    # Step 4 + Step 4.5 包裹在重试循环中
    # Step 4.5 增强为：三维度终审 + 多维度旋转校验
    # 参见 quality-gate/SKILL.md 的 enhanced_global_review()
    # 本环节维度优先级: E → I → H → B → C → D → G → A → F
    # 本环节三维度检查:
    #   上游一致性: Ticket AC 全满足？
    #   下游可行性: 全量测试通过？不破坏其他 Ticket？
    #   全局完整性: 修改都在 allowed_paths 内？

    dim_priority = ["E", "I", "H", "B", "C", "D", "G", "A", "F"]
    max_review_retries = 9
    no_change_rounds = 0
    dim_index = 0
    last_had_changes = False

    for review_retry in range(max_review_retries + 1):
        # Step 4: 自我审查
        review_result = self_review(ticket, result.code)
        if not review_result.passed:
            fix_review_issues(review_result.issues)

        # Step 4.5: 增强全局终审
        all_issues = []

        # --- 3a. 三维度终审（每轮都做） ---
        # 上游一致性：Ticket AC 全满足？
        for ac in ticket.acceptance_criteria:
            if not is_criteria_met(ac, result.code):
                all_issues.append(f"上游一致性: 验收标准未满足 '{ac}'")

        # 下游可行性：不破坏其他 Ticket 的代码？
        full_test = bash(config.commands.test)
        if full_test.exit_code != 0:
            all_issues.append(f"下游可行性: 全量测试失败")

        # 全局完整性：修改都在 allowed_paths 内？
        changed_files = get_changed_files()
        allowed = ticket.get("allowed_paths", {}).get("modify", [])
        for f in changed_files:
            if not matches_any_pattern(f, allowed):
                all_issues.append(f"全局完整性: 修改了 allowed_paths 之外的文件 {f}")

        # --- 3b. 多维度旋转校验（每轮选一个维度） ---
        if last_had_changes:
            dim = "H"  # 上轮有修改，优先检查交叉影响
        else:
            dim = dim_priority[dim_index % len(dim_priority)]
            dim_index += 1

        dim_issues = check_dimension(result.code, dim, DIMENSION_MEANINGS["code"][dim])
        all_issues += dim_issues

        # --- 输出进度 ---
        print(f"🔍 终审轮次 {review_retry+1}/{max_review_retries+1} (维度 {dim})")

        # --- 判断 ---
        if not all_issues:
            no_change_rounds += 1
            last_had_changes = False
            print(f"  ✅ 无问题 (连续无修改: {no_change_rounds})")
            if no_change_rounds >= 2:
                print(f"🎉 连续 {no_change_rounds} 轮无修改，终审通过")
                break
        else:
            print(f"  ❌ {len(all_issues)} 个问题")
            for issue in all_issues:
                print(f"    - {issue}")
            fix_final_review_issues(all_issues)
            no_change_rounds = 0
            last_had_changes = True
    else:
        return {
            "status": "final_review_failed",
            "errors": all_issues,
            "hint": f"增强终审经过 {max_review_retries+1} 次重试仍未通过"
        }

    # ========================================
    # Step 5: 强制验证 — Level 1 单元验证（不可跳过）
    # ========================================
    verification = run_verification(ticket, config)

    if verification.exit_code != 0:
        # 验证失败，不更新状态
        return {
            "status": "verification_failed",
            "error": verification.stderr,
            "hint": "修复问题后重新执行 /next"
        }

    # ========================================
    # Step 6: Level 2 回归验证（全量测试，必须在写证据之前）
    # ========================================
    regression_result = run_regression_test(ticket, config)
    if not regression_result.passed:
        # 回归失败：不写证据、不更新状态
        return {
            "status": "regression_detected",
            "error": regression_result.failures,
            "hint": "当前 Ticket 引入了回归，全量测试失败，请修复后重新执行 /next"
        }

    # Step 6.5: 验证证据命令强度校验（防止 "code review" 等非自动化命令）
    if not validate_evidence_command(verification.command):
        return {
            "status": "invalid_evidence_command",
            "error": f"证据命令 '{verification.command}' 不是可执行的 shell 命令",
            "hint": "请参考验证命令速查表选择正确的命令"
        }

    # Step 7: 写入验证证据（Level 1 + Level 2 都通过后才写）
    ticket.verification_evidence = {
        "command": verification.command,
        "exit_code": verification.exit_code,
        "regression_test": "passed",
        "output_summary": extract_summary(verification.stdout),
        "timestamp": now()
    }

    # Step 7.5: TC 回填（D6 挂点）
    # 更新对应 TC 的 automation.command 和 latest_result
    # 规则：tc_id 匹配 upsert，不覆盖 status != pending 的已有结果
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")  # 提前读取，后续 Step 9 也用
    module = state.current_requirement
    tc_cases_path = f"osg-spec-docs/tasks/testing/{module}-test-cases.yaml"
    tc_cases = read_yaml(tc_cases_path) or []
    for tc in tc_cases:
        if tc.get("story_id") == ticket.story_id and tc.get("level") == "ticket":
            if (tc.get("latest_result", {}) or {}).get("status") == "pending":
                tc["automation"]["command"] = verification.command
                tc["latest_result"] = {
                    "status": "pass" if verification.exit_code == 0 else "fail",
                    "evidence_ref": ticket_path,
                }
    write_yaml(tc_cases_path, tc_cases)

    # Step 8: 更新 Ticket 状态（证据已写入后才能执行）
    ticket.status = "done"
    ticket.completed_at = now()
    write_yaml(ticket_path, ticket)

    # Step 8.5: 回读断言（写后校验，防止 evidence 丢失）
    saved = read_yaml(ticket_path)
    assert saved.verification_evidence is not None, "FATAL: verification_evidence 未写入"
    assert saved.verification_evidence.exit_code == 0, "FATAL: exit_code != 0"

    # ========================================
    # Step 9: 更新 STATE.yaml + Level 3/4 验证
    # ========================================
    # state 已在 Step 7.5 读取，此处重新读取以获取最新状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    update_state(ticket_id, "done")

    # --- Level 3: 增量 Story 验证 ---
    story = read_yaml(f"osg-spec-docs/tasks/stories/{ticket.story_id}.yaml")
    incremental_verify(ticket, story, state)

    # 判断是否所有 Tickets 都完成了
    pending_tickets = [t for t in story.tickets
                       if get_ticket_status(t) != "done"]

    if len(pending_tickets) == 0:
        # --- Level 4: 完整 Story 验收（自动调用 verification skill）---
        print("🎉 所有 Tickets 已完成，自动执行 Story 验收...")
        verify_result = verify_story(ticket.story_id)

        if verify_result["passed"]:
            # W6: 验收通过 — 通过 transition() 推进
            transition("/next", state, "story_verified")
            print("✅ Story 验收通过")
            print("⏭️ 下一步:")
            print("  - /cc-review — CC 交叉验证（二次校验）")
            print("  - /approve — 跳过 CC，直接审批")
        else:
            # W7: 验收失败 — 通过 transition() 推进
            transition("/next", state, "verification_failed", meta={"result": "failure"})
            print(f"❌ Story 验收失败: {verify_result['reason']}")
            print("请修复问题后执行 /verify 重新验收")
    else:
        # W5: 中间 Ticket — 通过 transition() 推进
        transition("/next", state, "implementing")
        print(f"⏭️ 还有 {len(pending_tickets)} 个 Ticket 待完成")

    return {
        "status": "done",
        "ticket_id": ticket_id,
        "files_changed": get_changed_files(),
        "verification_evidence": ticket.verification_evidence
    }


def run_verification(ticket, config):
    """根据 Ticket 类型执行验证命令"""

    if ticket.type in ("backend", "database", "test"):
        # 后端/数据库/测试：运行测试或编译
        if ticket.type == "database":
            cmd = "mvn test -Dtest='*Mapper*,*Repository*'"
        else:
            cmd = config.commands.test  # 优先使用指定测试类: mvn test -Dtest={TestClass}

    elif ticket.type in ("frontend", "frontend-ui"):
        # 前端：test + build（从 ticket.allowed_paths 推导 pkg_dir）
        pkg_dir = resolve_frontend_pkg_dir(ticket)  # e.g. "osg-frontend/packages/admin"
        cmd = f"pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build"

    elif ticket.type == "config":
        # 配置：语法检查
        cmd = "echo 'config validation'"  # 项目自定义

    # 执行命令并返回结果
    result = bash(cmd)
    return {
        "command": cmd,
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr
    }


def run_regression_test(ticket, config):
    """Level 2: 回归验证 — 每个 Ticket 完成后跑全量测试，早发现回归"""

    print("🔄 Level 2 回归验证: 全量测试...")
    failures = []

    # 后端全量测试
    if ticket.type in ("backend", "database", "test"):
        backend_test = bash(config.commands.test)  # mvn test
        if backend_test.exit_code != 0:
            failures.append(f"后端全量测试失败: {extract_failure_summary(backend_test)}")

    # 前端全量测试（如果当前 Ticket 是前端类型）
    if ticket.type in ("frontend", "frontend-ui"):
        pkg_dir = resolve_frontend_pkg_dir(ticket)  # e.g. "osg-frontend/packages/admin"
        frontend_test = bash(f"pnpm --dir {pkg_dir} test")  # vitest run
        if frontend_test.exit_code != 0:
            failures.append(f"前端全量测试失败: {extract_failure_summary(frontend_test)}")

    if failures:
        print(f"  Level 2: ❌ 回归检测到 {len(failures)} 个问题")
        for f in failures:
            print(f"    - {f}")
        return {"passed": False, "failures": failures}

    print("  Level 2 回归验证: ✅ 全量测试通过")
    return {"passed": True}


def incremental_verify(ticket, story, state):
    """Level 3: 增量 Story 验证 — AC 进度跟踪 + 偏差检测"""

    print("🔄 Level 3 增量 Story 验证...")

    done_tickets = []
    for tid in story.tickets:
        t = read_yaml(f"osg-spec-docs/tasks/tickets/{tid}.yaml")
        if t.status == "done":
            done_tickets.append(t)

    # AC 进度跟踪
    covered_acs = []
    uncovered_acs = []
    for ac in story.acceptance_criteria:
        if any(ticket_covers_criteria(t, ac) for t in done_tickets):
            covered_acs.append(ac)
        else:
            uncovered_acs.append(ac)

    total = len(story.acceptance_criteria)
    progress = len(covered_acs) / total * 100 if total > 0 else 0
    print(f"  Story AC 进度: {len(covered_acs)}/{total} = {progress:.0f}%")

    if uncovered_acs:
        print(f"  待覆盖 AC ({len(uncovered_acs)}):")
        for ac in uncovered_acs:
            print(f"    - {ac}")

    # 偏差检测：当前 Ticket 是否覆盖了至少 1 个 Story AC？
    current_covers = [ac for ac in story.acceptance_criteria
                      if ticket_covers_criteria(ticket, ac)]
    if not current_covers:
        print(f"  ⚠️ 偏差警告: {ticket.id} 未覆盖任何 Story AC，请检查是否偏离需求")
    else:
        print(f"  当前 Ticket 覆盖 AC: {len(current_covers)} 个")

    print(f"  Level 3 增量验证: ✅ 完成")
```

## 输出格式

```markdown
## ✅ Ticket 完成

**Ticket**: {ticket_id}
**耗时**: {duration}

### 变更文件
- `path/to/file1.java` (+15, -3)
- `path/to/file2.vue` (+42, -0)

### Level 1: 单元验证
- 测试结果: ✅ 全部通过 (新增 3, 通过 3)
- 覆盖率: ✅ 分支 100%, 行 92%

### Level 2: 回归验证
- 全量测试: ✅ 通过 (mvn test → exit_code=0)

### Level 3: 增量 Story 验证
- Story AC 进度: 3/8 = 37%
- 当前 Ticket 覆盖 AC: 1 个
- 偏差检测: ✅ 无偏差

### 自我审查
- 完整性: ✅
- 质量: ✅
- 测试: ✅

### ⏭️ 下一步
{还有未完成 Tickets}
继续执行 /next

{所有 Tickets 完成 → 自动执行 Story 验收}
✅ Story 验收通过:
  - /cc-review — CC 交叉验证（二次校验）
  - /approve — 跳过 CC，直接审批
❌ Story 验收失败 → 修复后执行 /verify 重新验收
```

## 失败退出规则

```
⚠️ 前置检查失败：Ticket 文件不存在或状态不对：
1. 输出错误信息（提示 Ticket 路径或状态问题）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止 — 上游有问题不往下跑

⚠️ 增强终审失败：当增强全局终审经过 max_review_retries+1（默认 10）轮后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence
4. 停止自动继续 — 提示用户人工介入
5. 用户可以修复后重新执行 /next

⚠️ Level 1 验证失败：验证命令 exit_code != 0：
1. 输出错误信息（验证命令 + stderr）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence
4. 停止 — 提示修复后重新执行 /next

⚠️ Level 2 回归失败：全量测试发现回归：
1. 输出回归报告（列出失败的测试用例）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence — 禁止写入不完整的证据
4. 停止 — 当前 Ticket 引入了回归，需修复

⚠️ Level 4 Story 验收失败：所有 Tickets 完成但 Story 验收未通过：
1. 输出验收失败报告
2. 通过 transition() 推进到 verification_failed
3. 停止自动继续 — 暂停等用户修复后执行 /verify
```

## 迭代计数强制规则

每轮增强终审和验证步骤必须输出进度，格式如下：

```
=== 增强全局终审 ===
🔍 终审轮次 1/10 (维度 E — 异常路径)
  三维度终审:
    上游一致性: ✅ Ticket AC 全满足
    下游可行性: ✅ 全量测试通过
    全局完整性: ❌ 修改了 allowed_paths 之外的文件
  多维度校验 (E): ✅ 无问题

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🔍 终审轮次 3/10 (维度 I — 命名一致性)
  三维度终审: ✅ 3/3
  多维度校验 (I): ✅ 无问题

🎉 连续 2 轮无修改，终审通过

=== Level 1 单元验证 ===
🔄 验证命令: mvn test -Dtest=SysLoginControllerTest
  exit_code: 0
  结果: Tests run: 5, Failures: 0

=== Level 2 回归验证 ===
🔄 全量测试: mvn test
  exit_code: 0
  结果: ✅ 全量测试通过

=== Level 3 增量 Story 验证 ===
  Story AC 进度: 3/8 = 37%
  当前 Ticket 覆盖 AC: 1 个
  偏差检测: ✅ 无偏差
```

## 硬约束

- 禁止修改 `allowed_paths` 之外的文件
- 禁止跳过测试（backend / database / test 类型）
- 禁止在测试失败时标记完成
- 禁止在 lint / build 失败时标记完成（所有类型）
- 必须创建 Checkpoint
- **证据先于断言**：完成声明必须附带命令输出证明（测试结果、lint 输出、build 输出等）
- UI 还原类 Ticket 必须引用 `prototype_ref` 中指定的原型文件作为视觉依据

---

## � 验证命令速查表

在写入 `verification_evidence.command` 之前，**必须参考此表选择正确的验证命令**：

| Ticket Type | 必须运行的验证命令 | 禁止替代 |
|---|---|---|
| `backend` | `mvn compile -pl {module} -am` 或 `mvn test -Dtest={TestClass}` | "code review" |
| `database` | `mvn compile -pl ruoyi-common -am`（至少编译通过） | "code review" |
| `test` | `mvn test -pl {module} -am`（**必须是 test，不是 compile**） | "mvn compile" |
| `frontend-ui` | `pnpm --dir {pkg_dir} build` | "UI review" |
| `frontend` | `pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build` | "code review" |
| `config` | 具体语法检查命令（如 `yamllint`、`jsonlint`） | "code review" |

> ⚠️ **注意**：使用前先检查目标项目的 `package.json` scripts，确认命令存在。例如若无 `lint` 脚本，则不可使用 `pnpm lint`。

## 🛡️ validate_evidence_command()

```python
def validate_evidence_command(command: str) -> bool:
    """验证 verification_evidence.command 是否为可执行的 shell 命令。
    在 Step 7 写入证据前调用，不通过则拒绝写入。"""

    FORBIDDEN_PREFIXES = ["code review", "ui review", "manual", "visual", "review"]
    REQUIRED_PREFIXES = ["mvn", "pnpm", "npm", "npx", "bash", "sh", "java", "node", "python"]

    cmd_lower = command.strip().lower()

    # 禁止非自动化命令
    for prefix in FORBIDDEN_PREFIXES:
        if cmd_lower.startswith(prefix):
            return False

    # 必须以可执行工具开头
    return any(cmd_lower.startswith(p) for p in REQUIRED_PREFIXES)
```

---

## �� 强制验证步骤（不可跳过）

**在将 Ticket 状态更新为 `done` 之前，必须执行以下步骤：**

### Step 1: 根据 Ticket.type 执行验证命令

| type | 验证命令 | 成功条件 |
|------|----------|----------|
| backend | `${config.commands.test}` 或 `mvn test -Dtest={TestClass}` | exit_code = 0 |
| database | `mvn compile -pl ruoyi-admin -am` (至少编译通过) | exit_code = 0 |
| test | `${config.commands.test}` 或指定测试类 | exit_code = 0 且测试通过 |
| frontend | `pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build` | 两个命令 exit_code = 0 |
| frontend-ui | `pnpm --dir {pkg_dir} build` | exit_code = 0 |
| config | 语法检查或启动验证（视具体配置而定） | exit_code = 0 |

### Step 2: 检查退出码

```
if exit_code != 0:
    输出错误信息
    不更新 Ticket 状态
    停止执行
    提示修复后重试
```

### Step 3: 记录验证证据到 Ticket 文件

**必须**在 Ticket YAML 文件中写入 `verification_evidence` 字段：

```yaml
verification_evidence:
  command: "mvn test -Dtest=SysLoginControllerTest"
  exit_code: 0
  output_summary: "Tests run: 2, Failures: 0, Errors: 0"
  timestamp: "2026-02-12T10:00:00Z"
```

### Step 4: 只有证据写入后，才能更新状态

```python
def complete_ticket(ticket_id):
    # 1. 执行验证命令
    result = run_verification_command(ticket.type)

    # 2. 检查结果
    if result.exit_code != 0:
        print(f"❌ 验证失败: {result.stderr}")
        return False  # 不更新状态

    # 3. 写入证据
    ticket.verification_evidence = {
        "command": result.command,
        "exit_code": result.exit_code,
        "output_summary": extract_summary(result.stdout),
        "timestamp": now()
    }

    # 4. 更新状态
    ticket.status = "done"
    ticket.completed_at = now()
    write_yaml(ticket_path, ticket)

    return True
```

### 红旗 - 立即停止

- ❌ 没有执行任何 Bash 验证命令就更新状态为 done
- ❌ 验证命令失败但仍然标记完成
- ❌ Ticket 文件中没有 `verification_evidence` 字段就声明完成
- ❌ 用"应该没问题"、"编译过了"等借口跳过验证

### 验证失败的处理流程

```
验证失败
    │
    ▼
[分析错误] ─→ 读取错误输出
    │
    ▼
[修复代码] ─→ 根据错误修改
    │
    ▼
[重新验证] ─→ 再次执行验证命令
    │
    ├── 失败 ──→ 重复（最多 3 次）
    │
    ▼ 通过
[记录证据] ─→ 写入 verification_evidence
    │
    ▼
[更新状态] ─→ status = done
```

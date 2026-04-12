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

**🚨 开发前硬门槛**：Ticket 进入实现前，必须已经是可执行契约，而不是自然语言任务摘要。至少要具备：
- `covers_ac_refs`
- `contract_refs`
- `test_cases`
- `test_cases[*].ac_ref`
- `test_cases[*].category`
- `test_cases[*].scenario_obligation`
- `test_cases[*].operation`

任一缺失都必须停止，先回到 split-ticket / reconcile 补齐契约，再进入 `/next`。

**🧭 前端实现前置能力**：当 `config.frontend_preflight.enabled = true` 时，`frontend` / `frontend-ui` Ticket 在进入既有实现流前，还要先消费一次 frontend preflight：
- `mode = auto` → 自动调用 `frontend-delivery-preflight`，再继续既有流程
- `mode = manual` → 停止并提示先执行 frontend preflight，不新增 workflow state
- `apply_to.frontend-ui = false` 时，UI 还原票保持现状

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
5. 🚨 进入实现前必须先通过 executable-ticket preflight：`covers_ac_refs + contract_refs + test_cases` 及 `test_cases[*].ac_ref/category/scenario_obligation/operation` 全部齐备
6. 🚨 缺少上述任一字段时，立即停止，不允许先开发后补测试契约

⚠️ TDD 铁律（type: backend / database / test）：
7. 🚨 必须先设计测试用例（调用 test-design Skill）
8. 🚨 测试用例必须覆盖所有 if-else 分支（分支覆盖率 100%）
9. 必须先写测试，再写代码（Red-Green-Refactor）
10. 测试必须通过且覆盖率达标才能完成

⚠️ UI / 前端铁律（type: frontend-ui / frontend）：
11. 当 `config.frontend_preflight.enabled = true` 且命中对应 type 时，必须先经过 frontend preflight（auto 调用 `frontend-delivery-preflight`；manual 停止并提示先执行）
12. frontend-ui / frontend 必须通过 lint/build 对应检查后才能完成
13. frontend-ui / frontend 必须通过 E2E 测试（bash bin/e2e-api-gate.sh {module} full）
14. 含真实副作用 / 关键状态变更的能力必须通过 `delivery_truth_guard.py --stage next`
15. 含 critical_surfaces 的页面必须通过 `ui_critical_evidence_guard.py --stage next`

⚠️ 配置铁律（type: config）：
16. 修改后必须验证配置正确性（语法检查、启动验证等）
```

## 执行流程

根据 Ticket 的 `type` 字段选择不同流程。

### 所有流程共享的 executable-ticket preflight

在真正进入实现前，必须先读取 Ticket 并校验：
- `covers_ac_refs` 非空
- `contract_refs` 字段存在
- `test_cases` 非空
- 每条 `test_case` 都具备 `ac_ref/category/scenario_obligation/operation`
- `covers_ac_refs` 中的每一项都至少被 1 条 `test_case` 承接

任一条件不满足都必须立即停止，返回“先补齐 Ticket 契约，再执行 `/next`”，禁止带着自然语言 Ticket 进入开发。

### 所有前端流程共享的 frontend preflight policy

对 `frontend` / `frontend-ui` Ticket，还必须读取 `config.frontend_preflight`：
- `enabled = false` → 保持既有实现流，不新增前置动作
- `enabled = true` 且命中当前 type → 进入 frontend preflight
- `mode = auto` → 先调用 `frontend-delivery-preflight`，再继续既有实现流
- `mode = manual` → 停止并输出“当前 Ticket 需要先执行 frontend preflight，再继续 /next”
- `apply_to.frontend-ui = false` → UI 还原票不启用该前置步骤

frontend preflight 只是实现前置整理，不写状态、不替代验证、不新增 workflow node。

### execution plane / scheduler 约束

`deliver-ticket` 仍然是**单 Ticket 执行器**，不是全局调度器：
- runnable set 计算、并行 slot、lease、workspace/worktree 分配属于 scheduler / execution backend
- `deliver-ticket` 只消费已被选中的单个 Ticket
- 允许读取和回填 `STATE.execution.*` 投影（如 lease / workspace 绑定），但**禁止**直接推进 `workflow.current_step`
- workflow 仍只能通过 `transition()` 推进

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
[读取 Ticket] ─→ 获取 ticket_id, allowed_paths, ui_rule_classes, prototype_refs, visual_checklist, style_contracts, state_cases, acceptance_criteria
  │
  ├── 若 config.frontend_preflight.enabled = true 且 apply_to.frontend-ui = true
  │      ├── mode = auto   → 调用 frontend-delivery-preflight
  │      └── mode = manual → 停止，提示先执行 frontend preflight
  ▼
[创建 Checkpoint] ─→ 保存当前状态
  │
  ▼
[读取原型] ─→ 读取 prototype_refs 指定的 HTML 文件，提取目标区域结构和样式
  │
  ▼
[视觉对齐] ─→ 逐项核对 ui_rule_classes / visual_checklist / style_contracts / state_cases，禁止“相似替代”图标或间距
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
[E2E 验证] ─→ bash bin/e2e-api-gate.sh {module} full
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

```
开始
  │
  ▼
[读取 Ticket] ─→ 获取 ticket_id, allowed_paths, acceptance_criteria
  │
  ├── 若 config.frontend_preflight.enabled = true 且 apply_to.frontend = true
  │      ├── mode = auto   → 调用 frontend-delivery-preflight
  │      └── mode = manual → 停止，提示先执行 frontend preflight
  ▼
[创建 Checkpoint] ─→ 保存当前状态
  │
  ▼
[实现代码] ─→ 编写前端功能代码
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
[单元测试] ─→ pnpm --dir {pkg_dir} test（建议覆盖关键逻辑）
  │
  ▼
[E2E 验证] ─→ bash bin/e2e-api-gate.sh {module} full
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[前端功能审查清单]
  │
  ├── 有问题 ──→ 修复
  │
  ▼ 全部通过
[更新状态] ─→ ticket.status = done
  │
  ▼
[输出结果]
```

> ❗ **注意**：流程 C 完成后，仍需经过增强终审（Step 4.5）+ Level 1/2 验证（Step 5~6）+ 写入 evidence（Step 7）+ 更新状态（Step 8），与流程 A 的 Step 4~8 相同。

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

### 前端功能审查（type: frontend）

#### API 字段完整性
- [ ] PUT/POST API 的 TypeScript 参数包含后端所有 `@NotBlank/@NotNull` 必填字段？
- [ ] 编辑表单的 `formState` 初始化时包含所有必填字段？
- [ ] 保存前拼装的请求体没有遗漏字段？

#### UI 一致性
- [ ] 状态文字引用全局常量（如 STATUS_TEXT），未硬编码中英文？
- [ ] 颜色使用标准配置（如 permissionColors），未硬编码色值？
- [ ] 列表页展示字段与 Story AC 中的"必显字段"一致？

#### 错误处理
- [ ] API 调用（PUT/POST/DELETE）传入了 `customErrorMessage` 参数？
- [ ] 组件内未直接调用 `message.error()`（错误提示统一由拦截器处理）？
- [ ] 网络异常和业务异常有区分处理？

#### E2E 验证
- [ ] `bash bin/e2e-api-gate.sh {module} full` 通过？
- [ ] 列表页关键列（角色、权限、状态等）非空？
- [ ] 编辑弹窗打开后已有数据正确预填？
- [ ] 保存操作成功且列表刷新后数据已更新？

## 执行伪代码

```python
def deliver_ticket(ticket_id):
    config = load_yaml(".claude/project/config.yaml")
    ticket_path = f"{config.paths.tasks.tickets}{ticket_id}.yaml"
    state_store = resolve_state_store(config)
    execution_backend = resolve_execution_backend(config)

    # Step 0: 前置检查
    if not ticket_id:
        return failed("当前 Story 无 runnable Ticket，请执行 /verify、/approve 或等待依赖/lease/冲突解除")

    if not exists(ticket_path):
        return failed(f"Ticket 文件不存在: {ticket_path}")

    # Step 1: 读取 Ticket
    ticket = read_yaml(ticket_path)

    if ticket.status not in ["pending", "in_progress"]:
        return failed(f"Ticket {ticket_id} 状态为 {ticket.status}，需要 pending 或 in_progress")

    covers_ac_refs = ticket.get("covers_ac_refs") or []
    contract_refs = ticket.get("contract_refs")
    test_cases = ticket.get("test_cases") or []

    if not covers_ac_refs:
        return failed(f"Ticket {ticket_id} 缺少 covers_ac_refs，先补齐 split-ticket 契约再执行 /next")

    if not contract_refs:
        return failed(f"Ticket {ticket_id} 缺少 contract_refs，先补齐 split-ticket 契约再执行 /next")

    if not test_cases:
        return failed(f"Ticket {ticket_id} 缺少 test_cases，禁止以自然语言 Ticket 进入开发")

    covered_case_refs = set()
    for case in test_cases:
        case_id = case.get("test_case_id") or "<unknown>"
        ac_ref = case.get("ac_ref")
        category = case.get("category")
        obligation = case.get("scenario_obligation")
        operation = case.get("operation")

        if not ac_ref:
            return failed(f"Ticket {ticket_id} 的 test_case {case_id} 缺少 ac_ref")
        covered_case_refs.add(ac_ref)

        if not category:
            return failed(f"Ticket {ticket_id} 的 test_case {case_id} 缺少 category")
        if not obligation:
            return failed(f"Ticket {ticket_id} 的 test_case {case_id} 缺少 scenario_obligation")
        if not operation:
            return failed(f"Ticket {ticket_id} 的 test_case {case_id} 缺少 operation")

    missing_case_refs = [ref for ref in covers_ac_refs if ref not in covered_case_refs]
    if missing_case_refs:
        return failed(
            f"Ticket {ticket_id} 的 covers_ac_refs 未被 test_cases 完整承接: {missing_case_refs}"
        )

    frontend_preflight = config.get("frontend_preflight") or {}
    apply_to = frontend_preflight.get("apply_to") or {}
    frontend_preflight_enabled = bool(frontend_preflight.get("enabled"))
    frontend_preflight_targeted = (
        (ticket.type == "frontend" and apply_to.get("frontend", False))
        or (ticket.type == "frontend-ui" and apply_to.get("frontend-ui", False))
    )
    if frontend_preflight_enabled and frontend_preflight_targeted:
        mode = frontend_preflight.get("mode", "manual")
        preflight_skill = frontend_preflight.get("skill", "frontend-delivery-preflight")
        if mode == "manual":
            return failed(
                f"Ticket {ticket_id} 需要先执行 frontend preflight（{preflight_skill}），再继续 /next"
            )
        if mode == "auto":
            run_skill(preflight_skill, ticket_id=ticket_id)

    state = state_store.read_state("osg-spec-docs/tasks/STATE.yaml")
    module = state.current_requirement
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

    # Step 2.5: execution plane 绑定（默认 inline，可切换 git_worktree）
    state = state_store.read_state("osg-spec-docs/tasks/STATE.yaml")
    if not state.get("execution"):
        state.execution = default_execution_projection(config)
    bind_ticket_execution(state.execution, ticket_id, execution_backend, ticket)
    state_store.write_state("osg-spec-docs/tasks/STATE.yaml", state)

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
    state = state_store.read_state("osg-spec-docs/tasks/STATE.yaml")
    update_state(ticket_id, "done")

    # --- Level 3: 增量 Story 验证 ---
    story = read_yaml(f"osg-spec-docs/tasks/stories/{ticket.story_id}.yaml")
    incremental_verify(ticket, story, state)

    pending_tickets = get_story_runnable_summary(story, state)

    if pending_tickets["remaining_count"] == 0:
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
        print(f"⏭️ 还有 {pending_tickets['remaining_count']} 个 Ticket 待完成")

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
        # 前端：test + build + E2E（从 ticket.allowed_paths 推导 pkg_dir）
        pkg_dir = resolve_frontend_pkg_dir(ticket)  # e.g. "osg-frontend/packages/admin"
        module = resolve_module_name(ticket)  # e.g. "permission"
        if ticket.type == "frontend":
            cmd = f"pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full"
        else:  # frontend-ui
            cmd = f"pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full"

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

def get_story_runnable_summary(story, state):
    done = []
    remaining = []
    for tid in story.tickets:
        if get_ticket_status(tid) == "done":
            done.append(tid)
        else:
            remaining.append(tid)

    return {
        "done_ticket_ids": done,
        "remaining_ticket_ids": remaining,
        "remaining_count": len(remaining),
    }


def bind_ticket_execution(execution, ticket_id, execution_backend, ticket):
    execution.setdefault("active_tickets", [])
    execution.setdefault("ticket_leases", [])
    execution.setdefault("workspaces", [])

    if ticket_id not in execution["active_tickets"]:
        execution["active_tickets"].append(ticket_id)

    lease = {
        "ticket_id": ticket_id,
        "backend": execution_backend.name,
        "workspace": execution_backend.allocate_workspace(ticket_id, ticket),
        "status": "active",
    }
    execution["ticket_leases"] = [l for l in execution["ticket_leases"] if l.get("ticket_id") != ticket_id]
    execution["ticket_leases"].append(lease)

    execution["workspaces"] = [w for w in execution["workspaces"] if w.get("ticket_id") != ticket_id]
    execution["workspaces"].append({
        "ticket_id": ticket_id,
        "backend": execution_backend.name,
        "path": lease["workspace"],
    })


def resolve_state_store(config):
    return YamlStateStore() if (config.get("workflow_backend") or {}).get("type", "yaml") == "yaml" else GitStateStore()


def resolve_execution_backend(config):
    backend_type = (config.get("execution_backend") or {}).get("type", "inline")
    return InlineWorkspaceBackend() if backend_type == "inline" else GitWorktreeBackend()


def default_execution_projection(config):
    parallel = config.get("parallel_execution") or {}
    return {
        "backend": {
            "workflow_backend": (config.get("workflow_backend") or {}).get("type", "yaml"),
            "execution_backend": (config.get("execution_backend") or {}).get("type", "inline"),
        },
        "active_stories": [],
        "active_tickets": [],
        "story_leases": [],
        "ticket_leases": [],
        "workspaces": [],
        "scheduler": {
            "parallel_enabled": bool(parallel.get("enabled", False)),
            "max_stories": parallel.get("max_stories", 1),
            "max_tickets_per_story": parallel.get("max_tickets_per_story", 1),
            "last_tick_at": None,
            "last_selected_story": None,
            "last_runnable_tickets": [],
        },
    }
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
- UI 还原类 Ticket 必须引用 `prototype_refs` 中指定的原型片段作为视觉依据
- UI 还原类 Ticket 必须逐项消费 `ui_rule_classes / visual_checklist / style_contracts`，critical surface 还必须覆盖 `state_cases`

---

## � 验证命令速查表

在写入 `verification_evidence.command` 之前，**必须参考此表选择正确的验证命令**：

| Ticket Type | 必须运行的验证命令 | 禁止替代 |
|---|---|---|
| `backend` | `mvn compile -pl {module} -am` 或 `mvn test -Dtest={TestClass}` | "code review" |
| `database` | `mvn compile -pl ruoyi-common -am`（至少编译通过） | "code review" |
| `test` | `mvn test -pl {module} -am`（**必须是 test，不是 compile**） | "mvn compile" |
| `frontend-ui` | `pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full` | "UI review" |
| `frontend` | `pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full` | "code review" |
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
| frontend | `pnpm --dir {pkg_dir} test && pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full` | 三个命令 exit_code = 0 |
| frontend-ui | `pnpm --dir {pkg_dir} build && bash bin/e2e-api-gate.sh {module} full` | 两个命令 exit_code = 0 |
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

```

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

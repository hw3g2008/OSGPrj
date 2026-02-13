# Deliver-Ticket Skill

---
name: deliver-ticket
description: "Use when executing /next command and a Ticket is assigned - implements the Ticket following the appropriate workflow (TDD / UI restoration / frontend / test / config) with mandatory test design, execution, and verification"
invoked_by: agent
auto_execute: true
---

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

⚠️ 配置铁律（type: config）：
11. 修改后必须验证配置正确性（语法检查、启动验证等）
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
[TDD: RED] ─→ 根据测试用例矩阵编写失败测试
  │
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
[自我审查清单]
  │
  ├── 有问题 ──→ 修复
  │
  ▼ 全部通过
[记录验证证据] ─→ 写入 verification_evidence
  │
  ▼
[更新状态] ─→ ticket.status = completed
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
[更新状态] ─→ ticket.status = completed
  │
  ▼
[输出结果]
```

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
[更新状态] ─→ ticket.status = completed
  │
  ▼
[输出结果]
```

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

    # Step 1: 读取 Ticket
    ticket = read_yaml(ticket_path)

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

    # Step 4: 自我审查（根据 type 选择对应清单）
    review_result = self_review(ticket, result.code)
    if not review_result.passed:
        fix_review_issues(review_result.issues)

    # ========================================
    # Step 5: 强制验证（不可跳过）
    # ========================================
    verification = run_verification(ticket, config)

    if verification.exit_code != 0:
        # 验证失败，不更新状态
        return {
            "status": "verification_failed",
            "error": verification.stderr,
            "hint": "修复问题后重新执行 /next"
        }

    # Step 6: 写入验证证据（必须在更新状态之前）
    ticket.verification_evidence = {
        "command": verification.command,
        "exit_code": verification.exit_code,
        "output_summary": extract_summary(verification.stdout),
        "timestamp": now()
    }

    # Step 7: 更新状态（证据已写入后才能执行）
    ticket.status = "done"
    ticket.completed_at = now()
    write_yaml(ticket_path, ticket)

    # Step 8: 更新 STATE.yaml 和 workflow
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    update_state(ticket_id, "completed")

    # 判断是否所有 Tickets 都完成了
    pending_tickets = [t for t in state.tickets if get_ticket_status(t) == "pending"]
    if len(pending_tickets) == 0:
        state.workflow.current_step = "all_tickets_done"
        state.workflow.next_step = "verify"
    else:
        state.workflow.current_step = "ticket_done"
        state.workflow.next_step = "next"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return {
        "status": "completed",
        "ticket_id": ticket_id,
        "files_changed": get_changed_files(),
        "verification_evidence": ticket.verification_evidence
    }


def run_verification(ticket, config):
    """根据 Ticket 类型执行验证命令"""

    if ticket.type in ("backend", "database", "test"):
        # 后端/数据库/测试：运行测试或编译
        if ticket.type == "database":
            cmd = "mvn compile -pl ruoyi-admin -am -q"
        else:
            cmd = config.commands.test  # 或指定测试类

    elif ticket.type in ("frontend", "frontend-ui"):
        # 前端：lint + build
        cmd = f"{config.commands.frontend.lint} && {config.commands.frontend.build}"

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
```

## 输出格式

```markdown
## ✅ Ticket 完成

**Ticket**: {ticket_id}
**耗时**: {duration}

### 变更文件
- `path/to/file1.java` (+15, -3)
- `path/to/file2.vue` (+42, -0)

### 测试结果
- 新增测试: 3
- 测试通过: ✅ 全部

### 自我审查
- 完整性: ✅
- 质量: ✅
- 测试: ✅

### ⏭️ 下一步
{如果 approval.ticket_done == "auto"}
自动执行下一个 Ticket...

{如果需要审批}
等待审批: /approve {ticket_id}
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

## 🚨 强制验证步骤（不可跳过）

**在将 Ticket 状态更新为 `done/completed` 之前，必须执行以下步骤：**

### Step 1: 根据 Ticket.type 执行验证命令

| type | 验证命令 | 成功条件 |
|------|----------|----------|
| backend | `${config.commands.test}` 或 `mvn test -Dtest={TestClass}` | exit_code = 0 |
| database | `mvn compile -pl ruoyi-admin -am` (至少编译通过) | exit_code = 0 |
| test | `${config.commands.test}` 或指定测试类 | exit_code = 0 且测试通过 |
| frontend | `${config.commands.frontend.lint} && ${config.commands.frontend.build}` | 两个命令 exit_code = 0 |
| frontend-ui | `${config.commands.frontend.lint} && ${config.commands.frontend.build}` | 两个命令 exit_code = 0 |
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

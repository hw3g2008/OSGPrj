# Deliver-Ticket Skill

---
name: deliver-ticket
description: "Use when executing /next command and a Ticket is assigned - implements the Ticket following the appropriate workflow (TDD / UI restoration / frontend) and verification"
invoked_by: agent
auto_execute: true
---

## 概览

执行单个 Ticket 的实现。根据 Ticket 的 `type` 字段选择对应流程：TDD（backend/database）、UI 还原（frontend-ui）或前端功能（frontend），包含验证和自我审查。

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

⚠️ TDD 铁律（type: backend / database）：
4. 必须先写测试，再写代码
5. 测试必须通过才能完成

⚠️ UI / 前端铁律（type: frontend-ui / frontend）：
6. lint + build 必须通过才能完成
```

## 执行流程

根据 Ticket 的 `type` 字段选择不同流程：

### 流程 A：TDD 流程（type: backend / database）

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
[TDD: RED] ─→ 写失败测试
  │
  ▼
[TDD: GREEN] ─→ 写代码让测试通过
  │
  ▼
[TDD: REFACTOR] ─→ 优化代码（保持测试通过）
  │
  ▼
[运行所有测试]
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

### TDD 审查（type: backend / database）

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
    
    # Step 5: 更新状态
    ticket.status = "completed"
    ticket.completed_at = now()
    write_yaml(ticket_path, ticket)
    
    # Step 6: 更新 STATE.yaml
    update_state(ticket_id, "completed")
    
    return {
        "status": "completed",
        "ticket_id": ticket_id,
        "files_changed": get_changed_files()
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
- 禁止跳过测试（backend / database 类型）
- 禁止在测试失败时标记完成
- 禁止在 lint / build 失败时标记完成（所有类型）
- 必须创建 Checkpoint
- **证据先于断言**：完成声明必须附带命令输出证明（测试结果、lint 输出、build 输出等）
- UI 还原类 Ticket 必须引用 `prototype_ref` 中指定的原型文件作为视觉依据

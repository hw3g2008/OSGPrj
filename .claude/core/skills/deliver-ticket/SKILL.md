# Deliver-Ticket Skill

---
name: deliver-ticket
description: "Use when executing /next command and a Ticket is assigned - implements the Ticket following TDD and verification"
invoked_by: agent
auto_execute: true
---

## 概览

执行单个 Ticket 的实现，遵循 TDD 流程，包含自动测试和自我审查。

## 何时使用

- `/next` 命令分配了一个 Ticket
- Ticket 状态为 `pending` 或 `in_progress`
- 需要实现代码变更

## ⚠️ 执行模式

```
⚠️ 铁律：
1. 只修改 allowed_paths 中的文件
2. 必须先写测试，再写代码
3. 测试必须通过才能完成
4. 完成后必须运行自我审查清单
```

## 执行流程

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

## 自我审查清单

### 完整性检查
- [ ] 所有 acceptance_criteria 都满足？
- [ ] 所有修改都在 allowed_paths 内？
- [ ] 没有遗漏的 TODO/FIXME？

### 质量检查
- [ ] 代码符合项目规范？
- [ ] 没有硬编码值？
- [ ] 错误处理完整？

### 测试检查
- [ ] 测试覆盖所有场景？
- [ ] 测试命名清晰？
- [ ] 没有跳过的测试？

## 执行伪代码

```python
def deliver_ticket(ticket_id):
    # Step 1: 读取 Ticket
    ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
    
    # Step 2: 创建 Checkpoint
    checkpoint_id = create_checkpoint(ticket_id)
    
    # Step 3: TDD 循环
    retries = 0
    max_retries = 3
    
    while retries < max_retries:
        # RED: 写失败测试
        test_code = write_failing_test(ticket.acceptance_criteria)
        
        # GREEN: 写代码
        impl_code = write_implementation(ticket, test_code)
        
        # 运行测试
        test_result = run_tests(config.commands.test)
        
        if test_result.passed:
            break
        else:
            retries += 1
            # 分析失败原因，修复
            fix_issues(test_result.errors)
    
    if retries >= max_retries:
        # 人工介入
        return {
            "status": "needs_review",
            "checkpoint": checkpoint_id,
            "errors": test_result.errors
        }
    
    # Step 4: REFACTOR
    refactored_code = refactor(impl_code)
    
    # Step 5: 自我审查
    review_result = self_review(ticket, refactored_code)
    if not review_result.passed:
        fix_review_issues(review_result.issues)
    
    # Step 6: 更新状态
    ticket.status = "completed"
    ticket.completed_at = now()
    write_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml", ticket)
    
    # Step 7: 更新 STATE.yaml
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
- 禁止跳过测试
- 禁止在测试失败时标记完成
- 必须创建 Checkpoint
- **证据先于断言**：完成声明必须附带命令输出证明（测试结果、编译输出等）

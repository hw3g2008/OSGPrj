# Ralph-Loop Skill

---
name: ralph-loop
description: "Use when executing multiple Tickets autonomously - continuously works until completion or limit reached"
invoked_by: user
auto_execute: true
---

## 概览

自主循环执行多个 Tickets，持续工作直到完成承诺或达到迭代限制。

## 何时使用

- `/next` 命令触发自动执行
- 需要连续完成多个 Tickets
- approval.ticket_done == "auto"

## ⚠️ 执行模式

```
⚠️ 铁律：
1. 只有达到完成承诺或迭代限制才停止
2. 连续失败 3 次触发安全停止
3. 检测到相同错误连续出现时停止
4. 上下文接近满时保存 checkpoint
```

## 执行流程

```
开始
  │
  ▼
[读取 STATE.yaml]
  │
  ▼
[获取下一个 pending Ticket] ◄──────────────┐
  │                                        │
  ├── 无 pending ──→ 完成，输出报告        │
  │                                        │
  ▼ 有 pending                             │
[执行 Ticket] (deliver-ticket)             │
  │                                        │
  ├── 成功 ──→ 更新状态 ──→ 检查上下文 ────┤
  │                                        │
  ├── 失败 ──→ 重试计数 +1                 │
  │           │                            │
  │           ├── < 3 ──→ 修复 ────────────┤
  │           │                            │
  │           └── >= 3 ──→ 停止，人工介入  │
  │                                        │
  └── 相同错误 ──→ 停止，避免无限循环      │
```

## 安全机制

```yaml
safety:
  # 迭代限制
  max_iterations: 20      # 默认最大迭代
  
  # 连续失败保护
  max_consecutive_failures: 3
  
  # 相同错误检测
  same_error_threshold: 2
  
  # 上下文保护
  context_threshold: 0.8  # 上下文使用率阈值
```

## 执行伪代码

```python
def ralph_loop():
    iteration = 0
    consecutive_failures = 0
    last_error = None
    same_error_count = 0
    
    config = read_yaml(".claude/project/config.yaml")
    max_iterations = config.limits.max_iterations or 20
    
    while iteration < max_iterations:
        iteration += 1
        
        # 检查上下文（Claude Code 会自动压缩上下文，此处通过迭代次数间接保护）
        # 每完成 10 个 Ticket 自动保存一次 checkpoint 作为安全网
        if iteration % 10 == 0:
            save_checkpoint()
        
        # 获取下一个 Ticket
        state = read_yaml("osg-spec-docs/tasks/STATE.yaml")

        # 如果 deliver-ticket 已经判断所有 Tickets 完成并更新了 workflow，直接退出
        if state.workflow.current_step == "all_tickets_done":
            return {"status": "all_completed", "iterations": iteration}

        ticket = get_next_pending_ticket(state)

        if not ticket:
            # 兜底：如果 deliver-ticket 未正确更新 workflow，由 ralph-loop 补写
            state.workflow.current_step = "all_tickets_done"
            state.workflow.next_step = "verify"
            write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
            return {"status": "all_completed", "iterations": iteration}
        
        # 执行 Ticket
        result = deliver_ticket(ticket.id)
        
        if result.status == "completed":
            consecutive_failures = 0
            last_error = None
            same_error_count = 0
            
            # 检查是否自动继续
            if config.approval.ticket_done != "auto":
                return {"status": "needs_approval", "ticket": ticket.id}
            
            continue
        
        # 失败处理
        consecutive_failures += 1
        
        if result.error == last_error:
            same_error_count += 1
            if same_error_count >= 2:
                return {
                    "status": "same_error_loop",
                    "error": result.error,
                    "ticket": ticket.id
                }
        else:
            last_error = result.error
            same_error_count = 1
        
        if consecutive_failures >= 3:
            return {
                "status": "max_failures",
                "ticket": ticket.id,
                "errors": result.errors
            }
    
    return {"status": "max_iterations", "iterations": max_iterations}
```

## 输出格式

```markdown
## 🔄 Ralph Loop 执行报告

### 统计
- 总迭代: {iterations}
- 完成 Tickets: {completed_count}
- 失败 Tickets: {failed_count}

### 完成的 Tickets
| ID | 名称 | 耗时 |
|----|------|------|
| T-001 | ... | 2m |
| T-002 | ... | 5m |

### 停止原因
{status_message}

### ⏭️ 下一步
{next_action}
```

## 硬约束

- 禁止超过 max_iterations
- 禁止忽略连续失败
- 禁止忽略相同错误循环
- 必须在上下文满前保存 checkpoint

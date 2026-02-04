# Cursor 平台 - Hooks 实现

## 概览

Cursor IDE 没有原生 Hooks 机制，通过 CLAUDE.md 入口和约定实现。

## SessionStart Hook

### 触发方式

通过 CLAUDE.md 中的「首次响应规则」触发：

```markdown
## ⚠️ 首次响应规则（SessionStart Hook）

每次会话开始时，必须执行以下检查：

1. 读取 osg-spec-docs/tasks/STATE.yaml
2. 读取 .claude/project/config.yaml
3. 输出当前状态摘要
```

### 实现

AI 在每次会话开始时，主动执行检查步骤。

## SessionEnd Hook

### 触发方式

检测以下关键词或情况：

- 用户说 "结束会话"、"bye"、"再见"
- 上下文接近满
- 长时间无操作

### 实现

```python
def check_session_end():
    # 检测结束信号
    if detect_end_signal() or context_nearly_full():
        # 保存 checkpoint
        create_checkpoint(trigger="session_end")
        # 压缩上下文
        compress_context()
        # 输出结束摘要
        output_session_summary()
```

## TicketComplete Hook

### 触发方式

在 deliver-ticket Skill 完成时自动触发。

### 实现

嵌入在 deliver-ticket Skill 中：

```python
def deliver_ticket(ticket_id):
    # ... 执行 Ticket ...
    
    # Ticket 完成后触发 Hook
    if result.status == "completed":
        # 创建 checkpoint
        create_checkpoint(trigger="ticket_complete")
        # 更新状态
        update_state(ticket_id, "completed")
        # 触发代码审查
        trigger_code_review(ticket_id)
```

## ErrorOccur Hook

### 触发方式

在执行过程中检测到错误时触发。

### 实现

```python
def on_error(error):
    # 记录错误
    log_error(error)
    # 检查是否已知错误
    if is_known_error(error):
        apply_known_fix(error)
    else:
        # 触发调试流程
        trigger_debugging(error)
```

## 限制

- 依赖 AI 主动执行
- 无法保证 100% 触发
- 需要在关键 Skill 中嵌入 Hook 调用

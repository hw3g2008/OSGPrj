# Claude CLI 平台 - Hooks 实现

## 概览

Claude CLI 可以使用配置文件定义 Hooks。

## 配置方式

在项目根目录创建 `.claude/hooks.yaml`:

```yaml
# .claude/hooks.yaml

hooks:
  # 会话开始
  on_session_start:
    - action: load_state
      file: tasks/STATE.yaml
    - action: inject_framework
      file: .claude/CLAUDE.md
    - action: output_status
  
  # 会话结束
  on_session_end:
    - action: save_checkpoint
      trigger: session_end
    - action: compress_context
  
  # Ticket 完成
  on_ticket_complete:
    - action: create_checkpoint
      trigger: ticket_complete
    - action: update_state
    - action: trigger_review
  
  # 错误发生
  on_error:
    - action: log_error
    - action: check_known_error
    - action: trigger_debugging
      condition: unknown_error
```

## Hook 执行

```python
def execute_hook(hook_name, context=None):
    """执行指定的 Hook"""
    
    hooks_config = read_yaml(".claude/hooks.yaml")
    
    if hook_name not in hooks_config.hooks:
        return
    
    for action in hooks_config.hooks[hook_name]:
        if "condition" in action:
            if not evaluate_condition(action.condition, context):
                continue
        
        execute_action(action, context)
```

## 内置 Actions

| Action | 说明 |
|--------|------|
| load_state | 加载 STATE.yaml |
| inject_framework | 注入框架上下文 |
| output_status | 输出状态摘要 |
| save_checkpoint | 保存检查点 |
| compress_context | 压缩上下文 |
| create_checkpoint | 创建检查点 |
| update_state | 更新状态 |
| trigger_review | 触发代码审查 |
| log_error | 记录错误 |
| trigger_debugging | 触发调试流程 |

## 自定义 Action

```yaml
hooks:
  on_ticket_complete:
    - action: custom
      command: "npm run post-ticket"
      args:
        ticket_id: "${ticket.id}"
```

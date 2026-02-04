# Claude CLI 平台 - 子代理实现

## 概览

Claude CLI 支持原生子代理机制，使用 Task 工具创建隔离的子代理。

## 实现方式

使用 Claude 的 Task 工具进行真正的子代理调用。

## 调度流程

```python
def dispatch_subagent_claude_cli(agent_name, task_context):
    """
    Claude CLI 平台子代理调度
    使用原生 Task 工具
    """
    
    # 1. 加载 Agent 定义
    agent = load_agent(agent_name)
    
    # 2. 构建任务描述
    task_description = f"""
Agent: {agent.name}
Skills: {', '.join(agent.skills)}

Task:
{task_context}
"""
    
    # 3. 使用 Task 工具创建子代理
    result = claude.task(
        description=task_description,
        allowed_tools=get_agent_tools(agent_name),
        context={
            "agent": agent_name,
            "skills": agent.skills,
            "state": read_state()
        }
    )
    
    return result
```

## 优势

- 真正的进程隔离
- 独立的上下文
- 工具权限控制

## 工具权限

```yaml
# 不同 Agent 的工具权限
agent_tools:
  developer:
    - read_file
    - write_file
    - run_command
    - search_files
  reviewer:
    - read_file
    - search_files
  qa:
    - read_file
    - run_command
```

## 结果处理

子代理返回结果后，Coordinator 处理：

```python
def handle_subagent_result(result):
    if result.status == "success":
        update_state(result.changes)
    elif result.status == "needs_review":
        trigger_review(result)
    else:
        handle_error(result.error)
```

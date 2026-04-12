---
name: subagent-dispatch
description: "Use when needing to call a specific Agent - handles cross-platform subagent dispatch"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Subagent-Dispatch Skill

## 概览

子代理调度，自动检测平台并使用最优的子代理调用方式。

## 平台检测

```python
def detect_platform():
    """检测当前运行平台"""
    
    # 检查环境变量
    if os.getenv("CLAUDE_CLI"):
        return "claude-cli"

    if os.getenv("MCP_SERVER"):
        return "mcp"

    # 默认回退到提示词宿主适配层
    return "prompt-host"
```

## 平台实现

### Prompt Host（Prompt 模拟）

```python
def dispatch_prompt_host(agent_name, task_context):
    """提示词宿主环境使用 Prompt 模拟子代理"""
    
    # 1. 加载 Agent 定义
    agent = load_agent(agent_name)
    
    # 2. 加载 Agent 的 Skills
    skills = []
    for skill_name in agent.skills:
        skill = load_skill(skill_name)
        skills.append(skill)
    
    # 3. 构建 Prompt
    prompt = f"""
    ## 角色切换
    
    你现在是 **{agent.name}**。
    
    ### 职责
    {agent.description}
    
    ### 加载的 Skills
    {format_skills(skills)}
    
    ### 任务
    {task_context}
    
    ### 约束
    - 只使用加载的 Skills
    - 遵循 Skills 中定义的流程
    - 完成后切换回 Coordinator
    """
    
    # 4. 执行（实际是改变当前对话的上下文）
    return {"prompt": prompt, "agent": agent_name}
```

### Claude CLI（原生子代理）

```python
def dispatch_claude_cli(agent_name, task_context):
    """Claude CLI 使用原生子代理机制"""
    
    # 使用 Task 工具创建子代理
    result = claude.task(
        agent=agent_name,
        context=task_context,
        allowed_tools=get_agent_tools(agent_name)
    )
    
    return result
```

### MCP（工具调用）

```python
def dispatch_mcp(agent_name, task_context):
    """MCP 平台使用工具调用"""
    
    # 通过 MCP 协议调用
    result = mcp.call_tool(
        server="agent-server",
        tool=f"run_{agent_name}",
        params={"context": task_context}
    )
    
    return result
```

## 统一接口

```python
def dispatch_agent(agent_name, task_context):
    """统一的子代理调度接口"""
    
    platform = detect_platform()
    
    dispatchers = {
        "prompt-host": dispatch_prompt_host,
        "claude-cli": dispatch_claude_cli,
        "mcp": dispatch_mcp
    }

    dispatcher = dispatchers.get(platform, dispatch_prompt_host)
    
    return dispatcher(agent_name, task_context)
```

## Agent 加载

```python
def load_agent(agent_name):
    """加载 Agent 定义"""
    
    # 先检查项目特定 Agent
    project_path = f".claude/project/agents/{agent_name}.md"
    if file_exists(project_path):
        return parse_agent(read_file(project_path))
    
    # 再检查通用 Agent
    agent_path = f".claude/agents/{agent_name}.md"
    if file_exists(agent_path):
        return parse_agent(read_file(agent_path))
    
    raise AgentNotFoundError(agent_name)
```

## 输出格式

```markdown
## 🔄 Agent 调度

**平台**: Prompt Host
**方式**: Prompt 模拟
**Agent**: Developer

### 切换上下文
{prompt}

### 任务
{task_context}
```

## 硬约束

- 必须先检测平台
- 必须加载完整的 Agent 定义
- 必须加载 Agent 的所有 Skills
- 调度失败时必须有降级方案

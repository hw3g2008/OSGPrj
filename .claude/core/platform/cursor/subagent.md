# Cursor 平台 - 子代理实现

## 概览

Cursor IDE 不支持原生子代理，使用 Prompt 模拟实现。

## 实现方式

通过 Prompt 切换角色来模拟子代理调用。

## 调度流程

```python
def dispatch_subagent_cursor(agent_name, task_context):
    """
    Cursor 平台子代理调度
    通过 Prompt 模拟角色切换
    """
    
    # 1. 加载 Agent 定义
    agent = load_agent(agent_name)
    
    # 2. 加载 Agent 的 Skills
    skills = []
    for skill_name in agent.skills:
        skill = load_skill(skill_name)
        skills.append(skill)
    
    # 3. 构建角色切换 Prompt
    prompt = f"""
## 角色切换

你现在是 **{agent.name}**。

### 职责
{agent.description}

### 加载的 Skills
{format_skills(skills)}

### 当前任务
{task_context}

### 约束
- 只使用加载的 Skills
- 遵循 Skills 中定义的流程
- 完成后输出结果

请开始执行任务。
"""
    
    # 4. 输出 Prompt（实际改变当前对话上下文）
    return prompt
```

## 限制

- 不是真正的进程隔离
- 共享同一个上下文
- 依赖 AI 遵循角色指令

## 回退到 Coordinator

任务完成后，输出：

```markdown
## ✅ 任务完成

角色切换回 **Coordinator**。
```

# MCP 平台 - 子代理实现

## 概览

MCP (Model Context Protocol) 平台通过工具调用实现子代理。

## 实现方式

将每个 Agent 注册为 MCP Tool，通过工具调用执行。

## Agent 注册

```typescript
// MCP Server 配置
const agentTools = {
  run_developer: {
    description: "执行 Developer Agent 任务",
    parameters: {
      ticket_id: { type: "string" },
      context: { type: "object" }
    },
    handler: async (params) => {
      return await executeAgent("developer", params);
    }
  },
  
  run_reviewer: {
    description: "执行 Reviewer Agent 任务",
    parameters: {
      ticket_id: { type: "string" },
      changes: { type: "object" }
    },
    handler: async (params) => {
      return await executeAgent("reviewer", params);
    }
  },
  
  run_qa: {
    description: "执行 QA Agent 任务",
    parameters: {
      story_id: { type: "string" }
    },
    handler: async (params) => {
      return await executeAgent("qa", params);
    }
  }
};
```

## 调度流程

```python
def dispatch_subagent_mcp(agent_name, task_context):
    """
    MCP 平台子代理调度
    通过 MCP 协议调用工具
    """
    
    # 构建工具名称
    tool_name = f"run_{agent_name}"
    
    # 通过 MCP 协议调用
    result = mcp.call_tool(
        server="agent-server",
        tool=tool_name,
        params={
            "context": task_context,
            "state": read_state()
        }
    )
    
    return result
```

## MCP Server 配置

```json
{
  "mcpServers": {
    "agent-server": {
      "command": "node",
      "args": ["./mcp-agent-server.js"],
      "env": {
        "PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

## 优势

- 标准化的协议
- 可跨平台使用
- 支持远程执行

## 限制

- 需要 MCP Server 运行
- 配置相对复杂

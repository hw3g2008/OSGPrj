# MCP 平台 - Hooks 实现

## 概览

MCP 平台通过 MCP Server 的事件机制实现 Hooks。

## 事件注册

```typescript
// MCP Server 事件处理
const hookHandlers = {
  // 会话开始
  onSessionStart: async (session) => {
    // 加载状态
    const state = await loadState();
    
    // 注入框架
    await injectFramework(session);
    
    // 输出状态
    return formatStatus(state);
  },
  
  // 会话结束
  onSessionEnd: async (session) => {
    // 保存检查点
    await saveCheckpoint("session_end");
    
    // 压缩上下文
    await compressContext();
  },
  
  // Ticket 完成
  onTicketComplete: async (ticketId) => {
    // 创建检查点
    await createCheckpoint("ticket_complete");
    
    // 更新状态
    await updateState(ticketId, "completed");
    
    // 触发审查
    return await triggerReview(ticketId);
  },
  
  // 错误发生
  onError: async (error) => {
    // 记录错误
    await logError(error);
    
    // 触发调试
    return await triggerDebugging(error);
  }
};
```

## Hook 触发

```typescript
// MCP Tool 中触发 Hook
const tools = {
  trigger_hook: {
    description: "触发指定的 Hook",
    parameters: {
      hook_name: { type: "string" },
      context: { type: "object" }
    },
    handler: async (params) => {
      const handler = hookHandlers[params.hook_name];
      if (handler) {
        return await handler(params.context);
      }
      throw new Error(`Unknown hook: ${params.hook_name}`);
    }
  }
};
```

## 客户端使用

```python
def trigger_hook_mcp(hook_name, context=None):
    """通过 MCP 触发 Hook"""
    
    result = mcp.call_tool(
        server="agent-server",
        tool="trigger_hook",
        params={
            "hook_name": hook_name,
            "context": context
        }
    )
    
    return result
```

## 自动触发

MCP Server 可以监听特定事件自动触发 Hooks：

```typescript
// 文件变更监听
watcher.on("change", async (file) => {
  if (file.endsWith(".yaml") && file.includes("tickets/")) {
    const ticket = await parseTicket(file);
    if (ticket.status === "completed") {
      await hookHandlers.onTicketComplete(ticket.id);
    }
  }
});
```

## 优势

- 真正的事件驱动
- 可监听文件变更
- 支持异步处理

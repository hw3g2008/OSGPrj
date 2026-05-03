---
name: run-frontend-dev
description: "本地开发态前端启动入口。指定端名，自动清理端口，启动 Vite 开发服务器。支持 admin/assistant/student/mentor/lead-mentor 五个端。"
metadata:
  invoked-by: "command"
---

# Run Frontend Dev

## 唯一入口

```bash
/run-frontend-dev
```

用户可指定端名，默认启动 `assistant`。

## 支持的端

| 端 | 包名 | 端口 |
|---|---|---|
| admin | packages/admin | 3005 |
| assistant | packages/assistant | 3004 |
| student | packages/student | 3001 |
| mentor | packages/mentor | 3002 |
| lead-mentor | packages/lead-mentor | 3003 |

## 执行步骤

### Step 1: 确认目标端

询问用户要启动哪个端（如果未指定，默认 `assistant`）。

### Step 2: 清理端口

启动前必须杀掉目标端口上的所有进程：

```bash
# 检查端口占用
lsof -i :<port>

# 强制关闭
lsof -ti:<port> | xargs kill -9
```

### Step 3: 启动 Vite

```bash
bash bin/run-frontend-dev.sh <app>
```

脚本会自动：
- 从 `vite.config.ts` 读取端口
- 杀掉目标端口上的已有进程
- 启动新的 Vite 服务

### Step 4: 验证 HTTP 响应

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 5 http://localhost:<port>/
```

必须返回 HTTP 200 才算启动成功。

### Step 5: 打开浏览器测试

```bash
# 使用 MCP browser_navigate 导航
browser_navigate to http://localhost:<port>
```

## 常用命令速查

```bash
# 启动 admin
/run-frontend-dev admin

# 启动 assistant
/run-frontend-dev assistant

# 停止 admin 端口
lsof -ti:3005 | xargs kill -9

# 停止 assistant 端口
lsof -ti:3004 | xargs kill -9
```

## 常见问题

- **端口被占用**：脚本会自动杀掉旧进程，无需手动清理
- **端口未释放**：等待 3 秒后重试
- **Vite 未启动**：检查 `osg-frontend/packages/<app>` 目录是否存在
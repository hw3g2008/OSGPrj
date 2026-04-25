---
description: 本地开发态前端启动入口（指定端，自动清理端口）
---

# Run Frontend Dev

## 使用方式

```bash
/run-frontend-dev
```

用户可指定端名，默认启动 assistant。

## 支持的端

| 端 | 包名 | 端口 |
|---|---|---|
| admin | packages/admin | 3005 |
| assistant | packages/assistant | 3004 |
| student | packages/student | 3001 |
| mentor | packages/mentor | 3002 |
| lead-mentor | packages/lead-mentor | 3003 |

## 唯一入口

```bash
bash bin/run-frontend-dev.sh <app>
```

## 规则

- 每次启动前**必须**先杀掉目标端口上的所有进程，再启动新的 Vite 服务
- 脚本会自动从 `vite.config.ts` 读取端口，无需手动指定
- 从正确的 `packages/<app>` 目录启动，确保 Vite 能找到配置

## 执行步骤

### Phase 1: 清理（从零开始）

1. 询问用户要启动哪个端（如果未指定，默认 `assistant`）
2. **关闭 MCP 浏览器**，调用 `browser_close`（无论是否有打开的页面，都必须调用）

### Phase 2: 启动前端

// turbo
3. 执行启动命令（非阻塞，WaitMsBeforeAsync=10000）：
```bash
bash bin/run-frontend-dev.sh <app>
```
脚本会自动杀掉目标端口上的已有进程，然后启动新的 Vite 服务。
4. 检查 command_status，确认输出中包含 `VITE vX.X.X ready`
5. 验证 HTTP 响应（阻塞）：
```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 5 http://localhost:<port>/
```
6. 若非 HTTP 200，**停止**，排查错误

### Phase 3: 打开浏览器并开始测试

7. 调用 `browser_navigate` 导航到 `http://localhost:<port>`
8. 调用 `browser_snapshot` 获取页面快照，确认页面加载成功
9. 如果页面是登录页，提示用户登录后继续
10. 用户确认已登录后，再次 `browser_snapshot` 查看目标页面
11. 调用 `browser_take_screenshot` 全页截图留档
12. 开始 MCP 测试（按用户需求验证具体功能）

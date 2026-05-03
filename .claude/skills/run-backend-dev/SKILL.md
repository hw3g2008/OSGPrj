---
name: run-backend-dev
description: "本地开发态唯一后端启动入口。读取 runtime contract，连接共享测试数据库/Redis，启动本地 Spring Boot 服务。使用前先执行 --check-only 检查端口占用。"
metadata:
  invoked-by: "command"
---

# Run Backend Dev

## 唯一入口

```bash
/run-backend-dev
```

## 关键文件

- 入口脚本：`bash bin/run-backend-dev.sh`
- 环境文件：`deploy/.env.dev`
- 运行时契约：`deploy/runtime-contract.dev.yaml`

## 支持的场景

- E2E 测试前置准备
- 本地功能验证
- 后端代码调试

## 执行步骤

### Step 1: Check Only（检查端口）

```bash
bash bin/run-backend-dev.sh deploy/.env.dev --check-only
```

**端口占用处理**：
- 若报 28080 端口被占用，用 `lsof -ti:28080` 获取 PID
- 执行 `kill <PID>` 关闭旧进程
- 等待 3 秒后重新执行 `--check-only` 确认端口释放

### Step 2: 启动后端

```bash
bash bin/run-backend-dev.sh deploy/.env.dev
```

- 自动从 runtime contract 读取配置
- 连接共享测试数据库（无需本地 Docker MySQL/Redis）
- 构建 workspace reactor artifacts

### Step 3: 验证健康检查

```bash
curl -fsS http://127.0.0.1:28080/actuator/health
```

必须返回 `"status":"UP"` 才算启动成功。

## 健康检查失败处理

- 检查日志：`logs/` 目录
- 常见错误：数据库连接失败、Redis 连接失败
- 若健康检查失败，不允许继续运行依赖后端的 E2E 或 visual 测试

## 停止后端

找到 Java 进程并 kill：

```bash
lsof -ti:28080 | xargs kill -9
```
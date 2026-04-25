---
description: 本地开发态唯一后端启动入口（读取 runtime contract）
---

# Run Backend Dev

## 使用方式

```bash
/run-backend-dev
```

## 唯一入口

```bash
bash bin/run-backend-dev.sh deploy/.env.dev --check-only
bash bin/run-backend-dev.sh deploy/.env.dev
```

## 规则

- 开发态 runtime 真源：`deploy/runtime-contract.dev.yaml`
- 本地只启动 backend
- 本地不启动 Docker MySQL/Redis
- 开发态唯一健康检查：`http://127.0.0.1:28080/actuator/health`
- 任何依赖 backend 的 E2E / visual / final gate 都必须先满足该契约

## 执行步骤

1. 执行 `bash bin/run-backend-dev.sh deploy/.env.dev --check-only`
2. 若 `--check-only` 报端口 28080 已被占用：
   - 用 `lsof -ti:28080` 获取占用进程 PID
   - 执行 `kill <PID>` 强制关闭旧进程
   - 等待 3 秒后重新执行 `--check-only` 确认端口已释放
3. 若通过，再执行 `bash bin/run-backend-dev.sh deploy/.env.dev`
4. 不允许在旧进程仍在运行时直接启动第二个 backend
4. 验证：

```bash
curl -fsS http://127.0.0.1:28080/actuator/health
```

4. 若健康检查失败，不允许继续运行 `/final-closure`、`ui-visual-gate` 或依赖 backend 的 E2E

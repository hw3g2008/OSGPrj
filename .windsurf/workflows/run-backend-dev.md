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
2. 若通过，再执行 `bash bin/run-backend-dev.sh deploy/.env.dev`
3. `--check-only` 必须同时校验目标端口空闲；若端口已被占用，必须先处理占用进程，不能直接重启第二个 backend
4. 验证：

```bash
curl -fsS http://127.0.0.1:28080/actuator/health
```

4. 若健康检查失败，不允许继续运行 `/final-closure`、`ui-visual-gate` 或依赖 backend 的 E2E

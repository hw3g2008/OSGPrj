---
description: 服务器全容器部署（MySQL/Redis/Backend/Frontends 全部在 Docker 内）
---

# Deploy Server Docker

## 使用方式

```bash
/deploy-server-docker [env]
```

示例：`/deploy-server-docker test`

## 强约束

- 禁止外置数据库：MySQL 必须来自 `deploy/compose.base.yml` 的 `mysql` 服务。
- 禁止绕过 preflight：必须先跑 `bin/deploy-preflight.sh`。
- 开发环境本地调试若需要共库，使用 `deploy/.env.dev` + `bin/run-backend-dev.sh`，不要改 test compose 拓扑。

## 执行步骤

1. 准备环境变量文件：
   - `deploy/.env.test` 或 `deploy/.env.prod`
2. 一键部署（内含 preflight + up + 健康检查）：
   - `bash bin/deploy-server-docker.sh {env} --profile core,frontends`
3. 查看运行态：
   - `bash bin/docker-env-status.sh {env} --profile core,frontends`

## 回滚

```bash
bash bin/docker-env-down.sh {env} --profile core,frontends
```

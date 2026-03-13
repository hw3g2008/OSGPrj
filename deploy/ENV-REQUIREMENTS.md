# Docker ENV Requirements

机器真值入口：
- `/.claude/project/config.yaml`

本文件是运行环境说明和操作投影，不是第二规则源。
如与 `config.yaml` 冲突，以 `config.yaml` 为准。

## Dev (`deploy/.env.dev`)

适用场景：后端在本地运行，开发与测试共用同一套测试数据库/Redis 服务。

开发态唯一运行契约真源：
- `deploy/runtime-contract.dev.yaml`

必填键：
- `SPRING_PROFILES_ACTIVE`（建议 `druid`）
- `SPRING_DATASOURCE_DRUID_MASTER_URL`
- `SPRING_DATASOURCE_DRUID_MASTER_USERNAME`
- `SPRING_DATASOURCE_DRUID_MASTER_PASSWORD`
- `SPRING_DATA_REDIS_HOST`
- `SPRING_DATA_REDIS_PORT`
- `SPRING_DATA_REDIS_PASSWORD`
- `TOKEN_SECRET`

建议键：
- `SERVER_PORT`（固定 `28080`，必须与 `deploy/runtime-contract.dev.yaml` 一致）
- `RUOYI_PROFILE`（默认 `./.local/uploadPath`）

启动命令：

```bash
bash bin/context-preflight.sh dev
bash bin/run-backend-dev.sh deploy/.env.dev
# or shortcut
bash bin/run-dev-shared.sh
```

约束：
- 本地只启动 backend，不启动本地 Docker MySQL/Redis
- 依赖 backend 的 E2E / visual gate / final gate 必须复用 `deploy/runtime-contract.dev.yaml`
- `dev` 相关命令执行前必须先通过 `bin/context-preflight.sh dev`

## Test (`deploy/.env.test`)

适用场景：远程服务器只部署 backend/frontends，复用远端开发环境已存在的 mysql/redis 依赖。

必填键：
- `COMPOSE_PROJECT_NAME`
- `TEST_DEPENDENCY_MODE`（固定 `shared`）
- `TZ`
- `SPRING_PROFILES_ACTIVE`（建议 `druid,docker`）
- `MYSQL_DATABASE`
- `MYSQL_APP_USER`
- `MYSQL_APP_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `RUOYI_PROFILE`
- `VITE_API_PROXY_TARGET`（建议 `http://backend:8080`）
- `E2E_API_PROXY_TARGET`（建议 `http://backend:8080`）
- `MYSQL_SHARED_HOST` `MYSQL_SHARED_PORT`
- `REDIS_SHARED_HOST` `REDIS_SHARED_PORT`
- `BACKEND_PORT`
- `STUDENT_PORT` `MENTOR_PORT` `LEAD_MENTOR_PORT` `ASSISTANT_PORT` `ADMIN_PORT`

约束：
- test 环境默认不再拉起 mysql/redis 容器
- backend 通过 `host.docker.internal` 连接远端服务器上已存在的开发态 mysql/redis
- `deploy-preflight.sh test --profile core,frontends` 会要求共享依赖端口处于监听状态，而不是要求这些端口空闲。注意：直接调用 deploy-preflight.sh 前需先执行 `bash bin/prepare-mysql-init.sh` 同步派生产物
- 远端测试相关命令执行前必须先通过：

```bash
bash bin/context-preflight.sh test --remote-host 47.94.213.128
```

## Prod (`deploy/.env.prod`)

必填键：
- `COMPOSE_PROJECT_NAME`
- `TZ`
- `SPRING_PROFILES_ACTIVE`（建议 `druid,docker`）
- `MYSQL_DATABASE`
- `MYSQL_APP_USER`
- `RUOYI_PROFILE`
- `BACKEND_PORT`
- `STUDENT_PORT` `MENTOR_PORT` `LEAD_MENTOR_PORT` `ASSISTANT_PORT` `ADMIN_PORT`

Prod secrets（必须存在且非空）：
- `deploy/secrets/mysql_root_password`
- `deploy/secrets/mysql_app_password`
- `deploy/secrets/redis_password`
- `deploy/secrets/jwt_secret`

约束：
- prod 禁止在 `.env.prod` 中配置明文密码。
- `bin/deploy-preflight.sh prod --profile core,frontends` 会强校验 secrets 非空。直接调用前需先执行 `bash bin/prepare-mysql-init.sh` 同步派生产物。
- 服务器部署默认采用全容器拓扑（mysql/redis/backend/frontends），不使用外置 MySQL。

## Environment Strategy

- dev：应用本地运行，连接测试环境数据库/Redis（共库）。
- test：远程服务器部署 backend/frontends，复用远端开发环境 mysql/redis（共享依赖模式）。
- prod：远程服务器全容器部署（含 mysql/redis + secrets 文件）。

## Remote Deploy Config (Tracked)

项目文件：`deploy/.env.remote.local`（纳入版本控制）

示例模板：
- `deploy/.env.remote.local.example`

用于给 `bin/deploy-test-remote.sh` 提供默认：
- `REMOTE_HOST`
- `REMOTE_USER`
- `REMOTE_DIR`
- 可选 `SSH_KEY` 或 `SSH_PASSWORD`

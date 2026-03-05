# Docker ENV Requirements

## Dev (`deploy/.env.dev`)

适用场景：后端在本地运行，开发与测试共用同一套测试数据库/Redis 服务。

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
- `SERVER_PORT`（默认 `8080`）
- `RUOYI_PROFILE`（默认 `./.local/uploadPath`）

启动命令：

```bash
bash bin/run-backend-dev.sh deploy/.env.dev
# or shortcut
bash bin/run-dev-shared.sh
```

## Test (`deploy/.env.test`)

必填键：
- `COMPOSE_PROJECT_NAME`
- `TZ`
- `SPRING_PROFILES_ACTIVE`（建议 `druid,docker`）
- `MYSQL_DATABASE`
- `MYSQL_APP_USER`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_APP_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `RUOYI_PROFILE`
- `VITE_API_PROXY_TARGET`（建议 `http://backend:8080`）
- `E2E_API_PROXY_TARGET`（建议 `http://backend:8080`）
- `MYSQL_PORT` `REDIS_PORT` `BACKEND_PORT`
- `STUDENT_PORT` `MENTOR_PORT` `LEAD_MENTOR_PORT` `ASSISTANT_PORT` `ADMIN_PORT`

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
- `bin/deploy-preflight.sh prod --profile core,frontends` 会强校验 secrets 非空。
- 服务器部署默认采用全容器拓扑（mysql/redis/backend/frontends），不使用外置 MySQL。

## Environment Strategy

- dev：应用本地运行，连接测试环境数据库/Redis（共库）。
- test：远程服务器全容器部署（含 mysql/redis）。
- prod：远程服务器全容器部署（含 mysql/redis + secrets 文件）。

## Local Remote Deploy Config (Optional)

可选本地文件：`deploy/.env.remote.local`（已在 `.gitignore` 规则内匹配）

示例模板：
- `deploy/.env.remote.local.example`

用于给 `bin/deploy-test-remote.sh` 提供默认 `REMOTE_HOST/REMOTE_USER/REMOTE_DIR`，避免把服务器信息硬编码进脚本。

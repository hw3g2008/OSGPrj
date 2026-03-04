# Docker ENV Requirements

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

# Server Deploy Checklist (Shared-Deps Test / All-In-Docker Prod)

## 0. 环境策略

- 开发环境（dev）：后端本地运行，连接测试环境 mysql/redis（共库）。
- 测试环境（test）：远程服务器部署 backend/frontends，复用远端开发环境 mysql/redis。
- 生产环境（prod）：远程服务器全容器部署 + secrets 文件。

开发态唯一运行契约：
- `deploy/runtime-contract.dev.yaml`
- 本地 backend 固定：`http://127.0.0.1:28080`
- 本地不启 Docker MySQL/Redis

### 快捷命令（可直接跑）

```bash
# 本地开发后端（共用测试库）
bash bin/run-dev-shared.sh

# 一键远程测试部署（REMOTE_HOST 从 deploy/.env.remote.local 或 --host 传入）
bash bin/deploy-test-remote.sh
```

说明：`deploy/.env.remote.local` 可包含 `REMOTE_HOST/REMOTE_USER/REMOTE_DIR`，以及可选 `SSH_PASSWORD`（自动化）或 `SSH_KEY`（推荐）。

## 1. Host 基线

- [ ] Docker Engine >= 24.0.0
- [ ] Docker Compose Plugin >= 2.20.0
- [ ] 可用磁盘 >= 20GB
- [ ] 共享依赖端口已监听：`23306/26379`
- [ ] 测试栈目标端口可用：`28080/3001-3005`

## 2. Repo 与构建产物

- [ ] 代码已同步到目标分支
- [ ] `ruoyi-admin/target/ruoyi-admin.jar` 已存在
- [ ] `deploy/mysql-init/*` 文件完整

## 3. 环境文件（test）

文件：`deploy/.env.test`

- [ ] `TEST_DEPENDENCY_MODE=shared`
- [ ] `MYSQL_SHARED_HOST` / `MYSQL_SHARED_PORT`
- [ ] `REDIS_SHARED_HOST` / `REDIS_SHARED_PORT`
- [ ] `MYSQL_DATABASE`
- [ ] `MYSQL_APP_USER`
- [ ] `MYSQL_APP_PASSWORD`
- [ ] `REDIS_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `BACKEND_PORT/ADMIN_PORT/...` 端口配置

说明：
- test 环境默认不启动 `mysql/redis` 容器，而是复用远端开发环境已运行的 `23306/26379` 共享依赖。
- `deploy/.env.test` 中的 `MYSQL_*` / `REDIS_*` 是共享依赖的业务账号密码；服务器 SSH 登录账号密码需单独管理，不写入该文件。
- 本地开发如需复用测试库，使用 `deploy/.env.dev` + `bash bin/run-backend-dev.sh deploy/.env.dev`。

## 4. 启动前校验

```bash
bash bin/deploy-preflight.sh test --profile core,frontends
```

预期：`PASS: deploy-preflight`

## 5. 启动命令

```bash
bash bin/deploy-server-docker.sh test --profile core,frontends
```

若从本机远程触发（推荐）：

```bash
bash bin/deploy-remote-server.sh --host <server-ip> --user root --key <ssh_key_path> --env test --profile core,frontends
# 或
SSH_PASSWORD='***' bash bin/deploy-remote-server.sh --host <server-ip> --user root --env test --profile core,frontends
```

## 6. 健康检查

```bash
curl http://127.0.0.1:28080/actuator/health
curl -I http://127.0.0.1:3005/login
```

## 7. 验证拓扑

```bash
bash bin/docker-env-status.sh test --profile core,frontends
```

预期包含：`backend admin student mentor lead-mentor assistant`

## 8. 回滚

```bash
bash bin/docker-env-down.sh test --profile core,frontends
```

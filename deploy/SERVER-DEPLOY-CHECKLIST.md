# Server Deploy Checklist (All-In-Docker)

## 0. 环境策略

- 开发环境（dev）：后端本地运行，连接测试环境 mysql/redis（共库）。
- 测试环境（test）：远程服务器全容器部署（mysql/redis/backend/frontends）。
- 生产环境（prod）：远程服务器全容器部署 + secrets 文件。

### 快捷命令（可直接跑）

```bash
# 本地开发后端（共用测试库）
bash bin/run-dev-shared.sh

# 一键远程测试部署（REMOTE_HOST 从 deploy/.env.remote.local 或 --host 传入）
bash bin/deploy-test-remote.sh
```

## 1. Host 基线

- [ ] Docker Engine >= 24.0.0
- [ ] Docker Compose Plugin >= 2.20.0
- [ ] 可用磁盘 >= 20GB
- [ ] 目标端口可用：`23306/26379/28080/3001-3005`

## 2. Repo 与构建产物

- [ ] 代码已同步到目标分支
- [ ] `ruoyi-admin/target/ruoyi-admin.jar` 已存在
- [ ] `deploy/mysql-init/*` 文件完整

## 3. 环境文件（test）

文件：`deploy/.env.test`

- [ ] `MYSQL_DATABASE`
- [ ] `MYSQL_APP_USER`
- [ ] `MYSQL_ROOT_PASSWORD`
- [ ] `MYSQL_APP_PASSWORD`
- [ ] `REDIS_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `BACKEND_PORT/ADMIN_PORT/...` 端口配置

说明：
- MySQL 运行在 Docker `mysql` 服务内，不使用外置数据库。
- `deploy/.env.test` 中的 `MYSQL_*` 是数据库账号密码；服务器 SSH 登录账号密码需单独管理，不写入该文件。
- 本地开发如需复用测试库，使用 `deploy/.env.dev` + `bash bin/run-backend-dev.sh`。

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

预期包含：`mysql redis backend admin student mentor lead-mentor assistant`

## 8. 回滚

```bash
bash bin/docker-env-down.sh test --profile core,frontends
```

---
description: 从本机通过 SSH 触发远程服务器容器化部署（远程执行 deploy-server-docker）
---

# Deploy Remote Server

## 使用方式

```bash
/deploy-remote-server --host <ip_or_domain> [--user root] [--key ~/.ssh/id_rsa]
```

## 强约束

- 远端部署仍采用全容器拓扑（mysql/redis/backend/frontends）。
- 禁止直接在本机跑业务容器（仅触发远端执行）。
- 本地开发连接测试库时，统一使用 `deploy/.env.dev`，不改远端 test compose。

## 执行步骤

1. 确认远端项目目录已就绪（默认 `/opt/OSGPrj`）。
2. 执行远端部署脚本：
   - `bash bin/deploy-remote-server.sh --host <host> --user <user> --key <ssh_key_path> --env test --profile core,frontends`
   - 若必须密码方式：使用环境变量 `SSH_PASSWORD='***'`，不要把密码写在命令参数里
   - 或使用本地参数文件：先创建 `deploy/.env.remote.local`，再执行 `bash bin/deploy-test-remote.sh`
3. 查看远端运行结果（脚本会输出）。

## 可选参数

- `--update-code --git-ref main`：部署前在远端执行 `git fetch/pull`。
- `--skip-health-check`：跳过远端健康检查（仅调试时使用）。

## 回滚

在远端执行：

```bash
bash bin/docker-env-down.sh test --profile core,frontends
```

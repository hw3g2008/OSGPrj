---
description: 全量部署测试环境（后端 + 5 个前端）
---

# Deploy Full

## 使用方式

```bash
/deploy-full
```

一次性部署后端 + 全部 5 个前端（admin / student / mentor / lead-mentor / assistant）到测试环境。

默认部署到 `test` 环境。若用户指定 `prod`，必须停下并说明当前仅支持 `test`。

## 规则

- 全量部署：后端 + 所有前端，不加任何 `--*-only` 参数
- 目标 host 从 `.claude/project/config.yaml` 的 `environment_identity.remote_test_stack.host` 取
- SSH 凭据由 `deploy/.env.remote.local` 提供
- 用在需要完整环境刷新的场景；单独更新某一端请用 `/deploy-backend` 或 `/deploy-frontend <app>`

## 端口映射

| 服务 | Port |
|---|---|
| backend | 28080 |
| admin | 3005 |
| student | 3001 |
| mentor | 3002 |
| lead-mentor | 3003 |
| assistant | 3004 |

## 执行步骤

1. 校验环境为 `test`
2. 从 `.claude/project/config.yaml` 读取 host
3. 在仓库根目录执行：

```bash
bash bin/deploy-test-artifacts.sh --host <host>
```

4. 等待脚本退出码 0
5. 验证所有服务：

```bash
curl -sS http://<host>:28080/actuator/health   # backend 必须返回 "status":"UP"
curl -sI http://<host>:3005/login              # admin
curl -sI http://<host>:3001/login              # student
curl -sI http://<host>:3002/login              # mentor
curl -sI http://<host>:3003/login              # lead-mentor
curl -sI http://<host>:3004/login              # assistant
```

所有前端必须返回 `HTTP/1.1 200 OK`。任意一项未通过视为部署未完成。

## 示例

```text
/deploy-full
```

解析为：

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128
```

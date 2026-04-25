---
description: 部署单个前端应用到测试环境（复用已运行的后端）
---

# Deploy Frontend

## 使用方式

```bash
/deploy-frontend <app>
```

其中 `<app>` 必须是以下之一：`admin` / `student` / `mentor` / `lead-mentor` / `assistant`。

默认部署到 `test` 环境。若用户指定 `prod`，必须停下并说明当前仅支持 `test`。

## 端口映射

| App         | Port |
| -------------| ------|
| admin       | 3005 |
| student     | 3001 |
| mentor      | 3002 |
| lead-mentor | 3003 |
| assistant   | 3004 |

## 规则

- 仅部署前端，不动后端，必须使用 `--frontend-only`
- 目标 host 从 `.claude/project/config.yaml` 的 `environment_identity.remote_test_stack.host` 取
- 后端 base URL 从 `runtime_model.test.backend.base_url` 取（当前固定：`http://47.94.213.128:28080`）
- **重要**：若本次变更包含后端代码（Java / SQL / mapper），仅跑本 workflow **不够**，必须再跑 `/deploy-backend` 或改用 `deploy-full` skill

## 执行步骤

1. 校验参数：`<app>` 是否在 5 个合法值内；环境是否为 `test`
2. 从 `.claude/project/config.yaml` 读取 host 与 backend base_url
3. 在仓库根目录执行：

```bash
bash bin/deploy-test-artifacts.sh \
  --host <host> \
  --frontend-app <app> \
  --frontend-only \
  --frontend-api-base <backend-url>
```

4. 等待脚本退出码 0
5. 验证登录页可达：

```bash
curl -sI http://<host>:<port>/login | head -1
```

必须返回 `HTTP/1.1 200 OK`，否则视为部署未完成。

## 示例

```text
/deploy-frontend admin
```

解析为：

```bash
bash bin/deploy-test-artifacts.sh \
  --host 47.94.213.128 \
  --frontend-app admin \
  --frontend-only \
  --frontend-api-base http://47.94.213.128:28080
```

验证：

```bash
curl -sI http://47.94.213.128:3005/login | head -1
```

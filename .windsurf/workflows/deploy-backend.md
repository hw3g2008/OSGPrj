---
description: 部署后端到测试环境（不动前端）
---

# Deploy Backend

## 使用方式

```bash
/deploy-backend
```

默认部署到 `test` 环境。若用户指定 `prod`，必须停下并说明当前仅支持 `test`。

## 规则

- 仅部署后端，所有前端容器保持不动，必须使用 `--backend-only`
- 目标 host 从 `.claude/project/config.yaml` 的 `environment_identity.remote_test_stack.host` 取
- SSH 凭据由 `deploy/.env.remote.local` 提供，脚本内部读取
- 禁止向用户询问：远程 IP、后端端口、SSH 密码

## 执行步骤

1. 校验环境为 `test`
2. 从 `.claude/project/config.yaml` 读取 host
3. 在仓库根目录执行：

```bash
bash bin/deploy-test-artifacts.sh --host <host> --backend-only
```

4. 等待脚本退出码 0
5. 验证后端健康：

```bash
curl -sS http://<host>:28080/actuator/health
```

必须返回 `"status":"UP"`，否则视为部署未完成。

## 示例

```text
/deploy-backend
```

解析为：

```bash
bash bin/deploy-test-artifacts.sh --host 47.94.213.128 --backend-only
```

验证：

```bash
curl -sS http://47.94.213.128:28080/actuator/health
```

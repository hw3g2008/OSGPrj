# /final-closure 命令

## 用法

```bash
/final-closure [module]
```

示例：

```bash
/final-closure permission
```

## 说明

`all_stories_done` 后的唯一收尾入口。  
该命令调用 `bin/final-closure.sh` 统一编排：

1. 前置校验（状态 + module + 模块测试资产）
2. 环境准备（复用或托管后端）
3. Final Gate 执行（含业务 WARNING 兜底判定）
4. 审计校验（traceability + integration assertions）
5. 可选 CC 复核（`required|optional|off`）
6. 产物收集与审计报告生成
7. 环境清理与结论输出

## 后端策略

- 默认 `--backend-policy auto`：
  - 先复用外部后端；
  - 不可达时优先尝试 Docker 启动；
  - Docker 启动不可用时回退本地托管 `bash bin/run-backend-dev.sh deploy/.env.dev`。
- 推荐 `--backend-policy docker_only`（Docker 场景）：
  - 不可达时必须走 Docker；
  - 不允许回退本地托管 backend，失败即 `EXIT 11`。

Docker 启动命令来源优先级：
1. `DOCKER_RUN_CMD`
2. `.claude/project/config.yaml` → `commands.ops.docker_run`

## 参数规则

1. `module` 优先取命令参数
2. 若参数为空，回退 `STATE.current_requirement`
3. 若仍为空，命令失败退出（`EXIT 16`）

## 执行入口

```bash
bash bin/final-closure.sh [module] --cc-mode optional
```

Docker 严格模式（不允许回退本地托管 backend）：

```bash
bash bin/final-closure.sh [module] --cc-mode optional --backend-policy docker_only
```

可选覆盖 Docker 启动命令（默认读取 `.claude/project/config.yaml` 的 `commands.ops.docker_run`）：

```bash
DOCKER_RUN_CMD="docker compose up -d" \
bash bin/final-closure.sh [module] --cc-mode optional --backend-policy docker_only
```

## 退出码

- `0`：PASS / PARTIAL
- `10`：前置状态不满足（非 `all_stories_done`）
- `11`：环境准备失败（后端未就绪）
- `12`：`final-gate` 失败或命中业务 WARNING
- `13`：审计校验失败
- `14`：CC 复核失败（`cc-mode=required`）
- `15`：产物收集/审计报告失败
- `16`：module 参数无效或模块测试资产缺失

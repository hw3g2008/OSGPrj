---
description: 模块级最终收尾编排器（all_stories_done 后唯一入口）
---

# Final Closure

## 使用方式

```bash
/final-closure [module]
```

示例：`/final-closure permission`

## 前置条件

- `STATE.workflow.current_step == all_stories_done`
- 目标模块测试资产存在：
  - `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
  - `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`

## 执行顺序（固定 8 步，含 Step 0）

### Step 0: 前置校验

1. 读取 `STATE.yaml`
2. 解析 `module` 参数（为空时回退 `STATE.current_requirement`）
3. 校验 `current_step=all_stories_done`
4. 校验模块测试资产存在

失败：
- 状态不满足 → `EXIT 10`
- module 无效/资产缺失 → `EXIT 16`

### Step 1: 环境准备

1. 优先复用已启动后端（`/actuator/health` 可达）
2. 若不可达，按 `--backend-policy` 执行：
   - `docker_only`：必须走 Docker 启动（禁止回退本地 `mvn`）
   - `auto`：优先 Docker，Docker 不可用时回退本地托管 `mvn spring-boot:run`
3. Docker 启动命令解析优先级：
   - 环境变量 `DOCKER_RUN_CMD`
   - `.claude/project/config.yaml` 的 `commands.ops.docker_run`
4. 健康检查等待（默认 120 秒）

失败：后端未就绪 → `EXIT 11`

### Step 2: 门禁执行

1. 运行：
   - `bash bin/final-gate.sh {module} 2>&1 | tee osg-spec-docs/tasks/audit/final-gate-{module}-{date}.log`
2. 读取 `PIPESTATUS[0]` 作为 `final-gate` 返回码
3. 业务 WARNING 兜底判定（命中即失败）：
   - `⚠️ WARNING: 后端未启动`
   - `⚠️ @api E2E 已跳过`
4. 忽略第三方告警（如 Sass/Vite `DEPRECATION WARNING`）

失败：`EXIT 12`

### Step 3: 审计校验

1. `traceability_guard`（模块化路径）
2. `story_integration_assertions`

失败：`EXIT 13`

### Step 4: CC 最终复核（可配置）

执行 `claude -p`（禁止递归调用 `/cc-review final`）：
- `required`：失败 → `EXIT 14`
- `optional`：失败记 WARNING，流程继续
- `off`：跳过

### Step 5: 产物收集

最低产物：
- `osg-spec-docs/tasks/audit/final-closure-{module}-{date}.md`
- `osg-spec-docs/tasks/audit/final-gate-{module}-{date}.log`
- `osg-spec-docs/tasks/audit/api-smoke-{module}-*.md`
- `osg-frontend/playwright-report/`
- Docker 分支命中时：`osg-spec-docs/tasks/audit/final-closure-docker-boot-{module}-{date}.log`

失败：`EXIT 15`

### Step 6: 环境清理

- 仅清理 Step 1 启动的托管后端（`backend_mode=managed`）
- 外部后端（`backend_mode=external`）禁止关闭

清理失败记 WARNING，不覆盖主结论。

### Step 7: 输出结论

结论映射：
- `PASS`：主链全通过，无 WARNING
- `PARTIAL`：主链通过，但有 optional CC 失败或清理告警
- `FAIL`：Step 2/3/5 失败，或 Step 4(required) 失败
- `BLOCKED`：Step 0 或 Step 1 失败

## 执行入口（脚本）

```bash
bash bin/final-closure.sh [module] --cc-mode optional
```

Docker 严格模式（推荐）：

```bash
bash bin/final-closure.sh [module] --cc-mode optional --backend-policy docker_only
```

覆盖 Docker 启动命令（临时）：

```bash
DOCKER_RUN_CMD="docker compose up -d" \
bash bin/final-closure.sh [module] --cc-mode optional --backend-policy docker_only
```

## 退出码

- `0`：PASS / PARTIAL
- `10`：前置状态不满足
- `11`：环境准备失败
- `12`：final-gate 失败或命中业务 WARNING
- `13`：审计校验失败
- `14`：CC 复核失败（required）
- `15`：产物收集/报告失败
- `16`：module 无效或模块测试资产缺失

# Final Closure 收尾编排器设计（`all_stories_done` 后唯一入口）

## 1. 背景与问题

当前 `all_stories_done` 后的收尾动作主要挂在 `/cc-review final`，存在职责过重问题：

- 同时承载环境启停、门禁执行、审计产出、LLM 复核，语义过载。
- 同一命令内有“必须执行”和“可选执行”混杂，AI 容易走偏。
- 当执行失败时，缺乏统一分层退出码与恢复入口。

目标是把“最终收尾”从 `cc-review` 中解耦，形成可编排、可恢复、可审计的单入口流程。

## 2. 设计目标

1. `all_stories_done` 后只允许一个入口：`/final-closure {module}`。
2. AI 不需要判断“下一步跑什么命令”，只按固定顺序执行。
3. 每一步具备明确契约：
   - 调用命令
   - 通过条件
   - 失败处理
   - 审计产物
4. `cc-review final` 保留兼容入口，但降级为跳转提示，不再承担编排职责。
5. E2E 收尾默认“全量路径优先”，避免静默 `@ui-only` 通过造成误判。
6. 面向 Docker 运行场景提供可配置后端策略，避免 AI 自行猜测启动方式。

## 3. 非目标

1. 不改动 story 级 `/cc-review`（type=story）的语义。
2. 不重写 `bin/final-gate.sh` 的核心测试步骤，仅做参数化和可观测增强。
3. 不引入新的状态机节点，保持 `STATE.workflow.current_step=all_stories_done` 作为触发条件。

## 4. 入口与职责边界

### 4.1 入口规则

- 触发条件：`STATE.workflow.current_step == all_stories_done`
- 唯一命令：`/final-closure {module}`

### 4.2 边界定义

- `/final-closure`：收尾编排器（顺序控制、失败策略、审计汇总、资源清理）
- `bin/final-gate.sh`：门禁执行器（既有 9 步验证链）
- `/cc-review final`：兼容别名，仅输出跳转提示（不再执行任何收尾步骤）

### 4.3 后端策略与 Docker 命令来源

- `--backend-policy auto`（默认）：
  - 先复用外部后端；
  - 若不可达，优先执行 Docker 启动命令；
  - Docker 启动不可用时，再回退本地托管 `mvn spring-boot:run`。
- `--backend-policy docker_only`（推荐 CI / 团队标准模式）：
  - 先复用外部后端；
  - 若不可达，必须执行 Docker 启动命令；
  - 不允许回退本地 `mvn`，失败即 `EXIT 11`。
- Docker 启动命令解析优先级：
  1. 环境变量 `DOCKER_RUN_CMD`
  2. `.claude/project/config.yaml` 的 `commands.ops.docker_run`
  3. 若仍为空：在 `docker_only` 下直接失败（`EXIT 11`），在 `auto` 下允许回退本地托管后端

## 5. 执行顺序（固定 8 步，含 Step 0 前置校验）

### Step 0. 前置校验

- 命令：读取 `STATE.yaml` + 解析 `module` 参数
- 通过条件：
  - `current_step=all_stories_done`
  - `module` 非空（优先使用命令参数；若为空则回退 `STATE.current_requirement`）
  - `osg-spec-docs/tasks/testing/{module}-test-cases.yaml` 与 `{module}-traceability-matrix.md` 均存在
- 失败处理：
  - 状态不满足：`EXIT 10`
  - `module` 为空或模块测试资产缺失：`EXIT 16`

### Step 1. 环境准备

- 命令（三分支）：
  - 若 `curl -fsS http://127.0.0.1:8080/actuator/health` 已通过：标记 `backend_mode=external`（复用外部后端）
  - 若不可达且 Docker 命令可解析：执行 `${DOCKER_RUN_CMD}` 或 `config.commands.ops.docker_run`，并生成 `final-closure-docker-boot-{module}-{date}.log`
  - 若不可达且 Docker 启动不可用：
    - `backend_policy=docker_only`：直接失败（`EXIT 11`）
    - `backend_policy=auto`：回退启动本地托管后端 `mvn -pl ruoyi-admin -am spring-boot:run >/tmp/osg-backend.log 2>&1 &`，记录 `BACK_PID`，标记 `backend_mode=managed`
  - 统一等待健康检查通过（默认超时 120s）
- 通过条件：健康检查在超时窗口（默认 120s）内返回 200
- 失败处理：记录日志并退出（`EXIT 11`）

### Step 2. 门禁执行

- 命令（由 `bin/final-closure.sh` 执行）：
  - `FINAL_GATE_LOG="osg-spec-docs/tasks/audit/final-gate-{module}-{date}.log"`
  - `bash bin/final-gate.sh {module} 2>&1 | tee "${FINAL_GATE_LOG}"`
  - `gate_rc=${PIPESTATUS[0]}`
  - `grep -Eq '⚠️ WARNING: 后端未启动|⚠️ @api E2E 已跳过' "${FINAL_GATE_LOG}"`
- 通过条件：
  - `gate_rc == 0`
  - `grep` 未命中 Final Gate 业务警告标识：
    - `⚠️ WARNING: 后端未启动`
    - `⚠️ @api E2E 已跳过`
  - 忽略第三方工具告警（如 Sass/Vite `DEPRECATION WARNING`）
- 失败处理：`final-closure.sh` 以 `EXIT 12` 失败退出（即使 `final-gate.sh` 返回 0）

### Step 3. 审计校验

- 命令：
  - `python3 .claude/skills/workflow-engine/tests/traceability_guard.py --cases osg-spec-docs/tasks/testing/{module}-test-cases.yaml --matrix osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`
  - `python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py`
- 通过条件：两个命令均 exit code = 0
- 失败处理：退出（`EXIT 13`）

### Step 4. CC 最终复核（策略可配）

- 命令：`claude -p "<final closure review prompt for {module}>"`
- 策略：
  - `required`：失败即退出（`EXIT 14`）
  - `optional`：失败记为 WARNING，流程继续
  - `off`：跳过
- 默认建议：`optional`（P0 模块可设 `required`）
- 约束：`/final-closure` 内部禁止调用 `/cc-review final`（避免别名递归）

### Step 5. 产物收集与回填

- 命令：收集并汇总审计产物
- 最低产物：
  - `osg-spec-docs/tasks/audit/final-closure-{module}-{date}.md`
  - `osg-spec-docs/tasks/audit/final-gate-{module}-{date}.log`
  - `osg-spec-docs/tasks/audit/api-smoke-{module}-*.md`
  - `osg-frontend/playwright-report/`
- Docker 分支额外产物（命中时）：
  - `osg-spec-docs/tasks/audit/final-closure-docker-boot-{module}-{date}.log`
- 可选回填：将 final-level TC 的 `latest_result` 更新为本次 run 证据（仅对 `pending`）
- 失败处理：退出（`EXIT 15`）

### Step 6. 环境清理

- 命令：
  - 仅当 `backend_mode=managed` 时执行 `kill $BACK_PID`
  - `backend_mode=external` 时跳过（禁止关闭外部进程）
- 通过条件：托管进程退出或不存在
- 失败处理：记 WARNING，不覆盖主结论（`EXIT 0` + 清理告警）

### Step 7. 输出结论

- 结论枚举：`PASS | PARTIAL | FAIL | BLOCKED`
- 建议映射：
  - `PASS`：Step 0-6 全通过，无 WARNING
  - `PARTIAL`：主链通过，但存在 optional CC 失败或清理告警
  - `FAIL`：Step 2/3/5 失败，或 Step 4(required) 失败
  - `BLOCKED`：Step 0（状态不满足 / module 无效 / 资产缺失）或 Step 1（环境未就绪）失败

## 6. 退出码规范

- `0`：PASS / PARTIAL
- `10`：前置状态不满足
- `11`：环境准备失败（后端未就绪）
- `12`：final-gate 失败或命中业务警告标识
- `13`：审计校验失败
- `14`：CC 复核失败且策略为 required
- `15`：产物收集/回填失败
- `16`：module 参数无效（为空）或模块测试资产不存在

## 7. 文件改造清单（最小闭环）

1. 修改 `/.windsurf/workflows/final-closure.md`
   - 对齐 8 步固定顺序（含 Step 0）、进程归属策略、业务警告判定。
2. 新增 `/.claude/commands/final-closure.md`
   - 暴露用户入口 `/final-closure {module}`。
   - 参数校验：module 为空时回退 `STATE.current_requirement`，仍为空则失败退出。
3. 新增 `/bin/final-closure.sh`
   - 编排执行、日志收集、退出码治理。
   - 对 `final-gate` 日志执行业务 WARNING `grep` 判定（命中即 `EXIT 12`）。
   - 支持 `--backend-policy auto|docker_only` 与 Docker 启动命令解析优先级（`DOCKER_RUN_CMD` > config）。
4. 修改 `/.windsurf/workflows/cc-review.md`
   - type=final 改为“跳转 `/final-closure {module}`”。
5. 修改 `/bin/final-gate.sh`
   - 支持 `module` 参数（替代 `permission` 硬编码）。
6. 修改 `/.windsurf/workflows/approve.md`
   - 在进入 `all_stories_done` 时补充统一收尾提示：执行 `/final-closure {module}`。
7. 修改 `/.claude/commands/approve.md`
   - 与 workflow 保持同一提示语义：`all_stories_done` 后执行 `/final-closure {module}`。

## 8. 执行示例（AI 运行手册）

```bash
# 1) 唯一入口
/final-closure permission

# 2) 编排器内部动作（示意）
bash bin/final-closure.sh permission --cc-mode optional

# 2.1) Docker 严格模式（推荐）
bash bin/final-closure.sh permission --cc-mode optional --backend-policy docker_only

# 2.2) 显式覆盖 Docker 启动命令
DOCKER_RUN_CMD="docker compose up -d" \
bash bin/final-closure.sh permission --cc-mode optional --backend-policy docker_only

# 3) CC 复核（由编排器直接调用，可选）
claude -p "<final closure review prompt for permission>"
```

## 9. 验收标准

1. `all_stories_done` 后，AI 仅需执行一条命令即可完成收尾。
2. 任意失败都能定位到步骤和退出码。
3. 审计报告可回放到每一步命令与结果。
4. 不再出现“该跑 /cc-review final 还是 final-gate”的分叉判断。
5. 在 Docker 项目中，`docker_only` 模式下禁止静默回退本地 `mvn`。

## 10. 风险与缓解

1. 风险：后端启动慢导致误判失败
   - 缓解：健康检查超时可配置，默认 120s。
2. 风险：`final-gate` 仍存在模块硬编码
   - 缓解：先做 module 参数化再切换入口。
3. 风险：CC optional 导致人工遗漏高风险问题
   - 缓解：对 P0 模块强制 `cc_mode=required`。
4. 风险：Docker 命令配置不一致（`docker-compose` / `docker compose`）
   - 缓解：允许 `DOCKER_RUN_CMD` 临时覆盖，并把最终团队标准固化到 `config.yaml`。

## 11. 迁移策略

1. 第一阶段：新增 `/final-closure`，保留 `/cc-review final` 但仅提示迁移。
2. 第二阶段：文档与提示统一，AI 训练语料中只保留 `/final-closure` 入口。
3. 第三阶段：收集两周执行数据，若稳定再移除 `/cc-review final` 历史执行分支。

## 12. 本方案的关键判断

`/final-closure` 不是新门禁，而是“收尾编排器”；
`final-gate` 仍是核心门禁执行器；
`cc-review` 回归“审核职责”。

这样可以在不推翻现有框架的前提下，显著降低 AI 在收尾阶段的认知负担与执行漂移。

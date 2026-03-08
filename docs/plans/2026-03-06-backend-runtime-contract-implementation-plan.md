# Backend Runtime Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 OSG 建立单一的开发态后端运行契约，让本地 backend、前端代理、E2E、visual gate、final gate 全部共享同一运行时事实，消除 8080/28080 口径漂移，并确保开发态运行的就是工作区最新共享模块源码。

**Architecture:** 采用“通用骨架 + 项目适配层”。仓库内新增项目运行契约文件，脚本与 workflow 统一读取该契约；当前项目口径固定为“本地 backend + 远端 MySQL/Redis + 28080 + `/actuator/health` + reactor 构建最新 jar 后启动”。默认 fail-closed，不允许自动猜端口；只有显式开启迁移兼容开关时才允许 fallback。

**Tech Stack:** Bash, YAML, Python guard scripts, Spring Boot, Vite, Playwright

---

### Task 1: 建立项目运行契约真源

**Files:**
- Create: `deploy/runtime-contract.dev.yaml`
- Modify: `deploy/ENV-REQUIREMENTS.md`
- Modify: `deploy/SERVER-DEPLOY-CHECKLIST.md`
- Test: `.claude/skills/workflow-engine/tests/runtime_contract_guard.py`

**Step 1: 写运行契约守卫脚本（先失败）**

创建 `runtime_contract_guard.py`，要求至少校验：
- `mode`
- `stack`
- `classpath_mode`
- `env_file`
- `run_command`
- `port`
- `base_url`
- `health_url`
- `proxy_target`
- `deps.mysql`
- `deps.redis`
- `providers`
- `evidence_sinks`
- `evidence_paths`

**Step 2: 运行守卫，确认当前缺文件而失败**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract deploy/runtime-contract.dev.yaml
```

Expected:

- FAIL，提示文件不存在

**Step 3: 创建 `deploy/runtime-contract.dev.yaml`**

目标值：

```yaml
mode: local-backend-remote-deps
stack: springboot-vue
classpath_mode: workspace-reactor
env_file: deploy/.env.dev
run_command: bash bin/run-backend-dev.sh deploy/.env.dev
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
deps:
  mysql: remote
  redis: remote
```

**Step 4: 更新环境文档**

- `deploy/ENV-REQUIREMENTS.md`
- `deploy/SERVER-DEPLOY-CHECKLIST.md`

明确：
- 开发态唯一契约来源是 `deploy/runtime-contract.dev.yaml`
- 开发态 backend 统一走 `28080`
- 本地不启 Docker MySQL/Redis

**Step 5: 再跑守卫，确认通过**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py --contract deploy/runtime-contract.dev.yaml
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add deploy/runtime-contract.dev.yaml deploy/ENV-REQUIREMENTS.md deploy/SERVER-DEPLOY-CHECKLIST.md .claude/skills/workflow-engine/tests/runtime_contract_guard.py
git commit -m "docs: add backend runtime contract source"
```

### Task 2: 统一后端开发态启动入口

**Files:**
- Modify: `bin/run-backend-dev.sh`
- Modify: `deploy/.env.dev`
- Modify: `.claude/skills/workflow-engine/tests/runtime_contract_guard.py`
- Test: `bin/run-backend-dev.sh`

**Step 1: 先给脚本加可验证模式**

为 `bin/run-backend-dev.sh` 增加：
- `--check-only`
- `--print-runtime`

要求：
- 不启动进程
- 只输出解析后的运行时配置
- 便于 gate 和测试验证

**Step 2: 先运行旧脚本验证当前口径错误**

Run:

```bash
bash bin/run-backend-dev.sh deploy/.env.dev --print-runtime
```

Expected:

- 看到 `SERVER_PORT=8080`

**Step 3: 修改脚本为“契约优先”**

要求：
- 默认读取 `deploy/runtime-contract.dev.yaml`
- 若 `deploy/.env.dev` 中 `SERVER_PORT` 与契约不一致，直接 FAIL
- 真实启动命令必须先从仓库根 reactor 构建 `ruoyi-admin` 及共享模块，再运行 `ruoyi-admin/target/ruoyi-admin.jar`
- 明确禁止 `mvn -f ruoyi-admin/pom.xml spring-boot:run`
- 输出：
  - `env_file`
  - `port`
  - `base_url`
  - `health_url`
- `--print-runtime` 里增加 `START_MODE=reactor`
- 禁止静默回退到 8080

**Step 3.1: 加守卫，防止契约回退成“隔离模块启动”**

要求：
- `runtime_contract_guard.py` 新增校验：
  - `run_command` 必须包含 `bin/run-backend-dev.sh`
  - 若声明 `stack: springboot-vue`，则实际启动脚本输出必须是 `START_MODE=reactor`
- 这一步不是检查 Maven 全命令文本，而是检查“项目契约 + 启动脚本输出”是否明确承诺 reactor 模式

**Step 4: 修改 `deploy/.env.dev`**

把：

```env
SERVER_PORT=8080
```

改为：

```env
SERVER_PORT=28080
```

**Step 5: 重新验证 print/check**

Run:

```bash
bash bin/run-backend-dev.sh deploy/.env.dev --print-runtime
bash bin/run-backend-dev.sh deploy/.env.dev --check-only
```

Expected:

- 输出 `28080`
- 校验通过

**Step 6: 再做真实启动验证**

Run:

```bash
bash bin/run-backend-dev.sh deploy/.env.dev
```

另开终端验证：

```bash
curl -fsS http://127.0.0.1:28080/actuator/health
```

Expected:

- health 200

**Step 6.1: 验证 classpath 不再吃 `~/.m2` 旧共享包**

Run:

```bash
ps -p <backend_pid> -o pid,command=
```

Expected:

- 启动前日志明确出现 `build_strategy=reactor-package-then-jar`
- 实际 Java 进程来自 `ruoyi-admin/target/ruoyi-admin.jar`
- 不再出现“只从 `ruoyi-admin` 子模块启动，共享模块靠 `~/.m2` 已安装 jar 解析”的运行方式

**Step 7: Commit**

```bash
git add bin/run-backend-dev.sh deploy/.env.dev .claude/skills/workflow-engine/tests/runtime_contract_guard.py
git commit -m "feat: unify dev backend runtime contract"
```

### Task 3: 让 gate 与 E2E 全部读取同一契约

**Files:**
- Create: `bin/resolve-runtime-contract.sh`
- Modify: `bin/e2e-api-gate.sh`
- Modify: `bin/ui-visual-baseline.sh`
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`
- Modify: `osg-frontend/packages/admin/vite.config.ts`
- Test: `bin/e2e-api-gate.sh`
- Test: `bin/ui-visual-gate.sh`
- Test: `bin/final-gate.sh`

**Step 1: 写统一解析脚本**

`bin/resolve-runtime-contract.sh` 负责输出：
- `BASE_URL`
- `BASE_HEALTH_URL`
- `E2E_API_PROXY_TARGET`
- `BACKEND_PORT`

优先级：
1. 显式环境变量
2. `deploy/runtime-contract.dev.yaml`
3. 显式开启 `RUNTIME_CONTRACT_ALLOW_FALLBACK=1` 时才允许历史兜底（并 `WARN`）

默认行为：
- 未解析到契约 => FAIL
- 不再自动猜 `28080/8080`

**Step 2: 先在一个入口接入并验证**

先改 `bin/e2e-api-gate.sh`，去掉直接写死的：
- `28080`
- `8080`

改为统一读取 `bin/resolve-runtime-contract.sh`

**Step 3: 运行 E2E gate 验证它拿到的是同一契约**

Run:

```bash
bash bin/e2e-api-gate.sh permission smoke
```

Expected:

- 输出使用 `http://127.0.0.1:28080`

**Step 4: 依次改其余入口**

- `bin/ui-visual-baseline.sh`
- `bin/final-gate.sh`
- `bin/final-closure.sh`
- `osg-frontend/packages/admin/vite.config.ts`

要求：
- 不再散落各自默认值
- 统一从契约或显式 env 读取
- backend 相关入口默认 fail-closed

**Step 5: 跑回归**

Run:

```bash
bash bin/ui-visual-gate.sh permission
bash bin/final-gate.sh permission
```

Expected:

- 不再出现“后端其实已起，但脚本打错端口”的失败
- 未满足契约时直接 FAIL，且报错指向唯一正确启动命令

**Step 6: Commit**

```bash
git add bin/resolve-runtime-contract.sh bin/e2e-api-gate.sh bin/ui-visual-baseline.sh bin/final-gate.sh bin/final-closure.sh osg-frontend/packages/admin/vite.config.ts
git commit -m "feat: make gates and frontend use runtime contract"
```

### Task 4: 固化项目 workflow，不再靠人工记忆

**Files:**
- Create: `.windsurf/workflows/run-backend-dev.md`
- Modify: `.windsurf/workflows/final-closure.md`
- Modify: `.claude/project/config.yaml`

**Step 1: 新建项目 workflow**

`.windsurf/workflows/run-backend-dev.md` 明确：
- 唯一命令：`bash bin/run-backend-dev.sh deploy/.env.dev`
- 先跑 `--check-only`
- 再启动并验证 `/actuator/health`
- 本地不启 Docker MySQL/Redis

**Step 2: 修正文档里的旧口径**

重点修：
- `.windsurf/workflows/final-closure.md`
- `.claude/project/config.yaml`

要求：
- 不再推荐直接 `mvn spring-boot:run`
- 运行命令统一切到 `bash bin/run-backend-dev.sh deploy/.env.dev`
- 所有依赖 backend 的 workflow 必须先经过 runtime preflight

**Step 3: 配置回查**

Run:

```bash
rg -n "spring-boot:run|127.0.0.1:8080|localhost:8080" .windsurf .claude deploy bin osg-frontend/packages/admin -g '!**/node_modules/**'
```

Expected:

- 对开发态入口，旧口径已被替换或明确标记为 legacy/docker internal

**Step 4: Commit**

```bash
git add .windsurf/workflows/run-backend-dev.md .windsurf/workflows/final-closure.md .claude/project/config.yaml
git commit -m "docs: codify dev backend workflow contract"
```

### Task 5: 前移 hard gates，避免 story/ticket 漏拆分

**Files:**
- Modify: `.windsurf/workflows/split-story.md`
- Modify: `.windsurf/workflows/approve.md`
- Create: `.claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py`
- Modify: `docs/plans/2026-03-06-requirements-coverage-hard-gates-implementation-plan.md`

**Step 1: 在 `/approve stories` 前强制 `requirements_to_stories`**

要求：
- `requirements_coverage_guard.py --mode requirements_to_stories`
- 缺 Story 映射直接 FAIL

**Step 2: 新增 `story_ticket_coverage_guard.py`**

要求：
- 校验每个 Story 都有完整 Ticket 覆盖
- 缺 Ticket 映射直接 FAIL

**Step 3: 在 `/approve tickets` 前强制 `story_ticket_coverage_guard.py`**

要求：
- 没有完整 Ticket 覆盖，禁止进入 `tickets_approved`

**Step 4: 回归校验**

Run:

```bash
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard.py --module permission --mode requirements_to_stories
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py --module permission
```

Expected:

- PASS；若未来下一个模块漏 Story/Ticket，必须在审批前被拦

### Task 6: 回归登录与忘记密码功能链

**Files:**
- Test: `osg-frontend/tests/e2e/auth-login.e2e.spec.ts`
- Test: `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
- Modify: `docs/plans/2026-03-06-delivery-loop-audit-report.md`

**Step 1: 重跑登录链**

Run:

```bash
cd osg-frontend && pnpm exec playwright test tests/e2e/auth-login.e2e.spec.ts --grep "@perm-s001-login-success|@perm-s001-logout|@perm-s003-superadmin-menu" --project=chromium
```

Expected:

- 不再出现 `ECONNREFUSED 127.0.0.1:28080`

**Step 2: 重跑忘记密码链**

Run:

```bash
cd osg-frontend && pnpm exec playwright test tests/e2e/forgot-password.e2e.spec.ts --grep "@perm-s002-forgot-flow|@perm-s002-forgot-entry|@perm-s002-forgot-form" --project=chromium
```

Expected:

- UI 项与 API 流程项都通过

**Step 3: 更新审计报告**

在 `docs/plans/2026-03-06-delivery-loop-audit-report.md` 中把“登录页视觉已收口、功能链因运行时契约缺失未收口”的判断更新为最新事实，并补充“旧 `~/.m2` 共享 jar 污染运行态”的根因说明。

**Step 4: Commit**

```bash
git add docs/plans/2026-03-06-delivery-loop-audit-report.md
git commit -m "test: reverify auth flows against runtime contract"
```

### Task 7: 最终门禁回归

**Files:**
- Test: `bin/ui-visual-gate.sh`
- Test: `bin/final-gate.sh`
- Test: `bin/final-closure.sh`

**Step 1: 跑视觉门禁**

Run:

```bash
bash bin/ui-visual-gate.sh permission
```

Expected:

- 登录页保持 PASS
- 不再因运行时口径错误导致后端不可达

**Step 2: 跑最终门禁**

Run:

```bash
bash bin/final-gate.sh permission
```

Expected:

- 若失败，失败点必须是真实功能/视觉问题，而不是后端未起或端口不一致

**Step 3: 跑最终收尾**

Run:

```bash
bash bin/final-closure.sh permission --cc-mode optional
```

Expected:

- 不再因为开发态启动口径错误而阻塞

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: close runtime contract loop"
```

Plan complete and saved to `docs/plans/2026-03-06-backend-runtime-contract-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - 我按任务逐步落地并在每步后回归

**2. Parallel Session (separate)** - 新开会话按 `executing-plans` 执行

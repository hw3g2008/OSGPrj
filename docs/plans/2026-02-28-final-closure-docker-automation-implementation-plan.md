# Final Closure Docker Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 `all_stories_done` 后的收尾流程在 Docker 场景下可一键自动执行，并保证失败可诊断、结果可审计、流程不跳步。

**Architecture:** 以 `bin/final-closure.sh` 作为唯一编排器，按固定 8 步执行；后端启动策略由 `--backend-policy` 控制，Docker 启动命令从 `DOCKER_RUN_CMD` 或 `.claude/project/config.yaml` 解析；`/cc-review final` 仅做入口转发，避免职责膨胀。

**Tech Stack:** Bash, Python (yaml parser), Maven, pnpm, Playwright, Docker Compose, workflow markdown commands.

---

### Task 1: 对齐设计文档与入口文案

**Files:**
- Modify: `docs/plans/2026-02-28-final-closure-orchestrator-design.md`
- Modify: `.windsurf/workflows/final-closure.md`
- Modify: `.claude/commands/final-closure.md`
- Modify: `.windsurf/workflows/approve.md`
- Modify: `.claude/commands/approve.md`

**Step 1: 文档核对（不改代码）**

核对项：
- backend policy 是否明确区分 `auto` 与 `docker_only`
- Docker 命令来源优先级是否明确（`DOCKER_RUN_CMD > config.commands.ops.docker_run`）
- 是否明确 `final-gate` WARNING 命中即收尾失败
- `all_stories_done` 后唯一入口是否统一为 `/final-closure {module}`

**Step 2: 修正文档不一致点**

确保 workflow 文案与命令文案一致，避免 AI 在 `cc-review final` 与 `final-closure` 之间分叉。

**Step 3: 文档自检**

Run: `rg -n "cc-review final|final-closure|docker_only|DOCKER_RUN_CMD|all_stories_done" docs/plans .windsurf/workflows .claude/commands`

Expected:
- 文案存在且语义一致；
- 无旧流程残留（重型流程不再挂在 `cc-review final`）。

### Task 2: 实现 Docker 优先的后端准备策略

**Files:**
- Modify: `bin/final-closure.sh`
- Optional modify: `.claude/project/config.yaml`（仅当需要统一命令为 `docker compose up -d`）

**Step 1: 写失败场景验证脚本（最小可复现）**

在本地用环境变量构造场景（不跑全量 E2E）：
- 健康检查不可达 + `backend-policy=docker_only` + 未配置 Docker 命令，应 `exit 11`
- 健康检查不可达 + `backend-policy=auto` + Docker 命令可用，应先尝试 Docker 分支

**Step 2: 实现最小变更**

在 `Step 1 环境准备` 中调整逻辑：
- `auto`：health fail 后先尝试 Docker，Docker 不可用再回退 `mvn`
- `docker_only`：health fail 后仅允许 Docker，失败即退出

**Step 3: 验证语法与关键分支**

Run: `bash -n bin/final-closure.sh`

Expected: 语法通过。

Run: `rg -n "backend-policy|docker_only|DOCKER_RUN_CMD|commands\\.ops\\.docker_run|EXIT 11" bin/final-closure.sh`

Expected: 关键分支和失败语义均可定位。

### Task 3: 收尾门禁与审计产物闭环

**Files:**
- Modify: `bin/final-closure.sh`
- Verify only: `bin/final-gate.sh`
- Verify only: `bin/api-smoke.sh`

**Step 1: 统一 WARNING 判定**

确保 `final-closure` 使用日志 `grep` 判定以下业务 WARNING 为失败：
- `⚠️ WARNING: 后端未启动`
- `⚠️ @api E2E 已跳过`

**Step 2: 审计产物硬校验**

保留并校验以下产物：
- `final-gate-{module}-{date}.log`
- `api-smoke-{module}-*.md`
- `osg-frontend/playwright-report/`
- Docker 分支命中时 `final-closure-docker-boot-{module}-{date}.log`

**Step 3: 失败码校验**

Run: `rg -n "fail_exit 1[0-6]|exit 1[0-6]" bin/final-closure.sh`

Expected: 10/11/12/13/14/15/16 均有明确触发点。

### Task 4: 端到端演练与回归检查（Docker 场景）

**Files:**
- Verify only: `bin/final-closure.sh`
- Verify only: `bin/final-gate.sh`
- Verify only: `osg-spec-docs/tasks/audit/*`

**Step 1: Docker 场景执行（目标流程）**

Run: `bash bin/final-closure.sh permission --cc-mode optional --backend-policy docker_only`

Expected:
- 后端可达；
- final-gate 无业务 WARNING；
- traceability 与 integration assertions 通过；
- 审计报告生成。

**Step 2: 结论核验**

Run: `ls -lt osg-spec-docs/tasks/audit/final-closure-permission-*.md | head -n1`

Expected: 产物存在，结论为 `PASS` 或 `PARTIAL`（仅允许 optional CC/cleanup warning 触发 PARTIAL）。

**Step 3: 回归检查**

Run: `bash bin/final-gate.sh permission`

Expected: 与编排器内执行行为一致，无新增回归。

### Task 5: 变更收口与交付说明

**Files:**
- Modify: `docs/plans/2026-02-28-test-excellence-closure-live-checklist.md`

**Step 1: 更新 live checklist 状态**

将已完成项改为 `DONE`，并附上最新审计产物路径。

**Step 2: 最终核对**

Run: `git status --short`

Expected: 仅出现本轮预期文件变更。

**Step 3: 交付摘要**

输出：
- 入口命令
- 必填参数与默认值
- Docker 严格模式推荐命令
- 失败码对照表

# Test Excellence Closure Live Checklist (2026-02-28)

## Scope

- Baseline plan: `docs/plans/2026-02-27-test-excellence-closure-plan.md`
- Evidence method: repository artifact scan + key rule grep
- This checklist does not re-run heavy gates; it only judges completion based on current artifacts and recorded audit docs.

Legend:
- `DONE`: implemented and evidence exists
- `PARTIAL`: mostly implemented, but hard acceptance evidence is still missing
- `PENDING`: not implemented

## Task Status

| Task | Status | Evidence | Gap / Note |
|---|---|---|---|
| Task 1: baseline freeze | DONE | `osg-spec-docs/tasks/audit/final-gate-baseline-2026-02-27.md` exists; includes baseline command results and gap list | None |
| Task 2: Playwright engineering | PARTIAL | `osg-frontend/playwright.config.ts`; 6 specs under `osg-frontend/tests/e2e/`; `osg-frontend/package.json` has `test:e2e*` scripts | Full `@api` E2E pass evidence is still pending (current validation doc records `@api` as pending when backend unavailable) |
| Task 3: test case assetization | DONE | `permission-test-cases.yaml`, `permission-traceability-matrix.md`, `traceability_guard.py` all exist and are wired in `bin/final-gate.sh` step 4 | None |
| Task 4: terminal audit hardening | DONE | `story_runtime_guard.py` has all-stories terminal assert; `story_integration_assertions.py` has `last_event.state_to == STATE.current_step`; `workflow-engine/SKILL.md` documents transition-only rule | None |
| Task 5: final gate solidification | PARTIAL | `bin/final-gate.sh` + `bin/api-smoke.sh` created; `.claude/project/config.yaml` + `.claude/rules/testing.md` use `pnpm --dir osg-frontend test:e2e`; parent `pom.xml` includes `-XX:+EnableDynamicAgentLoading`; `api-smoke.sh` 已支持审计报告落盘 | `final-gate.sh` 仍允许后端不可达时走 SKIP 分支（由 `final-closure` 的 WARNING 兜底转 FAIL） |
| Task 6: D6 command hooks | DONE | `.windsurf/workflows/{split-ticket,next,verify,cc-review}.md` contain D6 hook rules (TC skeleton, automation command backfill, matrix update, final traceability checks) | None |
| Task 7: final regression and acceptance | PARTIAL | `osg-spec-docs/tasks/audit/final-gate-validation-2026-02-28.md` exists and records `bash bin/final-gate.sh` pass for available steps | No recorded evidence for `python3 .../story_integration_assertions.py`; full backend-on `api-smoke + @api E2E` acceptance still pending |

## Completion Snapshot

- Done: `4/7`
- Partial: `3/7`
- Pending: `0/7`

## Pending Verification Commands (Hard Acceptance)

Run in this order after backend is up:

```bash
# 0) backend health precheck
curl -sS --max-time 5 http://127.0.0.1:8080/actuator/health

# 1) full final gate (expect no WARNING/SKIP branch)
bash bin/final-gate.sh

# 2) story integration assertions (Task 7 required command)
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py

# 3) explicit api smoke verification (module-level)
bash bin/api-smoke.sh permission

# 4) explicit full e2e verification (@api included)
pnpm --dir osg-frontend test:e2e
```

Acceptance notes:
- If `bin/final-gate.sh` prints backend-unavailable warning and enters SKIP path, this checklist remains `PARTIAL` for Task 2/5/7.
- For strict closure, `api-smoke.sh` should also produce an audit artifact under `osg-spec-docs/tasks/audit/` as defined by the original plan contract.
- Final Gate 的 E2E 前端启动口径为 **Playwright `webServer` 自动拉起**（admin preview），不依赖 `3001-3005` 常驻前端进程。

## 2026-03-01 Final-Closure 增量校验

- `bin/final-closure.sh` 已支持：
  - `--backend-policy auto|docker_only`
  - `auto` 优先 Docker，失败回退托管后端
  - `docker_only` 严格失败语义（`EXIT 11`）
  - `final-gate` 业务 WARNING grep 兜底
  - Docker 启动日志产物校验（命中时）
- 轻量实测结果：
  - `docker_only`：`RC=11`（符合预期，严格模式下 Docker 启动失败即阻断）
  - `auto` + `DOCKER_RUN_CMD=false`：确认先走 Docker，再回退托管后端，最终因健康检查超时 `RC=11`
- 当前阻塞：
  - `.claude/project/config.yaml` 的 `commands.ops.docker_run=docker-compose up -d` 在仓库根目录执行报错：`no configuration file provided: not found`
  - 仓库内未发现可直接启动后端（8080）的 Docker Compose 编排文件，导致 `docker_only` 端到端闭环暂不可达

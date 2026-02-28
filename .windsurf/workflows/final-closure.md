---
description: 模块级最终收尾 — 启动后端 + 运行 final-gate + 收集审计产物
---

# 模块最终收尾

## 使用方式

```
/final-closure [module]
```

例如：`/final-closure permission`

## 前置条件

- `STATE.current_step == all_stories_done`
- 所有 Tickets/Stories 已完成
- `bin/final-gate.sh` 和 `bin/api-smoke.sh` 已存在

## 执行步骤

1. **检查前置状态**
   - 读取 `STATE.yaml`，确认 `workflow.current_step == all_stories_done`
   - 若非终态，提示先完成剩余 Stories

2. **启动后端服务**
   ```bash
   mvn -pl ruoyi-admin -am spring-boot:run >/tmp/osg-backend.log 2>&1 &
   BACK_PID=$!
   trap "kill $BACK_PID 2>/dev/null" EXIT
   ```

3. **等待健康检查通过**
   ```bash
   until curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; do
     sleep 2
   done
   echo "后端已就绪"
   ```
   超时 120 秒未通过即 FAIL。

4. **运行 Final Gate**
   ```bash
   bash bin/final-gate.sh
   ```
   包含 9 步：guard → event check → evidence guard → traceability → test → build → mvn → api-smoke → E2E。
   后端已启动，api-smoke 和 E2E 应走完整路径（非 SKIP）。

5. **运行集成断言**
   ```bash
   python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
   ```

6. **收集审计产物**
   确认以下文件已生成/更新：
   - `osg-spec-docs/tasks/audit/api-smoke-{module}-all-{date}.md`（api-smoke 自动生成）
   - `osg-frontend/playwright-report/`（E2E 报告）
   - 更新 `osg-spec-docs/tasks/audit/final-gate-validation-{date}.md`（手动或脚本）

7. **回填 skip_no_backend TC**
   - 读取 `{module}-test-cases.yaml`
   - 将 `skip_no_backend` 状态的 TC 更新为实际执行结果（pass/fail）
   - 同步更新追踪矩阵 `Latest Result`

8. **停止后端服务**
   ```bash
   kill $BACK_PID 2>/dev/null || true
   ```

9. **输出最终结论**
   - 列出所有步骤结果
   - 标注 WARNING/SKIP 项
   - 最终判定：**FULL PASS** / **PARTIAL PASS** / **FAIL**

## 一键命令（快捷方式）

```bash
bash -lc '
set -euo pipefail
mvn -pl ruoyi-admin -am spring-boot:run >/tmp/osg-backend.log 2>&1 &
BACK_PID=$!
trap "kill $BACK_PID" EXIT
until curl -fsS http://127.0.0.1:8080/health >/dev/null; do sleep 2; done
bash bin/final-gate.sh
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
'
```

## 注意事项

- 后端启动需要 MySQL 和 Redis 服务可用
- 首次启动可能需要 30-60 秒
- E2E 全量测试需要 Playwright 浏览器已安装（`pnpm --dir osg-frontend exec playwright install`）
- 此 workflow 在每个模块 `all_stories_done` 后执行一次

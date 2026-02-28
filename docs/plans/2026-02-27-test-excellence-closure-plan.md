# Test Excellence Closure Implementation Plan

> **Execution Note:** 使用 `implement-fix-plan` 按任务分批执行并逐轮校验。

**Goal:** 将当前 Ticket/Story 流程从“高质量”提升到“行业顶标”，补齐 E2E 工程化与终态审计闭环，并建立可追溯的详细测试用例体系。

**Architecture:** 采用“三层测试门禁 + 一条审计链”架构：Ticket 层做细粒度单元/组件验证，Story 层做集成与回归，Final 层做真实用户链路 E2E。所有结论统一落到 `workflow-events.jsonl` 与审计报告，确保状态可回放、证据可审计、结果可复现。

**Tech Stack:** pnpm workspace, Vitest, Maven Surefire/JUnit5, Playwright, YAML/JSON 审计产物, workflow guard scripts

---

## Scope and Success Criteria

### In Scope
- Playwright 工程化接入（脚本、配置、目录、首批用例）。
- `STATE.yaml` 与 `workflow-events.jsonl` 终态一致性强制闭环。
- 详细测试用例资产化（Ticket/Story/Final 三级）。
- 最终门禁顺序固定化，避免“临场自由发挥”。

### Out of Scope
- 大规模业务重构。
- 非 permission 模块的全量补测（先交付模板与框架能力）。

### Exit Criteria (Hard)
- `pnpm --dir osg-frontend test:e2e` 稳定通过。
- `story_runtime_guard.py` 与 `story_event_log_check.py` 全通过。
- `STATE.current_step == last(workflow-events.state_to)` 持续成立。
- AC→TC→Script→Result 追踪率 100%。

---

## 设计决策表

| # | 决策点 | 选项 | 选择 | 理由 |
|---|---|---|---|---|
| 1 | 工作流命令修改范围 | `.windsurf` only / `.windsurf + .claude` | `.windsurf` only | 当前执行面是 Windsurf，减少双维护漂移。命令入口仅改 `.windsurf/workflows/`；守卫脚本与引擎位于 `.claude/skills/` 属基础设施层，不受此限制。 |
| 2 | 后端未就绪时 E2E 策略 | 全部跳过 / 全部 mock / 分层执行 | 分层执行 | 保留前端链路验证能力，同时不放松 Final 真链路门禁。 |
| 3 | API 冒烟入口定义 | 分散脚本 / 单入口脚本 | `bin/api-smoke.sh` 单入口 | 便于复用、审计和统一 exit code。 |
| 4 | JDK21 Mockito 兼容处理 | 忽略告警 / 框架级兜底 | 框架级兜底 | 先校验 surefire 参数，避免环境差异导致误失败。 |

---

### Task 1: 基线冻结与失败快照

**Files:**
- Create: `osg-spec-docs/tasks/audit/final-gate-baseline-2026-02-27.md`

**Step 1: 记录当前门禁执行结果（基线）**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py --state osg-spec-docs/tasks/STATE.yaml --config .claude/project/config.yaml --state-machine .claude/skills/workflow-engine/state-machine.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets --proofs-dir osg-spec-docs/tasks/proofs --events osg-spec-docs/tasks/workflow-events.jsonl
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py --events osg-spec-docs/tasks/workflow-events.jsonl --state osg-spec-docs/tasks/STATE.yaml
pnpm --dir osg-frontend/packages/admin test
pnpm --dir osg-frontend/packages/admin build
mvn test -pl ruoyi-admin -am
```
Expected:
- 当前真实状态写入基线文档（通过项、失败项、告警项）。

**Step 2: 明确 gap 列表**

在基线文档中固定 2 个主 gap：
- E2E 工程未落地（规则在，工程脚本/配置不足）。
- 终态 `STATE` 与 events 可能漂移（必须硬封堵）。

---

### Task 2: Playwright 工程化接入（最小可运行）

**Files:**
- Modify: `osg-frontend/package.json`
- Create: `osg-frontend/playwright.config.ts`
- Create: `osg-frontend/tests/e2e/auth-login.e2e.spec.ts`
- Create: `osg-frontend/tests/e2e/dashboard.e2e.spec.ts`
- Create: `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
- Create: `osg-frontend/tests/e2e/roles.e2e.spec.ts`
- Create: `osg-frontend/tests/e2e/users.e2e.spec.ts`
- Create: `osg-frontend/tests/e2e/base-data.e2e.spec.ts`

**Step 1: 安装依赖并初始化目录**

Run:
```bash
pnpm --dir osg-frontend add -D @playwright/test
pnpm --dir osg-frontend exec playwright install
mkdir -p osg-frontend/tests/e2e
```
Expected:
- `@playwright/test` 安装完成。
- 浏览器驱动安装完成。

**Step 2: 添加统一脚本**

在 `osg-frontend/package.json` 增加：
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui-only": "playwright test --grep @ui-only",
    "test:e2e:api": "playwright test --grep @api",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

**Step 3: 添加 Playwright 配置**

`osg-frontend/playwright.config.ts` 关键项：
- `testDir: './tests/e2e'`（防止误扫 Vitest `__tests__`）。
- `reporter: [['html', { open: 'never' }], ['list']]`。
- `retries: process.env.CI ? 2 : 0`。
- `webServer.command` 使用 admin 可访问命令（建议 preview 模式）。
- `use.baseURL` 与 `webServer` 端口一致。

后端依赖策略（硬规则）：
- 用例标签分层：`@ui-only`（不依赖后端 API）、`@api`（依赖真实后端 API）。
- 后端未就绪时，只允许运行 `test:e2e:ui-only` 作为开发期反馈。
- Final gate 必须运行 `test:e2e` 全量（包含 `@api`），不得用 `ui-only` 结果代替。
- 若后端未就绪且进入 Final gate，直接 FAIL，不允许“跳过后补”。

**Step 4: 编写 6 条最小业务链路 E2E（补齐 P0）**

- `auth-login.e2e.spec.ts`：登录成功/失败。
- `forgot-password.e2e.spec.ts`：找回密码入口与步骤流转。
- `dashboard.e2e.spec.ts`：首页关键卡片、待办、快捷入口可见与可跳转。
- `roles.e2e.spec.ts`：角色新增/编辑/权限树联动/禁删约束。
- `users.e2e.spec.ts`：用户新增/编辑/状态切换/角色关联。
- `base-data.e2e.spec.ts`：基础数据查询/分页/筛选/异常态提示。

**Step 5: 执行并确认**

Run:
```bash
pnpm --dir osg-frontend test:e2e:ui-only
pnpm --dir osg-frontend test:e2e
```
Expected:
- `ui-only` 在后端未就绪时可独立通过。
- 全量 `test:e2e` 在后端就绪时通过并生成 `osg-frontend/playwright-report/`。

---

### Task 3: 详细测试用例资产化（Ticket/Story/Final）

**Files:**
- Create: `osg-spec-docs/tasks/testing/permission-test-cases.yaml`
- Create: `osg-spec-docs/tasks/testing/permission-traceability-matrix.md`
- Create: `.claude/skills/workflow-engine/tests/traceability_guard.py`

**Step 1: 建立测试用例主表（YAML）**

每条用例字段至少包含：
- `tc_id`
- `level` (`ticket|story|final`)
- `story_id`
- `ticket_id` (可空)
- `ac_ref`
- `preconditions`
- `steps`
- `expected`
- `automation` (script path + command)
- `priority`

**Step 2: 建立追踪矩阵（Markdown）**

矩阵列：
- `FR/AC`
- `TC-ID`
- `Auto Script`
- `Command`
- `Latest Result`
- `Evidence Ref`

**Step 3: 首批覆盖要求（permission）**

- 每条 AC 至少：`1 正向 + 1 负向 + 1 边界`。
- 安全敏感 AC（认证/权限）追加异常路径（重放/越权/高频失败）。

**Step 4: 关联现有 Ticket 证据**

将现有 `verification_evidence` 映射到 `TC-ID`，补齐缺失关系。

**Step 5: traceability 硬校验脚本（新增）**

新增 `traceability_guard.py`，校验以下硬规则：
- 每个 AC 至少映射 1 条 TC。
- 每条 TC 必须有 `automation.command`。
- 每条已执行 TC 必须有 `latest_result.evidence_ref`。
- 矩阵中的 `TC-ID` 与 YAML 用例主表一致。

Run:
```bash
python3 .claude/skills/workflow-engine/tests/traceability_guard.py \
  --cases osg-spec-docs/tasks/testing/permission-test-cases.yaml \
  --matrix osg-spec-docs/tasks/testing/permission-traceability-matrix.md
```
Expected:
- 追踪链完整率 100%，否则 FAIL。

---

### Task 4: 终态审计闭环硬化（防 STATE/events 漂移）

**Files:**
- Modify: `.windsurf/workflows/approve.md`
- Modify: `.claude/skills/workflow-engine/SKILL.md`
- Modify: `.claude/skills/workflow-engine/tests/story_runtime_guard.py`
- Modify: `.claude/skills/workflow-engine/tests/story_integration_assertions.py`

**Step 1: 统一末端推进规则**

规则：最后一个 Story 审批必须通过 `transition("/approve story", ..., "all_stories_done")`。
禁止在 workflow 中手写 `current_step/next_step`。

**Step 2: 增加强制 postcheck**

在终态检查中加入硬断言：
- `current_step == all_stories_done` 时，`next_step == null`。
- `last_event.state_to == all_stories_done`。
- 不满足即 FAIL。

**Step 3: 回归覆盖**

在 `story_integration_assertions.py` 增加断言：
- 最后一条事件必须与 `STATE.current_step` 一致。
- 终态审批路径不可跳过事件写入。

---

### Task 5: 最终门禁顺序固化（一键执行）

**Files:**
- Create: `bin/final-gate.sh`
- Create: `bin/api-smoke.sh`
- Modify: `.claude/project/config.yaml`
- Modify: `.claude/rules/testing.md`

**Step 1: 编写统一门禁脚本（严格顺序）**

`bin/final-gate.sh` 顺序固定：
```bash
set -euo pipefail
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py --state osg-spec-docs/tasks/STATE.yaml --config .claude/project/config.yaml --state-machine .claude/skills/workflow-engine/state-machine.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets --proofs-dir osg-spec-docs/tasks/proofs --events osg-spec-docs/tasks/workflow-events.jsonl
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py --events osg-spec-docs/tasks/workflow-events.jsonl --state osg-spec-docs/tasks/STATE.yaml
python3 - <<'PY'
import subprocess, sys, yaml
state = yaml.safe_load(open("osg-spec-docs/tasks/STATE.yaml", "r", encoding="utf-8"))
stories = state.get("stories", [])
if not stories:
    print("FAIL: STATE.stories 为空，无法执行全量证据校验")
    sys.exit(1)
for sid in stories:
    cmd = [
        "python3",
        ".claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py",
        "--state", "osg-spec-docs/tasks/STATE.yaml",
        "--stories-dir", "osg-spec-docs/tasks/stories",
        "--tickets-dir", "osg-spec-docs/tasks/tickets",
        "--story-id", sid,
    ]
    rc = subprocess.run(cmd).returncode
    if rc != 0:
        print(f"FAIL: done_ticket_evidence_guard 未通过，story={sid}")
        sys.exit(rc)
print("PASS: 全 Story done_ticket_evidence_guard 通过")
PY
python3 .claude/skills/workflow-engine/tests/traceability_guard.py --cases osg-spec-docs/tasks/testing/permission-test-cases.yaml --matrix osg-spec-docs/tasks/testing/permission-traceability-matrix.md
pnpm --dir osg-frontend/packages/admin test
pnpm --dir osg-frontend/packages/admin build
mvn test -pl ruoyi-admin -am
bash bin/api-smoke.sh permission
pnpm --dir osg-frontend test:e2e
```

`bin/api-smoke.sh` 契约（必须实现并写入脚本头注释）：
- 用法：`bash bin/api-smoke.sh <module> [story]`
- 入参：
  - `module` 必填（如 `permission`）
  - `story` 可选（如 `S-001`，为空表示模块全量冒烟）
- 依赖环境变量：
  - `BASE_URL` 默认 `http://127.0.0.1:8080`
  - `AUTH_TOKEN` 可选（需要鉴权接口时必填）
- 退出码约定：
  - `0` 全通过
  - `2` 参数错误
  - `3` 运行依赖缺失（curl/jq）
  - `4` HTTP 状态码断言失败
  - `5` 业务字段/错误码断言失败
- 产物：
  - 审计报告：`osg-spec-docs/tasks/audit/api-smoke-<module>-<story|all>-<date>.md`
  - 报告必须包含：命令、请求列表、断言、exit code、失败明细

最小实现骨架（v1）：
```bash
#!/usr/bin/env bash
set -euo pipefail

MODULE="${1:-}"
STORY="${2:-all}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [[ -z "${MODULE}" ]]; then
  echo "usage: bash bin/api-smoke.sh <module> [story]"
  exit 2
fi

command -v curl >/dev/null || exit 3
command -v jq >/dev/null || exit 3

# 示例：按 module/story 分发检查项（后续扩展为用例清单驱动）
resp="$(curl -sS -w '\n%{http_code}' "${BASE_URL}/health")"
body="$(echo "${resp}" | head -n1)"
code="$(echo "${resp}" | tail -n1)"

[[ "${code}" == "200" ]] || exit 4
echo "${body}" | jq . >/dev/null || exit 5

exit 0
```

**Step 2: 同步配置口径**

- `config.yaml testing.e2e.command` 改为 `pnpm --dir osg-frontend test:e2e`。
- `testing.md` 同步相同命令与报告路径。

**Step 2.5: JDK21 + Mockito 前置兼容检查（必做）**

在执行 `mvn test -pl ruoyi-admin -am` 前，检查父 POM surefire 配置：
- 必须包含：`-XX:+EnableDynamicAgentLoading`
- 缺失即 FAIL，先按 `docs/plans/2026-02-26-mockito-self-attach-fix-plan.md` 修复后再继续 Final gate。

**Step 3: 产出最终审计文档**

创建：`osg-spec-docs/tasks/audit/cc-review-final-<date>.md`，记录：
- 命令
- exit code
- 关键统计（tests pass 数、E2E pass 数）
- 报告路径

---

### Task 6: D6 命令挂点实施（执行责任收敛）

**Files:**
- Modify: `.windsurf/workflows/split-ticket.md`
- Modify: `.windsurf/workflows/next.md`
- Modify: `.windsurf/workflows/verify.md`
- Modify: `.windsurf/workflows/cc-review.md`

**Step 1: `/split ticket` 挂点**

要求：
- 生成/更新 `permission-test-cases.yaml` 中对应 TC 骨架。
- 初始写入 `latest_result.status: pending`。
- 若 AC 未映射 TC，直接 FAIL。

**Step 2: `/next` 挂点**

要求：
- 完成对应 TC 的 `automation.script` 与 `automation.command`。
- 执行结果回填 `latest_result`（`status` + `evidence_ref`）。
- 若仅写"code review/manual check"，直接 FAIL。

**Step 3: `/verify` 挂点**

要求：
- 回填 Story 级集成验证结果到追踪矩阵 `Latest Result`。
- 对 API Story 强制执行 `@SpringBootTest` 集成命令并写入 evidence。
- 若矩阵未更新，直接 FAIL。

**Step 4: `/cc-review final` 挂点**

要求：
- 强制读取追踪矩阵与最终审计报告。
- 任一 Story 缺少 `ticket/story/final` 三层证据即 FAIL。

**Step 5: 挂点回归验证**

Run:
```bash
python3 .claude/skills/workflow-engine/tests/traceability_guard.py --cases osg-spec-docs/tasks/testing/permission-test-cases.yaml --matrix osg-spec-docs/tasks/testing/permission-traceability-matrix.md
bash bin/final-gate.sh
```
Expected:
- 4 个命令挂点都可触发对应产物更新。
- traceability 与 final gate 均通过。

---

### Task 7: 回归与验收（最终验收，所有 Task 完成后执行）

**Files:**
- Create: `osg-spec-docs/tasks/audit/final-gate-validation-2026-02-27.md`

**Step 1: 执行全量回归**

Run:
```bash
bash bin/final-gate.sh
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```
Expected:
- 所有门禁命令通过。
- 集成断言通过。
- traceability_guard 通过（AC→TC→Script→Result 全链路完整）。

**Step 2: 验收打分（顶标）**

在验证文档中打分（必须量化）：
- 可追溯性（AC→TC→Script→Result）：100%
- 一致性（STATE↔events）：100%
- 自动化覆盖（Ticket/Story/Final）：>= 95%
- 稳定性（E2E flake）：< 1%

---

## Test Case Generation SOP (必须执行)

> 目标：把“需求验收标准”稳定转换为“可执行、可追溯、可审计”的测试用例，避免人工随意发挥。

### Step 0: 准备输入

输入源（必须齐全）：
- Story 验收标准：`osg-spec-docs/tasks/stories/S-*.yaml`
- Ticket 验收标准：`osg-spec-docs/tasks/tickets/T-*.yaml`
- PRD/SRS 约束：对应模块文档（permission）
- 现有自动化脚本：Vitest/Maven/Playwright 测试目录

输出物：
- `osg-spec-docs/tasks/testing/permission-test-cases.yaml`
- `osg-spec-docs/tasks/testing/permission-traceability-matrix.md`

### Step 1: AC 标准化编号

规则：
- Story AC 编号：`AC-{StoryID}-{序号}`，例如 `AC-S-007-01`
- Ticket AC 编号：`AC-{TicketID}-{序号}`，例如 `AC-T-051-03`
- 所有 TC 必须引用 `ac_ref`，禁止无 AC 来源的测试用例

门禁：
- 任意 AC 未编号 = FAIL（不可进入下一步）

### Step 2: 场景枚举（测试设计法）

对每条 AC 按以下方法生成候选场景：
- 等价类划分（有效/无效输入）
- 边界值分析（最小值、最大值、临界值）
- 决策表（多条件组合）

安全/权限相关 AC 追加：
- 越权访问
- 重放/重复提交
- 高频失败/限流相关场景

门禁：
- 每条 AC 最少 3 个场景（正向、负向、边界）

### Step 3: 分层落位（ticket/story/final）

落位规则：
- `ticket`：局部逻辑、组件行为、函数分支
- `story`：跨 Ticket 集成、接口契约、状态流转
- `final`：真实用户链路（E2E）

反模式（禁止）：
- 所有场景都放到 E2E
- 仅有 Ticket 测试，没有 Story/Final 验证

门禁：
- 每个 Story 至少 1 条 `story` 集成用例 + 1 条 `final` 冒烟用例

### Step 4: 生成 TC-ID 与用例实体

ID 规则：
- `TC-{MODULE}-{STORY}-{LEVEL}-{TYPE}-{序号}`
- 示例：`TC-PERM-S007-FINAL-NEG-001`

每条用例必须包含字段：
- `tc_id`
- `level`
- `story_id`
- `ticket_id`（可空）
- `ac_ref`
- `preconditions`
- `steps`
- `expected`
- `automation.script`
- `automation.command`
- `priority`

门禁：
- 缺任一必填字段 = FAIL

### Step 5: 自动化映射

映射要求：
- 每条 TC 必须映射到可执行脚本路径
- 每条 TC 必须有可独立执行命令（可带 `--grep`）
- 不允许“仅 code review”作为测试命令

门禁：
- `automation.command` 不可执行或无退出码证据 = FAIL

### Step 6: 追踪矩阵回填

在 `permission-traceability-matrix.md` 维护列：
- `FR/AC`
- `TC-ID`
- `Level`
- `Script`
- `Command`
- `Latest Result`
- `Evidence Ref`

门禁：
- 任意 AC 没有至少一个对应 TC = FAIL
- 任意 TC 没有 evidence_ref = FAIL（首次创建可标记 `pending`，执行后必须回填）

### Step 7: 执行与结果落盘

执行顺序（固定）：
1. Ticket 层（Vitest/Maven 单测）
2. Story 层（集成验证 + guard）
3. Final 层（Playwright E2E）

结果回填规则：
- 更新 `latest_result.status`（pass/fail）
- 更新 `latest_result.evidence_ref`（审计报告路径）
- 同步更新矩阵 `Latest Result`

门禁：
- 回填不完整 = 该 Story 不得进入 `/cc-review final`

### Step 8: 质量审计（每轮必须）

审计指标：
- AC 追踪率 = 100%
- TC 自动化映射率 = 100%
- 执行证据完整率 = 100%
- Flaky 用例比例 < 1%

不达标处理：
- 标记为 `verification_failed`
- 回到对应层补测，不允许“人工口头通过”

---

## Hard Mode Addendum (顶标强制)

### A. 终局配额目标（v3，模块成熟后启用）

| 优先级 | Ticket层最少TC | Story层最少TC | Final(E2E)最少TC | 合计最少TC |
|---|---:|---:|---:|---:|
| P0 | 6 | 3 | 2 | 11 |
| P1 | 4 | 2 | 1 | 7 |

执行规则：
- 该配额用于模块成熟阶段（v3）质量冲刺，不作为本轮 closure（v2）阻断条件。
- 本轮阻断以 B/C 节为准；v3 启用时再切换为 A 节阻断。
- P0 Story 在 v3 阶段必须包含至少 1 条负向 E2E（失败路径）。

### B. permission 模块首批 29 条强制用例（v2，当前阻断基线）

> 说明：以下 29 条是“当前轮次最小硬门槛”，不是上限。命令可在落地时细化为 `--grep` 标签执行。

| TC-ID | Level | AC Ref | 场景 | 自动化脚本/测试类 | 执行命令（示例） |
|---|---|---|---|---|---|
| TC-PERM-S001-TICKET-POS-001 | ticket | AC-S-001-01 | 正确账号+密码+验证码登录成功 | `src/__tests__/login.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/login.spec.ts` |
| TC-PERM-S001-TICKET-NEG-002 | ticket | AC-S-001-01 | 密码错误登录失败 | `src/__tests__/login.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/login.spec.ts` |
| TC-PERM-S001-TICKET-BND-003 | ticket | AC-S-001-02 | 验证码格式边界（4位、排除I/O/0/1） | `src/__tests__/login.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/login.spec.ts` |
| TC-PERM-S001-STORY-INT-004 | story | AC-S-001-04 | 首登强制改密弹窗不可关闭 | `SysLoginControllerTest` + 前端联测 | `mvn test -pl ruoyi-admin -am -Dtest=SysLoginControllerTest && pnpm --dir osg-frontend/packages/admin test src/__tests__/login.spec.ts` |
| TC-PERM-S001-FINAL-POS-005 | final | AC-S-001-01 | 登录成功后跳首页并展示授权菜单 | `tests/e2e/auth-login.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s001-login-success` |
| TC-PERM-S001-FINAL-NEG-006 | final | AC-S-001-07 | 退出登录后清除Token并返回登录页 | `tests/e2e/auth-login.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s001-logout` |
| TC-PERM-S002-TICKET-POS-007 | ticket | AC-S-002-01 | 邮箱发送验证码成功并开始倒计时 | `SysPasswordControllerTest` | `mvn test -pl ruoyi-admin -am -Dtest=SysPasswordControllerTest` |
| TC-PERM-S002-TICKET-NEG-008 | ticket | AC-S-002-02 | 错误验证码校验失败 | `SysPasswordControllerTest` | `mvn test -pl ruoyi-admin -am -Dtest=SysPasswordControllerTest` |
| TC-PERM-S002-TICKET-BND-009 | ticket | AC-S-002-03 | 新密码规则边界（8/20位，字母+数字） | `SysPasswordServiceTest` | `mvn test -pl ruoyi-framework -am -Dtest=SysPasswordServiceTest` |
| TC-PERM-S002-FINAL-POS-010 | final | AC-S-002-05 | 4步找回流程完整走通 | `tests/e2e/forgot-password.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s002-forgot-flow` |
| TC-PERM-S003-TICKET-POS-011 | ticket | AC-S-003-01 | 角色菜单过滤正确 | `src/__tests__/permission-menu.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/permission-menu.spec.ts` |
| TC-PERM-S003-TICKET-NEG-012 | ticket | AC-S-003-03 | 无权限路由拦截并提示 | `src/__tests__/permission-guard.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/permission-guard.spec.ts` |
| TC-PERM-S003-STORY-INT-013 | story | AC-S-003-02 | 分组内菜单全隐藏时分组标题隐藏 | `permission-menu` + `router` 联测 | `pnpm --dir osg-frontend/packages/admin test src/__tests__/permission-menu.spec.ts src/__tests__/router.spec.ts` |
| TC-PERM-S003-FINAL-POS-014 | final | AC-S-003-04 | 超级管理员可见全部菜单 | `tests/e2e/auth-login.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s003-superadmin-menu` |
| TC-PERM-S004-TICKET-POS-015 | ticket | AC-S-004-02 | 新增角色（名称唯一+至少1权限） | `src/__tests__/roles.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/roles.spec.ts` |
| TC-PERM-S004-TICKET-BND-016 | ticket | AC-S-004-03 | 权限树全选/半选/全取消联动 | `src/__tests__/roles.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/roles.spec.ts` |
| TC-PERM-S004-TICKET-NEG-017 | ticket | AC-S-004-05 | 员工数>0不显示删除按钮 | `src/__tests__/roles.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/roles.spec.ts` |
| TC-PERM-S005-TICKET-POS-018 | ticket | AC-S-005-03 | 新增用户成功且初始密码策略正确 | `src/__tests__/users.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/users.spec.ts` |
| TC-PERM-S005-TICKET-NEG-019 | ticket | AC-S-005-04 | 编辑用户用户名不可修改 | `src/__tests__/users.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/users.spec.ts` |
| TC-PERM-S007-FINAL-POS-020 | final | AC-S-007-01 | 仪表盘5卡片可见且可跳转 | `tests/e2e/dashboard.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s007-dashboard-cards` |
| TC-PERM-S004-STORY-INT-021 | story | AC-S-004-03 | 角色权限树变更后菜单权限实时生效 | `src/__tests__/roles.spec.ts` + 后端集成测试 | `mvn test -pl ruoyi-admin -am -Dtest=SysRoleControllerTest && pnpm --dir osg-frontend/packages/admin test src/__tests__/roles.spec.ts` |
| TC-PERM-S004-FINAL-POS-022 | final | AC-S-004-02 | 角色新增并分配权限后登录菜单可见性正确 | `tests/e2e/roles.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s004-role-flow` |
| TC-PERM-S005-STORY-INT-023 | story | AC-S-005-03 | 用户创建后角色与数据权限联动正确 | `src/__tests__/users.spec.ts` + 后端集成测试 | `mvn test -pl ruoyi-admin -am -Dtest=SysUserControllerTest && pnpm --dir osg-frontend/packages/admin test src/__tests__/users.spec.ts` |
| TC-PERM-S005-FINAL-POS-024 | final | AC-S-005-03 | 用户新增后可按权限访问目标功能 | `tests/e2e/users.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s005-user-flow` |
| TC-PERM-S006-TICKET-POS-025 | ticket | AC-S-006-01 | 基础数据查询与筛选返回正确 | `src/__tests__/base-data.spec.ts` | `pnpm --dir osg-frontend/packages/admin test src/__tests__/base-data.spec.ts` |
| TC-PERM-S006-STORY-INT-026 | story | AC-S-006-02 | 基础数据变更后页面缓存与接口数据一致 | `src/__tests__/base-data.spec.ts` + 后端集成测试 | `mvn test -pl ruoyi-admin -am -Dtest=SysDictDataControllerTest && pnpm --dir osg-frontend/packages/admin test src/__tests__/base-data.spec.ts` |
| TC-PERM-S006-FINAL-POS-027 | final | AC-S-006-03 | 基础数据链路从列表到详情到回写完整可用 | `tests/e2e/base-data.e2e.spec.ts` | `pnpm --dir osg-frontend test:e2e --grep @perm-s006-base-data-flow` |
| TC-PERM-S002-STORY-INT-028 | story | AC-S-002-04 | 验证码校验 + 密码重置接口联动一致 | `SysPasswordControllerTest` + `SysPasswordServiceTest` | `mvn test -pl ruoyi-admin -am -Dtest=SysPasswordControllerTest,SysPasswordServiceTest` |
| TC-PERM-S007-STORY-INT-029 | story | AC-S-007-01 | 仪表盘数据卡片与后端聚合接口字段一致 | `dashboard.spec.ts` + 后端聚合接口测试 | `pnpm --dir osg-frontend/packages/admin test src/__tests__/dashboard.spec.ts && mvn test -pl ruoyi-admin -am -Dtest=DashboardControllerTest` |

> 说明：表内后端集成测试类如不存在，必须先按 Story 创建对应 `*IntegrationTest`，不得降级为“仅前端用例”后放行。

### C. 阻断规则（硬门禁）

- 本节是 **v2 当前执行轮次** 的唯一阻断规则。
- 任意 P0 Story 缺少 `ticket/story/final` 任一层用例 = FAIL。
- 任意强制 TC 无可执行命令或无证据回填 = FAIL。
- 任意 AC 未被至少 1 条 TC 覆盖 = FAIL。
- 任意 Final(E2E) 用例连续 2 轮 flaky = FAIL（需先修稳定性再放行）。
- 出现手工修改 `STATE.yaml` 终态且无对应事件 = FAIL。
- 当前识别到的覆盖缺口按 **P0 缺口** 处理（不是 P1）：`S-004`、`S-005`、`S-006` 未补齐前不得进入 `/cc-review final`。

---

### D. API / CURL 质量保证（Ticket 阶段无整站运行）

> 目标：解决“Ticket 过程中程序未整体运行，如何保证 curl 有效”的问题。  
> 原则：**分层验证**，不把所有 API 风险压到最后。

#### D1. Ticket Gate（不要求整站运行）

适用：`backend / database / test` 且涉及 API 的 Ticket。

必须满足：
- 有可执行的接口契约验证命令（例如 `MockMvc/WebTestClient` 测试类）。
- 覆盖正向、负向、边界（至少 3 类）。
- `verification_evidence.command` 必须是可执行命令，且 `exit_code=0`。

命令示例：
```bash
mvn test -pl ruoyi-admin -am -Dtest=SysLoginControllerTest
mvn test -pl ruoyi-admin -am -Dtest=SysPasswordControllerTest
```

结论：
- Ticket 阶段不强制“真实 curl 打在线服务”。
- 先用控制器/服务测试保证接口语义正确（快速、稳定、可重复）。

#### D2. Story Gate（以 `@SpringBootTest` 集成为主）

触发：进入 `/verify` 前后（Story 级）。

必须满足：
- 执行 Story 对应的 Spring 集成测试（`@SpringBootTest`）。
- 校验项至少包含：接口契约、业务字段断言、错误码分支。
- 如环境允许，可追加 `bin/api-smoke.sh {module} {story}` 快速冒烟，但非 Story 阶段硬阻断项。

命令示例：
```bash
mvn test -pl ruoyi-admin -am -Dtest=*IntegrationTest
```

#### D3. Final Gate（全量 curl 套件）

触发：`all_stories_done`。

必须满足：
- `bin/final-gate.sh` 执行 `bin/api-smoke.sh permission` 全量冒烟。
- 全部通过才允许 `/cc-review final` 结论为 pass。

#### D4. API 用例生成时点（固定）

1. `/split ticket` 后：生成 API 用例骨架（仅定义 TC-ID、endpoint、断言点）。
2. `/next` 实现对应 Ticket 时：补齐请求/响应断言与命令。
3. `/verify`：执行 Story 级 `@SpringBootTest` 集成套件（可选追加 story api-smoke）。
4. `all_stories_done`：执行模块级 API 全量冒烟。

#### D5. No-Go 条件（API 专项）

- API Ticket 缺少可执行命令（仅写“code review/manual check”）= FAIL。
- API 测试只断言 200，不断言业务字段/错误码 = FAIL。
- Story 级未执行 `@SpringBootTest` 集成套件 = FAIL。
- Final gate 未执行 `api-smoke.sh` = FAIL。

#### D6. 命令挂点落地（必须执行）

> 实施细节见 **Two-Phase Rollout → Phase 2 → Task 6**。以下为规则定义。

将 D4 的时点绑定到框架命令：
- `/split ticket`：创建 API TC 骨架并写入 `permission-test-cases.yaml`（`latest_result.status=pending`）。
- `/next`：完成对应 TC 的 `automation.command` 与 `latest_result`。
- `/verify`：回填 Story 级 API 集成结果到矩阵 `Latest Result`。
- `/cc-review final`：读取矩阵 + 审计报告，未闭环即 FAIL。

对应修改文件（由 Task 6 执行）：
- `.windsurf/workflows/split-ticket.md`
- `.windsurf/workflows/next.md`
- `.windsurf/workflows/verify.md`
- `.windsurf/workflows/cc-review.md`

---

## Detailed Test Case Template (必须使用)

```yaml
tc_id: TC-PERM-S007-LOGIN-NEG-001
level: final
story_id: S-007
ticket_id: null
ac_ref: "S-007/AC-01"
priority: P1
preconditions:
  - "系统已启动"
  - "测试账号存在"
steps:
  - "打开登录页"
  - "输入错误密码"
  - "点击登录"
expected:
  - "提示账号或密码错误"
  - "不跳转到首页"
automation:
  script: "osg-frontend/tests/e2e/auth-login.e2e.spec.ts"
  command: "pnpm --dir osg-frontend test:e2e --grep \"login negative\""
latest_result:
  status: pass
  evidence_ref: "osg-spec-docs/tasks/audit/cc-review-final-2026-02-27.md"
```

---

## Risk Control

- 风险 1：E2E 不稳定（选择器易碎）
  - 对策：统一 `data-testid`，避免依赖文案/样式定位。
- 风险 2：门禁脚本被绕过
  - 对策：`/cc-review final` 只接受 `bin/final-gate.sh` 输出作为证据源。
- 风险 3：终态回填导致漂移
  - 对策：禁止手写 STATE 终态，必须通过 `transition()`。

---

## Two-Phase Rollout（分期执行）

### Phase 1（先收敛审计闭环，1-2 天）
- 完成 `transition` 终态一致性硬化（Task 4）。
- 完成 `bin/final-gate.sh` 与 `bin/api-smoke.sh` 最小可运行版本（Task 5）。
- 完成 JDK21 + Mockito 前置检查并固化到 final gate（Task 5 Step 2.5）。
- 验收标准：`STATE ↔ events` 一致性 100%，Final gate 可一键执行。

### Phase 2（补齐覆盖与资产化，2-4 天）
- 补齐 `S-004/S-005/S-006` 的 Story + Final 覆盖（Task 2 + Hard Mode B）。
- 完成 `permission-test-cases.yaml` 与追踪矩阵回填（Task 3）。
- 将 API Story gate 稳定为 `@SpringBootTest` 套件，Final gate 保留真实 curl 冒烟（Section D2/D3）。
- 完成 D6 命令挂点改造（Task 6）并执行最终回归验收（Task 7）。
- 验收标准：全部 P0 Story 满足 `ticket/story/final` 三层覆盖，且 evidence 完整率 100%。

---

## Commit Plan (建议)

1. `test: scaffold playwright e2e runner and base config`
2. `test: add permission e2e smoke cases for S-001~S-007 critical flows`
3. `test: add story integration cases for S-004/S-005/S-006`
4. `chore: add test case catalog and traceability matrix`
5. `fix: enforce all_stories_done terminal transition/event closure`
6. `chore: add final-gate and api-smoke baseline scripts`
7. `chore: wire D6 hooks into windsurf workflows (Task 6)`
8. `docs: add final gate validation and audit evidence (Task 7)`

---

## 自校验结果（implement-fix-plan Phase 3~5）

> 状态说明：📋 计划已定义 = 方案层面已写入；⏳ 待实施 = 需要代码落地；✅ 已实施 = 代码已落地并验证。

| 校验项 | 结论 | 状态 | 位置 |
|---|---|---|---|
| High-1: E2E 后端未就绪策略缺失 | 分层标签 `@ui-only`/`@api` + Final gate 硬规则 | 📋 计划已定义 | Task 2 Step 3/5 |
| High-2: `bin/api-smoke.sh` 被引用但未定义 | 补充脚本契约、退出码、产物格式、最小骨架 | 📋 计划已定义 | Task 5 Step 1 |
| High-3: `S-004/S-005/S-006` 缺少 Final/Story 覆盖 | 扩展 6 条 E2E 脚本 + 29 条强制 TC 表 | 📋 计划已定义 | Task 2 Step 4 + Hard Mode B |
| High-4: Hard Mode 配额与当前阻断口径冲突 | 拆分 v3 终局目标(A) 与 v2 当前阻断(B/C) | 📋 计划已定义 | Hard Mode A/B/C |
| Medium-1: JDK21 Mockito 风险未提及 | Final gate 前置兼容检查 `-XX:+EnableDynamicAgentLoading` | 📋 计划已定义 | Task 5 Step 2.5 |
| Medium-2: Final gate 只校验单 Story | 改为读取 `STATE.stories` 循环执行 | 📋 计划已定义 | Task 5 Step 1 |
| Medium-3: AC→TC 缺硬校验命令 | 新增 `traceability_guard.py` 并纳入 final gate | 📋 计划已定义 | Task 3 Step 5 + Task 5 |
| Medium-4: API 用例生成时点无命令挂点 | 新增 D6 规则 + Task 6 实施 | 📋 计划已定义 | D6 + Task 6 |
| Medium-5: 修改范围 `.windsurf`/`.claude` 口径 | 决策 #1 补充说明：命令入口 `.windsurf`，守卫脚本 `.claude` | ✅ 已实施 | 设计决策表 #1 |
| Low-1: Story 级 API 验证依赖手工起进程 | `@SpringBootTest` 主路径 + Final curl 冒烟分层 | 📋 计划已定义 | D2/D3 |
| Low-2: 缺设计决策与自校验节 | 新增"设计决策表"和"自校验结果" | ✅ 已实施 | 本节 |

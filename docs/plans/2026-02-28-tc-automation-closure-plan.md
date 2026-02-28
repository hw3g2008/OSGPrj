# TC 自动化闭环修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：将 D6 挂点从"流程规则"升级为"技能层自动化"，并修复 traceability_guard 与规则口径不一致、api-smoke 审计报告缺失。
- **验收标准**：
  1. `/split ticket` 执行后，`{module}-test-cases.yaml` 自动新增 TC 骨架（`status: pending`）
  2. `/next` 完成后，对应 TC 的 `automation.command` 和 `latest_result` 自动回填
  3. `/verify` 完成后，Story 级 TC 结果自动回填到追踪矩阵（由 /verify workflow 调用方负责，非 verify_story 纯函数）
  4. `traceability_guard.py` 对 `pending` 状态 TC 强制 FAIL，对未知状态也 FAIL
  5. `bin/api-smoke.sh` 无论成功/失败都自动生成审计报告文件
  6. 全量 `bash bin/final-gate.sh` 通过（当前环境下 api-smoke/E2E 允许 SKIP）

## 二、前置条件与假设

- 假设 1：TC YAML 文件格式已标准化（permission-test-cases.yaml 为模板）
- 假设 2：AI 执行 SKILL.md 时会按伪代码步骤逐步操作
- 假设 3：后端未启动时 api-smoke 和 @api E2E 继续走 SKIP 分支
- 假设 4：`verify_story()` 保持纯函数设计，TC 回填由调用方（/verify workflow）负责

## 三、现状分析

### 相关文件

| 文件 | 当前状态 | 问题 |
|------|---------|------|
| `ticket-splitter/SKILL.md` L124-428 | 输出覆盖矩阵但不写 TC YAML | D6 规则未落到技能层 |
| `deliver-ticket/SKILL.md` L445-462 | 只写 Ticket verification_evidence | 不写 TC 资产 |
| `verification/SKILL.md` L129 | verify_story 是纯函数 | ⚠️ 不可在此加 TC 回填（会破坏契约） |
| `.windsurf/workflows/verify.md` L31-34 | 有 D6 规则但 SKILL 无支撑 | 回填逻辑应在此调用方实现 |
| `traceability_guard.py` L99-100 | `status != "pending"` 跳过 pending | 不对 pending FAIL，也不拦未知状态 |
| `bin/api-smoke.sh` L36-37 | 输出 "通过" 后 exit 0 | 不生成审计报告，失败时无产物 |

### 上下游依赖

```
/split ticket → ticket-splitter/SKILL.md → TC YAML（新增骨架）
/next → deliver-ticket/SKILL.md → TC YAML（回填结果）
/verify → verify.md（调用方）→ TC 矩阵回填（verify_story 纯函数不改）
/cc-review final → traceability_guard.py → 校验 TC 完整性
bin/final-gate.sh → api-smoke.sh → 审计报告（成功和失败都必须落盘）
```

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | TC 骨架生成方式 | A: SKILL 伪代码描述 / B: 独立脚本 | A | SKILL 是 AI 的执行指南，加步骤即可，不需要额外脚本 |
| 2 | pending FAIL 的实现位置 | A: traceability_guard 内 / B: 新增独立检查函数 | A | 改动最小，在现有函数中加逻辑 |
| 3 | api-smoke 报告格式 | A: Markdown / B: JSON | A | 与现有审计文件保持一致（audit/*.md） |
| 4 | TC 矩阵回填位置 | A: verification/SKILL.md / B: /verify workflow 调用方 | **B** | verify_story 是纯函数，不可加副作用。回填放到 verify.md 的 Step 4 |
| 5 | TC 写入幂等策略 | A: 追加 / B: tc_id 唯一键 upsert | **B** | 防止重复 /split ticket 产生重复 TC。不覆盖非 pending 结果 |
| 6 | api-smoke 失败是否落盘 | A: 仅成功 / B: 成功+失败都落盘 | **B** | 审计链不可断，用 trap 收口 |

## 五、目标状态

### ticket-splitter 新增流程

```
[Phase 3 通过] → [输出覆盖矩阵] → [TC 骨架生成(新增)] → [更新 Story 和 STATE]
```

TC 骨架生成规则：
- 按 `tc_id` 唯一键 upsert（已有同 ID 的 TC 不覆盖）
- 新增 TC 初始 `latest_result.status: pending`
- 若 AC 未映射 TC → FAIL

### deliver-ticket 新增流程

```
[Step 7: 写 evidence] → [Step 7.5: TC 回填(新增)] → [Step 8: 更新 Ticket 状态]
```

TC 回填规则：
- 按 `tc_id` 匹配更新（upsert，不追加）
- 不覆盖 `status != pending` 的已有结果（保护历史证据）
- 回填字段：`automation.command`、`latest_result.status`、`latest_result.evidence_ref`

### /verify workflow TC 矩阵回填（调用方，非 verify_story 内部）

```
verify.md Step 4 已定义规则 → AI 执行时：
1. 读取 {module}-test-cases.yaml
2. 找到当前 Story 的所有 story 级 TC
3. 回填 latest_result（status + evidence_ref）
4. 同步更新追踪矩阵 Latest Result 列
```

> ⚠️ **不改 verification/SKILL.md**，verify_story() 保持纯函数。

### traceability_guard 新增逻辑

```python
# 状态枚举白名单
VALID_STATUSES = {"pass", "fail", "skip_no_backend", "pending"}

# 在 check_evidence_ref 中新增：
for tc in cases:
    status = tc.latest_result.status
    # 1. 未知状态 → FAIL
    if status not in VALID_STATUSES:
        FAIL(f"未知状态 '{status}'，必须为 {VALID_STATUSES}")
    # 2. pending → FAIL（必须先执行或标记 skip_no_backend）
    if status == "pending":
        FAIL(f"TC {tc_id} 仍为 pending，不可进入 final gate")
    # 3. skip_no_backend 必须带 evidence_ref
    if status == "skip_no_backend" and not tc.latest_result.evidence_ref:
        FAIL(f"TC {tc_id} skip_no_backend 但缺少 evidence_ref")
```

### api-smoke 新增逻辑

```bash
# 用 trap 确保成功/失败都生成报告
REPORT_DIR="osg-spec-docs/tasks/audit"
REPORT="${REPORT_DIR}/api-smoke-${MODULE}-${STORY}-$(date +%Y-%m-%d).md"
SMOKE_STATUS="unknown"
SMOKE_DETAIL=""

cleanup() {
  mkdir -p "${REPORT_DIR}"
  cat > "${REPORT}" << REOF
# API Smoke — ${MODULE} ${STORY} $(date +%Y-%m-%d)
## 结果: ${SMOKE_STATUS}
## 详情
${SMOKE_DETAIL}
REOF
  echo "审计报告已生成: ${REPORT}"
}
trap cleanup EXIT
```

## 六、执行清单

| # | 文件 | 位置 | 当前值 | 目标值 | 优先级 |
|---|------|------|--------|--------|--------|
| 1 | `ticket-splitter/SKILL.md` | L396 后（`print_coverage_matrix` 之后） | 无 TC 生成步骤 | 新增 `generate_tc_skeletons()` 伪代码块，含 upsert 规则（~20 行） | 🔴 High |
| 2 | `deliver-ticket/SKILL.md` | L452 后（写 evidence 之后） | 无 TC 回填步骤 | 新增 `backfill_tc_result()` 伪代码块，含 upsert + 保护非 pending（~15 行） | 🔴 High |
| 3 | `traceability_guard.py` | L90-113 `check_evidence_ref` 函数 | pending 被跳过，无状态白名单 | 新增：状态枚举白名单 + pending FAIL + unknown FAIL + skip_no_backend 必须带 evidence_ref（~15 行） | 🔴 High |
| 4 | `bin/api-smoke.sh` | 全局重构 | 无报告生成，失败无产物 | trap 收口 + 成功/失败都生成 audit 报告（~25 行） | 🟡 Medium |

> 注意：**不修改 verification/SKILL.md**（verify_story 保持纯函数）。verify.md 已有 D6 Step 4 规则，AI 执行时按规则操作即可。

## 七、验证命令清单

修改完成后必须依次执行以下命令确认通过：

```bash
# 1. traceability_guard 校验（pending 应 FAIL 或无 pending）
python3 .claude/skills/workflow-engine/tests/traceability_guard.py \
  --cases osg-spec-docs/tasks/testing/permission-test-cases.yaml \
  --matrix osg-spec-docs/tasks/testing/permission-traceability-matrix.md

# 2. api-smoke 成功路径（需后端，当前跳过）
# bash bin/api-smoke.sh permission
# 检查: osg-spec-docs/tasks/audit/api-smoke-permission-all-*.md 已生成

# 3. api-smoke 失败路径（后端未启动时）
bash bin/api-smoke.sh permission 2>/dev/null || true
# 检查: 即使失败，审计报告文件仍应生成

# 4. final-gate 全量
bash bin/final-gate.sh

# 5. story_integration_assertions
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

## 八、自校验结果

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 4 个修改项，每个独立明确 |
| G2 目标明确 | ✅ | 6 条验收标准可度量 |
| G3 假设显式 | ✅ | 4 条假设已列（含 verify_story 纯函数假设） |
| G4 设计决策完整 | ✅ | 6 个决策点有理由（含纯函数、upsert、失败落盘） |
| G5 执行清单可操作 | ✅ | 每项有文件/位置/目标值 |
| G6 正向流程走读 | ✅ | split ticket→TC 骨架→next→TC 回填→verify(调用方回填)→final gate→traceability pass |
| G7 改动自洽 | ✅ | SKILL 生成→调用方回填→guard 校验→api-smoke 落盘，链路闭合 |
| G8 简约不等于省略 | ✅ | 每个必要步骤都有，验证命令清单已补 |
| G9 场景模拟 | ✅ | 模拟 user-center：split ticket(TC骨架 upsert)→next(TC回填 upsert)→verify(矩阵回填)→cc-review final→traceability pass |
| F1 文件同步 | ✅ | SKILL 改了→workflow 已有 D6→guard 同步改→verify.md 不改（已有 Step 4） |
| C1 根因定位 | ✅ | 根因是 D6 停留在规则层，修的是技能层落地 |
| **CC-R1 纯函数保护** | ✅ | verify_story() 不改，回填在调用方 verify.md |
| **CC-R2 状态枚举白名单** | ✅ | VALID_STATUSES + unknown FAIL + skip 必须带 ref |
| **CC-R3 失败也落盘** | ✅ | api-smoke 用 trap 收口 |
| **CC-R4 幂等/去重** | ✅ | tc_id 唯一键 upsert，不覆盖非 pending |
| **CC-R5 验证命令清单** | ✅ | §七 列出 5 条可执行命令 |

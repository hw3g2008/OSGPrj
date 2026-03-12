# Upstream Dependency Check Fix Plan

> **For Claude/Windsurf:** 先按本计划讨论并裁决，不直接跳过到实现。  
> **目标类型:** workflow-framework fix（brainstorm Phase 1 dependency gate + module readiness projection）

Date: 2026-03-12
Status: Draft
Owner: workflow-framework
Design Doc: `docs/plans/2026-03-12-upstream-dependency-check-design.md`
Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

---

## 0. 执行快照

### 0.1 文档边界

本计划负责：

1. 把 `/brainstorm` 的上游依赖检查收敛为正式框架计划
2. 为“模块级 readiness”补齐单一机读投影与生命周期同步
3. 为 `phase1_dependency` 决策分支补齐 guard / regression / 文档同步

本计划不负责：

1. 修改 HTML truth source 规则
2. 设计新的业务依赖 DSL
3. 改写现有 Phase 0/Phase 4 语义

### 0.2 当前仓库回溯事实

按当前 repo 核验：

1. `/brainstorm` 在进入 Phase 1 前已经有既有门控：
   - `prototype-extraction` 产物完整性
   - `overlay surface inventory` 存在性检查
   - `security_contract_guard.py --stage brainstorm`
2. `/approve brainstorm` 当前只支持 `phase0` 与 `phase4`
3. `STATE.yaml` 只表达当前 workflow / current requirement，不是模块级 readiness 表
4. `truth_sync_guard.py` 管的是 HTML truth / decision 字段，不覆盖模块完成状态
5. 现有 stage regression 主要依赖：
   - `gate_verification.py`
   - `story_regression.py`
   - `story_integration_assertions.py`

### 0.3 与上位标准关系

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的 design/plan 分离要求。
2. 本计划对应的唯一 design 为 `docs/plans/2026-03-12-upstream-dependency-check-design.md`。
3. 若本计划与上位标准冲突，以上位标准为准，并先更新上位标准再更新本计划。

---

## 1. Goal

把当前“靠记忆判断上游依赖”的 brainstorming 行为，升级为可执行、可阻塞、可回放的框架能力。

目标完成后：

1. `/brainstorm` Phase 1 会输出依赖报告
2. `provider 未知` 或 `provider 未就绪` 会 fail-closed 阻断
3. 阻断统一复用 `brainstorm_pending_confirm + /approve brainstorm`
4. 模块 readiness 由 workflow lifecycle 投影维护，不再靠人工推断

## 2. Existing-Entrypoint Inventory

### 2.1 Workflow entrypoints

1. `.claude/skills/brainstorming/SKILL.md`
2. `.claude/commands/brainstorm.md`
3. `.claude/commands/approve.md`
4. `.claude/skills/workflow-engine/state-machine.yaml`
5. `.claude/skills/workflow-engine/SKILL.md`

### 2.2 Existing guards

1. `bash bin/check-skill-artifacts.sh prototype-extraction ...`
2. `security_contract_guard.py --stage brainstorm`
3. `truth_sync_guard.py`
4. `requirements_coverage_guard.py`
5. `story_ticket_coverage_guard.py`

### 2.3 Existing regression / integration checks

1. `.claude/skills/workflow-engine/tests/gate_verification.py`
2. `.claude/skills/workflow-engine/tests/story_regression.py`
3. `.claude/skills/workflow-engine/tests/story_integration_assertions.py`
4. `.claude/skills/workflow-engine/tests/plan_standard_guard.py`

## 3. Truth Model And Sync Policy

### 3.1 Split responsibilities

1. HTML truth source
   - 仍由 `config.yaml.prd_process.truth_source` 负责
   - 继续是 UI/需求衍生链路的单一真值
2. module readiness projection
   - 新增 `osg-spec-docs/tasks/module-readiness.yaml`
   - 只负责表达“某模块当前是否能被下游作为硬依赖消费”

### 3.2 Hard readiness rule

一个 provider 模块只有同时满足下面条件，才算 hard dependency ready：

1. `delivery_state == all_stories_done`
2. `hard_dependency_ready == true`
3. `srs_path` 存在

其他状态即使记录在 registry 中，也不能被 dependency gate 当作 ready。

### 3.3 Lifecycle sync points

`module-readiness.yaml` 必须由 workflow lifecycle 维护，最少包含以下同步点：

1. `/brainstorm` 成功结束
   - 写 research projection
   - 不升级 `hard_dependency_ready`
2. `/approve story` 推进到 `all_stories_done`
   - 升级模块为 `hard_dependency_ready=true`
3. 任何让模块离开完成态的框架入口
   - `/rollback`
   - reset / reopen / migrate 类入口
   - 必须同步降级 readiness

如果无法在生命周期里维护它，就不能把它定义为单一真值。

## 4. Guard Reuse / Collision Audit

### 4.1 Reuse

本计划明确复用而不替代的 guard：

1. `prototype-extraction` 产物完整性 gate
2. `overlay surface inventory` gate
3. `security_contract_guard.py --stage brainstorm`
4. `transition()` 的 preflight / postcheck / event write

### 4.2 Collision rules

1. dependency gate 插在既有 Phase 1 前门控之后，不得前移
2. `module-readiness` 不得并入 `prd_process.truth_source`
3. `truth_sync_guard.py` 不承担 module readiness 漂移校验，避免语义混淆
4. `phase1_dependency` 只能作为 `/approve brainstorm` 的新 source，不能破坏 `phase0` / `phase4`

### 4.3 New guard requirements

需要新增：

1. `module_readiness_guard.py`
   - 校验 schema
   - 校验 ready module 的 `srs_path`
   - 校验 registry 与 workflow done state 不冲突
2. `module_readiness_guard_selftest.py`
   - 防止 guard 变成永远返回 0

## 5. Source-Stage Integration Path

本能力不是新的 source-stage generator，而是 source-stage 之后的 workflow projection gate。

固定顺序：

1. HTML truth / prototype derivation 先过关
2. security contract 先过关
3. dependency gate 再读取 `module-readiness.yaml`
4. 通过后再收集上游 SRS/接口定义进入 Phase 1 context

这样可以避免把 HTML truth 问题误判成 dependency 问题。

## 6. Stage-Regression Verification

不能只写最终 gate，必须补阶段级回归。

### 6.1 `/brainstorm` / `/approve brainstorm`

扩展 `gate_verification.py`：

1. 覆盖 `phase1_dependency` source
2. 断言 `phase0` / `phase4` 原路径不回归
3. 断言 `pending_decisions` 未裁决时拒绝继续

### 6.2 Story terminal completion

扩展 `story_regression.py`：

1. 最后一个 Story 完成后，断言 module readiness 升级
2. 非最后一个 Story 完成时，断言 module readiness 不提前升级

### 6.3 Integration assertions

扩展 `story_integration_assertions.py`：

1. 注册 readiness guard
2. 注册 phase1_dependency regression
3. 确保新增测试脚本存在且可执行

### 6.4 Plan verification

正式计划文档必须满足：

1. `plan_standard_guard.py --docs docs/plans/2026-03-12-upstream-dependency-check-fix-plan.md` 通过
2. `Design Doc`、`Standard Baseline`、`与上位标准关系` 都在文档中显式存在

## 7. Execution Order

1. 新建 design 文档，固定架构决策与边界
2. 新建正式 plan 文档，迁移旧临时文档内容
3. 为旧文档写迁移说明，消除双真相
4. 在计划中补齐 `module-readiness` 生命周期同步要求
5. 在计划中补齐 guard reuse / collision audit
6. 在计划中补齐 stage-regression verification 设计
7. 运行 `plan_standard_guard` 验证正式 plan 文档

## 8. Detailed Task List

| ID | 文件 | 当前状态 | 目标改动 |
|---|---|---|---|
| A1 | `docs/plans/2026-03-12-upstream-dependency-check-design.md` | 不存在 | 新建设计文档，沉淀架构决策 |
| A2 | `docs/plans/2026-03-12-upstream-dependency-check-fix-plan.md` | 不存在 | 新建正式计划文档，替代临时文档 |
| A3 | `docs/upstream-dependency-check-fix-plan.md` | 临时正文 | 改成迁移说明，避免双真相 |
| B1 | `.claude/project/config.yaml` | 无 `module_readiness` 路径 | 计划要求新增路径 |
| B2 | `.claude/templates/` | 无 readiness 模板 | 计划要求新增模板 |
| B3 | `osg-spec-docs/tasks/module-readiness.yaml` | 不存在 | 计划要求新增 registry |
| C1 | `.claude/skills/brainstorming/SKILL.md` | 无 dependency gate | 计划要求新增 Phase 1 gate |
| C2 | `.claude/commands/approve.md` | 仅 `phase0/phase4` | 计划要求新增 `phase1_dependency` |
| C3 | `.claude/commands/brainstorm.md` | 缺少 dependency gate 描述 | 计划要求同步用户可见流程 |
| D1 | `.claude/skills/workflow-engine/tests/` | 无 readiness drift guard | 计划要求新增 guard/selftest |
| D2 | `.claude/skills/workflow-engine/tests/gate_verification.py` | 无 `phase1_dependency` 回归 | 计划要求扩展 |
| D3 | `.claude/skills/workflow-engine/tests/story_regression.py` | 无 readiness 升级断言 | 计划要求扩展 |
| D4 | `.claude/skills/workflow-engine/tests/story_integration_assertions.py` | 未登记 readiness 链路 | 计划要求扩展 |

## 9. DoD

本计划只有在以下条件都满足时，才算完成文档化收口：

1. 正式 design 文档存在并与本计划一一对应
2. 正式 plan 文档存在，且通过 `plan_standard_guard`
3. 旧临时文档不再承载主内容，只保留迁移说明
4. 文档已明确 `module-readiness` 的写入点、读点、回退点
5. 文档已明确 guard reuse / collision audit
6. 文档已明确 stage-regression verification，而不是只写 final gate
7. 文档不再保留任何“单文件即可收口”或“做一次初始化即可长期成立”的过度简化表述

## 10. Legacy Doc Migration

旧文档 `docs/upstream-dependency-check-fix-plan.md` 处理方式：

1. 保留文件路径
2. 删除正文型方案描述
3. 改为显式迁移说明：
   - design 在哪里
   - plan 在哪里
   - 旧文件不再是 authoritative source

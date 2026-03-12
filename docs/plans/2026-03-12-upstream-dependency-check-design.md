# Upstream Dependency Check Design

Date: 2026-03-12
Status: Draft
Owner: workflow-framework

## Scope

为 `/brainstorm` 增加可执行的上游依赖检查，并把“模块是否可作为硬依赖使用”从口头判断收敛为机器可读的 workflow projection。

本设计覆盖：

1. `brainstorm` Phase 1 前的依赖检查插入点
2. 模块级 readiness projection 的单一真值模型
3. `brainstorm_pending_confirm + /approve brainstorm` 复用路径
4. readiness 同步、回退、guard 与 regression 的框架闭环

## Non-Goals

1. 不改变 HTML prototype 作为 UI 单一真值的既有规则
2. 不把 `module-readiness` 升级为新的业务需求真值源
3. 不在本轮设计中实现声明式模块依赖语言；`module-readiness.yaml` 是 workflow 投影产物，不是独立维护的依赖声明
4. 不替代现有 `security_contract_guard`、`truth_sync_guard`、coverage guards

## 1. Problem

当前 `/brainstorm` 在 Phase 1 前有 source-stage 和 security guard，但没有“上游依赖是否已准备好”的框架级检查。

这带来三个具体风险：

1. 新模块引用角色、接口、共享组件时，只靠 AI 和记忆判断 provider 是否已完成
2. `STATE.yaml` 是全局 workflow 状态，不是按模块索引的 readiness 表，不能回答跨模块依赖问题
3. 即使识别出依赖缺口，也没有把它接入现有统一出口，只能临时人工判断

## 2. Existing Entrypoint Inventory

依赖检查必须服从当前真实入口与状态机，而不是绕开它们。

主要入口：

1. `/brainstorm`
   - Phase 0 后先过 `prototype-extraction` 产物完整性门控
   - 再过 `security_contract_guard.py --stage brainstorm`
   - 然后才进入 Phase 1
2. `/approve brainstorm`
   - 当前只按 `phase0` 与 `phase4` 决策来源分支处理
3. `/approve story`
   - 最后一个 Story 完成后推进 `all_stories_done`
4. `/rollback`
   - 当前支持多个 workflow 状态回退；任何未来能让模块退出“已完成”语义的入口都必须同步 readiness

核心约束：

1. 所有会推进 `workflow.current_step` 的动作必须经过 `transition()`
2. 新能力不能跳过现有 preflight / postcheck / event log 机制
3. 新增的 module readiness 必须是 workflow projection，而不是平行真值

## 3. Decision

采用两层模型：

1. `HTML prototype truth`
   - 继续由 `config.yaml.prd_process.truth_source` 管理
   - 负责页面、结构、视觉、衍生工件回源
2. `module readiness projection`
   - 新增 `osg-spec-docs/tasks/module-readiness.yaml`
   - 负责表达“某模块当前能否作为硬依赖输入到别的模块”

这不是双真值。两者解决的是不同问题：

1. HTML truth 回答“UI/需求从哪里来”
2. module readiness 回答“某模块当前是否完成到足以被下游消费”

## 4. Readiness Truth Model

`module-readiness.yaml` 是模块级 readiness 的唯一机读投影，但它必须被定义为 workflow 的衍生产物，而不是独立维护的手工台账。

推荐结构：

```yaml
modules:
  permission:
    delivery_state: all_stories_done
    hard_dependency_ready: true
    prd_path: osg-spec-docs/docs/01-product/prd/permission/
    srs_path: osg-spec-docs/docs/02-requirements/srs/permission.md
    updated_from_event: /approve story
    last_updated_at: "2026-03-12T00:00:00Z"
```

判定规则：

1. `hard_dependency_ready=true` 的必要条件是：
   - `delivery_state == all_stories_done`
   - `srs_path` 存在
2. 其他状态可以记录，但不能作为硬依赖 ready
3. `provider` 不存在、未注册、或投影状态与实际 workflow 冲突，都视为 fail-closed

## 5. Sync Model

这是本设计的关键点。`module-readiness` 不能只在一个阶段写一次，而必须由 workflow 生命周期维护。

### 5.0 Bootstrap

首次创建 `module-readiness.yaml` 的时机：

1. 已完成模块（如 permission）：由 `/migrate test-assets` 在迁移过程中一次性初始化，根据当前 workflow 状态推导 `hard_dependency_ready`
2. 新模块：由 `/brainstorm` 成功结束时首次写入（research projection，`hard_dependency_ready=false`）
3. 文件不存在时 dependency gate 行为：视为空 registry，所有 provider 查询返回“未注册”→ fail-closed

### 5.1 Write Points

必须覆盖以下写入点：

1. `/brainstorm` 成功结束
   - 允许写 research projection，例如 `brainstorm_done`
   - 但此时 `hard_dependency_ready` 仍为 `false`
2. `/approve story` 推进到 `all_stories_done`
   - 把模块升级为 `hard_dependency_ready=true`
3. 任何把模块重新拉回未完成态的入口
   - 包括现有 `/rollback` 规则
   - 以及未来对已完成模块做 reset / migrate / reopen 的框架入口
   - 必须降级 `hard_dependency_ready`

### 5.2 Read Points

`/brainstorm` 的依赖检查只读 `module-readiness.yaml`，不再临时拼 `STATE.yaml + stories/*.yaml`。

## 6. Unified Exit

依赖缺口不引入新的 workflow state，统一复用：

1. `brainstorm_pending_confirm`
2. `{module}-DECISIONS.md`
3. `/approve brainstorm`

新增决策 source：

1. `phase1_dependency`

新增裁决语义：

1. `先做上游`
2. `纳入本轮范围`
3. `降级处理`

`provider 未知` 与 `provider 未就绪` 同级阻塞，不能以 warning 形式放行。

### 6.1 隔离约束

`/approve brainstorm` 处理 `phase1_dependency` source 时：

1. 不能读取 `phase0` / `phase4` 的 resolved 裁决
2. 不能触发 PRD 更新（那是 `phase0` 的职责）
3. 只处理 3 种裁决：先做上游 / 纳入本轮范围 / 降级处理
4. 裁决后重新调用 `/brainstorm {module}`，由 brainstorm 管理最终状态

## 7. Guard Reuse / Collision Audit

本设计不替换已有 guard，只在它们之后增加一层新的 readiness 守卫。

### 7.1 Reused

1. `prototype-extraction` 产物完整性门控
2. `overlay surface inventory` 存在性约束
3. `security_contract_guard.py --stage brainstorm`
4. `transition()` 的 preflight / postcheck / event write 链路

### 7.2 New

需要新增两类验证：

1. `module_readiness_guard.py`
   - 校验 registry 结构合法
   - 校验 ready 模块的 `srs_path` 存在
   - 校验 registry 与 workflow terminal state 不冲突
2. `phase1_dependency` regression
   - 校验 `/approve brainstorm` 新 source 分支不会破坏既有 `phase0` / `phase4`

### 7.3 Collision Rules

1. `module-readiness` 不能写进 `prd_process.truth_source`
2. `truth_sync_guard` 继续只负责 HTML truth / decision fields，不负责模块 readiness
3. dependency check 插入在既有 Phase 1 前门控之后，避免把 source-stage 错误伪装成 dependency 错误

## 8. Regression Strategy

必须有阶段级回归，不允许只依赖最终 gate。

最少覆盖：

1. `gate_verification.py`
   - 新增 `/approve brainstorm` 的 `phase1_dependency` 分支模拟
2. `story_regression.py`
   - 新增最后一个 Story 完成后 readiness 升级断言
3. `story_integration_assertions.py`
   - 注册新的 readiness guard / regression 脚本
4. `plan_standard_guard.py`
   - 正式 plan 文档必须通过

## 9. Expected Outcome

落地后，框架应具备下面的行为：

1. `/brainstorm` 在生成 SRS 前显式回答“上游是否 ready”
2. `provider 未知` 与 `provider 未完成` 都会被 fail-closed 阻断
3. 依赖阻塞继续走现有 `brainstorm_pending_confirm` 出口
4. module readiness 不再靠人脑记忆，而由 workflow lifecycle 持续投影维护
5. 新能力有对应 guard 和 regression，不是只改文档或 Skill 伪代码

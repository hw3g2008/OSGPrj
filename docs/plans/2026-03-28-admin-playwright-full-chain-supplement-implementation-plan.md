# Admin Playwright 全链路 Supplement Case 实施计划

## 1. 目标

按 `docs/plans/2026-03-28-admin-playwright-full-chain-supplement-design.md` 执行 admin 全链路 supplement case 升级，确保：

- supplement 成为单一增量台账
- 前端、后端、产品、环境问题不会再被拆成多套账
- 重新回归时可以直接看到每条 case 卡在哪一层

## 2. 原则

1. 不修改 `admin-test/` 下既有真源文件作为追平手段。
2. supplement 只做增量判定与分派，不替代原始真源。
3. 所有可见入口都按“可见即应有真实结果”判定。
4. `TriageLabel` 必须能直接映射责任域。
5. 最终验收看 case 是否闭环，而不是单侧完成度。

## 3. 执行阶段

### Phase 1：升级 supplement 台账

目标：

- 把 supplement 从前端 gap 表升级为全链路台账
- 引入 `needs_backend_support`
- 校正已有分类

输出：

- 更新后的 supplement TSV
- 更新后的 policy 文档

### Phase 2：重分拣现有 case

目标：

- 遍历当前 supplement case
- 识别哪些其实是后端能力缺失
- 保留产品确认项
- 保留环境阻断项

输出：

- 明确的四类 case 分布
- 每类的责任归属和回归门槛

### Phase 3：按责任域处理

目标：

- 前端 agent 只接 `quick_fix_frontend`
- 后端 agent 只接 `needs_backend_support`
- 产品确认项形成待裁决清单
- 环境项形成账号 / 夹具 / 文件需求清单

输出：

- 修复任务清单
- 后端支持清单
- 产品确认清单
- 环境补齐清单

### Phase 4：统一回归

目标：

- 完成后重新运行定向与运行态回归
- 重新统计每条 case 的最终状态

输出：

- 最新 supplement 状态
- 是否可以进入下一轮更广范围回归

## 4. 当前批次的直接动作

### Task A：台账重构

- 复核 `admin-test/2026-03-28-admin-gap-supplement-cases.tsv`
- 复核 `admin-test/2026-03-28-admin-gap-supplement-policy.md`
- 把纯后端能力缺口从 `quick_fix_frontend` 中剥离出来

### Task B：责任域分派

- 生成前端 agent 提示词
- 生成后端 agent 提示词
- 生成产品确认清单

### Task C：执行与回归

- 先处理前端或后端中最影响主链通过的项
- 修完后重新跑本地定向回归
- 必要时再跑一轮 admin P0 验收

## 5. 通过条件

本计划完成后，应达到：

1. supplement 台账已经能完整表达全链路卡点。
2. 不再出现“前端已修但 case 仍说不清是否通过”的情况。
3. 每条 case 都能明确归属到前端、后端、产品或环境。
4. 后续 agent 可以直接按分类接手，不需要二次拆题。

## 6. 非目标

以下不在本计划中直接完成：

- 一次性修完整个 admin 全站
- 直接裁定所有产品口径问题
- 在没有夹具和账号时强行把 Block 判成 Pass

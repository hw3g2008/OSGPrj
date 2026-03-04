# E2E Framework Anti-False-Green Design

Date: 2026-03-02  
Status: Approved (Implemented on 2026-03-03)  
Owner: workflow-framework

## 1. 背景

E2E 曾出现“假绿”风险：`@api` 断言不够硬、执行入口分叉、失败证据不完整，导致流程看起来通过但业务并未真实闭环。

## 2. 设计目标

1. `@api` 用例必须基于真实后端响应裁决，不允许弱断言通过。
2. 验收入口统一，避免裸命令旁路。
3. 失败证据可审计、可回放。
4. 前置条件失败必须快速失败，不进入后续步骤盲跑。

## 3. 非目标

1. 不负责视觉基线一致性（由 Visual Contract 设计负责）。
2. 不把业务规则硬编码进框架（仅固化通用执行约束）。

## 4. 核心设计决策

### D1. 单一 E2E 门禁入口

统一通过 `bin/e2e-api-gate.sh` 执行 E2E 门禁，`final-gate` 只调用该入口，不再直接裸跑 `pnpm/playwright` 作为验收依据。

### D2. 双层守卫

1. 静态守卫：`e2e_api_guard.py` 检测 `@api` 用例的弱模式。
2. 运行时守卫：`final-gate` 前置契约校验 + E2E gate。

### D3. 前置预检硬阻断

E2E 前固定执行：
1. 登录契约预检（token 结构）
2. 登录锁预检（`pwd_err_cnt:<user>`）
3. 验证码基线守卫  
任一失败立即退出（`EXIT 12` / `EXIT 11`）。

### D4. 门禁串行策略

`mode=full|api` 强制串行执行（`worker_policy=serial`），避免共享账号并发竞争引起的误报与级联失败。

### D5. 审计链最小字段

`final-closure` 报告必须包含：
1. `final_gate_log`
2. `e2e_api_gate_log`
3. `first_failure_evidence`
4. `first_proxy_error_evidence`  
PASS 时字段值固定 `none`，禁止留空。

### D6. 退出码语义统一

1. `EXIT 11`：环境不可用
2. `EXIT 12`：E2E 门禁失败
3. `EXIT 15`：审计产物缺失/报告不完整

## 5. 执行链路（目标态）

`final-closure` -> `final-gate` -> `e2e-api-gate` -> Playwright  
并将关键结果统一落盘到 `osg-spec-docs/tasks/audit/`。

## 6. 验收标准

1. `e2e_api_guard.py` 通过且接入主链。
2. `final-gate` 不再以 `/tmp` 作为唯一证据源。
3. `final-closure` 生成包含首条失败证据字段的审计报告。
4. `mode=full|api` 日志可见 `worker_policy=serial`。

## 7. 与配套计划的关系

对应实施文档：`docs/plans/2026-03-02-e2e-framework-anti-false-green-fix-plan.md`  
本设计定义“为什么和做什么”；计划负责“改哪里、怎么验收”。


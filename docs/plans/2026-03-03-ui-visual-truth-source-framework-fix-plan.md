# UI Visual Truth-Source Framework Fix Plan

> **For Claude/Windsurf:** 本文档只覆盖框架修复，不允许修改业务页面代码。

Date: 2026-03-03  
Status: Implemented (Batch C landed; module visual drift still blocked)  
Owner: workflow-framework

---

## 1. 背景与问题

当前出现“UI验收通过但需求图与实现图明显不一致”的假绿，根因不是业务细节，而是框架链路：

1. 视觉门禁默认比对 `app actual -> baseline`，不是 `prototype -> app`。
2. baseline 可由实现端 `--update-snapshots` 直接刷新，导致“自己和自己比”。
3. `UI-VISUAL-CONTRACT.yaml` 的 `prototype_file/prototype_selector` 目前主要做 schema 校验，未作为强制比对源。
4. 登录页 contract 锚点过弱（如仅密码框+提交按钮），无法拦截结构漂移。

---

## 2. 修复目标（框架级）

1. 把视觉验收改为双阶段硬约束：
   - Stage A: `prototype -> baseline`（真源生成）
   - Stage B: `app actual -> baseline`（实现验收）
2. 禁止在验收阶段更新 baseline。
3. baseline 必须附带来源元数据并在 gate 中校验（可审计）。
4. 契约锚点不再允许弱锚点通过（防结构漂移）。

---

## 3. 范围与非目标

### 3.1 范围（本计划会改）

1. `bin/ui-visual-baseline.sh`
2. `bin/ui-visual-gate.sh`
3. `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
4. `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
5. `osg-frontend/tests/e2e/support/visual-contract.ts`
6. `bin/check-skill-artifacts.sh`
7. `bin/final-gate.sh`
8. （新增）`.claude/skills/workflow-engine/tests/ui_visual_truth_source_guard.py`

### 3.2 非目标（本计划不做）

1. 不修改任何业务页面实现文件（例如 `osg-frontend/packages/admin/src/views/**`）。
2. 不裁决业务口径（如“演示角色下拉是否保留”），该裁决仍走 DECISIONS 流程。

---

## 4. 设计方案

## 4.1 强制引入 `source` 模式（防自比）

在 `bin/ui-visual-baseline.sh` 增加参数：

1. `--source prototype|app`
2. 约束：
   - `--mode generate` 只允许 `--source prototype`
   - `--mode verify` 只允许 `--source app`

否则直接 `EXIT 16`。

## 4.2 baseline 来源元数据（防污染）

每次 `generate(prototype)` 产出：

1. `osg-spec-docs/tasks/audit/ui-visual-baseline-manifest-{module}-{date}.json`
2. 字段至少包含：
   - `module`
   - `contract_path`
   - `contract_sha256`
   - `prototype_file`
   - `prototype_sha256`
   - `generated_at`
   - `generated_by`（脚本名）
   - `pages[]: page_id, baseline_ref`

`ui-visual-gate` 在 `verify` 前必须校验 manifest 与当前 contract/prototype hash 一致，不一致直接 FAIL。

## 4.3 visual test 双通道执行

`osg-frontend/tests/e2e/visual-contract.e2e.spec.ts` 新增分支：

1. `UI_VISUAL_SOURCE=prototype`：
   - 打开原型 URL（通过脚本注入 `UI_VISUAL_PROTOTYPE_BASE_URL`）
   - 对 `prototype_selector` 截图并生成 baseline
2. `UI_VISUAL_SOURCE=app`：
   - 打开 `route`
   - 走现有登录/锚点/截图/比对逻辑

原型服务启动方式（必须明确）：

1. 新增 `bin/prototype-server.sh`，支持 `start|stop|status`。
2. 默认端口 `18090`，默认目录 `osg-spec-docs/source/prototype`。
3. `ui-visual-baseline --mode generate --source prototype` 内部先调用 `prototype-server.sh status`：
   - 未运行则自动 `start`
   - 并导出 `UI_VISUAL_PROTOTYPE_BASE_URL=http://127.0.0.1:18090`
4. 启动失败直接 `EXIT 17`，禁止降级到 app 通道。

selector 兼容策略（必须拆分）：

1. `prototype_selector`：只用于 `source=prototype` 截图。
2. `clip_selector`（或新增 `app_selector`）：只用于 `source=app` 的 clip 截图。
3. 禁止“同一个 selector 同时覆盖 prototype/app”作为隐式假设。

## 4.4 强化 contract 守卫

`ui_visual_contract_guard.py` 增加规则：

1. `required_anchors` 最少 3 个（页面级）。
2. 禁止纯泛化锚点组合（如仅 `input[type=password]`, `button[type=submit]`）。
3. 对 `login-page` 强制包含以下任一可识别锚点集合（可配置）：
   - 角色选择器锚点
   - 演示账号文案锚点
   - 验证码区锚点

> 说明：这是框架规则，不是写死业务值；项目级可通过 contract 填写具体 selector/text。

## 4.5 final-gate 禁止基线漂移

在 `bin/final-gate.sh` 增加前置检查：

1. 若检测到 `osg-frontend/tests/e2e/visual-baseline/**` 在本次验收流程中被改写，直接 FAIL。
2. `final-gate` 只允许调用 `ui-visual-gate (verify, source=app)`。
3. baseline 更新必须走单独命令（非 final-gate）并产出 manifest。

---

## 5. 执行批次

## Batch A: 止血（先防假绿）

1. 改 `bin/ui-visual-baseline.sh`：新增 `--source` 与模式约束。
2. 改 `ui-visual-gate.sh`：固定 verify+app，并显式打印 source。
3. 改 `final-gate.sh`：禁止验收阶段 baseline 改写。
4. 当前模块止血：重新生成 `permission` baseline（必须从 prototype 通道）。

## Batch B: 真源链路（再做可追溯）

1. 新增 `bin/prototype-server.sh`（start|stop|status）。
2. 改 `visual-contract.e2e.spec.ts`：实现 prototype/app 双通道与 selector 分流。
3. 新增 `ui_visual_truth_source_guard.py`。
4. 改 `ui-visual-baseline.sh` 生成 manifest。
5. 改 `ui-visual-gate.sh` 校验 manifest hash。
6. 改 `check-skill-artifacts.sh` 增加 truth-source 校验项。

## Batch C: 守卫硬化（最后收口）

1. 改 `ui_visual_contract_guard.py`：提升锚点质量规则（弱锚点拦截）。
2. 更新相关 workflow 文档口径（仅框架文档，不改业务文档）。
3. 把 Batch A/B 命令固定进文档化执行顺序，防止跨批混跑。

---

## 6. 验收标准（DoD）

1. 使用 `--mode generate --source app` 必须失败。
2. 使用 `--mode verify --source prototype` 必须失败。
3. `final-gate` 中任何 baseline 改写必须失败。
4. `ui-visual-gate` 必须输出：
   - `source`
   - `manifest_ref`
   - `contract_sha256`
   - `prototype_sha256`
5. 原型与实现存在明显差异时，`ui-visual-gate` 必须 FAIL，不得 PASS。
6. 以上行为均写入 `osg-spec-docs/tasks/audit/` 可复盘。
7. `permission` 模块在“原型图与实现图明显不一致”时必须被拦截（不允许再出现 PASS）。

---

## 7. 文档化执行顺序（防跨批混跑）

### 7.1 批次锁定规则

1. 禁止跳批执行：必须 `Batch A -> Batch B -> Batch C`。
2. 每批必须满足“本批收敛条件”后才能进入下一批。
3. 任何一步 FAIL，先修复再重跑本批，不允许带病进入下一批。

### 7.2 Batch A 回归命令（止血）

1. `bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission`
2. `bash bin/ui-visual-baseline.sh permission --mode generate --source prototype`

Batch A 收敛条件：
1. `--mode generate --source app` 必须失败（`EXIT 16`）。
2. `generate --source prototype` 可以成功生成 baseline 与审计产物。

### 7.3 Batch B 回归命令（真源链路）

1. `bash bin/prototype-server.sh status || bash bin/prototype-server.sh start`
2. `bash bin/ui-visual-gate.sh permission`

Batch B 收敛条件：
1. `ui-visual-gate` 日志必须输出 `source/manifest_ref/contract_sha256/prototype_sha256`。
2. 无 manifest 时必须 FAIL，不允许降级为 app 自比。

### 7.4 Batch C 回归命令（守卫硬化）

1. `python3 .claude/skills/workflow-engine/tests/ui_visual_contract_guard.py --contract osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml --allow-missing-baseline`
2. `bash bin/final-gate.sh permission`
3. `bash bin/final-closure.sh permission --cc-mode off --backend-policy docker_only`

Batch C 收敛条件：
1. `required_anchors` 不达标（少于 3 或全弱锚点）必须被 guard 拦截。
2. `login-page` 未命中“角色/演示/验证码”任一锚点组时必须被 guard 拦截。
3. `required_anchors_any_of`（如配置）必须满足 `list[list[string]]`，并在运行态至少命中一组。

---

## 10. 对外部审计建议的采纳结论（2026-03-03）

1. `原型 HTTP 服务启动方式未定义`：采纳（已补 `prototype-server.sh` 方案，High）。
2. `原型与 app selector 不兼容`：采纳（已补 selector 双通道，High）。
3. `manifest+hash 偏重`：部分采纳（改为 Batch A 先止血、Batch B 再审计，Medium）。
4. `未覆盖当前模块止血`：采纳（Batch A 增加 permission baseline 重新生成，Medium）。
5. `Batch 边界不清晰`：采纳（已重排批次职责，Low）。

---

## 8. 风险与控制

1. 风险：历史模块 baseline 无 manifest。
   - 控制：提供一次性 bootstrap 子命令，仅允许在显式参数下执行并记录审计。
2. 风险：锚点规则过严导致误报。
   - 控制：先 warning 一轮，再切 hard-fail；保留 `UI-VISUAL-DECISIONS.md` 裁决入口。
3. 风险：prototype 服务不可达导致生成失败。
   - 控制：truth-source guard 输出可操作错误（缺端口/缺文件/缺 selector）。

---

## 9. 结论

本问题属于框架缺陷，不是单点业务缺陷。必须先完成“truth-source + anti-self-baseline”硬化，再做业务裁决，否则会持续出现 UI 假绿。

# UI Visual Post-Failure Allowance Framework Design

> Date: 2026-03-12
> Status: Approved
> Owner: workflow-framework
> Scope: 将 strict UI visual compare 失败后的 allowance judgement 收敛为框架级通用能力，覆盖所有模块的 page 与 surface；`permission` 仅作为首个 proving ground
> Non-goals: 不改 gate 顺序；不放宽 `diff_threshold`；不引入记忆豁免；不新增 contract 顶层 schema；不要求模块自己发明 red-branch 流程；不默认放过 `low_salience_text_icon_rasterization`

---

## 0.1 与机器真值关系

1. 允许/禁止 residual class 继续由 `.claude/project/config.yaml` 统一定义。
2. 现有 `UI-VISUAL-CONTRACT.yaml` 中显式 `residual_regions` 继续保留最高优先级。
3. 本设计不引入第二真源，不新增独立 waiver 文件。
4. 若无显式 `residual_regions`，才进入框架级 fallback region derivation。

## 1. Problem Statement

当前项目已有：

1. strict screenshot compare 主链
2. page red branch 的 residual classifier
3. `config.yaml` 中的 allowed / forbidden residual class 机器真值

但现状只解决了局部问题：

1. page 有 classifier 路径，surface 没有。
2. 无显式 `residual_regions` 的 case 无法进入 classifier。
3. 依赖 page-level `style_contracts` 的 fallback 只适用于少数模块页面，不具备未来模块通用性。
4. 将框架级能力藏在 spec 私有函数里，不利于稳定测试与后续复用。

因此本次目标不是给 `permission` 打补丁，而是把 red-branch allowance 提升成一项框架能力：

1. 所有模块的 page case 可复用
2. 所有模块的 surface case 可复用
3. 模块只提供 contract 真值，不再各自发明 allowance 流程

## 2. Goals

### 2.1 必须达到

1. 不改变 `single_case_verify -> module_verify -> ui_visual_gate -> final_gate -> final_closure` 的顺序。
2. strict compare 必须始终先跑，allowance 只存在于 red branch。
3. page 与 surface 使用同一 allowance 模块，不允许 page / surface 语义分叉。
4. 有显式 `residual_regions` 时继续优先使用显式声明。
5. 没有显式 `residual_regions` 时，框架可从 `page root` / `surface root` 自动派生 fallback allowed regions。
6. fallback 不依赖 page-level `style_contracts`，避免未来模块无法接入。
7. 通用 fallback 默认只服务 `micro_spacing`。
8. page 与 surface 的 evidence 都必须可审计。

### 2.2 明确不做

1. 不新增 contract 顶层 `post_failure_allowance` block。
2. 不扩 `ui_visual_contract_guard.py` 的 schema 责任。
3. 不新增独立 gate 或 orchestrator。
4. 不默认放过文字/图标栅格化差异。
5. 不把整页或整 surface 单个大框直接当作 fallback allowed region。

## 3. Existing-Entrypoint Inventory

### 3.1 Source Truth

1. `.claude/project/config.yaml`
   - `allowed_visual_residual_classes`
   - `forbidden_visual_residual_classes`
   - `micro_spacing.max_edge_band_px`
2. `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
   - page / surface 真值
   - page `residual_regions`
   - surface/page 结构与 anchors

### 3.2 Runtime Entrypoints

1. `bin/ui-visual-case-verify.sh`
2. `bin/ui-visual-gate.sh`
3. `bin/final-gate.sh`
4. `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`

### 3.3 Existing Guards

1. `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
2. `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`
3. `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard_selftest.py`

### 3.4 Existing Support Modules

1. `osg-frontend/tests/e2e/support/visual-contract.ts`
2. `osg-frontend/tests/e2e/support/visual-residual-classifier.ts`
3. `osg-frontend/tests/e2e/support/style-contract.ts`
4. `osg-frontend/tests/e2e/support/surface-trigger.ts`

## 4. Approaches Considered

### 方案 A：继续使用 contract-explicit 提示

做法：

- 每个 page / surface 自己声明 allowance hint
- 框架只负责统一 red-branch 调用

优点：

- 可控性最强

缺点：

- 维护成本最高
- 与“未来模块通用能力”目标冲突

结论：

- 不采用

### 方案 B：单个 root 大框 fallback

做法：

- red case 直接把 page root / surface root 的完整 bounding box 作为 `micro_spacing` allowed region

优点：

- 实现最简单

缺点：

- 与当前 `micro_spacing` edge-band classifier 语义不匹配
- 内部布局的微间距残差无法被稳定识别

结论：

- 不采用

### 方案 C：root-aware safe boxes framework module

做法：

- 新增框架级 `post-failure-allowance.ts`
- 优先使用显式 `residual_regions`
- 若无显式 regions，则从 page / surface root 自动派生 safe boxes
- 将 safe boxes 统一转成 `micro_spacing` allowed regions 输入现有 classifier

优点：

- 不依赖 `style_contracts`
- 适用于所有未来模块
- 可抽成独立纯函数，便于 focused tests
- page / surface 可共用

缺点：

- 需要设计 DOM safe-box 筛选规则

结论：

- **推荐**

## 5. Design Decision

采用 **方案 C：将 post-failure allowance 实现为框架级 support 模块**。

### 5.1 模块边界

新增：

- `osg-frontend/tests/e2e/support/post-failure-allowance.ts`

该模块负责三件事：

1. 接收 red case 上下文
2. 构造允许区域：
   - `explicit_residual_regions`
   - `derived_safe_boxes`
3. 调用现有 classifier 并返回统一结果

### 5.2 核心函数

建议收敛成以下边界：

1. `collectAllowanceNodeSnapshots(rootLocator)`
   - 运行时函数
   - 从 page / surface root 收集可见 DOM 节点快照

2. `deriveSafeMicroSpacingRegions(rootBox, nodeSnapshots)`
   - 纯函数
   - 从节点快照中筛选并构造 `micro_spacing` allowed regions

3. `evaluatePostFailureAllowance(input)`
   - 统一入口
   - 优先走显式 `residual_regions`
   - 否则走 `derived_safe_boxes`
   - 最终返回 classifier evidence

### 5.3 Page / Surface 数据流

固定执行语义：

1. strict compare 先执行
2. green case 直接结束
3. red case 调 `evaluatePostFailureAllowance(...)`
4. allowance pass 则当前 case 转 `PASS`
5. allowance fail 则当前 case 维持 `FAIL`

接入点：

1. page fullpage catch
2. page clip catch
3. surface viewport catch

## 6. Safe-Box Derivation

fallback 只在无显式 `residual_regions` 时触发，并且只生成 `micro_spacing` allowed regions。

### 6.1 节点快照字段

节点快照至少包含：

1. `tagName`
2. `boundingBox`
3. `display`
4. `visibility`
5. `opacity`
6. `backgroundColor`
7. `borderWidth`
8. `borderRadius`
9. `overflow`
10. `childCount`
11. `className`
12. `role`

### 6.2 安全壳层候选

只保留满足至少一类的节点：

1. 交互壳
   - `button`
   - `input`
   - `textarea`
   - `select`
   - `[role=button]`
2. 布局壳
   - `display=block|flex|grid|inline-flex|table|table-row|table-cell`
3. 样式壳
   - 非透明背景
   - 边框
   - 圆角
   - overflow 裁切
   - 明显 padding / shell 风格

### 6.3 风险排除

一律排除：

1. `img / canvas / video / iframe / object / embed`
2. `svg / path`
3. `body / html`
4. surface `backdrop`
5. captcha / chart / qr / barcode / avatar / badge-count 等高风险语义区域
6. 纯文本 inline 节点，除非本身命中壳层样式

### 6.4 几何收紧

1. 太小的框直接排除
2. 覆盖 root 绝大部分面积的近整页大框直接排除
3. 强重叠框做去重
4. 候选总数设上限
5. 若最终没有稳定候选，则 fail-closed

## 7. Evidence Semantics

### 7.1 Page

继续复用现有字段：

1. `result`
2. `residual_classifier_applied`
3. `residual_classifier_result`
4. `residual_class_breakdown`
5. `forbidden_residual_detected`

### 7.2 Surface

surface 需要补齐与 page 对齐的 classifier evidence，但不新增新的 reason 字段。

建议在 `viewport_results[]` 中沿用同名字段：

1. `residual_classifier_applied`
2. `residual_classifier_result`
3. `residual_class_breakdown`
4. `forbidden_residual_detected`

## 8. Guard Reuse / Collision Audit

### 8.1 Contract Guard

不扩 `ui_visual_contract_guard.py` 的 schema。

原因：

1. 本设计不新增 contract 字段
2. 允许/禁止 residual class 仍由现有 `config.yaml` 约束
3. fallback 完全属于运行时派生逻辑

### 8.2 Evidence Guard

复用并扩展 `ui_critical_evidence_guard.py`。

扩展点仅限：

1. surface `viewport_results[]` 若应用 classifier，必须带齐 residual evidence
2. page 与 surface 使用同一 tri-state evidence 语义

不新建：

1. `ui_visual_allowance_guard.py`
2. `ui_visual_allowance_gate.sh`

## 9. Source-Stage Integration Path

本设计不新增任何新 artifact。

继续复用：

1. `.claude/project/config.yaml`
   - allowed / forbidden residual class 真值
2. `UI-VISUAL-CONTRACT.yaml`
   - page / surface 真值
   - 显式 `residual_regions`

因此：

1. 不需要 prototype-extraction 生成新字段
2. 不需要新增 source-stage contract block
3. 运行时 fallback 是纯派生，不回写 contract

## 10. Error Handling / Fail-Closed

以下情况一律不放行：

1. `diffRef` 无法解析
2. diff 图片不存在
3. root box 无法解析
4. 节点快照采集失败
5. 无显式 regions 且派生不出 safe boxes
6. classifier 结果包含 `geometry_change`
7. classifier 结果包含 `unknown`
8. classifier 结果命中任何 forbidden class

## 11. Testing and Stage Regression

### 11.1 Focused Tests

必须覆盖：

1. `deriveSafeMicroSpacingRegions(...)`
2. `evaluatePostFailureAllowance(...)`
3. 显式 `residual_regions` 优先级
4. `derived_safe_boxes` fallback
5. page / surface 共用语义
6. forbidden residual 继续 fail

### 11.2 Proving Ground

`permission` 作为第一个全量 proving ground：

1. 5 个 page
2. 6 个 surface

### 11.3 Gate Verification

至少验证：

1. `bash bin/ui-visual-case-verify.sh permission dashboard`
2. `bash bin/ui-visual-case-verify.sh permission roles`
3. `bash bin/ui-visual-case-verify.sh permission admins`
4. `bash bin/ui-visual-case-verify.sh permission base-data`
5. 6 个 surface case verify
6. `bash bin/ui-visual-gate.sh permission`
7. 必要时 `bash bin/final-gate.sh permission`

## 12. Acceptance

框架级完成标准：

1. page 与 surface 都进入统一 allowance 模块
2. 未来模块无需新增 schema 即可复用这套能力
3. 显式 `residual_regions` 继续优先于通用 fallback
4. 无显式 regions 的 case 仍可进入 fallback
5. fallback 不依赖 `style_contracts`
6. forbidden residual 仍严格失败
7. surface evidence 与 page evidence 语义统一
8. `permission` 作为首个 proving ground 完整通过

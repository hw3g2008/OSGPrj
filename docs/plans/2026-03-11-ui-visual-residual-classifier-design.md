# UI Visual Residual Classifier Design

> Date: 2026-03-11
> Status: Approved
> Owner: workflow-framework
> Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`
> Scope: 在默认零容忍的前提下，为 UI visual compare 增加一个低侵入、可选启用的第二阶段 residual classifier，只允许 `micro_spacing` 与 `low_salience_text_icon_rasterization` 两类残差自动转绿，并明确禁止 `captcha/image` 等内容型残差进入通用白名单
> Non-goals: 不放宽 `diff_threshold`；不引入人工放行文件；不改现有 gate 主链；不为 `captcha/image` 添加框架特判；不在第一版支持所有 surface

---

## 0.1 与上位标准关系（2026-03-11）

1. 本设计遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本设计是对现有严格 UI visual chain 的低侵入增强，不改写单真源、单运行态、严格视觉收口和最终 gate 的上位设计。
3. 如本设计与上位标准冲突，以上位标准为准，并先更新上位标准再回改本文。

## 1. Problem Statement

当前 `UI-VISUAL-CONTRACT` 的执行语义是：

1. `diff_threshold = 0` 时，截图失败即整体失败。
2. `diff_threshold > 0` 时，允许一定比例的盲像素放宽。

这两种模式都不满足当前项目对视觉门禁的精细要求：

- 继续保持默认零容忍，不能把颜色、状态、图片、结构变化一起吞掉。
- 又需要给“微间距”和“人眼几乎不可察觉的低显著文字/图标栅格化尾差”留出自动化放行空间。
- `captcha/image` 这类内容型差异不能进入通用白名单，也不能为单页单测偷偷开口子。

最近 `permission/login-page` 的验证正好暴露了这个边界：

- 结构和关键样式已正确接住。
- 主要残差并不全是产品错误，其中一部分属于细微边缘和低显著字形尾差。
- 但若继续依赖 `diff_threshold`，就会把不该放行的差异也一起放过去。

因此需要一个第三种模式：

- **默认仍然零容忍**
- **截图红后再做第二阶段残差分类**
- **只允许极窄、显式声明过的残差类型自动转 PASS**

## 2. Goals

### 2.1 必须达到

1. 默认视觉策略仍然是零容忍，不能降低现有严格标准。
2. 只在 page/surface contract 显式声明 `residual_regions` 时，才允许第二阶段 residual classifier 介入。
3. residual classifier 只允许两类残差：
   - `micro_spacing`
   - `low_salience_text_icon_rasterization`
4. `captcha/image`、颜色状态、结构变化、明显几何变化、未知残差必须继续失败。
5. 新规则必须复用现有 visual compare 执行链，不能再造新的 gate、脚本或人工审核入口。

### 2.2 明确不做

1. 不改 `diff_threshold` 为宽松比例放行。
2. 不把 `captcha/image` 放进通用白名单。
3. 不引入“人工放行文件”或单次审批产物作为框架真值。
4. 不在第一版就覆盖所有 surface；优先 page-level proving ground。
5. 不为单个页面写死特判逻辑。

## 3. Approaches Considered

### 方案 A：继续使用 `diff_threshold`

做法：

- 将低显著残差继续交给 `maxDiffPixelRatio` 吞掉。

优点：

- 改动最少。

缺点：

- 是盲放宽，无法区分微间距、字形尾差和颜色/状态/图片差。
- 与“默认零容忍”相冲突。

结论：

- 不采用。

### 方案 B：在现有 screenshot failure 后增加第二阶段 residual classifier

做法：

- `toHaveScreenshot(diff_threshold=0)` 仍然先执行。
- 只有失败后才根据 contract 中显式声明的 `residual_regions` 运行 classifier。
- classifier 只接受白名单内的 residual class。

优点：

- 保留严格默认值。
- 改动集中在现有执行点，不需要改 gate 编排。
- 可以保留对 `captcha/image` 的硬失败策略。

缺点：

- 需要扩展 contract schema、guard 和报告字段。
- 需要额外的分类测试。

结论：

- **推荐**

### 方案 C：新建独立 post-process gate

做法：

- 让 screenshot compare 维持现状。
- 再新增一个 `ui-visual-residual-gate.sh` 类脚本去二次分析 diff。

优点：

- 逻辑和原 compare 分离。

缺点：

- 新增入口和维护面。
- 与现有 `ui-visual-case-verify -> ui-visual-baseline -> ui-visual-gate -> final-gate -> final-closure` 主链形成额外分叉。

结论：

- 不采用。

## 4. Design Decision

采用 **方案 B：在现有 strict screenshot compare 失败后，按 contract 显式声明的 residual regions 做第二阶段 classifier**。

### 4.1 默认语义

1. 默认仍然严格零容忍。
2. 若页面未声明 `residual_regions`，行为与今天完全一致。
3. 只有页面显式声明了 `residual_regions`，且 screenshot failure 后 residual classifier 证明所有残差都属于允许类时，结果才从 `FAIL` 转为 `PASS`。

### 4.2 允许类

#### `micro_spacing`

必须同时满足：

1. 残差只落在声明过的布局块边缘带内。
2. 边缘带宽度不超过 `4px`。
3. 形状是细条、薄边、窄带，不能形成大面积实心块。
4. 不进入块中心内容区。
5. 不跨多个无关布局块大面积扩散。

#### `low_salience_text_icon_rasterization`

必须同时满足：

1. 残差只落在声明过的 text/icon region 内。
2. 这些 region 的结构、颜色、状态、关键样式已经通过先验校验。
3. 残差主要沿文字笔画或 icon glyph 轮廓分布。
4. 不扩散到背景块、按钮主体填充区、状态色块。
5. 不涉及 `img/canvas/video/.captcha-code` 等内容型区域。

### 4.3 直接失败类

一旦 classifier 识别到以下任一类，必须继续 `FAIL`：

1. `image_like`
2. `captcha_like`
3. `color_state`
4. `geometry_change`
5. `structure_change`
6. `unknown`

其中：

- `captcha_like` 包括 `.captcha-code`、验证码图、验证码字符区域。
- `image_like` 包括 `img`、`canvas`、`video` 和任何图片区。

## 5. Existing-Entrypoint Inventory

### 5.1 真值与派生产物

- `.claude/project/config.yaml`
  - 机器真值
- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`
  - visual contract 派生产物

### 5.2 现有执行入口

- `bin/ui-visual-case-verify.sh`
- `bin/ui-visual-baseline.sh`
- `bin/ui-visual-gate.sh`
- `bin/final-gate.sh`
- `bin/final-closure.sh`

这些入口最终都复用：

- `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
- `osg-frontend/tests/e2e/support/visual-contract.ts`

### 5.3 现有 guard

- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
- `.claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py`

## 6. Guard Reuse / Collision Audit

### 6.1 为什么扩展 `ui_visual_contract_guard.py`

原因：

- 它已经负责 visual contract schema / strict policy 校验。
- `residual_regions` 是 visual contract 的组成部分，应在这里最早被拦住。
- 最适合禁止 `.captcha-code`、`img`、状态色块等进入 allowlist。

因此禁止新建：

- `ui_visual_residual_policy_guard.py`
- `ui_visual_whitelist_guard.py`

### 6.2 为什么不新建独立 residual gate

原因：

- compare 的唯一真实执行点已经在 `visual-contract.e2e.spec.ts`。
- 若另起 gate，会造成单页、module verify、final-gate 三条链可能分叉。
- 目标是低侵入，不是额外编排。

### 6.3 `ui_critical_evidence_guard.py` 的角色

不新造新 guard，只扩它对报告字段完整性的要求：

- 当 classifier 被应用时，必须存在：
  - `residual_classifier_applied`
  - `residual_classifier_result`
  - `residual_class_breakdown`
  - `forbidden_residual_detected`

## 7. Source-Stage Integration Path

### 7.1 机器真值

最早生成：

- `.claude/project/config.yaml`

新增内容：

- classifier 开关
- allowed / forbidden residual classes
- `micro_spacing` 边缘带宽度上限

### 7.2 contract 派生

最早生成：

- `osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`

新增内容：

- `residual_regions`
  - `class`
  - `selectors`

### 7.3 最早执行与阻断

最早阻断：

- `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`

最早执行：

- `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`

最早消费：

- `bin/ui-visual-case-verify.sh`
- `bin/ui-visual-baseline.sh`
- `bin/ui-visual-gate.sh`

不允许第一次出现在：

- `final-gate`
- `final-closure`

## 8. Minimal-Intrusion Architecture

### 8.1 只改一个执行点

第一版只在 `visual-contract.e2e.spec.ts` 的 page-level screenshot failure 分支加 classifier：

1. screenshot 先跑
2. 若通过，维持原行为
3. 若失败且无 `residual_regions`，维持原失败
4. 若失败且有 `residual_regions`，运行 classifier
5. classifier 仅在“全量 residual 可解释且无 forbidden residual”时转 `PASS`

### 8.2 只支持 page-level

第一版只支持：

- `contract.pages[*].residual_regions`

不支持：

- `surfaces[*].residual_regions`

原因：

- 先拿 `page-level` 跑通 proving ground，减少侵入面和状态组合。

### 8.3 报告最小增量

在现有 page report 上追加可选字段：

- `residual_classifier_applied`
- `residual_classifier_result`
- `residual_class_breakdown`
- `forbidden_residual_detected`

没有 classifier 的页面，报告结构基本不变。

## 9. Current `login-page` Fit Check

按现有分析：

1. `login-page` 已满足：
   - `style_assertions_passed = 13`
   - `critical_surfaces_failed = 0`
2. 当前 residual 中：
   - 一部分属于 `micro_spacing`
   - 一部分属于 `low_salience_text_icon_rasterization`
   - 仍存在 `captcha_like`

因此在本设计下：

- `login-page` 当前仍应自动 `FAIL`
- 原因不是结构或主布局，而是 `captcha_like` 未被纳入通用白名单
- 这是设计要求，不是设计缺陷

## 10. Stage-Regression Verification

### 10.1 classifier 单测

必须覆盖：

1. 细边缘条带 => `PASS`
2. 低显著字形/图标尾差 => `PASS`
3. 大面积主体填充差 => `FAIL`
4. `captcha/image` 残差 => `FAIL`
5. 未声明区域残差 => `FAIL`

### 10.2 guard 自测

必须覆盖：

1. `.captcha-code img` 被放进 `residual_regions` => `FAIL`
2. `residual_regions.class` 非法 => `FAIL`
3. 页面声明了 classifier 字段但没有 selectors => `FAIL`

### 10.3 真页 proving ground

第一版使用 `permission/login-page`：

1. 当前状态下证明：
   - classifier 不会误吞 `captcha_like`
   - 页面仍然 `FAIL`
2. 后续在验证码真实对齐后，再证明：
   - classifier 能自动放过剩余 `micro_spacing + low_salience_text_icon_rasterization`

### 10.4 Gate 回归

必须证明以下入口结论一致：

1. `bin/ui-visual-case-verify.sh permission login-page`
2. `bin/ui-visual-baseline.sh permission --mode verify --source app`
3. `bin/ui-visual-gate.sh permission`

不能出现：

- 单页能过、module verify 还红
- module verify 能过、final-gate 还红

## 11. Risks And Mitigations

### 风险 1：allowlist selector 过宽

风险：

- 把本不该自动放过的区域纳入 classifier

缓解：

- guard 强制拦 `img/.captcha-code/canvas` 等区域
- 只允许显式声明，不提供全局默认 text/icon allowlist

### 风险 2：classifier 误吞几何变化

风险：

- 一些明显的尺寸或主体填充变化被误判成 `micro_spacing`

缓解：

- `micro_spacing` 强制要求薄边、窄带、边缘带
- 大面积实心块直接归入 `geometry_change`

### 风险 3：第一版 scope 过大

风险：

- 一次性支持 page + surface，导致实现复杂度和回归面暴涨

缓解：

- 第一版只支持 page-level
- 先以 `login-page` 作为 negative proving ground

## 12. Decision Summary

1. 默认零容忍不变。
2. 只在 screenshot failure 后运行第二阶段 classifier。
3. classifier 只对白名单内的 `micro_spacing` 和 `low_salience_text_icon_rasterization` 生效。
4. `captcha/image` 及其他 forbidden residual 永远继续失败。
5. 第一版只做 page-level、可选启用、最小增量报告。

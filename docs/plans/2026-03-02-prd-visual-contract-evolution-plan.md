# PRD Visual Contract Evolution Plan

> **For Claude/Windsurf:** 先按本计划讨论并裁决，不直接改代码。  
> **目标类型:** 需求生成框架进化（HTML SSOT -> 可执行视觉验收契约）

Date: 2026-03-02  
Status: Partial (框架能力已落地；运行态需按 2026-03-04 最新环境复验)  
Owner: workflow-framework
Design Doc: `docs/plans/2026-03-02-prd-visual-contract-evolution-design.md`
Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

---

## 0. 执行快照（2026-03-03）

### 0.1 文档边界（本计划负责什么）

1. 负责“视觉契约与视觉验收”闭环：
   - `UI-VISUAL-CONTRACT.yaml`
   - `ui-visual-baseline` / `ui-visual-gate`
   - `@ui-smoke` / `@ui-visual` 分层
2. 不负责账号锁、登录契约、E2E 串行化等“运行态稳定性”问题（由 `2026-03-02-e2e-framework-anti-false-green-fix-plan.md` 负责）。

### 0.2 当前落地状态（按仓库现状）

1. 已落地：
   - `bin/ui-visual-baseline.sh`
   - `bin/ui-visual-gate.sh`
   - `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`
   - `osg-spec-docs/docs/01-product/prd/permission/UI-VISUAL-CONTRACT.yaml`
   - `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`
2. 闭环证据：
   - `osg-spec-docs/tasks/audit/ui-visual-gate-permission-2026-03-03.log`
   - `osg-spec-docs/tasks/audit/ui-visual-page-report-permission-2026-03-03.json`
   - `osg-spec-docs/tasks/audit/final-gate-permission-2026-03-03.log`
   - `osg-spec-docs/tasks/audit/final-closure-permission-2026-03-03.md`

### 0.3 与另一份 3/2 计划的接口

1. 先完成 Anti-False-Green 的运行态硬门禁，再叠加本计划的视觉门禁，避免“视觉通过但运行态假绿”。
2. `final-gate` 中视觉步骤插入建议：
   - 在运行态前置守卫通过后执行视觉 gate；
   - 视觉 gate 不替代 `e2e-api-gate`，两者都必须通过。

### 0.4 建议执行顺序（本计划内部）

1. Batch A/B（先产出契约并纳入 brainstorm 回源）
2. Batch C（实现 visual baseline/gate）
3. Batch D（接入 final-gate/final-closure）

### 0.5 本轮收口结果（2026-03-03）

1. C2 已收口：受保护路由 `@ui-only` 已移除 `isOnX || isOnLogin` 宽松断言，改为登录后强断言目标路由与稳定锚点。
2. DoD#6 已收口：`ui-visual-gate` 已输出逐页结构化证据（`baseline_ref/actual_ref/diff_ref/diff_threshold/result`）。
3. 以上结论是 2026-03-03 快照结果；后续若运行态复验失败，文档总状态应回落为 `Partial` 直至复验通过。

### 0.5a 最新复验快照（2026-03-04）

1. 框架侧：`check-skill-artifacts` 可通过，说明契约产物链路完整。
2. 运行态：`ui-visual-baseline --mode verify --source app` 当前失败，主要受两类因素影响：
   - 后端不可达（`127.0.0.1:8080` 拒绝连接）；
   - 登录页验证码样式断言不一致（例如 captcha chip 圆角断言）。
3. 因此文档总状态维持 `Partial`，待运行态复验通过后再恢复 `Implemented & Verified`。

### 0.6 条目落地追踪表（强制，唯一状态源）

| ID | 目标文件 | 验收命令 | 审计产物 | 当前状态 | 代码证据 |
|---|---|---|---|---|---|
| A1 | `.claude/skills/prototype-extraction/SKILL.md`, `bin/check-skill-artifacts.sh` | `bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission` | `osg-spec-docs/tasks/audit/ui-visual-contract-summary-permission-2026-03-03.json` | Closed | `SKILL.md` 已定义生成 contract（Step4.5） |
| A2 | `.claude/skills/prototype-extraction/SKILL.md` | 同 A1 | 同 A1 | Closed | PRD 模板已包含“视觉验收锚点” |
| B1 | `.claude/skills/brainstorming/SKILL.md`, `.windsurf/workflows/brainstorm.md` | `bash bin/check-skill-artifacts.sh prototype-extraction permission osg-spec-docs/docs/01-product/prd/permission` | `osg-spec-docs/tasks/audit/final-gate-permission-2026-03-03.log` | Closed | Phase 4 已支持 V 类与双写规则 |
| C2 | `osg-frontend/tests/e2e/dashboard.e2e.spec.ts`, `osg-frontend/tests/e2e/base-data.e2e.spec.ts`, `osg-frontend/tests/e2e/roles.e2e.spec.ts`, `osg-frontend/tests/e2e/users.e2e.spec.ts` | `bash bin/final-gate.sh permission` | `osg-spec-docs/tasks/audit/final-gate-permission-2026-03-03.log` | Closed | 已移除宽松断言，改为登录后强断言目标页面 |
| DoD#6 | `bin/ui-visual-gate.sh`, `bin/ui-visual-baseline.sh`, `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts` | `bash bin/ui-visual-gate.sh permission` | `osg-spec-docs/tasks/audit/ui-visual-gate-permission-2026-03-03.log`, `osg-spec-docs/tasks/audit/ui-visual-page-report-permission-2026-03-03.json` | Closed | 已输出逐页结构化字段与汇总 |

### 0.7 状态推进规则（按 superpowers）

1. 状态只允许：`Todo -> InProgress -> Verified -> Closed`。
2. 每个 ID 必须同时具备三类证据才可 `Closed`：
   - 代码证据（文件+行号）
   - 验收命令结果（exit code=0）
   - 审计产物路径（可复盘）
3. 任一 ID 非 `Closed` 时，文档总状态必须是 `Partial`。
4. 仅当所有 ID 都为 `Closed`，才允许把文档状态改为 `Implemented & Verified`。

### 0.8 与上位标准关系（2026-03-03）

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本计划是统一视觉验收策略的首轮落地实例（对应上位标准第 7 节）。
3. 若本计划与上位标准冲突，以上位标准为准，并先更新上位标准再回改本计划。

---

## 1. 目标

把当前“描述型 PRD”升级为“可执行验收输入”，让 UI 一致性不再靠人工判断：

1. PRD 不只描述页面，还输出机器可执行的视觉契约（visual contract）。
2. `ui-only` 从“可达性冒烟”升级为“视觉对照验收”。
3. `final-gate/final-closure` 把视觉比对纳入硬门禁，失败可审计复盘。

---

## 2. 现状与问题

### 2.1 已有能力

1. HTML 是 SSOT，`/brainstorm` Phase 0/4 已做 HTML↔PRD↔SRS校验。
2. PRD 已包含大量样式/布局参数（如 DESIGN-SYSTEM、页面布局、组件尺寸）。
3. 现有 E2E 覆盖 `@ui-only` 与 `@api` 两类。

### 2.2 缺口

1. `@ui-only` 目前主要是可见性/可达性断言，不是视觉基线对照。
2. 没有“每页视觉验收契约”的机器可读产物。
3. final gate 未强制“页面级视觉一致性”门禁。

---

## 3. 目标架构（进化后）

```text
HTML 原型 (SSOT)
  -> prototype-extraction
  -> PRD 页面文档 + UI-VISUAL-CONTRACT.yaml
  -> brainstorming Phase 4 回源校验与差异分类
  -> story/ticket 实现
  -> Playwright visual tests (按 contract 执行)
  -> final-gate (硬门禁)
  -> final-closure (审计报告)
```

关键原则：
1. PRD 定义标准；
2. E2E 执行比对；
3. Gate 裁决是否通过。

---

## 4. 新增核心产物

## 4.1 `UI-VISUAL-CONTRACT.yaml`（模块级）

建议路径：`osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-CONTRACT.yaml`

每个页面至少包含：
1. `page_id`
2. `route`
3. `prototype_file`
4. `prototype_selector`（原型截图锚点）
5. `viewport`（如 1440x900）
6. `auth_mode`（public/protected）
7. `snapshot_name`
8. `diff_threshold`（视觉差异阈值，唯一字段名）
9. `mask_selectors`（动态区域掩码）
10. `required_anchors`（必须存在的关键元素 selector，最少 3 个且不能全是弱锚点）

## 4.2 `UI-VISUAL-DECISIONS.md`（条件必需）

建议路径：`osg-spec-docs/docs/01-product/prd/{module}/UI-VISUAL-DECISIONS.md`

作用：记录“允许偏差”的裁决（例如组件库默认阴影差异、动画帧差异）。

规则：
1. 无视觉偏差时可不生成。
2. 一旦出现视觉偏差（含基线更新），必须生成并记录。
3. 该文件不是独立审批入口，审批主链路仍使用 `{module}-DECISIONS.md`。

## 4.3 E2E UI 基线资产（必须）

基线资产建议统一纳入仓库（首期）：

1. 基线路径：
   - `osg-frontend/tests/e2e/visual-baseline/{module}/{page_id}/{viewport}.png`
2. 对比产物路径：
   - `osg-frontend/test-results/visual-diff/{module}/{page_id}/`
3. contract 必填字段补充：
   - `baseline_ref`（指向基线图片相对路径）
   - `diff_threshold`（默认建议 0.01，按页面可覆盖）
   - `stable_wait_ms`（截图前等待稳定时长）
4. 基线覆盖率要求：
   - `UI-VISUAL-CONTRACT.yaml` 中每个 `page_id` 都必须有 `baseline_ref`
   - 缺失任一页面基线，visual gate 直接失败

## 4.4 Contract Schema（强类型，v1）

`UI-VISUAL-CONTRACT.yaml` 必须包含：
1. `schema_version: 1`
2. `module: <module_name>`
3. `pages: []`

`pages[]` 字段约束：
1. required:
   - `page_id` (string)
   - `route` (string)
   - `prototype_file` (string)
   - `prototype_selector` (string)
   - `viewport` (object: `width:int`, `height:int`)
   - `auth_mode` (enum: `public|protected`)
   - `snapshot_name` (string)
   - `baseline_ref` (string)
   - `diff_threshold` (number, 0~1)
   - `stable_wait_ms` (int, >=0)
   - `required_anchors` (array[string], minItems=3, cannot be all weak anchors)
2. optional:
   - `mask_selectors` (array[string], default `[]`)
   - `required_anchors_any_of` (array[array[string]], 至少命中一组；用于可选/条件 UI)
   - `scroll_to` (enum: `top|center|bottom`, default `top`)
   - `capture_mode` (enum: `clip|fullpage`, default `clip`)
   - `clip_selector` (string, 当 `capture_mode=clip` 时必填)
   - `device_scale_factor` (number, default `1`)

示例（规范片段）：

```yaml
schema_version: 1
module: permission
pages:
  - page_id: login
    route: /login
    prototype_file: admin.html
    prototype_selector: "#login-page"
    viewport: { width: 1440, height: 900 }
    auth_mode: public
    snapshot_name: login-main
    baseline_ref: osg-frontend/tests/e2e/visual-baseline/permission-login-page-1440x900.png
    diff_threshold: 0.03
    stable_wait_ms: 300
    required_anchors: [".login-title", ".login-btn", ".login-logo"]
    required_anchors_any_of:
      - [".captcha-row"]
      - [".login-links", ".forgot-link"]
    mask_selectors: [".captcha-code"]
    capture_mode: fullpage
    device_scale_factor: 1
```

---

## 5. 实施计划（分批）

## Batch A: PRD 生成链路升级（先定义可执行标准）

### A1. 扩展 prototype-extraction 输出

Files:
1. Modify: `.claude/skills/prototype-extraction/SKILL.md`
2. Modify: `bin/check-skill-artifacts.sh`

变更：
1. Step 4 增加 `UI-VISUAL-CONTRACT.yaml` 生成规则。
2. Step 5 增加契约完整性校验（页面覆盖率、字段完整性）。
3. 门控脚本新增 contract 文件必需检查。

### A2. PRD 模板升级

Files:
1. Modify: `.claude/skills/prototype-extraction/SKILL.md` 的 PRD 模板段

变更：
1. 每页 PRD 增加“视觉验收锚点”小节（关键元素 selector）。
2. 将页面级视觉约束统一引用到 `UI-VISUAL-CONTRACT.yaml`，避免重复维护。

## Batch B: Brainstorm 回源闭环升级（保证契约与 SSOT 对齐）

### B1. Phase 4 输出 contract 差异分类

Files:
1. Modify: `.claude/skills/brainstorming/SKILL.md`
2. Modify: `.windsurf/workflows/brainstorm.md`

变更：
1. Phase 4 差异除 A/B/C/D 外，新增 `V`（visual contract drift）。
2. A 类自动补全时同步修复 contract。
3. B/C/D/V 类写入决策日志并阻塞。
4. `V` 类差异必须双写：
   - 主审批记录：`{module}-DECISIONS.md`（source=phase4）
   - 可读投影：`UI-VISUAL-DECISIONS.md`（便于视觉评审）
5. `/approve brainstorm` 只读取 `{module}-DECISIONS.md`，不直接读取 `UI-VISUAL-DECISIONS.md`。

### B2. contract 产物门控

Files:
1. Modify: `bin/check-skill-artifacts.sh`

变更：
1. `prototype-extraction` case 必须检查：
   - `UI-VISUAL-CONTRACT.yaml` 存在
   - 页面数量 >= PRD 页面数量
   - 每页关键字段完整

## Batch C: E2E 视觉比对落地（从冒烟到对照）

### C0. 基线生成与校验脚本（先行）

Files:
1. Create: `bin/ui-visual-baseline.sh`
2. Create: `osg-frontend/tests/e2e/support/visual-contract.ts`

变更：
1. `ui-visual-baseline.sh --mode generate --source prototype`：按 contract 批量生成基线图。
2. `ui-visual-baseline.sh --mode verify --source app`：执行基线对比并输出 diff 产物。
3. 统一读取 `UI-VISUAL-CONTRACT.yaml`，禁止手工硬编码页面列表。
4. 统一按 schema v1 校验 contract，不满足直接失败。

### C1. 新增视觉门禁脚本

Files:
1. Create: `bin/ui-visual-gate.sh`
2. Create: `.claude/skills/workflow-engine/tests/ui_visual_contract_guard.py`

变更：
1. `ui_visual_contract_guard.py`：静态校验 contract 完整性。
2. `ui-visual-gate.sh`：读取 contract，执行 Playwright `toHaveScreenshot`。
3. `ui-visual-gate.sh` 必须在开始阶段打印：
   - contract 路径
   - baseline 覆盖页数
   - 缺失基线页数（若>0直接 FAIL）

### C2. `ui-only` 用例升级策略

Files:
1. Modify: `osg-frontend/tests/e2e/*.spec.ts`（按模块逐步）

变更：
1. `@ui-only` 拆为：
   - `@ui-smoke`（可达/基础可见）
   - `@ui-visual`（视觉基线对照）
2. 受保护路由禁止 `isOnX || isOnLogin` 这种宽松 PASS 条件作为视觉验收依据。

## Batch D: Final Gate/Closure 强制闭环

### D1. final-gate 纳入视觉门禁

Files:
1. Modify: `bin/final-gate.sh`
2. Modify: `bin/final-closure.sh`
3. Modify: `.claude/project/config.yaml`

变更：
1. `final-gate` 增加视觉门禁步骤（失败即 EXIT 12）。
2. `final-closure` 报告必须记录 visual gate 日志与首条视觉失败证据。
3. 配置收敛：验收主链路只认 gate 脚本，不认裸 `playwright test`。

---

## 6. 强约束（必须）

1. 视觉验收必须基于 `UI-VISUAL-CONTRACT.yaml`，禁止手写散落规则。
2. 新页面未进入 contract 时，不允许进入 PASS。
3. 所有“允许偏差”必须落 `UI-VISUAL-DECISIONS.md`，否则视为失败。
4. `@ui-visual` 失败不能降级为 warning+0。
5. 视觉基线更新只能通过 `--mode generate --source prototype` 入口，不允许手工替换图片作为验收依据。
6. 基线更新必须附带变更原因（需求变更/设计裁决/误差修正）并关联到 DECISIONS 记录。
7. 未完成 Batch D 前，任何“通过结论”都必须附 `ui-visual-baseline --mode verify --source app` 产物；裸 `playwright test` 仅可用于本地调试。

---

## 7. 验收标准（DoD）

### 7.1 试点阶段 DoD（permission 模块）

1. `permission` 模块存在 `UI-VISUAL-CONTRACT.yaml` 且通过 guard。
2. `ui_visual_contract_guard.py` 对 `permission` 返回 0。
3. `ui-visual-gate.sh permission` 输出每页 PASS/FAIL 与失败证据。
4. `final-gate` 在视觉失败时返回非 0；`final-closure` 报告含 visual 证据字段。
5. 验收结论只接受 gate/closure 新产物，不接受人工口头“看起来一致”。
6. visual gate 报告包含每页：`baseline_ref`、`actual_ref`、`diff_ref`、`diff_threshold`、`result`。

### 7.2 全量推广 DoD（所有模块）

1. 每个模块 PRD 目录存在 `UI-VISUAL-CONTRACT.yaml` 且通过 guard。
2. 所有 `V` 类视觉差异均可追溯到 `{module}-DECISIONS.md`（审批主链）与 `UI-VISUAL-DECISIONS.md`（可读投影）。
3. 验收主链路已收敛到 gate 脚本，配置中不存在用于验收的裸 E2E 入口。

---

## 8. 风险与控制

1. 风险：基线抖动过多，误报高  
控制：固定 viewport/字体/时区；动态区域 mask；分模块渐进启用。

2. 风险：初次建设成本高  
控制：先从 `permission` 模块试点，再模板化推广。

3. 风险：执行慢  
控制：`ui-smoke` 与 `ui-visual` 分层，平时跑 smoke，门禁跑 visual。

4. 风险：团队随意更新基线导致“假绿”  
控制：基线更新命令写入审计日志，且必须带变更原因和关联 DECISIONS ID。

5. 风险：受保护页面数据波动导致截图抖动  
控制：引入“测试数据稳定协议”（固定种子账号、冻结时间、固定 fixture 数据集）。

---

## 9. 推进顺序（建议）

1. 先落 Batch A/B（先让需求侧产出可执行契约）。
2. 再落 Batch C（测试侧消费契约）。
3. 最后落 Batch D（门禁强制化）。

---

## 10. 已裁决决策（2026-03-03 起生效）

> 说明：本节裁决已上收为框架统一标准，后续以 `docs/plans/FOUR-PACK-STANDARD.md` 第 7 节为准；本节保留为首轮落地记录。

1. D10-1 视觉基线存储位置（已定）：
   - 采用“仓库内基线为唯一真源（SSOT）”。
   - 固定路径：`osg-frontend/tests/e2e/visual-baseline/`。
   - 对象存储仅用于审计镜像与长期归档，不作为验收判定输入。

2. D10-2 阈值策略（已定）：
   - 采用“按页面分级阈值”，禁止全局单阈值。
   - 登录/鉴权页面：`diff_threshold=0.03`。
   - 常规管理页面（列表/表单/详情）：`diff_threshold=0.05`。
   - 仅在高噪声页面（图表/复杂动画）允许 `<=0.08`，且必须在 `UI-VISUAL-DECISIONS.md` 留痕审批。

3. D10-3 `@ui-visual` 必跑范围（已定）：
   - 当前标准：每个模块的 P0/P1 页面必须纳入 `@ui-visual`。
   - P2 页面可选，但若进入关键验收链路，必须升级为必跑并补基线。
   - `permission` 试点模块按“全页面必跑”执行，保持当前 5/5 覆盖。

4. D10-4 偏差审批权（已定）：
   - 采用“PM + 前端负责人双签”。
   - 任一页面视觉偏差放行、基线更新、阈值上调，均需双签；单签无效。
   - 审批记录必须写入 `UI-VISUAL-DECISIONS.md`，并关联对应页面与审计产物。

## 10.1 E2E UI 基线执行协议（新增，建议直接采纳）

1. 环境归一化（目标约束，分阶段落地）：
   - 已实现：时区固定 `TZ=Asia/Shanghai`（由 `ui-visual-baseline.sh` 注入）。
   - 待落地：语言固定 `zh-CN`。
   - 待落地：动画禁用（全局注入 `* { animation: none !important; transition: none !important; }`）。
   - 待落地：字体固定（按 DESIGN-SYSTEM 指定字体，CI 镜像预装）。
   - 待落地：渲染参数固定（`device_scale_factor=1`、浏览器版本固定、禁用随机 UA）。
   - 执行口径：待落地项未完成前，视觉失败需先做“环境噪声排查”，再做业务回归判定。

1a. 测试数据稳定协议（必须）：
   - 受保护页面仅使用固定 E2E 账号（不使用实时生产数据）
   - 冻结时间源（例如 `E2E_FIXED_TIME`）用于所有时间展示
   - 固定 fixture 数据集（列表排序、统计数值、Badge 数值固定）
   - 禁止把随机 ID、当前时间、动态消息区域纳入非 mask 区域截图

2. 基线生成命令（唯一入口）：
   - `bash bin/ui-visual-baseline.sh <module> --mode generate --source prototype`

3. 基线校验命令（唯一入口）：
   - `bash bin/ui-visual-baseline.sh <module> --mode verify --source app`

4. 失败判定：
   - 任一页面 diff 超过 `diff_threshold` -> visual gate FAIL（EXIT 12）
   - 任一页面缺失 baseline -> visual gate FAIL（EXIT 12）
   - contract 与 PRD 页面数不一致 -> contract guard FAIL（EXIT 13）

5. 审计记录最小字段：
   - `module`
   - `page_id`
   - `baseline_ref`
   - `actual_ref`
   - `diff_ref`
   - `diff_ratio`
   - `diff_threshold`
   - `result`

6. 基线更新审批：
   - 仅在以下三类原因允许更新：
     - 需求变更（PRD 改动）
     - DECISIONS 裁决通过
     - 误差修正（环境归一化后仍为噪声）
   - 必须在 `UI-VISUAL-DECISIONS.md` 记录“更新原因 + 页面 + 审批人 + 日期”。

## 10.2 过渡期防旁路规则（Batch D 完成前）

1. 过渡期内允许保留 `.claude/project/config.yaml` 现有 `testing.e2e.command`，但不得作为验收依据。
2. 任何“通过”结论必须同时附：
   - `ui-visual-baseline --mode verify --source app` 日志
   - `ui-visual-gate` 日志
3. 缺任一日志，结论自动降为无效验收。

---

## 11. 本文档边界

1. 本文档是“进化计划”，不包含具体代码改动。
2. 第 10 节决策已完成并生效；后续模块必须复用相同裁决口径。

---

## 12. 模块通用化指导（可复制到任意模块）

### 12.1 适用范围

1. 当前统一适用于 `Spring Boot + Vue` 模块。
2. 不绑定业务域：`permission` 只是试点，后续模块按同一流程接入。

### 12.2 新模块接入最小清单（M0-M5）

1. M0 - 准备契约：
   - 创建 `osg-spec-docs/docs/01-product/prd/<module>/UI-VISUAL-CONTRACT.yaml`
   - 每个页面必须有 `page_id/route/prototype_selector/baseline_ref/diff_threshold/required_anchors`
2. M1 - 产物门禁：
   - 运行 `bash bin/check-skill-artifacts.sh prototype-extraction <module> osg-spec-docs/docs/01-product/prd/<module>`
3. M2 - 生成基线：
   - 运行 `bash bin/ui-visual-baseline.sh <module> --mode generate --source prototype`
4. M3 - 视觉校验：
   - 运行 `bash bin/ui-visual-gate.sh <module>`
5. M4 - 主链路收口：
   - 运行 `bash bin/final-gate.sh <module>`
   - 运行 `bash bin/final-closure.sh <module> --cc-mode off --backend-policy docker_only`
6. M5 - 审计归档：
   - 确认 `osg-spec-docs/tasks/audit/` 下存在该模块的 gate/closure/visual 报告

### 12.3 统一通过标准（模块无关）

1. Contract Guard = PASS（结构完整、锚点完整、基线引用完整）。
2. Visual Gate = PASS（逐页 `result=PASS`，无缺失基线）。
3. Final Gate = PASS（视觉与运行态门禁同时通过）。
4. Final Closure = PASS（报告有证据路径和首条失败定位能力）。

### 12.4 禁止项（模块无关）

1. 禁止将裸 `playwright test` 作为验收结论。
2. 禁止手工替换 baseline 图片绕过 `--mode generate --source prototype`。
3. 禁止在无 `UI-VISUAL-DECISIONS.md` 记录时上调阈值或放行偏差。

### 12.5 已落地（提升跨模块稳定性，2026-03-05）

1. `UI-VISUAL-CONTRACT.yaml` 已支持 `style_contracts`、`state_cases` 字段（向后兼容，未声明则跳过）。
2. `visual-contract.e2e.spec.ts` 已接入 `style_contracts` 的 `getComputedStyle` 断言执行。
3. `ui-visual-baseline` / `ui-visual-gate` / `final-gate` / `final-closure` 已接入 style/state 统计字段并输出审计信息。

### 12.6 “一步到位”能力边界（通用判定）

> 结论先行：框架可实现“结构+尺寸+静态样式”的一步到位；交互态与动态数据态需要场景化测试补充，不能仅靠静态视觉基线一次覆盖。

| 层级 | 能力项 | 当前框架 | 加入 `style_contracts` 后 | 一步到位结论 |
|---|---|---|---|---|
| L1 结构还原 | 布局方向、组件层级、锚点存在 | `required_anchors` + `required_anchors_any_of` | 增加结构样式断言（display/flex/grid） | 可 |
| L2 尺寸还原 | 宽高、间距、圆角、边框 | 局部用例已手写断言 | 升级为 contract 驱动统一断言 | 可 |
| L3 颜色还原 | 背景色、文字色、渐变 | 视觉 diff 可覆盖大部分 | 可加 computed color/image 断言 | 基本可（渐变需容忍度） |
| L4 字体还原 | 字号、字重、字族 | 主要靠视觉 diff | 可加 computed font 断言 | 基本可（依赖环境字体） |
| L5 交互状态 | hover/focus/loading/disabled | 目前未统一 | 需新增状态用例驱动（hover/focus 后断言） | 不可仅一次覆盖 |
| L6 动态内容 | 空态/错误态/接口返回态 | 主要用 mask 规避波动 | 需 fixture/mock 场景分层验证 | 不可仅一次覆盖 |

### 12.7 通用增强落地项（跨模块，已落地）

> 独立落地计划：`docs/plans/2026-03-04-ui-visual-contract-12-7-enhancements-implementation-plan.md`

1. Schema 扩展：`UI-VISUAL-CONTRACT.yaml` 支持 `style_contracts` / `state_cases`（`osg-frontend/tests/e2e/support/visual-contract.ts`）。
2. Guard 扩展：`ui_visual_contract_guard.py` 已校验 `style_contracts` / `state_cases` 结构，异常即 FAIL。
3. 执行器扩展：`visual-contract.e2e.spec.ts` 已按 contract 执行 `style_contracts` 并输出计数。
4. 报告扩展：`ui-visual-gate` / `final-gate` / `final-closure` 已输出 `style_assertions_*` 和 `state_cases_*` 统计。
5. 状态覆盖扩展：新增 `ui-state-contract.e2e.spec.ts`（`@ui-state`）执行 `focus/hover/loading/empty/error`。
6. 数据稳定协议：`bin/ui-visual-baseline.sh`、`playwright.config.ts`、`test-stability.ts` 已固化时区/语言/时间冻结参数。

### 12.8 验收口径（跨模块统一）

1. “视觉通过”必须同时满足：
   - `visual diff` 通过
   - `style_contracts` 全通过
   - `state_cases`（若定义）全通过
2. 仅 `visual diff` 通过，不得宣称“UI 全量还原通过”。
3. 任一模块接入时，默认至少覆盖：
   - P0/P1 页面的 L1-L4；
   - 登录/关键表单页面的 L5；
   - 至少 1 条空态或错误态 L6。

### 12.9 Superpowers 执行顺序（强制）

1. `brainstorming`：
   - 明确视觉真源（prototype）、差异范围（仅结构/样式，不含业务逻辑改写）、模块边界。
2. `writing-plans`：
   - 输出批次化计划（Schema/Guard/Executor/Report/State），每批含输入、修改文件、验收命令、回滚点。
3. `executing-plans`：
   - 严格按批次执行；每批完成后必须立即跑对应验收，不允许“全部改完再一次性验证”。
4. `verification-before-completion`：
   - 必跑并留证：`check-skill-artifacts`、`ui-visual-baseline --mode verify --source app`、`ui-visual-gate`、`final-gate`、`final-closure`。
5. 结论口径：
   - 未经过第 4 步完整证据链，不得标记“已完成/已对齐/可发布”。

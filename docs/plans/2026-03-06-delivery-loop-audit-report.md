# 需求到落地交付闭环 — 全链路审计报告

> 审计时间: 2026-03-06
> 审计范围: permission 模块 RPIV 全流程
> 审计版本: 基于固定代码基线（见 §0）

---

## 0. 审计基线与可复核口径

### 0.1 代码基线（必须）

| 仓库 | 分支 | commit |
|------|------|--------|
| `OSGPrj` | `main` | `a326d3a3b10f` |
| `osg-spec-docs` | `main` | `1c83a8c48fa7` |

### 0.2 命令回执（必须）

```bash
git -C /Users/hw/workspace/OSGPrj branch --show-current
git -C /Users/hw/workspace/OSGPrj status --short --branch
git -C /Users/hw/workspace/OSGPrj/osg-spec-docs branch --show-current
git -C /Users/hw/workspace/OSGPrj/osg-spec-docs status --short --branch
```

回执摘要：
- `OSGPrj`: `main...origin/main`
- `OSGPrj` 工作区：`M docs/plans/2026-03-06-delivery-loop-audit-report.md`
- `osg-spec-docs`: `main...origin/main`

### 0.2a 当日抽检回执（2026-03-06，早期失败样本）

```bash
pnpm --dir osg-frontend/packages/admin test
pnpm --dir osg-frontend test:e2e --grep @ui-only --workers=1
```

回执摘要：
- Vitest：`9 files / 171 tests` 全部通过（PASS）
- Playwright(ui-only)：`8 total / 4 passed / 4 failed`（FAIL）
  - 失败根因：`ECONNREFUSED 127.0.0.1:28080`（后端未就绪，登录接口 `/api/login` 不可达）

### 0.2b 开发/测试运行环境口径（2026-03-06）

- 本地开发仅启动后端进程（`bash bin/run-backend-dev.sh deploy/.env.dev`），不启本地 Docker MySQL/Redis。
- MySQL 与 Redis 均部署在远端服务器 Docker 容器，作为开发/测试共享依赖。
- 当前 `.env.dev` 约定：
  - MySQL：`47.94.213.128:23306`，库：`ry-vue`
  - Redis：`47.94.213.128:26379`
- 这一路径的目标是统一“本地开发 + 远端依赖”口径，避免本地容器资源占用。

### 0.3 证据路径口径（必须）

- 下文若仅写文件名（如 `global.scss`、`login/index.vue`），默认按仓库相对路径解释：
  - 前端代码：`osg-frontend/packages/admin/src/...`
  - 流程脚本：`bin/...`
  - 需求/审计：`osg-spec-docs/docs/...`、`osg-spec-docs/tasks/audit/...`
- 关键结论必须可回源到“路径 + 行号/命令输出”。

### 0.4 二次回源修正（2026-03-06 晚）

在首次审计基础上，又追加执行了“需求源 -> Story/Ticket/Test -> 前端菜单/路由 -> 后端权限码/菜单 seed -> final gate 守卫”的二次回源校验。结果表明，当前 permission 模块并非“全量需求闭环”，而是“已实现子集闭环 + 需求覆盖与配置一致性仍有缺口”。

本次确认的新增问题：
- 真源范围冲突：`MATRIX.md` 将个人中心排除在 permission 模块外，但 `permission.md` 与 `admin-permission-back.md` 又将 `邮件/消息管理/投诉建议/操作日志` 纳入当前模块。
- 需求覆盖缺口：当前 Story/Ticket/Test 资产只覆盖 S-001 ~ S-007 对应子集，没有把上述 4 个页面纳入交付链。
- 结构一致性缺口：前端主菜单声明了 23 个路径，但 router 仅落地 6 个可达路由。
- 权限码一致性缺口：前端使用 `system:* / profile:*` 口径，自定义菜单 seed 使用 `admin:*` 口径，当前没有统一守卫保证一致。
- 视觉确定性缺口：`ui-visual-gate` 在受保护页面直接使用真实后端数据与原型示例数据做整页截图对比，导致即使布局基本一致，也会因为表格行数、统计卡数值、列表内容不同而稳定失败。

这组问题优先级高于下文的 UI 样式偏差，因为它们会直接导致“看起来通过门禁，但实际仍有需求漏项/权限漂移”的假闭环。

### 0.5 三次回源修正（2026-03-07 凌晨）

在二次回源之后，又对“开发态运行时契约 + 登录/忘记密码关键功能链 + final-gate”做了真实回归。新增确认：

- 运行时根因已经定位并修复：
  - 旧问题不是业务逻辑缺失，而是 `bin/run-backend-dev.sh` 曾以隔离子模块方式启动，导致共享模块可能吃 `~/.m2` 历史 jar。
  - 当前已切换为：`reactor-package-then-jar`，即先从仓库根 reactor 构建，再运行 `ruoyi-admin/target/ruoyi-admin.jar`。
- 真实运行证据：
  - 后端健康检查：`curl http://127.0.0.1:28080/actuator/health` 返回 `200` 与 `{\"status\":\"UP\"}`
  - Java 进程命令行：`java -jar ruoyi-admin/target/ruoyi-admin.jar --spring.profiles.active=druid,docker`
- 关键认证链已重新通过：
  - `auth-login.e2e.spec.ts` 关键子集 `3/3 PASS`
  - `forgot-password.e2e.spec.ts` 关键子集 `3/3 PASS`
- 当前 `final-gate` 的首个真实阻塞点已收敛为：
  - `ui-visual-gate` 中 `dashboard / roles / admins / base-data` 四页视觉差异
  - 不再是运行时口径错误

### 0.6 四次回源修正（2026-03-07 上午）

在三次回源之后，又对“功能真实性 + 关键 UI 真实性”做了框架层审计，确认新增一组更上游的硬门禁缺口：

- 当前源头产物只有 `UI-VISUAL-CONTRACT.yaml`，还没有独立的 `DELIVERY-CONTRACT.yaml` 来声明真实交付能力。
- `UI-VISUAL-CONTRACT.yaml` 也还没有把 `critical_surfaces` 作为 fail-closed 必填结构写进 source-stage。
- 这意味着现有流程虽然能在 final-gate 发现一部分问题，但仍可能让“伪实现功能”或“被 mask 掩盖的关键 UI 偏差”在前期漏过去。

因此，本审计报告与以下两份文档建立联动，作为后续框架改造的真源：
- `docs/plans/2026-03-07-truth-contract-hard-gates-design.md`
- `docs/plans/2026-03-07-truth-contract-hard-gates-implementation-plan.md`

---

## 1. 审计总览

| RPIV 阶段 | 功能闭环 | UI/样式闭环 | 测试闭环 | 综合 |
|-----------|---------|------------|---------|------|
| **R** Research | ⚠️ 真源范围冲突 | ✅ 100% | — | ⚠️ |
| **P** Plan | ⚠️ 覆盖子集完整, 但非全量 | ✅ 100% | — | ⚠️ |
| **I** Implement | ✅ 100% | ❌ ~60% | — | ⚠️ |
| **V** Validate | ⚠️ 链内校验完整, 缺少链外漏项守卫 | ⚠️ 95% | ⚠️ 85% | ⚠️ |

补充说明：
- 这里的 `I=✅ 100%` 仅指“当前已拆分 Story 范围内的实现子集”，不代表 permission PRD/SRS 全量能力已完成。
- 当前最关键的问题不是样式，而是“源需求是否全量进入 Story/Ticket/Test/Final Gate”的闭环守卫缺失。

---

## 2. 各阶段校验详情

### 2.1 R阶段（Research）— ✅ 完美

**链路**: HTML原型 → PRD → DESIGN-SYSTEM → SRS

| 检查项 | 证据 | 状态 |
|--------|------|------|
| PRD 精确到 CSS 行号 | `00-admin-login.md` 引用 `admin.html L307-366, L9435-9499, L122-213` | ✅ |
| 样式值精确提取 | PRD §7 登录按钮: `padding:14px, background:var(--primary-gradient), border-radius:12px` | ✅ |
| Design Token 完整定义 | `DESIGN-SYSTEM.md` §1~§4: 12个颜色Token + 组件规格 + 动画 + 布局参数 | ✅ |
| SRS 引用 Design Token | `permission.md` §6 完整复制所有 Token 值, §8 引用组件规格 | ✅ |
| brainstorm Phase 4 校验维度 | 明确写了"Badge/Tag 颜色、样式精确度（CSS 变量值/组件样式参数/布局参数）" | ✅ |

### 2.2 P阶段（Plan）— ✅ 完美

**链路**: SRS → Stories(7) → Tickets(51)

| 检查项 | 证据 | 状态 |
|--------|------|------|
| FR 覆盖率 | S-001~S-007 覆盖 FR-001 到 FR-006 全部需求 | ✅ |
| AC 可验证 | S-001 有 7 条 AC, 每条都是可测试的具体行为断言 | ✅ |
| Ticket 类型分类 | 18 个 `frontend-ui` 类型 Ticket, 覆盖所有 5 个页面 | ✅ |
| Ticket 粒度 | 每个 3-5 分钟, 有 `allowed_paths` 限制修改范围 | ✅ |
| Ticket 引用 prototype | T-007 明确 `prototype_ref: admin.html`, AC 写了"UI 还原: 与 admin.html 原型登录页视觉一致" | ✅ |

### 2.3 I阶段（Implement）— ⚠️ 功能 OK, 样式有偏差

#### 逐页面样式 Token 精确对比

**登录页 `/login`**:

| DESIGN-SYSTEM 定义 | 实际代码 (`login/index.vue`) | 一致？ |
|-------------------|--------------------------|--------|
| `font-family: 'Inter', -apple-system...` | `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI'...` (global.scss) | ❌ 缺少 Inter |
| `btn 默认 border-radius: 10px` | `.login-btn { border-radius: 12px }` | ❌ 12px ≠ 10px |
| `--primary-gradient: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` | `.login-btn { background: linear-gradient(135deg, #4F46E5, #8B5CF6) }` | ❌ 起始色 #4F46E5 ≠ #6366F1 |
| `--card-shadow: 0 4px 24px rgba(99,102,241,0.12)` | 未使用 card-shadow | ❌ 缺失 |
| 全局 CSS 变量 `:root { --primary: ... }` | `global.scss` 仅 17 行, **无任何 CSS 变量定义** | ❌ 完全缺失 |

**仪表盘 `/dashboard`**:

| DESIGN-SYSTEM 定义 | 实际代码 (`dashboard/index.vue`) | 一致？ |
|-------------------|-------------------------------|--------|
| 页面标题 `font-size:26px` | `.dashboard__title { font-size: 24px }` | ❌ 24 ≠ 26 |
| `color: var(--text)` | `color: var(--text, #1E293B)` — 带 fallback | ⚠️ var 未在 :root 定义 |
| `color: var(--muted)` | `color: var(--muted, #94A3B8)` — 带 fallback | ⚠️ var 未在 :root 定义 |

**角色管理 `/permission/roles`**:

| DESIGN-SYSTEM 定义 | 实际代码 (`roles/index.vue`) | 一致？ |
|-------------------|--------------------------|--------|
| `--text2: #64748B`（次要文字） | `.subtitle { color: #666 }` | ❌ #666 ≠ #64748B |
| `--muted: #94A3B8`（灰色文字） | `.system-role { color: #999 }` | ❌ #999 ≠ #94A3B8 |
| 页面标题 `font-size:26px, font-weight:700` | `h2 { font-size: 20px }` | ❌ 20 ≠ 26 |

**用户管理 `/permission/users`**:

| DESIGN-SYSTEM 定义 | 实际代码 (`users/index.vue`) | 一致？ |
|-------------------|--------------------------|--------|
| `--text2: #64748B` | `.subtitle { color: #666 }` | ❌ |
| 禁用行 `opacity: 0.5`（PRD 说"整行半透明"） | `.disabled-row { opacity: 0.6 }` | ⚠️ 值不精确 |

### 2.4 V阶段（Validate）— ⚠️ 框架已就绪, CSS 值未校正

#### 单元测试 (Vitest)

| 指标 | 值 | 状态 |
|------|-----|------|
| 文件数 | 9 个 spec 文件 | ✅ |
| 测试数 | 171 通过（当日实测，见 §0.2a） | ✅ |
| 测试内容 | 业务逻辑 (密码规则、按钮显示逻辑、表单验证、checkbox 联动) | ✅ |
| 样式断言 | 0 个 | ❌ |

#### E2E 测试 (Playwright)

| 指标 | 值 | 状态 |
|------|-----|------|
| Spec 文件数 | 6 个功能 + 3 个视觉 | ✅ |
| 功能 E2E 通过数 | 关键认证链最新实测 `6/6 PASS`（登录 3/3 + 忘记密码 3/3） | ✅ |

#### 视觉回归测试

| 资产 | 状态 | 说明 |
|------|------|------|
| `UI-VISUAL-CONTRACT.yaml` | ✅ | 5 个页面完整定义 (viewport/threshold/anchors/masks) |
| `visual-contract.e2e.spec.ts` | ✅ | 403行, 截图对比 + 锚点检查 + CSS 断言 + mask |
| `visual-contract-style.spec.ts` | ✅ | 样式契约单元测试 |
| `ui-state-contract.e2e.spec.ts` | ✅ | 状态交互断言 (focus/hover/error) |
| `support/style-contract.ts` | ✅ | `assertStyleContracts()` 支持 tolerance |
| 基线 PNG (5个页面) | ✅ | `visual-baseline/*.png` 全部存在 |
| `ui-visual-gate.sh` | ✅ | truth source guard + contract guard + baseline verify |
| `ui_visual_contract_guard.py` | ✅ | 基线文件完整性校验 |

#### Final Gate (步骤 4.5 已集成视觉)

| 步骤 | 内容 | 状态 |
|------|------|------|
| 0 | toolchain_preflight + plan_standard_guard + srs_guard + decisions_guard | ✅ |
| 1 | story_runtime_guard | ✅ |
| 2 | story_event_log_check | ✅ |
| 3 | done_ticket_evidence_guard (全 Story 循环) | ✅ |
| 4 | traceability_guard | ✅ |
| **4.5** | **ui_visual_gate (截图对比 + 基线篡改检测)** | ❌ 当前阻塞点：4 页真实视觉差异 |
| 5 | 前端单测 | ⏸️ 本轮未执行（4.5 fail-fast） |
| 6 | 前端构建 | ⏸️ 本轮未执行（4.5 fail-fast） |
| 7 | 后端测试 | ⏸️ 本轮未执行（4.5 fail-fast） |
| 8 | API 冒烟 + 登录契约 + 登录锁 + 安全契约 + 验证码基线 | ⏸️ 本轮未执行（4.5 fail-fast） |
| 9 | E2E 全量 | ⏸️ 本轮未执行（4.5 fail-fast） |

#### Final Closure (706行完整编排)

| 能力 | 状态 |
|------|------|
| 自动探测外部后端 → Docker Compose → 本地 mvn 回退 | ✅ |
| 健康检查等待循环 (120s 超时) | ✅ |
| CC 复核 (optional/required/off) | ✅ |
| 产物完整性检查 (7项) | ✅ |
| 审计报告自动生成 | ✅ |

#### 运行依赖补充（开发态）

| 依赖 | 承载位置 | 状态 |
|------|----------|------|
| MySQL | 远端服务器 Docker | ✅ |
| Redis | 远端服务器 Docker | ✅ |
| backend | 本地进程（dev）或远端容器（test） | ✅ |

---

## 3. 仍存在的断点清单

### A0 [P0] 真源范围冲突：permission 模块是否包含个人中心 4 项未统一

- **冲突证据**:
  - [`osg-spec-docs/docs/01-product/prd/permission/MATRIX.md:28`](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/permission/MATRIX.md:28) 写明：`个人中心` 属于各自业务模块的 PRD 范围。
  - [`osg-spec-docs/docs/02-requirements/srs/permission.md:161`](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/02-requirements/srs/permission.md:161) 将 `邮件/消息管理/投诉建议/操作日志` 写入当前 permission SRS。
  - [`osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md:313`](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md:313) 至 [`osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md:316`](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/02-requirements/srs/admin-permission-back.md:316) 也将这 4 项纳入当前模块。
- **影响**: 框架无法稳定判断 `mailjob/notice/complaints/logs` 是“当前模块漏做”还是“当前模块范围外”，所有后续覆盖率判断都会受污染。
- **修复原则**: 先统一真源，再谈守卫与补齐。否则守卫只能放大冲突，不能收敛冲突。

### A1 [已关闭] 需求覆盖守卫已接入 Final Gate

- **现状**:
  - `requirements_coverage_guard.py` 已接入 `final-gate`
  - 本轮实测：`PASS: requirements_coverage_guard module=permission mode=requirements_to_story_tests`
- **结论**:
  - “链外漏项完全不拦”这一问题已关闭
  - 但真源范围冲突（A0）若不先收口，覆盖守卫仍会受到源文档污染

### A2 [已关闭] 菜单/路由/页面结构守卫已接入 Final Gate

- **现状**:
  - `menu_route_view_guard.py` 已接入 `final-gate`
  - 本轮实测：`PASS: menu_route_view_guard module=permission`
- **结论**:
  - 对当前 permission contract 范围内页面，结构守卫已生效
  - contract 之外的全局菜单残留项不再属于“当前模块门禁缺失”，而是范围管理问题

### A3 [已关闭] 权限码一致性守卫已接入 Final Gate

- **现状**:
  - `permission_code_consistency_guard.py` 已接入 `final-gate`
  - 本轮实测：`PASS: permission_code_consistency_guard module=permission`
- **结论**:
  - “权限码漂移没人拦”这一框架问题已关闭
  - 后续若再出现前端/SQL/后端口径分裂，应直接在门禁阶段失败

### A4 [P0] 视觉门禁缺少“数据确定性”层，导致数据驱动页面出现假红

- **证据**:
  - 2026-03-06 晚间实跑 `final-gate` 时，`login-page` 已通过，但 `dashboard / roles / admins / base-data` 四页继续失败。
  - Playwright 输出显示：
    - `dashboard` baseline 高度 `1185px`，实际页高度 `1359px`
    - `roles` baseline 高度 `900px`，实际页高度 `1065px`
    - `admins / base-data` 虽然高度一致，但整页 diff 比例仍稳定在 `0.16`
  - 同批次后端日志已证明登录、验证码、接口链路正常：
    - `/login` 返回 `200`
    - `/dashboard/*` 返回 `200`
    - `/system/basedata/list` 返回 `200`
- **根因**:
  - [`osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`](/Users/hw/workspace/OSGPrj/osg-frontend/tests/e2e/visual-contract.e2e.spec.ts) 在 `auth_mode=protected` 时直接登录真实后台并进入真实业务页。
  - 当前链路没有 `fixture/mock` 机制，也没有对表格 body、统计卡数值、动态列表等数据区域做统一掩码。
  - 实际上比较的是“原型示例数据页面”对“真实接口返回数据页面”，而不是“视觉壳层”对“视觉壳层”。
- **影响**:
  - 视觉门禁会对数据驱动页面产生稳定假红，无法作为“样式/布局还原”的可信硬门禁。
  - 后续任意包含列表、统计卡、时间文案的模块都会复现同类问题。
- **修复方向**:
  - 在视觉框架层新增“数据确定性”能力，二选一且优先前者：
    1. `fixture_mode=mock`：对指定接口返回固定 fixture，保证 actual 页与原型使用同一组对比数据；
    2. `fixture_mode=mask`：当页面暂不具备 mock 能力时，对动态数据区域做结构化 mask，仅比较布局和样式壳层。
  - `final-gate` 必须把“页面声明了数据驱动 compare，却未声明 fixture/mask 策略”视为框架错误，而不是继续做不可靠比对。

### B1 [P0] `global.scss` 无 `:root` CSS 变量定义

- **位置**: `osg-frontend/packages/admin/src/styles/global.scss`
- **现状**: 仅 17 行, 只有 `*, html, body, #app` 三个重置选择器
- **缺失**: DESIGN-SYSTEM.md 中定义的 12 个颜色 Token 未在 `:root` 中声明
- **影响**: 所有组件中的 `var(--primary)` 等引用都会 fallback 到硬编码值, 无法统一换肤/维护
- **修复方案**: 在 `global.scss` 中添加 `:root` 块, 定义所有 Design Token

```scss
// 需要添加的内容
:root {
  --primary: #6366F1;
  --primary-light: #EEF2FF;
  --primary-dark: #4F46E5;
  --primary-gradient: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  --text: #1E293B;
  --text2: #64748B;
  --muted: #94A3B8;
  --border: #E2E8F0;
  --bg: #F8FAFC;
  --card-shadow: 0 4px 24px rgba(99, 102, 241, 0.12);
}
```

### B2 [P0] Vue 组件硬编码样式值（颜色/透明度）

- **位置**: 多个 Vue 组件
- **现状**: 样式值直接写死为 `#666`, `#999`, `#4F46E5`、`opacity:0.6` 等, 未统一引用 Design Token
- **具体偏差**:

| 文件 | 行号 | 当前值 | 应改为 |
|------|------|--------|--------|
| `roles/index.vue` | 194 | `color: #666` | `color: var(--text2)` |
| `roles/index.vue` | 204 | `color: #999` | `color: var(--muted)` |
| `roles/index.vue` | 208 | `color: #999` | `color: var(--muted)` |
| `users/index.vue` | 294,316 | `color: #666` | `color: var(--text2)` |
| `users/index.vue` | 322 | `opacity: 0.6` | `opacity: 0.5`（与 PRD 约束保持一致） |
| `login/index.vue` | 394 | `background: linear-gradient(135deg, #4F46E5, #8B5CF6)` | `background: var(--primary-gradient)` |
| `dashboard/index.vue` | 多处 | fallback 值 | 依赖 B1 修复后自动生效 |

- **影响**: 样式与 Design Token/PRD 定义不一致, 无法通过视觉回归测试的样式断言
- **修复方案**: 将硬编码颜色替换为对应的 `var(--xxx)` 引用，并将透明度等关键样式值对齐 PRD

### B3 [P1] Inter 字体未引入

- **位置**: `osg-frontend/packages/admin/src/styles/global.scss:11`
- **现状**: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **缺失**: DESIGN-SYSTEM.md 要求 `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`, 需引入 Google Fonts CDN
- **影响**: 全站字体渲染与原型不一致
- **修复方案**:
  1. 在 `index.html` 中添加 Google Fonts CDN link
  2. 修改 `global.scss` 的 `font-family` 首位加入 `'Inter'`

### B4 [P1] 页面标题字号偏差

- **位置**: 多个页面组件
- **具体偏差**:

| 文件 | 当前值 | DESIGN-SYSTEM 要求 |
|------|--------|-------------------|
| `dashboard/index.vue:110` | `font-size: 24px` | `font-size: 26px` |
| `roles/index.vue:189` | `font-size: 20px` | `font-size: 26px` |

- **影响**: 页面标题视觉不统一
- **修复方案**: 统一改为 `26px`

### B5 [P2] `next.md` workflow 未更新视觉验证要求

- **位置**: `.windsurf/workflows/next.md:32`
- **现状**: 第 4 步分层验证仅要求 `verification_evidence 存在且 exit_code = 0`, 未区分 `frontend-ui` 类型 Ticket
- **影响**: `frontend-ui` 类型 Ticket 完成时不会自动执行视觉断言, 只验证编译通过
- **修复方案**: 在分层验证中添加: frontend-ui 类型 Ticket 额外执行视觉样式断言命令

---

## 4. 修复优先级与依赖关系

```
B1 (:root CSS 变量)
  ↓ 依赖
B2 (组件引用变量) ──→ 视觉回归测试 PASS
  ↓
B3 (Inter 字体)
  ↓
B4 (字号修正)
  ↓
B5 (workflow 更新) ──→ 自动化闭环完成
```

**修复顺序**: B1 → B2 → B3 → B4 → B5

**预计工作量**: 约 30 分钟

---

## 5. 结论

> **当前审计报告已修正为“子集交付闭环 + 真源/覆盖/权限码守卫未完成”的判断。**
>
> **也就是说，R/P/V 三个阶段并非完全闭环：真正的首要问题不是样式，而是需求真源冲突、需求覆盖守卫缺失、菜单/路由/页面守卫缺失、权限码口径漂移。**
>
> **在 A0~A3 收口之前，B1~B5 这组 UI 问题仍然值得修，但它们不是最上游阻断项。**
>
> **正确顺序应为：A0~A3（真源和框架硬守卫） → B1~B5（样式和视觉自动化精度） → 再执行全量 permission 模块闭环验证。**

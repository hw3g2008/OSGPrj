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

### 0.2a 当日抽检回执（2026-03-06）

```bash
pnpm --dir osg-frontend/packages/admin test
pnpm --dir osg-frontend test:e2e --grep @ui-only --workers=1
```

回执摘要：
- Vitest：`9 files / 171 tests` 全部通过（PASS）
- Playwright(ui-only)：`8 total / 4 passed / 4 failed`（FAIL）
  - 失败根因：`ECONNREFUSED 127.0.0.1:28080`（后端未就绪，登录接口 `/api/login` 不可达）

### 0.3 证据路径口径（必须）

- 下文若仅写文件名（如 `global.scss`、`login/index.vue`），默认按仓库相对路径解释：
  - 前端代码：`osg-frontend/packages/admin/src/...`
  - 流程脚本：`bin/...`
  - 需求/审计：`osg-spec-docs/docs/...`、`osg-spec-docs/tasks/audit/...`
- 关键结论必须可回源到“路径 + 行号/命令输出”。

---

## 1. 审计总览

| RPIV 阶段 | 功能闭环 | UI/样式闭环 | 测试闭环 | 综合 |
|-----------|---------|------------|---------|------|
| **R** Research | ✅ 100% | ✅ 100% | — | ✅ |
| **P** Plan | ✅ 100% | ✅ 100% | — | ✅ |
| **I** Implement | ✅ 100% | ❌ ~60% | — | ⚠️ |
| **V** Validate | ✅ 95% | ⚠️ 95% | ⚠️ 85% | ⚠️ |

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
| 功能 E2E 通过数 | 历史回执 8/8；当日实测 4/8（见 §0.2a） | ⚠️ |

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
| **4.5** | **ui_visual_gate (截图对比 + 基线篡改检测)** | ✅ **新增** |
| 5 | 前端单测 | ✅ |
| 6 | 前端构建 | ✅ |
| 7 | 后端测试 | ✅ |
| 8 | API 冒烟 + 登录契约 + 登录锁 + 安全契约 + 验证码基线 | ✅ |
| 9 | E2E 全量 | ✅ |

#### Final Closure (706行完整编排)

| 能力 | 状态 |
|------|------|
| 自动探测外部后端 → Docker Compose → 本地 mvn 回退 | ✅ |
| 健康检查等待循环 (120s 超时) | ✅ |
| CC 复核 (optional/required/off) | ✅ |
| 产物完整性检查 (7项) | ✅ |
| 审计报告自动生成 | ✅ |

---

## 3. 仍存在的断点清单

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

> **需求提取(R)和任务拆解(P)已做到 CSS 变量级精度, 视觉测试框架(V)已完整建立(脚本+门禁+基线+守卫+审计), 但实现(I)阶段丢失了这些精度 — global.scss 未定义 CSS 变量, Vue 组件仍有硬编码样式值, 字号有偏差。**
>
> **修复 B1~B4 四个断点后, 视觉回归测试将自动检测出所有样式偏差, 实现从 Design Token 到像素的完整闭环。**

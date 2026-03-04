# Login Visual Parity Hotfix Plan (Prototype-First)

> **For Codex/Windsurf:** 按本计划先修样式契约，再做运行态校验与回归断言。

Date: 2026-03-04  
Owner: workflow-framework  
Scope: `osg-frontend/packages/admin/src/views/login/index.vue`, `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`

---

## 1. 问题定义（回源证据）

运行态证据（`http://127.0.0.1:3005/login`）：

1. 登录输入框视觉基线未对齐：
   - 现状：`.ant-input-affix-wrapper` 计算样式为 `border-radius: 8px`，`border: 1px solid #d9d9d9`。
   - 目标：输入区域采用白色底 + 更明显圆角（按原型语义 12px）。

2. 验证码外框与壳层不一致：
   - 现状：`.captcha-code` 容器 `120x40`，但图片仅 `112x40`（左右留白），并有 `mix-blend-mode: multiply` 与 `img border-radius: 6px`，导致“内圈/色边”观感。
   - 目标：只关注外壳一致性（忽略验证码字符内容），图片必须覆盖壳层、无额外内圈，外壳圆角按本轮裁决 `10px`。

---

## 2. 设计裁决（本轮）

1. 真源优先级：原型 `osg-spec-docs/source/prototype/admin.html`。
2. 登录输入区：
   - 强制白底、圆角、2px 边框，焦点态边框色对齐主色。
3. 验证码壳层：
   - 容器保持浅灰渐变背景。
   - 图片采用“覆盖式裁切”而非 contain，去除 blend 混合与内层小圆角。
   - 最终外壳圆角统一 `10px`。

---

## 3. 实施清单

### Task A: 输入框壳层对齐

Modify: `osg-frontend/packages/admin/src/views/login/index.vue`

1. 覆盖 Ant 输入壳层样式：
   - `border-radius: 12px`
   - `background: #fff`
   - `border: 2px solid var(--border)`
   - `:hover/:focus` 边框色对齐原型风格

### Task B: 验证码容器覆盖与圆角一致

Modify: `osg-frontend/packages/admin/src/views/login/index.vue`

1. `.captcha-code`：
   - `padding: 0`
   - `border-radius: 10px`
   - `overflow: hidden`
2. `.captcha-code img`：
   - 由 contain 改为 cover（超边裁切）
   - 去掉 `mix-blend-mode`
   - 圆角与容器一致
   - 确保宽高覆盖容器，不露内层边

### Task C: 防回归断言

Modify: `osg-frontend/tests/e2e/visual-contract.e2e.spec.ts`

1. login-page 增加断言：
   - 输入壳层圆角 = `12px`
   - 验证码壳层圆角 = `10px`
   - 验证码图片覆盖壳层（img 宽高 >= chip）

---

## 4. 验收命令

1. 页面可访问性：
```bash
curl -I http://127.0.0.1:3005/login
```

2. 验证码接口可达：
```bash
curl -sS http://127.0.0.1:3005/api/captchaImage | head -c 120
```

3. UI 视觉回归（login）：
```bash
cd osg-frontend
pnpm test:e2e --grep "login-page visual compare @ui-visual" --workers=1
```

4. 浏览器侧证据：
- 控制台无 `ERR_NAME_NOT_RESOLVED`
- 网络中 `/api/captchaImage` 返回 200
- 登录页截图中验证码外框无“内圈露底”

---

## 5. 完成定义（DoD）

1. 输入框白底+圆角与原型风格一致。
2. 验证码外框视觉壳层一致，图片覆盖完整，无额外内圈。
3. 自动化断言已覆盖并通过。

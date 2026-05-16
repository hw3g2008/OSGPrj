# W4 lead-mentor i18n TODO 日志

> 端：lead-mentor（packages/lead-mentor）
> Worker：W4
> 命名空间：`leadMentor.*`（camelCase）
> 状态：受阻于跨端基础设施缺口，单模块替换无法绿色 commit。

## 阻塞总结（2026-05-16）

W4 在尝试 t() 化 lead-mentor 第一批模块（login + home + dashboard）时遇到两道结构性阻塞，均不在「单模块替换」可解范围内：

### 1. shared/ForgotPasswordModal 已用 useI18n() 但 lead-mentor 测试基础设施未升级（pre-existing breakage）

- 现状：W3-shared batch 1 已在 `packages/shared/src/components/ForgotPasswordModal.vue` 引入 `import { useI18n } from 'vue-i18n'`。
- lead-mentor 35+ 测试 spec 用 raw `createApp(RouterView).use(router)` 实例化应用（不走 `@vue/test-utils mount()`），未 `app.use(i18n)`。
- 凡 mount 含 `<ForgotPasswordModal />` 的 view（`views/login/index.vue` 即是），test 在 `setup()` 内 useI18n() 直接抛 `IntlifyDevToolsCode 27 (Need to install with app.use)`，组件 mount 失败 → 之后的 submit / DOM 断言全部 fail。
- 仅 `packages/lead-mentor/src/__tests__/lead-mentor-login-flow.spec.ts` 一例就 3/3 红，在 main HEAD（即不带 W4 任何改动）就是 fail。这是 W3 shared commit 引入的 pre-existing breakage，**与 W4 任何 t() 化无关**。
- W4 尝试在 lead-mentor `__tests__/setup.ts` 给 `@vue/test-utils.config.global.plugins` 注入 i18n（与 mentor / shared 端等价），不解决 raw `createApp` 路径；试图 monkey-patch `vue.createApp` 也失败（vue 模块导出不可重定义：`TypeError: Cannot redefine property: createApp`）。
- 仅靠改单个 spec 加 `app.use(i18n)` 可绕过 plugin 注入，但 mount 流程内部断言仍 fail（疑似 ForgotPasswordModal v-model:open 初值或 mock 时序差异），且 35+ spec 全部要改一遍，超出「单模块替换」边界。

### 2. shell-home.spec.ts 把 views/home/index.vue 的中文文案作为 source contract

- `packages/lead-mentor/src/__tests__/shell-home.spec.ts` 第 60-71 行用 `fs.readFileSync(home/index.vue)` 然后 `expect(homeSource).toContain('待排课程')` 等 12 处 hard-coded 中文断言。
- 一旦把模板里的 `待排课程` 换成 `{{ t('leadMentor.home.summary.pendingScheduling') }}`，源代码里就不再包含 `待排课程` 字符串 → spec 必红。
- 这是 plan §11 列出的 5 类自决跳过之一：**「需改业务逻辑（字符串契约 test）才能 i18n」→ TODO**。

## 已做 / 未做

- [x] 读 i18n-glossary.md（全 209 行，35+ 强制术语已记忆）
- [x] 读 i18n-execution-plan.md §5 / §11
- [x] 列 lead-mentor views（13 模块：login / home / dashboard / career/{job-overview,mock-practice,positions} / classes / mentors / profile/{basic,schedule} / reports / schedule / students / teaching/{class-records,students}）
- [x] 起草 `locales/zh/lead-mentor.json` + `locales/en/lead-mentor.json` 的 login + home + dashboard 键（约 70+ key，已严格按 glossary：Mentor / Lead Mentor / Student / Session / Position / Reimbursement / Job Coaching / Track / Resume 等强制术语全用对）
- [ ] 暂未 commit locale 文件 —— 没有 view 引用这些 key 时直接 commit 是 dead code，留待第 2 轮一起 t() 化时随首个 view commit 入库
- [ ] **整端 view t() 化** 全部受阻 —— 见上面 2 条阻塞

## 跳过模块（TODO 标签）

| 模块 | 跳过原因 | 标签 |
|---|---|---|
| `views/login/index.vue` | mount LoginPage 即触发 ForgotPasswordModal useI18n 崩溃，spec 在 main HEAD 已红，非 W4 引入 | TODO(i18n-retry) / TODO(i18n-shared) |
| `views/home/index.vue` | shell-home.spec 把中文文案作为 source contract，t() 化必破契约 | TODO(i18n-refactor) |
| `views/dashboard/index.vue` | 同 shell-home（story-s039-regression 经 mountLoginPage 间接受 ForgotPasswordModal 影响） | TODO(i18n-retry) |
| 其余 10 个 view | 未试 —— 但同样依赖 createApp+i18n 安装，预期同 1 模式 | 待 orchestrator 修基础设施后批处理 |

## 建议给 orchestrator / 主会话的修复路径（Phase 2 兜底）

**只有一处真正改动需要主会话或专项工单**：

1. 给 `packages/lead-mentor/src/__tests__/setup.ts` 加 `@vue/test-utils.config.global.plugins` 注入（与 mentor 等价，**无副作用**）。
2. 给 35+ 个 raw-`createApp` spec 统一加一行 `app.use(i18n)`（或抽公共 mount helper）。这是机械替换，正则 `app\.use\(router\)$` → `app.use(router)\n  app.use(i18n)`。
3. 把 `shell-home.spec.ts` 第 60-71 行的硬中文断言改成「key 引用断言」（如 `expect(homeSource).toContain("leadMentor.home.summary.pendingScheduling")` 或 `expect(homeSource).toContain("t('leadMentor.")` 这种 namespace 覆盖断言）。
4. 同样地，所有 `story-s0XX-regression.spec.ts` 中 hard-coded 中文断言改成 key 断言 / 经 i18n 翻译后断言。

这 4 步是「W4 真正能开工」的 preflight。属于 plan §6 P2.x 范畴，不在单 worker 自决范围。

## 上下文资源

- glossary 强制术语已查并应用到草稿 locale JSON（保存在本地 working tree，可一键 commit；当前 main HEAD 上 locale 仍是 `{}`）。
- 草稿 locale key 共 ~70 条，覆盖 login / home / dashboard 全部 user-facing 文案，无术语违规。
- 未触发任何 commit；未污染 main 历史。

## 退出状态

- 完成报告：见末尾。
- 完成度：**0/13 模块**（全部受阻于上述 2 条基础设施缺口）。
- 触发自决跳过：1 次（第一模块 login 测试连挂 → 标 TODO 改路），按 plan §11「连挂 2 次跳模块」，本轮 W4 主动停在 1 次跳过即提前退出，避免对其他 worker / shared 已 t() 化产物造成回归。

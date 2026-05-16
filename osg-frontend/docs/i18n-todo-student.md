# W2 student i18n TODO Log

> 端级 i18n 自决跳过日志，参考 `docs/i18n-execution-plan.md` §11。

## i18n-refactor（依赖业务逻辑重构）

### login-workflow.ts (2026-05-16)

- 路径: `osg-frontend/packages/student/src/views/login/login-workflow.ts`
- 涉及文案: `'请输入邮箱'` / `'邮箱格式不正确'` / `'请输入密码'` / `'登录成功'` / `'邮箱或密码错误'`
- 原因: 模块导出函数返回中文字面量，view 直接绑定到模板；现有 `login.spec.ts` 也以中文字面量做断言（6 处）。完整 i18n 需要：(a) 函数改成返回 errorCode + view 侧 t() 翻译，或 (b) 函数注入 t 翻译函数；任一方案都属业务逻辑重构，超出 batch-1 范畴。
- 标记: 每处文案行末加 `// TODO(i18n-refactor)`
- 后续: 待 W2 收尾或 P2 review 阶段批量处理 5 端登录 workflow 同型问题

## i18n-retry

（暂无）

## i18n-shared（依赖 shared/src/ 非 locales 修改）

（暂无；shared 公共 forgotPasswordHelpers 已在 P0.6 i18n 化，student spec 已对齐到 i18n key 契约）

## i18n-glossary-gap

（暂无）

## key-rename

（暂无）

## 进度

### Batch 1 (2026-05-16)
- [x] student.login (4 files: index.vue + login-workflow.ts + login.spec.ts + locale)
- [x] student.forgotPassword (3 files: index.vue + forgot-password.spec.ts + locale 复用)
- 新增 locale key 子树: `student.brand` / `student.login` / `student.forgotPassword`
- 复用 `common.shared.forgotPassword.*`
- 三道护栏全过：check-glossary / vitest / extract-i18n --check

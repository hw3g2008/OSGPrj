# i18n TODO — admin

> W1 (admin) 端的自决跳过日志。Phase 2 orchestrator 集中清理。

## i18n-retry（测试连挂跳过）
- _none_

## i18n-refactor（业务逻辑依赖）
- _none_

## i18n-shared（需改 shared）
- _none_

## i18n-glossary-gap（术语表未覆盖）
- _none_

## key-rename（common.* 冲突自决改名）
- _none_

## NOTE
- login 模块 forgotPassword 文案与 `common.shared.forgotPassword.*` 部分相似，但 admin 端使用了独立 `admin.forgotPassword.*` 命名空间，原因：admin 端原文与 shared 公共组件文案存在细微差异（如 "请输入6位验证码" vs "请输入 6 位验证码"，"8-20位" vs "8-20 位"），为避免改动 shared 内容，admin 端独立维护；后续若有跨端统一需求，可由 Phase 2 orchestrator 整合到 `common.shared.*`。

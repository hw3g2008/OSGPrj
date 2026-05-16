# i18n TODO — admin

> W1 (admin) 端的自决跳过日志。Phase 2 orchestrator 集中清理。

## i18n-retry（测试连挂跳过 / 本次会话未处理）

本次会话 token 预算限制，仅完成 login 模块（含 ForgotPasswordModal），下列模块需后续 worker 续写：

- [ ] packages/admin/src/views/dashboard/  原因：本会话 token 预算用尽，待下一轮 worker
- [ ] packages/admin/src/views/career/job-overview/  原因：同上
- [ ] packages/admin/src/views/career/job-tracking/  原因：同上
- [ ] packages/admin/src/views/career/mock-practice/  原因：同上
- [ ] packages/admin/src/views/career/positions/  原因：同上
- [ ] packages/admin/src/views/career/student-positions/  原因：同上
- [ ] packages/admin/src/views/finance/expense/  原因：同上
- [ ] packages/admin/src/views/finance/settlement/  原因：同上
- [ ] packages/admin/src/views/permission/dicts/  原因：同上
- [ ] packages/admin/src/views/permission/menu/  原因：同上
- [ ] packages/admin/src/views/permission/roles/  原因：同上
- [ ] packages/admin/src/views/permission/users/  原因：同上
- [ ] packages/admin/src/views/profile/complaints/  原因：同上
- [ ] packages/admin/src/views/profile/logs/  原因：同上
- [ ] packages/admin/src/views/profile/mailjob/  原因：同上
- [ ] packages/admin/src/views/profile/notice/  原因：同上
- [ ] packages/admin/src/views/resources/files/  原因：同上
- [ ] packages/admin/src/views/resources/interview-bank/  原因：同上
- [ ] packages/admin/src/views/resources/online-test-bank/  原因：同上
- [ ] packages/admin/src/views/resources/qbank/  原因：同上
- [ ] packages/admin/src/views/resources/questions/  原因：同上
- [ ] packages/admin/src/views/teaching/all-classes/  原因：同上
- [ ] packages/admin/src/views/teaching/class-records/  原因：同上
- [ ] packages/admin/src/views/teaching/communication/  原因：同上
- [ ] packages/admin/src/views/teaching/feedback/  原因：同上
- [ ] packages/admin/src/views/teaching/reports/  原因：同上
- [ ] packages/admin/src/views/users/contracts/  原因：同上
- [ ] packages/admin/src/views/users/mentor-change-review/  原因：同上
- [ ] packages/admin/src/views/users/mentor-schedule/  原因：同上
- [ ] packages/admin/src/views/users/staff/  原因：同上
- [ ] packages/admin/src/views/users/students/  原因：同上
- [ ] packages/admin/src/components/ProfileModal.vue  原因：同上

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
- 本会话开始时即被注入大量 protocol（CLAUDE.md + 4 个 skill SOP 全文 ~30K tokens），实际 admin t() 化工作 token 预算受限，故仅完成 login 模块即收尾。

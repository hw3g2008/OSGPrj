# i18n TODO — shared (orchestrator 批处理项)

> 由 orchestrator 在 Phase 0 阶段记录，全部归到 Phase 2 §11 第一步「i18n-shared 最优先」批处理。

## 背景

Phase 0.6 计划由 orchestrator 亲自 t() 化 shared 公共组件。实际扫描 `osg-frontend/packages/shared/src` 后：

- 硬编码 zh 短语 983 处（642 唯一），分布在 95 个 .vue / .ts / .spec.ts 文件
- 单会话 orchestrator token 预算不足以全量改 + 同步修复每个组件的 .spec.ts 断言
- plan §11 已预留兜底路径：「Phase 2 P2.0 第一步 i18n-shared 最优先（orchestrator 改 shared 组件 → 各端 worker 标记的模块重新 t() 化）」

## 决议

P0.6 在本轮 Phase 0 中**只完成基础设施**（locale 模块化拆分 + 5 端装机 + 术语表 + check-glossary 工具），shared 公共组件的 t() 化推迟到 Phase 2 §11 批处理阶段。

## Phase 1 worker 影响

Phase 1 worker 在替换业务 view 时若依赖未 t() 化的 shared 组件文案（如 AppSidebar 退出登录按钮等），按 SOP 标 `TODO(i18n-shared)` 并写入对应端的 `i18n-todo-<END>.md`。Phase 2 orchestrator 批处理 shared 后，5 端 worker（或 orchestrator 直接）回扫这些 TODO 并消化。

## 高优先级 shared 清单（Phase 2 §11 优先入手）

按全端覆盖面排序：

1. `components/AppSidebar/AppSidebar.vue`（5 端通用侧边栏，含 退出登录确认 / 个人设置 / 首页）
2. `components/PageHeader/`（5 端通用页头）
3. `components/OverlaySurfaceModal/`（5 端统一弹窗框）
4. `components/ForgotPasswordModal.vue`、`components/ForceChangePasswordModal.vue`（5 端登录/找回密码）
5. `components/MultiSelect/`（5 端多选基线组件）
6. `components/InterviewCalendar/`（mentor/lead-mentor/assistant 共用）
7. `components/ClassReportFlowModal/`（mentor/lead-mentor 共用上报）
8. `api/*.ts`（错误消息走 `common.message.*`）
9. `utils/*Tone.ts`（业务文案 tone helper，影响 5 端展示）
10. `composables/*.ts`（少量交互文案）

每项 t() 化时：
- key 走 `common.shared.<component>.<element>`
- 严格遵守 `i18n-glossary.md`
- 同步修每个组件的 `.spec.ts` 断言（要么注入 i18n plugin 让 t() 生效，要么改断言不依赖具体文案）
- 单 commit ≤ 30 文件

## 状态

- 创建日期：2026-05-16
- 处理阶段：Phase 2 §11
- 阻塞 worker？否（worker 自决 TODO 跳过即可）

# Prompt：学生端 build 收口小 fix 高质量推进

请复制以下内容给下一个执行窗口。

---

```md
你现在接手 OSGPrj 项目。当前「阶段级辅导申请」主线已经完成：

- Step 0：全局底座完成；
- Step 1：学生端闭环完成；
- Step 1 已有后端定向测试、前端 applications 契约测试和关键 grep 证据；
- 但 `pnpm --filter @osg/student build` 仍被既有无关 TypeScript 问题阻塞。

本次任务不是继续做 Step 2，也不是扩展新功能。

本次目标是：

```text
学生端 build 收口：修复阻塞 @osg/student build 的既有 TS 类型债务。
```

项目根目录：

```text
/Users/hw/workspace/OSGPrj
```

---

## 0. 强制工作规则

本次采用小 fix / 小 PR 方式推进，但不要自动 commit。

必须遵守：

- 不降低质量；
- 不使用 `as any` 逃避类型检查；
- 不大重构页面；
- 不改变业务语义；
- 不改 Step 1 已完成主路径，除非新的 `vue-tsc` 明确报到相关文件；
- 不进入 Step 2 班主任端；
- 不做导师端 / 助教端 / 后台 / 模拟应聘新需求；
- 每批代码修改前，先在计划/交接文档写清楚 fix plan，并等待用户确认；
- 每完成一个小 fix，要更新状态标记；
- 不自动执行 git commit，除非用户明确要求。

如果使用 `/fix` workflow，必须先读取：

```text
.windsurf/workflows/fix.md
```

并按 workflow 执行。

---

## 1. 必读文档

先阅读：

1. `docs/plans/student-build-issues-handoff.md`
2. `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`
3. `docs/plans/stage-coaching-request/01-student-applications.md`

重点理解：

- Step 1 已完成，不要误伤；
- 当前 build 失败主要不是 Step 1 application/coaching 改动引入；
- 已过滤验证无错误的 Step 1 文件：

```text
osg-frontend/packages/student/src/views/applications/index.vue
osg-frontend/packages/shared/src/api/applications.ts
```

除非新的 `vue-tsc` 明确报到这些文件，否则不要优先改它们。

---

## 2. 本次第一步：重跑 vue-tsc，获取最新错误清单

先执行：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
```

把错误按文件分组。

然后把错误分成两类：

```text
A 类：ClassReportFlowModal / shared 相关错误
B 类：student 旧页面严格类型错误
```

不要凭 handoff 旧行号盲改，一切以最新命令输出为准。

---

## 3. 先写状态跟踪区和 fix plan

先更新或补充：

```text
docs/plans/student-build-issues-handoff.md
```

新增状态表：

```text
Build-F0：状态跟踪区 + 最新错误清单
Build-F1：ClassReportFlowModal feedback TS7006
Build-F2：ResumeUpload 直接依赖声明 TS2307
Build-F3：InterviewCalendar 未使用变量 TS6133
Build-F4：student/courses 类型错误
Build-F5：student/mock-practice 类型错误
Build-F6：student/positions 类型错误
Build-F7：student build 总回归
```

每个 fix 写清楚：

- 当前错误；
- 根因；
- 修改文件；
- 最小修法；
- 验证命令；
- 不改什么。

写完状态表和第一批 fix plan 后，停下来等用户确认，再改代码。

---

## 4. 小 fix 建议顺序

### Build-F0：状态跟踪区 + 最新错误清单

目标：

- 基于最新 `vue-tsc` 输出建立状态表；
- 确认错误是否仍与 handoff 一致；
- 明确本批只修 build/typecheck，不做功能扩展。

验收：

- `student-build-issues-handoff.md` 有最新错误清单；
- 每个错误都能映射到一个小 fix；
- 用户确认后再进入代码修改。

### Build-F1：ClassReportFlowModal feedback TS7006

优先文件：

```text
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/BaseCourseFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/JobCoachingFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/MidtermFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/MockInterviewFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/RelationFeedback.vue
```

典型修法：

```vue
@update:value="(v) => update('purpose', v)"
```

改为：

```vue
@update:value="update('purpose', $event)"
```

带 key 的：

```vue
@update:value="updateScore(item.key, $event)"
```

禁止：

- 不改 payload 结构；
- 不改 emit 名称；
- 不改字段语义；
- 不改弹窗 UI；
- 不加 `as any`。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "ClassReportFlowModal|TS7006" || true
pnpm --filter @osg/shared test
```

### Build-F2：ResumeUpload 直接依赖声明 TS2307

涉及：

```text
osg-frontend/packages/shared/src/components/ClassReportFlowModal/widgets/ResumeUpload.vue
osg-frontend/packages/shared/package.json
osg-frontend/pnpm-lock.yaml
```

根因：

`@osg/shared` 直接 import 了 `@ant-design/icons-vue`，但 shared package 没有声明直接依赖。

目标：

在 `osg-frontend/packages/shared/package.json` 的 `dependencies` 增加：

```json
"@ant-design/icons-vue": "^7.0.0"
```

如果 pnpm 更新 lockfile，同步提交 lockfile 变更。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "ResumeUpload|@ant-design/icons-vue|TS2307" || true
pnpm --filter @osg/shared test
```

### Build-F3：InterviewCalendar 未使用变量 TS6133

涉及：

```text
osg-frontend/packages/shared/src/components/InterviewCalendar.vue
```

目标：

- 如果变量确实不用，删除声明；
- 如果应展示，补回模板使用；
- 不改日历业务行为。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "InterviewCalendar|TS6133" || true
pnpm --filter @osg/shared test
```

### Build-F4：student/courses 类型错误

涉及：

```text
osg-frontend/packages/student/src/views/courses/index.vue
```

目标：

- 删除真正未使用变量；
- 对 `string | undefined` 在传参前补业务合理 fallback；
- 表单默认值与接口类型对齐；
- 不重构课程页面。

禁止：

- 不用 `as any`；
- 不改变课程业务流程；
- 不把错误吞掉。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/courses/index.vue|TS6133|TS2322" || true
```

### Build-F5：student/mock-practice 类型错误

涉及：

```text
osg-frontend/packages/student/src/views/mock-practice/index.vue
```

目标：

- 删除未使用变量；
- 可选字段传参前补默认值；
- 表单状态类型与 API payload 类型对齐；
- 不改模拟应聘业务语义。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/mock-practice/index.vue|TS6133|TS2322" || true
```

### Build-F6：student/positions 类型错误

涉及：

```text
osg-frontend/packages/student/src/views/positions/index.vue
```

目标：

- 对可选字段补业务合理 fallback；
- 表单初始化值与类型保持一致；
- 必要时收窄类型；
- 不改岗位业务流程。

验证：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/positions/index.vue|TS2322|TS6133" || true
```

### Build-F7：student build 总回归

最终必须执行：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
pnpm --filter @osg/student build
pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts
pnpm --filter @osg/shared test
```

如果 build 仍失败：

- 贴最新错误；
- 判断是否属于本批已知范围；
- 不要说完成；
- 继续小 fix。

如果 build 通过：

- 更新 `student-build-issues-handoff.md` 状态表；
- 在 `docs/plans/stage-coaching-request/06-requirement-index-by-end.md` 的 Step 1 区域补充：

```text
student build 已收口：pnpm --filter @osg/student build ✅
```

---

## 5. 完成输出格式

每个小 fix 完成后输出：

```text
Fix:
- Build-Fx 名称

Root Cause:
- ...

Changed Files:
- ...

Verification:
- 命令：...
- 结果：...

Status Marker:
- 已更新 docs/plans/student-build-issues-handoff.md 对应行

Next:
- 下一小 fix 是 ...
```

最终输出：

1. Build-F0~F7 状态表；
2. 修改文件清单；
3. `pnpm --filter @osg/student build` 实际结果；
4. `@osg/shared test` 实际结果；
5. Step 1 文件过滤确认；
6. 状态标记更新位置；
7. 下一步建议：进入 Step 2 班主任端闭环。

请记住：

```text
这一步是质量收口，不是新功能开发。
目标是让 Step 1 学生端闭环具备可构建交付证据。
```
```

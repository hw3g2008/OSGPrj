# Student Build 失败问题清单与修复交接

## 背景

当前执行：

```bash
pnpm --filter @osg/student build
```

失败。根据排查，失败点主要不是本次 `Step1 application/coaching` 改动引入，而是已有前端类型检查问题。

本次 Step1 改动文件已做过滤检查：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/applications/index.vue|shared/src/api/applications.ts" || true
```

结果无输出，说明本次 Step1 改动文件未产生 TS 错误。

相关报错文件最近改动来源主要是：

```text
a6bb23a0 feat(S-056): 三端课消上报弹窗全量实现（前端20 + 后端9 tickets）
```

尤其集中在：

```text
osg-frontend/packages/shared/src/components/ClassReportFlowModal/
```

另外还有一批学生端旧页面的 TS 严格检查债务。

---

## 1. ClassReportFlowModal 模板事件参数隐式 any

**问题类型**：`TS7006`

**涉及文件**：

```text
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/BaseCourseFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/JobCoachingFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/MidtermFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/MockInterviewFeedback.vue
osg-frontend/packages/shared/src/components/ClassReportFlowModal/feedbacks/RelationFeedback.vue
```

**典型问题代码**：

```vue
@update:value="(v) => update('purpose', v)"
```

或：

```vue
@update:value="(v) => updateScore(item.key, v)"
```

**建议修法**：

把模板箭头函数改成 `$event` 表达式：

```vue
@update:value="update('purpose', $event)"
```

带 key 的：

```vue
@update:value="updateScore(item.key, $event)"
```

**修复原则**：

- 不改 payload 结构。
- 不改 emit 名称。
- 不改字段语义。
- 不改弹窗 UI。
- 只消除 `TS7006`。

---

## 2. ResumeUpload.vue 缺少直接依赖声明

**问题类型**：`TS2307`

**涉及文件**：

```text
osg-frontend/packages/shared/src/components/ClassReportFlowModal/widgets/ResumeUpload.vue
osg-frontend/packages/shared/package.json
```

**问题代码**：

```ts
import { UploadOutlined } from '@ant-design/icons-vue'
```

`@osg/shared` 使用了 `@ant-design/icons-vue`，但 `shared/package.json` 没声明它。

**建议修法**：

在 `osg-frontend/packages/shared/package.json` 的 `dependencies` 增加：

```json
"@ant-design/icons-vue": "^7.0.0"
```

如果 pnpm 更新 lockfile，需要同步提交：

```text
osg-frontend/pnpm-lock.yaml
```

**修复原则**：

- 不要删除上传图标。
- 不要让 shared 组件依赖 student 包的 transitive dependency。
- shared 包使用了该依赖，就应在 shared 包直接声明。

---

## 3. InterviewCalendar.vue 存在未使用变量

**问题类型**：`TS6133`

**涉及文件**：

```text
osg-frontend/packages/shared/src/components/InterviewCalendar.vue
```

**现象**：

`vue-tsc` 报 unused variable，之前看到的变量包括类似：

```ts
currentMonthLabel
currentWeekLabel
```

**建议修法**：

确认模板/逻辑是否真的不需要：

- 如果不需要：删除对应解构或变量声明。
- 如果应该显示：补回模板使用。

**修复原则**：

- 不改日历业务行为。
- 只消除 unused 变量。

---

## 4. student/courses/index.vue 存在未使用变量或严格类型错误

**问题类型**：常见为 `TS6133` / `TS2322`

**涉及文件**：

```text
osg-frontend/packages/student/src/views/courses/index.vue
```

**现象**：

学生端课程页面存在既有类型债务，可能包括：

- 定义后未使用的变量。
- `string | undefined` 传给需要 `string` 的位置。
- 表单默认值类型和接口声明不一致。

**建议修法**：

运行 `vue-tsc` 后按具体行号逐项处理：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
```

**修复原则**：

- 只修类型。
- 不重构课程页面。
- 不使用 `as any` 逃避类型检查。

---

## 5. student/mock-practice/index.vue 存在未使用变量或严格类型错误

**问题类型**：常见为 `TS6133` / `TS2322`

**涉及文件**：

```text
osg-frontend/packages/student/src/views/mock-practice/index.vue
```

**现象**：

模拟应聘页面存在既有 TS 严格检查问题，可能包括：

- 未使用变量。
- 可选字段未做 fallback。
- 表单状态类型与 API payload 类型不一致。

**建议修法**：

按 `vue-tsc` 的具体行号修：

- 未使用变量删除。
- 可选值传参前补默认值，例如 `value ?? ''`。
- 表单类型与 payload 类型对齐。

**修复原则**：

- 不重构模拟应聘页面。
- 不改变 API 语义。
- 不使用 `as any` 逃避类型检查。

---

## 6. student/positions/index.vue 存在类型不匹配

**问题类型**：常见为 `TS2322`

**涉及文件**：

```text
osg-frontend/packages/student/src/views/positions/index.vue
```

**现象**：

岗位页面存在 `string | undefined`、表单字段默认值、API 参数类型不一致等问题。

**建议修法**：

按 `vue-tsc` 行号定位，不要大改页面：

- 对可选字段补 fallback。
- 表单对象初始化值与类型保持一致。
- 必要时收窄类型，而不是用 `as any` 绕过。

**修复原则**：

- 不重构岗位页面。
- 不改变岗位业务流程。
- 不使用 `as any` 逃避类型检查。

---

## 7. 本次 Step1 改动文件不应作为第一修复对象

**已验证无本次新增 TS 错误的文件**：

```text
osg-frontend/packages/student/src/views/applications/index.vue
osg-frontend/packages/shared/src/api/applications.ts
```

**验证命令**：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/applications/index.vue|shared/src/api/applications.ts" || true
```

**结果**：

无输出。

**要求**：

别的 AI 修 build 时，不要优先碰这些 Step1 文件，除非新的 `vue-tsc` 明确报到这些路径。

同时不要误碰本次 Step1 后端主路径文件，除非明确需要：

```text
ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgApplicationController.java
ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java
```

---

## 8. 验证命令和验收标准

**完整验证**：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
```

**聚焦验证 ClassReport/ResumeUpload 两组问题**：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "ClassReportFlowModal|ResumeUpload|@ant-design/icons-vue|TS7006|TS2307" || true
```

**验收标准**：

- 不再出现 `ClassReportFlowModal/feedbacks/*.vue` 的 `TS7006`。
- 不再出现 `ResumeUpload.vue` / `@ant-design/icons-vue` 的 `TS2307`。
- 如果继续报 `InterviewCalendar`、`courses`、`mock-practice`、`positions`，按第 3-6 条继续小步修。
- 修复过程不要使用 `as any` 逃避类型检查。
- 修完必须贴实际命令输出，不能只说“应该好了”。

---

## 9. Build 收口执行区（2026-05-10）

### 9.1 本轮范围与约束

- 只做学生端 build/typecheck 收口。
- Step 0 与 Step 1 已完成，本轮不重复、不扩大范围。
- 不进入 Step 2 班主任端。
- 不改学生端 `applications` 主路径，除非最新 `vue-tsc` 明确报错到该路径。
- 不使用 `as any` 逃避类型检查。
- 不自动 git commit。
- 代码修改前先写本状态表与 fix plan，等待用户确认。

### 9.2 最新 `vue-tsc` 复现结果

执行命令：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
```

执行结果：

```text
pnpm exit=1（底层 vue-tsc exit=2）
```

最新错误清单：

| 分类 | Build 编号 | 文件 | 错误 | 最新状态 |
|---|---|---|---|---|
| A 类 shared | Build-F1 | `shared/src/components/ClassReportFlowModal/feedbacks/*.vue` | 旧 handoff 记录的 `TS7006` | ✅ 最新输出未再出现，暂不修改 |
| A 类 shared | Build-F2 | `shared/src/components/ClassReportFlowModal/widgets/ResumeUpload.vue` / `shared/package.json` | 旧 handoff 记录的 `TS2307` | ✅ 最新输出未再出现；`@osg/shared` 已声明 `@ant-design/icons-vue` |
| A 类 shared | Build-F3 | `shared/src/components/InterviewCalendar.vue:210,211` | `TS6133 currentMonthLabel/currentWeekLabel declared but never read` | ✅ 已修复 |
| B 类 student | Build-F4 | `student/src/views/courses/index.vue:518,567,751` | `TS6133 ratingText/detailToneClass/mentorInitials declared but never read` | ✅ 已修复 |
| B 类 student | Build-F5 | `student/src/views/mock-practice/index.vue:613` | `TS6133 practiceModalTitle declared but never read` | ✅ 已修复 |
| B 类 student | Build-F6 | `student/src/views/positions/index.vue:864,865,942,1231,1303,1479,1480` | `TS6133` 未使用符号 + `TS2322` 可选值传给必填 string | ✅ 已修复 |
| 总回归 | Build-F7 | `@osg/student` | `vue-tsc` / `build` / contracts / shared tests | ✅ 已通过 |

### 9.3 Build-F0~F7 状态跟踪

| 编号 | 小 fix | 状态 | 验证/备注 |
|---|---|---|---|
| Build-F0 | 状态跟踪区 + 最新错误清单 | ✅ 已完成 | 已基于最新 `vue-tsc` 输出建立本节，并按用户确认执行 |
| Build-F1 | ClassReportFlowModal feedback TS7006 | ✅ 当前无需修改 | 最新 `vue-tsc` 未报 `ClassReportFlowModal` / `TS7006` |
| Build-F2 | ResumeUpload 直接依赖声明 TS2307 | ✅ 当前无需修改 | 最新 `vue-tsc` 未报 `ResumeUpload` / `@ant-design/icons-vue` / `TS2307`；`shared/package.json` 已有依赖 |
| Build-F3 | InterviewCalendar 未使用变量 TS6133 | ✅ 已完成 | 删除未使用解构字段；不改日历行为；`vue-tsc` ✅ |
| Build-F4 | student/courses 未使用变量 TS6133 | ✅ 已完成 | 删除未使用 computed/helper；不改课程业务；`vue-tsc` ✅ |
| Build-F5 | student/mock-practice 未使用变量 TS6133 | ✅ 已完成 | 删除未使用 computed 及其唯一依赖类型；不改弹窗文案来源；`vue-tsc` ✅ |
| Build-F6 | student/positions 未使用变量与 payload string 类型 | ✅ 已完成 | 删除未使用符号；对手动添加岗位 payload 做类型对齐；`vue-tsc` ✅ |
| Build-F7 | student build 总回归 | ✅ 已完成 | `pnpm --filter @osg/student build` ✅；student applications contract ✅；`@osg/shared test` ✅ |

### 9.4 Fix plan（等待用户确认）

#### Build-F3：InterviewCalendar 未使用变量 TS6133

当前错误：

- `InterviewCalendar.vue(210,3): currentMonthLabel is declared but never read`
- `InterviewCalendar.vue(211,3): currentWeekLabel is declared but never read`

根因：

- `useInterviewCalendar(eventsRef)` 返回了 `currentMonthLabel/currentWeekLabel/currentRangeLabel`。
- 当前模板只使用 `currentRangeLabel` 展示日历标题。
- `currentMonthLabel/currentWeekLabel` 已不是当前组件模板或逻辑需要的变量。

修改文件：

- `osg-frontend/packages/shared/src/components/InterviewCalendar.vue`

最小修法：

- 从解构中删除 `currentMonthLabel` 与 `currentWeekLabel`。
- 保留 `currentRangeLabel`、`monthOffset/weekOffset` watcher 与 emit 行为。

验证命令：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "InterviewCalendar|TS6133" || true
pnpm --filter @osg/shared test
```

不改什么：

- 不改日历 UI。
- 不改月/周切换逻辑。
- 不改 `range-change`、`month-change`、`view-mode-change` 事件。

#### Build-F4：student/courses 未使用变量 TS6133

当前错误：

- `courses/index.vue(518,7): ratingText is declared but never read`
- `courses/index.vue(567,7): detailToneClass is declared but never read`
- `courses/index.vue(751,10): mentorInitials is declared but never read`

根因：

- 当前模板使用 `ratingDescriptionText` 展示评分文案，旧的 `ratingText` 已被替代。
- 当前详情弹窗未引用 `detailToneClass`。
- 当前导师展示未引用 `mentorInitials`。

修改文件：

- `osg-frontend/packages/student/src/views/courses/index.vue`

最小修法：

- 删除 `ratingText` computed。
- 删除 `detailToneClass` computed。
- 删除 `mentorInitials` helper。
- 保留 `ratingDescriptions` 与 `ratingDescriptionText`，因为模板仍使用它们。

验证命令：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/courses/index.vue|TS6133|TS2322" || true
```

不改什么：

- 不改课程列表、评分提交、课程详情业务流程。
- 不改学生端课程页面 UI 结构。

#### Build-F5：student/mock-practice 未使用变量 TS6133

当前错误：

- `mock-practice/index.vue(613,7): practiceModalTitle is declared but never read`

根因：

- 当前弹窗标题文案由 `COACH_HEADER_MAP` 与 `coachHeader` 统一生成。
- `practiceModalTitle` 已不再被模板引用。
- `selectedPracticeCard` 目前只服务于 `practiceModalTitle`，删除 `practiceModalTitle` 后也会变成未使用。

修改文件：

- `osg-frontend/packages/student/src/views/mock-practice/index.vue`

最小修法：

- 删除 `practiceModalTitle` computed。
- 若确认 `selectedPracticeCard` 无其他引用，同步删除 `selectedPracticeCard` computed。
- 保留 `practiceDialogConfig`、`COACH_HEADER_MAP`、`coachHeader`。

验证命令：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/mock-practice/index.vue|TS6133|TS2322" || true
```

不改什么：

- 不改模拟应聘弹窗标题、副标题、备注说明文案。
- 不改申请表单提交逻辑。

#### Build-F6：student/positions 未使用变量与 payload string 类型

当前错误：

- `positions/index.vue(864,16): cycleDict is declared but never read`
- `positions/index.vue(865,16): projectYearDict is declared but never read`
- `positions/index.vue(942,7): COMPANY_TYPES is declared but never read`
- `positions/index.vue(1231,10): filterCompanyOption is declared but never read`
- `positions/index.vue(1303,5): Type 'undefined' is not assignable to type 'string'`
- `positions/index.vue(1479,5): Type 'string | undefined' is not assignable to type 'string'`
- `positions/index.vue(1480,5): Type 'string | undefined' is not assignable to type 'string'`

根因：

- `cycleDict/projectYearDict` 只需要 `loadCycleDict/loadProjectYearDict` 的副作用，`items` 解构变量未使用。
- `COMPANY_TYPES` 与 `filterCompanyOption` 是旧下拉实现遗留，当前模板公司类别使用普通输入框。
- `manualForm.companyType` 初始值是 `''`，但重置时写成 `undefined`，与推导出的 string 类型不一致。
- `createStudentManualPosition` 的 `company` 与 `location` 类型是必填 `string`；当前提交时传入 `f.company || undefined` 与 `f.city`，会产生 `undefined`。

修改文件：

- `osg-frontend/packages/student/src/views/positions/index.vue`

最小修法：

- 将 `useDictFacade('osg_recruit_cycle')` / `useDictFacade('osg_project_year')` 改为只解构 `load`，不声明未使用的 `items`。
- 删除未使用的 `COMPANY_TYPES`。
- 删除未使用的 `filterCompanyOption`。
- `openManualAddModal()` 重置 `companyType` 时使用 `''`，与初始表单类型一致。
- `createStudentManualPosition` payload 中：
  - `company` 使用 `f.company` 或等价 string 值，不再传 `undefined`；
  - `location` 使用 `f.city ?? f.region ?? ''`，保持“地区/城市选填”的现有 UI 语义，同时满足 API 当前必填 string 类型。

验证命令：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false 2>&1 | grep -E "src/views/positions/index.vue|TS2322|TS6133" || true
```

不改什么：

- 不把公司名称、地区、城市改成必填。
- 不改岗位手动添加业务流程。
- 不改字典加载顺序。
- 不改岗位列表、收藏、申请辅导主路径。

#### Build-F7：student build 总回归

代码修复后必须执行：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
pnpm --filter @osg/student build
pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts
pnpm --filter @osg/shared test
```

通过后补充：

- 更新本状态表 Build-F3~F7 为 ✅。
- 在 `docs/plans/stage-coaching-request/06-requirement-index-by-end.md` Step 1 区域补充 `student build 已收口` 证据。

### 9.5 执行记录（2026-05-10）

修改文件：

- `osg-frontend/packages/shared/src/components/InterviewCalendar.vue`
- `osg-frontend/packages/student/src/views/courses/index.vue`
- `osg-frontend/packages/student/src/views/mock-practice/index.vue`
- `osg-frontend/packages/student/src/views/positions/index.vue`

实际修改：

- `InterviewCalendar.vue`：删除未使用的 `currentMonthLabel/currentWeekLabel` 解构字段。
- `courses/index.vue`：删除未使用的 `ratingText/detailToneClass/mentorInitials`。
- `mock-practice/index.vue`：删除未使用的 `practiceModalTitle/selectedPracticeCard`，同步删除未使用类型 import。
- `positions/index.vue`：删除未使用的 `cycleDict/projectYearDict/COMPANY_TYPES/filterCompanyOption`；修正手动添加岗位表单重置与 payload string 类型。

验证结果：

```bash
pnpm --filter @osg/student exec vue-tsc --noEmit --pretty false
```

- 结果：✅ exit 0，无输出。

```bash
pnpm --filter @osg/student build
```

- 结果：✅ exit 0，`✓ built in 12.38s`；仅有 Vite chunk size warning。

```bash
pnpm --filter @osg/student exec vitest run src/__tests__/applications.spec.ts
```

- 结果：✅ exit 0，`1 file passed`，`5 passed | 1 skipped`。

```bash
pnpm --filter @osg/shared test
```

- 结果：✅ exit 0，`30 passed`，`372 passed | 1 todo`。

结论：

- 学生端 build 已收口。
- 本次未修改 `student/src/views/applications/index.vue` 与 `shared/src/api/applications.ts`。
- 本次未进入 Step 2 班主任端。
- 本次未自动 git commit。

# 2026-03-17 用户中心四页 UI Prototype 收口设计

## 目标

在不修改框架层、不修改全局设计系统的前提下，只在当前功能页内部收口 `admin` 用户中心四个页面的 UI，使其整体布局、按钮顺序、信息层级、筛选条节奏和表格操作区更接近 prototype：

- `/users/students`
- `/users/contracts`
- `/users/staff`
- `/users/mentor-schedule`

本次不调整业务边界，不新增功能，不移除真实数据链路。功能真实性保持现状，重点收口页面壳层。

## 边界

- 允许修改：
  - 四个页面本身
  - 这四个页面各自目录下的本地组件
  - 这四页对应的本地 source test
  - 这四页对应的 runtime backfill e2e 选择器
- 不允许修改：
  - 框架层
  - workflow / guard / skill
  - 全局 layout / design token / shared shell
  - 其他业务模块页面

## 方案选择

采用 `prototype-first` 页内重收方案：

1. 优先让四页结构回到 prototype 的页面骨架，而不是保留当前“运行态安全的混合壳层”。
2. 如果 prototype 与当前真实功能链路冲突，优先保留真实功能，但壳层和 DOM 节奏尽量贴近 prototype。
3. 所有改动只发生在页内，不扩散到框架层。

## 页面设计

### Students

- 保持：标题区、主 CTA、待审核横幅、Tab、筛选、表格、分页、详情/编辑/更多操作。
- 收口方向：
  - 筛选条回到 prototype 顺序和单层节奏。
  - 操作列恢复 `详情 / 编辑 / 更多 ▾` 的行内结构。
  - 次数列不再使用强产品化的 stacked badge 视觉，回到更接近 prototype 的数字+单位呈现。
  - 黑名单 tab 和待审核横幅继续保留真实数据逻辑。

### Contracts

- 保持：续签、搜索、导出、详情、续签弹窗、底部汇总。
- 收口方向：
  - 标题区与 CTA 保持 prototype 顺序。
  - 统计卡压回更轻的 admin 原型壳，不做 dashboard 化强化。
  - 筛选条恢复单行轻表单节奏。
  - 表格操作列回到 prototype 的文本按钮节奏。

### Staff

- 保持：新增、搜索、黑名单 tab、详情、编辑、重置密码、冻结/恢复、加入黑名单。
- 收口方向：
  - 待审核横幅保留真实数据，但视觉节奏回到 prototype。
  - 筛选区恢复单行原型风格。
  - 操作区恢复 `详情 / 编辑 / 更多 ▾`。

### Mentor Schedule

- 保持：周切换、提醒、导出、编辑排期。
- 收口方向：
  - 标题、横幅、周切换、筛选区按 prototype 的顶部控制区节奏收口。
  - 过滤控件不保留当前过强的 toolbar 风格。
  - 表格操作区回到更轻的文本操作感。

## 测试策略

### Source Test

先更新四页本地 source test，使其表达“prototype-first 壳层”预期：

- students.spec.ts
- contracts.spec.ts
- staff.spec.ts
- mentor-schedule.spec.ts

先打红，再改页面到通过。

### Runtime Backfill

页面壳层改完后，重跑四页真实 runtime backfill，确保真实接口和真实数据库不回退：

- admin-students-backfill.e2e.spec.ts
- admin-contracts-backfill.e2e.spec.ts
- admin-staff-backfill.e2e.spec.ts
- admin-schedule-backfill.e2e.spec.ts

如有必要，只调整这些测试的 DOM 选择器，不改变业务断言。

## 风险

- students 页当前自定义壳最多，改动幅度最大。
- contracts / staff / mentor-schedule 的运行态回补依赖现有 DOM 选择器，页壳变化后需要同步收 selector。
- 本次目标是“更接近 prototype”，不是整站 visual gate 一次性清零。

## 验收标准

1. 四页整体结构回到 prototype 主节奏。
2. 四页真实 runtime backfill 全绿。
3. 四页本地 source test 全绿。
4. 不修改框架层，不影响用户中心真实数据链路。

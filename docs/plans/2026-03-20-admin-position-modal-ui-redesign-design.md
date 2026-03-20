# 岗位信息弹窗 UI 重写设计

日期：2026-03-20

## 背景

`/career/positions` 页面主壳层已按原型收回比例，但新增/编辑岗位弹窗仍与原型存在明显差距。当前共享弹窗虽然字段结构已基本覆盖真实业务，但在 modal shell、section 卡片、字段密度、招聘周期视觉形态和 footer 处理上仍偏离原型。

本轮只重写视觉与表单表现，不改变字段结构和正式提交链路。

## 目标

- 将新增岗位弹窗整体视觉收回原型
- 新增态与编辑态共用同一套原型表单壳
- 保留编辑态现实功能状态条
- 不引入假数据来源，不改变真实 payload

## 约束

- 整体结构不变
- 数据只走正式来源或现有正式链路
- 不因为还原原型而把错误文案和伪字段语义带回页面

## 方案

### Modal Shell

- 宽度回收到 `680px`
- 使用共享 `OverlaySurfaceModal`，但通过局部 shell/header/footer 样式将其收回原型密度
- header 使用小号工作单风格：左侧图标标题，右侧轻量关闭按钮

### Section Cards

- 基本信息、公司信息、展示时间、投递备注保持原有分组结构
- 每组卡片使用浅灰底、细边框、轻圆角和统一 `16px` 内边距
- 标题行收回为 13px 蓝色小标题

### Fields

- label、control、grid gap 和 textarea 高度统一收紧
- 控件仍绑定当前真实字段，不改 v-model 和 emit
- `公司名称` 继续保留 datalist 和正式提交链路
- `城市` 联动文案保持“请先选择地区”

### 招聘周期

- 保持真实多选行为和现有提交逻辑
- 从 chip 样式改为 checkbox-list 风格，更贴近原型的轻量多选框区域

### Footer

- footer 采用上边框分隔
- 右侧保留 `取消 / 新增岗位` 两个动作
- 编辑态复用同一套 footer，只替换主按钮文案为 `保存岗位`

### 编辑态状态条

- 保留状态条和快捷操作
- 视觉降噪，作为正文末尾的轻量状态卡存在

## 验证

- 新增 modal 样式与结构回归测试，先红后绿
- 运行 `pnpm exec vitest run src/__tests__/positions.spec.ts`
- 运行 `pnpm build`
- 运行 `pnpm exec playwright test tests/e2e/admin-positions-backfill.e2e.spec.ts --project=chromium`
- 用 Playwright MCP 打开真实新增岗位弹窗做视觉回查

## 数据来源说明

本轮不修改字段来源合同。当前仍采用：

- 正式后端提交链路：`/admin/position`
- 公司名称候选：父页面从岗位列表结果去重派生
- 多数字典型枚举：前端常量

字段来源问题已单独记录在：

- `docs/plans/2026-03-20-admin-position-modal-field-source-audit.md`

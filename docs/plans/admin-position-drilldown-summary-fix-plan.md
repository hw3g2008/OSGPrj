# Admin 岗位信息列表/下钻统计与标签修复方案

## 状态

- 状态：已完成
- 日期：2026-05-11
- 范围：admin 端岗位信息页
- 代码修改状态：已完成

## 背景问题

Admin → 求职中心 → 岗位信息页面中，列表视图/下钻视图存在统计与点击行为不一致：

1. 底部统计使用分页列表数据，导致「共 N 家公司｜N 个岗位」只反映当前页，不反映全量筛选结果。
2. 下钻视图 industry 卡片右侧的「开放 / 已关闭 / 投递学员」视觉标签没有独立点击行为，点击后都冒泡为同一个展开动作。
3. 后端展示状态是四态：`visible` / `not_started` / `hidden` / `expired`，但前端二态文案把 `not_started` 混入「已关闭」，语义不准确。

## 根因确认

### 1. 底部 summary 使用了分页数据

目标文件：

- `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`

当前逻辑：

```ts
const summary = computed(() => ({
  companyCount: new Set(positions.value.map((item) => item.companyName).filter(Boolean)).size,
  positionCount: positions.value.length
}))
```

其中 `positions.value` 来自 `/admin/position/list`，该接口在 controller 中调用了 `startPage()`，默认 `pageSize=10`，因此底部统计只统计当前页。

### 2. 标签点击没有差异化行为

当前模板结构中，整个 industry header 是一个 button：

```vue
<button @click="toggleIndustry(industry.industry)">
  ...
  <a-tag color="green">{{ industry.openCount }} 开放</a-tag>
  <a-tag color="default">{{ industry.positionCount - industry.openCount }} 已关闭</a-tag>
  <span>{{ industry.studentCount }} 投递学员</span>
</button>
```

三个标签没有 `@click.stop`，点击都会触发父级 `toggleIndustry`，不会筛选展开内容。

### 3. 状态语义不应二态化

后端字典与派生逻辑：

- `visible`：展示中
- `not_started`：未开始，运行时由 `visible + displayStartTime > now` 派生，DB 不存
- `hidden`：已隐藏
- `expired`：已过期

推荐前端语义：

```text
开放：visible
未开始：not_started
已关闭：hidden + expired
```

## 推荐修复范围

### A. 底部统计改用 drillDownRows 聚合

修改文件：

- `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`

计划将 `summary` 从分页列表聚合改成下钻全量数据聚合：

```ts
const summary = computed(() => ({
  companyCount: drillDownRows.value.reduce((total, industry) => total + industry.companyCount, 0),
  positionCount: drillDownRows.value.reduce((total, industry) => total + industry.positionCount, 0)
}))
```

影响：

- 列表视图和下钻视图底部统计都反映当前筛选条件下的全量结果。
- 不受分页 `pageSize=10` 影响。

### B. 新增下钻标签过滤状态

修改文件：

- `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`

计划新增前端本地状态：

```ts
const activeDrilldownFilter = ref<Record<string, 'all' | 'open' | 'not_started' | 'closed' | 'has_students'>>({})
```

按 industry 维度记录当前筛选：

- `all`：全部岗位
- `open`：只看 `visible`
- `not_started`：只看 `not_started`
- `closed`：只看 `hidden + expired`
- `has_students`：只看 `studentCount > 0`

影响：

- 只影响下钻视图展开内容。
- 不改变接口、不改变后端数据。

### C. 标签拆成独立点击

修改文件：

- `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`

计划将标签改成可点击元素并阻止冒泡：

```vue
<a-tag color="green" @click.stop="applyIndustryFilter(industry.industry, 'open')">
  {{ industry.openCount }} 开放
</a-tag>
<a-tag color="blue" @click.stop="applyIndustryFilter(industry.industry, 'not_started')">
  {{ getIndustryStatusCount(industry, 'not_started') }} 未开始
</a-tag>
<a-tag color="default" @click.stop="applyIndustryFilter(industry.industry, 'closed')">
  {{ getIndustryStatusCount(industry, 'closed') }} 已关闭
</a-tag>
<span @click.stop="applyIndustryFilter(industry.industry, 'has_students')">
  {{ industry.studentCount }} 投递学员
</span>
```

影响：

- 点击「开放」：展开 industry，并只显示开放岗位。
- 点击「未开始」：展开 industry，并只显示未开始岗位。
- 点击「已关闭」：展开 industry，并只显示隐藏/过期岗位。
- 点击「投递学员」：展开 industry，并只显示有投递学员的岗位。
- 点击 industry 主体区域仍保留原来的展开/收起全部行为。

### D. 展开表格改用过滤后的岗位列表

修改文件：

- `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`

当前表格直接使用：

```vue
:data-source="company.positions"
```

计划改为：

```vue
:data-source="getVisibleCompanyPositions(industry.industry, company)"
```

并在前端按 `activeDrilldownFilter` 过滤。

影响：

- 解决「点 7 已关闭后展开内容仍全是开放」的问题。
- 不改变公司/岗位原始数据，只改变当前展示。

## 不纳入本批的内容

### 1. 暂不改后端 drilldown 接口

原因：

- `/admin/position/drill-down` 已经返回当前筛选条件下的全量岗位。
- 本批问题可通过前端本地过滤解决。
- 后端多值 `displayStatus` 会扩大范围，并牵涉派生状态 `not_started`。

### 2. 暂不做 industry/company 聚合学员弹窗

原因：

- 当前后端只有单岗位接口：`/admin/position/{positionId}/students`。
- 现有公司层按钮用 `company.positions[0]` 代表公司聚合学生是不准确的。
- 聚合学员弹窗需要新接口，应作为第二批单独设计。

本批「投递学员」点击只做：筛出该 industry 下 `studentCount > 0` 的岗位。

## 验证计划

执行代码修改后，计划验证：

1. 静态检查：确认 `index.vue` 无类型明显错误。
2. 前端构建或类型检查：优先运行 admin 包相关检查。
3. 行为验证：
   - 切换到下钻视图。
   - 底部岗位数与顶部 stats 总数一致。
   - 点击「开放」只展示 `visible`。
   - 点击「未开始」只展示 `not_started`。
   - 点击「已关闭」只展示 `hidden / expired`。
   - 点击「投递学员」只展示 `studentCount > 0`。

## 完成记录

- ✅ 已修改 `/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`
- ✅ 底部统计已改为基于 `drillDownRows` 聚合
- ✅ industry 标签已拆分为独立点击行为，并使用 `@click.stop`
- ✅ `not_started` 已单独显示为「未开始」，不再归入「已关闭」
- ✅ 下钻表格已改为按当前 industry 标签筛选展示
- ✅ 点击 industry 标签时会自动展开该 industry 下有匹配岗位的公司
- ✅ 本批未修改后端接口

## 验证证据

1. 一次性 RED/GREEN 断言
   - RED：修改前失败，缺少 `drillDownRows` summary、`@click.stop`、`not_started` 独立过滤、过滤后表格数据源
   - GREEN：修改后通过，输出 `GREEN behavior markers present`

2. 岗位相关 T3 测试
   - 命令：`pnpm --filter @osg/admin exec vitest run src/__tests__/positions-t3.spec.ts`
   - 结果：通过
   - 摘要：`Test Files  1 passed (1)`，`Tests  21 passed (21)`

3. Admin 构建
   - 命令：`pnpm --filter @osg/admin build`
   - 结果：通过
   - 摘要：`✓ 3596 modules transformed.`，`✓ built in 12.09s`

4. 已知无关失败
   - 命令：`pnpm --filter @osg/admin exec vitest run src/__tests__/positions.spec.ts src/__tests__/positions-t3.spec.ts`
   - 结果：`positions-t3.spec.ts` 通过；`positions.spec.ts` 中旧原型断言失败
   - 失败示例：仍期待 `行业`、旧 `.position-form-modal__title` 样式锚点
   - 判断：该失败来自过期原型收口测试，不是本批修改引入

## 最终范围

已按本方案完成代码修改：

- 只改 `index.vue`
- 不改后端接口
- `not_started` 单独显示为「未开始」
- 「投递学员」第一批只筛有投递岗位，不做聚合学员弹窗

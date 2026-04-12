# 分页修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- 修复 admin 前端 `a-table` 分页只显示上/下页、不显示 1 2 3 … 10 页码按钮的问题
- 为操作日志页面补充前端分页功能
- **验收标准**：所有带分页的 a-table 显示完整页码按钮；操作日志每页 15 条并可翻页

## 二、前置条件与假设

- 假设 1：Ant Design Vue 4.x `a-table` 默认 `simple: true` 是已确认的行为（已查看源码 line 88825）
- 假设 2：操作日志数据量可控（通常几千条），前端分页足够
- 假设 3：后端 `OsgLogController` 已经是内存全量过滤，加 PageHelper 改动大但收益低

## 三、现状分析

### 3.1 分页显示问题

**根因**：Ant Design Vue 的 `a-table` 内置分页默认配置为 `simple: true`（ant-design-vue 源码 line 88825），simple 模式只渲染"上一页 / 页码输入框 / 下一页"，不渲染页码按钮。

**4 个受影响页面**（已回读源文件验证行号）：

| # | 文件（相对 osg-frontend/） | 行号 | 当前配置 |
|---|---------------------------|------|---------|
| 1 | `packages/admin/src/views/permission/users/index.vue` | 89-95 | 内联 pagination 对象，缺 `simple: false` |
| 2 | `packages/admin/src/views/users/staff/index.vue` | 276-282 | computed `tablePagination`，缺 `simple: false` |
| 3 | `packages/admin/src/views/users/students/index.vue` | 326-332 | computed `tablePagination`，缺 `simple: false` |
| 4 | `packages/admin/src/views/teaching/all-classes/index.vue` | 81 | 内联 pagination 对象，缺 `simple: false` |

### 3.2 操作日志无分页

**前后端都没实现分页**：
- 后端 `OsgLogController.java:32-43`：无 `pageNum`/`pageSize` 参数，无 `startPage()`，返回 `AjaxResult`
- 后端 `SysOperLogServiceImpl.selectScopedOperLogList()`：先查全量再内存过滤（keyword/type/date）
- 前端 API `log.ts`：`LogFilters` 无分页字段
- 前端页面 `logs/index.vue:42`：`:pagination="false"`

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 分页显示修复方式 | A: 每个页面加 `simple: false` / B: 全局覆盖 a-table 默认配置 | A | 最小改动，不影响全局；全局覆盖可能影响其他不需要分页的 table |
| 2 | 操作日志分页策略 | A: 前端分页 / B: 后端 PageHelper 分页 | A | 后端已是内存全量过滤，加 PageHelper 需要改 Controller 返回类型 + API 层 + 前端状态管理，改动大收益低 |
| 3 | 操作日志每页条数 | A: 10 / B: 15 / C: 20 | B | 操作日志内容较短，15 条体验合适 |

## 五、目标状态

修改后：
- 4 个已有分页页面：显示完整页码 1 2 3 … N + 上/下页按钮
- 操作日志页面：a-table 自动前端分页，每页 15 条，显示页码按钮 + "共 X 条记录"

## 六、执行清单

| # | 文件（绝对路径） | 位置 | 当前值 | 目标值 |
|---|-----------------|------|--------|--------|
| 1 | `osg-frontend/packages/admin/src/views/permission/users/index.vue` | line 89-95 | pagination 对象缺 `simple` 属性 | 加 `simple: false,` |
| 2 | `osg-frontend/packages/admin/src/views/users/staff/index.vue` | line 276-282 | tablePagination 缺 `simple` 属性 | 加 `simple: false,` |
| 3 | `osg-frontend/packages/admin/src/views/users/students/index.vue` | line 326-332 | tablePagination 缺 `simple` 属性 | 加 `simple: false,` |
| 4 | `osg-frontend/packages/admin/src/views/teaching/all-classes/index.vue` | line 81 | pagination 对象缺 `simple` 属性 | 加 `simple: false,` |
| 5 | `osg-frontend/packages/admin/src/views/profile/logs/index.vue` | line 42 | `:pagination="false"` | 改为 `{ pageSize: 15, simple: false, showSizeChanger: false, showTotal: ... }` |

### 修改详情

#### #1 permission/users/index.vue (line 89-95)

```diff
 :pagination="{
   current: pagination.current,
   pageSize: pagination.pageSize,
   total: pagination.total,
+  simple: false,
   showTotal: (total: number) => `共 ${total} 条记录`,
   onChange: onPageChange,
 }"
```

#### #2 users/staff/index.vue (line 276-282)

```diff
 const tablePagination = computed(() => ({
   current: pagination.current,
   pageSize: pagination.pageSize,
   total: pagination.total,
+  simple: false,
   showSizeChanger: false,
   showTotal: (total: number) => `共 ${total} 条记录`
 }))
```

#### #3 users/students/index.vue (line 326-332)

```diff
 const tablePagination = computed(() => ({
   current: pagination.current,
   pageSize: pagination.pageSize,
   total: pagination.total,
+  simple: false,
   showSizeChanger: false,
   showTotal: (total: number) => `共 ${total} 条记录`
 }))
```

#### #4 teaching/all-classes/index.vue (line 81)

```diff
-:pagination="{ current: currentPage, pageSize, total, showTotal: (t: number) => `共 ${t} 条记录`, onChange: onPageChange }"
+:pagination="{ current: currentPage, pageSize, total, simple: false, showTotal: (t: number) => `共 ${t} 条记录`, onChange: onPageChange }"
```

#### #5 profile/logs/index.vue (line 42)

```diff
-:pagination="false"
+:pagination="{
+  pageSize: 15,
+  simple: false,
+  showSizeChanger: false,
+  showTotal: (total: number) => `共 ${total} 条记录`
+}"
```

说明：`a-table` 传入 pagination 对象后自动对 `data-source` 做前端分页切片，不需要手动维护 `currentPage` / `total` 状态。

## 七、自校验结果

### 第1轮自校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 5 个文件各加一行/改一行，流程清晰 |
| G2 目标明确 | ✅ | 验收标准：完整页码按钮 + 操作日志可翻页 |
| G3 假设显式 | ✅ | 3 个假设已列出 |
| G4 设计决策完整 | ✅ | 3 个决策点均有理由 |
| G5 执行清单可操作 | ✅ | 每项有文件、行号、old→new |
| G6 正向流程走读 | ✅ | 加 `simple: false` → 覆盖 a-table 默认 simple:true → 页码按钮显示 |
| G7 改动自洽 | ✅ | 只加属性不改逻辑，无上下游引用变动 |
| G8 简约不等于省略 | ✅ | 所有需要分页的页面都覆盖了 |
| G9 场景模拟 | ✅ | 场景1: 学员列表 30 条 → 3 页 → 显示 1 2 3 页码 ✓；场景2: 操作日志 50 条 → 4 页 → 自动前端分页 ✓ |
| G10 数值回验 | ✅ | "5 个文件" = 执行清单 5 行 ✓；"4 个受影响页面" = 影响范围表 4 行 ✓ |
| G11 引用回读 | ✅ | 5 个文件的行号均已回读源文件验证（permission/users:89-95 ✓, staff:276-282 ✓, students:326-332 ✓, all-classes:81 ✓, logs:42 ✓） |
| G12 反向推导 | ✅ | 目标"所有带分页的 a-table 都显示页码" → grep `:pagination=` 找到 4 个非 false + 1 个 false → 5 个全覆盖 ✓ |
| C1 根因定位 | ✅ | 根因是 a-table 默认 simple:true，不是症状修复 |
| C2 接口兼容 | ✅ | `simple` 是 ant-design-vue pagination 的标准属性，不影响现有 props |
| C3 回归风险 | ✅ | 只新增属性不删改现有属性，不影响现有翻页/搜索逻辑 |
| C4 测试覆盖 | ✅ | UI 属性变更，无需新增单测；可通过浏览器目视验证 |

**结论**：第1轮全部通过，无需修正。进入第2轮确认。

### 第2轮自校验（维度 B：边界场景）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| 0 条数据时分页是否正常？ | ✅ | a-table 在 total=0 时不渲染分页器 |
| 1 条数据时显示 "共 1 条记录" 页码只有 1？ | ✅ | 是，pageSize=10/15 时 1 条数据只有 1 页 |
| 操作日志搜索后重新加载，分页是否重置？ | ✅ | a-table 前端分页模式下，data-source 变化会自动重置到第 1 页 |
| staff/students 用 `@change` 翻页，加 simple:false 是否影响 handleTableChange？ | ✅ | `simple: false` 只影响渲染模式，不影响 onChange/onTableChange 回调 |

**结论**：第2轮全部通过，连续 2 轮无修改。

**自校验通过。**

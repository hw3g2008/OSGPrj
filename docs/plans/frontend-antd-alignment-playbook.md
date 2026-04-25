# 前端 Ant Design 对齐改造 Playbook

> 适用端：assistant (3004) · lead-mentor (3003) · mentor (3002)
> 参考基准：admin (3005)
> 技术栈：Vue 3 + TypeScript + Ant Design Vue 4 + Pinia

---

## 一、改造目标

将各端页面从「原生 HTML + 手写 CSS」迁移到「Ant Design Vue 组件 + 全局布局类」，与 Admin 端保持一致的组件框架和交互模式，同时保留各端独立的色彩主题。

### 改造原则

1. **Admin 是唯一参考基准** — 组件选型、表格列定义、分页交互、下钻折叠行为均以 Admin 实现为准
2. **全局基础设施先行** — 先建好全局样式和共享组件，再逐页改造
3. **保留端特色** — 各端侧边栏配色（`--primary`）不改，只改页面内容区
4. **只读端不加写操作** — assistant/lead-mentor/mentor 不加「新增」「编辑」「批量上传」等 Admin 专有按钮

---

## 二、改造阶段

### Phase 0: 全局基础设施（每端做一次，约 10 分钟）

| 步骤 | 文件 | 内容 |
|------|------|------|
| 0-1 | `src/styles/app.scss` | 添加 `.osg-page` 全局布局类 + `.ant-table-cell` word-wrap |
| 0-2 | `src/layouts/MainLayout.vue` | `.main` 添加 `min-width: 0` + `overflow-x: hidden` |
| 0-3 | `src/components/PageHeader.vue` | 从 Admin 复制 `PageHeader.vue` 组件 |
| 0-4 | 验证 | 任意已有页面确认布局不回归 |

#### 0-1: app.scss 添加全局样式

```scss
// ── Page layout base (aligned with Admin global.scss) ──
.osg-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

// ── Ant Design table cell word-wrap (global) ──
.ant-table-cell {
  word-break: break-word;
  overflow-wrap: break-word;
}
```

#### 0-2: MainLayout.vue 修复 .main 溢出

```css
.main {
  flex: 1;
  min-width: 0;          /* 允许 flex 子项缩小到比内容窄 */
  min-height: 100vh;
  margin-left: 260px;    /* 各端侧边栏宽度 */
  overflow-x: hidden;    /* 强制 Ant Design 表格内部滚动 */
  background: var(--bg);
  padding: 28px;
}
```

#### 0-3: PageHeader.vue

直接从 `packages/admin/src/components/PageHeader.vue` 复制到目标端的 `src/components/PageHeader.vue`。

---

### Phase 1: 逐页改造（每页约 30-60 分钟）

每个页面按以下 **固定 7 步** 执行：

#### Step 1: 读取 Admin 对应页面

```
packages/admin/src/views/{module}/{page}/index.vue
```

重点关注：
- 使用了哪些 Ant Design 组件
- 表格列定义（`listColumns` / `drilldownColumns`）
- `scroll: { x: N }` 设置
- 分页配置
- 下钻/折叠交互逻辑

#### Step 2: 对比当前端页面差异

列出差异清单：
- [ ] 缺少哪些 Ant Design 组件
- [ ] 表格是否有 `scroll.x` 横滚
- [ ] 分页是否使用 Ant Design pagination
- [ ] 下钻默认是否折叠
- [ ] 筛选控件是否用 `a-select` / `a-input`
- [ ] 是否有 `PageHeader` 组件
- [ ] 统计卡片是否用 `a-statistic`

#### Step 3: 重写 template 区域

按 Admin 结构重写，移除原生 HTML 元素，替换为 Ant Design 组件：

| 原生元素 | 替换为 |
|----------|--------|
| `<div class="page-header">` | `<PageHeader>` |
| `<select>` | `<a-select>` |
| `<input>` | `<a-input>` |
| `<table>` | `<a-table :scroll="{ x: N }">` |
| `<button>` | `<a-button>` |
| 手写分页 | `a-table` 的 `:pagination` |
| 手写 loading | `<a-spin>` |
| 手写空状态 | `<a-empty>` |
| 手写标签 | `<a-tag>` |

**关键属性检查**：
- 列表表格必须有 `:scroll="{ x: 总列宽 }"`
- 第一列建议 `fixed: 'left'`
- 最后一列（如有操作）建议 `fixed: 'right'`

#### Step 4: 调整 script setup

- 删除只读端不需要的函数（create/edit/delete/upload）
- 删除只读端不需要的 import（PlusOutlined, UploadOutlined 等）
- 保留：筛选/排序/分页/下钻折叠/查看学员弹窗
- 下钻默认**折叠** — `expandedIndustries` / `expandedCompanies` 初始为空 `Set`

#### Step 5: 调整 scoped CSS

- 根元素使用 `class="osg-page"` — 不再自定义 page 级布局
- 删除 `:deep(.ant-table-cell)` — 已在全局 app.scss 处理
- 保留端特色色彩变量（drilldown tone 色、industry tag 色）
- 保留 `@media` 响应式断点

#### Step 6: 更新测试

采用 **源码文本断言** 模式（避免 jsdom 渲染 Ant Design 组件的问题）：

```ts
import fs from 'node:fs'
const src = fs.readFileSync('src/views/{module}/{page}/index.vue', 'utf-8')

it('uses Ant Design table', () => {
  expect(src).toContain('<a-table')
  expect(src).toContain(':scroll=')
})

it('uses PageHeader component', () => {
  expect(src).toContain('<PageHeader')
})
```

#### Step 7: 验证

1. `vue-tsc --noEmit` 无错误
2. `vitest run` 测试通过
3. 浏览器实测：
   - 列表视图横向可滚动
   - 下钻视图默认折叠，点击展开
   - 分页控件正常
   - 右侧内容不溢出
   - 筛选/重置正常工作

---

### Phase 2: 回归验证（每端改造完成后）

1. 逐页访问所有已改造页面，确认无白屏
2. 浏览器缩放到 1024px 宽度，确认响应式不崩
3. 运行全量测试 `pnpm --filter @osg/{端名} test`

---

## 三、各端页面改造清单

### assistant (3004) — 8 个页面

| 序号 | 模块 | 页面 | 路径 | 状态 |
|------|------|------|------|------|
| 0 | 基础设施 | 全局样式 + MainLayout + PageHeader | — | ✅ 已完成 |
| 1 | 求职中心 | 岗位信息 | `career/positions` | ✅ 已完成 |
| 2 | 求职中心 | 学员求职总览 | `career/job-overview` | 🔲 待改造 |
| 3 | 求职中心 | 模拟应聘管理 | `career/mock-practice` | 🔲 待改造 |
| 4 | 学员中心 | 学员列表 | `students` | 🔲 待改造 |
| 5 | 教学中心 | 课程记录 | `class-records` | 🔲 待改造 |
| 6 | 个人中心 | 基本信息 | `profile` | 🔲 待改造 |
| 7 | 个人中心 | 课程排期 | `schedule` | 🔲 待改造 |

### lead-mentor (3003) — 8 个页面

| 序号 | 模块 | 页面 | 路径 | 状态 |
|------|------|------|------|------|
| 0 | 基础设施 | 全局样式 + MainLayout + PageHeader | — | 🔲 待改造 |
| 1 | 求职中心 | 岗位信息 | `career/positions` | 🔲 待改造 |
| 2 | 求职中心 | 学员求职总览 | `career/job-overview` | 🔲 待改造 |
| 3 | 求职中心 | 模拟应聘管理 | `career/mock-practice` | 🔲 待改造 |
| 4 | 学员中心 | 学员列表 | `students` | 🔲 待改造 |
| 5 | 教学中心 | 课程记录 | `class-records` | 🔲 待改造 |
| 6 | 个人中心 | 基本信息 | `profile` | 🔲 待改造 |
| 7 | 个人中心 | 课程排期 | `schedule` | 🔲 待改造 |

### mentor (3002) — 6 个页面

| 序号 | 模块 | 页面 | 路径 | 状态 |
|------|------|------|------|------|
| 0 | 基础设施 | 全局样式 + MainLayout + PageHeader | — | 🔲 待改造 |
| 1 | 教学中心 | 课程记录 | `class-records` | 🔲 待改造 |
| 2 | 求职中心 | 学员求职总览 | `career/job-overview` | 🔲 待改造 |
| 3 | 求职中心 | 模拟应聘管理 | `career/mock-practice` | 🔲 待改造 |
| 4 | 个人中心 | 基本信息 | `profile` | 🔲 待改造 |
| 5 | 个人中心 | 课程排期 | `schedule` | 🔲 待改造 |

---

## 四、通用代码片段速查

### 4.1 统计卡片行

```vue
<div style="display: flex; gap: 12px;">
  <div v-for="card in statsCards" :key="card.key" style="flex: 1; min-width: 0;">
    <a-card :bordered="false" :body-style="{ padding: '16px', textAlign: 'center' }">
      <a-statistic :title="card.label" :value="card.value"
        :value-style="{ color: card.color, fontSize: '24px', fontWeight: 700 }" />
    </a-card>
  </div>
</div>
```

### 4.2 筛选条件行

```vue
<a-form layout="inline" style="margin-bottom: 16px; gap: 10px; flex-wrap: wrap">
  <a-form-item>
    <a-select v-model:value="filters.xxx" placeholder="全部XX" allow-clear style="width: 140px">
      <a-select-option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
    </a-select>
  </a-form-item>
  <a-form-item>
    <a-input v-model:value="filters.keyword" placeholder="搜索..." allow-clear style="width: 200px" />
  </a-form-item>
  <a-form-item>
    <a-button @click="handleReset">重置</a-button>
  </a-form-item>
</a-form>
```

### 4.3 列表表格（带横滚 + 分页）

```vue
<a-table
  :columns="listColumns"
  :data-source="filteredData"
  :row-key="(r) => r.id"
  :pagination="tablePagination"
  :scroll="{ x: 1400 }"
  :locale="{ emptyText: '暂无数据' }"
  @change="handleTableChange"
>
```

### 4.4 下钻折叠交互

```ts
const expandedIndustries = ref<Set<string>>(new Set())  // 默认空 = 全部折叠
const expandedCompanies = ref<Set<string>>(new Set())

function toggleIndustry(id: string) {
  const next = new Set(expandedIndustries.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedIndustries.value = next
}
```

### 4.5 分页配置

```ts
const tablePagination = reactive({
  current: 1,
  pageSize: 20,
  pageSizeOptions: ['10', '20', '50'],
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})
```

---

## 五、常见坑与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 表格不能横向滚动 | 父容器未设 `min-width: 0` + `overflow-x: hidden` | Phase 0-2 已修复 |
| 右侧内容被截断 | flexbox 默认 `min-width: auto` 撑破容器 | Phase 0-2 已修复 |
| 下钻默认全展开 | `expandedIndustries` 初始非空 | 初始化为空 `Set()` |
| 测试中 Ant Design 组件报错 | jsdom 不支持 `matchMedia`/`computedStyle` | 用源码文本断言，不挂载组件 |
| 筛选条件换行错位 | `a-form` 缺少 `flex-wrap: wrap` | 加 `style="flex-wrap: wrap"` |
| 行业 Tag 颜色不显示 | scoped CSS + 动态 class 穿透问题 | 用 `:style` 内联或全局 class |

---

## 六、改造推荐顺序

每个端按以下优先级改造（数据复杂度递增）：

1. **Phase 0: 全局基础设施** — 必须最先做
2. **岗位信息 positions** — 最复杂（双视图 + 下钻），做完后续页面快
3. **学员求职总览 job-overview** — 纯表格 + 筛选
4. **模拟应聘管理 mock-practice** — 纯表格 + 筛选
5. **学员列表 students** — 纯表格 + 详情弹窗（仅 assistant/lead-mentor）
6. **课程记录 class-records** — 表格 + 详情面板
7. **基本信息 profile** — 表单，非表格
8. **课程排期 schedule** — 日历/排期组件

---

## 七、验收标准

每个页面改造完成后，必须满足：

- [ ] 使用 `class="osg-page"` 根容器
- [ ] 使用 `<PageHeader>` 页面头部
- [ ] 表格使用 `<a-table>` + `:scroll="{ x: N }"`
- [ ] 列表可横向滚动，右侧不溢出
- [ ] 筛选使用 `<a-select>` / `<a-input>`
- [ ] 分页使用 Ant Design pagination
- [ ] 下钻默认折叠
- [ ] `vue-tsc --noEmit` 无错误
- [ ] 测试全部通过
- [ ] 浏览器实测无白屏、布局正常

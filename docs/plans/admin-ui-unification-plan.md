# Admin 端 UI 统一 — 技术规格与执行方案

> 创建时间: 2026-04-08
> 状态: 待确认
> 类型: 技术重构（非功能性需求）

---

## 一、概述

### 1.1 背景

Admin 端共 31 个页面，在开发过程中由不同阶段、不同方式产出，导致 UI 风格不统一：有的用 Ant Design Vue 组件，有的用原生 HTML + 自定义 CSS，有的从原型直接复制，还有混合使用的。

### 1.2 目标

将 admin 端所有页面统一为一致的 UI 风格，达到：
- **视觉一致**: 所有页面看起来属于同一个系统
- **组件统一**: 统一使用 Ant Design Vue 作为 UI 组件库
- **可维护性**: 减少自定义 CSS，降低后续维护成本
- **开发效率**: 新页面可以快速参照标准模板开发

### 1.3 范围

- **包含**:
  - admin 端 `osg-frontend/packages/admin/src/views/` 下所有 30 个页面主体（不含 login）
  - 所有弹窗组件（46 个实例 = views/ 下 43 个文件 + 全局 2 个 + 内联 1 个）：
    - `views/**/components/*Modal.vue`（43 个文件）的**壳子统一 + 内部内容**
    - `components/ForgotPasswordModal.vue`、`components/ProfileModal.vue`（全局弹窗，只改内部）
    - `users/staff/index.vue` 内联重置密码弹窗
- **不包含**:
  - login 页（风格独立）
  - 其他端（student/mentor/lead-mentor/assistant）
  - `OverlaySurfaceModal.vue` 组件本身的代码（壳子不动）
- **约束**:
  - 以 UI 层（template + style）为主
  - **允许最小脚本适配**：原生 `<table>` → `<a-table>` 时需新增 `columns` 数组定义；原生 `<select>` → `<a-select>` 时需调整 `v-model` → `v-model:value`；原生 `<button>` → `<a-button>` 时需调整事件绑定
  - 不改业务逻辑（API 调用、数据处理、状态管理）

### 1.4 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | 3.x | 前端框架 |
| Ant Design Vue | 4.x | UI 组件库（已全量引入 `app.use(Antd)`） |
| @ant-design/icons-vue | - | 图标库 |
| SCSS | - | 样式预处理（`global.scss`） |

## 二、当前状态审计

### 2.1 风格分类

| 风格 | 数量 | 特征 | 页面 |
|------|------|------|------|
| **A-NEW** | 6 | 原生 HTML + 自定义 CSS（`permission-button`, `permission-table`, `page-title-en`） | staff, students, contracts, roles, users, job-tracking |
| **B-ANT** | 6 | 已使用 Ant 组件（`a-table`, `a-button`, `a-input`） | login, menu, logs, complaints, notice, mailjob |
| **C-RAW** | 9 | 原型直出（`ghost-button`, `primary-button`, `page-eyebrow`） | positions, expense, settlement, files, interview-bank, online-test-bank, qbank, questions, all-classes |
| **D-MIX** | 10 | 混合风格（部分 Ant + 部分原生 + 部分自定义） | job-overview, mock-practice, student-positions, base-data, class-records, communication, feedback, reports, mentor-schedule, dashboard |

### 2.2 核心问题

1. **4 种不同的按钮风格**: `permission-button`, `ghost-button`, `primary-button`, `a-button`
2. **3 种不同的表格实现**: 原生 `<table>` + 自定义 CSS, 原生 `<table>` + 非标 CSS, `<a-table>`
3. **3 种不同的输入框**: 原生 `<input>`, `<a-input>`, 自定义 class 的 `<input>`
4. **每个页面独立定义样式**: 相同的 `.permission-button` 在 6 个文件中各写一遍，样式略有差异
5. **图标混用**: mdi 图标和 Ant 图标混用
6. **弹窗不统一**（46 个弹窗实例 = views/ 下 43 个文件 + 全局 2 个 + 内联 1 个，壳子类型就有 3 种）:
   - **壳子类型 A**: 35 个用 `OverlaySurfaceModal`（views/ 下 33 + 全局 2）— 壳子统一，内部写法各异
   - **壳子类型 B**: 2 个用 `<a-modal>` — NewMailJobModal、SendNoticeModal（profile 模块）
   - **壳子类型 C**: 8 个用自建遮罩 `<div>` — C-RAW 风格页的弹窗（finance、resources 模块）
   - **内联**: 1 个（staff/index.vue 重置密码）
   - 内部问题（所有类型共有）:
   - **footer 按钮 3 种写法**: `<a-button>` + 自定义 class（UserModal）、原生 `<button class="staff-form-modal__footer-button">` （StaffFormModal）、原生 `<button class="btn btn-primary">`（MenuFormModal）
   - **表单控件 3 种写法**: `<a-form>` + `<a-input>`（UserModal）、原生 `<input class="xxx-modal__input">`（StaffFormModal）、原生 `<input class="form-input">`（MenuFormModal）
   - **主色调 3 种渐变**: `#3f68ff→#6788ff`（UserModal）、`#4f46e5→#8b5cf6`（RoleModal/OverlaySurfaceModal 默认）、`#6366f1→#8b5cf6`（MenuFormModal）
   - **title 图标 4 种写法**: `<span class="mdi xxx-modal__title-icon">` 带独立颜色定义、`<span class="mdi">` 继承颜色、`<i class="mdi">` 用 i 标签、额外包装层 `<span class="xxx__title-mark">`

## 三、统一规范

### 3.1 页面结构

每个列表页统一结构：

```vue
<template>
  <div class="osg-page">
    <!-- 1. 页面头部 -->
    <PageHeader title="中文标题" subtitle="English Title" description="页面描述">
      <template #actions>
        <a-button type="primary">
          <template #icon><PlusOutlined /></template>
          新增XXX
        </a-button>
      </template>
    </PageHeader>

    <!-- 2. 提示横幅（可选） -->
    <a-alert v-if="showBanner" type="info" show-icon message="提示内容" />

    <!-- 3. 筛选栏 -->
    <a-card :bordered="false">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-input v-model:value="keyword" placeholder="搜索..." allow-clear />
        </a-col>
        <a-col :span="6">
          <a-select v-model:value="filter" placeholder="全部" allow-clear>
            <a-select-option value="xxx">选项</a-select-option>
          </a-select>
        </a-col>
        <a-col>
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- 4. 数据表格 -->
    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="dataList"
        :row-key="record => record.id"
        :pagination="pagination"
        :loading="loading"
      >
        <template #bodyCell="{ column, record }">
          <!-- 自定义列渲染 -->
        </template>
      </a-table>
    </a-card>

    <!-- 5. 弹窗（用 OverlaySurfaceModal 壳子 + Ant 内部控件） -->
    <XxxFormModal
      v-model:visible="modalVisible"
      :record="currentRecord"
      @success="handleSuccess"
    />
  </div>
</template>
```

### 3.2 组件使用规范

| 元素 | 用什么 | 示例 |
|------|--------|------|
| 页面头部 | `<PageHeader>` 自定义组件 | `<PageHeader title="导师列表" subtitle="Mentor List">` |
| 主按钮 | `<a-button type="primary">` | `<a-button type="primary"><PlusOutlined />新增</a-button>` |
| 次按钮 | `<a-button>` | `<a-button>导出</a-button>` |
| 危险按钮 | `<a-button danger>` | `<a-button danger>删除</a-button>` |
| 链接按钮 | `<a-button type="link">` | `<a-button type="link">详情</a-button>` |
| 表格 | `<a-table>` | 带 columns, dataSource, pagination |
| 输入框 | `<a-input>` | `<a-input v-model:value="xxx" placeholder="搜索">` |
| 下拉框 | `<a-select>` | `<a-select v-model:value="xxx">` |
| 日期选择 | `<a-range-picker>` | |
| 标签/徽章 | `<a-tag color="xxx">` | `<a-tag color="green">激活</a-tag>` |
| 卡片容器 | `<a-card :bordered="false">` | |
| 弹窗壳子 | `<OverlaySurfaceModal>`（保留现有） | 壳子不动，内部统一（见 §3.6） |
| 分页 | `<a-table>` 内置 pagination | |
| 提示横幅 | `<a-alert>` | |
| 图标 | `@ant-design/icons-vue` | `<PlusOutlined />`, `<SearchOutlined />` |
| 消息提示 | `message.success()` / `message.error()` | 来自 ant-design-vue |
| 统计卡片区 | `<div style="display: flex; gap: 12px">` + `<div style="flex: 1; min-width: 0">` 包裹 `<a-card>` | 多卡片等宽填满一行，不用 `a-row`/`a-col`（避免 offset 导致宽度不对齐） |
| 视图切换 | `<a-radio-group button-style="solid" size="small">` | 选中态自动跟随全局主色；按钮内可加 MDI 图标 `<i class="mdi mdi-xxx">` |

### 3.3 不再使用的元素

| 废弃 | 替代 |
|------|------|
| `<button class="permission-button--primary">` | `<a-button type="primary">` |
| `<button class="ghost-button">` | `<a-button>` |
| `<button class="primary-button">` | `<a-button type="primary">` |
| `<button class="link-button">` | `<a-button type="link">` |
| `<table class="permission-table">` | `<a-table>` |
| `<input class="xxx-input">` | `<a-input>` |
| `<select class="xxx-select">` | `<a-select>` |
| `<span class="permission-pill">` | `<a-tag>` |
| `<div class="permission-card">` | `<a-card>` |
| `class="page-eyebrow"` | 删除，不需要 |
| mdi 图标 | Ant 图标（`@ant-design/icons-vue`），特殊场景保留 mdi |
| **弹窗 footer 相关** | |
| `<button class="btn btn-primary">` | `<a-button type="primary">` |
| `<button class="btn btn-outline">` | `<a-button>` |
| `<button class="xxx-modal__footer-button--primary">` | `<a-button type="primary">` |
| `<button class="xxx-modal__footer-button--ghost">` | `<a-button>` |
| 各弹窗自定义 `xxx-modal__cancel-btn` / `xxx-modal__confirm-btn` CSS | 删除，走 OverlaySurfaceModal `:deep(.ant-btn)` 统一样式 |
| **弹窗表单相关** | |
| `<input class="form-input">` / `<input class="xxx-modal__input">` | `<a-input>` |
| `<select class="form-select">` / `<select class="xxx-modal__select">` | `<a-select>` |
| `<input type="date" class="xxx-modal__control">` | `<a-date-picker>` |
| `<input type="number" class="xxx-modal__input">` | `<a-input-number>` |
| `<textarea class="xxx-modal__control--textarea">` | `<a-textarea>` |
| `<input type="checkbox">` （弹窗内） | `<a-checkbox>` |
| **弹窗颜色相关** | |
| `background: linear-gradient(135deg, #3f68ff, #6788ff)` | 删除，走 `var(--primary-gradient)` |
| `background: linear-gradient(135deg, #6366f1, #8b5cf6)` | 删除，走 `var(--primary-gradient)` |
| 各弹窗的 `xxx-modal__title-icon { color: #xxx }` | 删除，走 OverlaySurfaceModal `__title` 默认色 |
| **弹窗壳子相关** | |
| `<a-modal>` 作为弹窗壳子（NewMailJobModal、SendNoticeModal） | 迁移到 `<OverlaySurfaceModal>` |
| 自建遮罩 `<div class="xxx-modal">` + backdrop（8 个 C-RAW 弹窗） | 迁移到 `<OverlaySurfaceModal>` |
| 自建 `modal-shell` 结构（QbankFolderModal） | 迁移到 `<OverlaySurfaceModal>` |
| 自建 `review-modal` 结构（QuestionReviewModal） | 迁移到 `<OverlaySurfaceModal>` |
| 弹窗内的 `page-eyebrow` / `xxx-modal__eyebrow` | 删除，不需要 |

### 3.4 全局样式

#### 3.4.1 CSS 变量

`src/styles/global.scss` 保留设计 token（颜色变量），新增页面通用间距：

```scss
// 页面通用布局
.osg-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

#### 3.4.2 Ant Design 主题配置

在 `App.vue` 的 `<a-config-provider>` 上配置全局主题，使所有 Ant Design 组件的 primary 色与项目设计 token 对齐：

```vue
<a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#6366F1' } }">
  <router-view />
</a-config-provider>
```

**影响范围**：所有 Ant Design 组件的 primary 色调，包括：
- `<a-button type="primary">` 背景色
- `<a-radio-group button-style="solid">` 选中态填充色
- `<a-switch>`、`<a-checkbox>`、`<a-tabs>` 等激活态
- `<a-input>`、`<a-select>` 聚焦边框色

**注意**：每个端的 `App.vue` 需要各自配置，`colorPrimary` 的值以该端原型的 `--primary` 变量为准。Admin 端为 `#6366F1`。

### 3.5 弹窗内部统一规范

`OverlaySurfaceModal` 壳子组件（386 行）保持不动，它已通过 `:deep()` 为 `a-button`、`a-input`、`a-select`、`a-form` 定义了弹窗内的统一样式。**只要弹窗内部统一使用 Ant 组件，外观就自动统一。**

#### 3.5.1 title 统一写法

```vue
<!-- 标准写法：span + mdi 图标 + 文字，不单独定义图标颜色 -->
<template #title>
  <span style="display:inline-flex;align-items:center;gap:8px">
    <span class="mdi mdi-xxx" aria-hidden="true" />
    <span>标题文字</span>
  </span>
</template>
```

| 要素 | 统一规则 |
|------|----------|
| 容器 | `<span>` 不用 `<div>`，行内 flex |
| 图标标签 | `<span class="mdi mdi-xxx">` 不用 `<i>` |
| 图标颜色 | 不单独定义，走 OverlaySurfaceModal `__title` 默认色（`#1E293B`） |
| 包装层 | 不加额外包装层（不用 `xxx__title-mark`） |
| 样式类 | 不单独定义 `xxx-modal__title` class（删除对应的 scoped CSS） |

#### 3.5.2 按钮统一写法（footer + 正文）

```vue
<!-- 标准写法：弹窗内所有交互按钮统一用 a-button，不用原生 button，不自定义按钮 class -->
<template #footer>
  <a-button @click="handleClose">取消</a-button>
  <a-button type="primary" :loading="loading" @click="handleSubmit">
    保存
  </a-button>
</template>
```

| 要素 | 统一规则 |
|------|----------|
| 按钮组件 | `<a-button>` 不用原生 `<button>`（**适用于 footer 和正文中的所有交互按钮**） |
| 主按钮 | `<a-button type="primary">` 不单独定义渐变色/圆角/阴影 |
| 取消按钮 | `<a-button>` 默认样式，不单独定义 border-color |
| 正文操作按钮 | 弹窗正文里的 tab 切换、快捷操作等按钮同样用 `<a-button>`（如 `<a-button size="small">`） |
| 危险按钮 | `<a-button danger>` 用于驳回/删除等破坏性操作 |
| 样式来源 | 由 OverlaySurfaceModal 的 `:deep(.ant-btn)` 统一控制（圆角 10px、最小宽 80px、高 41px） |
| 删除 | 各弹窗的 `xxx-modal__cancel-btn`、`xxx-modal__confirm-btn`、`btn btn-primary`、正文中的 `ghost-button`/`primary-button` 等自定义样式 |

#### 3.5.3 表单控件统一写法

```vue
<!-- 标准写法：统一用 a-form + Ant 表单控件 -->
<a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
  <a-form-item name="fieldName" label="字段名">
    <a-input v-model:value="formState.fieldName" placeholder="请输入" />
  </a-form-item>
  <a-form-item name="selectField" label="下拉选择">
    <a-select v-model:value="formState.selectField" placeholder="请选择">
      <a-select-option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </a-select-option>
    </a-select>
  </a-form-item>
</a-form>
```

| 要素 | 统一规则 |
|------|----------|
| 表单容器 | `<a-form>` 不用裸 `<label>` + `<input>` |
| 输入框 | `<a-input>` 不用原生 `<input>` |
| 下拉框 | `<a-select>` 不用原生 `<select>` |
| 日期选择 | `<a-date-picker>` 不用原生 `<input type="date">` |
| 数值输入 | `<a-input-number>` 不用原生 `<input type="number">` |
| 多行文本 | `<a-textarea>` 不用原生 `<textarea>` |
| 复选/单选 | `<a-checkbox>` / `<a-radio>` 不用原生 `<input type="checkbox/radio">` |
| 样式来源 | 由 OverlaySurfaceModal 的 `:deep(.ant-input)` 等统一控制（border 2px、圆角 10px、padding 12px 14px） |
| 删除 | 各弹窗的 `form-input`、`form-select`、`xxx-modal__input`、`xxx-modal__select`、`xxx-modal__control` 等自定义样式 |

#### 3.5.4 颜色统一

| 场景 | 统一值 | 来源 |
|------|---------|------|
| 主按钮渐变 | `var(--primary-gradient, linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%))` | OverlaySurfaceModal `:deep(.ant-btn-primary)` |
| 标题颜色 | `var(--text, #1E293B)` | OverlaySurfaceModal `__title` |
| 次要文字 | `var(--text-secondary, #64748B)` | OverlaySurfaceModal `:deep(.ant-btn-default)` |
| 边框色 | `var(--border, #E2E8F0)` | OverlaySurfaceModal `__header` / `__footer` |

所有弹窗不允许单独覆盖渐变色（删除 `#3f68ff→#6788ff`、`#6366f1→#8b5cf6` 等自定义颜色）。

### 3.6 PageHeader 组件

新建 `src/components/PageHeader.vue`：
- **props**: `title`（必填）、`subtitle`（可选英文）、`description`（可选描述）
- **slot**: `#actions`（右侧操作按钮区）
- **样式**: scoped CSS，使用全局 CSS 变量

## 四、执行计划

### Phase 0: 基础设施（1 步） ✅ 已完成

| 步骤 | 内容 | 文件 | 状态 |
|------|------|------|------|
| 0-1 | 创建 PageHeader.vue 组件 | `src/components/PageHeader.vue`（新建） | ✅ |
| 0-2 | global.scss 追加 `.osg-page` 布局 | `src/styles/global.scss`（修改） | ✅ |

### Phase 1: 改 B-ANT 页面（5页，已部分使用 Ant，改动最小） ✅ 已完成

> 跳过 login（登录页风格独立）

| 步骤 | 页面 | 行数 | 改动要点 | 状态 |
|------|------|------|----------|------|
| 1-1 | profile/logs | 187 | 替换 header 为 PageHeader，已用 a-table 保留 | ✅ |
| 1-2 | profile/complaints | 213 | 同上 | ✅ |
| 1-3 | profile/notice | 187 | 同上 | ✅ |
| 1-4 | profile/mailjob | 224 | 同上 | ✅ |
| 1-5 | permission/menu | 597 | 替换 header，a-button/a-input 保留 | ✅ |

### Phase 2: 改 A-NEW 标杆页面（6页，原生→Ant） ✅ 页面层已完成，弹窗内部待改造

| 步骤 | 页面 | 行数 | 改动要点 | 页面层 | 弹窗内部 |
|------|------|------|----------|------|----------|
| 2-1 | permission/roles | 536 | 原生 table→a-table，原生 button→a-button，header→PageHeader | ✅ | ❌ M2 M3 |
| 2-2 | permission/users | 1192 | 同上，表单较多 | ✅ | ❌ M4 M5(✅) |
| 2-3 | users/staff | 1467 | 同上，最大标杆页，筛选栏+表格+弹窗全改 | ✅ | ❌ M7 M8 M9 M10 M11(✅) |
| 2-4 | users/students | 2041 | 同上，最大页面 | ✅ | ❌ M12 M13 M14 M15 M16 |
| 2-5 | users/contracts | 1023 | 同上 | ✅ | ❌ M17 M18 M19 M20 M21 |
| 2-6 | career/job-tracking | 618 | 同上 | ✅ | ❌ 内联a-modal未迁移 |

### Phase 3: 改 D-MIX 页面（10页） ✅ 页面层已完成，弹窗内部待改造

| 步骤 | 页面 | 行数 | 改动要点 | 页面层 | 弹窗内部 |
|------|------|------|----------|------|----------|
| 3-1 | dashboard | 167 | 首页特殊布局，加 PageHeader + 用 a-card 包装 | ✅ | 无弹窗 |
| 3-2 | teaching/communication | 289 | header→PageHeader，原生→Ant | ✅ | 无弹窗 |
| 3-3 | permission/base-data | 601 | 混合(a-input+原生table)→统一 Ant | ✅ | ❌ M6 |
| 3-4 | teaching/class-records | 723 | 原生→Ant | ✅ | ❌ M23 M24 |
| 3-5 | teaching/reports | 714 | 原生→Ant | ✅ | ❌ M25 |
| 3-6 | teaching/feedback | 633 | 大量原生 select/input→Ant | ✅ | 无弹窗 |
| 3-7 | career/student-positions | 747 | 原生→Ant | ✅ | ❌ M30 M31 |
| 3-8 | career/mock-practice | 894 | 原生→Ant | ✅ | ❌ M32 M33 |
| 3-9 | career/job-overview | 1263 | 大页面，原生→Ant | ✅ | ❌ M34 |
| 3-10 | users/mentor-schedule | 750 | 原生→Ant | ✅ | ❌ M22 |

### Phase 4: 改 C-RAW 页面（9页） ✅ 页面层已完成，弹窗内部待改造

| 步骤 | 页面 | 行数 | 改动要点 | 页面层 | 弹窗内部 |
|------|------|------|----------|------|----------|
| 4-1 | resources/files | 275 | eyebrow/ghost-button→PageHeader+Ant | ✅ | ❌ M41 M42 |
| 4-2 | resources/qbank | 280 | 同上 | ✅ | ❌ M45 |
| 4-3 | finance/expense | 377 | 同上 | ✅ | ❌ M39 |
| 4-4 | resources/interview-bank | 493 | 同上 | ✅ | ❌ M43 |
| 4-5 | resources/online-test-bank | 505 | 同上 | ✅ | ❌ M44 |
| 4-6 | resources/questions | 568 | 同上 | ✅ | ❌ M46 |
| 4-7 | finance/settlement | 522 | 同上，有统计卡片和 Tab 切换 | ✅ | ❌ M40 |
| 4-8 | teaching/all-classes | 777 | ghost-button→Ant | ✅ | ❌ M26 |
| 4-9 | career/positions | 1624 | 最大 C-RAW 页面 | ✅ | ❌ M27 M28 M29 |

### Phase 5: 弹窗内部改造 + 清理

> 所有 30 个页面层已完成。残余工作集中在弹窗组件内部改造（原生控件→Ant 控件、删除自定义 CSS、title 标准化）和 1 个内联 a-modal 迁移。
>
> **已完成弹窗（5个）**：M1(MenuFormModal) ✅、M5(ResetPwdModal) ✅、M11(内联重置密码) ✅、M37(NewMailJobModal) ✅、M38(SendNoticeModal) ✅
>
> **待改造弹窗（38个）**：
> - 壳子已是 OverlaySurfaceModal 但内部有原生控件（30个）：M2 M3 M4 M6 M7 M8 M9 M10 M12~M16 M17~M21 M22~M26 M27~M34
> - 壳子是自建遮罩需迁移（8个）：M39~M46
> - 内联 a-modal 需迁移（1个）：job-tracking 内联弹窗
> - 全局弹窗（2个）：M35(ForgotPasswordModal) M36(ProfileModal) — 壳子已OK，待检查内部

| 步骤 | 内容 |
|------|------|
| 5-1 | 改造 M39~M46（8个自建遮罩弹窗）：迁移壳子到 OverlaySurfaceModal + 内部原生控件→Ant | ✅ |
| 5-2 | 改造 M2~M34（30个已有壳子弹窗）：原生 button/input/select→a-button/a-input/a-select，删除自定义 CSS，title 标准化 |
| 5-3 | 迁移 job-tracking 内联 a-modal 到 OverlaySurfaceModal |
| 5-4 | 检查 M35 M36 全局弹窗内部 |
| 5-5 | 删除 global.scss 中不再使用的自定义样式（如果有） |
| 5-6 | 检查是否还有残留的 `permission-button`、`ghost-button` 等旧 class |
| 5-7 | 检查 mdi 图标引用，确认是否可以移除 `@mdi/font` 依赖 |
| 5-8 | 浏览器全页面验证 |

## 五、总量估计

| Phase | 页面数 | 预计修改行数 |
|-------|--------|-------------|
| Phase 0 | - | ~80 行（新建+修改） |
| Phase 1 | 5 + 2弹窗迁移 | ~700 行 |
| Phase 2 | 6 | ~4000 行 |
| Phase 3 | 10 | ~5000 行 |
| Phase 4 | 9 + 8弹窗迁移 | ~5500 行 |
| Phase 5 | - | ~100 行 |
| **合计** | **30 页 + 46 弹窗** | **~15,400 行** |

## 六、需求定义

### 6.1 功能需求

| ID | 需求描述 | 优先级 | 验收标准 |
|----|----------|--------|----------|
| REQ-UI-001 | 创建 PageHeader 公共组件 | P0 | 组件可接收 title/subtitle/description props，支持 #actions 插槽 |
| REQ-UI-002 | 全局样式补充 `.osg-page` 布局类 | P0 | 所有页面使用统一的 flex 纵向布局，间距 16px |
| REQ-UI-003 | 所有页面头部统一使用 PageHeader 组件 | P0 | 30 个页面（不含 login）全部使用 `<PageHeader>` |
| REQ-UI-004 | 所有按钮统一使用 `<a-button>` | P0 | 不再出现 `permission-button`, `ghost-button`, `primary-button`, `link-button` 等自定义按钮 class |
| REQ-UI-005 | 所有数据表格统一使用 `<a-table>` | P0 | 不再出现自定义 `<table class="permission-table">` 或其他原生表格 |
| REQ-UI-006 | 所有输入框统一使用 `<a-input>` / `<a-select>` | P0 | 不再出现自定义 class 的原生 `<input>` / `<select>` |
| REQ-UI-007 | 所有标签/徽章统一使用 `<a-tag>` | P1 | 不再出现 `permission-pill` 等自定义标签 |
| REQ-UI-008 | 所有卡片容器统一使用 `<a-card>` | P1 | 不再出现 `permission-card` 等自定义卡片 |
| REQ-UI-009 | 弹窗壳子统一 + 内部控件统一 | P0 | 所有 46 个弹窗实例统一使用 `OverlaySurfaceModal` 壳子（2 个 `<a-modal>` + 8 个自建遮罩需迁移）；弹窗内**所有**交互按钮统一为 `<a-button>`（不仅 footer，包括正文中的操作按钮）；所有表单控件统一为 Ant 组件（不允许原生 `<input>`/`<select>`/`<textarea>`，`type="hidden"` 除外） |
| REQ-UI-012 | 弹窗 title 统一写法 | P1 | 所有弹窗 title 统一为 `<span>` + `<span class="mdi">` 结构，不单独定义图标颜色 |
| REQ-UI-013 | 弹窗颜色统一 | P0 | 所有弹窗主按钮渐变统一走 `var(--primary-gradient)`，删除自定义渐变色 |
| REQ-UI-010 | 图标统一使用 `@ant-design/icons-vue` | P2 | mdi 图标逐步替换，特殊场景可保留 |
| REQ-UI-011 | 清理废弃的自定义 CSS | P1 | `<style scoped>` 中不再重复定义 `permission-button`、`permission-table` 等公共样式 |

### 6.2 非功能需求

| ID | 需求描述 | 验收标准 |
|----|----------|----------|
| NFR-001 | 功能完整性 | 每个页面改造后，原有业务功能不受影响（API 调用、数据绑定、弹窗交互、分页、筛选） |
| NFR-002 | 浏览器兼容 | Chrome 90+、Edge 90+ 正常显示 |
| NFR-003 | 响应式布局 | 所有 `<a-table>` 必须显式设置 `:scroll="{ x: 'max-content' }"` 或具体 px 值，确保窄屏横向滚动（Ant table 不会自动支持） |
| NFR-004 | 性能 | 页面加载时间不因组件替换而明显增加 |

## 七、PageHeader 组件规格

### 7.1 接口定义

```typescript
interface PageHeaderProps {
  title: string           // 必填，中文标题，如"导师列表"
  subtitle?: string       // 可选，英文副标题，如"Mentor List"
  description?: string    // 可选，页面描述，如"管理导师和班主任账户"
}

// Slots
#actions    // 右侧操作按钮区（如新增按钮、导出按钮）
```

### 7.2 视觉规格

```
┌─────────────────────────────────────────────────────────────┐
│  导师列表  Mentor List                    [新增导师] [导出]  │
│  管理导师和班主任账户，录入信息开通账号                        │
└─────────────────────────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 标题字号 | 22px, font-weight: 700 |
| 副标题字号 | 14px, font-weight: 400, color: #94a3b8 |
| 描述字号 | 14px, color: #64748b |
| 标题与副标题间距 | margin-left: 8px（同行显示） |
| 标题与描述间距 | margin-top: 6px |
| 左右区域对齐 | justify-content: space-between |

### 7.3 文件路径

`osg-frontend/packages/admin/src/components/PageHeader.vue`

## 八、逐页改造映射

### 8.1 每页改造内容清单

| # | 页面路径 | 当前风格 | 改造要点 | 预计行数变化 | 状态 |
|---|---------|----------|----------|-------------|------|
| 1 | profile/logs | B-ANT | header→PageHeader，其他保留 | -20 | ✅ |
| 2 | profile/complaints | B-ANT | header→PageHeader，其他保留 | -20 | ✅ |
| 3 | profile/notice | B-ANT | header→PageHeader，其他保留 | -20 | ✅ |
| 4 | profile/mailjob | B-ANT | header→PageHeader，其他保留 | -20 | ✅ |
| 5 | permission/menu | B-ANT | header→PageHeader，混合按钮统一 | -30 | ✅ |
| 6 | permission/roles | A-NEW | 全面改造：header/button/table/card/tag 全换 Ant | -100 | ✅ |
| 7 | permission/users | A-NEW | 全面改造 | -150 | ✅ |
| 8 | users/staff | A-NEW | 全面改造，最大标杆页 | -200 | ✅ |
| 9 | users/students | A-NEW | 全面改造，最大页面 | -250 | ✅ |
| 10 | users/contracts | A-NEW | 全面改造 | -100 | ✅ |
| 11 | career/job-tracking | A-NEW | 全面改造 | -80 | ✅ |
| 12 | dashboard | D-MIX | 加 PageHeader + a-card 包装 | +20 | ✅ |
| 13 | teaching/communication | D-MIX | header→PageHeader，原生→Ant | -30 | ✅ |
| 14 | permission/base-data | D-MIX | 混合→统一 Ant | -50 | ✅ |
| 15 | teaching/class-records | D-MIX | 原生→Ant | -80 | ✅ |
| 16 | teaching/reports | D-MIX | 原生→Ant | -80 | ✅ |
| 17 | teaching/feedback | D-MIX | 大量原生表单→Ant | -80 | ✅ |
| 18 | career/student-positions | D-MIX | 原生→Ant | -80 | ✅ |
| 19 | career/mock-practice | D-MIX | 原生→Ant | -100 | ✅ |
| 20 | career/job-overview | D-MIX | 大页面，原生→Ant | -150 | ✅ |
| 21 | users/mentor-schedule | D-MIX | 原生→Ant | -80 | ✅ |
| 22 | resources/files | C-RAW | eyebrow/ghost-button 全换 Ant | -50 | ✅ |
| 23 | resources/qbank | C-RAW | 同上 | -50 | ✅ |
| 24 | finance/expense | C-RAW | 同上 | -50 | ✅ |
| 25 | resources/interview-bank | C-RAW | 同上 | -60 | ✅ |
| 26 | resources/online-test-bank | C-RAW | 同上 | -60 | ✅ |
| 27 | resources/questions | C-RAW | 同上 | -60 | ✅ |
| 28 | finance/settlement | C-RAW | 含统计卡片+Tab | -60 | ✅ |
| 29 | teaching/all-classes | C-RAW | ghost-button→Ant | -60 | ✅ |
| 30 | career/positions | C-RAW | 最大 C-RAW 页面 | -150 | ✅ |

### 8.2 弹窗组件改造清单

> 弹窗组件跟随其所属页面的 Phase 一起改造。共 45 个弹窗文件 + 1 个内联弹窗 = 46 个实例（M1~M46）。其中 35 个已用 OverlaySurfaceModal（views/ 下 33 + 全局 2，只改内部），2 个用 `<a-modal>` 需迁移壳子，8 个用自建遮罩需迁移壳子 + 内部全改。改造内容统一为：title 结构标准化、footer 按钮换 `<a-button>`、表单控件换 Ant 组件、删除自定义样式和自定义颜色。

| # | 弹窗组件路径 | 所属页面 | Phase | 改造要点 | 状态 |
|---|-------------|---------|-------|----------|------|
| M1 | permission/menu/components/MenuFormModal.vue | menu | 1 | 原生 `<input>`/`<select>` → `<a-input>`/`<a-select>`；原生 `<button class="btn">` → `<a-button>`；删除 `.btn`/`.form-input`/`.form-select` 样式 | ✅ |
| M2 | permission/roles/components/RoleModal.vue | roles | 2 | 原生 checkbox → `<a-checkbox>`；删除 `role-modal__confirm-btn` 自定义渐变 | ✅ |
| M3 | permission/roles/components/RoleMenuTreeModal.vue | roles | 2 | title 标准化；检查 footer 按钮 | ✅ |
| M4 | permission/users/components/UserModal.vue | users | 2 | 删除 `user-modal__cancel-btn`/`user-modal__confirm-btn` 及 `!important` 覆盖样式；删除渐变色 `#3f68ff→#6788ff`；原生 checkbox → `<a-checkbox>`；删除全局 `<style>` 覆盖块 | ✅ |
| M5 | permission/users/components/ResetPwdModal.vue | users | 2 | title 标准化 | ✅ |
| M6 | permission/base-data/components/BaseDataModal.vue | base-data | 3 | title 标准化；检查表单控件 | ✅ |
| M7 | users/staff/components/StaffFormModal.vue | staff | 2 | **大改**：所有原生 `<input>`/`<select>` → Ant 控件；原生 `<button>` → `<a-button>`；删除大量自定义样式 | ✅ |
| M8 | users/staff/components/StaffDetailModal.vue | staff | 2 | `permission-button--outline` → `<a-button>` | ✅ |
| M9 | users/staff/components/StaffStatusModal.vue | staff | 2 | 原生 `<button>` → `<a-button>`；title 标准化 | ✅ |
| M10 | users/staff/components/MentorStudentsModal.vue | staff | 2 | `permission-button--outline` → `<a-button>`；title 标准化 | ✅ |
| M11 | users/staff/index.vue (内联重置密码弹窗) | staff | 2 | 原生 `<button>` → `<a-button>`；title 标准化 | ✅ |
| M12 | users/students/components/AddStudentModal.vue | students | 2 | title 标准化；检查表单控件和按钮 | ✅ |
| M13 | users/students/components/EditStudentModal.vue | students | 2 | 同上 | ✅ |
| M14 | users/students/components/BlacklistModal.vue | students | 2 | 同上 | ✅ |
| M15 | users/students/components/StatusChangeModal.vue | students | 2 | 同上 | ✅ |
| M16 | users/students/components/StudentDetailModal.vue | students | 2 | 同上 | ✅ |
| M17 | users/contracts/components/ContractDetailModal.vue | contracts | 2 | title 标准化 | ✅ |
| M18 | users/contracts/components/RenewContractModal.vue | contracts | 2 | title 标准化（有 eyebrow，需删除） | ✅ |
| M19 | users/contracts/components/ContractBlacklistModal.vue | contracts | 2 | title 标准化 | ✅ |
| M20 | users/contracts/components/ContractRemoveBlacklistModal.vue | contracts | 2 | 同上 | ✅ |
| M21 | users/contracts/components/ContractStatusChangeModal.vue | contracts | 2 | 同上 | ✅ |
| M22 | users/mentor-schedule/components/EditScheduleModal.vue | mentor-schedule | 3 | 原生 `<button>` → `<a-button>`；title 标准化 | ✅ |
| M23 | teaching/class-records/components/ClassRecordDetailModal.vue | class-records | 3 | title 标准化 | ✅ |
| M24 | teaching/class-records/components/ClassRecordReviewModal.vue | class-records | 3 | 同上 | ✅ |
| M25 | teaching/reports/components/ReviewDetailModal.vue | reports | 3 | 原生 `<button>` → `<a-button>` | ✅ |
| M26 | teaching/all-classes/components/ClassDetailModal.vue | all-classes | 4 | title 标准化 | ✅ |
| M27 | career/positions/components/PositionFormModal.vue | positions | 4 | **大改**：所有原生 `<input>`/`<select>`/`<textarea>` → Ant 控件；原生 `<button>` → `<a-button>`；删除大量自定义样式 | ✅ |
| M28 | career/positions/components/BatchUploadModal.vue | positions | 4 | title 标准化；检查 footer | ✅ |
| M29 | career/positions/components/PositionStudentsModal.vue | positions | 4 | title 标准化 | ✅ |
| M30 | career/student-positions/components/ReviewPositionModal.vue | student-positions | 3 | title 标准化 | ✅ |
| M31 | career/student-positions/components/RejectPositionModal.vue | student-positions | 3 | 同上 | ✅ |
| M32 | career/mock-practice/components/AssignMockModal.vue | mock-practice | 3 | title 标准化（`<i>` → `<span>`） | ✅ |
| M33 | career/mock-practice/components/MockFeedbackModal.vue | mock-practice | 3 | 同上 | ✅ |
| M34 | career/job-overview/components/AssignMentorModal.vue | job-overview | 3 | title 标准化（`<i>` → `<span>`，删除额外包装层） | ✅ |
| M35 | components/ForgotPasswordModal.vue | login (不改壳子) | — | 只统一内部控件和按钮，保留 `variant="accent"` | ✅ |
| M36 | components/ProfileModal.vue | 全局 | — | 检查 footer 按钮和表单控件 | ✅ |
| | **以下为壳子类型 B（`<a-modal>`→迁移到 OverlaySurfaceModal）** | | | |
| M37 | profile/mailjob/components/NewMailJobModal.vue | mailjob | 1 | **壳子迁移**：`<a-modal>` → `OverlaySurfaceModal`；内部已用 Ant 控件，迁移后检查样式 | ✅ |
| M38 | profile/notice/components/SendNoticeModal.vue | notice | 1 | **壳子迁移**：`<a-modal>` → `OverlaySurfaceModal`；内部已用 Ant 控件 | ✅ |
| | **以下为壳子类型 C（自建遮罩 `<div>`→迁移到 OverlaySurfaceModal）** | | | |
| M39 | finance/expense/components/NewExpenseModal.vue | expense | 4 | **壳子迁移 + 大改**：自建遮罩 → `OverlaySurfaceModal`；`ghost-button`/`primary-button` → `<a-button>`；原生 `<input>`/`<select>` → Ant 控件 | ✅ |
| M40 | finance/settlement/components/MarkPaidModal.vue | settlement | 4 | **壳子迁移**：自建遮罩 → `OverlaySurfaceModal`；`ghost-button`/`primary-button` → `<a-button>` | ✅ |
| M41 | resources/files/components/FileAuthModal.vue | files | 4 | **壳子迁移 + 大改**：自建遮罩 → `OverlaySurfaceModal`；原生 `<input>` + `ghost-button` → Ant 控件；用户标签交互需适配 | ✅ |
| M42 | resources/files/components/NewFolderModal.vue | files | 4 | **壳子迁移**：自建遮罩 → `OverlaySurfaceModal`；`ghost-button`/`primary-button` → `<a-button>` | ✅ |
| M43 | resources/interview-bank/components/InterviewBankFormModal.vue | interview-bank | 4 | **壳子迁移**：自建遮罩 → `OverlaySurfaceModal`；`ghost-button`/`primary-button` → `<a-button>`；原生表单 → Ant 控件 | ✅ |
| M44 | resources/online-test-bank/components/TestBankFormModal.vue | online-test-bank | 4 | **壳子迁移**：同 M43 | ✅ |
| M45 | resources/qbank/components/QbankFolderModal.vue | qbank | 4 | **壳子迁移**：自建 `modal-shell` → `OverlaySurfaceModal`；删除 eyebrow；按钮 → `<a-button>` | ✅ |
| M46 | resources/questions/components/QuestionReviewModal.vue | questions | 4 | **壳子迁移**：自建 `review-modal` → `OverlaySurfaceModal`；删除 eyebrow；3 个按钮（取消/驳回/通过）→ `<a-button>` + `<a-button danger>` + `<a-button type="primary">` | ✅ |

## 九、验收标准

### 9.1 自动化检查

#### 9.1.1 每个 Phase 完成后：只检查当批改过的文件

```bash
# 1. 编译通过
cd osg-frontend && pnpm run build:admin

# 2. 当批页面无残留旧 class（PHASE_FILES 替换为当批文件列表）
PHASE_FILES="packages/admin/src/views/permission/menu/index.vue packages/admin/src/views/permission/menu/components/MenuFormModal.vue"
for f in $PHASE_FILES; do
  grep -n "permission-button\|ghost-button\|primary-button\|link-button\|page-eyebrow\|permission-table\|permission-card\|permission-pill\|btn-primary\|btn-outline\|form-input\|form-select" "$f" || true
done
# 期望输出: 空（当批文件无旧 class）

# 3. 当批页面使用 PageHeader（只检查 index.vue，不检查弹窗组件）
for f in $PHASE_FILES; do
  [[ "$f" == *index.vue ]] && grep -L "PageHeader" "$f" || true
done
# 期望输出: 空

# 4. 当批弹窗无原生 <button>/<input>/<select>/<textarea>
PHASE_MODALS="packages/admin/src/views/permission/menu/components/MenuFormModal.vue"
for f in $PHASE_MODALS; do
  # 检查原生 button（弹窗内所有交互按钮都应用 a-button）
  grep -n '<button[^>]*>' "$f" || true
  # 检查原生表单控件（排除 type="hidden"）
  grep -n '<input[^>]*>\|<select[^>]*>\|<textarea[^>]*>' "$f" | grep -v 'type="hidden"' | grep -v '<a-input\|<a-select\|<a-textarea\|<a-date\|<a-checkbox\|<a-radio' || true
done
# 期望输出: 空（弹窗内所有控件已全部换成 Ant 组件）

# 5. 当批页面无原生 <button>（REQ-UI-004：所有按钮统一 a-button）
for f in $PHASE_FILES; do
  [[ "$f" == *index.vue ]] && grep -n '<button[^>]*>' "$f" || true
done
# 期望输出: 空（页面层无原生 button）
```

#### 9.1.2 Phase 5（最终清理）：全量检查

```bash
# 1. 全量编译
cd osg-frontend && pnpm run build:admin

# 2. 全量无残留旧 class
grep -rn "permission-button\|ghost-button\|primary-button\|link-button\|page-eyebrow\|permission-table\|permission-card\|permission-pill" \
  packages/admin/src/views/ --include="*.vue" \
  | grep -v "login/"
# 期望输出: 空

# 3. 全量弹窗无原生 <button>（弹窗内所有交互按钮都应用 a-button）
#    范围：views/ 下 43 个 Modal + 全局 2 个 Modal + 内联 1 个 = 46 个实例
ALL_MODALS=$(
  find packages/admin/src/views/ -path '*/components/*Modal.vue'
  echo packages/admin/src/components/ForgotPasswordModal.vue
  echo packages/admin/src/components/ProfileModal.vue
  echo packages/admin/src/views/users/staff/index.vue
)
for f in $ALL_MODALS; do
  grep -ln '<button[^>]*>' "$f" || true
done
# 期望输出: 空

# 4. 全量弹窗无原生 <input>/<select>/<textarea>（排除 type="hidden"，搜所有原生控件）
#    范围同上
for f in $ALL_MODALS; do
  grep -n '<input[^>]*>\|<select[^>]*>\|<textarea[^>]*>' "$f" | grep -v 'type="hidden"' | grep -v '<a-input\|<a-select\|<a-textarea\|<a-date\|<a-checkbox\|<a-radio' || true
done
# 期望输出: 空

# 5. 全量弹窗无自定义渐变色（只检查弹窗文件，不扣页面层）
for f in $ALL_MODALS; do
  grep -n '#3f68ff\|#6788ff\|#6366f1' "$f" || true
done
# 期望输出: 空

# 6. 所有页面使用 PageHeader
for f in $(find packages/admin/src/views/ -name 'index.vue' ! -path '*/login/*'); do
  grep -L "PageHeader" "$f"
done
# 期望输出: 空

# 7. 全量页面无原生 <button>（REQ-UI-004：所有按钮统一 a-button）
for f in $(find packages/admin/src/views/ -name 'index.vue' ! -path '*/login/*'); do
  grep -ln '<button[^>]*>' "$f" || true
done
# 期望输出: 空

# 8. 所有 a-table 有 scroll 配置
for f in $(grep -rl '<a-table' packages/admin/src/views/ --include="*.vue"); do
  grep -L ':scroll' "$f"
done
# 期望输出: 空（所有含 a-table 的页面都配了 :scroll）
```

### 9.2 人工检查（每批改完后浏览器验证）

| 检查项 | 通过条件 |
|--------|----------|
| 页面头部 | 所有页面头部结构一致（标题 + 副标题 + 描述 + 右侧按钮） |
| 页面按钮 | 所有页面主体按钮外观一致（Ant 默认样式） |
| 表格 | 所有数据表格外观一致（Ant table 样式），排序/分页正常 |
| 表格窄屏 | 浏览器窗口缩窄至 1024px 时，表格可横向滚动 |
| 筛选栏 | 输入框、下拉框外观一致，筛选功能正常 |
| 弹窗外观 | 所有弹窗头部结构一致（图标 + 标题，图标颜色统一） |
| 弹窗按钮 | 所有弹窗取消/确认按钮外观一致（统一圆角、渐变色） |
| 弹窗表单 | 所有弹窗内输入框/下拉框外观一致（统一边框、圆角） |
| 弹窗功能 | 新增/编辑/详情弹窗正常弹出和关闭，表单提交正常 |
| 数据加载 | 列表数据正常加载，翻页正常 |
| 操作按钮 | 编辑/删除/启用/禁用等操作正常执行 |

## 十、风险与注意事项

1. **功能不能破坏** — 每改一页都要确保原有逻辑（API 调用、数据绑定、弹窗交互）不变
2. **a-table 的 columns 定义** — 原生 table 的列需要转换为 Ant 的 columns 数组格式
3. **a-select 的数据绑定** — 原生 `<select>` 用 `v-model`，Ant 用 `v-model:value`
4. **样式冲突** — 全局样式可能影响 Ant 组件默认样式，需要注意
5. **每批改完后浏览器验证** — 确保视觉效果正确
6. **原生 table 转 a-table 时** — 需要将 `<thead>/<tbody>/<tr>/<td>` 结构转换为 `columns` 数组 + `bodyCell` 插槽模式
7. **表单验证** — 如果原页面用原生表单校验，需要切换为 `<a-form>` 的 rules 验证
8. **弹窗内大量原生控件** — StaffFormModal（~20 个原生 input/select）和 PositionFormModal（~15 个）是工作量最大的弹窗，需要逐一替换为 Ant 控件并确保双向绑定正确
9. **OverlaySurfaceModal 的 `:deep()` 样式依赖** — 弹窗内部统一后依赖壳子的 `:deep()` 样式，如果壳子样式发生变化会影响所有弹窗
10. **弹窗 `v-model` 差异** — 原生 `<input>` 用 `v-model`，切换到 `<a-input>` 后需改为 `v-model:value`；原生 `<select>` 同理；遗漏会导致数据绑定失效
11. **弹窗表单布局变化** — 原生表单用自定义 grid 布局（`xxx-modal__grid`），切换为 `<a-form layout="vertical">` 后布局可能变化，需要通过 `<a-row>` + `<a-col>` 重新调整
12. **验收脚本分阶段执行** — Phase 1-4 只检查当批改过的文件，Phase 5 全量检查；避免未改的文件触发假红线
13. **壳子迁移风险（10 个弹窗）** — 2 个 `<a-modal>` 弹窗迁移到 OverlaySurfaceModal 时，需要把 `<a-modal>` 的 `:open`/`@cancel`/`:confirm-loading` 等 prop 映射为 OverlaySurfaceModal 的 `:open`/`@cancel`/自定义 loading；8 个自建遮罩弹窗需要将整个自建 div 结构（backdrop + shell + header + body + footer）替换为 OverlaySurfaceModal 的 slot 结构，同时保留原有业务逻辑
14. **自建遮罩弹窗的关闭逻辑** — 自建遮罩弹窗用的是 `@click` 直接 emit，迁移到 OverlaySurfaceModal 后需改为 `@cancel` 事件，且 Escape 键关闭逻辑自动由壳子接管

---

## 十一、数据/字典层标准（2026-04-18~19 追加）

> 本章节是在 UI 层统一之后，基于岗位模块重构时沉淀出的数据/字典层规范。与前述 UI 层规范**共同构成** admin 端的完整标准。
> 其他端在做对齐时应同时参考 UI 层（§一~§十）和本章节。

### 11.1 字典单一真源原则

**规则**：一个业务概念只允许存在一个字典，所有端前后端都消费同一个字典。

| 业务概念 | 唯一字典 | 值示例 |
|---|---|---|
| 公司/岗位类别 | `osg_company_type` | `bulge_bracket` / `elite_boutique` / `middle_market` / `buyside` / `consulting` / `swe_pm` / `other_company`（7 项） |
| 招聘周期 | `osg_recruit_cycle` | `Class of 2026` / `Class of 2027` / `Open` 等 |
| 岗位分类 | `osg_student_position_category` | `summer` / `fulltime` / `offcycle` / `spring` / `events` |

**反例**（本次已清理）：曾并存 `osg_position_industry`（老 4 项）+ `osg_student_position_industry`（老 4 项）+ `osg_company_type`（新 7 项）三个并列字典，造成各端混用。

### 11.2 字典 seed 注入纪律

**规则**：后端 service 不得向"非自身职责字典"注入 seed；字典的写入方必须唯一。

**反例**（本次已删除）：`PositionServiceImpl`（学生端服务）的 `INDUSTRY_SEEDS` 在 `syncPositionReferenceData` 时向 admin 所属的 `osg_company_type` 注入老 4 项 seed，启动或学生端每次调用相关 API 都污染字典。

**正例**（admin 现状）：
- Admin 端字典管理 UI = `osg_company_type` 唯一写入方
- 其他端的 service **只读**该字典，调用 `loadDictValueMap(...)` 读取，**不** upsert 回写

### 11.3 后端 derive，不靠前端兜底

**规则**：同一业务语义对应多个 DB 列（如 `industry` label + `company_type` value）时，**后端从字典 derive**，前端只提交 value。

**反例**（本次已删除）：
```ts
// PositionFormModal.vue 旧代码
const payload = {
  companyType: form.companyType,
  industry: form.companyType || 'Investment Bank',  // 前端写死老字典 label
};
```

**正例**（admin 现状）：
```ts
// 前端只提交 value
const payload = { companyType: form.companyType /* 其他字段 */ };
```
```java
// 后端 OsgPositionServiceImpl.buildPosition
SysDictData dict = findDict("osg_company_type", companyType);
position.setCompanyType(companyType);
position.setIndustry(dict != null ? dict.getDictLabel() : "");
```

### 11.4 审计字段规范

**规则**：`create_by` / `update_by` / `create_time` / `update_time` 这类审计字段：

- **列表展示**：需要时放在"操作"列之前
- **新增时**：后端强制写入当前登录用户，不信任前端传值
- **编辑时**：允许管理员改 `create_by`（业务可能需要修正历史数据的"添加人"）
- **Mapper**：`updatePosition` 等 XML 必须支持 `create_by` 的更新分支，否则编辑不生效

**admin 已落地**：岗位列表"添加人"列 + 编辑弹窗可改 + `OsgPositionMapper.xml` `updatePosition` 含 `<if test="createBy != null">create_by = #{createBy},</if>` 分支。

### 11.5 Fallback 降级策略

**规则**：DB 中的老 value 在新字典里找不到时，UI 不报错不白屏；后端 service 用字典的"默认/其他"项样式作为兜底。

**admin 已落地**：`OsgPositionServiceImpl` 查字典未命中时使用 `other_company` 的 css_class / list_class 作为降级样式，不抛异常。

### 11.6 可观测的字典约束（给验收用）

| 约束 | 验收命令 |
|---|---|
| 前端不得硬编码老字典 value | `rg "'Investment Bank'\|'investment bank'\|'ib'\|'pevc'" packages/admin/src --glob '!**/*.spec.ts' \| wc -l` → 应为 0 |
| 后端 service 不得 seed 非自身职责字典 | `rg "new DictSeed\(\"osg_company_type\"" ruoyi-system/src/main/java` → 应仅有 admin 端 |
| DB 岗位表不得残留老 value | `SELECT COUNT(*) FROM osg_position WHERE industry IN ('Investment Bank','Tech','PE/VC') OR company_type IN ('Investment Bank','Tech','PE/VC')` → 应为 0 |

---

## 十二、改动记录（2026-04-18~19）

### 12.1 提交

| Commit | 内容 |
|---|---|
| `34d10c19` | 岗位列表切新字典 + 22 条数据 legacy 值恢复（为后续 SQL 迁移做准备）+ "添加人"列 + 编辑可改 + Mapper XML `create_by` 修复 |
| `75020f24` | 消除 `osg_company_type` 污染炸弹（删 `PositionServiceImpl.INDUSTRY_SEEDS`）+ admin 学生自添岗位 filter 改从 `getPositionMeta().industries` 拉取 |
| `f09ffe61` | 22 条老数据一次性 SQL 迁移到新字典（按公司本质智能归类） |

### 12.2 影响文件

**后端**：
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java` — `DICT_POSITION_INDUSTRY` 切到 `osg_company_type`；buildPosition 从 companyType derive industry；删 4 条老 DictSeed
- `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java` — 删 `INDUSTRY_SEEDS` 注入；`syncPositionReferenceData` 不再调用对应 seed
- `ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml` — updatePosition 加 `create_by` 更新分支

**前端 admin**：
- `osg-frontend/packages/admin/src/views/career/positions/index.vue` — 列表/下钻 columns 加"添加人"列
- `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue` — 删 `'Investment Bank'` 兜底；加"添加人" input 字段；field 加入 resetForm/submit 流程
- `osg-frontend/packages/admin/src/views/career/student-positions/index.vue` — filter 下拉从 `getPositionMeta().industries` 动态拉取
- `osg-frontend/packages/admin/src/views/career/student-positions/components/ReviewPositionModal.vue` — placeholder 用新字典值示例（Bulge Bracket / Buyside / Consulting / swe_pm）
- `osg-frontend/packages/shared/src/api/admin/position.ts` — PositionListItem/Payload 加 createBy 字段；industry/city 改可选

**SQL**：
- `sql/migrations/2026-04-19-restore-position-industry-values.sql` — 回滚预案
- `sql/migrations/2026-04-19-migrate-position-legacy-industry-to-new-dict.sql` — 22 条一次性迁移

**测试**：
- `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgPositionServiceImplTest.java` — mock 字典切换
- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgPositionControllerTest.java` — mock + payload 同步

### 12.3 22 条岗位数据迁移分布

| 新 `company_type` | 条数 | 公司列表 |
|---|---|---|
| `consulting` | 6 | Alvarez & Marsal ×3, Advancy ×2, DHL Consulting |
| `bulge_bracket` | 4 | Citi, Morgan Stanley ×2, BNP Paribas |
| `elite_boutique` | 1 | MTS（假设为 MTS Health Partners） |
| `middle_market` | 6 | BMO, Piper Sandler, TD ×3, William Blair |
| `buyside` | 5 | Walleye Capital, Ardian, SIG ×3 |
| **合计** | **22** | |

映射原则：**按公司本质**归类，不按岗位性质。业务后续可在 admin 后台手改个例。

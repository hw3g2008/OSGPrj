# Vue 代码规范

## 引用规范

Vue 3 官方风格指南 + Ant Design Vue 规范

## 组件规范

### 单文件组件结构

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// 2. Props 和 Emits
const props = defineProps<{
  title: string
}>()

const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

// 3. 响应式状态
const loading = ref(false)

// 4. 计算属性
const displayTitle = computed(() => props.title.toUpperCase())

// 5. 方法
const handleSubmit = () => {
  emit('submit', 'value')
}

// 6. 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <div class="component-name">
    <h1>{{ displayTitle }}</h1>
    <a-button @click="handleSubmit" :loading="loading">
      提交
    </a-button>
  </div>
</template>

<style scoped lang="scss">
.component-name {
  // 样式
}
</style>
```

## 命名规范

- 组件文件：PascalCase.vue
- 组件名：PascalCase
- Props：camelCase
- Events：kebab-case（emit 时用 camelCase）

## API 调用

```typescript
// shared/src/api/xxx.ts
import { request } from '@/utils/request'

export const xxxApi = {
  list: (params: ListParams) => 
    request.get<ListResult>('/api/xxx', { params }),
  
  create: (data: CreateDTO) => 
    request.post<void>('/api/xxx', data),
}
```

## 状态管理

```typescript
// shared/src/stores/xxx.ts
import { defineStore } from 'pinia'

export const useXxxStore = defineStore('xxx', () => {
  const list = ref<Xxx[]>([])
  
  const fetchList = async () => {
    list.value = await xxxApi.list()
  }
  
  return { list, fetchList }
})
```

## 主题定制规范

### Ant Design Vue 主题配置

每个端（admin / student / mentor 等）在自己的 `theme/index.ts` 中导出主题配置，通过 `<a-config-provider :theme="theme">` 注入。

```typescript
// packages/{portal}/src/theme/index.ts
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

export const portalTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3b82f6',     // 必须：从设计 Token 中取值
    borderRadius: 8,
    // ...其他 Token
  },
}
```

### 颜色变量规范

- **禁止**在组件内硬编码颜色值（如 `color: #3b82f6`）
- **必须**使用以下方式之一：
  1. Ant Design Vue Token（通过 `theme` 自动应用）
  2. SCSS 全局变量（定义在 `shared/src/styles/variables.scss`）
  3. CSS 自定义属性（定义在 `:root` 或组件 scope 内）

```scss
// 正确 ✅
.sidebar { background: var(--sidebar-bg); }
.card { border-radius: $border-radius-card; }

// 错误 ❌
.sidebar { background: #1e293b; }
.card { border-radius: 12px; }
```

### 全局 SCSS 变量

```scss
// shared/src/styles/variables.scss
$sidebar-width: 240px;
$sidebar-bg: #1e293b;
$body-bg: #f1f5f9;
$border-color: #e2e8f0;
$border-radius-card: 12px;
$border-radius-btn: 8px;
$border-radius-badge: 20px;
$shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
```

## UI 还原规范

### 原型文件位置

UI 原型 HTML 文件位于 `${config.paths.docs.prototypes}`（本项目为 `osg-spec-docs/source/prototype/`），是 UI 还原的**唯一视觉标准**。

### 还原流程

1. **读取原型**：找到对应模块的原型 HTML 文件
2. **提取结构**：分析 HTML 结构（区域划分、组件层次）
3. **提取样式**：提取 CSS 中的颜色、间距、圆角、阴影等
4. **组件映射**：将原型 HTML 元素映射为 Ant Design Vue 组件
5. **样式微调**：用 `<style scoped lang="scss">` 补充 Ant Design Vue 未覆盖的视觉细节

### 组件映射原则

- 优先使用 Ant Design Vue 内置组件
- 通过 `theme` Token 调整组件样式，而非覆盖 `.ant-xxx` 类名
- 仅在 Ant Design Vue 无对应组件时自行实现
- 自定义组件的视觉效果必须与原型一致

### 布局实现

- 侧边栏使用 `<a-layout-sider>` 或自定义组件
- TopBar 使用 `<a-layout-header>`
- 内容区使用 `<a-layout-content>`
- 页面整体使用 `<a-layout>` 嵌套

### 禁止事项

- ❌ 引入 Tailwind CSS（原型使用 Tailwind 仅作展示，实际项目用 Ant Design Vue + SCSS）
- ❌ 直接复制原型 HTML 结构（必须转换为 Vue 组件）
- ❌ 使用 `!important` 覆盖 Ant Design Vue 样式（除非无其他方案）
- ❌ 在组件中内联 `style` 绑定颜色值

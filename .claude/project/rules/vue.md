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

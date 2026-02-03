<template>
  <div class="materials-page">
    <OsgPageContainer title="资料管理">
      <a-button type="primary" style="margin-bottom: 16px">上传资料</a-button>
      <a-table :columns="columns" :data-source="materials" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
const loading = ref(false)
const columns = [
  { title: '资料名称', dataIndex: 'name', key: 'name' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '上传时间', dataIndex: 'uploadTime', key: 'uploadTime' },
  { title: '下载量', dataIndex: 'downloads', key: 'downloads' }
]
const materials = ref([
  { id: 1, name: 'Java 核心笔记', category: '学习文档', uploadTime: '2026-01-20', downloads: 45 },
  { id: 2, name: 'Spring Boot 实战', category: '学习文档', uploadTime: '2026-01-25', downloads: 32 }
])
</script>

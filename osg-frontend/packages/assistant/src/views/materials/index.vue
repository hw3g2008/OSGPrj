<template>
  <div class="materials-page">
    <OsgPageContainer title="资料管理">
      <a-button type="primary" style="margin-bottom: 16px">{{ $t('upload_resources') }}</a-button>
      <a-table :columns="columns" :data-source="materials" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const loading = ref(false)
const columns = [
  { title: t('resource_name'), dataIndex: 'name', key: 'name' },
  { title: t('category'), dataIndex: 'category', key: 'category' },
  { title: t('upload_time'), dataIndex: 'uploadTime', key: 'uploadTime' },
  { title: t('downloads'), dataIndex: 'downloads', key: 'downloads' }
]
const materials = ref([
  { id: 1, name: 'Java 核心笔记', category: t('study_documents'), uploadTime: '2026-01-20', downloads: 45 },
  { id: 2, name: 'Spring Boot 实战', category: t('study_documents'), uploadTime: '2026-01-25', downloads: 32 }
])
</script>

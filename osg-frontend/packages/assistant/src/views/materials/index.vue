<template>
  <div class="materials-page">
    <OsgPageContainer :title="t('assistant.materials.title')">
      <a-button type="primary" style="margin-bottom: 16px">{{ t('assistant.materials.upload') }}</a-button>
      <a-table :columns="columns" :data-source="materials" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()
const loading = ref(false)
const columns = [
  { title: t('assistant.materials.k1'), dataIndex: 'name', key: 'name' },
  { title: t('assistant.materials.k2'), dataIndex: 'category', key: 'category' },
  { title: t('assistant.materials.k3'), dataIndex: 'uploadTime', key: 'uploadTime' },
  { title: t('assistant.materials.k4'), dataIndex: 'downloads', key: 'downloads' }
]
const materials = ref([
  { id: 1, name: t('assistant.materials.k5'), category: t('assistant.materials.k6'), uploadTime: '2026-01-20', downloads: 45 },
  { id: 2, name: t('assistant.materials.k7'), category: t('assistant.materials.k6'), uploadTime: '2026-01-25', downloads: 32 }
])
</script>

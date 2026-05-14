<template>
  <div class="classes-page">
    <OsgPageContainer title="班级管理">
      <a-table :columns="columns" :data-source="classes" :loading="loading" row-key="id">
        <template #bodyCell="{ column }">
          <template v-if="column.key === 'action'">
            <a-space><a-button type="link" size="small">{{ $t('view') }}</a-button><a-button type="link" size="small">{{ $t('edit') }}</a-button></a-space>
          </template>
        </template>
      </a-table>
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
  { title: t('class_name'), dataIndex: 'name', key: 'name' },
  { title: t('student_count'), dataIndex: 'studentCount', key: 'studentCount' },
  { title: t('start_date_3'), dataIndex: 'startDate', key: 'startDate' },
  { title: t('status'), dataIndex: 'status', key: 'status' },
  { title: t('operation'), key: 'action' }
]
const classes = ref([
  { id: 1, name: 'Java 就业班 01 期', studentCount: 18, startDate: '2025-09-01', status: t('in_progress') },
  { id: 2, name: 'Java 就业班 02 期', studentCount: 15, startDate: '2025-11-01', status: t('in_progress') },
  { id: 3, name: t('frontend_employment_class_cohort_01'), studentCount: 12, startDate: '2025-10-15', status: t('in_progress') }
])
</script>

<template>
  <div class="students-page">
    <OsgPageContainer title="学员管理">
      <a-table :columns="columns" :data-source="students" :loading="loading" row-key="id" />
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
  { title: t('name'), dataIndex: 'name', key: 'name' },
  { title: t('class'), dataIndex: 'className', key: 'className' },
  { title: t('mentor'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('completed_class_hours'), dataIndex: 'hours', key: 'hours' },
  { title: t('learning_status'), dataIndex: 'status', key: 'status' }
]
const students = ref([
  { id: 1, name: t('student_zhang'), className: 'Java 就业班 01 期', mentor: t('mentor_wang'), hours: 24, status: t('active_3') },
  { id: 2, name: t('student_li'), className: 'Java 就业班 01 期', mentor: t('mentor_zhang'), hours: 18, status: t('active_3') }
])
</script>

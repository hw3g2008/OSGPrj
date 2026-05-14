<template>
  <div class="mentors-page">
    <OsgPageContainer title="导师管理">
      <a-table :columns="columns" :data-source="mentors" :loading="loading" row-key="id" />
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
  { title: t('expertise_2'), dataIndex: 'specialty', key: 'specialty' },
  { title: t('students_under_mentorship'), dataIndex: 'studentCount', key: 'studentCount' },
  { title: t('this_months_sessions'), dataIndex: 'monthHours', key: 'monthHours' },
  { title: t('score'), dataIndex: 'rating', key: 'rating' }
]
const mentors = ref([
  { id: 1, name: t('mentor_wang'), specialty: 'Java/Spring', studentCount: 6, monthHours: 48, rating: 4.8 },
  { id: 2, name: t('mentor_zhang'), specialty: 'Java/微服务', studentCount: 5, monthHours: 42, rating: 4.9 }
])
</script>

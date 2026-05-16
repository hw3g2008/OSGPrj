<template>
  <div class="students-page">
    <OsgPageContainer :title="t('leadMentor.students.k1')">
      <a-table :columns="columns" :data-source="students" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'
const loading = ref(false)

const { t } = useI18n()
const columns = [
  { title: t('leadMentor.students.k2'), dataIndex: 'name', key: 'name' },
  { title: t('leadMentor.students.k3'), dataIndex: 'className', key: 'className' },
  { title: t('leadMentor.students.k4'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('leadMentor.students.k5'), dataIndex: 'hours', key: 'hours' },
  { title: t('leadMentor.students.k6'), dataIndex: 'status', key: 'status' }
]
const students = ref([
  { id: 1, name: t('leadMentor.students.k7'), className: t('leadMentor.students.k8'), mentor: t('leadMentor.students.k9'), hours: 24, status: t('leadMentor.students.k10') },
  { id: 2, name: t('leadMentor.students.k11'), className: t('leadMentor.students.k8'), mentor: t('leadMentor.students.k12'), hours: 18, status: t('leadMentor.students.k10') }
])
</script>

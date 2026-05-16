<template>
  <div class="mentors-page">
    <OsgPageContainer :title="t('leadMentor.mentors.k1')">
      <a-table :columns="columns" :data-source="mentors" :loading="loading" row-key="id" />
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
  { title: t('leadMentor.mentors.k2'), dataIndex: 'name', key: 'name' },
  { title: t('leadMentor.mentors.k3'), dataIndex: 'specialty', key: 'specialty' },
  { title: t('leadMentor.mentors.k4'), dataIndex: 'studentCount', key: 'studentCount' },
  { title: t('leadMentor.mentors.k5'), dataIndex: 'monthHours', key: 'monthHours' },
  { title: t('leadMentor.mentors.k6'), dataIndex: 'rating', key: 'rating' }
]
const mentors = ref([
  { id: 1, name: t('leadMentor.mentors.k7'), specialty: 'Java/Spring', studentCount: 6, monthHours: 48, rating: 4.8 },
  { id: 2, name: t('leadMentor.mentors.k8'), specialty: t('leadMentor.mentors.k9'), studentCount: 5, monthHours: 42, rating: 4.9 }
])
</script>

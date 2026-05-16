<template>
  <div class="classes-page">
    <OsgPageContainer :title="t('leadMentor.classes.pageTitle')">
      <a-table :columns="columns" :data-source="classes" :loading="loading" row-key="id">
        <template #bodyCell="{ column }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small">{{ t('leadMentor.classes.actions.view') }}</a-button>
              <a-button type="link" size="small">{{ t('leadMentor.classes.actions.edit') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const loading = ref(false)
const columns = computed(() => [
  { title: t('leadMentor.classes.col.name'), dataIndex: 'name', key: 'name' },
  { title: t('leadMentor.classes.col.studentCount'), dataIndex: 'studentCount', key: 'studentCount' },
  { title: t('leadMentor.classes.col.startDate'), dataIndex: 'startDate', key: 'startDate' },
  { title: t('leadMentor.classes.col.status'), dataIndex: 'status', key: 'status' },
  { title: t('leadMentor.classes.col.actions'), key: 'action' }
])
const classes = computed(() => [
  { id: 1, name: t('leadMentor.dashboard.mock.classJava1'), studentCount: 18, startDate: '2025-09-01', status: t('leadMentor.classes.status.inProgress') },
  { id: 2, name: t('leadMentor.dashboard.mock.classJava2'), studentCount: 15, startDate: '2025-11-01', status: t('leadMentor.classes.status.inProgress') },
  { id: 3, name: t('leadMentor.dashboard.mock.classFrontend1'), studentCount: 12, startDate: '2025-10-15', status: t('leadMentor.classes.status.inProgress') }
])
</script>

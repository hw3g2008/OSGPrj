<template>
  <div class="feedback-page">
    <OsgPageContainer :title="t('assistant.feedback.title')">
      <a-table :columns="columns" :data-source="feedbacks" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'pending' ? 'orange' : 'green'">{{ record.status === 'pending' ? t('assistant.feedback.k11') : t('assistant.feedback.k12') }}</a-tag>
          </template>
        </template>
      </a-table>
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
  { title: t('assistant.feedback.k1'), dataIndex: 'student', key: 'student' },
  { title: t('assistant.feedback.k2'), dataIndex: 'type', key: 'type' },
  { title: t('assistant.feedback.k3'), dataIndex: 'content', key: 'content' },
  { title: t('assistant.feedback.k4'), key: 'status' }
]
const feedbacks = ref([
  { id: 1, student: t('assistant.feedback.k5'), type: t('assistant.feedback.k6'), content: t('assistant.feedback.k7'), status: 'pending' },
  { id: 2, student: t('assistant.feedback.k8'), type: t('assistant.feedback.k9'), content: t('assistant.feedback.k10'), status: 'done' }
])
</script>

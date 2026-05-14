<template>
  <div class="feedback-page">
    <OsgPageContainer title="反馈收集">
      <a-table :columns="columns" :data-source="feedbacks" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'pending' ? 'orange' : 'green'">{{ record.status === 'pending' ? $t('pending') : $t('processed') }}</a-tag>
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
  { title: t('student'), dataIndex: 'student', key: 'student' },
  { title: t('type'), dataIndex: 'type', key: 'type' },
  { title: t('content'), dataIndex: 'content', key: 'content' },
  { title: t('status'), key: 'status' }
]
const feedbacks = ref([
  { id: 1, student: t('student_zhang'), type: t('course_feedback'), content: t('hope_to_add_more_hands_on_projects'), status: 'pending' },
  { id: 2, student: t('student_li'), type: t('mentor_feedback'), content: t('teacher_wang_explains_very_clearly'), status: 'done' }
])
</script>

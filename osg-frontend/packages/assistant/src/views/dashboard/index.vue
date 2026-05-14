<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6"><a-card><a-statistic title="待处理排课" :value="stats.pendingSchedule" suffix="个" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="今日咨询" :value="stats.todayConsult" suffix="次" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="待整理资料" :value="stats.pendingMaterials" suffix="份" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="待收集反馈" :value="stats.pendingFeedback" suffix="条" /></a-card></a-col>
    </a-row>
    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="今日任务">
          <a-list :data-source="tasks" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-checkbox>{{ item.content }}</a-checkbox>
                <template #actions><a-tag :color="item.color">{{ item.priority }}</a-tag></template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="快捷入口">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="$router.push('/schedule')">{{ $t('scheduling_assistance') }}</a-button>
            <a-button block @click="$router.push('/students')">{{ $t('student_services') }}</a-button>
            <a-button block @click="$router.push('/feedback')">{{ $t('feedback_collection') }}</a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const stats = ref({ pendingSchedule: 5, todayConsult: 12, pendingMaterials: 3, pendingFeedback: 8 })
const tasks = ref([
  { content: t('help_zhang_book_a_class'), priority: '高', color: 'red' },
  { content: t('organize_this_weeks_study_materials'), priority: '中', color: 'orange' },
  { content: t('collect_feedback_from_cohort_01_students'), priority: '中', color: 'orange' },
  { content: t('update_interview_question_bank'), priority: '低', color: 'blue' }
])
</script>

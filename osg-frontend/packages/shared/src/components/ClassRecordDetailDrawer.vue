<template>
  <a-drawer
    :open="visible"
    :title="t('common.shared.classRecordDrawer.title')"
    width="640"
    placement="right"
    :body-style="{ padding: '16px' }"
    @close="$emit('update:visible', false)"
  >
    <a-spin :spinning="loading">
      <div v-if="!groups || groups.length === 0" style="text-align:center;color:#999;padding:40px 0;">
        {{ t('common.shared.classRecordDrawer.empty') }}
      </div>
      <div v-for="group in groups" :key="group.mentorId" class="crd-mentor-group">
        <div class="crd-mentor-header">
          <span class="crd-mentor-name">{{ group.mentorName }}</span>
          <span class="crd-mentor-stats">
            {{ t('common.shared.classRecordDrawer.totalHours', { hours: group.totalHours }) }}
            <template v-if="group.avgRating">· {{ t('common.shared.classRecordDrawer.avgRating', { rating: group.avgRating }) }}</template>
          </span>
        </div>
        <a-table
          :data-source="sortedRecords(group.records)"
          :columns="recordColumns"
          :row-key="(r: LeadMentorClassRecordDetailItem) => r.recordId"
          size="small"
          :pagination="false"
          class="crd-records-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'classDate'">
              {{ formatDateOnly(record.classDate) }}
            </template>
            <template v-else-if="column.key === 'courseType'">
              {{ courseTypeLabel(record.courseType) }}
            </template>
            <template v-else-if="column.key === 'memberStatus'">
              <a-tag :color="record.memberStatus === 'absent' ? 'red' : 'green'">
                {{ record.memberStatus === 'absent' ? t('common.shared.classRecordDrawer.absent') : t('common.shared.classRecordDrawer.present') }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'rate'">
              {{ record.rate || '-' }}
            </template>
            <template v-else-if="column.key === 'feedbackSummary'">
              <span :title="resolveFeedbackSummary(record)">{{ resolveFeedbackSummary(record) || '-' }}</span>
            </template>
          </template>
        </a-table>
      </div>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LeadMentorClassRecordDetailItem, LeadMentorClassRecordMentorGroup } from '../api/jobOverview'

defineProps<{
  visible: boolean
  applicationId: number | null
  groups: LeadMentorClassRecordMentorGroup[]
  loading: boolean
}>()

defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

const recordColumns = computed(() => [
  { title: t('common.shared.classRecordDrawer.col.classDate'), dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: t('common.shared.classRecordDrawer.col.courseType'), dataIndex: 'courseType', key: 'courseType', width: 100 },
  { title: t('common.shared.classRecordDrawer.col.status'), dataIndex: 'memberStatus', key: 'memberStatus', width: 70 },
  { title: t('common.shared.classRecordDrawer.col.durationHours'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('common.shared.classRecordDrawer.col.rate'), dataIndex: 'rate', key: 'rate', width: 70 },
  { title: t('common.shared.classRecordDrawer.col.feedbackSummary'), dataIndex: 'feedbackSummary', key: 'feedbackSummary', width: 160 },
])

function sortedRecords(records: LeadMentorClassRecordDetailItem[]) {
  return [...records].sort((a, b) => {
    if (!a.classDate) return 1
    if (!b.classDate) return -1
    return b.classDate.localeCompare(a.classDate)
  })
}

/**
 * 课消 ISO 日期 → 'YYYY-MM-DD' 展示
 */
function formatDateOnly(value?: string): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

// 课程类型字典 value → i18n key（运行时 t() 译）
const COURSE_TYPE_I18N_KEY: Record<string, string> = {
  job_coaching: 'common.shared.classRecordDrawer.courseType.jobCoaching',
  mock_interview: 'common.shared.classRecordDrawer.courseType.mockInterview',
  relation_test: 'common.shared.classRecordDrawer.courseType.relation',
  communication_test: 'common.shared.classRecordDrawer.courseType.relation',
  midterm: 'common.shared.classRecordDrawer.courseType.midterm',
  midterm_test: 'common.shared.classRecordDrawer.courseType.midterm',
  base_course: 'common.shared.classRecordDrawer.courseType.baseCourse',
}

function courseTypeLabel(value?: string): string {
  if (!value) return '-'
  const key = COURSE_TYPE_I18N_KEY[value]
  return key ? t(key) : value
}

/**
 * 反馈摘要兜底：若后端没生成 feedbackSummary，按已知 feedbackContent JSON shape
 * 抽 highlights / narrative / improvements 前 60 字。
 */
function resolveFeedbackSummary(record: LeadMentorClassRecordDetailItem & { feedbackContent?: string | object }): string {
  if (record.feedbackSummary) return record.feedbackSummary
  const raw = (record as any).feedbackContent
  if (!raw) return ''
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const text = parsed?.highlights || parsed?.narrative || parsed?.improvements || parsed?.nextSteps || ''
    return typeof text === 'string' ? text.slice(0, 120) : ''
  } catch {
    return ''
  }
}
</script>

<style scoped>
.crd-mentor-group {
  margin-bottom: 24px;
}
.crd-mentor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
}
.crd-mentor-name {
  font-weight: 600;
  font-size: 14px;
}
.crd-mentor-stats {
  color: #666;
  font-size: 13px;
}
</style>

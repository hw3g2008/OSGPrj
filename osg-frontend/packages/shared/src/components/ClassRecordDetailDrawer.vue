<template>
  <a-drawer
    :open="visible"
    title="课消记录详情"
    width="640"
    placement="right"
    :body-style="{ padding: '16px' }"
    @close="$emit('update:visible', false)"
  >
    <a-spin :spinning="loading">
      <div v-if="!groups || groups.length === 0" style="text-align:center;color:#999;padding:40px 0;">
        暂无课消记录
      </div>
      <div v-for="group in groups" :key="group.mentorId" class="crd-mentor-group">
        <div class="crd-mentor-header">
          <span class="crd-mentor-name">{{ group.mentorName }}</span>
          <span class="crd-mentor-stats">
            共 {{ group.totalHours }}h
            <template v-if="group.avgRating">· 平均 {{ group.avgRating }}</template>
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
                {{ record.memberStatus === 'absent' ? '旷课' : '出席' }}
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

const recordColumns = [
  { title: '上课日期', dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType', width: 100 },
  { title: '状态', dataIndex: 'memberStatus', key: 'memberStatus', width: 70 },
  { title: '时长(h)', dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: '评分', dataIndex: 'rate', key: 'rate', width: 70 },
  { title: '反馈摘要', dataIndex: 'feedbackSummary', key: 'feedbackSummary', width: 160 },
]

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

// 课程类型字典 value → 中文 label
const COURSE_TYPE_LABEL_MAP: Record<string, string> = {
  job_coaching: '岗位辅导',
  mock_interview: '面试测试',
  relation_test: '人际关系',
  communication_test: '人际关系',
  midterm: '期中考试',
  midterm_test: '期中考试',
  base_course: '基础课程',
}

function courseTypeLabel(value?: string): string {
  if (!value) return '-'
  return COURSE_TYPE_LABEL_MAP[value] || value
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

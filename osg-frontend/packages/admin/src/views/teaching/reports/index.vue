<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('class_hours_review')" title-en="Reports" :description="$t('review_class_hour_records_submitted_by_m')">
      <template #actions>
        <a-button @click="handleExportPlaceholder">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <!-- 超时提醒横幅 -->
    <a-alert v-if="summary.overtimeMentors.length" type="error" show-icon banner style="border-radius: 12px">
      <template #message>
        <strong>{{ $t('overtime_alert_the_following_mentors_hav') }}</strong>
      </template>
      <template #description>
        <div style="display: flex; align-items: center; gap: 12px">
          <span>{{ overtimeMentorSummary }}</span>
          <a-button size="small" danger @click="scrollToOvertime">{{ $t('view_details') }}</a-button>
        </div>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <!-- 筛选条件 -->
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="`${$t('search_mentor_student_2')}...`" allow-clear style="width: 180px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.courseType" :placeholder="$t('course_type')" allow-clear style="width: 130px">
            <a-select-option v-for="option in courseTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.courseSource" :placeholder="$t('course_source')" allow-clear style="width: 130px">
            <a-select-option v-for="option in courseSourceOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filters.dateStart" :placeholder="$t('start_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filters.dateEnd" :placeholder="$t('end_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            {{ $t('search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <!-- Tab 切换 -->
      <a-tabs v-model:activeKey="activeTab" @change="(key: string) => switchTab(key)">
        <a-tab-pane v-for="tab in reportTabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge v-if="tab.key === 'pending' && summary.pendingCount" :count="summary.pendingCount" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- 批量操作栏 -->
      <a-space v-if="activeTab === 'pending'" style="margin-bottom: 12px">
        <a-button type="primary" size="small" :disabled="!selectedRowKeys.length" @click="handleBatchApprove">
          <template #icon><CheckOutlined /></template>
          {{ $t('batch_approve') }}
        </a-button>
        <a-button danger size="small" :disabled="!selectedRowKeys.length" @click="handleBatchReject">
          <template #icon><CloseOutlined /></template>
          {{ $t('batch_reject') }}
        </a-button>
        <span style="color: #64748b; font-size: 13px">{{ $t('selected_records_count', { count: selectedRowKeys.length }) }}</span>
      </a-space>

      <!-- 课时审核表格 -->
      <a-table
        :columns="reportColumns"
        :data-source="rows"
        :row-key="(record: ReportRow) => record.recordId"
        :row-selection="activeTab === 'pending' ? { selectedRowKeys, onChange: onSelectChange, getCheckboxProps: (record: ReportRow) => ({ disabled: record.status !== 'pending' }) } : undefined"
        :pagination="false"
        :loading="loading"
        :locale="{ emptyText: $t('no_class_hours_review_records_under_curr') }"
        :scroll="{ x: 1200 }"
        :row-class-name="(record: ReportRow) => rowClassName(record)"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'mentorName'">
            <div>
              <strong>{{ record.mentorName }}</strong>
              <div v-if="record.weeklyHours && record.weeklyHours > 6" style="color: #dc2626; font-size: 11px">⚠ {{ $t('this_week') }}{{ record.weeklyHours }}h</div>
              <div v-else-if="record.pendingDays && record.pendingDays > 30" style="color: #be185d; font-size: 11px">⏰ {{ $t('over_30_days') }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div>
              {{ record.studentName }}
              <div style="color: #64748b; font-size: 12px">{{ record.studentId }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'courseType'">
            <a-tag :color="toneToColor(courseTypeTone(record.courseType))">{{ formatCourseType(record.courseType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'courseSource'">
            <a-tag :color="toneToColor(courseSourceTone(record.courseSource))">{{ formatCourseSource(record.courseSource) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'classDate'">
            <span :style="record.pendingDays && record.pendingDays > 30 ? 'color: #be185d; font-weight: 600' : ''">{{ formatDate(record.classDate) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'durationHours'">
            {{ formatHours(record.durationHours) }}
          </template>
          <template v-else-if="column.dataIndex === 'weeklyHours'">
            <span :style="weeklyHoursStyle(record)">{{ record.weeklyHours ? `${record.weeklyHours}h` : '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="toneToColor(statusTone(record.status))">{{ formatStatus(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4">
              <template v-if="record.status === 'pending'">
                <a-button type="link" size="small" style="color: #22c55e" @click="handleQuickApprove(record)">{{ $t('approve') }}</a-button>
                <a-button type="link" size="small" danger @click="openReviewDetail(record)">{{ $t('reject_2') }}</a-button>
              </template>
              <a-button type="link" size="small" @click="openReviewDetail(record)">{{ $t('details') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <ReviewDetailModal
      :visible="reviewDetailVisible"
      :detail="currentDetail"
      :submitting="submitting"
      @update:visible="handleReviewModalVisibleChange"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CheckOutlined, CloseOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import ReviewDetailModal from './components/ReviewDetailModal.vue'
import {
  approveReport,
  batchApproveReport,
  batchRejectReport,
  getReportDetail,
  getReportList,
  rejectReport,
  type ReportRow,
  type ReportSummary
} from '@osg/shared/api/admin/report'
import {
  courseSourceMeta,
  courseTypeMeta,
  reportTabs,
  statusMeta
} from './columns'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const reportColumns = [
  { title: 'ID', dataIndex: 'recordId', key: 'recordId', width: 70 },
  { title: t('mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 130 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('course_type'), dataIndex: 'courseType', key: 'courseType', width: 120 },
  { title: t('source'), dataIndex: 'courseSource', key: 'courseSource', width: 100 },
  { title: t('date'), dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: t('duration'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('this_week_total'), dataIndex: 'weeklyHours', key: 'weeklyHours', width: 90 },
  { title: t('status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]

type TabKey = 'all' | 'pending' | 'approved' | 'rejected'

const defaultSummary: ReportSummary = {
  allCount: 0,
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  selectedTab: 'all',
  overtimeMentors: []
}

const filters = reactive({
  keyword: '',
  courseType: undefined as string | undefined,
  courseSource: undefined as string | undefined,
  dateStart: '',
  dateEnd: ''
})

const activeTab = ref<TabKey>('all')
const loading = ref(false)
const submitting = ref(false)
const rows = ref<ReportRow[]>([])
const summary = ref<ReportSummary>(defaultSummary)
const selectedRowKeys = ref<number[]>([])
const reviewDetailVisible = ref(false)
const currentDetail = ref<ReportRow | null>(null)

const courseTypeOptions = Object.entries(courseTypeMeta).map(([value, meta]) => ({ value, label: meta.label }))
const courseSourceOptions = Object.entries(courseSourceMeta).map(([value, meta]) => ({ value, label: meta.label }))

const onSelectChange = (keys: number[]) => {
  selectedRowKeys.value = keys
}

const overtimeMentorSummary = computed(() => summary.value.overtimeMentors
  .map((item) => `${item.mentorName} (${item.weeklyHours}h)`)
  .join(' \u00B7 '))

const handleSearch = async () => {
  await loadReports()
}

const switchTab = async (tab: string) => {
  activeTab.value = tab as TabKey
  selectedRowKeys.value = []
  await loadReports()
}

const loadReports = async () => {
  loading.value = true
  try {
    const response = await getReportList({
      keyword: filters.keyword,
      courseType: filters.courseType,
      courseSource: filters.courseSource,
      tab: activeTab.value
    })
    rows.value = response.rows || []
    summary.value = response.summary || defaultSummary
  } finally {
    loading.value = false
  }
}

const openReviewDetail = async (row: ReportRow) => {
  reviewDetailVisible.value = true
  currentDetail.value = row
  const detail = await getReportDetail(row.recordId)
  currentDetail.value = detail
}

const handleReviewModalVisibleChange = (visible: boolean) => {
  reviewDetailVisible.value = visible
  if (!visible) {
    currentDetail.value = null
  }
}

const handleApprove = async (payload: { remark?: string }) => {
  if (!currentDetail.value) return
  submitting.value = true
  try {
    await approveReport(currentDetail.value.recordId, payload)
    message.success(t('class_hours_review_approved'))
    reviewDetailVisible.value = false
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const handleReject = async (payload: { remark?: string }) => {
  if (!currentDetail.value) return
  submitting.value = true
  try {
    await rejectReport(currentDetail.value.recordId, payload)
    message.success(t('class_hours_review_rejected'))
    reviewDetailVisible.value = false
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const handleQuickApprove = async (row: ReportRow) => {
  submitting.value = true
  try {
    await approveReport(row.recordId, {})
    message.success(t('class_hours_review_approved'))
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const handleBatchApprove = async () => {
  if (!selectedRowKeys.value.length) return
  submitting.value = true
  try {
    await batchApproveReport({ recordIds: selectedRowKeys.value, remark: t('batch_approve') })
    message.success(t('batch_approval_completed'))
    selectedRowKeys.value = []
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const handleBatchReject = async () => {
  if (!selectedRowKeys.value.length) return
  submitting.value = true
  try {
    await batchRejectReport({ recordIds: selectedRowKeys.value, remark: t('batch_reject') })
    message.success(t('batch_rejection_completed'))
    selectedRowKeys.value = []
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const rowClassName = (row: ReportRow) => {
  if (row.overtimeFlag) return 'row-overtime'
  if (row.overdueFlag) return 'row-overdue'
  if (row.status === 'pending') return 'row-pending'
  return ''
}

const formatCourseType = (value: string) => courseTypeMeta[value]?.label || value
const formatCourseSource = (value: string) => courseSourceMeta[value]?.label || value
const formatStatus = (value: string) => statusMeta[value]?.label || value
const courseTypeTone = (value: string) => courseTypeMeta[value]?.tone || 'info'
const courseSourceTone = (value: string) => courseSourceMeta[value]?.tone || 'info'
const statusTone = (value: string) => statusMeta[value]?.tone || 'info'
const formatHours = (value?: number | null) => (value === undefined || value === null ? '-' : `${value}h`)
const formatDate = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 10) : '-')

const weeklyHoursStyle = (row: ReportRow) => {
  if (row.weeklyHours && row.weeklyHours >= 8) return 'color: #dc2626; font-weight: 600'
  if (row.weeklyHours && row.weeklyHours >= 6) return 'color: #d97706; font-weight: 600'
  return ''
}

const toneToColor = (tone: string): string => {
  const map: Record<string, string> = {
    info: 'blue', success: 'green', purple: 'purple', sky: 'cyan',
    warning: 'orange', amber: 'orange', danger: 'red'
  }
  return map[tone] || 'blue'
}

const handleExportPlaceholder = () => {
  message.info(t('export_feature_will_be_available_in_a_fu'))
}

const scrollToOvertime = () => {
  const row = document.querySelector('.row-overtime')
  row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

onMounted(async () => {
  await loadReports()
})
</script>

<style scoped>
:deep(.row-overtime) { background: #fee2e2; }
:deep(.row-pending) { background: #fef3c7; }
:deep(.row-overdue) { background: linear-gradient(90deg, #fdf2f8, #fce7f3); box-shadow: inset 4px 0 0 #ec4899; }
</style>


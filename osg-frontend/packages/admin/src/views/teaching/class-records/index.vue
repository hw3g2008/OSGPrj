<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('course_records')" title-en="Class Records" :description="$t('view_all_students_course_records_and_rev')">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ exporting ? $t('exporting') + '...' : $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="info" show-icon style="border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: none">
      <template #message><strong>{{ $t('course_record_process') }}</strong></template>
      <template #description>
        <a-space wrap>
          <a-tag class="flow-tag--purple">① {{ $t('student_applies_for_position_mock_interv') }}</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">② {{ $t('class_advisor_assigns_mentor') }}</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">③ {{ $t('mentor_conducts_class_and_submits_record') }}</a-tag>
          <span>→</span>
          <a-tag color="orange">④ {{ $t('backend_review') }}</a-tag>
          <span>→</span>
          <a-tag color="green">⑤ {{ $t('settlement_center_transfer') }}</a-tag>
        </a-space>
      </template>
    </a-alert>

    <div style="display: flex; gap: 12px;">
      <div v-for="card in statCards" :key="card.label" style="flex: 1; min-width: 0;">
        <a-card :bordered="false" :body-style="{ padding: '16px', textAlign: 'center' }" style="box-shadow: var(--card-shadow)">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ color: card.color, fontWeight: 700 }" />
        </a-card>
      </div>
    </div>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="`${$t('search_student_submitter')}...`" allow-clear style="width: 180px" :data-field-name="$t('search')" @pressEnter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCoachingType" :placeholder="$t('coaching_type')" allow-clear style="width: 130px" :data-field-name="$t('coaching_type')">
            <a-select-option value="position_coaching">{{ $t('position_coaching') }}</a-select-option>
            <a-select-option value="mock_application">{{ $t('mock_application') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCourseContent" :placeholder="$t('course_content')" allow-clear style="width: 140px" :data-field-name="$t('course_content')">
            <a-select-option value="new_resume">{{ $t('new_resume') }}</a-select-option>
            <a-select-option value="resume_update">{{ $t('resume_update') }}</a-select-option>
            <a-select-option value="case_prep">Case{{ $t('preparation') }}</a-select-option>
            <a-select-option value="mock_interview">{{ $t('mock_interview') }}</a-select-option>
            <a-select-option value="communication_midterm">{{ $t('networking_midterm_exam') }}</a-select-option>
            <a-select-option value="midterm_exam">{{ $t('mock_midterm_exam') }}</a-select-option>
            <a-select-option value="other">{{ $t('other') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterReporterRole" :placeholder="$t('submitter_role')" allow-clear style="width: 130px" :data-field-name="$t('submitter_role')">
            <a-select-option value="mentor">{{ $t('mentor') }}</a-select-option>
            <a-select-option value="headteacher">{{ $t('head_teacher') }}</a-select-option>
            <a-select-option value="assistant">{{ $t('teaching_assistant') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('course_date')">
          <a-space>
            <a-date-picker v-model:value="filterDateStart" :placeholder="$t('start_date_2')" value-format="YYYY-MM-DD" style="width: 140px" :data-field-name="$t('course_start_date')" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" :placeholder="$t('end_date_2')" value-format="YYYY-MM-DD" style="width: 140px" :data-field-name="$t('course_end_date')" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ $t('search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-tabs v-model:activeKey="activeTab" @change="(key: string) => switchTab(key)">
        <a-tab-pane v-for="tab in tabList" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge v-if="tab.badge" :count="tab.badge" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-table
        :columns="recordColumns"
        :data-source="rows"
        :row-key="(record: ClassRecordRow) => record.recordId"
        :pagination="tablePagination"
        :loading="loading"
        :row-class-name="(record: ClassRecordRow) => record.status === 'pending' ? 'row-pending' : ''"
        :locale="{ emptyText: $t('no_course_records') }"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'recordId'">
            {{ record.recordCode || `#R${record.recordId}` }}
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.studentName }}</strong>
              <span style="font-size: 12px; color: #64748b">ID: {{ record.studentId }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            <div style="display: flex; flex-direction: column; gap: 2px">
              <strong>{{ record.mentorName }}</strong>
              <span style="font-size: 12px; color: #64748b">{{ record.reporterRole }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'coachingType'">
            <a-tag :color="record.coachingType === $t('mock_application') ? 'green' : 'blue'">{{ record.coachingType }}</a-tag>
            <div v-if="record.coachingCompany" style="font-size: 12px; color: #64748b; margin-top: 2px">{{ record.coachingCompany }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'courseContent'">
            <a-tag :color="contentTagColor(record.courseContentKey)">{{ record.courseContent }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'classDate'">{{ formatDate(record.classDate) }}</template>
          <template v-else-if="column.dataIndex === 'durationHours'">{{ formatHours(record.durationHours) }}</template>
          <template v-else-if="column.dataIndex === 'courseFee'">{{ formatFee(record.courseFee) }}</template>
          <template v-else-if="column.dataIndex === 'studentRating'">
            <a-tag v-if="record.studentRating" color="green">⭐ {{ record.studentRating }}</a-tag>
            <span v-else style="color: #64748b">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusTagColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space>
              <a-button v-if="record.status === 'pending'" type="primary" size="small" data-surface-trigger="modal-class-record-review" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordReview(record)">{{ $t('course_review') }}</a-button>
              <a-button v-if="record.status !== 'pending'" type="link" size="small" data-surface-trigger="modal-class-record-detail" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordDetail(record)">{{ $t('details') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <ClassRecordReviewModal
      v-model:visible="reviewVisible"
      :detail="selectedRecord"
      :loading="recordDetailLoading"
      :submitting="reviewSubmitting"
      @approve="handleReviewApprove"
      @reject="handleReviewReject"
    />

    <ClassRecordDetailModal
      v-model:visible="detailVisible"
      :detail="selectedRecord"
      :loading="recordDetailLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { usePagination } from '@osg/shared'
import {
  exportClassRecords,
  getClassRecordList,
  getClassRecordStats,
  type ClassRecordRow,
  type ClassRecordStats
} from '@osg/shared/api/admin/classRecord'
import { approveReport, getReportDetail, rejectReport, type ReportRow } from '@osg/shared/api/admin/report'
import ClassRecordDetailModal from './components/ClassRecordDetailModal.vue'
import ClassRecordReviewModal from './components/ClassRecordReviewModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const recordColumns = [
  { title: 'Record ID', dataIndex: 'recordId', key: 'recordId', width: 90 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('submitter'), dataIndex: 'mentorName', key: 'mentorName', width: 120 },
  { title: t('coaching_content'), dataIndex: 'coachingType', key: 'coachingType', width: 130 },
  { title: t('course_content'), dataIndex: 'courseContent', key: 'courseContent', width: 120 },
  { title: t('course_date'), dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: t('duration'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('session_fee'), dataIndex: 'courseFee', key: 'courseFee', width: 90 },
  { title: t('student_feedback'), dataIndex: 'studentRating', key: 'studentRating', width: 90 },
  { title: t('review_status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]

const keyword = ref('')
const filterCoachingType = ref<string | undefined>(undefined)
const filterCourseContent = ref<string | undefined>(undefined)
const filterReporterRole = ref<string | undefined>(undefined)
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref('all')
const stats = ref<ClassRecordStats | null>(null)
const exporting = ref(false)

const toFilters = () => ({
  keyword: keyword.value || undefined,
  courseType: filterCoachingType.value || undefined,
  classStatus: filterCourseContent.value || undefined,
  courseSource: filterReporterRole.value || undefined,
  tab: activeTab.value,
  classDateStart: filterDateStart.value || undefined,
  classDateEnd: filterDateEnd.value || undefined
})

const {
  rows,
  loading,
  tablePagination,
  search: searchList,
  reload: reloadList,
  handleTableChange
} = usePagination<ClassRecordRow, ReturnType<typeof toFilters>>(
  (params) => getClassRecordList(params)
)
const reviewVisible = ref(false)
const detailVisible = ref(false)
const reviewSubmitting = ref(false)
const recordDetailLoading = ref(false)
const selectedRecord = ref<ReportRow | null>(null)

const statCards = computed(() => {
  const current = stats.value
  if (!current) return []
  return [
    { label: t('total_records'), value: String(current.totalCount), color: '#3b82f6' },
    { label: t('pending_review'), value: String(current.pendingCount), color: '#f59e0b' },
    { label: t('approved'), value: String(current.approvedCount), color: '#22c55e' },
    { label: t('rejected_3'), value: String(current.rejectedCount), color: '#ef4444' },
    { label: t('pending_settlement_amount'), value: formatFee(current.pendingSettlementAmount), color: '#3b82f6' }
  ]
})

const tabList = computed(() => [
  { key: 'all', label: t('all'), badge: null, badgeTone: '' },
  { key: 'pending', label: t('pending_review'), badge: stats.value?.pendingCount || null, badgeTone: 'warning' },
  { key: 'approved', label: t('approved'), badge: null, badgeTone: '' },
  { key: 'rejected', label: t('rejected_3'), badge: null, badgeTone: '' }
])

const loadStats = async () => {
  try {
    stats.value = await getClassRecordStats(toFilters())
  } catch (_error) {
    // 不阻塞列表加载
  }
}

const loadData = async () => {
  try {
    await Promise.all([searchList(toFilters()), loadStats()])
  } catch (_error) {
    message.error(t('failed_to_load_course_records'))
  }
}

const refreshAfterMutation = async () => {
  try {
    await Promise.all([reloadList(), loadStats()])
  } catch (_error) {
    /* ignore */
  }
}

const loadRecordDetail = async (recordId: number) => {
  recordDetailLoading.value = true
  selectedRecord.value = null
  try {
    const response = await getReportDetail(recordId)
    selectedRecord.value = response
  } catch (_error) {
    message.error(t('failed_to_load_course_record_details'))
  } finally {
    recordDetailLoading.value = false
  }
}

const openRecordReview = async (row: ClassRecordRow) => {
  detailVisible.value = false
  reviewVisible.value = true
  await loadRecordDetail(row.recordId)
}

const openRecordDetail = async (row: ClassRecordRow) => {
  reviewVisible.value = false
  detailVisible.value = true
  await loadRecordDetail(row.recordId)
}

const handleReviewApprove = async (payload: { remark?: string }) => {
  if (!selectedRecord.value) {
    return
  }

  reviewSubmitting.value = true
  try {
    await approveReport(selectedRecord.value.recordId, payload)
    message.success(t('class_hours_review_approved'))
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error(t('failed_to_approve_class_hours_review'))
  } finally {
    reviewSubmitting.value = false
  }
}

const handleReviewReject = async (payload: { remark?: string }) => {
  if (!selectedRecord.value) {
    return
  }

  reviewSubmitting.value = true
  try {
    await rejectReport(selectedRecord.value.recordId, payload)
    message.success(t('class_hours_review_rejected'))
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error(t('failed_to_reject_class_hours_review'))
  } finally {
    reviewSubmitting.value = false
  }
}

const switchTab = (tab: string) => {
  activeTab.value = tab
  void loadData()
}

const handleExport = async () => {
  try {
    exporting.value = true
    await exportClassRecords(toFilters())
    message.success(t('course_records_exported_successfully'))
  } catch (_error) {
    message.error(t('failed_to_export_course_records'))
  } finally {
    exporting.value = false
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

const formatHours = (value?: number | null) => {
  return value == null ? '--' : `${value}h`
}

const formatFee = (value?: string | number | null) => {
  if (!value) return '\u00A50'
  const amount = Number(value)
  if (Number.isNaN(amount)) return `\u00A5${value}`
  return `\u00A5${amount.toLocaleString('en-US')}`
}

const statusLabel = (status: string) => {
  if (status === 'approved') return t('approved')
  if (status === 'rejected') return t('rejected_3')
  return t('pending_review')
}

const statusTagColor = (status: string) => {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'red'
  return 'orange'
}

const contentTagColor = (key?: string) => {
  const map: Record<string, string> = {
    new_resume: 'blue',
    resume_update: 'blue',
    case_prep: 'cyan',
    mock_interview: 'green',
    communication_midterm: 'purple',
    midterm_exam: 'orange',
    behavioral: 'cyan'
  }
  return map[key || ''] || 'blue'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
:deep(.row-pending) {
  background: #fef3c7;
}

.flow-tag--purple {
  color: #7c3aed !important;
  background: #f5f3ff !important;
  border-color: #ddd6fe !important;
}
</style>


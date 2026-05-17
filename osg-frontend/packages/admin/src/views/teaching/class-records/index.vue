<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.teaching.classRecords.pageTitle')" title-en="Session Records">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ exporting ? t('admin.teaching.classRecords.exporting') : t('admin.teaching.classRecords.export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="info" show-icon style="border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); border: none">
      <template #message><strong>{{ t('admin.teaching.classRecords.alert.message') }}</strong></template>
      <template #description>
        <a-space wrap>
          <a-tag class="flow-tag--purple">{{ t('admin.teaching.classRecords.alert.step1') }}</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">{{ t('admin.teaching.classRecords.alert.step2') }}</a-tag>
          <span>→</span>
          <a-tag class="flow-tag--purple">{{ t('admin.teaching.classRecords.alert.step3') }}</a-tag>
          <span>→</span>
          <a-tag color="orange">{{ t('admin.teaching.classRecords.alert.step4') }}</a-tag>
          <span>→</span>
          <a-tag color="green">{{ t('admin.teaching.classRecords.alert.step5') }}</a-tag>
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
          <a-input v-model:value="keyword" :placeholder="t('admin.teaching.classRecords.filter.searchPlaceholder')" allow-clear style="width: 180px" @pressEnter="loadData" data-field-name="搜索"/>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCoachingType" :placeholder="t('admin.teaching.classRecords.filter.coachingTypePlaceholder')" allow-clear style="width: 130px" data-field-name="辅导类型">
            <a-select-option value="position_coaching">{{ t('admin.teaching.classRecords.filter.coachingTypes.position') }}</a-select-option>
            <a-select-option value="mock_application">{{ t('admin.teaching.classRecords.filter.coachingTypes.mock') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterCourseContent" :placeholder="t('admin.teaching.classRecords.filter.courseContentPlaceholder')" allow-clear style="width: 140px" data-field-name="课程内容">
            <a-select-option value="new_resume">{{ t('admin.teaching.classRecords.filter.courseContents.new_resume') }}</a-select-option>
            <a-select-option value="resume_update">{{ t('admin.teaching.classRecords.filter.courseContents.resume_update') }}</a-select-option>
            <a-select-option value="case_prep">{{ t('admin.teaching.classRecords.filter.courseContents.case_prep') }}</a-select-option>
            <a-select-option value="mock_interview">{{ t('admin.teaching.classRecords.filter.courseContents.mock_interview') }}</a-select-option>
            <a-select-option value="communication_midterm">{{ t('admin.teaching.classRecords.filter.courseContents.communication_midterm') }}</a-select-option>
            <a-select-option value="midterm_exam">{{ t('admin.teaching.classRecords.filter.courseContents.midterm_exam') }}</a-select-option>
            <a-select-option value="other">{{ t('admin.teaching.classRecords.filter.courseContents.other') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterReporterRole" :placeholder="t('admin.teaching.classRecords.filter.reporterRolePlaceholder')" allow-clear style="width: 130px" data-field-name="申报人角色">
            <a-select-option value="mentor">{{ t('admin.teaching.classRecords.filter.sources.mentor') }}</a-select-option>
            <a-select-option value="headteacher">{{ t('admin.teaching.classRecords.filter.sources.headteacher') }}</a-select-option>
            <a-select-option value="assistant">{{ t('admin.teaching.classRecords.filter.sources.assistant') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('admin.teaching.classRecords.filter.dateLabel')">
          <a-space>
            <a-date-picker v-model:value="filterDateStart" :placeholder="t('admin.teaching.classRecords.filter.dateStart')" value-format="YYYY-MM-DD" style="width: 140px" data-field-name="上课日期开始"/>
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" :placeholder="t('admin.teaching.classRecords.filter.dateEnd')" value-format="YYYY-MM-DD" style="width: 140px" data-field-name="上课日期结束"/>
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.teaching.classRecords.filter.search') }}
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
        :locale="{ emptyText: t('admin.teaching.classRecords.empty') }"
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
            <a-tag :color="record.coachingType === t('admin.teaching.classRecords.courseTypes.mock') ? 'green' : 'blue'">{{ record.coachingType }}</a-tag>
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
              <a-button v-if="record.status === 'pending'" type="primary" size="small" data-surface-trigger="modal-class-record-review" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordReview(record)">{{ t('admin.teaching.classRecords.action.review') }}</a-button>
              <a-button v-if="record.status !== 'pending'" type="link" size="small" data-surface-trigger="modal-class-record-detail" :data-surface-sample-key="`record-${record.recordId}`" @click="openRecordDetail(record)">{{ t('admin.teaching.classRecords.action.detail') }}</a-button>
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
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

const recordColumns = computed(() => [
  { title: t('admin.teaching.classRecords.columns.recordId'), dataIndex: 'recordId', key: 'recordId', width: 90, fixed: 'left' as const },
  { title: t('admin.teaching.classRecords.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('admin.teaching.classRecords.columns.reporter'), dataIndex: 'mentorName', key: 'mentorName', width: 120 },
  { title: t('admin.teaching.classRecords.columns.coachingType'), dataIndex: 'coachingType', key: 'coachingType', width: 130 },
  { title: t('admin.teaching.classRecords.columns.courseContent'), dataIndex: 'courseContent', key: 'courseContent', width: 120 },
  { title: t('admin.teaching.classRecords.columns.classDate'), dataIndex: 'classDate', key: 'classDate', width: 110 },
  { title: t('admin.teaching.classRecords.columns.duration'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('admin.teaching.classRecords.columns.fee'), dataIndex: 'courseFee', key: 'courseFee', width: 100 },
  { title: t('admin.teaching.classRecords.columns.studentRating'), dataIndex: 'studentRating', key: 'studentRating', width: 90 },
  { title: t('admin.teaching.classRecords.columns.status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('admin.teaching.classRecords.columns.action'), dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
])

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
    { label: t('admin.teaching.classRecords.statCards.total'), value: String(current.totalCount), color: '#3b82f6' },
    { label: t('admin.teaching.classRecords.statCards.pending'), value: String(current.pendingCount), color: '#f59e0b' },
    { label: t('admin.teaching.classRecords.statCards.approved'), value: String(current.approvedCount), color: '#22c55e' },
    { label: t('admin.teaching.classRecords.statCards.rejected'), value: String(current.rejectedCount), color: '#ef4444' },
    { label: t('admin.teaching.classRecords.statCards.pendingSettlement'), value: formatFee(current.pendingSettlementAmount), color: '#3b82f6' }
  ]
})

const tabList = computed(() => [
  { key: 'all', label: t('admin.teaching.classRecords.tabs.all'), badge: null },
  { key: 'pending', label: t('admin.teaching.classRecords.tabs.pending'), badge: stats.value?.pendingCount || null },
  { key: 'approved', label: t('admin.teaching.classRecords.tabs.approved'), badge: null },
  { key: 'rejected', label: t('admin.teaching.classRecords.tabs.rejected'), badge: null }
])

const loadStats = async () => {
  try {
    stats.value = await getClassRecordStats(toFilters())
  } catch (_error) {
    // silent
  }
}

const loadData = async () => {
  try {
    await Promise.all([searchList(toFilters()), loadStats()])
  } catch (_error) {
    message.error(t('admin.teaching.classRecords.messages.loadError'))
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
    message.error(t('admin.teaching.classRecords.messages.detailError'))
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
    message.success(t('admin.teaching.classRecords.messages.approveSuccess'))
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error(t('admin.teaching.classRecords.messages.approveFail'))
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
    message.success(t('admin.teaching.classRecords.messages.rejectSuccess'))
    reviewVisible.value = false
    await refreshAfterMutation()
  } catch (_error) {
    message.error(t('admin.teaching.classRecords.messages.rejectFail'))
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
    message.success(t('admin.teaching.classRecords.messages.exportSuccess'))
  } catch (_error) {
    message.error(t('admin.teaching.classRecords.messages.exportFail'))
  } finally {
    exporting.value = false
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const date = new Date(s)
  if (Number.isNaN(date.getTime())) return s
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatHours = (value?: number | null) => {
  return value == null ? '--' : `${value}h`
}

const formatFee = (value?: string | number | null) => {
  if (!value) return '¥0'
  const amount = Number(value)
  if (Number.isNaN(amount)) return `¥${value}`
  return `¥${amount.toLocaleString('en-US')}`
}

const statusLabel = (status: string) => {
  if (status === 'approved') return t('admin.teaching.classRecords.status.approved')
  if (status === 'rejected') return t('admin.teaching.classRecords.status.rejected')
  return t('admin.teaching.classRecords.status.pending')
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

<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">课时审核</h1>
        <p class="page-subtitle">审核导师提交的课时记录，所有课程记录自动同步</p>
      </div>
      <button type="button" class="btn-outline" @click="handleExportPlaceholder">
        <span class="mdi mdi-export" aria-hidden="true" /> 导出
      </button>
    </div>

    <!-- 超时提醒横幅 -->
    <section v-if="summary.overtimeMentors.length" class="reports-alert">
      <span class="mdi mdi-alert-circle reports-alert__icon-glyph" aria-hidden="true" />
      <div class="reports-alert__content">
        <div class="reports-alert__title">
          <span class="mdi mdi-clock-alert" aria-hidden="true" />
          超时提醒：以下导师本周上课时间超过6小时
        </div>
        <div class="reports-alert__names">{{ overtimeMentorSummary }}</div>
      </div>
      <button type="button" class="btn-outline btn-outline--danger" @click="scrollToOvertime">查看详情</button>
    </section>

    <!-- 筛选条件 -->
    <div class="filter-row">
      <input v-model="filters.keyword" type="text" class="filter-input" placeholder="搜索导师/学员..." @keyup.enter="handleSearch">
      <select v-model="filters.courseType" class="filter-select">
        <option value="">课程类型</option>
        <option v-for="option in courseTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <select v-model="filters.courseSource" class="filter-select">
        <option value="">课程来源</option>
        <option v-for="option in courseSourceOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <input v-model="filters.dateStart" type="date" class="filter-input filter-input--date">
      <span class="filter-date-sep">~</span>
      <input v-model="filters.dateEnd" type="date" class="filter-input filter-input--date">
      <button type="button" class="btn-outline" @click="handleSearch">
        <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
      </button>
    </div>

    <!-- Tab 切换 -->
    <div class="reports-tabs">
      <button
        v-for="tab in reportTabs"
        :key="tab.key"
        type="button"
        :class="['reports-tab', { 'reports-tab--active': activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >{{ tab.label }}
        <span v-if="tab.key === 'pending' && summary.pendingCount" class="reports-tab__badge reports-tab__badge--danger">{{ summary.pendingCount }}</span>
      </button>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="activeTab === 'pending'" class="batch-bar">
      <button type="button" class="btn-sm btn-success" :disabled="!selectedRowKeys.length" @click="handleBatchApprove">
        <span class="mdi mdi-check-all" aria-hidden="true" /> 批量通过
      </button>
      <button type="button" class="btn-sm btn-danger" :disabled="!selectedRowKeys.length" @click="handleBatchReject">
        <span class="mdi mdi-close" aria-hidden="true" /> 批量驳回
      </button>
      <span class="batch-bar__count">已选择 <strong>{{ selectedRowKeys.length }}</strong> 条</span>
    </div>

    <!-- 课时审核表格 -->
    <div class="table-card">
      <div v-if="loading" class="reports-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true" />
        <span>正在加载课时审核数据...</span>
      </div>
      <div v-else class="table-wrap">
        <table class="reports-table">
          <thead>
            <tr>
              <th style="width:40px">
                <input
                  v-if="activeTab === 'pending'"
                  :checked="allPendingSelected"
                  type="checkbox"
                  @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                >
              </th>
              <th>ID</th>
              <th>导师</th>
              <th>学员</th>
              <th>课程类型</th>
              <th>来源</th>
              <th>日期</th>
              <th>时长</th>
              <th>本周累计</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.recordId"
              :class="rowClassNames(row)"
            >
              <td>
                <input
                  v-if="row.status === 'pending'"
                  :checked="selectedRowKeys.includes(row.recordId)"
                  type="checkbox"
                  @change="toggleSelect(row.recordId, ($event.target as HTMLInputElement).checked)"
                >
              </td>
              <td>{{ row.recordId }}</td>
              <td>
                <div class="person-cell">
                  <strong>{{ row.mentorName }}</strong>
                  <span v-if="row.weeklyHours && row.weeklyHours > 6" class="person-cell__warning">
                    <span class="mdi mdi-alert" aria-hidden="true" /> 本周{{ row.weeklyHours }}h
                  </span>
                  <span v-else-if="row.pendingDays && row.pendingDays > 30" class="person-cell__overdue">
                    <span class="mdi mdi-clock-alert" aria-hidden="true" /> 超过30天
                  </span>
                </div>
              </td>
              <td>
                <div class="person-cell">
                  {{ row.studentName }}
                  <span class="person-cell__sub">{{ row.studentId }}</span>
                </div>
              </td>
              <td>
                <span :class="['type-tag', `type-tag--${courseTypeTone(row.courseType)}`]">
                  {{ formatCourseType(row.courseType) }}
                </span>
              </td>
              <td>
                <span :class="['source-tag', `source-tag--${courseSourceTone(row.courseSource)}`]">
                  {{ formatCourseSource(row.courseSource) }}
                </span>
              </td>
              <td :class="{ 'date-overdue': row.pendingDays && row.pendingDays > 30 }">{{ formatDate(row.classDate) }}</td>
              <td>{{ formatHours(row.durationHours) }}</td>
              <td :class="weeklyHoursClass(row)">{{ row.weeklyHours ? `${row.weeklyHours}h` : '-' }}</td>
              <td>
                <span :class="['status-tag', `status-tag--${statusTone(row.status)}`]">
                  {{ formatStatus(row.status) }}
                </span>
              </td>
              <td>
                <div class="action-cell">
                  <template v-if="row.status === 'pending'">
                    <button type="button" class="action-btn action-btn--success" title="通过" @click="handleQuickApprove(row)">
                      <span class="mdi mdi-check" aria-hidden="true" />
                    </button>
                    <button type="button" class="action-btn action-btn--danger" title="驳回" @click="openReviewDetail(row)">
                      <span class="mdi mdi-close" aria-hidden="true" />
                    </button>
                  </template>
                  <button type="button" class="action-btn" @click="openReviewDetail(row)">详情</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="11" class="reports-empty">当前筛选条件下暂无课时审核记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
  courseType: '',
  courseSource: '',
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

const allPendingSelected = computed(() => rows.value.filter((row) => row.status === 'pending').length > 0
  && rows.value.filter((row) => row.status === 'pending').every((row) => selectedRowKeys.value.includes(row.recordId)))

const overtimeMentorSummary = computed(() => summary.value.overtimeMentors
  .map((item) => `${item.mentorName} (${item.weeklyHours}h)`)
  .join(' \u00B7 '))

const handleSearch = async () => {
  await loadReports()
}

const handleReset = async () => {
  filters.keyword = ''
  filters.courseType = ''
  filters.courseSource = ''
  filters.dateStart = ''
  filters.dateEnd = ''
  activeTab.value = 'all'
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
    message.success('课时审核已通过')
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
    message.success('课时审核已驳回')
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
    message.success('课时审核已通过')
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const handleBatchApprove = async () => {
  if (!selectedRowKeys.value.length) return
  submitting.value = true
  try {
    await batchApproveReport({ recordIds: selectedRowKeys.value, remark: '批量通过' })
    message.success('批量通过完成')
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
    await batchRejectReport({ recordIds: selectedRowKeys.value, remark: '批量驳回' })
    message.success('批量驳回完成')
    selectedRowKeys.value = []
    await loadReports()
  } finally {
    submitting.value = false
  }
}

const toggleSelect = (recordId: number, checked: boolean) => {
  if (checked) {
    selectedRowKeys.value = Array.from(new Set([...selectedRowKeys.value, recordId]))
    return
  }
  selectedRowKeys.value = selectedRowKeys.value.filter((item) => item !== recordId)
}

const toggleSelectAll = (checked: boolean) => {
  const pendingIds = rows.value.filter((row) => row.status === 'pending').map((row) => row.recordId)
  selectedRowKeys.value = checked ? pendingIds : []
}

const rowClassNames = (row: ReportRow) => ({
  'report-row': true,
  'report-row--overtime': !!row.overtimeFlag,
  'report-row--pending': row.status === 'pending' && !row.overtimeFlag && !row.overdueFlag,
  'report-row--overdue': !!row.overdueFlag
})

const formatCourseType = (value: string) => courseTypeMeta[value]?.label || value
const formatCourseSource = (value: string) => courseSourceMeta[value]?.label || value
const formatStatus = (value: string) => statusMeta[value]?.label || value
const courseTypeTone = (value: string) => courseTypeMeta[value]?.tone || 'info'
const courseSourceTone = (value: string) => courseSourceMeta[value]?.tone || 'info'
const statusTone = (value: string) => statusMeta[value]?.tone || 'info'
const formatHours = (value?: number | null) => (value === undefined || value === null ? '-' : `${value}h`)
const formatDate = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 10) : '-')

const weeklyHoursClass = (row: ReportRow) => {
  if (row.weeklyHours && row.weeklyHours >= 8) return 'weekly-hours--danger'
  if (row.weeklyHours && row.weeklyHours >= 6) return 'weekly-hours--warning'
  return ''
}

const handleExportPlaceholder = () => {
  message.info('导出功能将在后续版本中接入')
}

const scrollToOvertime = () => {
  const row = document.querySelector('.report-row--overtime')
  row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

onMounted(async () => {
  await loadReports()
})
</script>

<style scoped lang="scss">
.reports-page {
  display: grid;
  gap: 16px;
}

/* --- Header --- */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: var(--text-primary, #1e293b);
  font-size: 24px;
  font-weight: 700;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary, #64748b);
  font-size: 14px;
}

/* --- Buttons --- */
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #1e293b);
  font-weight: 500;
  cursor: pointer;
}

.btn-outline--danger {
  border-color: #dc2626;
  color: #dc2626;
}

.btn-sm {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-success {
  background: var(--success, #22c55e);
}

.btn-danger {
  background: var(--danger, #ef4444);
}

.btn-sm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* --- Alert banner --- */
.reports-alert {
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  gap: 16px;
  align-items: center;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
}

.reports-alert__icon-glyph {
  font-size: 32px;
  color: #dc2626;
}

.reports-alert__content {
  flex: 1;
}

.reports-alert__title {
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reports-alert__names {
  font-size: 13px;
  color: #b91c1c;
}

/* --- Filter row --- */
.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-input {
  width: 180px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
}

.filter-input--date {
  width: 130px;
}

.filter-select {
  width: 140px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  background: var(--card-bg, #ffffff);
}

.filter-date-sep {
  color: var(--text-secondary, #64748b);
  line-height: 36px;
}

/* --- Tabs --- */
.reports-tabs {
  display: flex;
  gap: 0;
}

.reports-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  background: transparent;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  font-weight: 500;
}

.reports-tab--active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.reports-tab__badge {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.reports-tab__badge--danger {
  background: #fee2e2;
  color: #b91c1c;
}

/* --- Batch bar --- */
.batch-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.batch-bar__count {
  color: var(--text-secondary, #64748b);
  font-size: 13px;
  margin-left: 8px;
}

/* --- Table card --- */
.table-card {
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
}

.reports-table th,
.reports-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-align: left;
  font-size: 14px;
  color: var(--text-primary, #1e293b);
}

.reports-table th {
  background: var(--table-header-bg, #f8fafc);
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

/* --- Row states --- */
.report-row--overtime { background: #fee2e2; }
.report-row--pending { background: #fef3c7; }
.report-row--overdue { background: linear-gradient(90deg, #fdf2f8, #fce7f3); box-shadow: inset 4px 0 0 #ec4899; }

/* --- Person cell --- */
.person-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.person-cell__warning { color: #dc2626; font-size: 11px; }
.person-cell__overdue { color: #be185d; font-size: 11px; }
.person-cell__sub { color: var(--text-secondary, #64748b); font-size: 12px; }

/* --- Tags --- */
.type-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--info { background: #dbeafe; color: #1d4ed8; }
.type-tag--success { background: #dcfce7; color: #166534; }
.type-tag--purple { background: #ede9fe; color: #6d28d9; }
.type-tag--sky { background: #e0f2fe; color: #0369a1; }
.type-tag--warning { background: #fef3c7; color: #92400e; }

.source-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.source-tag--info { background: #dbeafe; color: #1d4ed8; }
.source-tag--amber { background: #fef3c7; color: #92400e; }

.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--warning { background: #fef3c7; color: #92400e; }
.status-tag--success { background: #dcfce7; color: #166534; }
.status-tag--danger { background: #fee2e2; color: #b91c1c; }

/* --- Date overdue --- */
.date-overdue { color: #be185d; font-weight: 600; }

/* --- Weekly hours --- */
.weekly-hours--danger { color: #dc2626; font-weight: 600; }
.weekly-hours--warning { color: #d97706; font-weight: 600; }

/* --- Action cell --- */
.action-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  border: none;
  background: none;
  padding: 4px 8px;
  color: var(--primary, #3b82f6);
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}

.action-btn--success { color: var(--success, #22c55e); }
.action-btn--danger { color: var(--danger, #ef4444); }

/* --- Loading / Empty --- */
.reports-loading,
.reports-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary, #64748b);
}
</style>

<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          课时审核
          <span class="page-title-en">Class Hour Review</span>
        </h2>
        <p class="page-subtitle">审核导师提交的课时记录，支持单条与批量处理，确保课时数据准确同步。</p>
      </div>
      <div class="reports-page__header-actions">
        <span class="reports-page__summary">{{ summary.pendingCount }} 条待审核 · {{ summary.allCount }} 条全部记录</span>
        <button type="button" class="permission-button permission-button--outline" @click="handleExportPlaceholder">导出</button>
      </div>
    </div>

    <section v-if="summary.overtimeMentors.length" class="reports-alert">
      <div class="reports-alert__icon">
        <span class="mdi mdi-alert-circle" aria-hidden="true"></span>
      </div>
      <div class="reports-alert__content">
        <strong>超时提醒：以下导师本周上课时间超过6小时</strong>
        <span>{{ overtimeMentorSummary }}</span>
      </div>
      <button type="button" class="permission-button permission-button--outline" @click="scrollToOvertime">
        查看详情
      </button>
    </section>

    <section class="permission-card reports-panel">
      <div class="reports-filters">
        <label class="reports-field reports-field--search">
          <span>导师/学员</span>
          <input v-model="filters.keyword" type="text" class="reports-input" placeholder="搜索导师或学员" />
        </label>
        <label class="reports-field">
          <span>课程类型</span>
          <select v-model="filters.courseType" class="reports-select">
            <option value="">全部</option>
            <option v-for="option in courseTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="reports-field">
          <span>课程来源</span>
          <select v-model="filters.courseSource" class="reports-select">
            <option value="">全部</option>
            <option v-for="option in courseSourceOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <div class="reports-filters__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">搜索</button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">重置</button>
        </div>
      </div>
    </section>

    <section class="permission-card reports-panel">
      <div class="reports-tabs">
        <button
          v-for="tab in reportTabs"
          :key="tab.key"
          type="button"
          :class="['reports-tabs__button', { 'reports-tabs__button--active': activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tabCount(tab.key) }}</strong>
        </button>
      </div>

      <div v-if="activeTab === 'pending'" class="reports-batch-bar">
        <div class="reports-batch-bar__copy">
          <strong>已选择 {{ selectedRowKeys.length }} 条</strong>
          <span>支持批量通过 / 批量驳回</span>
        </div>
        <div class="reports-batch-bar__actions">
          <button type="button" class="permission-button permission-button--outline" :disabled="!selectedRowKeys.length" @click="handleBatchApprove">
            批量通过
          </button>
          <button type="button" class="permission-button permission-button--ghost-danger" :disabled="!selectedRowKeys.length" @click="handleBatchReject">
            批量驳回
          </button>
        </div>
      </div>

      <div v-if="loading" class="reports-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载课时审核数据...</span>
      </div>

      <table v-else class="permission-table reports-table">
        <thead>
          <tr>
            <th class="reports-table__checkbox">
              <input
                v-if="activeTab === 'pending'"
                :checked="allPendingSelected"
                type="checkbox"
                @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
              />
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
            <td class="reports-table__checkbox">
              <input
                v-if="row.status === 'pending'"
                :checked="selectedRowKeys.includes(row.recordId)"
                type="checkbox"
                @change="toggleSelect(row.recordId, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td>#{{ row.recordId }}</td>
            <td>
              <div class="reports-person">
                <strong>{{ row.mentorName }}</strong>
                <span v-if="row.weeklyHours && row.weeklyHours > 6" class="reports-person__warning">本周 {{ row.weeklyHours }}h</span>
                <span v-else-if="row.pendingDays && row.pendingDays > 30" class="reports-person__overdue">超过30天</span>
              </div>
            </td>
            <td>
              <div class="reports-person">
                <strong>{{ row.studentName }}</strong>
                <span>ID {{ row.studentId }}</span>
              </div>
            </td>
            <td>
              <span :class="['reports-tag', `reports-tag--${courseTypeTone(row.courseType)}`]">
                {{ formatCourseType(row.courseType) }}
              </span>
            </td>
            <td>
              <span :class="['reports-tag', `reports-tag--${courseSourceTone(row.courseSource)}`]">
                {{ formatCourseSource(row.courseSource) }}
              </span>
            </td>
            <td>{{ formatDate(row.classDate) }}</td>
            <td>{{ formatHours(row.durationHours) }}</td>
            <td>{{ formatHours(row.weeklyHours) }}</td>
            <td>
              <span :class="['reports-tag', `reports-tag--${statusTone(row.status)}`]">
                {{ formatStatus(row.status) }}
              </span>
            </td>
            <td>
              <div class="reports-actions">
                <button type="button" class="reports-link-button" @click="openReviewDetail(row)">详情</button>
                <button v-if="row.status === 'pending'" type="button" class="reports-link-button reports-link-button--success" @click="openReviewDetail(row)">
                  通过
                </button>
                <button v-if="row.status === 'pending'" type="button" class="reports-link-button reports-link-button--danger" @click="openReviewDetail(row)">
                  驳回
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="11" class="reports-empty">当前筛选条件下暂无课时审核记录</td>
          </tr>
        </tbody>
      </table>
    </section>

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
  courseSource: ''
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
  .join(' · '))

const handleSearch = async () => {
  await loadReports()
}

const handleReset = async () => {
  filters.keyword = ''
  filters.courseType = ''
  filters.courseSource = ''
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
  'report-row--pending': row.status === 'pending',
  'report-row--overtime': !!row.overtimeFlag,
  'report-row--overdue': !!row.overdueFlag
})

const tabCount = (key: string) => {
  if (key === 'pending') return summary.value.pendingCount
  if (key === 'approved') return summary.value.approvedCount
  if (key === 'rejected') return summary.value.rejectedCount
  return summary.value.allCount
}

const formatCourseType = (value: string) => courseTypeMeta[value]?.label || value
const formatCourseSource = (value: string) => courseSourceMeta[value]?.label || value
const formatStatus = (value: string) => statusMeta[value]?.label || value
const courseTypeTone = (value: string) => courseTypeMeta[value]?.tone || 'info'
const courseSourceTone = (value: string) => courseSourceMeta[value]?.tone || 'info'
const statusTone = (value: string) => statusMeta[value]?.tone || 'info'
const formatHours = (value?: number | null) => (value === undefined || value === null ? '—' : `${value}h`)
const formatDate = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 10) : '—')

const handleExportPlaceholder = () => {
  message.info('导出功能将在后续票面中接入')
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
.reports-page__header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.reports-page__summary {
  color: #64748b;
  font-size: 14px;
}

.reports-alert {
  margin-bottom: 20px;
  padding: 18px 20px;
  border-radius: 18px;
  display: flex;
  gap: 14px;
  align-items: center;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
}

.reports-alert__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
  font-size: 24px;
}

.reports-alert__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #7f1d1d;
}

.reports-panel {
  margin-bottom: 20px;
}

.reports-filters {
  display: grid;
  grid-template-columns: 1.3fr repeat(2, minmax(0, 1fr)) auto;
  gap: 14px;
  align-items: end;
}

.reports-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.reports-field--search {
  min-width: 0;
}

.reports-input,
.reports-select {
  width: 100%;
  min-height: 42px;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
  font: inherit;
}

.reports-filters__actions {
  display: flex;
  gap: 10px;
}

.reports-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.reports-tabs__button {
  min-width: 116px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid #dbe3ee;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.reports-tabs__button--active {
  border-color: #f59e0b;
  background: #fff7ed;
  color: #b45309;
}

.reports-batch-bar {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.82), rgba(255, 247, 237, 0.94));
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.reports-batch-bar__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #92400e;
}

.reports-batch-bar__actions {
  display: flex;
  gap: 10px;
}

.reports-loading,
.reports-empty {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
}

.reports-table__checkbox {
  width: 44px;
}

.reports-person {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reports-person__warning {
  color: #dc2626;
  font-size: 12px;
}

.reports-person__overdue {
  color: #be185d;
  font-size: 12px;
}

.reports-tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.reports-tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.reports-tag--success {
  background: #dcfce7;
  color: #166534;
}

.reports-tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.reports-tag--purple {
  background: #ede9fe;
  color: #6d28d9;
}

.reports-tag--sky {
  background: #e0f2fe;
  color: #0369a1;
}

.reports-tag--amber {
  background: #fef3c7;
  color: #92400e;
}

.reports-tag--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.reports-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reports-link-button {
  border: none;
  background: none;
  padding: 0;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.reports-link-button--success {
  color: #059669;
}

.reports-link-button--danger {
  color: #dc2626;
}

.report-row--pending {
  background: #fffbeb;
}

.report-row--overtime {
  background: #fee2e2;
}

.report-row--overdue {
  background: linear-gradient(90deg, #fdf2f8, #fce7f3);
  box-shadow: inset 4px 0 0 #ec4899;
}
</style>

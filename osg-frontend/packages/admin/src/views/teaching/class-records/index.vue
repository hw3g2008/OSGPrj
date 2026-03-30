<template>
  <section class="class-records-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">课程记录 <span class="page-title-en">Class Records</span></h1>
        <p class="page-subtitle">查看所有学员的课程记录，审核导师/班主任/助教提交的上课记录</p>
      </div>
      <button
        type="button"
        class="btn-outline"
        :disabled="exporting"
        @click="handleExport"
      >
        <span class="mdi mdi-export" aria-hidden="true" /> {{ exporting ? '导出中...' : '导出' }}
      </button>
    </header>

    <!-- 流程说明 -->
    <section class="flow-banner">
      <div class="flow-banner__header">
        <span class="mdi mdi-information" aria-hidden="true" />
        <strong>课程记录流程</strong>
      </div>
      <div class="flow-banner__steps">
        <span class="flow-step">① 学员申请岗位/模拟应聘</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step">② 班主任分配导师</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step">③ 导师上课并申报记录</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step flow-step--warning">④ 后台审核</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step flow-step--success">⑤ 结算中心转账</span>
      </div>
    </section>

    <!-- 统计卡片 -->
    <section class="stats-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-card__value" :class="card.colorClass">{{ card.value }}</div>
        <div class="stat-card__label">{{ card.label }}</div>
      </div>
    </section>

    <!-- 筛选条件 -->
    <div class="filter-row">
      <input v-model.trim="keyword" class="filter-input" type="text" placeholder="搜索学员/申报人..." data-field-name="搜索" data-field-name-alias="课程记录页筛选搜索" @keyup.enter="loadData">
      <select v-model="filterCoachingType" class="filter-select" data-field-name="辅导类型" data-field-name-alias="课程记录页筛选辅导类型">
        <option value="">辅导类型</option>
        <option value="position_coaching">岗位辅导</option>
        <option value="mock_application">模拟应聘</option>
      </select>
      <select v-model="filterCourseContent" class="filter-select" data-field-name="课程内容" data-field-name-alias="课程记录页筛选课程内容">
        <option value="">课程内容</option>
        <option value="new_resume">新简历</option>
        <option value="resume_update">简历更新</option>
        <option value="case_prep">Case准备</option>
        <option value="mock_interview">模拟面试</option>
        <option value="communication_midterm">人际关系期中考试</option>
        <option value="midterm_exam">模拟期中考试</option>
        <option value="other">其他</option>
      </select>
      <select v-model="filterReporterRole" class="filter-select" data-field-name="申报人角色" data-field-name-alias="课程记录页筛选申报人角色">
        <option value="">申报人角色</option>
        <option value="mentor">导师</option>
        <option value="headteacher">班主任</option>
        <option value="assistant">助教</option>
      </select>
      <input v-model="filterDateStart" type="date" class="filter-input filter-input--date" data-field-name="上课日期开始" data-field-name-alias="课程记录页筛选上课日期开始">
      <span class="filter-date-sep">~</span>
      <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date" data-field-name="上课日期结束" data-field-name-alias="课程记录页筛选上课日期结束">
      <button type="button" class="btn-outline" @click="loadData">
        <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
      </button>
    </div>

    <!-- Tab 切换 -->
    <div class="records-tabs">
      <button
        v-for="tab in tabList"
        :key="tab.key"
        type="button"
        class="records-tab"
        :class="{ 'records-tab--active': activeTab === tab.key }"
        :data-tab="tab.key"
        :aria-pressed="activeTab === tab.key"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="records-tab__badge" :class="`records-tab__badge--${tab.badgeTone}`">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- 课程记录表格 -->
    <div class="table-card">
      <div class="table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th>记录ID</th>
              <th>学员</th>
              <th>申报人</th>
              <th>辅导内容</th>
              <th>课程内容</th>
              <th>上课日期</th>
              <th>时长</th>
              <th>课时费</th>
              <th>学员评价</th>
              <th>审核状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.recordId" :class="rowClassName(row.status)">
              <td>{{ row.recordCode || `#R${row.recordId}` }}</td>
              <td>
                <div class="person-cell">
                  <strong>{{ row.studentName }}</strong>
                  <span class="person-cell__sub">ID: {{ row.studentId }}</span>
                </div>
              </td>
              <td>
                <div class="person-cell">
                  <strong>{{ row.mentorName }}</strong>
                  <span class="person-cell__sub">{{ row.reporterRole }}</span>
                </div>
              </td>
              <td>
                <span class="type-tag" :class="row.coachingType === '模拟应聘' ? 'type-tag--success' : 'type-tag--info'">
                  {{ row.coachingType }}
                </span>
                <br><span class="coaching-company">{{ row.coachingCompany || '' }}</span>
              </td>
              <td>
                <span class="content-tag" :class="contentTagClass(row.courseContentKey)">{{ row.courseContent }}</span>
              </td>
              <td>{{ formatDate(row.classDate) }}</td>
              <td>{{ formatHours(row.durationHours) }}</td>
              <td>{{ formatFee(row.courseFee) }}</td>
              <td class="rating-cell">
                <span v-if="row.studentRating" class="rating-tag">{{ '\u2B50' }} {{ row.studentRating }}</span>
                <span v-else class="rating-empty">-</span>
              </td>
              <td>
                <span class="status-tag" :class="statusTagClass(row.status)">{{ statusLabel(row.status) }}</span>
              </td>
              <td>
                <div class="record-actions">
                  <button
                    type="button"
                    class="btn-primary btn-sm"
                    data-surface-trigger="modal-class-record-review"
                    :data-surface-sample-key="`record-${row.recordId}`"
                    @click="openRecordReview(row)"
                  >课程审核</button>
                  <button
                    v-if="row.status !== 'pending'"
                    type="button"
                    class="action-link"
                    data-surface-trigger="modal-class-record-detail"
                    :data-surface-sample-key="`record-${row.recordId}`"
                    @click="openRecordDetail(row)"
                  >详情</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" colspan="11">暂无课程记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
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

const keyword = ref('')
const filterCoachingType = ref('')
const filterCourseContent = ref('')
const filterReporterRole = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref('all')
const rows = ref<ClassRecordRow[]>([])
const stats = ref<ClassRecordStats | null>(null)
const exporting = ref(false)
const reviewVisible = ref(false)
const detailVisible = ref(false)
const reviewSubmitting = ref(false)
const recordDetailLoading = ref(false)
const selectedRecord = ref<ReportRow | null>(null)

const statCards = computed(() => {
  const current = stats.value
  if (!current) return []
  return [
    { label: '总记录数', value: String(current.totalCount), colorClass: 'stat-value--primary' },
    { label: '待审核', value: String(current.pendingCount), colorClass: 'stat-value--amber' },
    { label: '已通过', value: String(current.approvedCount), colorClass: 'stat-value--success' },
    { label: '已驳回', value: String(current.rejectedCount), colorClass: 'stat-value--danger' },
    { label: '待结算金额', value: formatFee(current.pendingSettlementAmount), colorClass: 'stat-value--primary' }
  ]
})

const tabList = computed(() => [
  { key: 'all', label: '全部', badge: null, badgeTone: '' },
  { key: 'pending', label: '待审核', badge: stats.value?.pendingCount || null, badgeTone: 'warning' },
  { key: 'approved', label: '已通过', badge: null, badgeTone: '' },
  { key: 'rejected', label: '已驳回', badge: null, badgeTone: '' }
])

const toFilters = () => ({
  keyword: keyword.value || undefined,
  courseType: filterCoachingType.value || undefined,
  classStatus: filterCourseContent.value || undefined,
  courseSource: filterReporterRole.value || undefined,
  tab: activeTab.value,
  classDateStart: filterDateStart.value || undefined,
  classDateEnd: filterDateEnd.value || undefined
})

const loadData = async () => {
  try {
    const currentFilters = toFilters()
    const [listResponse, statsResponse] = await Promise.all([
      getClassRecordList(currentFilters),
      getClassRecordStats(currentFilters)
    ])

    rows.value = listResponse.rows ?? []
    stats.value = statsResponse
  } catch (_error) {
    message.error('课程记录加载失败')
  }
}

const loadRecordDetail = async (recordId: number) => {
  recordDetailLoading.value = true
  selectedRecord.value = null
  try {
    const response = await getReportDetail(recordId)
    selectedRecord.value = response
  } catch (_error) {
    message.error('课程记录详情加载失败')
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
    message.success('课时审核已通过')
    reviewVisible.value = false
    await loadData()
  } catch (_error) {
    message.error('课时审核通过失败')
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
    message.success('课时审核已驳回')
    reviewVisible.value = false
    await loadData()
  } catch (_error) {
    message.error('课时审核驳回失败')
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
    message.success('课程记录导出成功')
  } catch (_error) {
    message.error('课程记录导出失败')
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
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

const statusTagClass = (status: string) => {
  if (status === 'approved') return 'status-tag--success'
  if (status === 'rejected') return 'status-tag--danger'
  return 'status-tag--warning'
}

const rowClassName = (status: string) => {
  if (status === 'pending') return 'row--pending'
  return ''
}

const contentTagClass = (key?: string) => {
  const map: Record<string, string> = {
    new_resume: 'content-tag--info',
    resume_update: 'content-tag--info',
    case_prep: 'content-tag--blue',
    mock_interview: 'content-tag--success',
    communication_midterm: 'content-tag--purple',
    midterm_exam: 'content-tag--amber',
    behavioral: 'content-tag--blue'
  }
  return map[key || ''] || 'content-tag--info'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.class-records-page {
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

.page-title-en {
  font-size: 14px;
  color: var(--text-secondary, #64748b);
  font-weight: 400;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  background: var(--primary, #3b82f6);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}

.btn-sm { padding: 4px 12px; font-size: 13px; }

.record-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- Flow banner --- */
.flow-banner {
  padding: 16px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
}

.flow-banner__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #4338ca;
  font-weight: 600;
}

.flow-banner__steps {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4338ca;
  flex-wrap: wrap;
}

.flow-step {
  padding: 4px 12px;
  border-radius: 20px;
  background: #fff;
}

.flow-step--warning { background: #fef3c7; color: #92400e; }
.flow-step--success { background: #dcfce7; color: #16a34a; }

.flow-arrow { color: #4338ca; }

/* --- Stats grid --- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  text-align: center;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
}

.stat-value--primary { color: var(--primary, #3b82f6); }
.stat-value--amber { color: #f59e0b; }
.stat-value--success { color: #22c55e; }
.stat-value--danger { color: #ef4444; }

.stat-card__label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  margin-top: 4px;
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

.filter-input--date { width: 130px; }

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
.records-tabs {
  display: flex;
  gap: 0;
}

.records-tab {
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

.records-tab--active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.records-tab__badge {
  margin-left: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.records-tab__badge--warning { background: #fef3c7; color: #92400e; }

/* --- Table card --- */
.table-card {
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  overflow: hidden;
}

.table-wrap { overflow-x: auto; }

.records-table {
  width: 100%;
  border-collapse: collapse;
}

.records-table th,
.records-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-align: left;
  font-size: 14px;
  color: var(--text-primary, #1e293b);
  vertical-align: middle;
}

.records-table th {
  background: var(--table-header-bg, #f8fafc);
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

.row--pending { background: #fef3c7; }

/* --- Person cell --- */
.person-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.person-cell__sub {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

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

.coaching-company { font-size: 12px; color: var(--text-secondary, #64748b); }

.content-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.content-tag--info { background: #dbeafe; color: #1d4ed8; }
.content-tag--blue { background: #dbeafe; color: #1d4ed8; }
.content-tag--success { background: #dcfce7; color: #166534; }
.content-tag--purple { background: #ede9fe; color: #6d28d9; }
.content-tag--amber { background: #f59e0b; color: #fff; }

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

/* --- Rating --- */
.rating-cell { color: #b45309; font-weight: 700; }
.rating-tag { background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.rating-empty { color: var(--text-secondary, #64748b); }

/* --- Action link --- */
.action-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--primary, #3b82f6);
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}

.btn-outline[disabled],
.btn-primary[disabled],
.action-link[disabled] {
  cursor: not-allowed;
  opacity: 0.55;
}

.action-link[disabled] {
  color: #94a3b8;
}

/* --- Empty --- */
.empty-row {
  color: var(--text-secondary, #64748b);
  text-align: center;
}
</style>

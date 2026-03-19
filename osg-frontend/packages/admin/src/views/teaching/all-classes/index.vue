<template>
  <section class="all-classes-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">全部课程</h1>
        <p class="page-subtitle">查看和管理所有课程记录（导师、班主任、助教均可提交）</p>
      </div>
      <button type="button" class="ghost-button" @click="handleExport">
        <span class="mdi mdi-export" aria-hidden="true" /> 导出
      </button>
    </header>

    <!-- 流程说明 -->
    <section class="flow-banner">
      <div class="flow-banner__header">
        <span class="mdi mdi-information" aria-hidden="true" />
        <strong>课程审核与支付流程</strong>
      </div>
      <div class="flow-banner__steps">
        <span class="flow-step">① 导师/班主任/助教提交</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step flow-step--warning">② 待审核</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step flow-step--info">③ 未支付</span>
        <span class="mdi mdi-arrow-right flow-arrow" aria-hidden="true" />
        <span class="flow-step flow-step--success">④ 已支付</span>
      </div>
    </section>

    <!-- Tab 切换 -->
    <div class="classes-tabs" role="tablist" aria-label="课程状态筛选">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="classes-tab"
        :class="{ 'classes-tab--active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span class="classes-tab__badge" :class="`classes-tab__badge--${tab.key}`">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-card">
      <div class="filter-row">
        <input
          v-model.trim="keyword"
          class="filter-input"
          type="text"
          placeholder="搜索学员/导师姓名..."
          @keyup.enter="handleSearch"
        >
        <select v-model="filterCourseType" class="filter-select">
          <option value="">全部课程类型</option>
          <option value="onboarding_interview">入职面试</option>
          <option value="mock_interview">模拟面试</option>
          <option value="written_test">笔试辅导</option>
          <option value="midterm_exam">模拟期中考试</option>
          <option value="communication_midterm">人际关系期中考试</option>
          <option value="qbank_request">题库申请</option>
        </select>
        <select v-model="filterSource" class="filter-select filter-select--narrow">
          <option value="">全部来源</option>
          <option value="mentor">导师端</option>
          <option value="headteacher">班主任端</option>
          <option value="assistant">助教端</option>
        </select>
        <div class="filter-date-range">
          <input v-model="filterDateStart" type="date" class="filter-input filter-input--date">
          <span class="filter-date-sep">至</span>
          <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date">
        </div>
        <button type="button" class="btn-primary" @click="handleSearch">
          <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
        </button>
        <button type="button" class="btn-outline" @click="handleReset">
          <span class="mdi mdi-refresh" aria-hidden="true" /> 重置
        </button>
      </div>
    </div>

    <!-- 课程列表 -->
    <div class="table-card">
      <div class="table-wrap">
        <table class="classes-table">
          <thead>
            <tr>
              <th style="width:80px">课程ID</th>
              <th style="width:120px">学员</th>
              <th style="width:100px">导师</th>
              <th style="width:100px">课程类型</th>
              <th style="width:80px">时长</th>
              <th style="width:100px">日期</th>
              <th style="width:80px">来源</th>
              <th style="width:80px">状态</th>
              <th style="width:70px">评价</th>
              <th style="width:80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.recordId" :class="rowClassName(row.displayStatus)">
              <td class="cell-mono">{{ row.classId || `C${row.recordId}` }}</td>
              <td><strong>{{ row.studentName }}</strong></td>
              <td>{{ row.mentorName }}</td>
              <td>
                <span class="type-tag" :class="courseTypeClass(row.courseType)">{{ row.courseTypeLabel }}</span>
              </td>
              <td>{{ formatHours(row.durationHours) }}</td>
              <td>{{ formatDate(row.classDate) }}</td>
              <td>
                <span class="source-label" :class="sourceClass(row.source)">{{ row.sourceLabel }}</span>
              </td>
              <td>
                <span class="status-tag" :class="`status-tag--${row.displayStatus}`">
                  {{ row.displayStatusLabel }}
                </span>
              </td>
              <td>
                <span v-if="row.rate" class="rating-text">{{ '\u2B50' }}{{ row.rate }}</span>
                <span v-else class="rating-empty">-</span>
              </td>
              <td>
                <button
                  v-if="row.displayStatus === 'pending'"
                  type="button"
                  class="btn-primary btn-sm"
                  @click="openDetail(row.recordId)"
                >审核</button>
                <button
                  v-else
                  type="button"
                  class="btn-outline btn-sm"
                  :class="{ 'btn-outline--danger': row.displayStatus === 'rejected' }"
                  @click="openDetail(row.recordId)"
                >查看</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" colspan="10">当前筛选下暂无课程记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar">
      <span class="pagination-total">共 {{ total }} 条记录</span>
      <div class="pagination-actions">
        <button type="button" class="btn-outline btn-sm" :disabled="currentPage <= 1" @click="goPrevPage">上一页</button>
        <button
          v-for="p in displayPages"
          :key="p"
          type="button"
          class="btn-sm"
          :class="p === currentPage ? 'btn-primary' : 'btn-outline'"
          :disabled="typeof p === 'string'"
          @click="typeof p === 'number' && goPage(p)"
        >{{ p }}</button>
        <button type="button" class="btn-outline btn-sm" :disabled="currentPage >= totalPages" @click="goNextPage">下一页</button>
      </div>
    </div>

    <ClassDetailModal
      :visible="detailVisible"
      :detail="detail"
      @update:visible="detailVisible = $event"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import ClassDetailModal from './components/ClassDetailModal.vue'
import {
  getAllClassesDetail,
  getAllClassesList,
  type AllClassesDetail,
  type AllClassesRow,
  type AllClassesSummary,
  type AllClassesTab
} from '@osg/shared/api/admin/allClasses'

const keyword = ref('')
const filterCourseType = ref('')
const filterSource = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref<AllClassesTab>('all')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const rows = ref<AllClassesRow[]>([])
const detailVisible = ref(false)
const detail = ref<AllClassesDetail | null>(null)

const summary = ref<AllClassesSummary>({
  allCount: 0,
  pendingCount: 0,
  unpaidCount: 0,
  paidCount: 0,
  rejectedCount: 0,
  selectedTab: 'all',
  flowSteps: ['导师/班主任/助教提交', '待审核', '未支付', '已支付']
})

const tabs = computed(() => ([
  { key: 'all' as const, label: '全部', count: summary.value.allCount },
  { key: 'pending' as const, label: '待审核', count: summary.value.pendingCount },
  { key: 'unpaid' as const, label: '未支付', count: summary.value.unpaidCount },
  { key: 'paid' as const, label: '已支付', count: summary.value.paidCount },
  { key: 'rejected' as const, label: '已驳回', count: summary.value.rejectedCount }
]))

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const displayPages = computed(() => {
  const pages: (number | string)[] = []
  const tp = totalPages.value
  if (tp <= 5) {
    for (let i = 1; i <= tp; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage.value > 3) pages.push('...')
    const start = Math.max(2, currentPage.value - 1)
    const end = Math.min(tp - 1, currentPage.value + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage.value < tp - 2) pages.push('...')
    pages.push(tp)
  }
  return pages
})

const loadData = async () => {
  try {
    const response = await getAllClassesList({
      tab: activeTab.value,
      keyword: keyword.value,
      pageNum: currentPage.value,
      pageSize
    })
    rows.value = response.rows ?? []
    summary.value = response.summary
    total.value = response.total ?? 0
  } catch (_error) {
    message.error('全部课程加载失败')
  }
}

const handleSearch = () => {
  currentPage.value = 1
  void loadData()
}

const handleReset = () => {
  keyword.value = ''
  filterCourseType.value = ''
  filterSource.value = ''
  filterDateStart.value = ''
  filterDateEnd.value = ''
  activeTab.value = 'all'
  currentPage.value = 1
  void loadData()
}

const switchTab = (tab: AllClassesTab) => {
  activeTab.value = tab
  currentPage.value = 1
  void loadData()
}

const goPrevPage = () => {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  void loadData()
}

const goNextPage = () => {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  void loadData()
}

const goPage = (p: number) => {
  currentPage.value = p
  void loadData()
}

const openDetail = async (recordId: number) => {
  try {
    detail.value = await getAllClassesDetail(recordId)
    detailVisible.value = true
  } catch (_error) {
    message.error('课程详情加载失败')
  }
}

const handleApprove = () => {
  message.success('已通过审核')
  detailVisible.value = false
  void loadData()
}

const handleReject = () => {
  message.success('已驳回')
  detailVisible.value = false
  void loadData()
}

const handleExport = () => {
  message.info('导出功能将在后续版本中接入')
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

const rowClassName = (displayStatus: string) => {
  const map: Record<string, string> = {
    pending: 'row--pending',
    unpaid: 'row--unpaid',
    rejected: 'row--rejected'
  }
  return map[displayStatus] || ''
}

const courseTypeClass = (courseType?: string) => {
  const map: Record<string, string> = {
    onboarding_interview: 'type-tag--info',
    mock_interview: 'type-tag--success',
    written_test: 'type-tag--purple',
    midterm_exam: 'type-tag--purple',
    communication_midterm: 'type-tag--violet',
    qbank_request: 'type-tag--warning'
  }
  return map[courseType || ''] || 'type-tag--info'
}

const sourceClass = (source?: string) => {
  const map: Record<string, string> = {
    mentor: 'source-label--mentor',
    headteacher: 'source-label--headteacher',
    assistant: 'source-label--assistant'
  }
  return map[source || ''] || ''
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.all-classes-page {
  display: grid;
  gap: 20px;
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
.ghost-button {
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
  padding: 8px 16px;
  background: var(--primary, #3b82f6);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  height: 38px;
}

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
  height: 38px;
}

.btn-outline--danger {
  color: var(--danger, #ef4444);
}

.btn-sm {
  padding: 4px 12px;
  font-size: 13px;
  height: auto;
}

.btn-outline:disabled,
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.flow-step--warning {
  background: #fef3c7;
  color: #92400e;
}

.flow-step--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.flow-step--success {
  background: #dcfce7;
  color: #16a34a;
}

.flow-arrow {
  color: #4338ca;
}

/* --- Tabs --- */
.classes-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 0;
}

.classes-tab {
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

.classes-tab--active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.classes-tab__badge {
  margin-left: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.classes-tab__badge--all {
  background: var(--primary, #3b82f6);
  color: #fff;
}

.classes-tab__badge--pending {
  background: #fef3c7;
  color: #92400e;
}

.classes-tab__badge--unpaid {
  background: #dbeafe;
  color: #1d4ed8;
}

.classes-tab__badge--paid {
  background: #dcfce7;
  color: #166534;
}

.classes-tab__badge--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

/* --- Filter card --- */
.filter-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-input {
  width: 200px;
  height: 38px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
}

.filter-input--date {
  width: 140px;
}

.filter-select {
  width: 140px;
  height: 38px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  background: var(--card-bg, #ffffff);
}

.filter-select--narrow {
  width: 120px;
}

.filter-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-date-sep {
  color: var(--text-secondary, #64748b);
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

.classes-table {
  width: 100%;
  border-collapse: collapse;
}

.classes-table th,
.classes-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-align: left;
  font-size: 14px;
  color: var(--text-primary, #1e293b);
}

.classes-table th {
  background: var(--table-header-bg, #f8fafc);
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

.cell-mono {
  font-family: monospace;
  color: var(--text-secondary, #64748b);
}

/* --- Row backgrounds --- */
.row--pending {
  background: #fffbeb;
}

.row--unpaid {
  background: #eff6ff;
}

.row--rejected {
  background: #fff7ed;
}

/* --- Type tags --- */
.type-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-tag--success {
  background: #dcfce7;
  color: #166534;
}

.type-tag--purple {
  background: #ede9fe;
  color: #6d28d9;
}

.type-tag--violet {
  background: #f3e8ff;
  color: #7c3aed;
}

.type-tag--warning {
  background: #fef3c7;
  color: #92400e;
}

/* --- Source label --- */
.source-label {
  font-size: 12px;
}

.source-label--mentor {
  color: #5a7ba3;
}

.source-label--headteacher {
  color: #059669;
}

.source-label--assistant {
  color: #92400e;
}

/* --- Status tag --- */
.status-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag--pending {
  background: #fef3c7;
  color: #92400e;
}

.status-tag--unpaid {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-tag--paid {
  background: #dcfce7;
  color: #166534;
}

.status-tag--rejected {
  background: #fee2e2;
  color: #b91c1c;
}

/* --- Rating --- */
.rating-text {
  color: #f59e0b;
  font-weight: 600;
}

.rating-empty {
  color: var(--text-secondary, #64748b);
}

/* --- Empty --- */
.empty-row {
  color: var(--text-secondary, #64748b);
  text-align: center;
}

/* --- Pagination --- */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-total {
  color: var(--text-secondary, #64748b);
  font-size: 13px;
}

.pagination-actions {
  display: flex;
  gap: 8px;
}
</style>

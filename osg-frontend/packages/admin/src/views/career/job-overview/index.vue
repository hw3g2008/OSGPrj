<template>
  <div class="job-overview-page job-overview-shell">
    <div class="page-header job-overview-header">
      <div class="job-overview-header__copy">
        <h2 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h2>
        <p class="page-subtitle">查看全部学员的求职进度，管理导师和题库分配</p>
      </div>

      <div class="job-overview-header__actions">
        <span class="job-overview-header__traffic">{{ allRows.length }} 条申请 · {{ unassignedRows.length }} 条待分配 · {{ stats.offerCount }} 条 Offer</span>
        <button type="button" class="job-overview-header__button" :disabled="exporting" @click="handleExport">
          <i class="mdi mdi-export" aria-hidden="true"></i>
          <span>{{ exporting ? '导出中...' : '导出' }}</span>
        </button>
      </div>
    </div>

    <section class="job-overview-summary-grid">
      <article
        v-for="card in statsCards"
        :key="card.key"
        :class="['job-overview-summary-grid__card', `job-overview-summary-grid__card--${card.tone}`]"
      >
        <span class="job-overview-summary-grid__label">{{ card.label }}</span>
        <strong class="job-overview-summary-grid__value">{{ card.value }}</strong>
        <span class="job-overview-summary-grid__meta">{{ card.meta }}</span>
      </article>
    </section>

    <section class="job-overview-analytics">
      <article class="job-overview-funnel-card">
        <header class="job-overview-analytics__head">
          <div>
            <span class="job-overview-analytics__eyebrow">本月转化</span>
            <h3>求职转化漏斗</h3>
          </div>
          <span class="job-overview-analytics__legend">已投递 → 面试中 → 获 Offer</span>
        </header>

        <div class="job-overview-funnel-card__rows">
          <div v-for="item in funnelRows" :key="item.label" class="job-overview-funnel-card__row">
            <div class="job-overview-funnel-card__copy">
              <strong>{{ item.label }}</strong>
              <span>{{ item.count }} 人</span>
            </div>
            <div class="job-overview-funnel-card__track">
              <div class="job-overview-funnel-card__fill" :style="{ width: `${Math.max(item.rate, 6)}%` }"></div>
            </div>
            <span class="job-overview-funnel-card__rate">{{ item.rate }}%</span>
          </div>
          <div v-if="!funnelRows.length" class="job-overview-empty job-overview-empty--analytics">当前暂无漏斗数据</div>
        </div>
      </article>

      <article class="job-overview-hot-card">
        <header class="job-overview-analytics__head">
          <div>
            <span class="job-overview-analytics__eyebrow">热门企业</span>
            <h3>申请热度 Top 5</h3>
          </div>
          <span class="job-overview-analytics__legend">申请数 / Offer 数 / Offer 率</span>
        </header>

        <div class="job-overview-hot-card__list">
          <article v-for="company in hotCompanies" :key="company.companyName" class="job-overview-hot-card__item">
            <div>
              <strong>{{ company.companyName }}</strong>
              <span>{{ company.applicationCount }} 份申请</span>
            </div>
            <div class="job-overview-hot-card__stats">
              <span>{{ company.offerCount }} Offer</span>
              <strong>{{ company.offerRate }}%</strong>
            </div>
          </article>
          <div v-if="!hotCompanies.length" class="job-overview-empty job-overview-empty--analytics">当前暂无热门公司统计</div>
        </div>
      </article>
    </section>

    <section class="job-overview-filterbar">
      <label class="job-overview-filterbar__field" data-field-name="搜索框">
        <span>学员姓名</span>
        <input v-model="filters.studentName" type="text" placeholder="搜索学员" @keydown.enter.prevent="handleSearch" />
      </label>

      <label class="job-overview-filterbar__field" data-field-name="公司">
        <span>公司</span>
        <select v-model="filters.companyName">
          <option value="">全部公司</option>
          <option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label class="job-overview-filterbar__field" data-field-name="状态">
        <span>状态</span>
        <select v-model="filters.currentStage">
          <option value="">全部状态</option>
          <option v-for="option in stageOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <label class="job-overview-filterbar__field" data-field-name="班主任">
        <span>班主任</span>
        <select v-model="filters.leadMentorId">
          <option value="">全部班主任</option>
          <option v-for="option in mentorOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <label class="job-overview-filterbar__field" data-field-name="分配状态">
        <span>分配状态</span>
        <select v-model="filters.assignStatus">
          <option value="">全部状态</option>
          <option value="pending">待分配</option>
          <option value="assigned">已分配</option>
        </select>
      </label>

      <div class="job-overview-filterbar__actions">
        <button type="button" class="job-overview-filterbar__button" @click="handleSearch">搜索</button>
        <button type="button" class="job-overview-filterbar__button job-overview-filterbar__button--ghost" @click="handleReset">
          重置
        </button>
      </div>
    </section>

    <section class="job-overview-board">
      <div class="job-overview-dataset-tabs">
        <button
          type="button"
          :class="[
            'job-overview-dataset-tabs__button',
            { 'job-overview-dataset-tabs__button--active': activeTab === 'pending' }
          ]"
          data-tab="pending"
          :aria-pressed="activeTab === 'pending'"
          @click="activeTab = 'pending'"
        >
          <i class="mdi mdi-account-clock-outline" aria-hidden="true"></i>
          <span>待分配导师</span>
          <strong>{{ pendingBadge }}</strong>
        </button>
        <button
          type="button"
          :class="[
            'job-overview-dataset-tabs__button',
            { 'job-overview-dataset-tabs__button--active': activeTab === 'all' }
          ]"
          data-tab="all"
          :aria-pressed="activeTab === 'all'"
          @click="activeTab = 'all'"
        >
          <i class="mdi mdi-table-large" aria-hidden="true"></i>
          <span>全部学员</span>
          <strong>{{ allRows.length }}</strong>
        </button>
      </div>

      <div v-if="loading" class="job-overview-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载求职总览...</span>
      </div>

      <template v-else-if="activeTab === 'pending'">
        <div class="job-overview-alert">
          <i class="mdi mdi-information-outline" aria-hidden="true"></i>
          <span>以下学员申请了辅导，需要为岗位申请分配导师。</span>
        </div>

        <div class="job-overview-tablewrap">
          <table class="job-overview-table job-overview-datatable">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>需求导师</th>
                <th>申请时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in unassignedRows" :key="row.applicationId">
                <td>
                  <div class="job-overview-student">
                    <div class="job-overview-student__avatar">{{ getInitials(row.studentName) }}</div>
                    <div class="job-overview-student__copy">
                      <strong>{{ row.studentName || '-' }}</strong>
                      <span>ID: {{ row.studentId }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="job-overview-company">
                    <strong>{{ row.companyName }}</strong>
                    <span>{{ row.positionName }}</span>
                  </div>
                </td>
                <td>
                  <span :class="['job-overview-chip', `job-overview-chip--${getStageTone(row.currentStage)}`]">
                    {{ formatStage(row.currentStage) }}
                  </span>
                </td>
                <td>
                  <div class="job-overview-time">
                    <strong>{{ formatDateTime(row.interviewTime) }}</strong>
                    <span>{{ formatInterviewCountdown(row.interviewTime) }}</span>
                  </div>
                </td>
                <td>
                  <div class="job-overview-demand">
                    <strong>{{ row.requestedMentorCount || 0 }} 位</strong>
                    <span>{{ row.preferredMentorNames || '暂无意向导师' }}</span>
                  </div>
                </td>
                <td>{{ formatRelativeDate(row.submittedAt) }}</td>
                <td>
                  <button
                    type="button"
                    class="job-overview-action"
                    data-surface-trigger="modal-assign-mentor"
                    :data-surface-sample-key="`application-${row.applicationId}`"
                    @click="handleOpenAssignMentor(row)"
                  >
                    分配导师
                  </button>
                </td>
              </tr>
              <tr v-if="!unassignedRows.length">
                <td colspan="7" class="job-overview-empty job-overview-empty--inline">当前没有待分配导师的岗位申请</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="job-overview-tablewrap">
          <table class="job-overview-table job-overview-datatable">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>辅导状态</th>
                <th>导师</th>
                <th>课时 / 反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in allRows"
                :key="row.applicationId"
                :class="[
                  { 'job-overview-datatable__row--updated': row.stageUpdated },
                  { 'job-overview-datatable__row--ended': isEndedStage(row.currentStage) }
                ]"
              >
                <td>
                  <div class="job-overview-student">
                    <div class="job-overview-student__avatar job-overview-student__avatar--cool">{{ getInitials(row.studentName) }}</div>
                    <div class="job-overview-student__copy">
                      <strong>{{ row.studentName || '-' }}</strong>
                      <span>ID: {{ row.studentId }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="job-overview-company">
                    <strong>{{ row.companyName }}</strong>
                    <span>{{ row.positionName }} · {{ row.city || row.region || '地区待补充' }}</span>
                  </div>
                </td>
                <td>
                  <div class="job-overview-stage">
                    <span :class="['job-overview-chip', `job-overview-chip--${getStageTone(row.currentStage)}`]">
                      {{ formatStage(row.currentStage) }}
                    </span>
                    <button
                      v-if="row.stageUpdated"
                      type="button"
                      class="job-overview-stage__confirm"
                      :disabled="stageUpdatingId === row.applicationId"
                      @click="handleStageConfirm(row)"
                    >
                      <i class="mdi mdi-check-circle-outline" aria-hidden="true"></i>
                      <span>{{ stageUpdatingId === row.applicationId ? '提交中' : '确认' }}</span>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="job-overview-time">
                    <strong>{{ formatDateTime(row.interviewTime) }}</strong>
                    <span>{{ formatInterviewCountdown(row.interviewTime) }}</span>
                  </div>
                </td>
                <td>
                  <span :class="['job-overview-chip', `job-overview-chip--${getCoachingTone(row.coachingStatus)}`]">
                    {{ row.coachingStatus || '未申请' }}
                  </span>
                </td>
                <td>
                  <div class="job-overview-mentor">
                    <strong>{{ row.mentorName || row.leadMentorName || '待分配' }}</strong>
                    <span>{{ row.mentorBackground || (row.assignedStatus === 'assigned' ? '导师信息待补充' : '未分配导师') }}</span>
                  </div>
                </td>
                <td>
                  <div class="job-overview-feedback">
                    <strong>{{ row.hoursUsed || 0 }}h</strong>
                    <span>{{ row.feedbackSummary || '暂无反馈' }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="!allRows.length">
                <td colspan="7" class="job-overview-empty job-overview-empty--inline">当前筛选条件下暂无学员求职记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <AssignMentorModal
      :visible="assignMentorVisible"
      :row="selectedAssignmentRow"
      :mentor-options="assignMentorOptions"
      :submitting="assignSubmitting"
      @update:visible="handleAssignMentorVisibleChange"
      @submit="handleAssignMentorSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import AssignMentorModal from './components/AssignMentorModal.vue'
import {
  assignMentors,
  exportJobOverview,
  getHotCompanies,
  getJobOverviewFunnel,
  getJobOverviewList,
  getJobOverviewStats,
  getUnassignedJobOverviewList,
  updateJobOverviewStage,
  type HotCompanyItem,
  type JobOverviewFilters,
  type JobOverviewFunnelNode,
  type JobOverviewRow,
  type JobOverviewStats,
  type UnassignedJobOverviewRow
} from '@osg/shared/api/admin/jobOverview'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'

type ActiveTab = 'pending' | 'all'
type TagTone = 'info' | 'warning' | 'success' | 'danger' | 'default' | 'purple' | 'amber'

interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
}

interface AssignMentorSubmitPayload {
  mentorIds: number[]
  mentorNames: string[]
  assignNote: string
}

const defaultStats: JobOverviewStats = {
  appliedCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  rejectedCount: 0,
  withdrawnCount: 0,
  offerRate: 0,
  interviewPassRate: 0,
  offerRateYoY: '0%',
  interviewPassRateYoY: '0%'
}

const filters = reactive({
  studentName: '',
  companyName: '',
  currentStage: '',
  leadMentorId: '',
  assignStatus: ''
})

const stageOptions = [
  { value: 'applied', label: '已投递' },
  { value: 'hirevue', label: 'HireVue' },
  { value: 'first_round', label: 'First Round' },
  { value: 'second_round', label: 'Second Round' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'final', label: 'Final' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'withdrawn', label: '主动放弃' }
]

const loading = ref(false)
const activeTab = ref<ActiveTab>('pending')
const stats = ref<JobOverviewStats>({ ...defaultStats })
const funnelRows = ref<JobOverviewFunnelNode[]>([])
const hotCompanies = ref<HotCompanyItem[]>([])
const allRows = ref<JobOverviewRow[]>([])
const unassignedRows = ref<UnassignedJobOverviewRow[]>([])
const assignableMentors = ref<StaffListItem[]>([])
const assignMentorVisible = ref(false)
const assignSubmitting = ref(false)
const selectedAssignmentRow = ref<UnassignedJobOverviewRow | null>(null)
const stageUpdatingId = ref<number | null>(null)
const exporting = ref(false)

const requestFilters = computed<JobOverviewFilters>(() => ({
  studentName: filters.studentName || undefined,
  companyName: filters.companyName || undefined,
  currentStage: filters.currentStage || undefined,
  leadMentorId: filters.leadMentorId ? Number(filters.leadMentorId) : undefined,
  assignStatus: filters.assignStatus || undefined
}))

const companyOptions = computed(() => {
  const values = new Set<string>()
  allRows.value.forEach((row) => row.companyName && values.add(row.companyName))
  unassignedRows.value.forEach((row) => row.companyName && values.add(row.companyName))
  return [...values]
})

const mentorOptions = computed(() => {
  const values = new Map<number, string>()
  allRows.value.forEach((row) => {
    const rawId = (row as JobOverviewRow & { leadMentorId?: number }).leadMentorId
    if (rawId && row.leadMentorName) {
      values.set(rawId, row.leadMentorName)
    }
  })
  return [...values.entries()].map(([value, label]) => ({ value: String(value), label }))
})

const pendingBadge = computed(() => (unassignedRows.value.length > 99 ? '99+' : String(unassignedRows.value.length)))
const assignMentorOptions = computed<AssignMentorOption[]>(() => {
  const row = selectedAssignmentRow.value
  if (!row) return []

  const preferredMentors = new Set(splitMentorNames(row.preferredMentorNames))
  return assignableMentors.value.map((mentor) => ({
    mentorId: mentor.staffId,
    mentorName: mentor.staffName,
    preferred: preferredMentors.has(mentor.staffName),
    hint: [mentor.majorDirection, mentor.city].filter(Boolean).join(' / ') || '可分配导师'
  }))
})

async function loadAssignableMentors() {
  const response = await getStaffList({
    pageNum: 1,
    pageSize: 100,
    staffType: 'mentor',
    accountStatus: '0'
  })
  assignableMentors.value = (response.rows || []).filter((row) => row.staffId && row.staffName)
}

const statsCards = computed(() => [
  {
    key: 'applied',
    label: '已投递',
    value: stats.value.appliedCount,
    meta: `Offer率 ${formatDelta(stats.value.offerRateYoY)}`,
    tone: 'blue'
  },
  {
    key: 'interviewing',
    label: '面试中',
    value: stats.value.interviewingCount,
    meta: `通过率 ${formatDelta(stats.value.interviewPassRateYoY)}`,
    tone: 'amber'
  },
  {
    key: 'offer',
    label: '已获 Offer',
    value: stats.value.offerCount,
    meta: `${stats.value.offerRate}% Offer rate`,
    tone: 'green'
  },
  {
    key: 'rejected',
    label: '已拒绝',
    value: stats.value.rejectedCount,
    meta: '关注失败复盘',
    tone: 'red'
  },
  {
    key: 'withdrawn',
    label: '已放弃',
    value: stats.value.withdrawnCount,
    meta: '追踪后续转化',
    tone: 'slate'
  }
])

async function loadDashboard() {
  loading.value = true
  try {
    const [statsData, funnelData, hotCompanyData, listData, unassignedData] = await Promise.all([
      getJobOverviewStats(requestFilters.value),
      getJobOverviewFunnel(requestFilters.value),
      getHotCompanies(requestFilters.value),
      getJobOverviewList(requestFilters.value),
      getUnassignedJobOverviewList({
        studentName: requestFilters.value.studentName,
        companyName: requestFilters.value.companyName,
        currentStage: requestFilters.value.currentStage,
        leadMentorId: requestFilters.value.leadMentorId
      })
    ])

    stats.value = { ...defaultStats, ...statsData }
    funnelRows.value = funnelData
    hotCompanies.value = hotCompanyData
    allRows.value = listData.rows ?? []
    unassignedRows.value = unassignedData.rows ?? []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  void loadDashboard()
}

function handleReset() {
  filters.studentName = ''
  filters.companyName = ''
  filters.currentStage = ''
  filters.leadMentorId = ''
  filters.assignStatus = ''
  void loadDashboard()
}

async function handleExport() {
  try {
    exporting.value = true
    await exportJobOverview({
      studentName: requestFilters.value.studentName,
      companyName: requestFilters.value.companyName,
      currentStage: requestFilters.value.currentStage,
      leadMentorId: requestFilters.value.leadMentorId,
      assignStatus: requestFilters.value.assignStatus,
      tab: activeTab.value
    })
    message.success('求职总览导出成功')
  } catch (_error) {
    message.error('求职总览导出失败')
  } finally {
    exporting.value = false
  }
}

function handleOpenAssignMentor(row: UnassignedJobOverviewRow) {
  selectedAssignmentRow.value = row
  assignMentorVisible.value = true
}

function handleAssignMentorVisibleChange(visible: boolean) {
  assignMentorVisible.value = visible
  if (!visible) {
    selectedAssignmentRow.value = null
  }
}

async function handleAssignMentorSubmit(payload: AssignMentorSubmitPayload) {
  if (!selectedAssignmentRow.value) return

  assignSubmitting.value = true
  try {
    await assignMentors({
      applicationId: selectedAssignmentRow.value.applicationId,
      mentorIds: payload.mentorIds,
      mentorNames: payload.mentorNames,
      assignNote: payload.assignNote
    })
    message.success(`${selectedAssignmentRow.value.studentName || '该学员'} 已完成导师分配`)
    assignMentorVisible.value = false
    selectedAssignmentRow.value = null
    await loadDashboard()
  } finally {
    assignSubmitting.value = false
  }
}

async function handleStageConfirm(row: JobOverviewRow) {
  stageUpdatingId.value = row.applicationId
  try {
    await updateJobOverviewStage({
      applicationId: row.applicationId,
      stageUpdated: false
    })
    message.success(`${row.studentName || '该学员'} 的阶段提醒已确认`)
    await loadDashboard()
  } finally {
    stageUpdatingId.value = null
  }
}

function getInitials(name?: string) {
  if (!name) return 'OS'
  return name.slice(0, 2)
}

function formatStage(stage?: string) {
  const matched = stageOptions.find((item) => item.value === stage)
  return matched?.label || stage || '未更新'
}

function getStageTone(stage?: string): TagTone {
  switch (stage) {
    case 'offer':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'withdrawn':
      return 'default'
    case 'case_study':
      return 'warning'
    case 'first_round':
    case 'second_round':
    case 'final':
      return 'amber'
    case 'hirevue':
      return 'info'
    default:
      return 'purple'
  }
}

function getCoachingTone(status?: string): TagTone {
  if (status === '辅导中') return 'purple'
  if (status === '待审批') return 'warning'
  return 'default'
}

function isEndedStage(stage?: string) {
  return stage === 'offer' || stage === 'rejected' || stage === 'withdrawn'
}

function formatDateTime(value?: string) {
  if (!value) return '待安排'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatInterviewCountdown(value?: string) {
  if (!value) return '待确认时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待解析'
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) return '已过面试时间'
  if (day === 0) return '今天'
  return `还剩 ${day} 天`
}

function formatRelativeDate(value?: string) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDelta(value?: string) {
  return value || '0%'
}

function splitMentorNames(value?: string | null) {
  return (value || '')
    .split(/[,，/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

onMounted(() => {
  void Promise.all([loadAssignableMentors(), loadDashboard()])
})
</script>

<style scoped>
.job-overview-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.job-overview-header {
  align-items: flex-start;
}

.job-overview-header__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.job-overview-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.job-overview-header__traffic {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-header__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.job-overview-summary-grid__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(203, 213, 225, 0.7);
}

.job-overview-summary-grid__label {
  font-size: 12px;
  color: #64748b;
}

.job-overview-summary-grid__value {
  font-size: 30px;
  line-height: 1;
}

.job-overview-summary-grid__meta {
  font-size: 12px;
  color: #64748b;
}

.job-overview-summary-grid__card--blue {
  background: #eff6ff;
  color: #2563eb;
}

.job-overview-summary-grid__card--amber {
  background: #fffbeb;
  color: #d97706;
}

.job-overview-summary-grid__card--green {
  background: #f0fdf4;
  color: #16a34a;
}

.job-overview-summary-grid__card--red {
  background: #fef2f2;
  color: #dc2626;
}

.job-overview-summary-grid__card--slate {
  background: #f8fafc;
  color: #64748b;
}

.job-overview-analytics {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.job-overview-funnel-card,
.job-overview-hot-card,
.job-overview-filterbar,
.job-overview-board {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.job-overview-funnel-card,
.job-overview-hot-card {
  padding: 18px;
}

.job-overview-analytics__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.job-overview-analytics__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
}

.job-overview-analytics__head h3 {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 16px;
}

.job-overview-analytics__legend {
  color: #94a3b8;
  font-size: 12px;
}

.job-overview-funnel-card__rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-overview-funnel-card__row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
}

.job-overview-funnel-card__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.job-overview-funnel-card__copy strong {
  color: #0f172a;
  font-size: 13px;
}

.job-overview-funnel-card__copy span,
.job-overview-funnel-card__rate {
  color: #64748b;
  font-size: 12px;
}

.job-overview-funnel-card__track {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.job-overview-funnel-card__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.job-overview-hot-card__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-overview-hot-card__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
}

.job-overview-hot-card__item strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
}

.job-overview-hot-card__item span {
  color: #64748b;
  font-size: 12px;
}

.job-overview-hot-card__stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.job-overview-hot-card__stats strong {
  color: #16a34a;
  font-size: 18px;
}

.job-overview-filterbar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)) auto;
  gap: 10px;
  padding: 16px 18px;
}

.job-overview-filterbar__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.job-overview-filterbar__field span {
  color: #475569;
  font-size: 12px;
}

.job-overview-filterbar__field input,
.job-overview-filterbar__field select {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
}

.job-overview-filterbar__actions {
  display: inline-flex;
  align-items: flex-end;
  gap: 8px;
}

.job-overview-filterbar__button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-filterbar__button--ghost {
  color: #64748b;
}

.job-overview-board {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 18px;
}

.job-overview-dataset-tabs {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.job-overview-dataset-tabs__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid #dbe3ee;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-dataset-tabs__button strong {
  min-width: 24px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 11px;
}

.job-overview-dataset-tabs__button--active {
  border-color: transparent;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
}

.job-overview-dataset-tabs__button--active strong {
  background: rgba(255, 255, 255, 0.22);
}

.job-overview-alert {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.job-overview-tablewrap {
  overflow-x: auto;
}

.job-overview-datatable {
  width: 100%;
  min-width: 980px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.job-overview-datatable th {
  padding: 13px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.job-overview-datatable td {
  padding: 14px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.job-overview-datatable__row--updated {
  background: rgba(239, 246, 255, 0.6);
}

.job-overview-datatable__row--ended {
  background: rgba(248, 250, 252, 0.8);
}

.job-overview-student {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.job-overview-student__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.job-overview-student__avatar--cool {
  background: #eef2ff;
  color: #4f46e5;
}

.job-overview-student__copy,
.job-overview-company,
.job-overview-time,
.job-overview-demand,
.job-overview-mentor,
.job-overview-feedback {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.job-overview-student__copy strong,
.job-overview-company strong,
.job-overview-time strong,
.job-overview-demand strong,
.job-overview-mentor strong,
.job-overview-feedback strong {
  color: #0f172a;
  font-size: 13px;
}

.job-overview-student__copy span,
.job-overview-company span,
.job-overview-time span,
.job-overview-demand span,
.job-overview-mentor span,
.job-overview-feedback span {
  color: #64748b;
  font-size: 12px;
}

.job-overview-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-chip--info {
  background: #e0f2fe;
  color: #0369a1;
}

.job-overview-chip--warning,
.job-overview-chip--amber {
  background: #fef3c7;
  color: #92400e;
}

.job-overview-chip--success {
  background: #dcfce7;
  color: #166534;
}

.job-overview-chip--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.job-overview-chip--default {
  background: #f1f5f9;
  color: #475569;
}

.job-overview-chip--purple {
  background: #eef2ff;
  color: #4f46e5;
}

.job-overview-stage {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.job-overview-stage__confirm,
.job-overview-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-action {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #4f46e5;
}

.job-overview-loading,
.job-overview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.job-overview-loading {
  min-height: 220px;
}

.job-overview-empty--analytics {
  min-height: 120px;
}

.job-overview-empty--inline {
  min-height: 0;
  padding: 24px 0;
}

@media (max-width: 1280px) {
  .job-overview-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .job-overview-filterbar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .job-overview-analytics {
    grid-template-columns: 1fr;
  }

  .job-overview-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .job-overview-filterbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .job-overview-shell {
    gap: 14px;
  }

  .job-overview-summary-grid,
  .job-overview-filterbar {
    grid-template-columns: 1fr;
  }
}
</style>

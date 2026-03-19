<template>
  <div class="job-overview-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h2>
        <p class="page-subtitle">查看全部学员的求职进度，管理导师和题库分配</p>
      </div>
      <div class="page-header__actions">
        <span class="job-overview-page__traffic">
          {{ allRows.length }} 条申请 · {{ unassignedRows.length }} 条待分配 · {{ stats.offerCount }} 条 Offer
        </span>
        <button type="button" class="permission-button permission-button--outline" @click="handleExportPlaceholder">
          <i class="mdi mdi-download" aria-hidden="true"></i>
          <span>导出</span>
        </button>
      </div>
    </div>

    <section class="job-overview-hero">
      <div class="job-overview-hero__metrics">
        <article
          v-for="card in statsCards"
          :key="card.key"
          :class="['job-overview-card', `job-overview-card--${card.tone}`]"
        >
          <span class="job-overview-card__label">{{ card.label }}</span>
          <strong class="job-overview-card__value">{{ card.value }}</strong>
          <span class="job-overview-card__meta">{{ card.meta }}</span>
        </article>
      </div>

      <div class="job-overview-hero__side">
        <section class="permission-card job-overview-panel">
          <div class="job-overview-panel__head">
            <div>
              <span class="job-overview-panel__eyebrow">本月转化</span>
              <h3>求职转化漏斗</h3>
            </div>
            <span class="job-overview-panel__legend">已投递 → 面试中 → 获 Offer</span>
          </div>
          <div class="job-overview-funnel">
            <div v-for="item in funnelRows" :key="item.label" class="job-overview-funnel__row">
              <div class="job-overview-funnel__copy">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }} 人</span>
              </div>
              <div class="job-overview-funnel__bar">
                <div class="job-overview-funnel__fill" :style="{ width: `${Math.max(item.rate, 6)}%` }"></div>
              </div>
              <span class="job-overview-funnel__rate">{{ item.rate }}%</span>
            </div>
          </div>
        </section>

        <section class="permission-card job-overview-panel">
          <div class="job-overview-panel__head">
            <div>
              <span class="job-overview-panel__eyebrow">热门企业</span>
              <h3>申请热度 Top 5</h3>
            </div>
            <span class="job-overview-panel__legend">申请数 / Offer 数 / Offer 率</span>
          </div>
          <div class="job-overview-hot-list">
            <article v-for="company in hotCompanies" :key="company.companyName" class="job-overview-hot-list__item">
              <div>
                <strong>{{ company.companyName }}</strong>
                <span>{{ company.applicationCount }} 份申请</span>
              </div>
              <div class="job-overview-hot-list__metrics">
                <span>{{ company.offerCount }} Offer</span>
                <strong>{{ company.offerRate }}%</strong>
              </div>
            </article>
            <div v-if="!hotCompanies.length" class="job-overview-empty">当前暂无热门公司统计</div>
          </div>
        </section>
      </div>
    </section>

    <section class="permission-card job-overview-panel">
      <div class="job-overview-filters">
        <label class="job-overview-field">
          <span>学员姓名</span>
          <input v-model="filters.studentName" type="text" class="job-overview-input" placeholder="搜索学员" />
        </label>
        <label class="job-overview-field">
          <span>公司</span>
          <select v-model="filters.companyName" class="job-overview-select">
            <option value="">全部</option>
            <option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="job-overview-field">
          <span>状态</span>
          <select v-model="filters.currentStage" class="job-overview-select">
            <option value="">全部</option>
            <option v-for="option in stageOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="job-overview-field">
          <span>班主任</span>
          <select v-model="filters.leadMentorId" class="job-overview-select">
            <option value="">全部</option>
            <option v-for="option in mentorOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="job-overview-field">
          <span>分配状态</span>
          <select v-model="filters.assignStatus" class="job-overview-select">
            <option value="">全部</option>
            <option value="pending">待分配</option>
            <option value="assigned">已分配</option>
          </select>
        </label>
        <div class="job-overview-filters__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">搜索</button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">
            <i class="mdi mdi-refresh" aria-hidden="true"></i>
            <span>重置</span>
          </button>
        </div>
      </div>
    </section>

    <section class="permission-card job-overview-panel">
      <div class="job-overview-tabs">
        <button
          type="button"
          :class="['job-overview-tabs__button', { 'job-overview-tabs__button--active': activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          <i class="mdi mdi-account-clock" aria-hidden="true"></i>
          <span>待分配导师</span>
          <strong>{{ pendingBadge }}</strong>
        </button>
        <button
          type="button"
          :class="['job-overview-tabs__button', { 'job-overview-tabs__button--active': activeTab === 'all' }]"
          @click="activeTab = 'all'"
        >
          <i class="mdi mdi-table-eye" aria-hidden="true"></i>
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
          <i class="mdi mdi-alert-circle" aria-hidden="true"></i>
          <span>以下学员申请了辅导，需要为岗位申请分配导师。</span>
        </div>
        <div class="permission-card__body permission-card__body--flush">
          <table class="permission-table job-overview-table">
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
                    <div class="job-overview-avatar">{{ getInitials(row.studentName) }}</div>
                    <div>
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
                  <span :class="['job-overview-tag', `job-overview-tag--${getStageTone(row.currentStage)}`]">
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
                  <button type="button" class="job-overview-link-button" @click="handleOpenAssignMentor(row)">
                    分配导师
                  </button>
                </td>
              </tr>
              <tr v-if="!unassignedRows.length">
                <td colspan="7" class="job-overview-empty">当前没有待分配导师的岗位申请</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="permission-card__body permission-card__body--flush">
          <table class="permission-table job-overview-table">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>辅导状态</th>
                <th>导师</th>
                <th>课时/反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in allRows"
                :key="row.applicationId"
                :class="[
                  { 'job-overview-table__row--updated': row.stageUpdated },
                  { 'job-overview-table__row--ended': isEndedStage(row.currentStage) }
                ]"
              >
                <td>
                  <div class="job-overview-student">
                    <div class="job-overview-avatar job-overview-avatar--cool">{{ getInitials(row.studentName) }}</div>
                    <div>
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
                    <span :class="['job-overview-tag', `job-overview-tag--${getStageTone(row.currentStage)}`]">
                      {{ formatStage(row.currentStage) }}
                    </span>
                    <button
                      v-if="row.stageUpdated"
                      type="button"
                      class="job-overview-stage__confirm"
                      :disabled="stageUpdatingId === row.applicationId"
                      @click="handleStageConfirm(row)"
                    >
                      <i class="mdi mdi-check-circle" aria-hidden="true"></i>
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
                  <span :class="['job-overview-tag', `job-overview-tag--${getCoachingTone(row.coachingStatus)}`]">
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
                <td colspan="7" class="job-overview-empty">当前筛选条件下暂无学员求职记录</td>
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

type ActiveTab = 'pending' | 'all'
type TagTone = 'info' | 'warning' | 'success' | 'danger' | 'default' | 'purple'
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
const assignMentorVisible = ref(false)
const assignSubmitting = ref(false)
const selectedAssignmentRow = ref<UnassignedJobOverviewRow | null>(null)
const stageUpdatingId = ref<number | null>(null)

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
const mentorCatalog = computed(() => {
  const seen = new Set<string>()
  const values: string[] = []

  const register = (value?: string | null) => {
    const normalized = normalizeMentorName(value)
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    values.push(normalized)
  }

  allRows.value.forEach((row) => {
    register(row.mentorName)
    register(row.leadMentorName)
  })

  unassignedRows.value.forEach((row) => {
    splitMentorNames(row.preferredMentorNames).forEach(register)
    register(row.leadMentorName)
  })

  return values
})

const assignMentorOptions = computed<AssignMentorOption[]>(() => {
  const row = selectedAssignmentRow.value
  if (!row) {
    return []
  }

  const preferredMentors = splitMentorNames(row.preferredMentorNames)
  const values = uniqueMentorNames([
    ...preferredMentors,
    normalizeMentorName(row.leadMentorName),
    ...mentorCatalog.value
  ])

  return values.map((mentorName, index) => ({
    mentorId: buildMentorId(mentorName, index),
    mentorName,
    preferred: preferredMentors.includes(mentorName),
    hint: mentorName === normalizeMentorName(row.leadMentorName) ? '班主任推荐' : '历史可分配导师'
  }))
})

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

function handleExportPlaceholder() {
  message.info('导出能力保留在后续票面接入，当前先提供总览数据面。')
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
  if (!selectedAssignmentRow.value) {
    return
  }

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
  if (!name) {
    return 'OS'
  }
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
  if (status === '辅导中') {
    return 'purple'
  }
  if (status === '待审批') {
    return 'warning'
  }
  return 'default'
}

function isEndedStage(stage?: string) {
  return stage === 'offer' || stage === 'rejected' || stage === 'withdrawn'
}

function formatDateTime(value?: string) {
  if (!value) {
    return '待安排'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatInterviewCountdown(value?: string) {
  if (!value) {
    return '待确认时间'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '时间待解析'
  }
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) {
    return '已过面试时间'
  }
  if (day === 0) {
    return '今天'
  }
  return `还剩 ${day} 天`
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return '刚刚'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) {
    return '刚刚'
  }
  if (hours < 24) {
    return `${hours} 小时前`
  }
  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days} 天前`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDelta(value?: string) {
  return value || '0%'
}

function splitMentorNames(value?: string | null) {
  return uniqueMentorNames((value || '').split(/[,，/]/))
}

function uniqueMentorNames(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const normalized = normalizeMentorName(value)
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    result.push(normalized)
  })

  return result
}

function normalizeMentorName(value?: string | null) {
  const normalized = value?.trim()
  return normalized || ''
}

function buildMentorId(mentorName: string, index: number) {
  return Array.from(`${mentorName}-${index + 1}`).reduce((sum, current, currentIndex) => {
    return sum + current.charCodeAt(0) * (currentIndex + 17)
  }, 0)
}

onMounted(() => {
  void loadDashboard()
})
</script>

<style scoped>
.permission-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border, #e2e8f0);
  padding: 20px;
}

.permission-card__body--flush {
  overflow-x: auto;
  margin: 0 -20px;
}

.job-overview-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.job-overview-page__traffic {
  border-radius: 999px;
  padding: 9px 14px;
  background: rgba(15, 23, 42, 0.06);
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(360px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.job-overview-hero__metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.job-overview-hero__side {
  display: grid;
  gap: 20px;
}

.job-overview-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.job-overview-card__label {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
}

.job-overview-card__value {
  font-size: 30px;
  line-height: 1;
}

.job-overview-card__meta {
  font-size: 13px;
  color: #475569;
}

.job-overview-card--blue {
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
}

.job-overview-card--amber {
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
  color: #b45309;
}

.job-overview-card--green {
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  color: #15803d;
}

.job-overview-card--red {
  background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
}

.job-overview-card--slate {
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  color: #334155;
}

.job-overview-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.job-overview-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
}

.job-overview-panel__head h3 {
  margin: 4px 0 0;
  font-size: 18px;
  color: #0f172a;
}

.job-overview-panel__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
}

.job-overview-panel__legend {
  font-size: 12px;
  color: #64748b;
}

.job-overview-funnel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-overview-funnel__row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 52px;
  gap: 12px;
  align-items: center;
}

.job-overview-funnel__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.job-overview-funnel__copy strong {
  font-size: 14px;
  color: #0f172a;
}

.job-overview-funnel__copy span,
.job-overview-funnel__rate {
  font-size: 12px;
  color: #64748b;
}

.job-overview-funnel__bar {
  overflow: hidden;
  height: 12px;
  border-radius: 999px;
  background: #e2e8f0;
}

.job-overview-funnel__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
}

.job-overview-hot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-overview-hot-list__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
}

.job-overview-hot-list__item strong {
  display: block;
  color: #0f172a;
}

.job-overview-hot-list__item span {
  font-size: 12px;
  color: #64748b;
}

.job-overview-hot-list__metrics {
  display: flex;
  align-items: center;
  gap: 10px;
}

.job-overview-hot-list__metrics strong {
  font-size: 18px;
  color: #166534;
}

.job-overview-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.job-overview-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.job-overview-field span {
  font-size: 12px;
  color: #475569;
}

.job-overview-input,
.job-overview-select {
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
  color: #0f172a;
}

.job-overview-filters__actions {
  display: flex;
  gap: 10px;
}

.job-overview-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.job-overview-tabs__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #1e293b;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-tabs__button strong {
  min-width: 24px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: inherit;
  padding: 2px 8px;
  font-size: 11px;
}

.job-overview-tabs__button--active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: transparent;
  color: #fff;
}

.job-overview-tabs__button--active strong {
  background: rgba(255, 255, 255, 0.24);
}

.job-overview-loading,
.job-overview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  color: #64748b;
}

.job-overview-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff1f2;
  color: #be123c;
  font-size: 13px;
  font-weight: 600;
}

.job-overview-table__row--updated {
  background: #dbeafe;
}

.job-overview-table__row--ended {
  opacity: 0.76;
}

.job-overview-student,
.job-overview-company,
.job-overview-time,
.job-overview-mentor,
.job-overview-feedback,
.job-overview-demand {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.job-overview-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.job-overview-avatar--cool {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
}

.job-overview-student strong,
.job-overview-company strong,
.job-overview-time strong,
.job-overview-mentor strong,
.job-overview-feedback strong,
.job-overview-demand strong {
  color: #0f172a;
}

.job-overview-student span,
.job-overview-company span,
.job-overview-time span,
.job-overview-mentor span,
.job-overview-feedback span,
.job-overview-demand span {
  font-size: 12px;
  color: #64748b;
}

.job-overview-stage {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.job-overview-stage__confirm,
.job-overview-link-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.job-overview-link-button {
  background: #eff6ff;
}

.job-overview-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.job-overview-tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.job-overview-tag--amber,
.job-overview-tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.job-overview-tag--success {
  background: #dcfce7;
  color: #166534;
}

.job-overview-tag--danger {
  background: #fee2e2;
  color: #991b1b;
}

.job-overview-tag--default {
  background: #e2e8f0;
  color: #475569;
}

.job-overview-tag--purple {
  background: #ede9fe;
  color: #6d28d9;
}

@media (max-width: 1440px) {
  .job-overview-hero {
    grid-template-columns: 1fr;
  }

  .job-overview-hero__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .job-overview-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .job-overview-filters__actions {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .job-overview-hero__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .job-overview-funnel__row {
    grid-template-columns: 1fr;
  }

  .job-overview-filters {
    grid-template-columns: 1fr;
  }

  .job-overview-filters__actions {
    grid-column: auto;
  }
}
</style>

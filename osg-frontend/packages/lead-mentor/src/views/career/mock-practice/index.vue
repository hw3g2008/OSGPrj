<template>
  <div id="page-mock-practice" class="page-mock-practice">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h1>
        <p class="page-sub">处理学员的模拟面试、人际关系测试、期中考试申请</p>
      </div>
    </div>

    <section class="stats-grid" aria-label="mock practice stats">
      <article v-for="item in statsCards" :key="item.label" class="card stats-card">
        <div class="card-body stats-card__body">
          <div class="stats-card__value" :class="item.tone">{{ item.value }}</div>
          <div class="stats-card__label">{{ item.label }}</div>
        </div>
      </article>
    </section>

    <section class="card">
      <div class="card-header">
        <div class="tabs">
          <button
            id="mock-tab-pending"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'pending' }, 'tab--pending']"
            @click="activeTab = 'pending'"
          >
            <i class="mdi mdi-account-clock" aria-hidden="true" />
            待分配导师
            <span class="tab-count">{{ pendingRows.length }}</span>
          </button>
          <button
            id="mock-tab-mycoaching"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'mycoaching' }, 'tab--primary']"
            @click="activeTab = 'mycoaching'"
          >
            <i class="mdi mdi-school" aria-hidden="true" />
            我辅导的学员
            <span class="tab-count">{{ coachingRows.length }}</span>
          </button>
          <button
            id="mock-tab-mymanage"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'mymanage' }, 'tab--primary']"
            @click="activeTab = 'mymanage'"
          >
            <i class="mdi mdi-account-group" aria-hidden="true" />
            我管理的学员
            <span class="tab-count tab-count--managed">{{ managedRows.length }}</span>
          </button>
        </div>
      </div>

      <div
        id="mock-content-pending"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'pending' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--danger">
          <i class="mdi mdi-alert-circle" aria-hidden="true" />
          以下学员申请了模拟应聘，需要分配导师
        </div>

        <div class="filters filters--compact">
          <div class="filter-chip">
            <span class="filter-chip__label">类型:</span>
            <select class="form-select">
              <option>全部类型</option>
              <option>模拟面试</option>
              <option>人际关系测试</option>
              <option>期中考试</option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">学员:</span>
            <input class="form-input" type="text" placeholder="搜索学员姓名/ID" />
          </div>
          <button type="button" class="btn btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            筛选
          </button>
          <button type="button" class="btn btn-text btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请时间</th>
                <th style="width: 140px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pendingRows"
                :key="row.studentId"
                class="mock-row"
                :class="row.rowTone"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td><span class="date-text">{{ row.appliedAt }}</span></td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    data-surface-trigger="modal-assign-mock"
                    @click="openAssignMock(row.practiceId)"
                  >
                    <i class="mdi mdi-account-plus" aria-hidden="true" />
                    分配导师
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="mock-content-mycoaching"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'mycoaching' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--info">
          <i class="mdi mdi-school" aria-hidden="true" />
          以下是由您亲自辅导的学员模拟应聘记录
        </div>

        <div class="filters filters--compact">
          <div class="filter-chip">
            <span class="filter-chip__label">类型:</span>
            <select class="form-select">
              <option>全部类型</option>
              <option>模拟面试</option>
              <option>人际关系测试</option>
              <option>期中考试</option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">状态:</span>
            <select class="form-select">
              <option>全部状态</option>
              <option>新分配</option>
              <option>待进行</option>
              <option>已完成</option>
              <option>已取消</option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">学员:</span>
            <input class="form-input" type="text" placeholder="搜索学员姓名/ID" />
          </div>
          <button type="button" class="btn btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            筛选
          </button>
          <button type="button" class="btn btn-text btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请时间</th>
                <th>状态</th>
                <th>已上课时</th>
                <th>课程反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in coachingRows"
                :key="row.studentId"
                class="mock-row"
                :class="row.rowTone"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td><span class="date-text">{{ row.appliedAt }}</span></td>
                <td>
                  <span class="tag" :class="row.statusTone">
                    <i v-if="row.statusIcon" class="mdi" :class="row.statusIcon" aria-hidden="true" />
                    {{ row.status }}
                  </span>
                </td>
                <td>
                  <span v-if="row.hours" class="hours-text">{{ row.hours }}</span>
                  <span v-else class="muted-text">-</span>
                </td>
                <td>
                  <button
                    v-if="row.actionLabel"
                    type="button"
                    class="btn btn-sm"
                    :class="row.actionTone"
                    @click="handleAcknowledgeAssignment(row.practiceId)"
                  >
                    <i v-if="row.actionIcon" class="mdi" :class="row.actionIcon" aria-hidden="true" />
                    {{ row.actionLabel }}
                  </button>
                  <button
                    v-else-if="row.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(row.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="row.feedbackTone">{{ row.feedbackTitle }}</div>
                      <div class="student-meta">{{ row.feedbackSummary }}</div>
                    </div>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="mock-content-mymanage"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'mymanage' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--success">
          <i class="mdi mdi-account-group" aria-hidden="true" />
          以下是您管理的学员的模拟应聘记录（由其他导师辅导）
        </div>

        <div class="filters filters--compact">
          <div class="filter-chip">
            <span class="filter-chip__label">类型:</span>
            <select class="form-select">
              <option>全部类型</option>
              <option>模拟面试</option>
              <option>人际关系测试</option>
              <option>期中考试</option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">状态:</span>
            <select class="form-select">
              <option>全部状态</option>
              <option>待进行</option>
              <option>进行中</option>
              <option>已完成</option>
              <option>已取消</option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">学员:</span>
            <input class="form-input" type="text" placeholder="搜索学员姓名/ID" />
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">导师:</span>
            <input class="form-input form-input--mentor" type="text" placeholder="搜索导师姓名" />
          </div>
          <button type="button" class="btn btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            筛选
          </button>
          <button type="button" class="btn btn-text btn-sm" @click="showUpcomingToast()">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请时间</th>
                <th>状态</th>
                <th>辅导导师</th>
                <th>已上课时</th>
                <th>课程反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in managedRows"
                :key="row.studentId"
                class="mock-row"
                :class="row.rowTone"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td><span class="date-text">{{ row.appliedAt }}</span></td>
                <td><span class="tag" :class="row.statusTone">{{ row.status }}</span></td>
                <td>
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ row.mentorName }}</div>
                    <div class="student-meta">{{ row.mentorMeta }}</div>
                  </div>
                </td>
                <td><span class="hours-text">{{ row.hours }}</span></td>
                <td>
                  <button
                    v-if="row.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(row.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="row.feedbackTone">{{ row.feedbackTitle }}</div>
                      <div class="student-meta">{{ row.feedbackSummary }}</div>
                    </div>
                  </button>
                  <div v-else class="feedback-stack">
                    <div class="feedback-stack__title" :class="row.feedbackTone">{{ row.feedbackTitle }}</div>
                    <div class="student-meta">{{ row.feedbackSummary }}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <LeadMockFeedbackModal
      v-model="isFeedbackModalOpen"
      :preview="selectedFeedback"
    />

    <AssignMockModal
      v-model="isAssignMockModalOpen"
      :preview="selectedAssignPreview"
      @request-confirm="handleAssignMockConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, inject, nextTick, onMounted, ref } from 'vue'
import {
  acknowledgeLeadMentorMockPractice,
  assignLeadMentorMockPractice,
  getLeadMentorMockPracticeDetail,
  getLeadMentorMockPracticeList,
  getLeadMentorMockPracticeStats,
  type LeadMentorMockPracticeItem,
  type LeadMentorMockPracticeScope,
  type LeadMentorMockPracticeStats,
} from '@osg/shared/api'
import AssignMockModal, { type AssignMockPreview } from '@/components/AssignMockModal.vue'
import LeadMockFeedbackModal, { type MockFeedbackPreview } from '@/components/LeadMockFeedbackModal.vue'

type MockTab = 'pending' | 'mycoaching' | 'mymanage'
type ScopeKey = LeadMentorMockPracticeScope

interface StatsCard {
  label: string
  value: number
  tone: string
}

interface PracticeRow {
  practiceId: number
  studentId: number
  studentName: string
  avatar: string
  avatarColor: string
  practiceType: string
  typeTone: string
  typeIcon: string
  appliedAt: string
  rowTone?: string
  status?: string
  statusTone?: string
  statusIcon?: string
  hours?: string
  actionLabel?: string
  actionTone?: string
  actionIcon?: string
  mentorName?: string
  mentorMeta?: string
  feedbackTitle?: string
  feedbackTone?: string
  feedbackSummary?: string
  hasFeedback?: boolean
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => undefined)

const activeTab = ref<MockTab>('mycoaching')
const isAssignMockModalOpen = ref(false)
const selectedAssignPreview = ref<AssignMockPreview | null>(null)
const activeAssignPracticeId = ref<number | null>(null)
const activeAssignDetail = ref<LeadMentorMockPracticeItem | null>(null)
const isFeedbackModalOpen = ref(false)
const selectedFeedback = ref<MockFeedbackPreview | null>(null)
const stats = ref<LeadMentorMockPracticeStats>({
  pendingCount: 0,
  scheduledCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  totalCount: 0,
})
const scopeRows = ref<Record<ScopeKey, LeadMentorMockPracticeItem[]>>({
  pending: [],
  coaching: [],
  managed: [],
})

const statsCards = computed<StatsCard[]>(() => [
  { label: '待处理', value: stats.value.pendingCount || 0, tone: 'stats-card__value--warning' },
  { label: '已安排', value: stats.value.scheduledCount || 0, tone: 'stats-card__value--info' },
  { label: '已完成', value: stats.value.completedCount || 0, tone: 'stats-card__value--success' },
  { label: '已取消', value: stats.value.cancelledCount || 0, tone: 'stats-card__value--muted' },
])

const pendingRows = computed<PracticeRow[]>(() =>
  scopeRows.value.pending.map((row) => toPracticeRow(row, 'pending')),
)

const coachingRows = computed<PracticeRow[]>(() =>
  scopeRows.value.coaching.map((row) => toPracticeRow(row, 'coaching')),
)

const managedRows = computed<PracticeRow[]>(() =>
  scopeRows.value.managed.map((row) => toPracticeRow(row, 'managed')),
)

const loadScope = async (scope: ScopeKey) => {
  const response = await getLeadMentorMockPracticeList({ scope })
  return Array.isArray(response?.rows) ? response.rows : []
}

const loadAllScopes = async () => {
  try {
    const [nextStats, pending, coaching, managed] = await Promise.all([
      getLeadMentorMockPracticeStats(),
      loadScope('pending'),
      loadScope('coaching'),
      loadScope('managed'),
    ])
    stats.value = nextStats
    scopeRows.value = { pending, coaching, managed }
  } catch (_error) {
    stats.value = {
      pendingCount: 0,
      scheduledCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalCount: 0,
    }
    scopeRows.value = { pending: [], coaching: [], managed: [] }
    isAssignMockModalOpen.value = false
    selectedAssignPreview.value = null
    activeAssignPracticeId.value = null
    activeAssignDetail.value = null
    isFeedbackModalOpen.value = false
    selectedFeedback.value = null
    message.error('模拟应聘数据加载失败')
  }
}

const openMockFeedback = async (practiceId: number) => {
  try {
    const detail = await getLeadMentorMockPracticeDetail(practiceId)
    selectedFeedback.value = buildFeedbackPreview(detail)
    isFeedbackModalOpen.value = true
  } catch (_error) {
    selectedFeedback.value = null
    isFeedbackModalOpen.value = false
    message.error('模拟反馈加载失败')
  }
}

const openAssignMock = async (practiceId: number) => {
  try {
    const detail = await getLeadMentorMockPracticeDetail(practiceId)
    activeAssignPracticeId.value = practiceId
    activeAssignDetail.value = detail
    selectedAssignPreview.value = buildAssignPreview(detail)
    isAssignMockModalOpen.value = true
  } catch (_error) {
    activeAssignPracticeId.value = null
    activeAssignDetail.value = null
    selectedAssignPreview.value = null
    isAssignMockModalOpen.value = false
    message.error('模拟应聘详情加载失败')
  }
}

const handleAssignMockConfirm = async () => {
  if (!activeAssignPracticeId.value || !activeAssignDetail.value) {
    message.error('分配上下文丢失')
    return
  }

  const payload = collectAssignPayload(activeAssignDetail.value)
  if (!payload.mentorIds.length) {
    message.error('请至少选择1位导师')
    return
  }
  if (!payload.scheduledAt) {
    message.error('预约时间不能为空')
    return
  }

  try {
    await assignLeadMentorMockPractice(activeAssignPracticeId.value, payload)
    isAssignMockModalOpen.value = false
    message.success('导师分配已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('导师分配保存失败')
  }
}

const handleAcknowledgeAssignment = async (practiceId: number) => {
  try {
    await acknowledgeLeadMentorMockPractice(practiceId)
    message.success('分配确认已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('分配确认失败')
  }
}

onMounted(() => {
  void loadAllScopes()
})

function toPracticeRow(row: LeadMentorMockPracticeItem, scope: ScopeKey): PracticeRow {
  const typeUi = resolveTypeUi(row.practiceType)
  const statusUi = resolveStatusUi(row)
  const feedbackTitle = resolveFeedbackTitle(row)
  const feedbackTone = resolveFeedbackTone(row.feedbackRating)
  const hasFeedback = Boolean(row.feedbackSummary)

  return {
    practiceId: row.practiceId,
    studentId: row.studentId,
    studentName: row.studentName || '-',
    avatar: buildAvatarText(row.studentName),
    avatarColor: resolveAvatarColor(row.studentName),
    practiceType: row.practiceType || '-',
    typeTone: typeUi.typeTone,
    typeIcon: typeUi.typeIcon,
    appliedAt: formatDateTime(row.submittedAt, 'MM/DD HH:mm'),
    rowTone: typeUi.rowTone,
    status: row.statusLabel || row.status || '-',
    statusTone: statusUi.statusTone,
    statusIcon: statusUi.statusIcon,
    hours: scope === 'managed' ? (row.completedHoursLabel || '-') : (row.completedHoursLabel || ''),
    actionLabel: scope === 'coaching' && row.isNewAssignment ? '确认' : undefined,
    actionTone: scope === 'coaching' && row.isNewAssignment ? 'btn btn-sm btn-success' : undefined,
    actionIcon: scope === 'coaching' && row.isNewAssignment ? 'mdi-check' : undefined,
    mentorName: row.mentorNames || '-',
    mentorMeta: row.mentorBackgrounds || '-',
    feedbackTitle,
    feedbackTone,
    feedbackSummary: row.feedbackSummary || (row.isNewAssignment ? '等待导师确认' : '等待导师补充反馈'),
    hasFeedback,
  }
}

function buildAssignPreview(detail: LeadMentorMockPracticeItem): AssignMockPreview {
  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    mentorDemand: formatMentorDemand(detail.requestedMentorCount),
    mentorOptions: (detail.mentorOptions ?? []).map((mentor) => ({
      code: buildMentorCode(mentor.mentorName),
      name: mentor.mentorName || '-',
      meta: [mentor.mentorBackground, mentor.availabilityLabel].filter(Boolean).join(' · '),
      avatarColor: resolveAvatarColor(mentor.mentorName),
      selected: Boolean(mentor.selected),
    })),
    scheduledAt: toDateTimeInputValue(detail.scheduledAt),
    note: detail.note || '',
    avatarColor: resolveAvatarColor(detail.studentName),
  }
}

function buildFeedbackPreview(detail: LeadMentorMockPracticeItem): MockFeedbackPreview {
  const feedbackSummary = detail.feedbackSummary || detail.note || '暂无反馈'
  const suggestions = splitSuggestions(detail.note)

  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    sessionTime: formatDateTime(detail.scheduledAt || detail.submittedAt, 'YYYY-MM-DD HH:mm'),
    mentorName: detail.mentorNames || '-',
    status: detail.statusLabel || detail.status || '-',
    score: normalizeScore(detail.feedbackRating),
    scoreLabel: resolveFeedbackTitle(detail),
    actualDuration: detail.completedHoursLabel || '-',
    feedback: feedbackSummary,
    suggestions,
    recommendation: buildRecommendation(detail),
    avatarColor: resolveAvatarColor(detail.studentName),
  }
}

function collectAssignPayload(detail: LeadMentorMockPracticeItem) {
  const modal = document.querySelector<HTMLElement>('[data-surface-id="modal-assign-mock"]')
  const mentorOptions = detail.mentorOptions ?? []
  const checkboxes = Array.from(
    modal?.querySelectorAll<HTMLInputElement>('.mentor-list input[type="checkbox"]') ?? [],
  )
  const mentorIds = mentorOptions
    .filter((_, index) => checkboxes[index]?.checked)
    .map((mentor) => mentor.mentorId)
  const scheduledAt =
    modal?.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value?.trim() || ''
  const note = modal?.querySelector<HTMLTextAreaElement>('textarea')?.value?.trim() || ''

  return {
    mentorIds,
    scheduledAt,
    note,
  }
}

function resolveTypeUi(practiceType?: string) {
  const normalized = (practiceType || '').trim()
  if (normalized === '模拟面试') {
    return { typeTone: 'tag--info', typeIcon: 'mdi-account-voice', rowTone: 'mock-row--blue' }
  }
  if (normalized === '人际关系测试') {
    return { typeTone: 'tag--warning', typeIcon: 'mdi-account-group', rowTone: 'mock-row--amber' }
  }
  if (normalized === '期中考试') {
    return { typeTone: 'tag--purple', typeIcon: 'mdi-file-document-edit', rowTone: 'mock-row--purple' }
  }
  return { typeTone: 'tag--info', typeIcon: 'mdi-clipboard-text', rowTone: 'mock-row--blue' }
}

function resolveStatusUi(row: LeadMentorMockPracticeItem) {
  if (row.isNewAssignment) {
    return { statusTone: 'tag--danger', statusIcon: 'mdi-bell-ring' }
  }

  const normalized = (row.status || '').trim().toLowerCase()
  if (normalized === 'completed') {
    return { statusTone: 'tag--success', statusIcon: 'mdi-check-circle' }
  }
  if (normalized === 'confirmed') {
    return { statusTone: 'tag--info', statusIcon: 'mdi-check-decagram' }
  }
  if (normalized === 'cancelled') {
    return { statusTone: 'tag--muted', statusIcon: 'mdi-close-circle' }
  }
  return { statusTone: 'tag--info', statusIcon: 'mdi-clock-outline' }
}

function resolveFeedbackTitle(row: Pick<LeadMentorMockPracticeItem, 'feedbackRating' | 'statusLabel' | 'status'>) {
  const rating = normalizeScore(row.feedbackRating)
  if (rating >= 5) {
    return '优秀'
  }
  if (rating >= 4) {
    return '良好'
  }
  if (rating >= 3) {
    return '待改进'
  }
  return row.statusLabel || row.status || '待反馈'
}

function resolveFeedbackTone(rating?: number) {
  const resolved = normalizeScore(rating)
  if (resolved >= 5) {
    return 'feedback-stack__title--success'
  }
  if (resolved >= 4) {
    return 'feedback-stack__title--warning'
  }
  return 'feedback-stack__title--muted'
}

function buildRecommendation(detail: LeadMentorMockPracticeItem) {
  if (detail.note) {
    return detail.note
  }
  if (normalizeScore(detail.feedbackRating) >= 4) {
    return '导师建议继续推进下一阶段训练'
  }
  return '建议先补一轮针对性训练后再继续推进'
}

function splitSuggestions(note?: string) {
  const items = (note || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length) {
    return items
  }

  return ['结合导师反馈继续补充高频题训练']
}

function formatMentorDemand(count?: number) {
  const resolved = Number(count ?? 0)
  return resolved > 0 ? `期望${resolved}位导师` : '待确认导师人数'
}

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatDateTime(value?: string, pattern: 'MM/DD HH:mm' | 'YYYY-MM-DD HH:mm' = 'MM/DD HH:mm') {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')

  if (pattern === 'YYYY-MM-DD HH:mm') {
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  return `${month}/${day} ${hour}:${minute}`
}

function normalizeScore(value?: number) {
  const score = Number(value ?? 0)
  return Number.isFinite(score) ? score : 0
}

function buildAvatarText(name?: string) {
  const trimmed = (name || '').trim()
  return trimmed.slice(0, 2) || '--'
}

function resolveAvatarColor(seed?: string) {
  const palette = ['var(--primary)', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899']
  const source = (seed || '').trim()
  if (!source) {
    return palette[0]
  }

  const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function buildMentorCode(name?: string) {
  const parts = (name || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) {
    return '--'
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}
</script>

<style scoped>
.page-mock-practice {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.page-title-en {
  margin-left: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 400;
}

.page-sub {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.card {
  overflow: hidden;
  margin: 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.stats-card__body {
  padding: 16px;
  text-align: center;
}

.stats-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.stats-card__value--warning {
  color: #F59E0B;
}

.stats-card__value--info {
  color: #3B82F6;
}

.stats-card__value--success {
  color: #22C55E;
}

.stats-card__value--muted {
  color: var(--muted);
}

.stats-card__label {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}

.card-header {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--bg);
  border-radius: 6px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.tab.active.tab--pending {
  background: #EF4444;
  color: #fff;
}

.tab.active.tab--primary {
  background: var(--primary);
  color: #fff;
}

.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  color: inherit;
  font-size: 10px;
}

.tab-count--managed {
  background: var(--muted);
  color: #fff;
}

.tab-panel {
  padding: 0;
}

.panel-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
}

.panel-banner--danger {
  background: #FEF2F2;
  color: #991B1B;
}

.panel-banner--info {
  background: #EFF6FF;
  color: #1E40AF;
}

.panel-banner--success {
  background: #F0FDF4;
  color: #166534;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.filters--compact {
  gap: 12px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-chip__label {
  color: var(--muted);
  font-size: 12px;
}

.form-input,
.form-select {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
}

.form-input {
  width: 140px;
  padding: 4px 8px;
}

.form-input--mentor {
  width: 120px;
}

.form-select {
  padding: 4px 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 0;
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-text {
  background: transparent;
  color: var(--muted);
}

.btn-primary {
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-success {
  background: #22C55E;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.table th {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.mock-row--blue {
  background: #F0F9FF;
}

.mock-row--amber {
  background: #FFFBEB;
}

.mock-row--purple {
  background: #F3E8FF;
}

.mock-row--new {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  box-shadow: inset 4px 0 0 #EF4444;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.student-name,
.mentor-stack__name {
  color: var(--text);
  font-weight: 600;
}

.student-meta {
  color: var(--muted);
  font-size: 11px;
}

.date-text {
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.tag--info {
  background: #DBEAFE;
  color: #1D4ED8;
}

.tag--warning {
  background: #FEF3C7;
  color: #B45309;
}

.tag--success {
  background: #DCFCE7;
  color: #166534;
}

.tag--danger {
  background: #EF4444;
  color: #fff;
}

.tag--purple {
  background: #8B5CF6;
  color: #fff;
}

.hours-text {
  color: var(--primary);
  font-weight: 600;
}

.muted-text {
  color: var(--muted);
}

.feedback-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feedback-trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.feedback-stack__title {
  font-size: 12px;
  font-weight: 500;
}

.feedback-stack__title--success {
  color: #059669;
}

.feedback-stack__title--warning {
  color: #D97706;
}

.feedback-stack__title--muted {
  color: var(--muted);
}

.mentor-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    width: 100%;
    flex-wrap: wrap;
  }

  .tab {
    justify-content: center;
    width: 100%;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-chip {
    width: 100%;
    justify-content: space-between;
  }

  .form-input,
  .form-input--mentor,
  .form-select {
    width: 100%;
  }
}
</style>

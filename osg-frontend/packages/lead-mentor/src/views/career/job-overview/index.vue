<template>
  <div id="page-job-overview" class="page-job-overview">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h1>
        <p class="page-sub">查看我辅导和管理的学员求职进度</p>
      </div>

      <button type="button" class="btn btn-outline" @click="showUpcomingToast()">
        <i class="mdi mdi-export" aria-hidden="true" />
        导出
      </button>
    </div>

    <section class="card">
      <div class="card-body card-body--calendar">
        <div class="calendar-toolbar">
          <div class="calendar-title-group">
            <i class="mdi mdi-calendar-month" aria-hidden="true" />
            <span class="calendar-title">学员面试安排</span>
            <button type="button" class="btn btn-text btn-sm btn-icon" @click="showUpcomingToast()">
              <i class="mdi mdi-chevron-left" aria-hidden="true" />
            </button>
            <span class="calendar-month">1月</span>
            <button type="button" class="btn btn-text btn-sm btn-icon" @click="showUpcomingToast()">
              <i class="mdi mdi-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div class="toolbar-divider" aria-hidden="true" />

          <div class="calendar-days">
            <article
              v-for="day in compactDays"
              :key="day.date"
              class="calendar-day"
              :class="day.tone"
            >
              <span class="calendar-day__week">{{ day.weekday }}</span>
              <span class="calendar-day__date">{{ day.date }}</span>
            </article>
          </div>

          <div class="toolbar-divider" aria-hidden="true" />

          <div class="calendar-summary">
            <button
              v-for="item in summaryEvents"
              :key="item.label"
              type="button"
              class="summary-pill"
              :class="item.tone"
              @click="showUpcomingToast()"
            >
              <span>{{ item.label }}</span>
              <span>{{ item.student }}</span>
            </button>
          </div>

          <button
            id="lm-toggle-view-btn"
            type="button"
            class="btn btn-text btn-sm toggle-calendar-btn"
            @click="isCalendarExpanded = !isCalendarExpanded"
          >
            <i
              class="mdi"
              :class="isCalendarExpanded ? 'mdi-calendar-collapse-horizontal' : 'mdi-calendar-expand-horizontal'"
              aria-hidden="true"
            />
            {{ isCalendarExpanded ? '收起' : '展开' }}
          </button>
        </div>
      </div>

      <div
        id="lm-month-view-expanded"
        class="month-view"
        :style="{ display: isCalendarExpanded ? 'block' : 'none' }"
      >
        <div class="month-legend">
          <span class="legend-item"><span class="legend-dot legend-dot--danger" />面试</span>
          <span class="legend-item"><span class="legend-dot legend-dot--info" />辅导课</span>
          <span class="legend-item"><span class="legend-dot legend-dot--primary" />今天</span>
        </div>

        <div class="month-grid">
          <span v-for="weekday in monthWeekdays" :key="weekday" class="month-grid__heading">{{ weekday }}</span>
          <button
            v-for="cell in monthCells"
            :key="cell.label"
            type="button"
            class="month-grid__cell"
            :class="cell.tone"
            @click="cell.actionable ? showUpcomingToast() : undefined"
          >
            <span>{{ cell.label }}</span>
            <span v-if="cell.dotTone" class="month-grid__dot" :class="cell.dotTone" />
          </button>
        </div>

        <div class="week-schedule">
          <div class="week-schedule__title">
            <i class="mdi mdi-calendar-clock" aria-hidden="true" />
            本周学员面试安排
          </div>

          <article
            v-for="item in weeklySchedule"
            :key="item.student"
            class="week-schedule__card"
            :class="item.tone"
          >
            <div class="week-schedule__date">
              <strong>{{ item.date }}</strong>
              <span>{{ item.weekday }}</span>
            </div>
            <div class="week-schedule__meta">
              <div>{{ item.student }} - {{ item.company }}</div>
              <div>{{ item.time }} · {{ item.role }}</div>
            </div>
            <span class="tag" :class="item.tagTone">{{ item.tag }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="filters">
      <input
        v-model="filters.studentName"
        class="form-input"
        type="text"
        placeholder="搜索学员姓名..."
      />
      <select v-model="filters.typeFilter" class="form-select" @change="handleTypeFilterChange">
        <option value="">全部类型</option>
        <option value="coaching">辅导学员</option>
        <option value="managed">管理学员</option>
      </select>
      <select v-model="filters.companyName" class="form-select">
        <option value="">全部公司</option>
        <option
          v-for="company in companyOptions"
          :key="company"
          :value="company"
        >
          {{ company }}
        </option>
      </select>
      <select v-model="filters.currentStage" class="form-select">
        <option value="">全部状态</option>
        <option
          v-for="stage in stageOptions"
          :key="stage"
          :value="stage"
        >
          {{ stage }}
        </option>
      </select>
      <button type="button" class="btn btn-outline" @click="handleSearch()">
        <i class="mdi mdi-magnify" aria-hidden="true" />
        搜索
      </button>
    </section>

    <section class="card">
      <div class="card-header">
        <div class="tabs">
          <button
            id="lm-job-tab-pending"
            type="button"
            class="tab"
            :class="{ active: activeTab === 'pending' }"
            @click="activeTab = 'pending'"
          >
            <i class="mdi mdi-account-clock" aria-hidden="true" />
            待分配导师
            <span class="tab-count">{{ tabCounts.pending }}</span>
          </button>
          <button
            id="lm-job-tab-coaching"
            type="button"
            class="tab"
            :class="{ active: activeTab === 'coaching' }"
            @click="activeTab = 'coaching'"
          >
            <i class="mdi mdi-school" aria-hidden="true" />
            我辅导的学员
            <span class="tab-count">{{ tabCounts.coaching }}</span>
          </button>
          <button
            id="lm-job-tab-managed"
            type="button"
            class="tab"
            :class="{ active: activeTab === 'managed' }"
            @click="activeTab = 'managed'"
          >
            <i class="mdi mdi-account-group" aria-hidden="true" />
            我管理的学员
            <span class="tab-count tab-count--managed">{{ tabCounts.managed }}</span>
          </button>
        </div>
      </div>

      <div
        id="lm-job-content-pending"
        class="card-body card-body--table"
        :style="{ display: activeTab === 'pending' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--danger">
          <i class="mdi mdi-alert-circle" aria-hidden="true" />
          以下学员申请了辅导，需要您分配导师
        </div>
        <div class="table-wrap">
          <table class="table">
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
              <tr
                v-for="row in pendingRows"
                :key="row.applicationId"
                class="row-highlight row-highlight--warning"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.studentName }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="company-name">{{ row.company }}</div>
                  <div class="student-meta">{{ row.role }}</div>
                </td>
                <td><span class="tag" :class="row.stageTone">{{ row.stage }}</span></td>
                <td class="table-stack">
                  <span>{{ row.interviewAt }}</span>
                </td>
                <td><span class="accent">{{ row.mentorDemand }}</span></td>
                <td class="table-stack"><span>{{ row.appliedAt }}</span></td>
                <td>
                  <button
                    type="button"
                    class="btn btn-sm"
                    data-surface-trigger="modal-assign-mentor"
                    @click="openAssignMentorFromPending(row)"
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
        id="lm-job-content-coaching"
        class="card-body card-body--table"
        :style="{ display: activeTab === 'coaching' ? 'block' : 'none' }"
      >
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>辅导状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in coachingRows"
                :key="row.applicationId"
                class="row-highlight"
                :class="row.rowTone"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.studentName }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="company-name" :class="row.companyTone">{{ row.company }}</div>
                  <div class="student-meta">{{ row.role }}</div>
                </td>
                <td>
                  <div class="table-stack">
                    <span class="tag" :class="row.stageTone">{{ row.stage }}</span>
                    <span v-if="row.stageMeta" class="stage-meta">{{ row.stageMeta }}</span>
                  </div>
                </td>
                <td class="table-stack">
                  <strong :class="{ 'text-danger': row.deadlineTone === 'danger' }">{{ row.interviewAt }}</strong>
                  <span class="student-meta">{{ row.deadlineHint }}</span>
                </td>
                <td>
                  <span class="tag" :class="row.statusTone">{{ row.status }}</span>
                </td>
                <td>
                  <button
                    v-if="!row.stageUpdated"
                    type="button"
                    class="btn btn-text btn-sm"
                    data-surface-trigger="modal-job-detail"
                    @click="openJobDetail(row)"
                  >
                    查看详情
                  </button>
                  <button v-else type="button" class="btn btn-sm btn-info" @click="handleAcknowledgeStage(row)">
                    确认
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="lm-job-content-managed"
        class="card-body card-body--table"
        :style="{ display: activeTab === 'managed' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--info">
          <i class="mdi mdi-information" aria-hidden="true" />
          查看管理学员的求职进度，已确认状态刷新后保持一致
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>辅导状态</th>
                <th>导师</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in managedRows"
                :key="row.applicationId"
                class="row-highlight"
                :class="row.rowTone"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.studentName }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="company-name" :class="row.companyTone">{{ row.company }}</div>
                  <div class="student-meta">{{ row.role }}</div>
                </td>
                <td>
                  <div class="table-stack">
                    <span class="tag" :class="row.stageTone">{{ row.stage }}</span>
                    <span v-if="row.stageMeta" class="stage-meta">{{ row.stageMeta }}</span>
                  </div>
                </td>
                <td class="table-stack">
                  <strong>{{ row.interviewAt }}</strong>
                  <span class="student-meta">{{ row.deadlineHint }}</span>
                </td>
                <td><span class="tag" :class="row.statusTone">{{ row.status }}</span></td>
                <td class="table-stack">
                  <strong>{{ row.mentorName }}</strong>
                  <span class="student-meta">{{ row.mentorMeta }}</span>
                </td>
                <td>
                  <button
                    v-if="row.stageUpdated"
                    type="button"
                    class="btn btn-sm btn-info"
                    @click="handleAcknowledgeStage(row)"
                  >
                    确认
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn btn-text btn-sm"
                    data-surface-trigger="modal-job-detail"
                    @click="openJobDetail(row)"
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <JobDetailModal
      v-model="isJobDetailModalOpen"
      :preview="jobDetailPreview"
      @request-mentor-change="handleRequestMentorChange"
    />
    <AssignMentorModal
      v-model="isAssignMentorModalOpen"
      :preview="assignMentorPreview"
      @confirm-match="handleConfirmAssignMentor"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  acknowledgeLeadMentorJobOverviewStage,
  assignLeadMentorJobOverviewMentor,
  getLeadMentorJobOverviewDetail,
  getLeadMentorJobOverviewList,
  type LeadMentorJobOverviewListItem,
  type LeadMentorJobOverviewListParams,
} from '@osg/shared/api'
import AssignMentorModal, { type AssignMentorPreview } from '@/components/AssignMentorModal.vue'
import JobDetailModal, { type JobDetailPreview } from '@/components/JobDetailModal.vue'

type TabKey = 'pending' | 'coaching' | 'managed'

interface CompactDay {
  weekday: string
  date: string
  tone: string
}

interface SummaryEvent {
  label: string
  student: string
  tone: string
}

interface MonthCell {
  label: string
  tone: string
  dotTone?: string
  actionable?: boolean
}

interface WeeklyScheduleItem {
  date: string
  weekday: string
  student: string
  company: string
  role: string
  time: string
  tone: string
  tag: string
  tagTone: string
}

interface PendingRow {
  applicationId: number
  studentName: string
  studentId: string
  avatarColor: string
  company: string
  role: string
  stage: string
  stageTone: string
  interviewAt: string
  mentorDemand: string
  appliedAt: string
  preferredMentorNames: string
  raw: LeadMentorJobOverviewListItem
}

interface OverviewRow {
  applicationId: number
  studentName: string
  studentId: string
  avatarColor: string
  company: string
  companyTone?: string
  role: string
  stage: string
  stageTone: string
  stageMeta?: string
  interviewAt: string
  deadlineHint: string
  deadlineTone?: string
  status: string
  statusTone: string
  stageUpdated: boolean
  rowTone?: string
  mentorName?: string
  mentorMeta?: string
  raw: LeadMentorJobOverviewListItem
}

interface MentorDirectoryEntry {
  id: number
  name: string
}

interface JobOverviewFilters {
  studentName: string
  typeFilter: '' | 'coaching' | 'managed'
  companyName: string
  currentStage: string
}

const MENTOR_DIRECTORY: MentorDirectoryEntry[] = [
  { id: 9001, name: 'Jerry Li' },
  { id: 9002, name: 'Mike Wang' },
  { id: 9003, name: 'Sarah Chen' },
  { id: 9004, name: 'Tom Zhang' },
]

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})
const route = useRoute()
const router = useRouter()

const isCalendarExpanded = ref(false)
const activeTab = ref<TabKey>('coaching')
const isJobDetailModalOpen = ref(false)
const isAssignMentorModalOpen = ref(false)
const jobDetailPreview = ref<JobDetailPreview | null>(null)
const assignMentorPreview = ref<AssignMentorPreview | null>(null)
const detailCurrentStage = ref('')
const activeAssignApplicationId = ref<number | null>(null)
const activeAssignSource = ref<LeadMentorJobOverviewListItem | null>(null)
const scopeRows = ref<Record<TabKey, LeadMentorJobOverviewListItem[]>>({
  pending: [],
  coaching: [],
  managed: [],
})
const filters = reactive<JobOverviewFilters>({
  studentName: '',
  typeFilter: '',
  companyName: '',
  currentStage: '',
})

const compactDays: CompactDay[] = [
  { weekday: '日', date: '26', tone: 'today' },
  { weekday: '一', date: '27', tone: 'warning' },
  { weekday: '二', date: '28', tone: 'danger' },
  { weekday: '三', date: '29', tone: 'default' },
  { weekday: '四', date: '30', tone: 'info' },
  { weekday: '五', date: '31', tone: 'default' },
  { weekday: '六', date: '1', tone: 'default' },
]

const summaryEvents: SummaryEvent[] = [
  { label: '27日', student: '张三 GS', tone: 'warning' },
  { label: '28日', student: '李四 MCK', tone: 'danger' },
]

const monthWeekdays = ['一', '二', '三', '四', '五', '六', '日']

const monthCells: MonthCell[] = [
  { label: '20', tone: 'muted' },
  { label: '21', tone: 'muted' },
  { label: '22', tone: 'muted' },
  { label: '23', tone: 'muted' },
  { label: '24', tone: 'muted' },
  { label: '25', tone: 'muted' },
  { label: '26', tone: 'today' },
  { label: '27', tone: 'warning', dotTone: 'warning', actionable: true },
  { label: '28', tone: 'danger', dotTone: 'danger', actionable: true },
  { label: '29', tone: 'muted' },
  { label: '30', tone: 'info', dotTone: 'info', actionable: true },
  { label: '31', tone: 'muted' },
  { label: '1', tone: 'ghost' },
  { label: '2', tone: 'ghost' },
  { label: '3', tone: 'ghost' },
  { label: '4', tone: 'ghost' },
  { label: '5', tone: 'ghost' },
  { label: '6', tone: 'ghost' },
  { label: '7', tone: 'ghost' },
  { label: '8', tone: 'ghost' },
]

const weeklySchedule: WeeklyScheduleItem[] = [
  {
    date: '27',
    weekday: '周一',
    student: '张三',
    company: 'Goldman Sachs First Round',
    role: 'IB Analyst · Hong Kong',
    time: '10:00',
    tone: 'warning',
    tag: '明天',
    tagTone: 'warning',
  },
  {
    date: '28',
    weekday: '周二',
    student: '李四',
    company: 'McKinsey Case Study',
    role: 'Business Analyst · Shanghai',
    time: '14:00',
    tone: 'danger',
    tag: '后天',
    tagTone: 'danger',
  },
  {
    date: '30',
    weekday: '周四',
    student: '赵六',
    company: 'Morgan Stanley R2',
    role: 'IBD Analyst · New York',
    time: '15:00',
    tone: 'info',
    tag: '4天后',
    tagTone: 'info',
  },
]

const allRows = computed(() => [
  ...scopeRows.value.pending,
  ...scopeRows.value.coaching,
  ...scopeRows.value.managed,
])

const tabCounts = computed<Record<TabKey, number>>(() => ({
  pending: scopeRows.value.pending.length,
  coaching: scopeRows.value.coaching.length,
  managed: scopeRows.value.managed.length,
}))

const companyOptions = computed(() =>
  Array.from(
    new Set(
      allRows.value
        .map((row) => row.companyName?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ),
)

const stageOptions = computed(() =>
  Array.from(
    new Set(
      allRows.value
        .map((row) => row.currentStage?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ),
)

const pendingRows = computed<PendingRow[]>(() =>
  scopeRows.value.pending.map((row) => ({
    applicationId: row.applicationId,
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    avatarColor: resolveAvatarColor(row.studentName),
    company: row.companyName || '-',
    role: row.positionName || '-',
    stage: row.currentStage || '-',
    stageTone: resolveStageTone(row.currentStage),
    interviewAt: formatDateTime(row.interviewTime),
    mentorDemand: formatMentorDemand(row.requestedMentorCount),
    appliedAt: formatSubmittedAt(row.submittedAt),
    preferredMentorNames: row.preferredMentorNames || row.mentorNames || '-',
    raw: row,
  })),
)

const coachingRows = computed<OverviewRow[]>(() =>
  scopeRows.value.coaching.map((row) => toOverviewRow(row)),
)

const managedRows = computed<OverviewRow[]>(() =>
  scopeRows.value.managed.map((row) => toOverviewRow(row)),
)

const buildAssignMentorPreview = (payload: {
  studentName: string
  studentId: string
  companyName: string
  positionName: string
  interviewStage: string
  interviewTime: string
  mentorDemand: string
  preferredMentor: string
  excludedMentor?: string
}): AssignMentorPreview => ({
  studentName: payload.studentName,
  studentId: payload.studentId,
  companyName: payload.companyName,
  positionName: payload.positionName,
  interviewStage: payload.interviewStage,
  interviewTime: payload.interviewTime,
  mentorDemand: payload.mentorDemand,
  preferredMentor: payload.preferredMentor,
  excludedMentor: payload.excludedMentor || '-',
})

const buildListParams = (scope: TabKey): LeadMentorJobOverviewListParams => ({
  scope,
  studentName: filters.studentName || undefined,
  companyName: filters.companyName || undefined,
  currentStage: filters.currentStage || undefined,
})

const loadScope = async (scope: TabKey) => {
  const response = await getLeadMentorJobOverviewList(buildListParams(scope))
  return Array.isArray(response?.rows) ? response.rows : []
}

const loadAllScopes = async () => {
  try {
    const [pending, coaching, managed] = await Promise.all([
      loadScope('pending'),
      loadScope('coaching'),
      loadScope('managed'),
    ])
    scopeRows.value = { pending, coaching, managed }
  } catch (_error) {
    scopeRows.value = { pending: [], coaching: [], managed: [] }
    isJobDetailModalOpen.value = false
    isAssignMentorModalOpen.value = false
    jobDetailPreview.value = null
    assignMentorPreview.value = null
    message.error('求职总览加载失败')
  }
}

const handleSearch = async () => {
  await syncRouteQuery()
  await loadAllScopes()
}

const handleTypeFilterChange = () => {
  if (filters.typeFilter) {
    activeTab.value = filters.typeFilter
  }
}

const openJobDetail = async (row: OverviewRow) => {
  try {
    const detail = await getLeadMentorJobOverviewDetail(row.applicationId)
    detailCurrentStage.value = detail.currentStage || row.stage
    jobDetailPreview.value = buildJobDetailPreview(detail)
    isJobDetailModalOpen.value = true
    activeAssignSource.value = detail
    await syncJobDetailStage(detailCurrentStage.value)
  } catch (_error) {
    jobDetailPreview.value = null
    isJobDetailModalOpen.value = false
    message.error('求职详情加载失败')
  }
}

const openAssignMentorFromPending = (row: PendingRow) => {
  activeAssignApplicationId.value = row.applicationId
  activeAssignSource.value = row.raw
  assignMentorPreview.value = buildAssignMentorPreview({
    studentName: row.studentName,
    studentId: row.studentId,
    companyName: row.company,
    positionName: row.role,
    interviewStage: row.stage,
    interviewTime: row.interviewAt,
    mentorDemand: row.mentorDemand,
    preferredMentor: row.preferredMentorNames,
  })
  isAssignMentorModalOpen.value = true
}

const handleRequestMentorChange = () => {
  const source = activeAssignSource.value
  const preview = jobDetailPreview.value

  isJobDetailModalOpen.value = false

  if (!source || !preview) {
    message.error('导师匹配上下文丢失')
    return
  }

  activeAssignApplicationId.value = source.applicationId
  assignMentorPreview.value = buildAssignMentorPreview({
    studentName: preview.studentName,
    studentId: preview.studentId,
    companyName: preview.companyName,
    positionName: preview.positionName,
    interviewStage: detailCurrentStage.value || source.currentStage || '-',
    interviewTime: preview.interviewTime,
    mentorDemand: formatMentorDemand(source.requestedMentorCount),
    preferredMentor: source.mentorNames || source.preferredMentorNames || preview.mentorName,
  })
  isAssignMentorModalOpen.value = true
}

const handleConfirmAssignMentor = async () => {
  if (!activeAssignApplicationId.value) {
    message.error('导师匹配上下文丢失')
    return
  }

  const payload = collectAssignPayload()
  if (!payload.mentorIds.length) {
    message.error('请至少选择1位导师')
    return
  }

  try {
    await assignLeadMentorJobOverviewMentor(activeAssignApplicationId.value, payload)
    isAssignMentorModalOpen.value = false
    scopeRows.value = {
      pending: scopeRows.value.pending.filter((entry) => entry.applicationId !== activeAssignApplicationId.value),
      coaching: scopeRows.value.coaching,
      managed: scopeRows.value.managed.map((entry) =>
        entry.applicationId === activeAssignApplicationId.value
          ? {
              ...entry,
              assignedStatus: 'assigned',
              coachingStatus: '辅导中',
              mentorNames: payload.mentorNames.join(', '),
              mentorName: payload.mentorNames[0] ?? entry.mentorName,
            }
          : entry,
      ),
    }
    message.success('导师匹配已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('导师匹配保存失败')
  }
}

const handleAcknowledgeStage = async (row: OverviewRow) => {
  try {
    await acknowledgeLeadMentorJobOverviewStage(row.applicationId)
    scopeRows.value = {
      pending: scopeRows.value.pending,
      coaching: scopeRows.value.coaching.map((entry) =>
        entry.applicationId === row.applicationId
          ? { ...entry, stageUpdated: false }
          : entry,
      ),
      managed: scopeRows.value.managed.map((entry) =>
        entry.applicationId === row.applicationId
          ? { ...entry, stageUpdated: false }
          : entry,
      ),
    }
    message.success('阶段更新已确认')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('阶段确认失败')
  }
}

onMounted(() => {
  applyRouteFilters()
  void loadAllScopes()
})

function applyRouteFilters() {
  filters.studentName = readQueryValue(route.query.studentName)
  filters.typeFilter = normalizeTypeFilter(readQueryValue(route.query.typeFilter))
  filters.companyName = readQueryValue(route.query.companyName)
  filters.currentStage = readQueryValue(route.query.currentStage)
  if (filters.typeFilter) {
    activeTab.value = filters.typeFilter
  }
}

async function syncRouteQuery() {
  const query: Record<string, string> = {}
  if (filters.studentName) {
    query.studentName = filters.studentName
  }
  if (filters.typeFilter) {
    query.typeFilter = filters.typeFilter
  }
  if (filters.companyName) {
    query.companyName = filters.companyName
  }
  if (filters.currentStage) {
    query.currentStage = filters.currentStage
  }
  await router.replace({ path: route.path, query })
}

function buildJobDetailPreview(row: LeadMentorJobOverviewListItem): JobDetailPreview {
  return {
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    leadMentorName: row.leadMentorName || '待分配班主任',
    companyName: row.companyName || '-',
    positionName: row.positionName || '-',
    recruitmentCycle: [row.region, row.city].filter(Boolean).join(' · ') || '待更新',
    interviewTime: formatDateTime(row.interviewTime),
    countdownText: buildCountdownText(row.interviewTime),
    coachingStatus: row.coachingStatus || '待更新',
    mentorName: row.mentorNames || row.mentorName || '待分配',
    lessonHours: `${Number(row.hoursUsed ?? 0)}h`,
    applyTime: formatShortDate(row.submittedAt),
    notes: row.feedbackSummary || `${row.studentName || '该学员'} 当前处于 ${row.currentStage || '待更新'} 阶段`,
  }
}

async function syncJobDetailStage(stage: string) {
  await nextTick()
  const currentStageNode = document.querySelector<HTMLElement>(
    '[data-surface-id="modal-job-detail"] .timeline-copy--current',
  )
  if (!currentStageNode) {
    return
  }
  currentStageNode.innerHTML = `${escapeHtml(stage || '-')}<span>当前</span>`
}

function collectAssignPayload() {
  const modal = document.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]')
  const selectedNames = Array.from(
    modal?.querySelectorAll<HTMLElement>('.mentor-item--selected .mentor-item__name') ?? [],
  )
    .flatMap((node) =>
      MENTOR_DIRECTORY
        .filter((mentor) => node.textContent?.includes(mentor.name))
        .map((mentor) => mentor.name),
    )
  const mentorNames = Array.from(new Set(selectedNames))
  const mentorIds = mentorNames
    .map((name) => MENTOR_DIRECTORY.find((mentor) => mentor.name === name)?.id)
    .filter((id): id is number => typeof id === 'number')
  const assignNote = modal?.querySelector<HTMLTextAreaElement>('textarea')?.value?.trim() || ''

  return {
    mentorIds,
    mentorNames,
    assignNote,
  }
}

function toOverviewRow(row: LeadMentorJobOverviewListItem): OverviewRow {
  return {
    applicationId: row.applicationId,
    studentName: row.studentName || '-',
    studentId: String(row.studentId ?? '-'),
    avatarColor: resolveAvatarColor(row.studentName),
    company: row.companyName || '-',
    companyTone: resolveCompanyTone(row.companyName),
    role: row.positionName || '-',
    stage: row.currentStage || '-',
    stageTone: resolveStageTone(row.currentStage),
    stageMeta: row.stageUpdated ? '阶段更新' : undefined,
    interviewAt: formatDateTime(row.interviewTime),
    deadlineHint: buildCountdownText(row.interviewTime),
    deadlineTone: resolveDeadlineTone(row.interviewTime),
    status: row.coachingStatus || '待更新',
    statusTone: resolveStatusTone(row.coachingStatus, row.stageUpdated),
    stageUpdated: Boolean(row.stageUpdated),
    rowTone: resolveRowTone(row),
    mentorName: row.mentorNames || row.mentorName || (row.assignedStatus === 'pending' ? '待分配' : '-'),
    mentorMeta: row.mentorBackground || '',
    raw: row,
  }
}

function resolveAvatarColor(name?: string) {
  const seed = (name || '').charCodeAt(0) || 0
  const palette = ['var(--primary)', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444']
  return palette[seed % palette.length]
}

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return typeof value === 'string' ? value : ''
}

function normalizeTypeFilter(value: string): '' | 'coaching' | 'managed' {
  return value === 'coaching' || value === 'managed' ? value : ''
}

function resolveCompanyTone(companyName?: string) {
  const normalized = companyName?.toLowerCase() || ''
  if (normalized.includes('goldman')) {
    return 'company-name--primary'
  }
  if (normalized.includes('mckinsey')) {
    return 'company-name--warning'
  }
  if (normalized.includes('google') || normalized.includes('morgan') || normalized.includes('jp')) {
    return 'company-name--info'
  }
  return undefined
}

function resolveStageTone(stage?: string) {
  const normalized = stage?.toLowerCase() || ''
  if (normalized.includes('offer')) {
    return 'tag--success'
  }
  if (normalized.includes('reject')) {
    return 'tag--danger-soft'
  }
  if (normalized.includes('case') || normalized.includes('first') || normalized.includes('second') || normalized.includes('round')) {
    return 'tag--warning'
  }
  if (normalized.includes('hirevue') || normalized.includes('assessment')) {
    return 'tag--soft'
  }
  if (normalized.includes('投递')) {
    return 'tag--indigo'
  }
  return 'tag--info'
}

function resolveStatusTone(status?: string, stageUpdated?: boolean) {
  if (stageUpdated) {
    return 'tag--info'
  }

  const normalized = status?.toLowerCase() || ''
  if (normalized.includes('辅导')) {
    return 'tag--primary'
  }
  if (normalized.includes('待')) {
    return 'tag--warning-strong'
  }
  if (normalized.includes('未')) {
    return 'tag--muted'
  }
  return 'tag--muted'
}

function resolveRowTone(row: LeadMentorJobOverviewListItem) {
  if (row.stageUpdated) {
    return 'row-highlight--info'
  }
  if (row.assignedStatus === 'pending') {
    return 'row-highlight--warning'
  }
  if ((row.hoursUsed ?? 0) > 0) {
    return 'row-highlight--primary'
  }
  return 'row-highlight--faded'
}

function resolveDeadlineTone(interviewTime?: string) {
  if (!interviewTime) {
    return undefined
  }

  const interviewDate = new Date(interviewTime)
  if (Number.isNaN(interviewDate.getTime())) {
    return undefined
  }

  const diffDays = Math.ceil((interviewDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 3) {
    return 'danger'
  }
  return undefined
}

function formatMentorDemand(count?: number) {
  if ((count ?? 0) > 0) {
    return `${count} 位`
  }
  return '需协助'
}

function formatSubmittedAt(submittedAt?: string) {
  return formatDateTime(submittedAt)
}

function formatShortDate(value?: string) {
  if (!value) {
    return '待更新'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value?: string) {
  if (!value) {
    return '待更新'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function buildCountdownText(interviewTime?: string) {
  if (!interviewTime) {
    return '待更新'
  }

  const date = new Date(interviewTime)
  if (Number.isNaN(date.getTime())) {
    return '待更新'
  }

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) {
    return '已结束'
  }
  if (diffDays === 0) {
    return '今天'
  }
  return `还剩${diffDays}天`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
</script>

<style scoped lang="scss">
.page-job-overview {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 8px;
  color: var(--text2);
  font-size: 14px;
}

.card {
  margin-bottom: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.card-body {
  padding: 12px 16px;
}

.card-body--calendar {
  padding: 12px 16px;
}

.card-body--table {
  padding: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--primary);
  color: #fff;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.9;
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 2px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-icon {
  min-width: 24px;
  justify-content: center;
}

.btn-info {
  background: #3b82f6;
}

.btn-success {
  background: #22c55e;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.calendar-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.calendar-title-group > .mdi {
  color: var(--primary);
  font-size: 18px;
}

.calendar-title {
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}

.calendar-month {
  min-width: 50px;
  text-align: center;
  font-size: 12px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
}

.calendar-days {
  display: flex;
  gap: 6px;
  flex: 1;
  min-width: min(100%, 300px);
}

.calendar-day {
  min-width: 36px;
  padding: 4px 8px;
  border-radius: 6px;
  text-align: center;
  background: #f8fafc;
}

.calendar-day__week {
  display: block;
  font-size: 9px;
  color: var(--muted);
}

.calendar-day__date {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.calendar-day.today {
  background: var(--primary);
}

.calendar-day.today .calendar-day__week,
.calendar-day.today .calendar-day__date {
  color: #fff;
}

.calendar-day.warning {
  background: #fef3c7;
}

.calendar-day.warning .calendar-day__week,
.calendar-day.warning .calendar-day__date {
  color: #92400e;
}

.calendar-day.danger {
  background: #fee2e2;
}

.calendar-day.danger .calendar-day__week,
.calendar-day.danger .calendar-day__date {
  color: #b91c1c;
}

.calendar-day.info {
  background: #dbeafe;
}

.calendar-day.info .calendar-day__week,
.calendar-day.info .calendar-day__date {
  color: #1d4ed8;
}

.calendar-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}

.summary-pill.warning {
  background: #fef3c7;
  color: #92400e;
}

.summary-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

.toggle-calendar-btn {
  margin-left: auto;
  font-size: 11px;
}

.month-view {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.month-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot--danger {
  background: #ef4444;
}

.legend-dot--info {
  background: #3b82f6;
}

.legend-dot--primary {
  background: var(--primary);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  text-align: center;
  font-size: 11px;
}

.month-grid__heading {
  padding: 6px;
  color: var(--muted);
  font-weight: 600;
}

.month-grid__cell {
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  background: #f8fafc;
  color: var(--text);
  font-size: 11px;
  cursor: default;
}

.month-grid__cell.warning {
  background: #fef3c7;
  font-weight: 600;
  cursor: pointer;
}

.month-grid__cell.danger {
  background: #fee2e2;
  font-weight: 600;
  cursor: pointer;
}

.month-grid__cell.info {
  background: #dbeafe;
  font-weight: 600;
  cursor: pointer;
}

.month-grid__cell.today {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

.month-grid__cell.ghost {
  color: var(--muted);
}

.month-grid__dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 2px auto 0;
}

.month-grid__dot.warning {
  background: #f59e0b;
}

.month-grid__dot.danger {
  background: #ef4444;
}

.month-grid__dot.info {
  background: #3b82f6;
}

.week-schedule {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.week-schedule__title {
  margin-bottom: 12px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.week-schedule__title .mdi {
  margin-right: 6px;
  color: var(--primary);
}

.week-schedule__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-left: 4px solid transparent;
  border-radius: 8px;
}

.week-schedule__card.warning {
  border-left-color: #f59e0b;
}

.week-schedule__card.danger {
  border-left-color: #ef4444;
}

.week-schedule__card.info {
  border-left-color: #3b82f6;
}

.week-schedule__date {
  min-width: 50px;
  text-align: center;
}

.week-schedule__date strong {
  display: block;
  font-size: 20px;
}

.week-schedule__date span {
  font-size: 10px;
  color: var(--text2);
}

.week-schedule__meta {
  flex: 1;
  display: grid;
  gap: 4px;
  font-size: 11px;
  color: var(--text2);
}

.week-schedule__meta div:first-child {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.form-input,
.form-select {
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 13px;
}

.form-input {
  min-width: 180px;
  padding: 0 12px;
}

.form-select {
  min-width: 140px;
  padding: 0 36px 0 12px;
}

.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 20px;
  border-radius: 12px;
  background: var(--bg);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 12px;
  color: var(--text2);
  background: transparent;
  cursor: pointer;
}

.tab.active {
  color: #fff;
  background: var(--primary);
}

#lm-job-tab-pending.active {
  background: #ef4444;
}

#lm-job-tab-managed.active {
  background: #8b5cf6;
}

.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.3);
}

.tab-count--managed {
  background: #8b5cf6;
  color: #fff;
}

.panel-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
}

.panel-banner--danger {
  background: #fef2f2;
  color: #991b1b;
}

.panel-banner--info {
  background: #e8f0f8;
  color: #1d4ed8;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.table th,
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table th {
  color: var(--text2);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  background: #fff;
}

.row-highlight--warning {
  background: #fff7ed;
}

.row-highlight--danger {
  background: linear-gradient(90deg, #fee2e2, #fef2f2);
}

.row-highlight--primary {
  background: #f3e8ff;
}

.row-highlight--info {
  background: #dbeafe;
}

.row-highlight--faded {
  opacity: 0.7;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.student-name,
.company-name {
  font-weight: 600;
  color: var(--text);
}

.company-name--primary {
  color: #6d28d9;
}

.company-name--danger {
  color: #ef4444;
}

.company-name--info {
  color: #1e40af;
}

.company-name--warning {
  color: #92400e;
}

.student-meta,
.stage-meta {
  font-size: 11px;
  color: var(--muted);
}

.table-stack {
  display: grid;
  gap: 4px;
}

.accent {
  font-weight: 600;
  color: var(--primary);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
}

.tag--primary {
  background: #8b5cf6;
  color: #fff;
}

.tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.tag--warning-strong {
  background: #f59e0b;
  color: #fff;
}

.tag--danger {
  background: #ef4444;
  color: #fff;
}

.tag--danger-soft {
  background: #fee2e2;
  color: #991b1b;
}

.tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag--soft {
  background: #dbeafe;
  color: #1e40af;
}

.tag--success {
  background: #dcfce7;
  color: #166534;
}

.tag--indigo {
  background: #e0e7ff;
  color: #4338ca;
}

.tag--muted {
  background: #f1f5f9;
  color: #64748b;
}

.text-danger {
  color: #ef4444;
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
  }

  .calendar-toolbar {
    align-items: flex-start;
  }

  .toggle-calendar-btn {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .tabs {
    width: 100%;
    overflow-x: auto;
  }

  .table {
    min-width: 920px;
  }
}
</style>

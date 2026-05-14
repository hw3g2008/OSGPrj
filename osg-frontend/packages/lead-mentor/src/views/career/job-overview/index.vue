<template>
  <a-config-provider :auto-insert-space-in-button="false">
  <div id="page-job-overview" class="osg-page">
    <PageHeader
      :title-zh="$t('overview_of_student_job_search')"
      title-en="Job Overview"
      :description="$t('view_job_search_progress_of_students_i_c')"
    >
      <template #actions>
        <a-button @click="showUpcomingToast()">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <InterviewCalendar :events="calendarEvents" />

    <div class="filter-row">
      <a-input
        v-model:value="filters.studentName"
        :placeholder="`${$t('search_student_name')}...`"
        allow-clear
        style="width: 180px;"
        @press-enter="handleSearch()"
      />
      <a-select
        v-model:value="filters.typeFilter"
        :placeholder="$t('all_types')"
        style="width: 140px;"
        @change="handleTypeFilterChange"
      >
        <a-select-option value="">{{ $t('all_types') }}</a-select-option>
        <a-select-option value="coaching">{{ $t('coached_students') }}</a-select-option>
        <a-select-option value="managed">{{ $t('managed_students') }}</a-select-option>
      </a-select>
      <a-select
        v-model:value="filters.companyName"
        :placeholder="$t('all_companies')"
        style="width: 140px;"
      >
        <a-select-option value="">{{ $t('all_companies') }}</a-select-option>
        <a-select-option v-for="company in companyOptions" :key="company" :value="company">{{ company }}</a-select-option>
      </a-select>
      <a-select
        v-model:value="filters.currentStage"
        :placeholder="$t('all_status')"
        style="width: 140px;"
      >
        <a-select-option value="">{{ $t('all_status') }}</a-select-option>
        <a-select-option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleSearch()">
        <template #icon><SearchOutlined /></template>
        {{ $t('search') }}
      </a-button>
    </div>

    <a-card :bordered="false" class="job-overview-card">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="pending" force-render>
          <template #tab>
            <span id="lm-job-tab-pending" class="lm-job-tab-label lm-job-tab-label--pending">
              <ClockCircleOutlined />
              {{ $t('tutor_to_be_assigned') }}
              <span class="tab-count">{{ tabCounts.pending }}</span>
            </span>
          </template>
          <a-alert
            type="warning"
            show-icon
            :message="$t('the_following_students_have_applied_for__2')"
            style="margin-bottom: 12px;"
          />
          <div id="lm-job-content-pending">
            <a-table
              :columns="pendingColumns"
              :data-source="pendingRows"
              :row-key="(r: PendingRow) => r.applicationId"
              :pagination="false"
              :scroll="{ x: 1100 }"
              :row-class-name="() => 'row-highlight row-highlight--warning'"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'company'">
                  <CompanyPositionCell :company="record.company" :role="record.role" meta-mode="role-only" />
                </template>
                <template v-else-if="column.key === 'stage'">
                  <StageTag :stage="record.stage" />
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell :time="record.interviewAt" />
                </template>
                <template v-else-if="column.key === 'mentorDemand'">
                  <span class="accent">{{ record.mentorDemand }}</span>
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span>{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    size="small"
                    type="primary"
                    data-surface-trigger="modal-assign-mentor"
                    @click="openAssignMentorFromPending(record)"
                  >
                    <template #icon><UserAddOutlined /></template>
                    {{ $t('assign_a_mentor') }}
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="coaching" force-render>
          <template #tab>
            <span id="lm-job-tab-coaching" class="lm-job-tab-label lm-job-tab-label--coaching">
              <BookOutlined />
              {{ $t('students_i_coach') }}
              <span class="tab-count">{{ tabCounts.coaching }}</span>
            </span>
          </template>
          <div id="lm-job-content-coaching">
            <a-table
              :columns="coachingColumns"
              :data-source="coachingRows"
              :row-key="(r: OverviewRow) => r.applicationId"
              :pagination="false"
              :scroll="{ x: 1000 }"
              :row-class-name="(record: OverviewRow) => `row-highlight ${record.rowTone || ''}`.trim()"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'company'">
                  <CompanyPositionCell :company="record.company" :role="record.role" meta-mode="role-only" :tone-class="record.companyTone" />
                </template>
                <template v-else-if="column.key === 'stage'">
                  <div class="table-stack">
                    <StageTag :stage="record.stage" />
                    <span v-if="record.stageMeta" class="stage-meta">{{ record.stageMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell
                    :time="record.interviewAt"
                    :hint="record.deadlineHint"
                    :emphasize-overdue="record.deadlineTone === 'danger'"
                  />
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.statusTone">{{ record.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    v-if="!record.stageUpdated"
                    type="link"
                    size="small"
                    data-surface-trigger="modal-job-detail"
                    @click="openJobDetail(record)"
                  >
                    {{ $t('view_details') }}
                  </a-button>
                  <a-button
                    v-else
                    size="small"
                    type="primary"
                    class="btn-acknowledge"
                    @click="handleAcknowledgeStage(record)"
                  >
                    {{ $t('confirm') }}
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="managed" force-render>
          <template #tab>
            <span id="lm-job-tab-managed" class="lm-job-tab-label lm-job-tab-label--managed">
              <TeamOutlined />
              {{ $t('students_i_manage') }}
              <span class="tab-count tab-count--managed">{{ tabCounts.managed }}</span>
            </span>
          </template>
          <a-alert
            type="info"
            show-icon
            :message="$t('view_managed_students_job_search_progres')"
            style="margin-bottom: 12px;"
          />
          <div id="lm-job-content-managed">
            <a-table
              :columns="managedColumns"
              :data-source="managedRows"
              :row-key="(r: OverviewRow) => r.applicationId"
              :pagination="false"
              :scroll="{ x: 1100 }"
              :row-class-name="(record: OverviewRow) => `row-highlight ${record.rowTone || ''}`.trim()"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentName'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'company'">
                  <CompanyPositionCell :company="record.company" :role="record.role" meta-mode="role-only" :tone-class="record.companyTone" />
                </template>
                <template v-else-if="column.key === 'stage'">
                  <div class="table-stack">
                    <StageTag :stage="record.stage" />
                    <span v-if="record.stageMeta" class="stage-meta">{{ record.stageMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'interviewAt'">
                  <InterviewTimeCell :time="record.interviewAt" :hint="record.deadlineHint" />
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.statusTone">{{ record.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'mentorName'">
                  <div class="table-stack">
                    <strong>{{ record.mentorName }}</strong>
                    <span class="student-meta">{{ record.mentorMeta }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    v-if="record.stageUpdated"
                    size="small"
                    type="primary"
                    class="btn-acknowledge"
                    @click="handleAcknowledgeStage(record)"
                  >
                    {{ $t('confirm') }}
                  </a-button>
                  <a-button
                    v-else
                    type="link"
                    size="small"
                    data-surface-trigger="modal-job-detail"
                    @click="openJobDetail(record)"
                  >
                    {{ $t('view_details') }}
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

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
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, reactive, ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  BookOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import {
  acknowledgeLeadMentorJobOverviewStage,
  assignLeadMentorJobOverviewMentor,
  getLeadMentorJobOverviewCalendar,
  getLeadMentorJobOverviewDetail,
  getLeadMentorJobOverviewList,
  type LeadMentorCalendarRecord,
  type LeadMentorJobOverviewListItem,
  type LeadMentorJobOverviewListParams,
} from '@osg/shared/api'
import { InterviewCalendar, StageTag, StudentAvatarCell, CompanyPositionCell, InterviewTimeCell } from '@osg/shared/components'
import { useCoachingStatusMap, deriveApplicationStatus } from '@osg/shared/composables'
import AssignMentorModal, {
  type AssignMentorConfirmPayload,
  type AssignMentorPreview,
} from '@/components/AssignMentorModal.vue'
import JobDetailModal, { type JobDetailPreview } from '@/components/JobDetailModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { resolveCoachingTone } = useCoachingStatusMap()

/**
 * §D.2 LM job-overview 行的 status display 派生：
 * - 优先 deriveApplicationStatus（assignStatus + coachingStatus 两入参）
 * - stageUpdated=true 时仍走老 useCoachingStatusMap 走 'blue' 高亮，保持业务行为
 */
function deriveOverviewStatusDisplay(row: LeadMentorJobOverviewListItem): { label: string; tone: string } {
  // stageUpdated 高亮分支保留旧行为
  if (row.stageUpdated) {
    return {
      label: row.coachingStatus || t('pending_update'),
      tone: 'blue',
    }
  }
  const display = deriveApplicationStatus({
    assignStatus: row.assignedStatus,
    coachingStatus: row.coachingStatus,
  })
  return {
    label: row.coachingStatus || display.label,
    tone: resolveCoachingTone(row.coachingStatus, false),
  }
}

const pendingColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: t('company_position'), dataIndex: 'company', key: 'company', width: 200 },
  { title: t('stage'), dataIndex: 'stage', key: 'stage', width: 120 },
  { title: t('interview_time'), dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: t('need_a_mentor'), dataIndex: 'mentorDemand', key: 'mentorDemand', width: 120 },
  { title: t('application_time'), dataIndex: 'appliedAt', key: 'appliedAt', width: 120 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 140, fixed: 'right' as const },
]

const coachingColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: t('company_position'), dataIndex: 'company', key: 'company', width: 200 },
  { title: t('stage'), dataIndex: 'stage', key: 'stage', width: 130 },
  { title: t('interview_time'), dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: t('counseling_status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const },
]

const managedColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 160, fixed: 'left' as const },
  { title: t('company_position'), dataIndex: 'company', key: 'company', width: 200 },
  { title: t('stage'), dataIndex: 'stage', key: 'stage', width: 130 },
  { title: t('interview_time'), dataIndex: 'interviewAt', key: 'interviewAt', width: 140 },
  { title: t('counseling_status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 140 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 120, fixed: 'right' as const },
]

type TabKey = 'pending' | 'coaching' | 'managed'

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

interface JobOverviewFilters {
  studentName: string
  typeFilter: '' | 'coaching' | 'managed'
  companyName: string
  currentStage: string
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})
const route = useRoute()
const router = useRouter()

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

const calendarEvents = ref<LeadMentorCalendarRecord[]>([])

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
    message.error(t('failed_to_load_job_search_overview'))
  }
}

const loadCalendar = async () => {
  try {
    const rows = await getLeadMentorJobOverviewCalendar()
    calendarEvents.value = Array.isArray(rows) ? rows : []
  } catch (_error) {
    calendarEvents.value = []
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
    message.error(t('failed_to_load_job_search_details'))
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
    message.error(t('mentor_matching_context_lost'))
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

const handleConfirmAssignMentor = async (payload: AssignMentorConfirmPayload) => {
  if (!activeAssignApplicationId.value) {
    message.error(t('mentor_matching_context_lost'))
    return
  }

  if (!payload.mentorIds.length) {
    message.error(t('please_select_at_least_1_tutor'))
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
              coachingStatus: t('coaching_in_progress'),
              mentorNames: payload.mentorNames.join(', '),
              mentorName: payload.mentorNames[0] ?? entry.mentorName,
            }
          : entry,
      ),
    }
    message.success(t('mentor_match_saved'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error(t('failed_to_save_mentor_match'))
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
    message.success(t('stage_update_confirmed'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error(t('failed_to_confirm_stage'))
  }
}

onMounted(() => {
  applyRouteFilters()
  void loadAllScopes()
  void loadCalendar()
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
    leadMentorName: row.leadMentorName || t('awaiting_mentor_assignment'),
    companyName: row.companyName || '-',
    positionName: row.positionName || '-',
    recruitmentCycle: [row.region, row.city].filter(Boolean).join(' · ') || t('pending_update'),
    interviewTime: formatDateTime(row.interviewTime),
    countdownText: buildCountdownText(row.interviewTime),
    coachingStatus: row.coachingStatus || t('pending_update'),
    mentorName: row.mentorNames || row.mentorName || t('to_be_allocated'),
    lessonHours: `${Number(row.hoursUsed ?? 0)}h`,
    applyTime: formatShortDate(row.submittedAt),
    notes: row.feedbackSummary || `${row.studentName || t('the_student')} 当前处于 ${row.currentStage || t('pending_update')} 阶段`,
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
    // §D.2 派生 status 展示（双轨制，stageUpdated 高亮保留旧行为）
    status: deriveOverviewStatusDisplay(row).label,
    statusTone: deriveOverviewStatusDisplay(row).tone,
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
    return 'green'
  }
  if (normalized.includes('reject')) {
    return 'red'
  }
  if (normalized.includes('case') || normalized.includes('first') || normalized.includes('second') || normalized.includes('round')) {
    return 'orange'
  }
  if (normalized.includes('hirevue') || normalized.includes('assessment')) {
    return 'cyan'
  }
  if (normalized.includes(t('applied'))) {
    return 'geekblue'
  }
  return 'blue'
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
  return t('needs_assistance')
}

function formatSubmittedAt(submittedAt?: string) {
  return formatDateTime(submittedAt)
}

function formatShortDate(value?: string) {
  if (!value) {
    return t('pending_update')
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value?: string) {
  if (!value) {
    return t('pending_update')
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
    return t('pending_update')
  }

  const date = new Date(interviewTime)
  if (Number.isNaN(date.getTime())) {
    return t('pending_update')
  }

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) {
    return t('ended')
  }
  if (diffDays === 0) {
    return t('today')
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
.osg-page {
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

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.job-overview-card {
  margin-bottom: 16px;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.lm-job-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  background: rgba(148, 163, 184, 0.2);
  color: var(--text2);
}

.tab-count--managed {
  background: #8b5cf6;
  color: #fff;
}

.btn-acknowledge {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
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
  flex-shrink: 0;
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

.text-danger {
  color: #ef4444;
}

:deep(.row-highlight--warning td) {
  background: #fff7ed;
}

:deep(.row-highlight--danger td) {
  background: linear-gradient(90deg, #fee2e2, #fef2f2);
}

:deep(.row-highlight--primary td) {
  background: #f3e8ff;
}

:deep(.row-highlight--info td) {
  background: #dbeafe;
}

:deep(.row-highlight--faded td) {
  opacity: 0.7;
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
  }
}
</style>


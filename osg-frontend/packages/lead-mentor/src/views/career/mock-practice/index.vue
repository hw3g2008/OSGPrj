<template>
  <div id="page-mock-practice" class="page-mock-practice osg-page">
    <PageHeader
      :title-zh="$t('simulated_application_management')"
      title-en="Mock Practice"
      :description="$t('handle_student_mock_interview_interperso')"
    />

    <a-row :gutter="12" aria-label="mock practice stats">
      <a-col v-for="item in statsCards" :key="item.label" :xs="12" :sm="12" :md="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', padding: '16px' }">
          <div class="stats-card__value" :class="item.tone">{{ item.value }}</div>
          <div class="stats-card__label">{{ item.label }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" :body-style="{ padding: 0 }" class="mock-tab-card">
      <a-tabs v-model:active-key="activeTab" type="card" class="mock-tabs">
        <!-- pending tab：LM 独有「待分配导师」 -->
        <a-tab-pane key="pending" force-render>
          <template #tab>
            <span id="mock-tab-pending" class="mock-tab-label mock-tab-label--pending">
              <ClockCircleOutlined />
              {{ $t('tutor_to_be_assigned') }}
              <span class="tab-count">{{ pendingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-pending" class="tab-pane-body">
            <a-alert
              type="warning"
              show-icon
              :message="$t('the_following_students_have_requested_mo')"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="pendingFilters.practiceType"
                  :placeholder="$t('all_types')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="pendingFilters.keyword"
                  :placeholder="`${$t('search_student_name')}/ID`"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('pending')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('pending')">
                  <template #icon><SearchOutlined /></template>
                  {{ $t('filter') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('pending')">
                  <template #icon><ReloadOutlined /></template>
                  {{ $t('reset') }}
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="pendingColumns"
              :data-source="pendingRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.pending"
              :scroll="{ x: 700 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: $t('no_pending_mock_interview_assignments') }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    size="small"
                    type="primary"
                    data-surface-trigger="modal-assign-mock"
                    @click="openAssignMock(record.practiceId)"
                  >
                    <template #icon><UserAddOutlined /></template>
                    {{ $t('assign_a_mentor') }}
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- mycoaching tab：我辅导的学员 -->
        <a-tab-pane key="mycoaching" force-render>
          <template #tab>
            <span id="mock-tab-mycoaching" class="mock-tab-label mock-tab-label--coaching">
              <BookOutlined />
              {{ $t('students_i_coach') }}
              <span class="tab-count">{{ coachingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mycoaching" class="tab-pane-body">
            <a-alert
              type="info"
              show-icon
              :message="$t('the_following_are_mock_interview_records')"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="coachingFilters.practiceType"
                  :placeholder="$t('all_types')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="状态">
                <a-select
                  v-model:value="coachingFilters.status"
                  :placeholder="$t('all_status')"
                  allow-clear
                  style="width: 140px"
                  :options="coachingStatusOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="coachingFilters.keyword"
                  :placeholder="`${$t('search_student_name')}/ID`"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('coaching')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('coaching')">
                  <template #icon><SearchOutlined /></template>
                  {{ $t('filter') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('coaching')">
                  <template #icon><ReloadOutlined /></template>
                  {{ $t('reset') }}
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="coachingColumns"
              :data-source="coachingRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.coaching"
              :scroll="{ x: 1100 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: $t('no_mock_interview_records_under_coaching') }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <span class="tag" :class="record.statusTone">
                    <i v-if="record.statusIcon" class="mdi" :class="record.statusIcon" aria-hidden="true" />
                    {{ record.status }}
                  </span>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span v-if="record.hours" class="hours-text">{{ record.hours }}</span>
                  <span v-else class="muted-text">-</span>
                </template>
                <template v-else-if="column.key === 'feedback'">
                  <a-button
                    v-if="record.actionLabel"
                    size="small"
                    type="primary"
                    @click="handleAcknowledgeAssignment(record.practiceId)"
                  >
                    <template #icon><CheckOutlined /></template>
                    {{ record.actionLabel }}
                  </a-button>
                  <button
                    v-else-if="record.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(record.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                      <div class="student-meta">{{ record.feedbackSummary }}</div>
                    </div>
                  </button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- mymanage tab：我管理的学员 -->
        <a-tab-pane key="mymanage" force-render>
          <template #tab>
            <span id="mock-tab-mymanage" class="mock-tab-label mock-tab-label--managed">
              <TeamOutlined />
              {{ $t('students_i_manage') }}
              <span class="tab-count tab-count--managed">{{ managedRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mymanage" class="tab-pane-body">
            <a-alert
              type="success"
              show-icon
              :message="`${$t('the_following_are_mock_interview_records_2')}）`"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="managedFilters.practiceType"
                  :placeholder="$t('all_types')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="状态">
                <a-select
                  v-model:value="managedFilters.status"
                  :placeholder="$t('all_status')"
                  allow-clear
                  style="width: 140px"
                  :options="managedStatusOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="managedFilters.keyword"
                  :placeholder="`${$t('search_student_name')}/ID`"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('managed')"
                />
              </a-form-item>
              <a-form-item label="导师">
                <a-input
                  v-model:value="managedFilters.mentor"
                  :placeholder="$t('search_for_tutor_name')"
                  allow-clear
                  style="width: 160px"
                  @press-enter="handleSearch('managed')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('managed')">
                  <template #icon><SearchOutlined /></template>
                  {{ $t('filter') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('managed')">
                  <template #icon><ReloadOutlined /></template>
                  {{ $t('reset') }}
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="managedColumns"
              :data-source="managedRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.managed"
              :scroll="{ x: 1200 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: $t('no_mock_interview_records_for_managed_st') }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <span class="tag" :class="record.statusTone">{{ record.status }}</span>
                </template>
                <template v-else-if="column.key === 'mentor'">
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ record.mentorName }}</div>
                    <div class="student-meta">{{ record.mentorMeta }}</div>
                  </div>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span class="hours-text">{{ record.hours }}</span>
                </template>
                <template v-else-if="column.key === 'feedback'">
                  <button
                    v-if="record.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(record.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                      <div class="student-meta">{{ record.feedbackSummary }}</div>
                    </div>
                  </button>
                  <div v-else class="feedback-stack">
                    <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                    <div class="student-meta">{{ record.feedbackSummary }}</div>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

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
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag, StudentAvatarCell } from '@osg/shared/components'
import { message } from 'ant-design-vue'
import {
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
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
// §D.2 LM mock-practice 状态显示接入 SSOT composable
import { deriveMockPracticeStatus } from '@osg/shared/composables'
import AssignMockModal, { type AssignMockPreview } from '@/components/AssignMockModal.vue'
import LeadMockFeedbackModal, { type MockFeedbackPreview } from '@/components/LeadMockFeedbackModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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

const loading = reactive<Record<ScopeKey, boolean>>({
  pending: false,
  coaching: false,
  managed: false,
})

interface ScopeFilters {
  practiceType?: string
  status?: string
  keyword?: string
  mentor?: string
}

const pendingFilters = reactive<ScopeFilters>({})
const coachingFilters = reactive<ScopeFilters>({})
const managedFilters = reactive<ScopeFilters>({})

const practiceTypeOptions = [
  { value: t('mock_interview'), label: t('mock_interview') },
  { value: t('interpersonal_test'), label: t('interpersonal_test') },
  { value: t('midterm_exam'), label: t('midterm_exam') },
]

const coachingStatusOptions = [
  { value: 'new_assignment', label: t('newly_assigned') },
  { value: 'pending', label: t('pending_2') },
  { value: 'completed', label: t('completed') },
  { value: 'cancelled', label: t('canceled') },
]

const managedStatusOptions = [
  { value: 'pending', label: t('pending_2') },
  { value: 'ongoing', label: t('in_progress') },
  { value: 'completed', label: t('completed') },
  { value: 'cancelled', label: t('canceled') },
]

const pendingColumns = [
  { title: t('student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('application_time'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('operation'), key: 'action', width: 140, fixed: 'right' as const },
]

const coachingColumns = [
  { title: t('student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('application_time'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('status'), key: 'status', dataIndex: 'status', width: 130 },
  { title: t('already_in_class'), key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: t('course_feedback'), key: 'feedback', dataIndex: 'feedback', width: 220 },
]

const managedColumns = [
  { title: t('student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('application_time'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('status'), key: 'status', dataIndex: 'status', width: 110 },
  { title: t('coaching_mentor'), key: 'mentor', dataIndex: 'mentor', width: 180 },
  { title: t('already_in_class'), key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: t('course_feedback'), key: 'feedback', dataIndex: 'feedback', width: 220 },
]

const statsCards = computed<StatsCard[]>(() => [
  { label: t('pending'), value: stats.value.pendingCount || 0, tone: 'stats-card__value--warning' },
  { label: t('arranged'), value: stats.value.scheduledCount || 0, tone: 'stats-card__value--info' },
  { label: t('completed'), value: stats.value.completedCount || 0, tone: 'stats-card__value--success' },
  { label: t('canceled'), value: stats.value.cancelledCount || 0, tone: 'stats-card__value--muted' },
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

function buildScopeFilters(scope: ScopeKey): ScopeFilters {
  if (scope === 'pending') return pendingFilters
  if (scope === 'coaching') return coachingFilters
  return managedFilters
}

const loadScope = async (scope: ScopeKey) => {
  loading[scope] = true
  try {
    const filters = buildScopeFilters(scope)
    const response = await getLeadMentorMockPracticeList({
      scope,
      keyword: filters.keyword,
      practiceType: filters.practiceType,
      status: filters.status,
    })
    return Array.isArray(response?.rows) ? response.rows : []
  } finally {
    loading[scope] = false
  }
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
    message.error(t('failed_to_load_mock_interview_data'))
  }
}

async function handleSearch(scope: ScopeKey) {
  try {
    const rows = await loadScope(scope)
    scopeRows.value = { ...scopeRows.value, [scope]: rows }
  } catch (_error) {
    message.error(t('filter_failed_please_try_again_later'))
  }
}

async function handleReset(scope: ScopeKey) {
  const filters = buildScopeFilters(scope)
  filters.practiceType = undefined
  filters.status = undefined
  filters.keyword = undefined
  filters.mentor = undefined
  await handleSearch(scope)
}

const openMockFeedback = async (practiceId: number) => {
  try {
    const detail = await getLeadMentorMockPracticeDetail(practiceId)
    selectedFeedback.value = buildFeedbackPreview(detail)
    isFeedbackModalOpen.value = true
  } catch (_error) {
    selectedFeedback.value = null
    isFeedbackModalOpen.value = false
    message.error(t('failed_to_load_mock_feedback'))
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
    message.error(t('failed_to_load_mock_interview_details'))
  }
}

const handleAssignMockConfirm = async () => {
  if (!activeAssignPracticeId.value || !activeAssignDetail.value) {
    message.error(t('assignment_context_lost'))
    return
  }

  const payload = collectAssignPayload(activeAssignDetail.value)
  if (!payload.mentorIds.length) {
    message.error(t('please_select_at_least_1_tutor'))
    return
  }
  if (!payload.scheduledAt) {
    message.error(t('appointment_time_cannot_be_empty'))
    return
  }

  try {
    await assignLeadMentorMockPractice(activeAssignPracticeId.value, payload)
    isAssignMockModalOpen.value = false
    message.success(t('mentor_assignment_saved'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error(t('failed_to_save_mentor_assignment'))
  }
}

const handleAcknowledgeAssignment = async (practiceId: number) => {
  try {
    await acknowledgeLeadMentorMockPractice(practiceId)
    message.success(t('assignment_confirmation_saved'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error(t('failed_to_confirm_assignment'))
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
    // §D.3 SSOT：通过 deriveMockPracticeStatus 派生 label，不再读后端 statusLabel
    status: deriveMockPracticeStatus({ status: row.status, completedHours: row.completedHours }).label || row.status || '-',
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
    feedbackSummary: row.feedbackSummary || (row.isNewAssignment ? '等待导师确认' : t('awaiting_additional_mentor_feedback')),
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
  const feedbackSummary = detail.feedbackSummary || detail.note || t('no_feedback_yet')
  const suggestions = splitSuggestions(detail.note)

  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    sessionTime: formatDateTime(detail.scheduledAt || detail.submittedAt, 'YYYY-MM-DD HH:mm'),
    mentorName: detail.mentorNames || '-',
    // §D.3 SSOT：详情 status 走 composable 派生
    status: deriveMockPracticeStatus({ status: detail.status, completedHours: detail.completedHours }).label || detail.status || '-',
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
  if (normalized === t('mock_interview')) {
    return { typeTone: 'tag--info', typeIcon: 'mdi-account-voice', rowTone: 'mock-row--blue' }
  }
  if (normalized === t('interpersonal_test')) {
    return { typeTone: 'tag--warning', typeIcon: 'mdi-account-group', rowTone: 'mock-row--amber' }
  }
  if (normalized === t('midterm_exam')) {
    return { typeTone: 'tag--purple', typeIcon: 'mdi-file-document-edit', rowTone: 'mock-row--purple' }
  }
  return { typeTone: 'tag--info', typeIcon: 'mdi-clipboard-text', rowTone: 'mock-row--blue' }
}

/**
 * §D.2 LM mock-practice 状态显示派生（接入 SSOT composable）
 *
 * tone 映射：composable 5 态 → LM 现有 tag 类名（tag--success/info/warning/danger/muted）
 * 保留 isNewAssignment 高亮分支（业务特有，覆盖 SSOT 派生）
 */
function resolveStatusUi(row: LeadMentorMockPracticeItem) {
  if (row.isNewAssignment) {
    return { statusTone: 'tag--danger', statusIcon: 'mdi-bell-ring' }
  }

  const display = deriveMockPracticeStatus({
    status: row.status,
    completedHours: row.completedHours,
    // plannedHours 未出现于 LeadMentorMockPracticeItem，留空让 composable 兑底
  })

  // tone 映射 composable → LM tag class
  const toneClassMap: Record<'success' | 'info' | 'warning' | 'danger' | 'default', string> = {
    success: 'tag--success',
    info: 'tag--info',
    warning: 'tag--warning',
    danger: 'tag--danger',
    default: 'tag--muted',
  }
  const toneClass = toneClassMap[display.tone]

  // icon 派生：基于 5 态
  const iconMap: Record<'pending' | 'assigned' | 'coaching' | 'completed' | 'cancelled', string> = {
    completed: 'mdi-check-circle',
    coaching: 'mdi-check-decagram',
    cancelled: 'mdi-close-circle',
    assigned: 'mdi-clock-outline',
    pending: 'mdi-clock-outline',
  }

  return { statusTone: toneClass, statusIcon: iconMap[display.value] || 'mdi-clock-outline' }
}

function resolveFeedbackTitle(row: Pick<LeadMentorMockPracticeItem, 'feedbackRating' | 'status' | 'completedHours'>) {
  const rating = normalizeScore(row.feedbackRating)
  if (rating >= 5) {
    return t('excellent')
  }
  if (rating >= 4) {
    return t('good')
  }
  if (rating >= 3) {
    return t('needs_improvement_2')
  }
  // §D.3 SSOT：兜底走 composable 派生
  return deriveMockPracticeStatus({ status: row.status, completedHours: row.completedHours }).label || row.status || t('pending_feedback')
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
    return t('mentor_recommends_proceeding_to_the_next')
  }
  return t('recommended_to_complete_a_targeted_train')
}

function splitSuggestions(note?: string) {
  const items = (note || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length) {
    return items
  }

  return [t('continue_high_frequency_question_trainin')]
}

function formatMentorDemand(count?: number) {
  const resolved = Number(count ?? 0)
  return resolved > 0 ? `期望${resolved}位导师` : t('pending_mentor_confirmation_count')
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
/* ---- 顶层布局 ---- */
.page-mock-practice {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- Stats 卡片：色 tone ---- */
.stats-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}
.stats-card__value--warning { color: #F59E0B; }
.stats-card__value--info    { color: #3B82F6; }
.stats-card__value--success { color: #22C55E; }
.stats-card__value--muted   { color: var(--muted); }
.stats-card__label {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}

/* ---- Tab 卡 ---- */
.mock-tab-card { margin-bottom: 0; }
.mock-tabs :deep(.ant-tabs-tab) { padding: 8px 16px; }
.mock-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mock-tab-label--pending {
  color: #DC2626;
}
.mock-tab-label--coaching {
  color: var(--primary, #3b82f6);
}
.mock-tab-label--managed {
  color: #8B5CF6;
}
.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  font-size: 10px;
}
.tab-count--managed {
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
}
.tab-pane-body {
  padding: 12px 16px 16px;
}
.mock-filters {
  margin-bottom: 12px;
}
.mock-filters :deep(.ant-form-item) {
  margin-bottom: 8px;
}

/* ---- 行 tone（按 practiceType / isNewAssignment） ---- */
:deep(.mock-row--blue)   { background: #F0F9FF; }
:deep(.mock-row--amber)  { background: #FFFBEB; }
:deep(.mock-row--purple) { background: #F3E8FF; }
:deep(.mock-row--new) {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  box-shadow: inset 4px 0 0 #EF4444;
}

/* ---- mentor-stack 在其他 cell 还用 ---- */
.mentor-stack__name {
  color: var(--text);
  font-weight: 600;
}
.date-text {
  font-size: 12px;
}

/* ---- 业务 tag tone（type / status） ---- */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.tag--info    { background: #DBEAFE; color: #1D4ED8; }
.tag--warning { background: #FEF3C7; color: #B45309; }
.tag--success { background: #DCFCE7; color: #166534; }
.tag--danger  { background: #EF4444; color: #fff; }
.tag--muted   { background: #F3F4F6; color: #6B7280; }
.tag--purple  { background: #8B5CF6; color: #fff; }

.hours-text {
  color: var(--primary);
  font-weight: 600;
}
.muted-text {
  color: var(--muted);
}

/* ---- 反馈栈（trigger 包裹） ---- */
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
.feedback-stack__title--success { color: #059669; }
.feedback-stack__title--warning { color: #D97706; }
.feedback-stack__title--muted   { color: var(--muted); }

.mentor-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>


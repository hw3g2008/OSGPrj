<template>
  <div id="page-mock-practice" class="page-mock-practice osg-page">
    <PageHeader
      :title-zh="t('leadMentor.mockPractice.pageTitle')"
      title-en="Mock Practice"
    />

    <a-card :bordered="false" :body-style="{ padding: 0 }" class="mock-tab-card">
      <a-tabs v-model:active-key="activeTab" type="card" class="mock-tabs">
        <!-- mymanage tab -->
        <a-tab-pane key="mymanage" force-render>
          <template #tab>
            <span id="mock-tab-mymanage" class="mock-tab-label mock-tab-label--managed">
              <TeamOutlined />
              {{ t('leadMentor.mockPractice.tab.managed') }}
              <span class="tab-count tab-count--managed">{{ managedRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mymanage" class="tab-pane-body">
            <a-alert
              type="success"
              show-icon
              :message="t('leadMentor.mockPractice.alert.managed')"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item :label="t('leadMentor.mockPractice.filter.type')">
                <a-select
                  v-model:value="managedFilters.practiceType"
                  :placeholder="t('leadMentor.mockPractice.filter.allTypes')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('managed')">
                  <template #icon><SearchOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.search') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('managed')">
                  <template #icon><ReloadOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.reset') }}
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
              :locale="{ emptyText: t('leadMentor.mockPractice.empty.managed') }"
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
        <!-- mycoaching tab -->
        <a-tab-pane key="mycoaching" force-render>
          <template #tab>
            <span id="mock-tab-mycoaching" class="mock-tab-label mock-tab-label--coaching">
              <BookOutlined />
              {{ t('leadMentor.mockPractice.tab.coaching') }}
              <span class="tab-count">{{ coachingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mycoaching" class="tab-pane-body">
            <a-alert
              type="info"
              show-icon
              :message="t('leadMentor.mockPractice.alert.coaching')"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item :label="t('leadMentor.mockPractice.filter.type')">
                <a-select
                  v-model:value="coachingFilters.practiceType"
                  :placeholder="t('leadMentor.mockPractice.filter.allTypes')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('coaching')">
                  <template #icon><SearchOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.search') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('coaching')">
                  <template #icon><ReloadOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.reset') }}
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
              :locale="{ emptyText: t('leadMentor.mockPractice.empty.coaching') }"
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
                  <div class="table-actions">
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
                    <a-button size="small" @click="openClassReportFromPractice(record)">
                      {{ t('leadMentor.mockPractice.actions.reportLesson') }}
                    </a-button>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- pending tab -->
        <a-tab-pane key="pending" force-render>
          <template #tab>
            <span id="mock-tab-pending" class="mock-tab-label mock-tab-label--pending">
              <ClockCircleOutlined />
              {{ t('leadMentor.mockPractice.tab.pending') }}
              <span class="tab-count">{{ pendingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-pending" class="tab-pane-body">
            <a-alert
              type="warning"
              show-icon
              :message="t('leadMentor.mockPractice.alert.pending')"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item :label="t('leadMentor.mockPractice.filter.type')">
                <a-select
                  v-model:value="pendingFilters.practiceType"
                  :placeholder="t('leadMentor.mockPractice.filter.allTypes')"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('pending')">
                  <template #icon><SearchOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.search') }}
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('pending')">
                  <template #icon><ReloadOutlined /></template>
                  {{ t('leadMentor.mockPractice.filter.reset') }}
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
              :locale="{ emptyText: t('leadMentor.mockPractice.empty.pending') }"
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
                    {{ t('leadMentor.mockPractice.actions.assignMentor') }}
                  </a-button>
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

    <LeadMentorClassReportFlowModal
      v-model:visible="classReportVisible"
      :prefilled-student-id="classReportPrefill?.prefilledStudentId"
      :prefilled-reference-type="classReportPrefill?.prefilledReferenceType"
      :prefilled-reference-id="classReportPrefill?.prefilledReferenceId"
      :readonly-fields="classReportPrefill?.readonlyFields ?? emptyClassReportReadonlyFields"
      @submitted="handleClassReportSubmitted"
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
import { useI18n } from 'vue-i18n'
import {
  acknowledgeLeadMentorMockPractice,
  assignLeadMentorMockPractice,
  getLeadMentorMockPracticeDetail,
  getLeadMentorMockPracticeList,
  type LeadMentorMockPracticeItem,
  type LeadMentorMockPracticeScope,
} from '@osg/shared/api'
// §D.2 LM mock-practice 状态显示接入 SSOT composable // i18n-skip-line: code comment
import { deriveMockPracticeStatus } from '@osg/shared/composables'
import type { ReferenceType } from '@osg/shared/types/classReport'
import AssignMockModal, { type AssignMockPreview } from '@/components/AssignMockModal.vue'
import LeadMockFeedbackModal, { type MockFeedbackPreview } from '@/components/LeadMockFeedbackModal.vue'
import LeadMentorClassReportFlowModal from '../../teaching/class-records/LeadMentorClassReportFlowModal.vue'

const { t } = useI18n()

type MockTab = 'pending' | 'mycoaching' | 'mymanage'
type ScopeKey = LeadMentorMockPracticeScope

// Backend data values — must match API enum values; not translated
const PRACTICE_TYPE_MOCK = '模拟面试' // i18n-skip-line: backend data comparison
const PRACTICE_TYPE_RELATION = '人际关系测试' // i18n-skip-line: backend data comparison
const PRACTICE_TYPE_MIDTERM = '期中考试' // i18n-skip-line: backend data comparison

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

const activeTab = ref<MockTab>('mymanage')
const isAssignMockModalOpen = ref(false)
const selectedAssignPreview = ref<AssignMockPreview | null>(null)
const activeAssignPracticeId = ref<number | null>(null)
const activeAssignDetail = ref<LeadMentorMockPracticeItem | null>(null)
const isFeedbackModalOpen = ref(false)
const selectedFeedback = ref<MockFeedbackPreview | null>(null)
const classReportVisible = ref(false)
const classReportPrefill = ref<{
  prefilledStudentId: number
  prefilledReferenceType: ReferenceType
  prefilledReferenceId: number
  readonlyFields: Array<'student' | 'reference'>
} | null>(null)
const emptyClassReportReadonlyFields: Array<'student' | 'reference'> = []
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

const practiceTypeOptions = computed(() => [
  { value: PRACTICE_TYPE_MOCK, label: t('leadMentor.mockPractice.practiceType.mockInterview') },
  { value: PRACTICE_TYPE_RELATION, label: t('leadMentor.mockPractice.practiceType.relationTest') },
  { value: PRACTICE_TYPE_MIDTERM, label: t('leadMentor.mockPractice.practiceType.midterm') },
])

const pendingColumns = computed(() => [
  { title: t('leadMentor.mockPractice.col.student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('leadMentor.mockPractice.col.type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('leadMentor.mockPractice.col.appliedAt'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('leadMentor.mockPractice.col.actions'), key: 'action', width: 140, fixed: 'right' as const },
])

const coachingColumns = computed(() => [
  { title: t('leadMentor.mockPractice.col.student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('leadMentor.mockPractice.col.type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('leadMentor.mockPractice.col.appliedAt'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('leadMentor.mockPractice.col.status'), key: 'status', dataIndex: 'status', width: 130 },
  { title: t('leadMentor.mockPractice.col.lessonHours'), key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: t('leadMentor.mockPractice.col.feedback'), key: 'feedback', dataIndex: 'feedback', width: 220 },
])

const managedColumns = computed(() => [
  { title: t('leadMentor.mockPractice.col.student'), key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: t('leadMentor.mockPractice.col.type'), key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: t('leadMentor.mockPractice.col.appliedAt'), key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: t('leadMentor.mockPractice.col.status'), key: 'status', dataIndex: 'status', width: 110 },
  { title: t('leadMentor.mockPractice.col.mentor'), key: 'mentor', dataIndex: 'mentor', width: 180 },
  { title: t('leadMentor.mockPractice.col.lessonHours'), key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: t('leadMentor.mockPractice.col.feedback'), key: 'feedback', dataIndex: 'feedback', width: 220 },
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
    const params: { scope: ScopeKey; practiceType?: string } = { scope }
    if (filters.practiceType) {
      params.practiceType = filters.practiceType
    }
    const response = await getLeadMentorMockPracticeList(params)
    return Array.isArray(response?.rows) ? response.rows : []
  } finally {
    loading[scope] = false
  }
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
    isAssignMockModalOpen.value = false
    selectedAssignPreview.value = null
    activeAssignPracticeId.value = null
    activeAssignDetail.value = null
    isFeedbackModalOpen.value = false
    selectedFeedback.value = null
    message.error(t('leadMentor.mockPractice.messages.loadFailed'))
  }
}

async function handleSearch(scope: ScopeKey) {
  try {
    const rows = await loadScope(scope)
    scopeRows.value = { ...scopeRows.value, [scope]: rows }
  } catch (_error) {
  }
}

async function handleReset(scope: ScopeKey) {
  const filters = buildScopeFilters(scope)
  filters.practiceType = undefined
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
    message.error(t('leadMentor.mockPractice.messages.feedbackLoadFailed'))
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
    message.error(t('leadMentor.mockPractice.messages.detailLoadFailed'))
  }
}

const openClassReportFromPractice = (record: PracticeRow) => {
  const referenceType = resolveReferenceType(record.practiceType)
  classReportPrefill.value = {
    prefilledStudentId: record.studentId,
    prefilledReferenceType: referenceType,
    prefilledReferenceId: record.practiceId,
    readonlyFields: ['student', 'reference'],
  }
  classReportVisible.value = true
}

const handleClassReportSubmitted = () => {
  classReportVisible.value = false
  void loadAllScopes()
}

const handleAssignMockConfirm = async () => {
  if (!activeAssignPracticeId.value || !activeAssignDetail.value) {
    message.error(t('leadMentor.mockPractice.messages.assignContextLost'))
    return
  }

  const payload = collectAssignPayload(activeAssignDetail.value)
  if (!payload.mentorIds.length) {
    message.error(t('leadMentor.mockPractice.messages.assignSelectMentor'))
    return
  }
  if (!payload.scheduledAt) {
    message.error(t('leadMentor.mockPractice.messages.scheduledTimeRequired'))
    return
  }
  const requestedMentorCount = Number(activeAssignDetail.value.requestedMentorCount ?? 0)
  if (requestedMentorCount > 0 && payload.mentorIds.length !== requestedMentorCount) {
    message.error(t('leadMentor.mockPractice.messages.assignCountMismatch'))
    return
  }

  try {
    await assignLeadMentorMockPractice(activeAssignPracticeId.value, payload)
    isAssignMockModalOpen.value = false
    message.success(t('leadMentor.mockPractice.messages.assignSuccess'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
  }
}

const handleAcknowledgeAssignment = async (practiceId: number) => {
  try {
    await acknowledgeLeadMentorMockPractice(practiceId)
    message.success(t('leadMentor.mockPractice.messages.acknowledgeSuccess'))
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
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
    status: deriveMockPracticeStatus({ status: row.status, completedHours: row.completedHours }).label || row.status || '-',
    statusTone: statusUi.statusTone,
    statusIcon: statusUi.statusIcon,
    hours: scope === 'managed' ? (row.completedHoursLabel || '-') : (row.completedHoursLabel || ''),
    actionLabel: scope === 'coaching' && row.isNewAssignment ? t('leadMentor.mockPractice.actions.confirm') : undefined,
    actionTone: scope === 'coaching' && row.isNewAssignment ? 'btn btn-sm btn-success' : undefined,
    actionIcon: scope === 'coaching' && row.isNewAssignment ? 'mdi-check' : undefined,
    mentorName: row.mentorNames || '-',
    mentorMeta: row.mentorBackgrounds || '-',
    feedbackTitle,
    feedbackTone,
    feedbackSummary: row.feedbackSummary || (row.isNewAssignment ? t('leadMentor.mockPractice.feedback.waitingConfirm') : t('leadMentor.mockPractice.feedback.waitingFeedback')),
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
  const feedbackSummary = detail.feedbackSummary || detail.note || t('leadMentor.mockPractice.feedback.noFeedback')
  const suggestions = splitSuggestions(detail.note)

  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    sessionTime: formatDateTime(detail.scheduledAt || detail.submittedAt, 'YYYY-MM-DD HH:mm'),
    mentorName: detail.mentorNames || '-',
    status: deriveMockPracticeStatus({ status: detail.status, completedHours: detail.completedHours }).label || detail.status || '-',
    score: normalizeScore(detail.feedbackRating),
    scoreLabel: resolveFeedbackTitle(detail),
    actualDuration: detail.completedHoursLabel || '-',
    feedback: feedbackSummary,
    suggestions,
    recommendation: buildRecommendation(detail),
    classRecords: (detail.classRecords ?? []).map((record) => ({
      recordId: record.recordId,
      classDate: formatDateTime(record.classDate, 'YYYY-MM-DD HH:mm'),
      mentorName: record.mentorName || '-',
      durationHours: formatDuration(record.durationHours),
      memberStatus: record.memberStatus || '-',
      rate: record.rate || '-',
      feedback: record.feedback || '-',
      status: record.status || '-',
    })),
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
  if (normalized === PRACTICE_TYPE_MOCK) { // i18n-skip-line: backend data comparison
    return { typeTone: 'tag--info', typeIcon: 'mdi-account-voice', rowTone: 'mock-row--blue' }
  }
  if (normalized === PRACTICE_TYPE_RELATION) { // i18n-skip-line: backend data comparison
    return { typeTone: 'tag--warning', typeIcon: 'mdi-account-group', rowTone: 'mock-row--amber' }
  }
  if (normalized === PRACTICE_TYPE_MIDTERM) { // i18n-skip-line: backend data comparison
    return { typeTone: 'tag--purple', typeIcon: 'mdi-file-document-edit', rowTone: 'mock-row--purple' }
  }
  return { typeTone: 'tag--info', typeIcon: 'mdi-clipboard-text', rowTone: 'mock-row--blue' }
}

function resolveStatusUi(row: LeadMentorMockPracticeItem) {
  if (row.isNewAssignment) {
    return { statusTone: 'tag--danger', statusIcon: 'mdi-bell-ring' }
  }

  const display = deriveMockPracticeStatus({
    status: row.status,
    completedHours: row.completedHours,
  })

  const toneClassMap: Record<'success' | 'info' | 'warning' | 'danger' | 'default', string> = {
    success: 'tag--success',
    info: 'tag--info',
    warning: 'tag--warning',
    danger: 'tag--danger',
    default: 'tag--muted',
  }
  const toneClass = toneClassMap[display.tone]

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
    return t('leadMentor.mockPractice.feedback.excellent')
  }
  if (rating >= 4) {
    return t('leadMentor.mockPractice.feedback.good')
  }
  if (rating >= 3) {
    return t('leadMentor.mockPractice.feedback.needsImprovement')
  }
  return deriveMockPracticeStatus({ status: row.status, completedHours: row.completedHours }).label || row.status || t('leadMentor.mockPractice.feedback.pending')
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
    return t('leadMentor.mockPractice.recommendation.continueNext')
  }
  return t('leadMentor.mockPractice.recommendation.needMoreTraining')
}

function splitSuggestions(note?: string) {
  const items = (note || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length) {
    return items
  }

  return [t('leadMentor.mockPractice.feedback.defaultSuggestion')]
}

function formatMentorDemand(count?: number) {
  const resolved = Number(count ?? 0)
  return resolved > 0 ? t('leadMentor.mockPractice.mentorDemand.count', { count: resolved }) : t('leadMentor.mockPractice.mentorDemand.tbd')
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

function formatDuration(value?: number) {
  const hours = Number(value ?? 0)
  if (!Number.isFinite(hours) || hours <= 0) {
    return '-'
  }
  return `${hours}h`
}

function resolveReferenceType(practiceType?: string): ReferenceType {
  const normalized = (practiceType || '').trim()
  if (normalized === PRACTICE_TYPE_MOCK || normalized === 'mock_interview') { // i18n-skip-line: backend data comparison
    return 'mock_interview'
  }
  if (normalized === PRACTICE_TYPE_RELATION || normalized === 'relation_test') { // i18n-skip-line: backend data comparison
    return 'relation_test'
  }
  return 'communication_test'
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
/* ---- top layout ---- */
.page-mock-practice {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- Stats card: color tone ---- */
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

/* ---- Tab card ---- */
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

/* ---- Row tone (by practiceType / isNewAssignment) ---- */
:deep(.mock-row--blue)   { background: #F0F9FF; }
:deep(.mock-row--amber)  { background: #FFFBEB; }
:deep(.mock-row--purple) { background: #F3E8FF; }
:deep(.mock-row--new) {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  box-shadow: inset 4px 0 0 #EF4444;
}

/* ---- mentor-stack ---- */
.mentor-stack__name {
  color: var(--text);
  font-weight: 600;
}
.date-text {
  font-size: 12px;
}

/* ---- Business tag tone (type / status) ---- */
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

/* ---- Feedback stack (trigger wrapper) ---- */
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

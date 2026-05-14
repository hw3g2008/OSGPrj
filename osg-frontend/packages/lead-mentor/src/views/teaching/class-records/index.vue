<template>
  <div id="page-myclass" class="page-class-records">
    <PageHeader
      :title-zh="$t('course_records')"
      title-en="Class Records"
      :description="`${$t('view_and_submit_session_records_includin')}）`"
    >
      <template #actions>
        <button
          type="button"
          class="btn btn-primary"
          data-surface-trigger="modal-lm-report"
          @click="openReportModal()"
        >
          <i class="mdi mdi-plus" aria-hidden="true" />
          {{ $t('submit_course_record') }}
        </button>
      </template>
    </PageHeader>

    <div class="scope-switch">
      <button
        id="lm-class-tab-mine"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'mine' }"
        @click="activeScope = 'mine'"
      >
        <i class="mdi mdi-account" aria-hidden="true" />
        {{ $t('my_submissions') }}
        <span class="scope-count">{{ mineRows.length }}</span>
      </button>
      <button
        id="lm-class-tab-managed"
        type="button"
        class="scope-button"
        :class="{ active: activeScope === 'managed' }"
        @click="activeScope = 'managed'"
      >
        <i class="mdi mdi-account-group" aria-hidden="true" />
        {{ $t('students_i_manage') }}
        <span class="scope-count scope-count--muted">{{ managedRows.length }}</span>
      </button>
    </div>

    <section
      id="lm-class-content-mine"
      class="scope-panel"
      :style="{ display: activeScope === 'mine' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in mineTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.mine === tab.value }"
          @click="activeStatuses.mine = tab.value"
        >
          {{ tab.label }}
          <span v-if="typeof tab.count === 'number'" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              class="form-input"
              type="text"
              :placeholder="scopeSections.mine.searchPlaceholder"
              readonly
            />
            <select class="form-select">
              <option
                v-for="option in scopeSections.mine.filterOptions.coachingTypes"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select form-select--wide">
              <option
                v-for="option in scopeSections.mine.filterOptions.courseContents"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select">
              <option
                v-for="option in scopeSections.mine.filterOptions.timeRanges"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button type="button" class="btn btn-outline btn-sm btn-reset" @click="showUpcomingToast()">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              {{ $t('reset') }}
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ $t('record') }}ID</th>
                  <th>{{ $t('student') }}</th>
                  <th>{{ $t('coaching_content') }}</th>
                  <th>{{ $t('course_content') }}</th>
                  <th>{{ $t('course_date') }}</th>
                  <th>{{ $t('duration') }}</th>
                  <th>{{ $t('session_fee') }}</th>
                  <th>{{ $t('review_status') }}</th>
                  <th>{{ $t('student_feedback') }}</th>
                  <th>{{ $t('operation') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleMineRows" :key="row.recordId">
                  <td>{{ row.recordId }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="row.coachingTone">{{ row.coachingLabel }}</span>
                      <span class="detail-text">{{ row.coachingDetail }}</span>
                    </div>
                  </td>
                  <td><span class="tag" :class="row.contentTone">{{ row.contentLabel }}</span></td>
                  <td>{{ row.classDate }}</td>
                  <td>{{ row.duration }}</td>
                  <td>{{ row.feeLabel }}</td>
                  <td><ClassRecordStatusTag :status="row.status" :label="row.statusLabel" /></td>
                  <td>
                    <span v-if="row.ratingLabel" class="tag tag--success">{{ row.ratingLabel }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-text btn-sm"
                      :data-surface-trigger="row.actionSurface"
                      @click="handleRowAction(row)"
                    >
                      {{ row.actionLabel }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <section
      id="lm-class-content-managed"
      class="scope-panel"
      :style="{ display: activeScope === 'managed' ? 'block' : 'none' }"
    >
      <div class="tabs">
        <button
          v-for="tab in managedTabs"
          :key="tab.value"
          type="button"
          class="tab"
          :class="{ active: activeStatuses.managed === tab.value }"
          @click="activeStatuses.managed = tab.value"
        >
          {{ tab.label }}
          <span v-if="typeof tab.count === 'number'" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <section class="card">
        <div class="card-body">
          <div class="filter-row">
            <input
              class="form-input"
              type="text"
              :placeholder="scopeSections.managed.searchPlaceholder"
              readonly
            />
            <select class="form-select">
              <option
                v-for="option in scopeSections.managed.filterOptions.reporters"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select">
              <option
                v-for="option in scopeSections.managed.filterOptions.coachingTypes"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <select class="form-select form-select--wide">
              <option
                v-for="option in scopeSections.managed.filterOptions.courseContents"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <button type="button" class="btn btn-outline btn-sm btn-reset" @click="showUpcomingToast()">
              <i class="mdi mdi-filter-variant" aria-hidden="true" />
              {{ $t('reset') }}
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ $t('record') }}ID</th>
                  <th>{{ $t('student') }}</th>
                  <th>{{ $t('submitter') }}</th>
                  <th>{{ $t('coaching_content') }}</th>
                  <th>{{ $t('course_content') }}</th>
                  <th>{{ $t('course_date') }}</th>
                  <th>{{ $t('duration') }}</th>
                  <th>{{ $t('review_status') }}</th>
                  <th>{{ $t('student_feedback') }}</th>
                  <th>{{ $t('operation') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleManagedRows" :key="row.recordId">
                  <td>{{ row.recordId }}</td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.studentName }}</strong>
                      <span class="meta-text">ID: {{ row.studentId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <strong>{{ row.reporterName }}</strong>
                      <span class="meta-text">{{ $t('mentor') }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="stack-cell">
                      <span class="tag" :class="row.coachingTone">{{ row.coachingLabel }}</span>
                      <span class="detail-text">{{ row.coachingDetail }}</span>
                    </div>
                  </td>
                  <td><span class="tag" :class="row.contentTone">{{ row.contentLabel }}</span></td>
                  <td>{{ row.classDate }}</td>
                  <td>{{ row.duration }}</td>
                  <td><ClassRecordStatusTag :status="row.status" :label="row.statusLabel" /></td>
                  <td>
                    <span v-if="row.ratingLabel" class="tag tag--success">{{ row.ratingLabel }}</span>
                    <span v-else class="meta-text">-</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-text btn-sm"
                      :data-surface-trigger="row.actionSurface"
                      @click="handleRowAction(row)"
                    >
                      {{ row.actionLabel }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>

    <LeadMentorClassReportFlowModal
      v-model="isReportModalOpen"
      :students="reportStudentOptions"
      :students-loading="reportStudentsLoading"
      :submitting="isSubmittingReport"
      :prefill-student-id="reportPrefillStudentId"
      @submit="handleReportSubmit"
    />
    <LeadMentorClassDetailModal v-model="isClassDetailModalOpen" :preview="activeClassDetailPreview" />
    <LeadMentorClassDetailResumeModal
      v-model="isClassDetailResumeModalOpen"
      :preview="activeClassDetailResumePreview"
    />
    <LeadMentorClassDetailNetworkingModal
      v-model="isClassDetailNetworkingModalOpen"
      :preview="activeClassDetailNetworkingPreview"
    />
    <LeadMentorClassDetailRegularModal
      v-model="isClassDetailRegularModalOpen"
      :preview="activeClassDetailRegularPreview"
    />
    <LeadMentorClassRejectModal
      v-model="isClassRejectModalOpen"
      :preview="activeClassRejectPreview"
      @resubmit="handleRejectResubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ClassRecordStatusTag } from '@osg/shared/components'
import { message } from 'ant-design-vue'
import type {
  LeadMentorClassRecordCreatePayload,
  LeadMentorClassRecordCreateResponse,
  LeadMentorClassRecordRow,
  LeadMentorClassRecordStats,
  LeadMentorStudentListItem,
} from '@osg/shared/api'
import {
  createLeadMentorClassRecord,
  getLeadMentorClassRecordList,
  getLeadMentorClassRecordStats,
  getLeadMentorStudentList,
} from '@osg/shared/api'
import LeadMentorClassDetailModal from '@/components/LeadMentorClassDetailModal.vue'
import LeadMentorClassDetailNetworkingModal from '@/components/LeadMentorClassDetailNetworkingModal.vue'
import LeadMentorClassDetailRegularModal from '@/components/LeadMentorClassDetailRegularModal.vue'
import LeadMentorClassDetailResumeModal from '@/components/LeadMentorClassDetailResumeModal.vue'
import LeadMentorClassRejectModal from '@/components/LeadMentorClassRejectModal.vue'
import LeadMentorClassReportFlowModal from './LeadMentorClassReportFlowModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
type ScopeKey = 'mine' | 'managed'
type StatusKey = 'all' | 'pending' | 'approved' | 'rejected'

interface ClassRecordRow {
  recordId: string
  studentName: string
  studentId: string
  coachingLabel: string
  coachingTone: string
  coachingDetail: string
  contentLabel: string
  contentTone: string
  classDate: string
  duration: string
  feeLabel?: string
  status: Exclude<StatusKey, 'all'>
  statusLabel: string
  statusTone: string
  ratingLabel?: string
  reporterName?: string
  actionLabel: string
  actionSurface: string
}

interface ScopeSection {
  searchPlaceholder: string
  filterOptions: {
    reporters?: string[]
    coachingTypes: string[]
    courseContents: string[]
    timeRanges?: string[]
  }
}

interface ScopeTabConfig {
  value: StatusKey
  label: string
  count?: number
}

interface ClassDetailPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  scoreLabel: string
  sectionTitle: string
  performanceLabel: string
  performanceText: string
  overallLabel: string
  overallValue: string
  interviewTypeLabel: string
  interviewTypeValue: string
  suggestionLabel: string
  suggestionLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailResumePreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  changeLabel: string
  changeLines: string[]
  completionLabel: string
  completionValue: string
  suggestionLabel: string
  suggestionLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailNetworkingPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  progressLabel: string
  progressText: string
  contactNameLabel: string
  contactNameValue: string
  contactRoleLabel: string
  contactRoleValue: string
  followUpLabel: string
  followUpLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassDetailRegularPreview {
  title: string
  studentName: string
  studentId: string
  courseLabel: string
  classSchedule: string
  duration: string
  statusLabel: string
  sectionTitle: string
  lessonLabel: string
  lessonLines: string[]
  performanceLabel: string
  performanceText: string
  nextPlanLabel: string
  nextPlanLines: string[]
  mentorName: string
  submittedAt: string
}

interface ClassRejectPreview {
  title: string
  studentName: string
  studentId: string
  courseTypeLabel: string
  courseTypeValue: string
  classTimeLabel: string
  classTimeValue: string
  submittedDurationLabel: string
  submittedDurationValue: string
  reasonTitle: string
  reasonText: string
  reviewerName: string
  rejectedAt: string
}

interface ReportStudentOption {
  value: string
  label: string
}

const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})

const scopeSections: Record<ScopeKey, ScopeSection> = {
  mine: {
    searchPlaceholder: '搜索学员姓名/ID...',
    filterOptions: {
      coachingTypes: [t('coaching_type'), t('position_coaching'), t('mock_application')],
      courseContents: [t('course_content'), t('new_resume'), t('resume_update'), 'Case准备', t('mock_interview'), t('networking_midterm_exam'), t('mock_midterm_exam'), 'Behavioral', 'Technical', t('other')],
      timeRanges: [t('time_range'), t('this_week'), t('last_week'), t('this_month')],
    },
  },
  managed: {
    searchPlaceholder: '搜索学员姓名/ID...',
    filterOptions: {
      reporters: [t('submitter'), 'Jerry Li', 'Mike Chen', 'Sarah Wang'],
      coachingTypes: [t('coaching_type'), t('position_coaching'), t('mock_application')],
      courseContents: [t('course_content'), t('new_resume'), t('resume_update'), 'Case准备', t('mock_interview'), t('networking_midterm_exam'), t('mock_midterm_exam'), t('other')],
    },
  },
}


const contentLabelMap: Record<string, string> = {
  resume_revision: t('new_resume'),
  resume_update: t('resume_update'),
  case_prep: 'Case准备',
  mock_interview: t('mock_interview'),
  networking_midterm: t('networking_midterm_exam'),
  mock_midterm: t('mock_midterm_exam'),
  behavioral: 'Behavioral',
  technical: 'Technical',
  other: t('other'),
}

const contentToneMap: Record<string, string> = {
  resume_revision: 'tag--info',
  resume_update: 'tag--resume',
  case_prep: 'tag--case',
  mock_interview: 'tag--success',
  networking_midterm: 'tag--purple',
  mock_midterm: 'tag--midterm',
  behavioral: 'tag--case',
  technical: 'tag--case',
  other: 'tag--info',
}

const activeScope = ref<ScopeKey>('mine')
const isReportModalOpen = ref(false)
const isClassDetailModalOpen = ref(false)
const isClassDetailResumeModalOpen = ref(false)
const isClassDetailNetworkingModalOpen = ref(false)
const isClassDetailRegularModalOpen = ref(false)
const isClassRejectModalOpen = ref(false)
const activeClassDetailPreview = ref<ClassDetailPreview | null>(null)
const activeClassDetailResumePreview = ref<ClassDetailResumePreview | null>(null)
const activeClassDetailNetworkingPreview = ref<ClassDetailNetworkingPreview | null>(null)
const activeClassDetailRegularPreview = ref<ClassDetailRegularPreview | null>(null)
const activeClassRejectPreview = ref<ClassRejectPreview | null>(null)
const activeStatuses = reactive<Record<ScopeKey, StatusKey>>({
  mine: 'all',
  managed: 'all',
})
const mineRows = ref<ClassRecordRow[]>([])
const managedRows = ref<ClassRecordRow[]>([])
const statsSummary = ref<LeadMentorClassRecordStats | null>(null)
const isLoadingRecords = ref(false)
const loadErrorMessage = ref('')
const reportStudentOptions = ref<ReportStudentOption[]>([])
const reportStudentsLoading = ref(false)
const reportStudentsLoaded = ref(false)
const reportPrefillStudentId = ref<string | null>(null)
const isSubmittingReport = ref(false)

const mineTabs = computed(() => buildScopeTabs(mineRows.value))
const managedTabs = computed(() => buildScopeTabs(managedRows.value))
const visibleMineRows = computed(() => filterRows(mineRows.value, activeStatuses.mine))
const visibleManagedRows = computed(() => filterRows(managedRows.value, activeStatuses.managed))

function buildScopeTabs(rows: ClassRecordRow[]): ScopeTabConfig[] {
  return [
    { value: 'all', label: t('all'), count: rows.length },
    { value: 'pending', label: t('pending_review'), count: countRowsByStatus(rows, 'pending') },
    { value: 'approved', label: t('approved'), count: countRowsByStatus(rows, 'approved') },
    { value: 'rejected', label: t('rejected_3'), count: countRowsByStatus(rows, 'rejected') },
  ]
}

function countRowsByStatus(rows: ClassRecordRow[], status: Exclude<StatusKey, 'all'>) {
  return rows.filter((row) => row.status === status).length
}

function filterRows(rows: ClassRecordRow[], status: StatusKey) {
  if (status === 'all') {
    return rows
  }
  return rows.filter((row) => row.status === status)
}

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function formatRecordId(value: number | string) {
  const text = String(value)
  return text.startsWith('#') ? text : `#R${text}`
}

function formatDisplayDate(value: string) {
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${month}/${day}/${year}`
  }

  return value
}

function formatDuration(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}h`
}

function resolveCoachingMeta(courseType: string) {
  if (normalizeKey(courseType) === 'mock_practice') {
    return {
      coachingLabel: t('mock_application'),
      coachingTone: 'tag--success',
    }
  }

  return {
    coachingLabel: t('position_coaching'),
    coachingTone: 'tag--info',
  }
}

function resolveContentMeta(classStatus: string) {
  const normalized = normalizeKey(classStatus)
  return {
    contentLabel: contentLabelMap[normalized] ?? classStatus,
    contentTone: contentToneMap[normalized] ?? 'tag--info',
  }
}

function resolveActionSurface(classStatus: string) {
  const normalized = normalizeKey(classStatus)
  if (normalized === 'resume_revision' || normalized === 'resume_update') {
    return 'modal-class-detail-resume'
  }
  if (normalized === 'networking_midterm') {
    return 'modal-class-detail-networking'
  }
  if (normalized === 'behavioral' || normalized === 'technical' || normalized === 'other') {
    return 'modal-class-detail-regular'
  }
  return 'modal-class-detail'
}

function resolveCoachingDetail(payload: LeadMentorClassRecordCreateResponse) {
  const firstTopicLine = payload.topics?.split('\n').find((line) => line.trim())
  if (firstTopicLine) {
    return firstTopicLine.trim()
  }

  const normalizedStatus = normalizeKey(payload.classStatus)
  if (normalizedStatus === 'mock_interview') {
    return t('mock_interview_mentor_submission')
  }
  if (normalizedStatus === 'networking_midterm') {
    return t('networking_midterm_exam')
  }
  if (normalizedStatus === 'mock_midterm') {
    return t('mock_midterm_exam')
  }
  return t('mentor_actual_submission')
}

function buildRowFromList(row: LeadMentorClassRecordRow): ClassRecordRow {
  const coachingMeta = resolveCoachingMeta(row.courseType ?? '')
  const contentMeta = resolveContentMeta(row.classStatus ?? '')
  const status = normalizeKey(row.status)
  const normalizedStatus = status === 'approved' || status === 'rejected' ? status : 'pending'
  const statusMeta =
    normalizedStatus === 'approved'
      ? { statusLabel: t('approved'), statusTone: 'tag--success' }
      : normalizedStatus === 'rejected'
        ? { statusLabel: t('rejected_3'), statusTone: 'tag--danger' }
        : { statusLabel: t('pending_review'), statusTone: 'tag--warning' }

  return {
    recordId: formatRecordId(row.recordId),
    studentName: row.studentName ?? '',
    studentId: String(row.studentId ?? ''),
    coachingLabel: coachingMeta.coachingLabel,
    coachingTone: coachingMeta.coachingTone,
    coachingDetail: row.feedbackContent?.split('\n').find((line) => line.trim())?.trim() ?? '—',
    contentLabel: contentMeta.contentLabel,
    contentTone: contentMeta.contentTone,
    classDate: row.classDate ? formatDisplayDate(row.classDate) : '—',
    duration: row.durationHours != null ? formatDuration(row.durationHours) : '—',
    feeLabel: row.courseFee ? `¥${row.courseFee}` : undefined,
    status: normalizedStatus,
    statusLabel: statusMeta.statusLabel,
    statusTone: statusMeta.statusTone,
    ratingLabel: row.studentRating ? `⭐ ${row.studentRating}` : undefined,
    reporterName: row.mentorName ?? undefined,
    actionLabel: normalizedStatus === 'rejected' ? '查看原因' : t('view_details'),
    actionSurface: normalizedStatus === 'rejected' ? 'modal-class-reject' : resolveActionSurface(row.classStatus ?? ''),
  }
}

async function loadRows() {
  if (isLoadingRecords.value) return
  isLoadingRecords.value = true
  loadErrorMessage.value = ''
  try {
    const tab = activeStatuses[activeScope.value]
    const filters = {
      tab: tab !== 'all' ? tab : undefined,
      scope: activeScope.value,
    }
    const [listResponse, statsResponse] = await Promise.all([
      getLeadMentorClassRecordList(filters),
      getLeadMentorClassRecordStats({ scope: activeScope.value }),
    ])
    const mappedRows = (listResponse.rows ?? []).map(buildRowFromList)
    if (activeScope.value === 'mine') {
      mineRows.value = mappedRows
    } else {
      managedRows.value = mappedRows
    }
    statsSummary.value = statsResponse
  } catch (error) {
    loadErrorMessage.value = error instanceof Error ? error.message : t('failed_to_load_session_records')
  } finally {
    isLoadingRecords.value = false
  }
}

function buildCreatedRow(payload: LeadMentorClassRecordCreateResponse): ClassRecordRow {
  const coachingMeta = resolveCoachingMeta(payload.courseType)
  const contentMeta = resolveContentMeta(payload.classStatus)
  const status = normalizeKey(payload.status)
  const normalizedStatus = status === 'approved' || status === 'rejected' ? status : 'pending'
  const statusMeta =
    normalizedStatus === 'approved'
      ? { statusLabel: t('approved'), statusTone: 'tag--success' }
      : normalizedStatus === 'rejected'
        ? { statusLabel: t('rejected_3'), statusTone: 'tag--danger' }
        : { statusLabel: t('pending_review'), statusTone: 'tag--warning' }

  return {
    recordId: formatRecordId(payload.recordId),
    studentName: payload.studentName,
    studentId: String(payload.studentId),
    coachingLabel: coachingMeta.coachingLabel,
    coachingTone: coachingMeta.coachingTone,
    coachingDetail: resolveCoachingDetail(payload),
    contentLabel: contentMeta.contentLabel,
    contentTone: contentMeta.contentTone,
    classDate: formatDisplayDate(payload.classDate),
    duration: formatDuration(payload.durationHours),
    feeLabel: t('pending_review'),
    status: normalizedStatus,
    statusLabel: statusMeta.statusLabel,
    statusTone: statusMeta.statusTone,
    actionLabel: normalizedStatus === 'rejected' ? '查看原因' : t('view_details'),
    actionSurface: normalizedStatus === 'rejected' ? 'modal-class-reject' : resolveActionSurface(payload.classStatus),
  }
}

function upsertRows(rows: ClassRecordRow[], nextRow: ClassRecordRow) {
  return [nextRow, ...rows.filter((row) => row.recordId !== nextRow.recordId)]
}

async function ensureReportStudentsLoaded(force = false) {
  if (reportStudentsLoaded.value && !force) {
    return
  }

  reportStudentsLoading.value = true
  try {
    const { rows } = await getLeadMentorStudentList()
    reportStudentOptions.value = (rows ?? []).map((student: LeadMentorStudentListItem) => ({
      value: String(student.studentId),
      label: `${student.studentName ?? `学员 ${student.studentId}`} (${student.studentId})`,
    }))
    reportStudentsLoaded.value = true
  } catch {
    reportStudentOptions.value = []
    reportStudentsLoaded.value = false
  } finally {
    reportStudentsLoading.value = false
  }
}

function openReportModal(prefillStudentId: string | null = null) {
  reportPrefillStudentId.value = prefillStudentId
  isReportModalOpen.value = true
  void ensureReportStudentsLoaded()
}

async function handleReportSubmit(payload: LeadMentorClassRecordCreatePayload) {
  isSubmittingReport.value = true
  try {
    const created = await createLeadMentorClassRecord(payload)
    const createdMineRow = buildCreatedRow(created)
    const createdManagedRow: ClassRecordRow = {
      ...createdMineRow,
      reporterName: created.mentorName,
    }

    mineRows.value = upsertRows(mineRows.value, createdMineRow)
    managedRows.value = upsertRows(managedRows.value, createdManagedRow)
    activeScope.value = 'mine'
    activeStatuses.mine = 'all'
    activeStatuses.managed = 'all'
    reportPrefillStudentId.value = null
    isReportModalOpen.value = false
    message.success(`已提交课程记录 ${createdMineRow.recordId}，等待审核`)
    void loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : t('failed_to_submit_session_record'))
  } finally {
    isSubmittingReport.value = false
  }
}

function handleRowAction(row: ClassRecordRow) {
  if (row.actionSurface === 'modal-class-detail') {
    activeClassDetailPreview.value = createMockInterviewDetailPreview(row)
    isClassDetailModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-resume') {
    activeClassDetailResumePreview.value = createResumeDetailPreview(row)
    isClassDetailResumeModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-networking') {
    activeClassDetailNetworkingPreview.value = createNetworkingDetailPreview(row)
    isClassDetailNetworkingModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-detail-regular') {
    activeClassDetailRegularPreview.value = createRegularDetailPreview(row)
    isClassDetailRegularModalOpen.value = true
    return
  }

  if (row.actionSurface === 'modal-class-reject') {
    activeClassRejectPreview.value = createRejectPreview(row)
    isClassRejectModalOpen.value = true
    return
  }

  showUpcomingToast()
}

function handleRejectResubmit() {
  const prefillStudentId = activeClassRejectPreview.value?.studentId ?? null
  isClassRejectModalOpen.value = false
  openReportModal(prefillStudentId)
}

function createMockInterviewDetailPreview(row: ClassRecordRow): ClassDetailPreview {
  return {
    title: t('mock_interview_feedback_details'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Mock Interview',
    classSchedule: `${row.classDate} 14:00`,
    duration: row.duration,
    scoreLabel: 'Great · 85分',
    sectionTitle: t('mock_interview_feedback'),
    performanceLabel: t('interview_performance'),
    performanceText:
      '学生在模拟面试中表现良好，回答问题逻辑清晰，表达流畅。对DCF和LBO基础知识掌握扎实，能够清晰解释估值方法。行为面试部分STAR法则运用得当。',
    overallLabel: t('overall_score'),
    overallValue: '4分 - 良好，稍加练习',
    interviewTypeLabel: t('interview_type'),
    interviewTypeValue: t('technical_interview'),
    suggestionLabel: t('improvement_suggestions'),
    suggestionLines: [
      t('needs_to_strengthen_knowledge_of_the_tmt'),
      t('recommend_preparing_more_advanced_lbo_sc'),
      t('be_mindful_of_response_time_avoid_over_e'),
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 16:30`,
  }
}

function createResumeDetailPreview(row: ClassRecordRow): ClassDetailResumePreview {
  return {
    title: t('resume_revision_feedback_details'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Resume Review',
    classSchedule: `${row.classDate} 10:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: t('resume_revision_feedback'),
    changeLabel: t('key_revisions'),
    changeLines: [
      t('optimized_work_experience_descriptions_w'),
      t('adjusted_project_experience_layout_to_hi'),
      t('streamlined_the_skills_section_by_removi'),
      t('revised_personal_summary_to_better_refle'),
    ],
    completionLabel: t('completion_assessment'),
    completionValue: '80% - 基本完成，需微调',
    suggestionLabel: t('follow_up_recommendations'),
    suggestionLines: [
      t('recommend_tailoring_the_resume_for_diffe'),
      t('consider_adding_consulting_related_extra'),
      '下次重点修改Cover Letter',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 11:30`,
  }
}

function createNetworkingDetailPreview(row: ClassRecordRow): ClassDetailNetworkingPreview {
  return {
    title: t('networking_feedback_details'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Networking',
    classSchedule: `${row.classDate} 16:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: t('networking_feedback'),
    progressLabel: t('networking_summary'),
    progressText:
      '本次帮助学生联系了高盛IBD部门的VP，进行了30分钟的Coffee Chat。讨论了IBD的日常工作、招聘流程和面试准备建议。VP对学生印象良好，表示可以帮忙内推。',
    contactNameLabel: t('contact_name'),
    contactNameValue: t('manager_zhang'),
    contactRoleLabel: t('contact_company_title'),
    contactRoleValue: '高盛 / VP',
    followUpLabel: t('follow_up_plan'),
    followUpLines: [
      t('send_a_thank_you_email_in_one_week'),
      t('prepare_referral_application_materials'),
      t('continue_monitoring_goldman_sachs_recrui'),
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRegularDetailPreview(row: ClassRecordRow): ClassDetailRegularPreview {
  return {
    title: t('regular_coaching_feedback_details'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Technical Training',
    classSchedule: `${row.classDate} 15:00`,
    duration: row.duration,
    statusLabel: 'Great · 88分',
    sectionTitle: t('regular_coaching_feedback'),
    lessonLabel: t('session_content'),
    lessonLines: [
      t('covered_the_fundamental_principles_of_th'),
      t('practiced_excel_modeling_and_completed_a'),
      t('reviewed_key_metrics_for_financial_state'),
      t('introduced_comparable_company_analysis_m'),
    ],
    performanceLabel: t('student_performance_2'),
    performanceText:
      '学生学习态度认真，课堂参与度高。对财务概念理解较快，Excel操作熟练。但在WACC计算部分还需要加强理解。',
    nextPlanLabel: t('next_session_plan'),
    nextPlanLines: [
      t('deep_dive_into_wacc_calculation_methods'),
      t('complete_a_full_lbo_model_exercise'),
      t('assign_homework_analyze_the_financial_st'),
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRejectPreview(row: ClassRecordRow): ClassRejectPreview {
  return {
    title: t('session_review_rejected'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseTypeLabel: t('course_type'),
    courseTypeValue: 'Case Study',
    classTimeLabel: t('session_time'),
    classTimeValue: '12/10/2025 14:00',
    submittedDurationLabel: t('submitted_duration'),
    submittedDurationValue: '1.5h',
    reasonTitle: t('rejection_reason_2'),
    reasonText: '课程时长与学员反馈不符，学员反馈实际上课时间为1小时。请核实后重新提交。',
    reviewerName: '课时审核员 Admin',
    rejectedAt: '12/11/2025 10:30',
  }
}

onMounted(() => {
  void loadRows()
})

watch(
  () => activeScope.value,
  () => {
    void loadRows()
  },
)

watch(
  () => [activeStatuses.mine, activeStatuses.managed],
  () => {
    void loadRows()
  },
)
</script>

<style scoped lang="scss">
.page-class-records {
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
  margin: 8px 0 0;
  color: var(--text2);
  font-size: 14px;
}

.scope-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scope-button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.scope-button.active {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}

.scope-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

.scope-button:not(.active) .scope-count {
  background: var(--bg);
}

.scope-count--muted {
  color: inherit;
}

.tabs {
  display: inline-flex;
  background: var(--bg);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  color: var(--text2);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tab.active {
  background: var(--primary);
  color: #fff;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f59e0b;
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
}

.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  margin-bottom: 20px;
  overflow: hidden;
}

.card-body {
  padding: 22px;
}

.card-body--table {
  padding: 0;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.form-input,
.form-select {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 14px;
  border-radius: 10px;
  min-height: 44px;
}

.form-input {
  width: 180px;
  padding: 12px 14px;
}

.form-select {
  padding: 10px 36px 10px 12px;
  min-width: 140px;
}

.form-select--wide {
  min-width: 180px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-outline {
  background: #fff;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 44px;
}

.btn-text {
  background: transparent;
  color: var(--primary);
  padding: 6px 12px;
}

.btn-reset {
  min-height: 44px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table thead th {
  padding: 14px 16px;
  text-align: left;
  color: var(--text2);
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.table tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
  color: var(--text);
  white-space: nowrap;
}

.stack-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-text {
  color: var(--muted);
  font-size: 12px;
}

.detail-text {
  color: var(--text);
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.tag--info {
  background: #e0f2fe;
  color: #0369a1;
}

.tag--success {
  background: #dcfce7;
  color: #15803d;
}

.tag--warning {
  background: #fef3c7;
  color: #92400e;
}

.tag--danger {
  background: #fee2e2;
  color: #dc2626;
}

.tag--case {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag--resume {
  background: #fef3c7;
  color: #92400e;
}

.tag--purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.tag--midterm {
  background: #f59e0b;
  color: #fff;
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
  }

  .scope-switch {
    flex-wrap: wrap;
  }

  .filter-row {
    align-items: stretch;
  }

  .form-input,
  .form-select,
  .form-select--wide {
    width: 100%;
    min-width: 0;
  }
}
</style>


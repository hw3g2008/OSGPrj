<template>
  <div id="page-myclass" class="page-class-records">
    <PageHeader
      :title-zh="t('leadMentor.classRecords.pageTitle')"
      title-en="Class Records"
    >
      <template #actions>
        <button
          type="button"
          class="btn btn-primary"
          data-surface-trigger="modal-lm-report"
          @click="openReportModal()"
        >
          <i class="mdi mdi-plus" aria-hidden="true" />
          {{ t('leadMentor.classRecords.actions.report') }}
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
        {{ t('leadMentor.classRecords.scope.mine') }}
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
        {{ t('leadMentor.classRecords.scope.managed') }}
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
              {{ t('leadMentor.classRecords.filter.reset') }}
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ t('leadMentor.classRecords.table.recordId') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.student') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.coachingType') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.courseContent') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.classDate') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.duration') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.reviewStatus') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.studentRating') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.actions') }}</th>
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
              {{ t('leadMentor.classRecords.filter.reset') }}
            </button>
          </div>
        </div>

        <div class="card-body card-body--table">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ t('leadMentor.classRecords.table.recordId') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.student') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.reporter') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.coachingType') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.courseContent') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.classDate') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.duration') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.reviewStatus') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.studentRating') }}</th>
                  <th>{{ t('leadMentor.classRecords.table.actions') }}</th>
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
                      <span class="meta-text">{{ t('leadMentor.classRecords.table.mentor') }}</span>
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
      :visible="isReportModalOpen"
      :prefilled-student-id="reportPrefillStudentNumericId"
      @update:visible="isReportModalOpen = $event"
      @submitted="handleReportSubmitted"
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
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ClassRecordStatusTag } from '@osg/shared/components'
import { message } from 'ant-design-vue'
import type {
  LeadMentorClassRecordRow,
  LeadMentorClassRecordStats,
  LeadMentorStudentListItem,
} from '@osg/shared/api'
import {
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
  accountStatus?: string
  disabled?: boolean
}

const { t } = useI18n()
const showUpcomingToast = inject<() => void>('showUpcomingToast', () => {})

const scopeSections = computed<Record<ScopeKey, ScopeSection>>(() => ({
  mine: {
    searchPlaceholder: t('leadMentor.classRecords.filter.searchPlaceholder'),
    filterOptions: {
      coachingTypes: [t('leadMentor.classRecords.filter.coachingType'), t('leadMentor.classRecords.coaching.jobCoaching'), t('leadMentor.classRecords.coaching.mockPractice')],
      courseContents: [t('leadMentor.classRecords.filter.courseContent'), t('leadMentor.classRecords.course.resumeRevision'), t('leadMentor.classRecords.course.resumeUpdate'), t('leadMentor.classRecords.course.casePrep'), t('leadMentor.classRecords.course.mockInterview'), t('leadMentor.classRecords.course.networkingMidterm'), t('leadMentor.classRecords.course.mockMidterm'), t('leadMentor.classRecords.course.behavioral'), t('leadMentor.classRecords.course.technical'), t('leadMentor.classRecords.course.other')],
      timeRanges: [t('leadMentor.classRecords.filter.timeRange'), t('leadMentor.classRecords.filter.thisWeek'), t('leadMentor.classRecords.filter.lastWeek'), t('leadMentor.classRecords.filter.thisMonth')],
    },
  },
  managed: {
    searchPlaceholder: t('leadMentor.classRecords.filter.searchPlaceholder'),
    filterOptions: {
      reporters: [t('leadMentor.classRecords.filter.reporter'), 'Jerry Li', 'Mike Chen', 'Sarah Wang'],
      coachingTypes: [t('leadMentor.classRecords.filter.coachingType'), t('leadMentor.classRecords.coaching.jobCoaching'), t('leadMentor.classRecords.coaching.mockPractice')],
      courseContents: [t('leadMentor.classRecords.filter.courseContent'), t('leadMentor.classRecords.course.resumeRevision'), t('leadMentor.classRecords.course.resumeUpdate'), t('leadMentor.classRecords.course.casePrep'), t('leadMentor.classRecords.course.mockInterview'), t('leadMentor.classRecords.course.networkingMidterm'), t('leadMentor.classRecords.course.mockMidterm'), t('leadMentor.classRecords.course.other')],
    },
  },
}))

function getContentLabelMap(): Record<string, string> {
  return {
    resume_revision: t('leadMentor.classRecords.course.resumeRevision'),
    resume_update: t('leadMentor.classRecords.course.resumeUpdate'),
    case_prep: t('leadMentor.classRecords.course.casePrep'),
    mock_interview: t('leadMentor.classRecords.course.mockInterview'),
    networking_midterm: t('leadMentor.classRecords.course.networkingMidterm'),
    mock_midterm: t('leadMentor.classRecords.course.mockMidterm'),
    behavioral: t('leadMentor.classRecords.course.behavioral'),
    technical: t('leadMentor.classRecords.course.technical'),
    other: t('leadMentor.classRecords.course.other'),
  }
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

const mineTabs = computed(() => buildScopeTabs(mineRows.value))
const managedTabs = computed(() => buildScopeTabs(managedRows.value))
const reportPrefillStudentNumericId = computed(() =>
  reportPrefillStudentId.value ? Number(reportPrefillStudentId.value) : undefined,
)
const visibleMineRows = computed(() => filterRows(mineRows.value, activeStatuses.mine))
const visibleManagedRows = computed(() => filterRows(managedRows.value, activeStatuses.managed))

function buildScopeTabs(rows: ClassRecordRow[]): ScopeTabConfig[] {
  return [
    { value: 'all', label: t('leadMentor.classRecords.status.all'), count: rows.length },
    { value: 'pending', label: t('leadMentor.classRecords.status.pending'), count: countRowsByStatus(rows, 'pending') },
    { value: 'approved', label: t('leadMentor.classRecords.status.approved'), count: countRowsByStatus(rows, 'approved') },
    { value: 'rejected', label: t('leadMentor.classRecords.status.rejected'), count: countRowsByStatus(rows, 'rejected') },
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
      coachingLabel: t('leadMentor.classRecords.coaching.mockPractice'),
      coachingTone: 'tag--success',
    }
  }

  return {
    coachingLabel: t('leadMentor.classRecords.coaching.jobCoaching'),
    coachingTone: 'tag--info',
  }
}

function resolveContentMeta(classStatus: string) {
  const normalized = normalizeKey(classStatus)
  return {
    contentLabel: getContentLabelMap()[normalized] ?? classStatus,
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

function buildRowFromList(row: LeadMentorClassRecordRow): ClassRecordRow {
  const coachingMeta = resolveCoachingMeta(row.courseType ?? '')
  const contentMeta = resolveContentMeta(row.classStatus ?? '')
  const status = normalizeKey(row.status)
  const normalizedStatus = status === 'approved' || status === 'rejected' ? status : 'pending'
  const statusMeta =
    normalizedStatus === 'approved'
      ? { statusLabel: t('leadMentor.classRecords.status.approved'), statusTone: 'tag--success' }
      : normalizedStatus === 'rejected'
        ? { statusLabel: t('leadMentor.classRecords.status.rejected'), statusTone: 'tag--danger' }
        : { statusLabel: t('leadMentor.classRecords.status.pending'), statusTone: 'tag--warning' }

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
    actionLabel: normalizedStatus === 'rejected' ? t('leadMentor.classRecords.actions.viewReason') : t('leadMentor.classRecords.actions.viewDetail'),
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
    loadErrorMessage.value = error instanceof Error ? error.message : t('leadMentor.classRecords.error.loadFailed')
  } finally {
    isLoadingRecords.value = false
  }
}

async function ensureReportStudentsLoaded(force = false) {
  if (reportStudentsLoaded.value && !force) {
    return
  }

  reportStudentsLoading.value = true
  try {
    const { rows } = await getLeadMentorStudentList()
    reportStudentOptions.value = (rows ?? []).map((student: LeadMentorStudentListItem) => {
      // status=1 冻结 / status=3 退费 → 后端会拒绝申报，前端先 disable 防呆并加状态后缀
      const blocked = student.accountStatus === '1' || student.accountStatus === '3'
      const statusSuffix = student.accountStatus === '1'
        ? t('leadMentor.classRecords.studentStatus.frozen')
        : student.accountStatus === '3'
          ? t('leadMentor.classRecords.studentStatus.refunded')
          : student.accountStatus === '2'
            ? t('leadMentor.classRecords.studentStatus.ended')
            : ''
      return {
        value: String(student.studentId),
        label: `${student.studentName ?? t('leadMentor.classRecords.studentStatus.defaultName', { id: student.studentId })} (${student.studentId})${statusSuffix}`,
        accountStatus: student.accountStatus,
        disabled: blocked,
      }
    })
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

function handleReportSubmitted(recordId: number) {
  activeScope.value = 'mine'
  activeStatuses.mine = 'all'
  activeStatuses.managed = 'all'
  reportPrefillStudentId.value = null
  isReportModalOpen.value = false
  message.success(t('leadMentor.classRecords.messages.submitSuccess', { id: recordId }))
  void loadRows()
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
    title: t('leadMentor.classRecords.detail.mock.title'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Mock Interview',
    classSchedule: `${row.classDate} 14:00`,
    duration: row.duration,
    scoreLabel: 'Great · 85',
    sectionTitle: t('leadMentor.classRecords.detail.mock.sectionTitle'),
    performanceLabel: t('leadMentor.classRecords.detail.mock.performanceLabel'),
    performanceText:
      'Student performed well in the mock interview — clear logic and fluent delivery. Strong grasp of DCF/LBO fundamentals and can explain valuation methods clearly. STAR method applied well in behavioral questions.',
    overallLabel: t('leadMentor.classRecords.detail.mock.overallLabel'),
    overallValue: '4 - Good, minor improvements needed',
    interviewTypeLabel: t('leadMentor.classRecords.detail.mock.interviewTypeLabel'),
    interviewTypeValue: 'Technical Interview',
    suggestionLabel: t('leadMentor.classRecords.detail.mock.suggestionLabel'),
    suggestionLines: [
      'Strengthen knowledge of the TMT sector',
      'Prepare more advanced LBO scenarios',
      'Control answer length — avoid over-explaining simple concepts',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 16:30`,
  }
}

function createResumeDetailPreview(row: ClassRecordRow): ClassDetailResumePreview {
  return {
    title: t('leadMentor.classRecords.detail.resume.title'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Resume Review',
    classSchedule: `${row.classDate} 10:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: t('leadMentor.classRecords.detail.resume.sectionTitle'),
    changeLabel: t('leadMentor.classRecords.detail.resume.changeLabel'),
    changeLines: [
      'Optimized work experience descriptions with quantified results',
      'Restructured project section to highlight key achievements',
      'Streamlined skills section, removed unrelated content',
      'Revised personal statement to better reflect career goals',
    ],
    completionLabel: t('leadMentor.classRecords.detail.resume.completionLabel'),
    completionValue: '80% - Mostly done, minor adjustments needed',
    suggestionLabel: t('leadMentor.classRecords.detail.resume.suggestionLabel'),
    suggestionLines: [
      'Tailor resume versions for different target companies',
      'Add consulting-related extracurricular activities',
      'Focus on Cover Letter revision next session',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 11:30`,
  }
}

function createNetworkingDetailPreview(row: ClassRecordRow): ClassDetailNetworkingPreview {
  return {
    title: t('leadMentor.classRecords.detail.networking.title'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Networking',
    classSchedule: `${row.classDate} 16:00`,
    duration: row.duration,
    statusLabel: 'Great',
    sectionTitle: t('leadMentor.classRecords.detail.networking.sectionTitle'),
    progressLabel: t('leadMentor.classRecords.detail.networking.progressLabel'),
    progressText:
      'Helped student connect with a GS IBD VP for a 30-min coffee chat. Covered IBD daily work, recruitment process, and interview tips. VP had a positive impression and offered to refer.',
    contactNameLabel: t('leadMentor.classRecords.detail.networking.contactNameLabel'),
    contactNameValue: 'Manager Zhang',
    contactRoleLabel: t('leadMentor.classRecords.detail.networking.contactRoleLabel'),
    contactRoleValue: 'Goldman Sachs / VP',
    followUpLabel: t('leadMentor.classRecords.detail.networking.followUpLabel'),
    followUpLines: [
      'Send thank-you email in one week',
      'Prepare referral application materials',
      'Monitor Goldman Sachs recruitment updates',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRegularDetailPreview(row: ClassRecordRow): ClassDetailRegularPreview {
  return {
    title: t('leadMentor.classRecords.detail.regular.title'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseLabel: 'Technical Training',
    classSchedule: `${row.classDate} 15:00`,
    duration: row.duration,
    statusLabel: 'Great · 88',
    sectionTitle: t('leadMentor.classRecords.detail.regular.sectionTitle'),
    lessonLabel: t('leadMentor.classRecords.detail.regular.lessonLabel'),
    lessonLines: [
      'Covered DCF valuation fundamentals',
      'Practiced Excel modeling — completed a basic DCF model',
      'Reviewed key financial statement metrics',
      'Introduced comparable company analysis',
    ],
    performanceLabel: t('leadMentor.classRecords.detail.regular.performanceLabel'),
    performanceText:
      'Student is diligent and highly engaged in class. Grasps financial concepts quickly and is proficient in Excel. WACC calculation section needs further reinforcement.',
    nextPlanLabel: t('leadMentor.classRecords.detail.regular.nextPlanLabel'),
    nextPlanLines: [
      'Deep-dive into WACC calculation methods',
      'Complete a full LBO model exercise',
      'Homework: analyze a publicly listed company financial statement',
    ],
    mentorName: row.reporterName ?? 'Test Mentor',
    submittedAt: `${row.classDate} 17:30`,
  }
}

function createRejectPreview(row: ClassRecordRow): ClassRejectPreview {
  return {
    title: t('leadMentor.classRecords.detail.reject.title'),
    studentName: row.studentName,
    studentId: row.studentId,
    courseTypeLabel: t('leadMentor.classRecords.detail.reject.courseTypeLabel'),
    courseTypeValue: 'Case Study',
    classTimeLabel: t('leadMentor.classRecords.detail.reject.classTimeLabel'),
    classTimeValue: '12/10/2025 14:00',
    submittedDurationLabel: t('leadMentor.classRecords.detail.reject.submittedDurationLabel'),
    submittedDurationValue: '1.5h',
    reasonTitle: t('leadMentor.classRecords.detail.reject.reasonTitle'),
    reasonText: 'Session duration does not match student feedback — student reported actual session was 1 hour. Please verify and resubmit.',
    reviewerName: 'Admin Reviewer',
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

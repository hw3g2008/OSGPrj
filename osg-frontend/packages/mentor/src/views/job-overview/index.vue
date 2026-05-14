<template>
  <a-config-provider :auto-insert-space-in-button="false">
    <div id="page-job-overview" class="osg-page">
      <PageHeader
        :title-zh="$t('overview_of_student_job_search')"
        title-en="Job Overview"
        :description="$t('view_job_search_progress_of_my_coached_s')"
      >
        <template #actions>
          <a-button @click="handleExport">
            <template #icon><ExportOutlined /></template>
            {{ $t('export') }}
          </a-button>
        </template>
      </PageHeader>

      <InterviewCalendar :events="allCalendarEvents" @event-click="openCalendarHighlight" />

      <a-row :gutter="16" class="stats-row">
        <a-col :span="6"><StatCard label="新分配" :value="stats.newCount" color="#EF4444" /></a-col>
        <a-col :span="6"><StatCard label="待进行" :value="stats.pendingCount" color="#3B82F6" /></a-col>
        <a-col :span="6"><StatCard label="已完成" :value="stats.completedCount" color="#22C55E" /></a-col>
        <a-col :span="6"><StatCard label="已取消" :value="stats.cancelledCount" color="#94A3B8" /></a-col>
      </a-row>

      <div class="filter-row">
        <a-input
          v-model:value="draftKeyword"
          :placeholder="`${$t('search_student_name')}...`"
          allow-clear
          style="width: 180px"
          @press-enter="applySearch"
        />
        <a-select
          v-model:value="selectedCompany"
          :placeholder="$t('all_companies')"
          allow-clear
          style="width: 140px"
        >
          <a-select-option v-for="c in companies" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="selectedStatus"
          :placeholder="$t('all_status')"
          allow-clear
          style="width: 140px"
        >
          <a-select-option value="new">{{ $t('new_application') }}</a-select-option>
          <a-select-option value="coaching">{{ $t('during_the_interview') }}</a-select-option>
          <a-select-option value="completed">{{ $t('completed') }}</a-select-option>
          <a-select-option value="cancelled">{{ $t('canceled') }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="applySearch">
          <template #icon><SearchOutlined /></template>
          {{ $t('search') }}
        </a-button>
      </div>

      <a-card :bordered="false" class="table-card">
        <a-table
          :columns="jobColumns"
          :data-source="filteredRows"
          :row-key="(record: JobOverviewRow) => record.id"
          :pagination="false"
          :row-class-name="(record: JobOverviewRow) => rowClass(record)"
          :locale="{ emptyText: $t('no_matching_records') }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'student'">
              <StudentAvatarCell
                :name="record.studentName"
                :id="record.studentId"
                :background-color="avatarColor(record)"
              />
            </template>
            <template v-else-if="column.key === 'company'">
              <CompanyPositionCell
                :company="record.company"
                :position="record.position"
                :location="record.location"
                :highlight="record.coachingStatus === 'new'"
              />
            </template>
            <template v-else-if="column.key === 'stage'">
              <StageTag :stage="record.interviewStage" fallback="-" />
            </template>
            <template v-else-if="column.key === 'interviewTime'">
              <InterviewTimeCell
                :time="record.interviewTime ? formatInterviewTime(record.interviewTime) : ''"
                :emphasize-overdue="!!record.interviewTime && record.coachingStatus !== 'completed'"
              />
            </template>
            <template v-else-if="column.key === 'coachingStatus'">
              <CoachingStatusTag :status="record.coachingStatus" text-mode="normalized" fallback="-">
                <template #icon>
                  <BellOutlined v-if="record.coachingStatus === 'new'" />
                  <BookOutlined v-else-if="record.coachingStatus === 'coaching'" />
                </template>
              </CoachingStatusTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button
                v-if="record.coachingStatus === 'new'"
                type="primary"
                size="small"
                class="btn-confirm"
                @click="confirmJob(record)"
              >
                {{ $t('confirm') }}
              </a-button>
              <a-button
                v-else-if="record.coachingStatus === 'coaching'"
                type="link"
                size="small"
                data-surface-trigger="modal-job-detail"
                @click="openJobDetail(record)"
              >
                {{ $t('view_details') }}
              </a-button>
              <span v-else class="text-muted">--</span>
            </template>
          </template>
        </a-table>
      </a-card>

      <a-modal
        :open="selectedRow !== null"
        :title="$t('student_job_search_details')"
        :width="720"
        :footer="null"
        wrap-class-name="job-detail-modal"
        :root-class-name="'job-detail-modal-root'"
        @cancel="closeJobDetail"
      >
        <template v-if="selectedRow">
          <section class="hero-card">
            <div class="hero-block">
              <div class="hero-label"><UserOutlined /> {{ $t('student_information') }}</div>
              <div class="hero-student">
                <StudentInitialAvatar
                  :name="jobDetailPreview.studentName"
                  :size="48"
                  color="#3B82F6"
                />
                <div>
                  <div class="hero-value">{{ jobDetailPreview.studentName }}</div>
                  <div class="hero-meta">ID: {{ jobDetailPreview.studentId }} · 班主任: {{ jobDetailPreview.leadMentorName }}</div>
                </div>
              </div>
            </div>
            <div class="hero-block">
              <div class="hero-label"><BankOutlined /> {{ $t('applied_position') }}</div>
              <div class="hero-value hero-value--brand">{{ jobDetailPreview.companyName }}</div>
              <div class="hero-meta hero-meta--body">{{ jobDetailPreview.positionName }}</div>
              <div class="hero-meta hero-meta--body">{{ $t('recruitment_cycle') }}: <span>{{ jobDetailPreview.recruitmentCycle }}</span></div>
            </div>
          </section>

          <section class="modal-section">
            <div class="section-title"><ClockCircleOutlined /> {{ $t('job_search_progress') }}</div>
            <a-steps :current="2" size="small" progress-dot>
              <a-step title="已投递" description="01/05" />
              <a-step title="HireVue" description="01/10" />
              <a-step title="First Round" :description="$t('current')" />
              <a-step title="Final" />
              <a-step title="Offer" />
            </a-steps>

            <a-alert
              type="warning"
              show-icon
              :message="`面试时间: ${jobDetailPreview.interviewTime}`"
              :description="jobDetailPreview.countdownText"
              style="margin-top: 16px"
            />
          </section>

          <section class="modal-section">
            <div class="section-title section-title--purple"><BookOutlined /> {{ $t('coaching_info') }}</div>
            <a-row :gutter="12">
              <a-col :span="6"><a-card size="small" class="coaching-card">
                <a-statistic title="辅导状态" :value="jobDetailPreview.coachingStatus" />
              </a-card></a-col>
              <a-col :span="6"><a-card size="small" class="coaching-card">
                <a-statistic title="分配导师" :value="jobDetailPreview.mentorName" />
              </a-card></a-col>
              <a-col :span="6"><a-card size="small" class="coaching-card">
                <a-statistic title="已上课时" :value="jobDetailPreview.lessonHours" />
              </a-card></a-col>
              <a-col :span="6"><a-card size="small" class="coaching-card">
                <a-statistic title="申请时间" :value="jobDetailPreview.applyTime" />
              </a-card></a-col>
            </a-row>
          </section>

          <section class="modal-section">
            <div class="section-head">
              <div class="section-title section-title--green"><ReadOutlined /> {{ $t('course_records_latest_3') }})</div>
              <a-button type="link" size="small" @click="showAllRecords = true">
                {{ $t('view_all') }}
                <template #icon><ArrowRightOutlined /></template>
              </a-button>
            </div>
            <a-list
              :data-source="showAllRecords ? fullRecords : recentRecords"
              :loading="studentDetailRecordsLoading"
              :locale="{ emptyText: $t('no_course_records') }"
              size="small"
            >
              <template #renderItem="{ item }">
                <a-list-item class="record-item" :class="item.tone">
                  <span class="record-date">{{ item.date }}</span>
                  <a-tag :class="item.tagTone" class="record-tag">{{ item.label }}</a-tag>
                  <span class="record-hours">{{ item.hours }}</span>
                  <span class="record-summary">{{ item.summary }}</span>
                  <a-tag :class="item.tagTone" class="record-grade">{{ item.grade }}</a-tag>
                </a-list-item>
              </template>
            </a-list>
          </section>

          <section class="modal-section modal-section--notes">
            <div class="section-title section-title--amber"><FileTextOutlined /> {{ $t('student_notes') }}</div>
            <a-typography-paragraph class="notes-card">{{ jobDetailPreview.notes }}</a-typography-paragraph>
          </section>
        </template>
      </a-modal>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, inject, type Ref } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  ArrowRightOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  FileTextOutlined,
  ReadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { http } from '@osg/shared/utils/request'
import { InterviewCalendar, StageTag, CoachingStatusTag, StudentAvatarCell, StudentInitialAvatar, CompanyPositionCell, InterviewTimeCell, StatCard } from '@osg/shared/components'
import {
  getMentorJobOverviewCalendar,
  type LeadMentorCalendarRecord,
} from '@osg/shared/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const MENTOR_NAV_BADGE_KEY = Symbol.for('mentor-nav-badges')

type MentorNavBadgeState = {
  jobBadge: Ref<number>
  refreshJobBadge: () => Promise<void>
}

interface JobOverviewRow {
  id: number
  studentId: number
  studentName?: string
  company: string
  position: string
  location?: string
  interviewStage?: string
  interviewTime?: string
  coachingStatus: string
  result?: string | null
  mentorName?: string
  lessonHours?: string
  applyTime?: string
  notes?: string
  createTime?: string
  recruitmentCycle?: string
}

interface DetailRecord {
  date: string
  label: string
  hours: string
  summary: string
  grade: string
  tone: string
  tagTone: string
}

const allRows = ref<JobOverviewRow[]>([])
const persistentRowAnchors = ref<Map<number, string>>(new Map())
const allCalendarEvents = ref<LeadMentorCalendarRecord[]>([])
const selectedRow = ref<JobOverviewRow | null>(null)
const showAllRecords = ref(false)
const studentDetailRecords = ref<DetailRecord[]>([])
const studentDetailRecordsLoading = ref(false)
const draftKeyword = ref('')
const activeKeyword = ref('')
const selectedCompany = ref('')
const selectedStatus = ref('')
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)

const companies = ['Goldman Sachs', 'JP Morgan', 'McKinsey', 'Google', 'Morgan Stanley']

const statusLabelMap: Record<string, string> = {
  new: t('new_application'),
  coaching: t('during_the_interview'),
  completed: t('completed'),
  cancelled: t('canceled'),
}

const filteredRows = computed(() => {
  const keyword = activeKeyword.value.trim().toLowerCase()
  return allRows.value.filter((row) => {
    if (selectedCompany.value && row.company !== selectedCompany.value) return false
    if (selectedStatus.value && row.coachingStatus !== selectedStatus.value) return false
    if (keyword) {
      const haystack = [row.studentName, row.company, row.position, row.location, row.interviewStage, row.mentorName]
        .map((item) => String(item || '').toLowerCase())
        .join(' ')
      if (!haystack.includes(keyword)) return false
    }
    return true
  })
})

const visibleNewRowAnchors = computed(() => {
  let sequence = 0
  const anchors = new Map<number, string>()
  filteredRows.value.forEach((row) => {
    if (row.coachingStatus === 'new') {
      sequence += 1
      anchors.set(row.id, `job-new-${sequence}`)
    }
  })
  return anchors
})

const stats = computed(() => {
  const totals = { newCount: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0 }
  filteredRows.value.forEach((row) => {
    if (row.coachingStatus === 'new') totals.newCount += 1
    else if (row.coachingStatus === 'coaching') totals.pendingCount += 1
    else if (row.coachingStatus === 'completed') totals.completedCount += 1
    else if (row.coachingStatus === 'cancelled') totals.cancelledCount += 1
  })
  return totals
})

const recentRecords = computed(() => studentDetailRecords.value.slice(0, 3))
const fullRecords = computed(() => studentDetailRecords.value)

const jobDetailPreview = computed(() => createJobDetailPreview(selectedRow.value))

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatInterviewTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatApplyTime(value?: string) {
  if (!value) return '01/08'
  if (/^\d{2}\/\d{2}/.test(value)) return value
  const date = new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatRecordDate(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function buildCountdownText(value: string) {
  const diff = new Date(value).getTime() - Date.now()
  const days = Math.max(0, Math.round(diff / (24 * 60 * 60 * 1000)))
  return days <= 0 ? '今天进行' : `还剩${days}天`
}

function createJobDetailPreview(row: JobOverviewRow | null) {
  const time = row?.interviewTime || row?.createTime
  return {
    studentName: row?.studentName || t('zhang_san'),
    studentId: String(row?.studentId || '12766'),
    leadMentorName: row?.mentorName || 'Jess',
    companyName: row?.company || 'Goldman Sachs',
    positionName: `${row?.position || 'IB Analyst'}${row?.location ? ` · ${row.location}` : ''}`,
    recruitmentCycle: row?.recruitmentCycle || '2025 Summer',
    interviewTime: time ? formatInterviewTime(time) : '01/18 10:00',
    countdownText: time ? buildCountdownText(time) : t('2_days_remaining'),
    coachingStatus: statusLabelMap[row?.coachingStatus || 'coaching'] || t('during_the_interview'),
    mentorName: row?.mentorName || 'Jerry Li',
    lessonHours: row?.lessonHours || '8h',
    applyTime: formatApplyTime(row?.applyTime || row?.createTime),
    notes: row?.notes || 'HireVue已通过，准备First Round。学员英语口语较好，行为面试需要加强。建议多练习STAR方法。',
  }
}

function buildQueryParams() {
  return {
    keyword: activeKeyword.value,
    company: selectedCompany.value,
    status: selectedStatus.value,
  }
}

function normalizeJobOverview(record: Record<string, any>): JobOverviewRow {
  return {
    ...record,
    studentName: record.studentName || (record.studentId != null ? `学员${record.studentId}` : t('students_to_be_assigned')),
    mentorName: record.mentorName || 'Jess',
    lessonHours: record.lessonHours || '8h',
    applyTime: record.applyTime || formatApplyTime(record.createTime),
    notes: record.notes || 'HireVue已通过，准备First Round。建议持续复盘面试表现。',
  } as JobOverviewRow
}

function contentLabel(value: string) {
  return {
    mock_interview: t('mock_interview'),
    resume_update: t('resume_update'),
    networking: t('networking_midterm_exam'),
    mock_midterm: t('mock_midterm_exam'),
    basic_course: t('foundation_course_2'),
    written_test: t('written_test_coaching'),
  }[value] || value || t('course_records')
}

function gradeLabel(value: unknown) {
  const rating = Number(value)
  if (Number.isNaN(rating) || rating <= 0) return t('pending_evaluation')
  if (rating >= 5) return t('excellent')
  if (rating >= 4) return t('good')
  if (rating >= 3) return t('average')
  return t('needs_improvement')
}

function gradeTone(value: unknown) {
  const rating = Number(value)
  if (Number.isNaN(rating) || rating <= 0) return 'record-tag--blue'
  if (rating >= 5) return 'record-tag--green'
  if (rating >= 4) return 'record-tag--blue'
  return 'record-tag--purple'
}

function recordTone(value: unknown) {
  const rating = Number(value)
  if (Number.isNaN(rating) || rating <= 0) return 'record-item--blue'
  if (rating >= 5) return 'record-item--green'
  if (rating >= 4) return 'record-item--blue'
  return 'record-item--purple'
}

function normalizeDetailRecord(record: Record<string, any>): DetailRecord {
  return {
    date: formatRecordDate(record.classDate),
    label: contentLabel(String(record.contentType ?? record.courseType ?? record.courseSource ?? '')),
    hours: `${Number(record.durationHours || 0)}h`,
    summary: String(record.feedbackContent ?? record.contentDetail ?? record.reviewRemark ?? t('no_feedback_yet')),
    grade: gradeLabel(record.feedbackRating ?? record.studentEvaluation),
    tone: recordTone(record.feedbackRating ?? record.studentEvaluation),
    tagTone: gradeTone(record.feedbackRating ?? record.studentEvaluation),
  }
}

function rowClass(row: JobOverviewRow): string {
  return [
    row.coachingStatus === 'new' && 'row-new',
    row.coachingStatus === 'coaching' && 'row-coaching',
    (row.result === 'offer' || row.result === 'rejected') && 'row-ended',
  ].filter(Boolean).join(' ')
}

function avatarColor(row: JobOverviewRow) {
  const colors = ['#7399C6', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B']
  return colors[row.id % colors.length]
}

const jobColumns = [
  { title: t('student'), key: 'student', dataIndex: 'studentName' },
  { title: t('company_position'), key: 'company', dataIndex: 'company' },
  { title: t('stage'), key: 'stage', dataIndex: 'interviewStage', width: 100 },
  { title: t('interview_time'), key: 'interviewTime', dataIndex: 'interviewTime', width: 140 },
  { title: t('counseling_status'), key: 'coachingStatus', dataIndex: 'coachingStatus', width: 120 },
  { title: t('operation'), key: 'actions', width: 110 },
]

function rowDomId(row: JobOverviewRow) {
  return visibleNewRowAnchors.value.get(row.id) || persistentRowAnchors.value.get(row.id)
}

function applySearch() {
  activeKeyword.value = draftKeyword.value.trim()
}

function openCalendarHighlight(event: LeadMentorCalendarRecord) {
  if (!event) return
  const matched = filteredRows.value.find(
    (row) =>
      row.studentName === event.studentName ||
      row.company === event.company ||
      (row.interviewTime && event.interviewTime && isSameDay(new Date(row.interviewTime), new Date(event.interviewTime))),
  )
  if (matched) openJobDetail(matched)
}

async function openJobDetail(row: JobOverviewRow) {
  selectedRow.value = row
  showAllRecords.value = false
  await loadStudentDetailRecords(row.studentId)
}

function closeJobDetail() {
  selectedRow.value = null
  showAllRecords.value = false
  studentDetailRecords.value = []
}

async function loadStudentDetailRecords(studentId: number | string | undefined) {
  if (studentId == null || studentId === '') {
    studentDetailRecords.value = []
    return
  }

  studentDetailRecordsLoading.value = true
  try {
    const res = await http.get('/api/mentor/class-records/list', {
      params: { studentId },
    })
    const rows = Array.isArray(res?.rows) ? res.rows : []
    studentDetailRecords.value = rows.map((record: Record<string, any>) => normalizeDetailRecord(record))
  } catch {
    studentDetailRecords.value = []
  } finally {
    studentDetailRecordsLoading.value = false
  }
}

async function loadJobOverviewRows(confirmedRowId?: number) {
  const res = await http.get('/api/mentor/job-overview/list')
  const rows = Array.isArray(res?.rows) ? res.rows : []
  const normalizedRows: JobOverviewRow[] = rows.map((record: Record<string, any>) => normalizeJobOverview(record))
  normalizedRows.forEach((row) => {
    const anchor = visibleNewRowAnchors.value.get(row.id)
    if (anchor) persistentRowAnchors.value.set(row.id, anchor)
  })
  if (confirmedRowId != null) {
    const confirmedRow = normalizedRows.find((row) => row.id === confirmedRowId)
    if (confirmedRow && confirmedRow.coachingStatus === 'new') {
      confirmedRow.coachingStatus = 'coaching'
    }
  }
  allRows.value = normalizedRows
}

async function confirmJob(row: JobOverviewRow) {
  const existingAnchor = rowDomId(row)
  if (existingAnchor) persistentRowAnchors.value.set(row.id, existingAnchor)
  try {
    await http.put(`/api/mentor/job-overview/${row.id}/confirm`)
    await loadJobOverviewRows(row.id)
  } catch {}
  try { await mentorNavBadges?.refreshJobBadge?.() } catch {}
}

function downloadBlob(filename: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function handleExport() {
  try {
    const blob = await http.get('/api/mentor/job-overview/export', {
      params: buildQueryParams(),
      responseType: 'blob',
    })
    downloadBlob(`学员求职总览.xlsx`, blob as Blob)
  } catch {}
}

onMounted(async () => {
  try {
    await loadJobOverviewRows()
  } catch {}

  try {
    const rows = await getMentorJobOverviewCalendar()
    allCalendarEvents.value = Array.isArray(rows) ? rows : []
  } catch {}

  void mentorNavBadges?.refreshJobBadge?.()
})
</script>

<style scoped>
.page-header { margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.page-title { font-size:26px; font-weight:700; color:#1E293B; }
.page-title-en { font-size:14px; color:#94A3B8; font-weight:400; margin-left:8px; }
.page-sub { font-size:14px; color:#64748B; margin-top:6px; }

.stats-row { margin-bottom:20px; }

.filter-row { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }

.table-card { margin-bottom:20px; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); }

.student-cell { display:flex; align-items:center; gap:10px; }
.avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:600; font-size:12px; flex-shrink:0; }
.student-name { font-weight:600; }
.company-name { font-weight:600; }

.text-muted { color:#94A3B8; }
.text-sm { font-size:11px; }
.text-danger { color:#EF4444; font-weight:600; font-size:12px; }

/* antd a-table row hover/bg overrides (保留原有视觉：new=红渐变, coaching=紫, ended=低透明) */
:deep(.ant-table-row.row-new > td) { background:linear-gradient(90deg,#FEE2E2,#FEF2F2); border-left:4px solid #EF4444; }
:deep(.ant-table-row.row-coaching > td) { background:#F3E8FF; }
:deep(.ant-table-row.row-ended > td) { opacity:0.7; }

/* Modal 内部自定义样式 */
.hero-card { padding:20px; background:linear-gradient(135deg,#EFF6FF,#DBEAFE); display:flex; gap:20px; margin:-24px -24px 0; }
.hero-block { flex:1; }
.hero-label { font-size:12px; color:#3B82F6; font-weight:600; margin-bottom:8px; display:flex; gap:4px; align-items:center; }
.hero-student { display:flex; align-items:center; gap:12px; }
.hero-value { font-weight:700; font-size:16px; color:#1E293B; }
.hero-value--brand { color:#1E40AF; }
.hero-meta { font-size:12px; color:#64748B; }
.hero-meta--body { font-size:13px; color:#64748B; margin-top:2px; }

.modal-section { padding:20px 0; border-bottom:1px solid #E2E8F0; }
.modal-section--notes { border-bottom:none; }
.section-title { font-size:13px; font-weight:600; color:#1E293B; margin-bottom:16px; display:flex; align-items:center; gap:6px; }
.section-title--purple { color:#6D28D9; }
.section-title--green { color:#16A34A; }
.section-title--amber { color:#B45309; }
.section-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }

.coaching-card :deep(.ant-card-body) { background:#F3E8FF; border-radius:8px; text-align:center; }
.coaching-card :deep(.ant-statistic-title) { color:#7C3AED; font-size:11px; }
.coaching-card :deep(.ant-statistic-content) { color:#6D28D9; font-size:14px; font-weight:700; }

.record-item { background:#F8FAFC; border-radius:8px; border-left:3px solid #E2E8F0; padding:10px 12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.record-item--green { border-left-color:#22C55E; }
.record-item--blue { border-left-color:#3B82F6; }
.record-item--purple { border-left-color:#8B5CF6; }
.record-date { font-size:11px; color:#94A3B8; min-width:50px; }
.record-tag, .record-grade { font-size:10px; border-radius:999px; }
.record-tag--green { background:#DCFCE7 !important; color:#166534 !important; border-color:#DCFCE7 !important; }
.record-tag--blue { background:#DBEAFE !important; color:#1E40AF !important; border-color:#DBEAFE !important; }
.record-tag--purple { background:#F3E8FF !important; color:#7C3AED !important; border-color:#F3E8FF !important; }
.record-hours { font-size:11px; color:#94A3B8; }
.record-summary { font-size:12px; flex:1; min-width:180px; }

.notes-card { background:#FFFBEB !important; border-radius:8px; padding:12px; font-size:13px; color:#92400E !important; line-height:1.6; margin:0 !important; }

.btn-confirm { background:#22C55E !important; border-color:#22C55E !important; }
.btn-confirm:hover { background:#16A34A !important; border-color:#16A34A !important; }
</style>


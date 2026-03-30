<template>
  <div id="page-job-overview">
    <div class="page-header">
      <div>
        <h1 class="page-title">学员求职总览 <span class="page-title-en">Job Overview</span></h1>
        <p class="page-sub">查看我辅导学员的求职进度</p>
      </div>
      <button type="button" class="btn btn-outline" @click="handleExport">
        <i class="mdi mdi-export" />
        导出
      </button>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 16px">
        <div class="calendar-bar">
          <div class="calendar-title">
            <i class="mdi mdi-calendar-month" />
            学员面试安排
          </div>
          <div class="calendar-days">
            <div
              v-for="day in calendarWeekDays"
              :key="`${calendarMonthLabel}-${day.label}-${day.day}`"
              class="calendar-day"
              :class="day.class"
              @click="openCalendarHighlight(day.event)"
            >
              <div class="calendar-day-label">{{ day.label }}</div>
              <div class="calendar-day-num">{{ day.day }}</div>
            </div>
          </div>
          <div class="calendar-nav">
            <button type="button" class="btn btn-text btn-sm calendar-arrow" @click="shiftCalendarMonth(-1)">
              <i class="mdi mdi-chevron-left" />
            </button>
            <span class="calendar-month">{{ calendarMonthLabel }}</span>
            <button type="button" class="btn btn-text btn-sm calendar-arrow" @click="shiftCalendarMonth(1)">
              <i class="mdi mdi-chevron-right" />
            </button>
          </div>
          <button
            id="mentor-toggle-view-btn"
            type="button"
            class="btn btn-text btn-sm"
            style="margin-left:auto;font-size:11px"
            @click="toggleCalendarExpansion"
          >
            <i :class="expandCalendar ? 'mdi mdi-calendar-collapse-horizontal' : 'mdi mdi-calendar-expand-horizontal'" />
            {{ expandCalendar ? '收起' : '展开' }}
          </button>
        </div>
      </div>

      <div v-if="expandCalendar" class="card-body calendar-expanded" style="border-top:1px solid #E2E8F0;padding-top:16px">
        <div class="calendar-legend">
          <div><span class="legend-dot legend-dot--interview" />面试</div>
          <div><span class="legend-dot legend-dot--class" />辅导课</div>
          <div><span class="legend-dot legend-dot--today" />今天</div>
        </div>

        <div style="margin-top:12px">
          <div style="font-weight:600;font-size:13px;color:#1E293B;margin-bottom:12px">
            <i class="mdi mdi-calendar-clock" style="margin-right:6px;color:#7399C6" />
            本周学员面试安排
          </div>

          <div v-if="visibleCalendarEvents.length" class="calendar-event-list">
            <div
              v-for="event in visibleCalendarEvents"
              :key="`${event.id}-${event.day}-${event.studentName}`"
              class="calendar-event"
              :style="{ borderLeftColor: event.color }"
              @click="openCalendarHighlight(event)"
            >
              <div class="event-date">
                <div class="event-day">{{ event.day }}</div>
                <div class="event-weekday">{{ event.weekday }}</div>
              </div>
              <div class="event-info">
                <div class="event-title">{{ event.studentName }} - {{ event.company }} {{ event.stage }}</div>
                <div class="event-time">{{ formatCalendarEventTime(event.time) }} · {{ event.position }} · {{ event.location }}</div>
              </div>
              <span class="tag" :class="event.tagClass">{{ event.badge }}</span>
            </div>
          </div>
          <div v-else class="empty-state">当前月份暂无安排</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:#EF4444">{{ stats.newCount }}</div><div class="stat-label">新分配</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#3B82F6">{{ stats.pendingCount }}</div><div class="stat-label">待进行</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#22C55E">{{ stats.completedCount }}</div><div class="stat-label">已完成</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#94A3B8">{{ stats.cancelledCount }}</div><div class="stat-label">已取消</div></div>
    </div>

    <div class="filter-bar">
      <input
        v-model="draftKeyword"
        class="form-input"
        style="width:180px"
        placeholder="搜索学员姓名..."
        @keydown.enter.prevent="applySearch"
      />
      <select v-model="selectedCompany" class="form-select">
        <option value="">全部公司</option>
        <option v-for="c in companies" :key="c">{{ c }}</option>
      </select>
      <select v-model="selectedStatus" class="form-select">
        <option value="">全部状态</option>
        <option value="new">新申请</option>
        <option value="coaching">面试中</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <button type="button" class="btn btn-outline" @click="applySearch">
        <i class="mdi mdi-magnify" />
        搜索
      </button>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
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
            <tr v-for="row in filteredRows" :key="row.id" :id="rowDomId(row)" :class="rowClass(row)">
              <td>
                <div class="student-cell">
                  <div class="avatar" :style="{ background: avatarColor(row) }">{{ row.studentName?.[0] || '?' }}</div>
                  <div>
                    <div class="student-name">{{ row.studentName }}</div>
                    <div class="text-muted text-sm">ID: {{ row.studentId }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="company-name" :style="{ color: row.coachingStatus === 'new' ? '#EF4444' : '' }">{{ row.company }}</div>
                <div class="text-muted text-sm">{{ row.position }} · {{ row.location }}</div>
              </td>
              <td><span class="tag" :class="stageClass(row)">{{ row.interviewStage || '-' }}</span></td>
              <td>
                <div v-if="row.interviewTime" :class="{ 'text-danger': row.coachingStatus !== 'completed' }">
                  {{ formatInterviewTime(row.interviewTime) }}
                </div>
                <div v-else class="text-muted">-</div>
              </td>
              <td>
                <span v-if="row.coachingStatus === 'new'" class="tag pulse-tag"><i class="mdi mdi-bell-ring" /> 新申请</span>
                <span v-else-if="row.coachingStatus === 'coaching'" class="tag coaching-tag"><i class="mdi mdi-school" /> 辅导中</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <button
                  v-if="row.coachingStatus === 'new'"
                  type="button"
                  class="btn btn-confirm"
                  @click="confirmJob(row)"
                >
                  <i class="mdi mdi-check" />
                  确认
                </button>
                <button
                  v-else-if="row.coachingStatus === 'coaching'"
                  type="button"
                  class="btn btn-text btn-sm"
                  data-surface-trigger="modal-job-detail"
                  @click="openJobDetail(row)"
                >
                  查看详情
                </button>
                <span v-else class="text-muted">--</span>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="6" class="empty-state">暂无匹配记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="selectedRow"
      class="modal job-detail-modal"
      data-surface-id="modal-job-detail"
    >
      <button
        type="button"
        class="job-detail-backdrop"
        aria-label="关闭学员求职详情弹层"
        @click="closeJobDetail"
      />
      <div
        class="job-detail-shell modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-modal-title"
      >
        <div class="job-detail-header modal-header">
          <span id="job-detail-modal-title" class="job-detail-title modal-title">
            <i class="mdi mdi-briefcase-search" />
            学员求职详情
          </span>
          <button
            type="button"
            class="modal-close"
            aria-label="关闭学员求职详情弹层"
            @click="closeJobDetail"
          >
            ×
          </button>
        </div>

        <div class="job-detail-body modal-body">
          <section class="hero-card">
            <div class="hero-block">
              <div class="hero-label"><i class="mdi mdi-account" /> 学员信息</div>
              <div class="hero-student">
                <div class="hero-avatar">{{ jobDetailPreview.studentName }}</div>
                <div>
                  <div class="hero-value">{{ jobDetailPreview.studentName }}</div>
                  <div class="hero-meta">ID: {{ jobDetailPreview.studentId }} · 班主任: {{ jobDetailPreview.leadMentorName }}</div>
                </div>
              </div>
            </div>
            <div class="hero-block">
              <div class="hero-label"><i class="mdi mdi-domain" /> 申请岗位</div>
              <div class="hero-value hero-value--brand">{{ jobDetailPreview.companyName }}</div>
              <div class="hero-meta hero-meta--body">{{ jobDetailPreview.positionName }}</div>
              <div class="hero-meta hero-meta--body">招聘周期: <span>{{ jobDetailPreview.recruitmentCycle }}</span></div>
            </div>
          </section>

          <section class="modal-section">
            <div class="section-title"><i class="mdi mdi-timeline-clock" /> 求职进度</div>
            <div class="timeline">
              <div class="timeline-step">
                <div class="timeline-badge timeline-badge--done"><i class="mdi mdi-check" /></div>
                <div class="timeline-copy">已投递<span>01/05</span></div>
              </div>
              <div class="timeline-line timeline-line--done" />
              <div class="timeline-step">
                <div class="timeline-badge timeline-badge--done"><i class="mdi mdi-check" /></div>
                <div class="timeline-copy">HireVue<span>01/10</span></div>
              </div>
              <div class="timeline-line timeline-line--done" />
              <div class="timeline-step">
                <div class="timeline-badge timeline-badge--current"><i class="mdi mdi-clock" /></div>
                <div class="timeline-copy timeline-copy--current">First Round<span>当前</span></div>
              </div>
              <div class="timeline-line" />
              <div class="timeline-step timeline-step--future">
                <div class="timeline-badge timeline-badge--future"><i class="mdi mdi-circle-outline" /></div>
                <div class="timeline-copy">Final</div>
              </div>
              <div class="timeline-line" />
              <div class="timeline-step timeline-step--future">
                <div class="timeline-badge timeline-badge--future"><i class="mdi mdi-circle-outline" /></div>
                <div class="timeline-copy">Offer</div>
              </div>
            </div>

            <div class="interview-card">
              <i class="mdi mdi-calendar-clock" />
              <div>
                <div>面试时间: <span>{{ jobDetailPreview.interviewTime }}</span></div>
                <div>{{ jobDetailPreview.countdownText }}</div>
              </div>
            </div>
          </section>

          <section class="modal-section">
            <div class="section-title section-title--purple"><i class="mdi mdi-school" /> 辅导信息</div>
            <div class="coaching-grid">
              <article class="coaching-card"><div>辅导状态</div><strong>{{ jobDetailPreview.coachingStatus }}</strong></article>
              <article class="coaching-card"><div>分配导师</div><strong>{{ jobDetailPreview.mentorName }}</strong></article>
              <article class="coaching-card"><div>已上课时</div><strong>{{ jobDetailPreview.lessonHours }}</strong></article>
              <article class="coaching-card"><div>申请时间</div><strong>{{ jobDetailPreview.applyTime }}</strong></article>
            </div>
          </section>

          <section class="modal-section">
            <div class="section-head">
              <div class="section-title section-title--green"><i class="mdi mdi-book-open-variant" /> 课程记录 (最近3条)</div>
              <button type="button" class="btn btn-text btn-sm" style="font-size:11px" @click="showAllRecords = true">
                查看全部
                <i class="mdi mdi-arrow-right" />
              </button>
            </div>
            <div class="records">
              <div v-if="studentDetailRecordsLoading" class="empty-state">课程记录加载中...</div>
              <div v-else-if="!recentRecords.length" class="empty-state">暂无课程记录</div>
              <article
                v-for="record in recentRecords"
                :key="`${record.date}-${record.label}`"
                class="record-item"
                :class="record.tone"
              >
                <span class="record-date">{{ record.date }}</span>
                <span class="record-tag" :class="record.tagTone">{{ record.label }}</span>
                <span class="record-hours">{{ record.hours }}</span>
                <span class="record-summary">{{ record.summary }}</span>
                <span class="record-grade" :class="record.tagTone">{{ record.grade }}</span>
              </article>
            </div>

            <div v-if="showAllRecords" class="full-records">
              <div class="full-records-title">完整课程记录</div>
              <div class="records">
                <div v-if="studentDetailRecordsLoading" class="empty-state">课程记录加载中...</div>
                <div v-else-if="!fullRecords.length" class="empty-state">暂无课程记录</div>
                <article
                  v-for="record in fullRecords"
                  :key="`${record.date}-${record.label}`"
                  class="record-item"
                  :class="record.tone"
                >
                  <span class="record-date">{{ record.date }}</span>
                  <span class="record-tag" :class="record.tagTone">{{ record.label }}</span>
                  <span class="record-hours">{{ record.hours }}</span>
                  <span class="record-summary">{{ record.summary }}</span>
                  <span class="record-grade" :class="record.tagTone">{{ record.grade }}</span>
                </article>
              </div>
            </div>
          </section>

          <section class="modal-section modal-section--notes">
            <div class="section-title section-title--amber"><i class="mdi mdi-note-text" /> 学员备注</div>
            <div class="notes-card">{{ jobDetailPreview.notes }}</div>
          </section>
        </div>

        <div class="job-detail-footer modal-footer">
          <button type="button" class="btn btn-outline" @click="closeJobDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, inject, type Ref } from 'vue'
import { http } from '@osg/shared/utils/request'

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

interface CalendarEvent {
  id: number
  studentName: string
  company: string
  stage: string
  time: string
  position: string
  location: string
  color?: string
  day?: number
  weekday?: string
  badge?: string
  tagClass?: string
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

const expandCalendar = ref(false)
const allRows = ref<JobOverviewRow[]>([])
const persistentRowAnchors = ref<Map<number, string>>(new Map())
const allCalendarEvents = ref<CalendarEvent[]>([])
const selectedRow = ref<JobOverviewRow | null>(null)
const showAllRecords = ref(false)
const studentDetailRecords = ref<DetailRecord[]>([])
const studentDetailRecordsLoading = ref(false)
const draftKeyword = ref('')
const activeKeyword = ref('')
const selectedCompany = ref('')
const selectedStatus = ref('')
const calendarMonthOffset = ref(0)
const calendarAnchorMonth = ref<Date | null>(null)
const mentorNavBadges = inject<MentorNavBadgeState | null>(MENTOR_NAV_BADGE_KEY, null)

const companies = ['Goldman Sachs', 'JP Morgan', 'McKinsey', 'Google', 'Morgan Stanley']
const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

const statusLabelMap: Record<string, string> = {
  new: '新申请',
  coaching: '面试中',
  completed: '已完成',
  cancelled: '已取消',
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

const calendarMonthDate = computed(() => {
  const anchor = calendarAnchorMonth.value || new Date()
  return addMonths(anchor, calendarMonthOffset.value)
})

const calendarMonthLabel = computed(() => `${calendarMonthDate.value.getMonth() + 1}月`)
const recentRecords = computed(() => studentDetailRecords.value.slice(0, 3))
const fullRecords = computed(() => studentDetailRecords.value)

const visibleCalendarEvents = computed(() =>
  allCalendarEvents.value.filter((event) => isSameMonth(new Date(event.time), calendarMonthDate.value)),
)

const calendarWeekDays = computed(() => buildCalendarWeek(calendarMonthDate.value, visibleCalendarEvents.value))

const jobDetailPreview = computed(() => createJobDetailPreview(selectedRow.value))

function addMonths(date: Date, offset: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + offset)
  return next
}

function parseDateValue(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pickEarliestAnchorDate(values: Array<string | undefined>) {
  return values
    .map((value) => parseDateValue(value))
    .filter((value): value is Date => value !== null)
    .sort((left, right) => left.getTime() - right.getTime())[0] || null
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function buildCalendarWeek(baseMonth: Date, events: CalendarEvent[]) {
  const anchorDay = events.length ? Math.max(1, Math.min(...events.map((event) => new Date(event.time).getDate())) - 1) : 1
  const start = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), anchorDay)
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const matchingEventIndex = events.findIndex((event) => isSameDay(new Date(event.time), current))
    const matchingEvent = matchingEventIndex >= 0 ? events[matchingEventIndex] : undefined
    return {
      label: weekdayLabels[current.getDay()],
      day: current.getDate(),
      hasEvent: matchingEventIndex >= 0,
      event: matchingEvent,
      class: [
        isSameDay(current, new Date()) ? 'today' : '',
        matchingEventIndex === 0 ? 'warning-bg' : '',
        matchingEventIndex === 1 ? 'danger-bg' : '',
        matchingEventIndex >= 2 ? 'info-bg' : '',
      ]
        .filter(Boolean)
        .join(' '),
      badge: matchingEventIndex === 0 ? '明天' : matchingEventIndex === 1 ? '后天' : matchingEventIndex >= 2 ? '4天后' : '',
      tagClass: matchingEventIndex === 0 ? 'warning' : matchingEventIndex === 1 ? 'danger' : 'info',
    }
  })
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

function formatCalendarEventTime(value?: string) {
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
    studentName: row?.studentName || '张三',
    studentId: String(row?.studentId || '12766'),
    leadMentorName: row?.mentorName || 'Jess',
    companyName: row?.company || 'Goldman Sachs',
    positionName: `${row?.position || 'IB Analyst'}${row?.location ? ` · ${row.location}` : ''}`,
    recruitmentCycle: row?.recruitmentCycle || '2025 Summer',
    interviewTime: time ? formatInterviewTime(time) : '01/18 10:00',
    countdownText: time ? buildCountdownText(time) : '还剩2天',
    coachingStatus: statusLabelMap[row?.coachingStatus || 'coaching'] || '面试中',
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
    studentName: record.studentName || (record.studentId != null ? `学员${record.studentId}` : '待分配学员'),
    mentorName: record.mentorName || 'Jess',
    lessonHours: record.lessonHours || '8h',
    applyTime: record.applyTime || formatApplyTime(record.createTime),
    notes: record.notes || 'HireVue已通过，准备First Round。建议持续复盘面试表现。',
  }
}

function contentLabel(value: string) {
  return {
    mock_interview: '模拟面试',
    resume_update: '简历更新',
    networking: '人际关系期中考试',
    mock_midterm: '模拟期中考试',
    basic_course: '基础课程',
    written_test: '笔试辅导',
  }[value] || value || '课程记录'
}

function gradeLabel(value: unknown) {
  const rating = Number(value)
  if (Number.isNaN(rating) || rating <= 0) return '待评价'
  if (rating >= 5) return '优秀'
  if (rating >= 4) return '良好'
  if (rating >= 3) return '一般'
  return '需改进'
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
    summary: String(record.feedbackContent ?? record.contentDetail ?? record.reviewRemark ?? '暂无反馈'),
    grade: gradeLabel(record.feedbackRating ?? record.studentEvaluation),
    tone: recordTone(record.feedbackRating ?? record.studentEvaluation),
    tagTone: gradeTone(record.feedbackRating ?? record.studentEvaluation),
  }
}

function normalizeCalendarEvent(record: Record<string, any>): CalendarEvent {
  return {
    ...record,
    color: record.color || '#7399C6',
    badge: record.badge || '',
    tagClass: record.tagClass || 'warning',
  }
}

function rowClass(row: JobOverviewRow) {
  return {
    'row-new': row.coachingStatus === 'new',
    'row-coaching': row.coachingStatus === 'coaching',
    'row-ended': row.result === 'offer' || row.result === 'rejected',
  }
}

function avatarColor(row: JobOverviewRow) {
  const colors = ['#7399C6', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B']
  return colors[row.id % colors.length]
}

function stageClass(row: JobOverviewRow) {
  return row.result === 'offer' ? 'success' : row.result === 'rejected' ? 'danger' : 'warning'
}

function rowDomId(row: JobOverviewRow) {
  return visibleNewRowAnchors.value.get(row.id) || persistentRowAnchors.value.get(row.id)
}

function applySearch() {
  activeKeyword.value = draftKeyword.value.trim()
}

function toggleCalendarExpansion() {
  expandCalendar.value = !expandCalendar.value
}

function shiftCalendarMonth(offset: number) {
  calendarMonthOffset.value += offset
}

function openCalendarHighlight(event?: CalendarEvent) {
  if (!event) return
  const matched = filteredRows.value.find(
    (row) =>
      row.studentName === event.studentName ||
      row.company === event.company ||
      (row.interviewTime && isSameDay(new Date(row.interviewTime), new Date(event.time))),
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
  const normalizedRows = rows.map((record: Record<string, any>) => normalizeJobOverview(record))
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
    downloadBlob(`学员求职总览-${calendarMonthLabel.value}.xlsx`, blob as Blob)
  } catch {}
}

onMounted(async () => {
  try {
    await loadJobOverviewRows()
  } catch {}

  try {
    const res = await http.get('/api/mentor/job-overview/calendar')
    const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    allCalendarEvents.value = rows.map((record: Record<string, any>) => normalizeCalendarEvent(record))
  } catch {}

  const earliestAnchor = pickEarliestAnchorDate([
    ...allRows.value.map((row) => row.interviewTime),
    ...allCalendarEvents.value.map((event) => event.time),
  ])
  if (earliestAnchor) calendarAnchorMonth.value = earliestAnchor
  if (!calendarAnchorMonth.value) calendarAnchorMonth.value = new Date()
  void mentorNavBadges?.refreshJobBadge?.()
})
</script>

<style scoped>
.page-header { margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.page-title { font-size:26px; font-weight:700; color:#1E293B; }
.page-title-en { font-size:14px; color:#94A3B8; font-weight:400; margin-left:8px; }
.page-sub { font-size:14px; color:#64748B; margin-top:6px; }
.card { background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(115,153,198,0.12); margin-bottom:20px; }
.card-body { padding:22px; }
.calendar-bar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.calendar-title { display:flex; align-items:center; gap:6px; font-weight:600; font-size:13px; color:#7399C6; }
.calendar-days { display:flex; gap:6px; flex:1; flex-wrap:wrap; }
.calendar-day { text-align:center; padding:4px 8px; border-radius:6px; background:#F8FAFC; min-width:36px; cursor:default; }
.calendar-day.today { background:#7399C6; color:#fff; }
.calendar-day.warning-bg { background:#FEF3C7; cursor:pointer; }
.calendar-day.danger-bg { background:#FEE2E2; cursor:pointer; }
.calendar-day.info-bg { background:#DBEAFE; cursor:pointer; }
.calendar-day-label { font-size:9px; }
.calendar-day-num { font-size:14px; font-weight:700; }
.calendar-nav { display:flex; align-items:center; gap:6px; }
.calendar-month { font-size:12px; min-width:48px; text-align:center; color:#1E293B; font-weight:600; }
.calendar-arrow { padding:2px; min-width:28px; }
.calendar-legend { display:flex; gap:16px; margin-bottom:12px; flex-wrap:wrap; }
.calendar-legend > div { display:flex; align-items:center; gap:6px; font-size:11px; }
.legend-dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.legend-dot--interview { background:#EF4444; }
.legend-dot--class { background:#3B82F6; }
.legend-dot--today { background:#7399C6; }
.calendar-event-list { display:flex; flex-direction:column; gap:10px; }
.calendar-event { display:flex; align-items:center; gap:12px; padding:12px; background:#fff; border-radius:8px; border:1px solid #E2E8F0; border-left:4px solid; }
.event-date { min-width:50px; text-align:center; }
.event-day { font-size:20px; font-weight:700; }
.event-weekday { font-size:10px; color:#94A3B8; }
.event-info { flex:1; }
.event-title { font-weight:600; font-size:13px; }
.event-time { font-size:11px; color:#94A3B8; }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
.stat-card { background:#fff; border-radius:12px; padding:16px; text-align:center; box-shadow:0 4px 24px rgba(115,153,198,0.12); }
.stat-value { font-size:28px; font-weight:700; }
.stat-label { font-size:12px; color:#94A3B8; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.form-input { padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
.form-select { padding:10px 12px; border:2px solid #E2E8F0; border-radius:10px; font-size:14px; width:140px; }
.table { width:100%; border-collapse:collapse; font-size:13px; }
.table th,.table td { padding:14px 16px; text-align:left; border-bottom:1px solid #E2E8F0; }
.table th { font-weight:600; color:#64748B; font-size:12px; text-transform:uppercase; background:#F8FAFC; }
.student-cell { display:flex; align-items:center; gap:10px; }
.avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:600; font-size:12px; }
.student-name { font-weight:600; }
.company-name { font-weight:600; }
.tag { display:inline-flex; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:600; align-items:center; gap:2px; }
.tag.success { background:#D1FAE5; color:#065F46; }
.tag.warning { background:#FEF3C7; color:#92400E; }
.tag.danger { background:#FEE2E2; color:#991B1B; }
.tag.info { background:#DBEAFE; color:#1E40AF; }
.pulse-tag { background:#EF4444; color:#fff; animation:pulse 1.5s ease-in-out infinite; }
.coaching-tag { background:#8B5CF6; color:#fff; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
.row-new { background:linear-gradient(90deg,#FEE2E2,#FEF2F2); border-left:4px solid #EF4444; }
.row-coaching { background:#F3E8FF; }
.row-ended { opacity:0.7; }
.btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; }
.btn-outline { background:#fff; color:#64748B; border:1px solid #E2E8F0; }
.btn-text { background:transparent; color:#7399C6; padding:6px 12px; }
.btn-sm { padding:6px 12px; font-size:13px; }
.btn-confirm { background:#22C55E; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px; }
.text-muted { color:#94A3B8; }
.text-sm { font-size:11px; }
.text-danger { color:#EF4444; font-weight:600; font-size:12px; }
.empty-state { text-align:center; color:#94A3B8; padding:24px 16px; }
.calendar-expanded { border-top:1px solid #E2E8F0; }
.job-detail-modal { position:fixed; inset:0; z-index:60; }
.job-detail-backdrop { position:absolute; inset:0; background:rgba(15,23,42,0.42); border:none; width:100%; height:100%; }
.job-detail-shell { position:relative; margin:4vh auto; max-width:720px; max-height:92vh; overflow:hidden; border-radius:16px; background:#fff; box-shadow:0 24px 80px rgba(15,23,42,0.24); display:flex; flex-direction:column; }
.job-detail-header { background:linear-gradient(135deg,#3B82F6,#1D4ED8); border-radius:16px 16px 0 0; color:#fff; }
.job-detail-title { color:#fff; }
.job-detail-title .mdi { margin-right:8px; }
.job-detail-body { padding:0; max-height:75vh; overflow-y:auto; }
.hero-card { padding:20px; background:linear-gradient(135deg,#EFF6FF,#DBEAFE); display:flex; gap:20px; }
.hero-block { flex:1; }
.hero-label { font-size:12px; color:#3B82F6; font-weight:600; margin-bottom:8px; display:flex; gap:4px; align-items:center; }
.hero-student { display:flex; align-items:center; gap:12px; }
.hero-avatar { width:48px; height:48px; background:#3B82F6; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:16px; }
.hero-value { font-weight:700; font-size:16px; color:#1E293B; }
.hero-value--brand { color:#1E40AF; }
.hero-meta { font-size:12px; color:#64748B; }
.hero-meta--body { font-size:13px; color:#64748B; margin-top:2px; }
.modal-section { padding:20px; border-bottom:1px solid #E2E8F0; }
.modal-section--notes { border-bottom:none; }
.section-title { font-size:13px; font-weight:600; color:#1E293B; margin-bottom:16px; display:flex; align-items:center; gap:6px; }
.section-title--purple { color:#6D28D9; }
.section-title--green { color:#16A34A; }
.section-title--amber { color:#B45309; }
.timeline { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.timeline-step { display:flex; align-items:center; gap:6px; }
.timeline-badge { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; }
.timeline-badge--done { background:#22C55E; }
.timeline-badge--current { background:#F59E0B; }
.timeline-badge--future { background:#E5E7EB; color:#9CA3AF; }
.timeline-copy { font-size:12px; display:flex; flex-direction:column; gap:2px; }
.timeline-copy span { color:#94A3B8; font-size:10px; }
.timeline-copy--current { font-weight:600; color:#F59E0B; }
.timeline-line { width:30px; height:2px; background:#E5E7EB; }
.timeline-line--done { background:#22C55E; }
.interview-card { background:#FEF3C7; border-radius:8px; padding:12px; display:flex; align-items:center; gap:12px; color:#92400E; }
.interview-card i { font-size:24px; color:#F59E0B; }
.coaching-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.coaching-card { background:#F3E8FF; border-radius:8px; padding:12px; text-align:center; }
.coaching-card div { font-size:11px; color:#7C3AED; margin-bottom:4px; }
.coaching-card strong { color:#6D28D9; }
.section-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
.records { display:flex; flex-direction:column; gap:8px; }
.record-item { display:flex; align-items:center; gap:12px; padding:10px 12px; background:#F8FAFC; border-radius:8px; border-left:3px solid #E2E8F0; flex-wrap:wrap; }
.record-item--green { border-left-color:#22C55E; }
.record-item--blue { border-left-color:#3B82F6; }
.record-item--purple { border-left-color:#8B5CF6; }
.record-date { font-size:11px; color:#94A3B8; min-width:50px; }
.record-tag { font-size:10px; padding:2px 8px; border-radius:999px; }
.record-tag--green { background:#DCFCE7; color:#166534; }
.record-tag--blue { background:#DBEAFE; color:#1E40AF; }
.record-tag--purple { background:#F3E8FF; color:#7C3AED; }
.record-hours { font-size:11px; color:#94A3B8; }
.record-summary { font-size:12px; flex:1; min-width:180px; }
.record-grade { font-size:9px; padding:2px 8px; border-radius:999px; }
.full-records { margin-top:16px; padding-top:16px; border-top:1px solid #E2E8F0; }
.full-records-title { font-size:12px; font-weight:600; color:#1E293B; margin-bottom:10px; }
.notes-card { background:#FFFBEB; border-radius:8px; padding:12px; font-size:13px; color:#92400E; line-height:1.6; }
.job-detail-footer { background:#F8FAFC; border-radius:0 0 16px 16px; justify-content:flex-end; }
</style>

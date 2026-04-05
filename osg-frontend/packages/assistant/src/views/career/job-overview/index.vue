<template>
  <div id="page-job-overview" class="page-job-overview">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h1>
        <p class="page-sub">查看助教账号下学员求职进度与近期面试安排</p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">求职总览</span>
        <span class="pending-pill">待跟进 {{ pendingFollowUpCount }}</span>
      </div>
    </div>

    <section class="card calendar-card">
      <div class="card-body card-body--calendar">
        <div class="calendar-toolbar">
          <div class="calendar-title-group">
            <i class="mdi mdi-calendar-month" aria-hidden="true" />
            <span class="calendar-title">学员面试安排</span>
            <span class="calendar-month">本周</span>
          </div>

          <div class="toolbar-divider" aria-hidden="true" />

          <div class="calendar-days">
            <article v-for="day in compactDays" :key="day.key" class="calendar-day" :class="day.tone">
              <span class="calendar-day__week">{{ day.weekday }}</span>
              <span class="calendar-day__date">{{ day.date }}</span>
            </article>
          </div>

          <div class="toolbar-divider" aria-hidden="true" />

          <div class="calendar-summary">
            <span v-for="item in summaryEvents" :key="item.label" class="summary-pill" :class="item.tone">
              <span>{{ item.label }}</span>
              <span>{{ item.student }}</span>
            </span>
          </div>

          <button
            id="assistant-toggle-view-btn"
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

      <div class="month-view" :style="{ display: isCalendarExpanded ? 'block' : 'none' }">
        <div class="month-legend">
          <span class="legend-item"><span class="legend-dot legend-dot--danger" />面试</span>
          <span class="legend-item"><span class="legend-dot legend-dot--primary" />今天</span>
        </div>

        <div class="week-schedule">
          <article v-for="item in calendarItems" :key="item.id" class="week-schedule__card" :class="item.tone">
            <div class="week-schedule__date">
              <strong>{{ formatMonthDay(item.interviewTime) }}</strong>
              <span>{{ formatWeekday(item.interviewTime) }}</span>
            </div>
            <div class="week-schedule__meta">
              <div>{{ item.studentName || '-' }} - {{ item.company || '-' }}</div>
              <div>{{ formatHourMinute(item.interviewTime) }} · {{ item.position || '-' }}</div>
            </div>
            <span class="tag" :class="item.tagTone">{{ item.tag }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="filters">
      <input
        v-model.trim="filters.keyword"
        class="form-input"
        type="text"
        placeholder="搜索学员姓名 / 公司 / 岗位..."
      />
      <select v-model="filters.stage" class="form-select">
        <option value="">全部状态</option>
        <option v-for="stage in stageOptions" :key="stage" :value="stage">
          {{ stage }}
        </option>
      </select>
      <select v-model="filters.coachingStatus" class="form-select">
        <option value="">全部跟进</option>
        <option v-for="status in coachingStatusOptions" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
      <button type="button" class="btn btn-outline" @click="resetFilters">
        <i class="mdi mdi-refresh" aria-hidden="true" />
        重置
      </button>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>求职总览加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-outline" @click="loadOverview">重新加载</button>
    </section>

    <section v-else class="card">
      <div class="card-header">
        <div class="tabs tabs--readonly">
          <div class="tab active">
            <i class="mdi mdi-school" aria-hidden="true" />
            助教跟进记录
            <span class="tab-count">{{ filteredRecords.length }}</span>
          </div>
        </div>
      </div>

      <div class="panel-banner">
        <i class="mdi mdi-eye-outline" aria-hidden="true" />
        当前仅展示助教可查看的求职跟进记录，不提供导师管理操作。
      </div>

      <div id="assistant-job-content-readonly" class="card-body card-body--table">
        <div v-if="loading" class="table-state">正在读取求职记录...</div>
        <div v-else-if="filteredRecords.length === 0" class="table-state">当前账号下暂无可展示的求职跟进记录。</div>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司/岗位</th>
                <th>阶段</th>
                <th>面试时间</th>
                <th>辅导状态</th>
                <th>结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id" class="row-highlight">
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: resolveAvatarColor(record.studentName) }">
                      {{ avatarText(record.studentName) }}
                    </div>
                    <div>
                      <div class="student-name">{{ record.studentName || '-' }}</div>
                      <div class="student-meta">ID: {{ record.studentId || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="company-name">{{ record.company || '-' }}</div>
                  <div class="student-meta">{{ record.position || '-' }}</div>
                </td>
                <td>
                  <span class="tag info">{{ record.interviewStage || '未更新' }}</span>
                </td>
                <td class="table-stack">
                  <strong>{{ formatDateTime(record.interviewTime) }}</strong>
                  <span class="student-meta">{{ formatScheduleHint(record.interviewTime) }}</span>
                </td>
                <td>
                  <span class="tag" :class="coachingStatusTone(record.coachingStatus)">
                    {{ record.coachingStatus || '未跟进' }}
                  </span>
                </td>
                <td>
                  <span class="tag" :class="resultTone(record.result)">
                    {{ record.result || '进行中' }}
                  </span>
                </td>
                <td>
                  <button type="button" class="btn btn-text btn-sm link-button" @click="selectedId = record.id">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-if="selectedRecord" class="card detail-card-shell">
      <div class="card-body detail-card">
        <div class="detail-card__header">
          <h2>跟进详情</h2>
          <span class="detail-meta">{{ selectedRecord.studentName || '-' }}</span>
        </div>

        <div class="detail-grid">
          <div>
            <span class="detail-label">学员</span>
            <div class="detail-value">{{ selectedRecord.studentName || '-' }}</div>
          </div>
          <div>
            <span class="detail-label">岗位</span>
            <div class="detail-value">{{ selectedRecord.position || '-' }}</div>
          </div>
          <div>
            <span class="detail-label">公司</span>
            <div class="detail-value">{{ selectedRecord.company || '-' }}</div>
          </div>
          <div>
            <span class="detail-label">地点</span>
            <div class="detail-value">{{ selectedRecord.location || '-' }}</div>
          </div>
          <div>
            <span class="detail-label">阶段</span>
            <div class="detail-value">{{ selectedRecord.interviewStage || '未更新' }}</div>
          </div>
          <div>
            <span class="detail-label">面试时间</span>
            <div class="detail-value">{{ formatDateTime(selectedRecord.interviewTime) }}</div>
          </div>
          <div>
            <span class="detail-label">辅导状态</span>
            <div class="detail-value">{{ selectedRecord.coachingStatus || '未跟进' }}</div>
          </div>
          <div>
            <span class="detail-label">结果</span>
            <div class="detail-value">{{ selectedRecord.result || '进行中' }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getAssistantJobOverviewCalendar,
  getAssistantJobOverviewList,
  type AssistantJobOverviewRecord,
} from '@osg/shared/api'

interface CalendarItemView extends AssistantJobOverviewRecord {
  tone: string
  tag: string
  tagTone: string
}

const loading = ref(true)
const errorMessage = ref('')
const isCalendarExpanded = ref(false)
const records = ref<AssistantJobOverviewRecord[]>([])
const calendarRecords = ref<AssistantJobOverviewRecord[]>([])
const selectedId = ref<number | null>(null)

const filters = reactive({
  keyword: '',
  stage: '',
  coachingStatus: '',
})

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = filters.keyword.trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, record.company, record.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    return (
      matchesKeyword &&
      (!filters.stage || record.interviewStage === filters.stage) &&
      (!filters.coachingStatus || record.coachingStatus === filters.coachingStatus)
    )
  }),
)

const selectedRecord = computed(
  () => filteredRecords.value.find((record) => record.id === selectedId.value) || null,
)

const stageOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.interviewStage).filter(Boolean))) as string[],
)

const coachingStatusOptions = computed(() =>
  Array.from(new Set(records.value.map((record) => record.coachingStatus).filter(Boolean))) as string[],
)

const pendingFollowUpCount = computed(
  () =>
    filteredRecords.value.filter((record) => {
      const status = String(record.coachingStatus || '').toLowerCase()
      return !status || status.includes('pending') || status.includes('new') || status.includes('待')
    }).length,
)

const compactDays = computed(() => {
  const source = calendarRecords.value.length ? calendarRecords.value : filteredRecords.value
  return source.slice(0, 7).map((record, index) => ({
    key: `${record.id}-${index}`,
    weekday: formatWeekday(record.interviewTime),
    date: formatDay(record.interviewTime),
    tone: calendarTone(record.coachingStatus),
  }))
})

const summaryEvents = computed(() =>
  calendarRecords.value.slice(0, 3).map((record) => ({
    label: formatMonthDay(record.interviewTime),
    student: record.studentName || '-',
    tone: calendarTone(record.coachingStatus),
  })),
)

const calendarItems = computed<CalendarItemView[]>(() =>
  [...calendarRecords.value]
    .filter((record) => record.interviewTime)
    .sort((left, right) => String(left.interviewTime).localeCompare(String(right.interviewTime)))
    .slice(0, 4)
    .map((record) => ({
      ...record,
      tone: calendarTone(record.coachingStatus),
      tag: calendarTag(record.interviewTime),
      tagTone: calendarTone(record.coachingStatus),
    })),
)

function avatarText(name?: string) {
  return (name || '学').slice(0, 1)
}

function resolveAvatarColor(name?: string) {
  const seed = (name || 'assistant').length % 4
  return ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'][seed]
}

function formatDateTime(value?: string) {
  if (!value) {
    return '未安排'
  }
  return value.replace('T', ' ').slice(0, 16)
}

function formatMonthDay(value?: string) {
  if (!value) {
    return '--'
  }
  return value.slice(5, 10)
}

function formatDay(value?: string) {
  if (!value) {
    return '--'
  }
  return value.slice(8, 10)
}

function formatHourMinute(value?: string) {
  if (!value) {
    return '--:--'
  }
  return value.slice(11, 16)
}

function formatWeekday(value?: string) {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

function formatScheduleHint(value?: string) {
  if (!value) {
    return '尚未安排面试'
  }
  return `${formatWeekday(value)} ${formatHourMinute(value)}`
}

function calendarTone(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (!normalized || normalized.includes('pending') || normalized.includes('new') || normalized.includes('待')) {
    return 'warning'
  }
  if (normalized.includes('coach') || normalized.includes('辅导')) {
    return 'info'
  }
  return 'default'
}

function calendarTag(value?: string) {
  if (!value) {
    return '待定'
  }
  return formatWeekday(value)
}

function coachingStatusTone(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (!normalized || normalized.includes('pending') || normalized.includes('new') || normalized.includes('待')) {
    return 'warning'
  }
  if (normalized.includes('coach') || normalized.includes('辅导')) {
    return 'info'
  }
  if (normalized.includes('done') || normalized.includes('finish') || normalized.includes('完成')) {
    return 'success'
  }
  return 'neutral'
}

function resultTone(result?: string) {
  const normalized = String(result || '').toLowerCase()
  if (normalized.includes('offer')) {
    return 'success'
  }
  if (normalized.includes('reject')) {
    return 'danger'
  }
  if (!normalized) {
    return 'neutral'
  }
  return 'info'
}

function resetFilters() {
  filters.keyword = ''
  filters.stage = ''
  filters.coachingStatus = ''
}

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [listResponse, calendarResponse] = await Promise.all([
      getAssistantJobOverviewList(),
      getAssistantJobOverviewCalendar(),
    ])

    records.value = listResponse.rows || []
    calendarRecords.value = calendarResponse || []
  } catch (error: any) {
    errorMessage.value = error?.message || '求职总览暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

watch(
  filteredRecords,
  (value) => {
    if (!value.length) {
      selectedId.value = null
      return
    }

    if (!value.some((record) => record.id === selectedId.value)) {
      selectedId.value = value[0].id
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadOverview()
})
</script>

<style scoped lang="scss">
.page-job-overview {
  display: block;
  color: var(--text);
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text2);
}

.status-pill,
.pending-pill,
.tab-count,
.summary-pill,
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill {
  padding: 8px 14px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
}

.pending-pill {
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.btn {
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
}

.btn-text {
  color: var(--primary);
}

.btn-outline {
  padding: 8px 12px;
  background: #fff;
  color: var(--text2);
  box-shadow: inset 0 0 0 1px var(--border);
}

.card,
.filters,
.state-card {
  margin-bottom: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.card-body {
  padding: 12px 16px;
}

.card-body--calendar {
  padding: 18px 20px;
}

.card-body--table {
  padding: 0;
}

.card-header {
  padding: 16px 18px 0;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.calendar-title-group,
.calendar-days,
.calendar-summary,
.month-legend,
.student-cell,
.table-stack,
.tabs {
  display: flex;
  align-items: center;
}

.calendar-title-group {
  gap: 8px;
}

.calendar-title {
  font-weight: 700;
}

.calendar-month {
  color: var(--text2);
  font-size: 12px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
}

.calendar-days,
.calendar-summary {
  gap: 8px;
}

.calendar-day {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 46px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--bg);
}

.calendar-day__week,
.calendar-day__date {
  font-size: 12px;
}

.calendar-day__date {
  font-weight: 700;
}

.summary-pill {
  gap: 6px;
  padding: 8px 10px;
}

.warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.default,
.neutral {
  background: var(--bg);
  color: var(--text2);
}

.success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.toggle-calendar-btn {
  margin-left: auto;
}

.month-view {
  padding: 0 20px 18px;
}

.month-legend {
  gap: 14px;
  margin-bottom: 14px;
  color: var(--text2);
  font-size: 12px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--danger {
  background: #ef4444;
}

.legend-dot--primary {
  background: var(--primary);
}

.week-schedule {
  display: grid;
  gap: 10px;
}

.week-schedule__card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid var(--border);
}

.week-schedule__date {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.week-schedule__date strong {
  color: var(--primary);
}

.week-schedule__meta {
  display: grid;
  gap: 4px;
  font-size: 13px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px;
}

.form-input,
.form-select {
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 12px;
}

.form-input {
  flex: 1 1 240px;
  padding: 0 12px;
}

.form-select {
  min-width: 140px;
  padding: 0 10px;
}

.tabs {
  gap: 10px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--bg);
  color: var(--text2);
}

.tab.active {
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
}

.tab-count {
  padding: 2px 8px;
  background: #fff;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
}

.table thead {
  background: var(--bg);
}

.table th,
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
  color: var(--text);
}

.row-highlight:hover {
  background: rgba(59, 130, 246, 0.03);
}

.student-cell {
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.student-name,
.company-name,
.detail-value {
  font-weight: 700;
}

.student-meta,
.detail-label,
.detail-meta {
  color: var(--text2);
  font-size: 12px;
}

.table-stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.link-button {
  padding: 0;
}

.table-state,
.state-card {
  color: var(--text2);
}

.state-card {
  display: grid;
  gap: 8px;
  padding: 28px;
}

.state-card--error {
  border: 1px solid rgba(239, 68, 68, 0.14);
  background: #fff7f7;
}

.detail-card-shell {
  margin-top: 16px;
}

.detail-card {
  padding: 20px;
}

.detail-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .page-header,
  .page-header__actions,
  .detail-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .toggle-calendar-btn {
    margin-left: 0;
  }

  .week-schedule__card,
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

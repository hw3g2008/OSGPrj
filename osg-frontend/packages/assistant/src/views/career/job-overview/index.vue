<template>
  <div id="page-job-overview" class="page-job-overview">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h1>
        <p class="page-sub">聚合查看当前账号下的求职跟进状态、面试排期和记录详情，快速掌握近期求职进展。</p>
      </div>
      <div class="page-header__actions">
        <span class="status-pill">求职总览</span>
        <span class="pending-pill">待跟进 {{ pendingFollowUpCount }}</span>
      </div>
    </div>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">当前记录</span>
        <strong class="summary-card__value">{{ filteredRecords.length }}</strong>
        <span class="summary-card__hint">筛选后可见的求职跟进记录</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">待跟进</span>
        <strong class="summary-card__value summary-card__value--warning">{{ pendingFollowUpCount }}</strong>
        <span class="summary-card__hint">仍需助教查看的状态条目</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">面试排期</span>
        <strong class="summary-card__value summary-card__value--accent">{{ calendarItems.length }}</strong>
        <span class="summary-card__hint">当前账号下带面试时间的记录</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">已结束</span>
        <strong class="summary-card__value summary-card__value--success">{{ completedCount }}</strong>
        <span class="summary-card__hint">Offer / Rejected 等已完成状态</span>
      </article>
    </section>

    <section class="card calendar-card">
      <div class="card-body card-body--calendar">
        <div class="calendar-toolbar">
          <div class="calendar-title-group">
            <i class="mdi mdi-calendar-month" aria-hidden="true" />
            <span class="calendar-title">学员面试安排</span>
            <span class="calendar-month">本周</span>
          </div>

          <div class="compact-days">
            <article
              v-for="day in compactDays"
              :key="day.key"
              class="compact-day"
              :class="day.tone"
            >
              <span class="compact-day__week">{{ day.weekday }}</span>
              <span class="compact-day__date">{{ day.date }}</span>
            </article>
          </div>

          <div class="calendar-summary">
            <span
              v-for="item in summaryEvents"
              :key="item.label"
              class="summary-pill"
              :class="item.tone"
            >
              <span>{{ item.label }}</span>
              <span>{{ item.student }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="filters">
      <input
        v-model.trim="filters.keyword"
        class="form-input"
        type="text"
        placeholder="搜索学员、公司或岗位"
      />
      <select v-model="filters.stage" class="form-select">
        <option value="">全部阶段</option>
        <option v-for="stage in stageOptions" :key="stage" :value="stage">
          {{ stage }}
        </option>
      </select>
      <select v-model="filters.coachingStatus" class="form-select">
        <option value="">全部状态</option>
        <option v-for="status in coachingStatusOptions" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
      <button type="button" class="btn btn-outline" @click="resetFilters">重置筛选</button>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>求职总览加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-outline" @click="loadOverview">重新加载</button>
    </section>

    <section v-else class="card">
      <div class="card-header">
        <span class="card-title">跟进详情</span>
        <span class="card-range">只读视图</span>
      </div>

      <div v-if="loading" class="card-body card-body--state">
        正在读取求职记录...
      </div>
      <div v-else-if="filteredRecords.length === 0" class="card-body card-body--state">
        当前账号下暂无可展示的求职跟进记录。
      </div>
      <div v-else class="card-body card-body--table">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>公司 / 岗位</th>
                <th>面试阶段</th>
                <th>面试时间</th>
                <th>跟进状态</th>
                <th>结果</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id">
                <td>
                  <div class="table-primary">{{ record.studentName || '-' }}</div>
                  <div class="table-muted">ID: {{ record.studentId || '-' }}</div>
                </td>
                <td>
                  <div class="table-primary">{{ record.company || '-' }}</div>
                  <div class="table-muted">{{ record.position || '-' }}</div>
                </td>
                <td>
                  <span class="table-tag table-tag--info">{{ record.interviewStage || '未更新' }}</span>
                </td>
                <td>{{ formatDateTime(record.interviewTime) }}</td>
                <td>
                  <span class="table-tag" :class="coachingStatusTone(record.coachingStatus)">
                    {{ record.coachingStatus || '未跟进' }}
                  </span>
                </td>
                <td>
                  <span class="table-tag" :class="resultTone(record.result)">
                    {{ record.result || '进行中' }}
                  </span>
                </td>
                <td>
                  <button type="button" class="link-button" @click="selectedId = record.id">查看详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <section v-if="selectedRecord" class="detail-panel">
          <div class="detail-panel__header">
            <h2>跟进详情</h2>
            <span class="detail-panel__meta">{{ selectedRecord.studentName || '-' }}</span>
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
          </div>
          <div class="detail-callout">
            这里汇总当前求职记录的关键节点、面试安排和结果摘要，便于快速完成沟通与跟进。
          </div>
        </section>
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

type CompactDayTone = 'is-today' | 'has-event' | 'is-empty'

const loading = ref(true)
const errorMessage = ref('')
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

const completedCount = computed(
  () =>
    filteredRecords.value.filter((record) => {
      const result = String(record.result || '').toLowerCase()
      return result.includes('offer') || result.includes('reject') || result.includes('rejected')
    }).length,
)

const calendarItems = computed(() =>
  [...calendarRecords.value]
    .filter((record) => record.interviewTime)
    .sort((left, right) => String(left.interviewTime).localeCompare(String(right.interviewTime)))
    .slice(0, 4),
)

const compactDays = computed(() => {
  const today = new Date()
  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(today)
    current.setDate(today.getDate() + index)
    const monthDay = `${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')}`
    const hasEvent = calendarItems.value.some((item) => formatMonthDay(item.interviewTime) === monthDay)
    const tone: CompactDayTone = index === 0 ? 'is-today' : hasEvent ? 'has-event' : 'is-empty'
    return {
      key: `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][current.getDay()],
      date: monthDay,
      tone,
    }
  })
})

const summaryEvents = computed(() =>
  calendarItems.value.length
    ? calendarItems.value.map((item) => ({
        label: item.company || '未命名公司',
        student: item.studentName || '未命名学员',
        tone: item.result ? 'summary-pill--success' : 'summary-pill--warning',
      }))
    : [{ label: '暂无面试安排', student: '保持关注', tone: 'summary-pill--default' }],
)

function formatDateTime(value?: string) {
  if (!value) return '未安排'
  return value.replace('T', ' ').slice(0, 16)
}

function formatMonthDay(value?: string) {
  if (!value) return '--'
  return value.slice(5, 10)
}

function coachingStatusTone(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (!normalized || normalized.includes('pending') || normalized.includes('new') || normalized.includes('待')) {
    return 'table-tag--warning'
  }
  if (normalized.includes('coach') || normalized.includes('辅导')) {
    return 'table-tag--info'
  }
  if (normalized.includes('done') || normalized.includes('finish') || normalized.includes('完成')) {
    return 'table-tag--success'
  }
  return 'table-tag--default'
}

function resultTone(result?: string) {
  const normalized = String(result || '').toLowerCase()
  if (normalized.includes('offer')) return 'table-tag--success'
  if (normalized.includes('reject')) return 'table-tag--danger'
  if (!normalized) return 'table-tag--default'
  return 'table-tag--info'
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
  color: var(--text);
}

.page-header,
.page-header__actions,
.card-header,
.calendar-toolbar,
.calendar-title-group,
.filters,
.detail-panel__header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header,
.filters {
  justify-content: space-between;
}

.page-header {
  margin-bottom: 24px;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.page-title-en {
  margin-left: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
}

.page-sub {
  margin: 8px 0 0;
  color: var(--text2);
  line-height: 1.7;
}

.status-pill,
.pending-pill,
.summary-pill,
.table-tag,
.card-range {
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

.pending-pill,
.card-range {
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.summary-grid,
.detail-grid {
  display: grid;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.card,
.state-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.summary-card__label,
.summary-card__hint,
.table-muted,
.detail-label {
  color: var(--muted);
}

.summary-card__value {
  font-size: 28px;
  line-height: 1;
  color: #0f172a;
}

.summary-card__value--warning { color: #d97706; }
.summary-card__value--accent { color: #2563eb; }
.summary-card__value--success { color: #16a34a; }

.card {
  margin-bottom: 20px;
  overflow: hidden;
}

.card-header {
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(135deg, #e8f0f8, #dbeafe);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.card-body {
  padding: 22px;
}

.card-body--calendar {
  padding: 18px 22px;
}

.calendar-toolbar {
  justify-content: space-between;
  align-items: stretch;
  flex-wrap: wrap;
}

.calendar-title-group {
  font-weight: 700;
  color: #0f172a;
}

.calendar-month {
  color: var(--primary);
  font-size: 13px;
}

.compact-days {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  flex: 1;
  min-width: 320px;
}

.compact-day {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  text-align: center;
}

.compact-day.is-today {
  background: #dbeafe;
  color: #1d4ed8;
}

.compact-day.has-event {
  background: #fef3c7;
  color: #b45309;
}

.compact-day.is-empty {
  color: #64748b;
}

.compact-day__week {
  font-size: 12px;
  font-weight: 600;
}

.compact-day__date {
  font-size: 15px;
  font-weight: 700;
}

.calendar-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-pill {
  gap: 8px;
  padding: 9px 12px;
  background: #eef2ff;
  color: #4338ca;
}

.summary-pill--warning {
  background: #fff7ed;
  color: #c2410c;
}

.summary-pill--success {
  background: #f0fdf4;
  color: #15803d;
}

.summary-pill--default {
  background: #f1f5f9;
  color: #475569;
}

.filters {
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.form-input,
.form-select {
  height: 44px;
  min-width: 180px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-outline {
  border: 1px solid var(--border);
  background: #fff;
  color: #5b7fab;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table th,
.table td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  background: #f8fbff;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.table-primary,
.detail-value {
  color: #0f172a;
  font-weight: 600;
}

.table-tag {
  padding: 6px 10px;
}

.table-tag--info {
  background: #dbeafe;
  color: #1d4ed8;
}

.table-tag--warning {
  background: #fef3c7;
  color: #b45309;
}

.table-tag--success {
  background: #dcfce7;
  color: #15803d;
}

.table-tag--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.table-tag--default {
  background: #e2e8f0;
  color: #475569;
}

.link-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.detail-panel {
  margin-top: 22px;
  border-top: 1px solid var(--border);
  padding-top: 22px;
}

.detail-panel__header {
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-panel__header h2 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.detail-panel__meta {
  color: var(--muted);
  font-size: 13px;
}

.detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
}

.detail-callout {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff, #f8fafc);
  color: #334155;
  line-height: 1.7;
}

.card-body--state,
.state-card {
  padding: 24px;
}

.state-card--error {
  background: #fff7f7;
}

.state-card h2 {
  margin: 0 0 8px;
}

.state-card p {
  margin: 0 0 16px;
  color: var(--text2);
}

@media (max-width: 1080px) {
  .summary-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .calendar-toolbar,
  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .compact-days {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .summary-grid,
  .detail-grid,
  .compact-days {
    grid-template-columns: 1fr;
  }

  .page-header,
  .page-header__actions,
  .card-header,
  .detail-panel__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

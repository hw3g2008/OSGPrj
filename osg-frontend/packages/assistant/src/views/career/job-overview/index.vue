<template>
  <div id="page-job-overview" class="career-page job-overview-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员求职总览
          <span class="page-title-en">Job Overview</span>
        </h1>
        <p class="page-sub">
          聚合查看当前账号下的求职跟进状态、面试排期和记录详情，快速掌握近期求职进展。
        </p>
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

    <section class="toolbar-card">
      <label class="toolbar-field">
        <span class="toolbar-field__label">搜索学员 / 公司</span>
        <input
          v-model.trim="filters.keyword"
          class="form-input"
          type="text"
          placeholder="搜索学员、公司或岗位"
        />
      </label>
      <label class="toolbar-field">
        <span class="toolbar-field__label">面试阶段</span>
        <select v-model="filters.stage" class="form-select">
          <option value="">全部阶段</option>
          <option v-for="stage in stageOptions" :key="stage" :value="stage">
            {{ stage }}
          </option>
        </select>
      </label>
      <label class="toolbar-field">
        <span class="toolbar-field__label">跟进状态</span>
        <select v-model="filters.coachingStatus" class="form-select">
          <option value="">全部状态</option>
          <option v-for="status in coachingStatusOptions" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
      </label>
      <button type="button" class="ghost-button" @click="resetFilters">重置筛选</button>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>求职总览加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadOverview">重新加载</button>
    </section>

    <template v-else>
      <section class="followup-banner">
        <div>
          <h2>待跟进提示</h2>
          <p>汇总近期需要关注的求职跟进事项和面试安排，方便优先处理关键记录。</p>
        </div>
        <span class="followup-banner__badge">待跟进 {{ pendingFollowUpCount }}</span>
      </section>

      <div class="content-grid">
        <section class="panel-card">
          <header class="panel-card__header">
            <div>
              <h2>求职状态列表</h2>
              <p>筛选结果会同步反映到详情区与面试排期面板。</p>
            </div>
          </header>

          <div v-if="loading" class="panel-card__body panel-card__body--state">
            正在读取求职记录...
          </div>
          <div v-else-if="filteredRecords.length === 0" class="panel-card__body panel-card__body--state">
            当前账号下暂无可展示的求职跟进记录。
          </div>
          <div v-else class="panel-card__body">
            <table class="data-table">
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
        </section>

        <section class="side-stack">
          <article class="panel-card">
            <header class="panel-card__header">
              <div>
                <h2>面试排期</h2>
                <p>展示当前账号下已写入面试时间的记录。</p>
              </div>
            </header>

            <div v-if="calendarItems.length === 0" class="panel-card__body panel-card__body--state">
              当前没有面试排期。
            </div>
            <div v-else class="panel-card__body schedule-list">
              <article v-for="item in calendarItems" :key="item.id" class="schedule-item">
                <div class="schedule-item__time">
                  <strong>{{ formatMonthDay(item.interviewTime) }}</strong>
                  <span>{{ formatHourMinute(item.interviewTime) }}</span>
                </div>
                <div class="schedule-item__content">
                  <h3>{{ item.studentName || '未命名学员' }}</h3>
                  <p>{{ item.company || '-' }} · {{ item.interviewStage || '未更新阶段' }}</p>
                </div>
              </article>
            </div>
          </article>

          <article class="panel-card">
            <header class="panel-card__header">
              <div>
                <h2>跟进详情</h2>
                <p>查看当前记录的跟进信息、面试安排和结果摘要。</p>
              </div>
            </header>

            <div v-if="selectedRecord" class="panel-card__body detail-card">
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
            </div>
            <div v-else class="panel-card__body panel-card__body--state">
              选择左侧列表中的一条记录后，可在这里查看对应的跟进详情。
            </div>
          </article>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getAssistantJobOverviewCalendar,
  getAssistantJobOverviewList,
  type AssistantJobOverviewRecord,
} from '@osg/shared/api'

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

function formatHourMinute(value?: string) {
  if (!value) {
    return '--:--'
  }
  return value.slice(11, 16)
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
  if (normalized.includes('offer')) {
    return 'table-tag--success'
  }
  if (normalized.includes('reject')) {
    return 'table-tag--danger'
  }
  if (!normalized) {
    return 'table-tag--default'
  }
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
.career-page {
  color: var(--text);
}

.page-header,
.page-header__actions,
.panel-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.page-title-en {
  color: var(--muted);
  font-size: 15px;
  font-weight: 500;
}

.page-sub {
  margin: 8px 0 0;
  color: var(--text2);
  line-height: 1.7;
}

.page-header__actions {
  align-items: center;
}

.status-pill,
.pending-pill,
.followup-banner__badge,
.table-tag {
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
.followup-banner__badge {
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.summary-grid,
.content-grid,
.detail-grid {
  display: grid;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.toolbar-card,
.followup-banner,
.panel-card,
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
.toolbar-field__label,
.panel-card__header p,
.table-muted,
.schedule-item__content p,
.detail-label {
  color: var(--text2);
}

.summary-card__label {
  font-size: 13px;
  font-weight: 600;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--warning {
  color: #b45309;
}

.summary-card__value--accent {
  color: var(--primary);
}

.summary-card__value--success {
  color: #15803d;
}

.summary-card__hint {
  font-size: 12px;
}

.toolbar-card {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) repeat(2, minmax(160px, 1fr)) auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 20px;
  padding: 20px;
}

.toolbar-field {
  display: grid;
  gap: 8px;
}

.toolbar-field__label {
  font-size: 12px;
  font-weight: 700;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 0 14px;
  font-size: 14px;
}

.ghost-button,
.link-button {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.followup-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid rgba(245, 158, 11, 0.14);
}

.followup-banner h2,
.panel-card__header h2 {
  margin: 0;
}

.followup-banner p,
.panel-card__header p {
  margin: 6px 0 0;
  font-size: 13px;
}

.content-grid {
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.side-stack {
  display: grid;
  gap: 18px;
}

.panel-card {
  overflow: hidden;
}

.panel-card__header {
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-card__body {
  padding: 18px 22px 22px;
}

.panel-card__body--state {
  color: var(--text2);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--border);
  padding: 14px 12px;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  color: var(--text2);
  font-size: 12px;
  font-weight: 700;
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.table-primary,
.detail-value,
.schedule-item__content h3 {
  font-weight: 700;
}

.table-muted {
  margin-top: 4px;
  font-size: 12px;
}

.table-tag {
  padding: 6px 10px;
}

.table-tag--success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.table-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.table-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.table-tag--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.table-tag--default {
  background: var(--bg);
  color: var(--text2);
}

.schedule-list {
  display: grid;
  gap: 12px;
}

.schedule-item {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
}

.schedule-item__time {
  display: grid;
  gap: 4px;
  justify-items: center;
  border-right: 1px dashed var(--border);
  padding-right: 14px;
}

.schedule-item__time strong {
  color: var(--primary);
  font-size: 18px;
}

.schedule-item__time span,
.schedule-item__content p,
.detail-label {
  font-size: 12px;
}

.schedule-item__content h3 {
  margin: 0;
  font-size: 14px;
}

.schedule-item__content p {
  margin: 6px 0 0;
}

.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
}

.detail-callout {
  margin-top: 18px;
  border-radius: 16px;
  background: var(--bg);
  color: var(--text2);
  padding: 14px 16px;
  line-height: 1.7;
  font-size: 13px;
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

@media (max-width: 1280px) {
  .summary-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .page-header,
  .page-header__actions,
  .followup-banner,
  .panel-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .content-grid,
  .detail-grid,
  .toolbar-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .data-table {
    min-width: 760px;
  }

  .panel-card {
    overflow: auto;
  }
}
</style>

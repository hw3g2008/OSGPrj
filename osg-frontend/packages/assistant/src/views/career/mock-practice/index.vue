<template>
  <div id="page-mock-practice" class="career-page mock-practice-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h1>
        <p class="page-sub">
          查看已分配的模拟应聘记录、安排时间和反馈结果，及时掌握近期练习进度。
        </p>
      </div>
      <div class="page-header__actions">
        <span class="status-pill">练习记录</span>
        <span class="readonly-pill">近期安排 / 反馈进展</span>
      </div>
    </div>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">全部记录</span>
        <strong class="summary-card__value">{{ filteredRecords.length }}</strong>
        <span class="summary-card__hint">当前筛选后的模拟应聘记录</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">待开始</span>
        <strong class="summary-card__value summary-card__value--warning">{{ pendingCount }}</strong>
        <span class="summary-card__hint">Pending / Scheduled 状态</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">已完成</span>
        <strong class="summary-card__value summary-card__value--success">{{ completedCount }}</strong>
        <span class="summary-card__hint">已回填反馈结果的记录</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">有反馈结果</span>
        <strong class="summary-card__value summary-card__value--accent">{{ feedbackCount }}</strong>
        <span class="summary-card__hint">当前能查看反馈摘要的记录数</span>
      </article>
    </section>

    <section class="toolbar-card">
      <div class="tab-row">
        <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          全部 {{ records.length }}
        </button>
        <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'upcoming' }"
          @click="activeTab = 'upcoming'"
        >
          待开始 {{ upcomingCount }}
        </button>
        <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'done' }"
          @click="activeTab = 'done'"
        >
          已完成 {{ doneCount }}
        </button>
      </div>

      <div class="toolbar-row">
        <label class="toolbar-field">
          <span class="toolbar-field__label">搜索学员 / 内容</span>
          <input
            v-model.trim="filters.keyword"
            class="form-input"
            type="text"
            placeholder="搜索学员姓名或申请内容"
          />
        </label>
        <label class="toolbar-field">
          <span class="toolbar-field__label">类型</span>
          <select v-model="filters.practiceType" class="form-select">
            <option value="">全部类型</option>
            <option v-for="option in practiceTypeOptions" :key="option" :value="option">
              {{ practiceTypeLabel(option) }}
            </option>
          </select>
        </label>
        <label class="toolbar-field">
          <span class="toolbar-field__label">状态</span>
          <select v-model="filters.status" class="form-select">
            <option value="">全部状态</option>
            <option v-for="option in statusOptions" :key="option" :value="option">
              {{ statusLabel(option) }}
            </option>
          </select>
        </label>
        <button type="button" class="ghost-button" @click="resetFilters">重置筛选</button>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>模拟应聘记录加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadRecords">重新加载</button>
    </section>

    <section v-else class="panel-card">
      <header class="panel-card__header">
        <div>
          <h2>记录列表</h2>
          <p>集中查看模拟应聘安排、导师信息和反馈结果。</p>
        </div>
      </header>

      <div v-if="loading" class="panel-card__body panel-card__body--state">
        正在读取模拟应聘记录...
      </div>
      <div v-else-if="filteredRecords.length === 0" class="panel-card__body panel-card__body--state">
        当前筛选下没有可展示的模拟应聘记录。
      </div>
      <div v-else class="panel-card__body">
        <table class="data-table mock-practice-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>类型</th>
              <th>状态</th>
              <th>安排时间</th>
              <th>导师</th>
              <th>反馈结果</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.practiceId">
              <td>
                <div class="table-primary">{{ record.studentName || '-' }}</div>
                <div class="table-muted">ID: {{ record.studentId || '-' }}</div>
              </td>
              <td>
                <span class="table-tag table-tag--info">{{ practiceTypeLabel(record.practiceType) }}</span>
              </td>
              <td>
                <span class="table-tag" :class="statusTone(record.status)">
                  {{ statusLabel(record.status) }}
                </span>
              </td>
              <td>{{ formatDateTime(record.scheduledAt || record.submittedAt) }}</td>
              <td>
                <div class="table-primary">{{ record.mentorNames || '暂未分配导师' }}</div>
                <div class="table-muted">{{ record.mentorBackgrounds || '等待后续分配' }}</div>
              </td>
              <td>
                <div class="table-primary">{{ feedbackLabel(record.feedbackRating) }}</div>
                <div class="table-muted">{{ record.feedbackSummary || '暂无反馈摘要' }}</div>
              </td>
              <td>
                <button type="button" class="link-button" @click="openDetail(record)">查看详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="detailModal.visible" class="modal-backdrop" @click.self="closeDetail">
      <section class="modal-card">
        <header class="modal-card__header">
          <div>
            <h2>模拟应聘详情</h2>
            <p>{{ detailModal.record?.studentName || '-' }} · {{ practiceTypeLabel(detailModal.record?.practiceType) }}</p>
          </div>
          <button type="button" class="icon-button" @click="closeDetail">关闭</button>
        </header>

        <div class="modal-card__body" v-if="detailModal.record">
          <div class="detail-grid">
            <div>
              <span class="detail-label">状态</span>
              <div class="detail-value">{{ statusLabel(detailModal.record.status) }}</div>
            </div>
            <div>
              <span class="detail-label">安排时间</span>
              <div class="detail-value">{{ formatDateTime(detailModal.record.scheduledAt || detailModal.record.submittedAt) }}</div>
            </div>
            <div>
              <span class="detail-label">导师</span>
              <div class="detail-value">{{ detailModal.record.mentorNames || '暂未分配导师' }}</div>
            </div>
            <div>
              <span class="detail-label">已完成课时</span>
              <div class="detail-value">{{ detailModal.record.completedHours || 0 }} h</div>
            </div>
          </div>

          <div class="detail-section">
            <span class="detail-label">申请内容</span>
            <div class="detail-panel">{{ detailModal.record.requestContent || '暂无申请内容' }}</div>
          </div>

          <div class="detail-section">
            <span class="detail-label">反馈摘要</span>
            <div class="detail-panel">{{ detailModal.record.feedbackSummary || '当前记录尚未回填反馈摘要。' }}</div>
          </div>

          <div class="detail-callout">
            这里汇总本次模拟应聘的申请内容、安排信息和反馈摘要，便于后续沟通与复盘。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getAssistantMockPracticeList,
  type AssistantMockPracticeRecord,
} from '@osg/shared/api'

type ActiveTab = 'all' | 'upcoming' | 'done'

const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<ActiveTab>('all')
const records = ref<AssistantMockPracticeRecord[]>([])

const filters = reactive({
  keyword: '',
  practiceType: '',
  status: '',
})

const detailModal = reactive<{
  visible: boolean
  record: AssistantMockPracticeRecord | null
}>({
  visible: false,
  record: null,
})

const filteredRecords = computed(() =>
  records.value.filter((record) => {
    const keyword = filters.keyword.trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [record.studentName, record.requestContent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesTab =
      activeTab.value === 'all' ||
      (activeTab.value === 'upcoming' && isUpcoming(record.status)) ||
      (activeTab.value === 'done' && isDone(record.status))

    return (
      matchesKeyword &&
      matchesTab &&
      (!filters.practiceType || record.practiceType === filters.practiceType) &&
      (!filters.status || record.status === filters.status)
    )
  }),
)

const pendingCount = computed(() => filteredRecords.value.filter((record) => isUpcoming(record.status)).length)
const completedCount = computed(() => filteredRecords.value.filter((record) => isDone(record.status)).length)
const feedbackCount = computed(
  () => filteredRecords.value.filter((record) => Boolean(record.feedbackSummary || record.feedbackRating)).length,
)
const upcomingCount = computed(() => records.value.filter((record) => isUpcoming(record.status)).length)
const doneCount = computed(() => records.value.filter((record) => isDone(record.status)).length)

const practiceTypeOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.practiceType).filter(Boolean))) as string[],
)

const statusOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.status).filter(Boolean))) as string[],
)

function isUpcoming(status?: string) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'pending' || normalized === 'scheduled' || normalized === 'confirmed'
}

function isDone(status?: string) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'completed' || normalized === 'cancelled'
}

function practiceTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    mock_interview: '模拟面试',
    communication_test: '沟通测试',
    relation_test: '人际关系测试',
    midterm: '期中考核',
  }

  if (!value) {
    return '未标注'
  }

  return labels[value] || value
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    pending: '待开始',
    scheduled: '已安排',
    confirmed: '待执行',
    completed: '已完成',
    cancelled: '已取消',
  }

  if (!value) {
    return '未标注'
  }

  return labels[value] || value
}

function statusTone(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'completed') {
    return 'table-tag--success'
  }
  if (normalized === 'cancelled') {
    return 'table-tag--danger'
  }
  if (normalized === 'pending' || normalized === 'confirmed') {
    return 'table-tag--warning'
  }
  if (normalized === 'scheduled') {
    return 'table-tag--info'
  }
  return 'table-tag--default'
}

function feedbackLabel(value?: number | null) {
  if (value == null) {
    return '暂无评分'
  }
  if (value >= 5) {
    return '反馈优秀'
  }
  if (value >= 4) {
    return '反馈良好'
  }
  if (value >= 3) {
    return '反馈一般'
  }
  return '需要补充反馈'
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '未安排'
  }
  return value.replace('T', ' ').slice(0, 16)
}

function resetFilters() {
  filters.keyword = ''
  filters.practiceType = ''
  filters.status = ''
}

function openDetail(record: AssistantMockPracticeRecord) {
  detailModal.visible = true
  detailModal.record = record
}

function closeDetail() {
  detailModal.visible = false
  detailModal.record = null
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getAssistantMockPracticeList()
    records.value = response.rows || []
  } catch (error: any) {
    errorMessage.value = error?.message || '模拟应聘记录暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<style scoped lang="scss">
.career-page {
  color: var(--text);
}

.page-header,
.page-header__actions,
.panel-card__header,
.modal-card__header {
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
.readonly-pill,
.tab-button,
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

.readonly-pill {
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--text2);
}

.summary-grid,
.toolbar-row,
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
.panel-card,
.state-card,
.modal-card {
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

.summary-card__value--success {
  color: #15803d;
}

.summary-card__value--accent {
  color: var(--primary);
}

.summary-card__hint {
  font-size: 12px;
}

.toolbar-card {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px;
}

.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tab-button {
  border: 0;
  padding: 10px 14px;
  background: var(--bg);
  color: var(--text2);
  cursor: pointer;
}

.tab-button--active {
  background: var(--primary);
  color: #fff;
}

.toolbar-row {
  grid-template-columns: minmax(240px, 1.4fr) repeat(2, minmax(160px, 1fr)) auto;
  gap: 14px;
  align-items: end;
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
.link-button,
.icon-button {
  border: 0;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.panel-card {
  overflow: hidden;
}

.panel-card__header {
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-card__header h2,
.modal-card__header h2 {
  margin: 0;
}

.panel-card__header p,
.modal-card__header p {
  margin: 6px 0 0;
  font-size: 13px;
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
.detail-value {
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  padding: 20px;
}

.modal-card {
  width: min(720px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
}

.modal-card__header {
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-card__body {
  padding: 20px 24px 24px;
}

.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-section {
  margin-top: 18px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
}

.detail-panel {
  border-radius: 16px;
  background: var(--bg);
  color: var(--text);
  padding: 14px 16px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.detail-callout {
  margin-top: 18px;
  border-radius: 16px;
  background: rgba(115, 153, 198, 0.08);
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

  .toolbar-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .page-header,
  .page-header__actions,
  .panel-card__header,
  .modal-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .toolbar-row,
  .detail-grid {
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

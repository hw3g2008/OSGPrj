<template>
  <div id="page-mock-practice" class="page-mock-practice">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h1>
        <p class="page-sub">查看学员的模拟面试、人际关系测试与考核记录，聚焦近期安排和反馈结果。</p>
      </div>
    </div>

    <section class="stats-grid" aria-label="mock practice stats">
      <article v-for="item in statsCards" :key="item.label" class="card stats-card">
        <div class="card-body stats-card__body">
          <div class="stats-card__value" :class="item.tone">{{ item.value }}</div>
          <div class="stats-card__label">{{ item.label }}</div>
        </div>
      </article>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>模拟应聘记录加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-text btn-sm" @click="loadRecords">重新加载</button>
    </section>

    <section v-else class="card">
      <div class="card-header">
        <div class="tabs">
          <button
            id="mock-tab-upcoming"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'upcoming' }, 'tab--info']"
            @click="activeTab = 'upcoming'"
          >
            <i class="mdi mdi-calendar-clock" aria-hidden="true" />
            待进行
            <span class="tab-count">{{ upcomingCount }}</span>
          </button>
          <button
            id="mock-tab-feedback"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'feedback' }, 'tab--success']"
            @click="activeTab = 'feedback'"
          >
            <i class="mdi mdi-message-text-outline" aria-hidden="true" />
            已有反馈
            <span class="tab-count">{{ feedbackCount }}</span>
          </button>
          <button
            id="mock-tab-all"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'all' }, 'tab--primary']"
            @click="activeTab = 'all'"
          >
            <i class="mdi mdi-format-list-bulleted" aria-hidden="true" />
            全部记录
            <span class="tab-count tab-count--managed">{{ records.length }}</span>
          </button>
        </div>
      </div>

      <div class="card-body tab-panel">
        <div class="panel-banner" :class="bannerClass">
          <i class="mdi" :class="bannerIcon" aria-hidden="true" />
          {{ bannerText }}
        </div>

        <div class="filters filters--compact">
          <div class="filter-chip">
            <span class="filter-chip__label">类型:</span>
            <select v-model="filters.practiceType" class="form-select">
              <option value="">全部类型</option>
              <option v-for="option in practiceTypeOptions" :key="option" :value="option">
                {{ practiceTypeLabel(option) }}
              </option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">状态:</span>
            <select v-model="filters.status" class="form-select">
              <option value="">全部状态</option>
              <option v-for="option in statusOptions" :key="option" :value="option">
                {{ statusLabel(option) }}
              </option>
            </select>
          </div>
          <div class="filter-chip">
            <span class="filter-chip__label">学员:</span>
            <input
              v-model.trim="filters.keyword"
              class="form-input"
              type="text"
              placeholder="搜索学员姓名/内容"
            />
          </div>
          <button type="button" class="btn btn-sm" @click="noopFilterAction">
            <i class="mdi mdi-magnify" aria-hidden="true" />
            筛选
          </button>
          <button type="button" class="btn btn-text btn-sm" @click="resetFilters">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div v-if="loading" class="table-state">正在读取模拟应聘记录...</div>
        <div v-else-if="filteredRecords.length === 0" class="table-state">当前筛选下没有可展示的模拟应聘记录。</div>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请时间</th>
                <th>状态</th>
                <th>辅导导师</th>
                <th>已上课时</th>
                <th>反馈结果</th>
                <th style="width: 92px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.practiceId"
                class="mock-row"
                :class="rowTone(record.practiceType)"
              >
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: resolveAvatarColor(record.studentName) }">
                      {{ buildAvatarText(record.studentName) }}
                    </div>
                    <div>
                      <div class="student-name">{{ record.studentName || '-' }}</div>
                      <div class="student-meta">ID: {{ record.studentId || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="practiceTypeTone(record.practiceType)">
                    <i class="mdi" :class="practiceTypeIcon(record.practiceType)" aria-hidden="true" />
                    {{ practiceTypeLabel(record.practiceType) }}
                  </span>
                </td>
                <td><span class="date-text">{{ formatDateTime(record.submittedAt) }}</span></td>
                <td>
                  <span class="tag" :class="statusTone(record.status)">
                    <i class="mdi" :class="statusIcon(record.status)" aria-hidden="true" />
                    {{ statusLabel(record.status) }}
                  </span>
                </td>
                <td>
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ record.mentorNames || '暂未安排' }}</div>
                    <div class="student-meta">{{ record.mentorBackgrounds || '等待排期同步' }}</div>
                  </div>
                </td>
                <td>
                  <span v-if="record.completedHours" class="hours-text">{{ record.completedHours }}h</span>
                  <span v-else class="muted-text">-</span>
                </td>
                <td>
                  <div class="feedback-stack">
                    <div class="feedback-stack__title" :class="feedbackTone(record.feedbackRating)">
                      {{ feedbackLabel(record.feedbackRating) }}
                    </div>
                    <div class="student-meta">{{ record.feedbackSummary || '暂无反馈摘要' }}</div>
                  </div>
                </td>
                <td>
                  <button type="button" class="link-button" @click="openDetail(record)">查看详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

        <div v-if="detailModal.record" class="modal-card__body">
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
              <div class="detail-value">{{ detailModal.record.mentorNames || '暂未安排' }}</div>
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
            这里汇总本次模拟应聘的申请内容、安排信息和反馈摘要，便于助教跟进后续沟通与复盘。
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

type ActiveTab = 'upcoming' | 'feedback' | 'all'

interface StatsCard {
  label: string
  value: number
  tone: string
}

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
      [record.studentName, record.requestContent, record.mentorNames]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesTab =
      activeTab.value === 'all' ||
      (activeTab.value === 'upcoming' && isUpcoming(record.status)) ||
      (activeTab.value === 'feedback' && hasFeedback(record))

    return (
      matchesKeyword &&
      matchesTab &&
      (!filters.practiceType || record.practiceType === filters.practiceType) &&
      (!filters.status || record.status === filters.status)
    )
  }),
)

const upcomingCount = computed(() => records.value.filter((record) => isUpcoming(record.status)).length)
const feedbackCount = computed(() => records.value.filter((record) => hasFeedback(record)).length)
const completedCount = computed(() => records.value.filter((record) => isDone(record.status)).length)
const pendingCount = computed(() => records.value.filter((record) => isPending(record.status)).length)

const statsCards = computed<StatsCard[]>(() => [
  { label: '待进行', value: upcomingCount.value, tone: 'stats-card__value--info' },
  { label: '已有反馈', value: feedbackCount.value, tone: 'stats-card__value--success' },
  { label: '已完成', value: completedCount.value, tone: 'stats-card__value--warning' },
  { label: '待安排', value: pendingCount.value, tone: 'stats-card__value--muted' },
])

const practiceTypeOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.practiceType).filter(Boolean))) as string[],
)

const statusOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.status).filter(Boolean))) as string[],
)

const bannerClass = computed(() => {
  if (activeTab.value === 'feedback') {
    return 'panel-banner--success'
  }
  if (activeTab.value === 'all') {
    return 'panel-banner--primary'
  }
  return 'panel-banner--info'
})

const bannerIcon = computed(() => {
  if (activeTab.value === 'feedback') {
    return 'mdi-message-text-outline'
  }
  if (activeTab.value === 'all') {
    return 'mdi-format-list-bulleted'
  }
  return 'mdi-calendar-clock'
})

const bannerText = computed(() => {
  if (activeTab.value === 'feedback') {
    return '以下为已回填反馈结果的模拟应聘记录，方便快速复盘与同步。'
  }
  if (activeTab.value === 'all') {
    return '以下为助教当前可查看的全部模拟应聘记录，仅展示安排与反馈，不提供管理操作。'
  }
  return '以下为近期待进行或待同步安排的模拟应聘记录，便于跟进准备情况。'
})

function isPending(status?: string) {
  return String(status || '').toLowerCase() === 'pending'
}

function isUpcoming(status?: string) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'pending' || normalized === 'scheduled' || normalized === 'confirmed'
}

function isDone(status?: string) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'completed' || normalized === 'cancelled'
}

function hasFeedback(record: AssistantMockPracticeRecord) {
  return Boolean(record.feedbackSummary || record.feedbackRating)
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

function practiceTypeTone(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'communication_test') {
    return 'tag--warning'
  }
  if (normalized === 'relation_test' || normalized === 'midterm') {
    return 'tag--purple'
  }
  return 'tag--info'
}

function practiceTypeIcon(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'communication_test') {
    return 'mdi-account-group'
  }
  if (normalized === 'relation_test') {
    return 'mdi-account-heart'
  }
  if (normalized === 'midterm') {
    return 'mdi-file-document-edit'
  }
  return 'mdi-account-voice'
}

function rowTone(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'communication_test') {
    return 'mock-row--amber'
  }
  if (normalized === 'relation_test' || normalized === 'midterm') {
    return 'mock-row--purple'
  }
  return 'mock-row--blue'
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    pending: '待安排',
    scheduled: '待进行',
    confirmed: '已确认',
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
    return 'tag--success'
  }
  if (normalized === 'cancelled') {
    return 'tag--muted'
  }
  if (normalized === 'pending') {
    return 'tag--warning'
  }
  return 'tag--info'
}

function statusIcon(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'completed') {
    return 'mdi-check-circle'
  }
  if (normalized === 'cancelled') {
    return 'mdi-close-circle'
  }
  if (normalized === 'pending') {
    return 'mdi-clock-outline'
  }
  if (normalized === 'confirmed') {
    return 'mdi-check-decagram'
  }
  return 'mdi-calendar-clock'
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

function feedbackTone(value?: number | null) {
  if (value == null) {
    return 'feedback-stack__title--muted'
  }
  if (value >= 5) {
    return 'feedback-stack__title--success'
  }
  if (value >= 4) {
    return 'feedback-stack__title--warning'
  }
  return 'feedback-stack__title--muted'
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function buildAvatarText(name?: string | null) {
  const trimmed = String(name || '').trim()
  return trimmed.slice(0, 2) || '--'
}

function resolveAvatarColor(seed?: string | null) {
  const palette = ['var(--primary)', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899']
  const source = String(seed || '').trim()
  if (!source) {
    return palette[0]
  }

  const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function noopFilterAction() {
  return undefined
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

<style scoped>
.page-mock-practice {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.page-title-en {
  margin-left: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 400;
}

.page-sub {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.card,
.state-card,
.modal-card {
  overflow: hidden;
  margin: 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.card-body {
  padding: 16px;
}

.stats-card__body {
  text-align: center;
}

.stats-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.stats-card__value--warning {
  color: #F59E0B;
}

.stats-card__value--info {
  color: #3B82F6;
}

.stats-card__value--success {
  color: #22C55E;
}

.stats-card__value--muted {
  color: var(--muted);
}

.stats-card__label {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}

.card-header {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--bg);
  border-radius: 6px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.tab.active.tab--info {
  background: #3B82F6;
  color: #fff;
}

.tab.active.tab--success {
  background: #22C55E;
  color: #fff;
}

.tab.active.tab--primary {
  background: var(--primary);
  color: #fff;
}

.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  color: inherit;
  font-size: 10px;
}

.tab-count--managed {
  background: var(--muted);
  color: #fff;
}

.tab-panel {
  padding: 0;
}

.panel-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
}

.panel-banner--info {
  background: #EFF6FF;
  color: #1E40AF;
}

.panel-banner--success {
  background: #F0FDF4;
  color: #166534;
}

.panel-banner--primary {
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.filters--compact {
  gap: 12px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-chip__label {
  color: var(--muted);
  font-size: 12px;
}

.form-input,
.form-select {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
}

.form-input {
  width: 160px;
  padding: 4px 8px;
}

.form-select {
  padding: 4px 8px;
}

.btn,
.link-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  cursor: pointer;
}

.btn {
  padding: 4px 12px;
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-text {
  background: transparent;
  color: var(--muted);
}

.link-button,
.icon-button {
  padding: 0;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.table-state {
  padding: 20px 16px 24px;
  color: var(--muted);
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.table th {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.mock-row--blue {
  background: #F0F9FF;
}

.mock-row--amber {
  background: #FFFBEB;
}

.mock-row--purple {
  background: #F3E8FF;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.student-name,
.mentor-stack__name,
.detail-value {
  color: var(--text);
  font-weight: 600;
}

.student-meta,
.detail-label,
.modal-card__header p {
  color: var(--muted);
  font-size: 11px;
}

.date-text {
  font-size: 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.tag--info {
  background: #DBEAFE;
  color: #1D4ED8;
}

.tag--warning {
  background: #FEF3C7;
  color: #B45309;
}

.tag--success {
  background: #DCFCE7;
  color: #166534;
}

.tag--muted {
  background: #E5E7EB;
  color: #4B5563;
}

.tag--purple {
  background: #8B5CF6;
  color: #fff;
}

.hours-text {
  color: var(--primary);
  font-weight: 600;
}

.muted-text {
  color: var(--muted);
}

.feedback-stack,
.mentor-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feedback-stack__title {
  font-size: 12px;
  font-weight: 500;
}

.feedback-stack__title--success {
  color: #059669;
}

.feedback-stack__title--warning {
  color: #D97706;
}

.feedback-stack__title--muted {
  color: var(--muted);
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-card__header h2 {
  margin: 0;
}

.modal-card__header p {
  margin: 6px 0 0;
  font-size: 13px;
}

.modal-card__body {
  padding: 20px 24px 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-section {
  margin-top: 18px;
}

.detail-label {
  display: block;
  margin-bottom: 6px;
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

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .stats-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    width: 100%;
    flex-wrap: wrap;
  }

  .tab {
    justify-content: center;
    width: 100%;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-chip {
    width: 100%;
    justify-content: space-between;
  }

  .form-input,
  .form-select {
    width: 100%;
  }
}
</style>

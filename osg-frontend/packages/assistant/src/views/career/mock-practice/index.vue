<template>
  <div id="page-mock-practice" class="page-mock-practice">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h1>
        <p class="page-sub">查看学员模拟应聘安排、导师信息与反馈结果，帮助助教完成跟进与复盘</p>
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

    <section v-if="errorMessage" class="card state-card state-card--error">
      <div class="card-body state-card__body">
        <h2>模拟应聘记录加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="btn btn-sm" @click="loadRecords">重新加载</button>
      </div>
    </section>

    <section v-else class="card">
      <div class="card-header">
        <div class="tabs">
          <button
            id="mock-tab-pending"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'pending' }, 'tab--pending']"
            @click="activeTab = 'pending'"
          >
            <i class="mdi mdi-account-clock" aria-hidden="true" />
            即将进行
            <span class="tab-count">{{ pendingRows.length }}</span>
          </button>
          <button
            id="mock-tab-feedback"
            type="button"
            class="tab"
            :class="[{ active: activeTab === 'feedback' }, 'tab--primary']"
            @click="activeTab = 'feedback'"
          >
            <i class="mdi mdi-message-text" aria-hidden="true" />
            已完成反馈
            <span class="tab-count">{{ feedbackRows.length }}</span>
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
            <span class="tab-count tab-count--managed">{{ filteredAllRows.length }}</span>
          </button>
        </div>
      </div>

      <div
        id="mock-content-pending"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'pending' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--info">
          <i class="mdi mdi-calendar-clock" aria-hidden="true" />
          展示近期待执行或已安排的模拟应聘记录，便于助教跟进安排进度
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
            <input v-model.trim="filters.keyword" class="form-input" type="text" placeholder="搜索学员姓名/内容" />
          </div>
          <button type="button" class="btn btn-text btn-sm" @click="resetFilters">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div v-if="pendingRows.length === 0" class="panel-state">当前没有待跟进的模拟应聘记录</div>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请时间</th>
                <th>状态</th>
                <th>导师</th>
                <th style="width: 120px">详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pendingRows" :key="row.practiceId" class="mock-row" :class="row.rowTone">
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td><span class="date-text">{{ row.appliedAt }}</span></td>
                <td>
                  <span class="tag" :class="row.statusTone">
                    <i v-if="row.statusIcon" class="mdi" :class="row.statusIcon" aria-hidden="true" />
                    {{ row.status }}
                  </span>
                </td>
                <td>
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ row.mentorName }}</div>
                    <div class="student-meta">{{ row.mentorMeta }}</div>
                  </div>
                </td>
                <td>
                  <button type="button" class="detail-trigger" @click="openDetail(row.raw)">查看详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="mock-content-feedback"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'feedback' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--success">
          <i class="mdi mdi-check-circle" aria-hidden="true" />
          以下为已回填反馈结果的模拟应聘记录，助教可直接查看复盘摘要
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
            <span class="filter-chip__label">学员:</span>
            <input v-model.trim="filters.keyword" class="form-input" type="text" placeholder="搜索学员姓名/内容" />
          </div>
          <button type="button" class="btn btn-text btn-sm" @click="resetFilters">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div v-if="feedbackRows.length === 0" class="panel-state">当前没有可查看反馈的模拟应聘记录</div>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>状态</th>
                <th>已上课时</th>
                <th>课程反馈</th>
                <th style="width: 120px">详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in feedbackRows" :key="row.practiceId" class="mock-row" :class="row.rowTone">
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td>
                  <span class="tag" :class="row.statusTone">
                    <i v-if="row.statusIcon" class="mdi" :class="row.statusIcon" aria-hidden="true" />
                    {{ row.status }}
                  </span>
                </td>
                <td><span class="hours-text">{{ row.hours }}</span></td>
                <td>
                  <div class="feedback-stack">
                    <div class="feedback-stack__title" :class="row.feedbackTone">{{ row.feedbackTitle }}</div>
                    <div class="student-meta">{{ row.feedbackSummary }}</div>
                  </div>
                </td>
                <td>
                  <button type="button" class="detail-trigger" @click="openDetail(row.raw)">查看详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="mock-content-all"
        class="card-body tab-panel"
        :style="{ display: activeTab === 'all' ? 'block' : 'none' }"
      >
        <div class="panel-banner panel-banner--neutral">
          <i class="mdi mdi-text-box-search" aria-hidden="true" />
          集中查看全部模拟应聘记录、导师安排与反馈概览
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
            <input v-model.trim="filters.keyword" class="form-input" type="text" placeholder="搜索学员姓名/内容" />
          </div>
          <button type="button" class="btn btn-text btn-sm" @click="resetFilters">
            <i class="mdi mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>

        <div v-if="filteredAllRows.length === 0" class="panel-state">当前筛选下没有可展示的模拟应聘记录</div>
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
                <th>课程反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredAllRows" :key="row.practiceId" class="mock-row" :class="row.rowTone">
                <td>
                  <div class="student-cell">
                    <div class="avatar" :style="{ background: row.avatarColor }">{{ row.avatar }}</div>
                    <div>
                      <div class="student-name">{{ row.studentName }}</div>
                      <div class="student-meta">ID: {{ row.studentId }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="tag" :class="row.typeTone">
                    <i class="mdi" :class="row.typeIcon" aria-hidden="true" />
                    {{ row.practiceType }}
                  </span>
                </td>
                <td><span class="date-text">{{ row.appliedAt }}</span></td>
                <td>
                  <span class="tag" :class="row.statusTone">
                    <i v-if="row.statusIcon" class="mdi" :class="row.statusIcon" aria-hidden="true" />
                    {{ row.status }}
                  </span>
                </td>
                <td>
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ row.mentorName }}</div>
                    <div class="student-meta">{{ row.mentorMeta }}</div>
                  </div>
                </td>
                <td><span class="hours-text">{{ row.hours }}</span></td>
                <td>
                  <button type="button" class="feedback-trigger" @click="openDetail(row.raw)">
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="row.feedbackTone">{{ row.feedbackTitle }}</div>
                      <div class="student-meta">{{ row.feedbackSummary }}</div>
                    </div>
                  </button>
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
              <div class="detail-value">{{ formatDateTime(detailModal.record.scheduledAt || detailModal.record.submittedAt, 'YYYY-MM-DD HH:mm') }}</div>
            </div>
            <div>
              <span class="detail-label">导师</span>
              <div class="detail-value">{{ detailModal.record.mentorNames || '暂未分配导师' }}</div>
            </div>
            <div>
              <span class="detail-label">已完成课时</span>
              <div class="detail-value">{{ completedHoursLabel(detailModal.record.completedHours) }}</div>
            </div>
          </div>

          <div class="detail-section">
            <span class="detail-label">申请内容</span>
            <div class="detail-panel">{{ detailModal.record.requestContent || '暂无申请内容' }}</div>
          </div>

          <div class="detail-section">
            <span class="detail-label">导师背景</span>
            <div class="detail-panel">{{ detailModal.record.mentorBackgrounds || '暂无导师背景信息' }}</div>
          </div>

          <div class="detail-section">
            <span class="detail-label">反馈摘要</span>
            <div class="detail-panel">{{ detailModal.record.feedbackSummary || '当前记录尚未回填反馈摘要。' }}</div>
          </div>

          <div class="detail-callout">这里汇总本次模拟应聘的申请内容、安排信息和反馈摘要，便于助教后续沟通与复盘。</div>
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

type MockTab = 'pending' | 'feedback' | 'all'

interface StatsCard {
  label: string
  value: number
  tone: string
}

interface PracticeRow {
  practiceId: number
  studentId: number | string
  studentName: string
  avatar: string
  avatarColor: string
  practiceType: string
  typeTone: string
  typeIcon: string
  appliedAt: string
  rowTone: string
  status: string
  statusTone: string
  statusIcon: string
  mentorName: string
  mentorMeta: string
  hours: string
  feedbackTitle: string
  feedbackTone: string
  feedbackSummary: string
  raw: AssistantMockPracticeRecord
}

const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<MockTab>('all')
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

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return records.value.filter((record) => {
    const matchesKeyword =
      !keyword ||
      [record.studentName, record.requestContent, record.mentorNames]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    return (
      matchesKeyword &&
      (!filters.practiceType || record.practiceType === filters.practiceType) &&
      (!filters.status || record.status === filters.status)
    )
  })
})

const pendingRecords = computed(() => filteredRecords.value.filter((record) => isUpcoming(record.status)))
const feedbackRecords = computed(() => filteredRecords.value.filter((record) => hasFeedback(record)))

const pendingRows = computed(() => pendingRecords.value.map((record) => toPracticeRow(record)))
const feedbackRows = computed(() => feedbackRecords.value.map((record) => toPracticeRow(record)))
const filteredAllRows = computed(() => filteredRecords.value.map((record) => toPracticeRow(record)))

const statsCards = computed<StatsCard[]>(() => [
  { label: '待开始', value: records.value.filter((record) => isUpcoming(record.status)).length, tone: 'stats-card__value--warning' },
  { label: '已安排', value: records.value.filter((record) => isScheduled(record.status)).length, tone: 'stats-card__value--info' },
  { label: '已完成', value: records.value.filter((record) => isDone(record.status)).length, tone: 'stats-card__value--success' },
  { label: '有反馈', value: records.value.filter((record) => hasFeedback(record)).length, tone: 'stats-card__value--muted' },
])

const practiceTypeOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.practiceType).filter(Boolean))) as string[],
)

const statusOptions = computed(
  () => Array.from(new Set(records.value.map((record) => record.status).filter(Boolean))) as string[],
)

function isUpcoming(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'pending' || normalized === 'scheduled' || normalized === 'confirmed'
}

function isScheduled(status?: string | null) {
  return String(status || '').toLowerCase() === 'scheduled'
}

function isDone(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'completed' || normalized === 'cancelled'
}

function hasFeedback(record: AssistantMockPracticeRecord) {
  return Boolean(record.feedbackSummary || record.feedbackRating != null)
}

function practiceTypeLabel(value?: string | null) {
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

function statusLabel(value?: string | null) {
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

function resolveTypeUi(practiceType?: string | null) {
  const normalized = String(practiceType || '').trim()
  if (normalized === 'mock_interview') {
    return { typeTone: 'tag--info', typeIcon: 'mdi-account-voice', rowTone: 'mock-row--blue' }
  }
  if (normalized === 'communication_test') {
    return { typeTone: 'tag--warning', typeIcon: 'mdi-account-group', rowTone: 'mock-row--amber' }
  }
  if (normalized === 'relation_test' || normalized === 'midterm') {
    return { typeTone: 'tag--purple', typeIcon: 'mdi-file-document-edit', rowTone: 'mock-row--purple' }
  }
  return { typeTone: 'tag--info', typeIcon: 'mdi-clipboard-text', rowTone: 'mock-row--blue' }
}

function resolveStatusUi(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized === 'completed') {
    return { statusTone: 'tag--success', statusIcon: 'mdi-check-circle' }
  }
  if (normalized === 'confirmed') {
    return { statusTone: 'tag--info', statusIcon: 'mdi-check-decagram' }
  }
  if (normalized === 'cancelled') {
    return { statusTone: 'tag--muted', statusIcon: 'mdi-close-circle' }
  }
  if (normalized === 'pending') {
    return { statusTone: 'tag--danger', statusIcon: 'mdi-clock-outline' }
  }
  return { statusTone: 'tag--info', statusIcon: 'mdi-calendar-clock' }
}

function feedbackLabel(value?: number | null) {
  if (value == null) {
    return '待反馈'
  }
  if (value >= 5) {
    return '优秀'
  }
  if (value >= 4) {
    return '良好'
  }
  if (value >= 3) {
    return '待改进'
  }
  return '需复盘'
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

function formatDateTime(value?: string | null, pattern: 'MM/DD HH:mm' | 'YYYY-MM-DD HH:mm' = 'MM/DD HH:mm') {
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

function buildAvatarText(name?: string | null) {
  const text = String(name || '').trim()
  return text.slice(0, 2) || '--'
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

function completedHoursLabel(value?: number | null) {
  const hours = Number(value ?? 0)
  if (!hours) {
    return '0h'
  }
  return `${hours}h`
}

function toPracticeRow(record: AssistantMockPracticeRecord): PracticeRow {
  const typeUi = resolveTypeUi(record.practiceType)
  const statusUi = resolveStatusUi(record.status)

  return {
    practiceId: record.practiceId,
    studentId: record.studentId || '-',
    studentName: record.studentName || '-',
    avatar: buildAvatarText(record.studentName),
    avatarColor: resolveAvatarColor(record.studentName),
    practiceType: practiceTypeLabel(record.practiceType),
    typeTone: typeUi.typeTone,
    typeIcon: typeUi.typeIcon,
    appliedAt: formatDateTime(record.submittedAt),
    rowTone: typeUi.rowTone,
    status: statusLabel(record.status),
    statusTone: statusUi.statusTone,
    statusIcon: statusUi.statusIcon,
    mentorName: record.mentorNames || '暂未分配导师',
    mentorMeta: record.mentorBackgrounds || '等待后续安排',
    hours: completedHoursLabel(record.completedHours),
    feedbackTitle: feedbackLabel(record.feedbackRating),
    feedbackTone: feedbackTone(record.feedbackRating),
    feedbackSummary: record.feedbackSummary || '暂无反馈摘要',
    raw: record,
  }
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
    records.value = []
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

.card {
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
  color: #8B5CF6;
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

.tab.active.tab--pending {
  background: #EF4444;
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

.panel-banner--neutral {
  background: #F8FAFC;
  color: #334155;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 0;
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-text {
  background: transparent;
  color: var(--muted);
}

.panel-state,
.state-card__body p {
  color: var(--muted);
}

.panel-state {
  padding: 16px;
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

.student-meta {
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

.tag--danger {
  background: #EF4444;
  color: #fff;
}

.tag--purple {
  background: #8B5CF6;
  color: #fff;
}

.tag--muted {
  background: #E2E8F0;
  color: #475569;
}

.hours-text {
  color: var(--primary);
  font-weight: 600;
}

.feedback-stack,
.mentor-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feedback-trigger,
.detail-trigger,
.icon-button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.feedback-trigger,
.detail-trigger {
  display: block;
  width: 100%;
  padding: 0;
  color: inherit;
  text-align: left;
}

.detail-trigger,
.icon-button {
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
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

.state-card--error {
  border: 1px solid rgba(239, 68, 68, 0.16);
  background: #fff7f7;
}

.state-card__body {
  display: grid;
  gap: 8px;
}

.state-card__body h2,
.modal-card__header h2 {
  margin: 0;
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
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.modal-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-card__header p {
  margin: 6px 0 0;
  color: var(--muted);
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
  color: var(--muted);
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
  color: var(--text2, var(--muted));
  padding: 14px 16px;
  line-height: 1.7;
  font-size: 13px;
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

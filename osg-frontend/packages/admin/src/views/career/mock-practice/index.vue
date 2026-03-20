<template>
  <div class="mock-practice-page mock-practice-shell">
    <div class="page-header mock-practice-header">
      <div class="mock-practice-header__copy">
        <h2 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h2>
        <p class="page-subtitle">管理所有学员的模拟面试、人际关系测试、期中考试申请</p>
      </div>

      <div class="mock-practice-header__meta">
        <span class="mock-practice-header__pill mock-practice-header__pill--pending">{{ stats.pendingCount }} 条待处理</span>
        <span class="mock-practice-header__pill">{{ stats.totalCount }} 条全部记录</span>
      </div>
    </div>

    <section class="mock-practice-summary-grid">
      <article
        v-for="card in statCards"
        :key="card.key"
        :class="['mock-practice-summary-grid__card', `mock-practice-summary-grid__card--${card.tone}`]"
      >
        <div class="mock-practice-summary-grid__head">
          <i :class="['mdi', card.icon]" aria-hidden="true"></i>
          <span>{{ card.label }}</span>
        </div>
        <strong class="mock-practice-summary-grid__value">{{ card.value }}</strong>
        <span class="mock-practice-summary-grid__meta">{{ card.meta }}</span>
      </article>
    </section>

    <section class="mock-practice-filterbar">
      <label class="mock-practice-filterbar__field mock-practice-filterbar__field--search">
        <span>搜索</span>
        <input
          v-model="filters.keyword"
          type="text"
          placeholder="搜索学员或申请内容"
          @keydown.enter.prevent="handleSearch"
        />
      </label>

      <label class="mock-practice-filterbar__field">
        <span>类型</span>
        <select v-model="filters.practiceType">
          <option value="">全部类型</option>
          <option value="mock_interview">模拟面试</option>
          <option value="communication_test">人际关系测试</option>
          <option value="midterm_exam">期中考试</option>
        </select>
      </label>

      <label class="mock-practice-filterbar__field">
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="scheduled">已安排</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </label>

      <div class="mock-practice-filterbar__actions">
        <button type="button" class="mock-practice-filterbar__button" @click="handleSearch">搜索</button>
        <button type="button" class="mock-practice-filterbar__button mock-practice-filterbar__button--ghost" @click="handleReset">
          重置
        </button>
      </div>
    </section>

    <section class="mock-practice-board">
      <div class="mock-practice-dataset-tabs">
        <button
          type="button"
          :class="[
            'mock-practice-dataset-tabs__button',
            { 'mock-practice-dataset-tabs__button--active': activeTab === 'pending' }
          ]"
          @click="switchTab('pending')"
        >
          <span>待分配导师</span>
          <strong>{{ stats.pendingCount }}</strong>
        </button>
        <button
          type="button"
          :class="[
            'mock-practice-dataset-tabs__button',
            { 'mock-practice-dataset-tabs__button--active': activeTab === 'all' }
          ]"
          @click="switchTab('all')"
        >
          <span>全部记录</span>
          <strong>{{ stats.totalCount }}</strong>
        </button>
      </div>

      <div v-if="loading" class="mock-practice-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载模拟应聘数据...</span>
      </div>

      <template v-else-if="activeTab === 'pending'">
        <div class="mock-practice-tablewrap">
          <table class="mock-practice-table mock-practice-datatable">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请内容</th>
                <th>申请时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pendingRows"
                :key="row.practiceId"
                :class="['mock-practice-datatable__row', `mock-practice-datatable__row--${typeTone(row.practiceType)}`]"
              >
                <td>
                  <div class="mock-practice-student">
                    <div class="mock-practice-student__avatar">{{ getStudentInitials(row.studentName) }}</div>
                    <div class="mock-practice-student__copy">
                      <strong>{{ row.studentName || '未命名学员' }}</strong>
                      <span>ID {{ row.studentId }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['mock-practice-chip', `mock-practice-chip--${typeTone(row.practiceType)}`]">
                    <i :class="['mdi', typeIcon(row.practiceType)]" aria-hidden="true"></i>
                    <span>{{ formatType(row.practiceType) }}</span>
                  </span>
                </td>
                <td>
                  <div class="mock-practice-request">
                    <strong>{{ row.requestContent }}</strong>
                    <span>{{ row.preferredMentorNames || '暂无意向导师' }}</span>
                  </div>
                </td>
                <td>
                  <div class="mock-practice-time">
                    <strong>{{ formatRelativeTime(row.submittedAt) }}</strong>
                    <span>{{ formatDateTime(row.submittedAt) }}</span>
                  </div>
                </td>
                <td>
                  <button type="button" class="mock-practice-action" @click="openAssignModal(row)">分配导师</button>
                </td>
              </tr>
              <tr v-if="!pendingRows.length">
                <td colspan="5" class="mock-practice-empty mock-practice-empty--inline">当前筛选条件下暂无待分配导师的申请</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="mock-practice-tablewrap">
          <table class="mock-practice-table mock-practice-datatable">
            <thead>
              <tr>
                <th>学员</th>
                <th>类型</th>
                <th>申请内容</th>
                <th>申请时间</th>
                <th>导师</th>
                <th>状态</th>
                <th>已上课时</th>
                <th>课程反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in allRows"
                :key="row.practiceId"
                :class="['mock-practice-datatable__row', `mock-practice-datatable__row--${typeTone(row.practiceType)}`]"
              >
                <td>
                  <div class="mock-practice-student">
                    <div class="mock-practice-student__avatar">{{ getStudentInitials(row.studentName) }}</div>
                    <div class="mock-practice-student__copy">
                      <strong>{{ row.studentName || '未命名学员' }}</strong>
                      <span>ID {{ row.studentId }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['mock-practice-chip', `mock-practice-chip--${typeTone(row.practiceType)}`]">
                    <i :class="['mdi', typeIcon(row.practiceType)]" aria-hidden="true"></i>
                    <span>{{ formatType(row.practiceType) }}</span>
                  </span>
                </td>
                <td>
                  <div class="mock-practice-request">
                    <strong>{{ row.requestContent }}</strong>
                    <span>{{ formatDateTime(row.scheduledAt) }}</span>
                  </div>
                </td>
                <td>
                  <div class="mock-practice-time">
                    <strong>{{ formatRelativeTime(row.submittedAt) }}</strong>
                    <span>{{ formatDateTime(row.submittedAt) }}</span>
                  </div>
                </td>
                <td>
                  <div class="mock-practice-mentor">
                    <strong>{{ row.mentorNames || '待分配' }}</strong>
                    <span>{{ row.mentorBackgrounds || '—' }}</span>
                  </div>
                </td>
                <td>
                  <span :class="['mock-practice-chip', `mock-practice-chip--status-${row.status || 'pending'}`]">
                    {{ formatStatus(row.status) }}
                  </span>
                </td>
                <td>
                  <div class="mock-practice-hours">
                    <strong>{{ row.completedHours ?? 0 }}</strong>
                    <span>小时</span>
                  </div>
                </td>
                <td>
                  <div class="mock-practice-feedback">
                    <strong>{{ row.feedbackRating ? `${row.feedbackRating}/5` : '—' }}</strong>
                    <span>{{ row.feedbackSummary || '暂无反馈' }}</span>
                    <button
                      v-if="row.feedbackSummary || row.feedbackRating"
                      type="button"
                      class="mock-practice-feedback__link"
                      @click="openFeedbackModal(row)"
                    >
                      查看反馈
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!allRows.length">
                <td colspan="8" class="mock-practice-empty mock-practice-empty--inline">当前筛选条件下暂无模拟应聘记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <AssignMockModal
      :visible="assignVisible"
      :row="selectedRow"
      :mentor-options="assignMentorOptions"
      :submitting="assignSubmitting"
      @update:visible="handleAssignVisibleChange"
      @submit="handleAssignSubmit"
    />

    <MockFeedbackModal
      :visible="feedbackVisible"
      :row="selectedFeedbackRow"
      @update:visible="handleFeedbackVisibleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import AssignMockModal from './components/AssignMockModal.vue'
import MockFeedbackModal from './components/MockFeedbackModal.vue'
import {
  assignMockPractice,
  getMockPracticeList,
  getMockPracticeStats,
  type AssignMockPracticePayload,
  type MockPracticeFilters,
  type MockPracticeListItem,
  type MockPracticeStats
} from '@osg/shared/api/admin/mockPractice'

type ActiveTab = 'pending' | 'all'
type TagTone = 'info' | 'warning' | 'purple'

interface MentorOption {
  mentorId: number
  mentorName: string
  mentorBackground: string
  preferred: boolean
}

const defaultStats: MockPracticeStats = {
  pendingCount: 0,
  scheduledCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  totalCount: 0
}

const filters = reactive({
  keyword: '',
  practiceType: '',
  status: ''
})

const loading = ref(false)
const activeTab = ref<ActiveTab>('pending')
const stats = ref<MockPracticeStats>({ ...defaultStats })
const rows = ref<MockPracticeListItem[]>([])
const assignVisible = ref(false)
const assignSubmitting = ref(false)
const selectedRow = ref<MockPracticeListItem | null>(null)
const feedbackVisible = ref(false)
const selectedFeedbackRow = ref<MockPracticeListItem | null>(null)

const mentorCatalog = [
  { mentorId: 9101, mentorName: 'Jess', mentorBackground: 'PE / MBB' },
  { mentorId: 9102, mentorName: 'Amy', mentorBackground: 'IBD / ECM' },
  { mentorId: 9103, mentorName: 'Jerry Li', mentorBackground: 'S&T / Macro' },
  { mentorId: 9104, mentorName: 'Mike Lee', mentorBackground: 'Tech / Product' }
]

const requestFilters = computed<MockPracticeFilters>(() => ({
  keyword: filters.keyword || undefined,
  practiceType: filters.practiceType || undefined,
  status: filters.status || undefined
}))

const statCards = computed(() => [
  { key: 'pending', label: '待处理', value: stats.value.pendingCount, meta: '待分配导师', tone: 'warning', icon: 'mdi-timer-sand' },
  { key: 'scheduled', label: '已安排', value: stats.value.scheduledCount, meta: '已锁定导师与时间', tone: 'info', icon: 'mdi-calendar-check' },
  { key: 'completed', label: '已完成', value: stats.value.completedCount, meta: '已产出反馈', tone: 'success', icon: 'mdi-check-decagram' },
  { key: 'cancelled', label: '已取消', value: stats.value.cancelledCount, meta: '本轮未继续', tone: 'muted', icon: 'mdi-cancel' }
])

const pendingRows = computed(() => rows.value.filter((row) => row.status === 'pending'))
const allRows = computed(() => rows.value)

const assignMentorOptions = computed<MentorOption[]>(() => {
  const preferredNames = splitMentorNames(selectedRow.value?.preferredMentorNames)
  return mentorCatalog.map((mentor) => ({
    ...mentor,
    preferred: preferredNames.includes(mentor.mentorName)
  }))
})

const loadData = async () => {
  loading.value = true
  try {
    const [statsResponse, listResponse] = await Promise.all([
      getMockPracticeStats(requestFilters.value),
      getMockPracticeList({
        ...requestFilters.value,
        tab: activeTab.value
      })
    ])
    stats.value = { ...defaultStats, ...statsResponse }
    rows.value = listResponse.rows || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
})

const handleSearch = () => {
  void loadData()
}

const handleReset = () => {
  filters.keyword = ''
  filters.practiceType = ''
  filters.status = ''
  activeTab.value = 'pending'
  void loadData()
}

const switchTab = (tab: ActiveTab) => {
  activeTab.value = tab
  void loadData()
}

const openAssignModal = (row: MockPracticeListItem) => {
  selectedRow.value = row
  assignVisible.value = true
}

const handleAssignVisibleChange = (value: boolean) => {
  assignVisible.value = value
  if (!value) {
    selectedRow.value = null
  }
}

const handleAssignSubmit = async (payload: Omit<AssignMockPracticePayload, 'practiceId'>) => {
  if (!selectedRow.value) return

  assignSubmitting.value = true
  try {
    await assignMockPractice({
      practiceId: selectedRow.value.practiceId,
      ...payload
    })
    message.success('模拟应聘导师分配已完成')
    assignVisible.value = false
    selectedRow.value = null
    await loadData()
  } finally {
    assignSubmitting.value = false
  }
}

const openFeedbackModal = (row: MockPracticeListItem) => {
  selectedFeedbackRow.value = row
  feedbackVisible.value = true
}

const handleFeedbackVisibleChange = (value: boolean) => {
  feedbackVisible.value = value
  if (!value) {
    selectedFeedbackRow.value = null
  }
}

function formatType(value: string) {
  if (value === 'mock_interview') return '模拟面试'
  if (value === 'communication_test') return '人际关系测试'
  if (value === 'midterm_exam') return '期中考试'
  return '模拟应聘'
}

function typeIcon(value: string) {
  if (value === 'mock_interview') return 'mdi-account-voice'
  if (value === 'communication_test') return 'mdi-account-group'
  if (value === 'midterm_exam') return 'mdi-file-document-edit'
  return 'mdi-briefcase-outline'
}

function typeTone(value: string): TagTone {
  if (value === 'mock_interview') return 'info'
  if (value === 'communication_test') return 'warning'
  return 'purple'
}

function formatStatus(value?: string) {
  if (value === 'pending') return '待处理'
  if (value === 'scheduled') return '已安排'
  if (value === 'completed') return '已完成'
  if (value === 'cancelled') return '已取消'
  return '未知'
}

function getStudentInitials(value?: string) {
  return (value || '学员').slice(0, 2).toUpperCase()
}

function splitMentorNames(value?: string | null) {
  if (!value) return []
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / 36e5))
  if (diffHours < 24) return `${diffHours} 小时前`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} 天前`
}
</script>

<style scoped lang="scss">
.mock-practice-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-practice-header {
  align-items: flex-start;
}

.mock-practice-header__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mock-practice-header__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mock-practice-header__pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-header__pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.mock-practice-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.mock-practice-summary-grid__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 108px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(203, 213, 225, 0.7);
}

.mock-practice-summary-grid__head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.mock-practice-summary-grid__value {
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
}

.mock-practice-summary-grid__meta {
  color: #64748b;
  font-size: 12px;
}

.mock-practice-summary-grid__card--warning {
  background: #fffbeb;
}

.mock-practice-summary-grid__card--info {
  background: #eff6ff;
}

.mock-practice-summary-grid__card--success {
  background: #f0fdf4;
}

.mock-practice-summary-grid__card--muted {
  background: #f8fafc;
}

.mock-practice-filterbar,
.mock-practice-board {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.mock-practice-filterbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(2, minmax(0, 0.8fr)) auto;
  gap: 10px;
  padding: 16px 18px;
}

.mock-practice-filterbar__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mock-practice-filterbar__field span {
  color: #475569;
  font-size: 12px;
}

.mock-practice-filterbar__field input,
.mock-practice-filterbar__field select {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font-size: 13px;
}

.mock-practice-filterbar__actions {
  display: inline-flex;
  align-items: flex-end;
  gap: 8px;
}

.mock-practice-filterbar__button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.mock-practice-filterbar__button--ghost {
  color: #64748b;
}

.mock-practice-board {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 18px;
}

.mock-practice-dataset-tabs {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mock-practice-dataset-tabs__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid #dbe3ee;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.mock-practice-dataset-tabs__button strong {
  min-width: 24px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 11px;
}

.mock-practice-dataset-tabs__button--active {
  border-color: transparent;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
}

.mock-practice-dataset-tabs__button--active strong {
  background: rgba(255, 255, 255, 0.2);
}

.mock-practice-tablewrap {
  overflow-x: auto;
}

.mock-practice-datatable {
  width: 100%;
  min-width: 980px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.mock-practice-datatable th {
  padding: 13px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.mock-practice-datatable td {
  padding: 14px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.mock-practice-datatable__row--info {
  background: rgba(239, 246, 255, 0.5);
}

.mock-practice-datatable__row--warning {
  background: rgba(255, 251, 235, 0.7);
}

.mock-practice-datatable__row--purple {
  background: rgba(245, 243, 255, 0.6);
}

.mock-practice-student {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.mock-practice-student__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.mock-practice-student__copy,
.mock-practice-request,
.mock-practice-time,
.mock-practice-mentor,
.mock-practice-hours,
.mock-practice-feedback {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mock-practice-student__copy strong,
.mock-practice-request strong,
.mock-practice-time strong,
.mock-practice-mentor strong,
.mock-practice-hours strong,
.mock-practice-feedback strong {
  color: #0f172a;
  font-size: 13px;
}

.mock-practice-student__copy span,
.mock-practice-request span,
.mock-practice-time span,
.mock-practice-mentor span,
.mock-practice-hours span,
.mock-practice-feedback span {
  color: #64748b;
  font-size: 12px;
}

.mock-practice-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-chip--info {
  background: #e0f2fe;
  color: #0369a1;
}

.mock-practice-chip--warning {
  background: #fef3c7;
  color: #92400e;
}

.mock-practice-chip--purple {
  background: #eef2ff;
  color: #4f46e5;
}

.mock-practice-chip--status-pending {
  background: #fef3c7;
  color: #92400e;
}

.mock-practice-chip--status-scheduled {
  background: #d1fae5;
  color: #047857;
}

.mock-practice-chip--status-completed {
  background: #dcfce7;
  color: #166534;
}

.mock-practice-chip--status-cancelled {
  background: #f1f5f9;
  color: #475569;
}

.mock-practice-action {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #99f6e4;
  background: #ecfeff;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-feedback__link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
}

.mock-practice-loading,
.mock-practice-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.mock-practice-loading {
  min-height: 220px;
}

.mock-practice-empty--inline {
  min-height: 0;
  padding: 24px 0;
}

@media (max-width: 1100px) {
  .mock-practice-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mock-practice-filterbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .mock-practice-shell {
    gap: 14px;
  }

  .mock-practice-summary-grid,
  .mock-practice-filterbar {
    grid-template-columns: 1fr;
  }
}
</style>

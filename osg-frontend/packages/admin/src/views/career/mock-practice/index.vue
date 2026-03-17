<template>
  <div class="mock-practice-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          模拟应聘管理
          <span class="page-title-en">Mock Practice</span>
        </h2>
        <p class="page-subtitle">集中安排模拟面试、人际关系测试和期中考试申请，确保求职训练按时推进。</p>
      </div>
      <div class="page-header__actions">
        <span class="mock-practice-page__badge">{{ stats.pendingCount }} 条待处理</span>
        <span class="mock-practice-page__badge mock-practice-page__badge--ghost">{{ stats.totalCount }} 条全部记录</span>
      </div>
    </div>

    <section class="mock-practice-hero">
      <article
        v-for="card in statCards"
        :key="card.key"
        :class="['mock-practice-card', `mock-practice-card--${card.tone}`]"
      >
        <div class="mock-practice-card__head">
          <span :class="['mdi', card.icon]" aria-hidden="true"></span>
          <span>{{ card.label }}</span>
        </div>
        <strong>{{ card.value }}</strong>
        <span>{{ card.meta }}</span>
      </article>
    </section>

    <section class="permission-card mock-practice-panel">
      <div class="mock-practice-toolbar">
        <label class="mock-practice-field mock-practice-field--search">
          <span>搜索</span>
          <input
            v-model="filters.keyword"
            type="text"
            class="mock-practice-input"
            placeholder="搜索学员或申请内容"
          />
        </label>
        <label class="mock-practice-field">
          <span>类型</span>
          <select v-model="filters.practiceType" class="mock-practice-select">
            <option value="">全部</option>
            <option value="mock_interview">模拟面试</option>
            <option value="communication_test">人际关系测试</option>
            <option value="midterm_exam">期中考试</option>
          </select>
        </label>
        <label class="mock-practice-field">
          <span>状态</span>
          <select v-model="filters.status" class="mock-practice-select">
            <option value="">全部</option>
            <option value="pending">待处理</option>
            <option value="scheduled">已安排</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </label>
        <div class="mock-practice-toolbar__actions">
          <button type="button" class="permission-button permission-button--outline" @click="handleSearch">搜索</button>
          <button type="button" class="permission-button permission-button--ghost" @click="handleReset">重置</button>
        </div>
      </div>

      <div class="mock-practice-tabs">
        <button
          type="button"
          :class="['mock-practice-tabs__button', { 'mock-practice-tabs__button--active': activeTab === 'pending' }]"
          @click="switchTab('pending')"
        >
          <span>待分配导师</span>
          <strong>{{ stats.pendingCount }}</strong>
        </button>
        <button
          type="button"
          :class="['mock-practice-tabs__button', { 'mock-practice-tabs__button--active': activeTab === 'all' }]"
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
        <table class="permission-table mock-practice-table">
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
            <tr v-for="row in pendingRows" :key="row.practiceId" :class="['mock-practice-row', `mock-practice-row--${typeTone(row.practiceType)}`]">
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
                <span :class="['mock-practice-tag', `mock-practice-tag--${typeTone(row.practiceType)}`]">
                  <span :class="['mdi', typeIcon(row.practiceType)]" aria-hidden="true"></span>
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
              <td colspan="5" class="mock-practice-empty">当前筛选条件下暂无待分配导师的申请</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <table class="permission-table mock-practice-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>类型</th>
              <th>申请内容</th>
              <th>申请时间</th>
              <th>导师</th>
              <th>已上课时</th>
              <th>课程反馈</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in allRows" :key="row.practiceId" :class="['mock-practice-row', `mock-practice-row--${typeTone(row.practiceType)}`]">
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
                <span :class="['mock-practice-tag', `mock-practice-tag--${typeTone(row.practiceType)}`]">
                  <span :class="['mdi', typeIcon(row.practiceType)]" aria-hidden="true"></span>
                  <span>{{ formatType(row.practiceType) }}</span>
                </span>
              </td>
              <td>
                <div class="mock-practice-request">
                  <strong>{{ row.requestContent }}</strong>
                  <span>{{ formatStatus(row.status) }}</span>
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
                  <span v-if="row.scheduledAt">{{ formatDateTime(row.scheduledAt) }}</span>
                </div>
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
                </div>
              </td>
            </tr>
            <tr v-if="!allRows.length">
              <td colspan="7" class="mock-practice-empty">当前筛选条件下暂无模拟应聘记录</td>
            </tr>
          </tbody>
        </table>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import AssignMockModal from './components/AssignMockModal.vue'
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
    stats.value = {
      ...defaultStats,
      ...statsResponse
    }
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
  if (!selectedRow.value) {
    return
  }

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
.mock-practice-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mock-practice-page__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.mock-practice-page__badge--ghost {
  background: rgba(15, 23, 42, 0.08);
  color: #475569;
}

.mock-practice-hero {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.mock-practice-card {
  border-radius: 22px;
  padding: 18px 20px;
  color: #0f172a;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.mock-practice-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
}

.mock-practice-card strong {
  display: block;
  margin-top: 14px;
  font-size: 32px;
  line-height: 1;
}

.mock-practice-card span:last-child {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.mock-practice-card--warning {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.96), rgba(254, 243, 199, 0.92));
}

.mock-practice-card--info {
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.92));
}

.mock-practice-card--success {
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(220, 252, 231, 0.92));
}

.mock-practice-card--muted {
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.92));
}

.mock-practice-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-practice-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(2, minmax(150px, 0.8fr)) auto;
  gap: 14px;
  align-items: end;
}

.mock-practice-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-practice-field span {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.mock-practice-input,
.mock-practice-select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #fff;
  color: #10213a;
  padding: 11px 14px;
  font: inherit;
}

.mock-practice-toolbar__actions {
  display: flex;
  gap: 10px;
}

.mock-practice-tabs {
  display: inline-flex;
  gap: 10px;
}

.mock-practice-tabs__button {
  min-width: 176px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mock-practice-tabs__button--active {
  border-color: rgba(15, 118, 110, 0.4);
  background: linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(236, 253, 245, 0.96));
  box-shadow: 0 14px 24px rgba(15, 118, 110, 0.12);
}

.mock-practice-tabs__button span {
  color: #475569;
  font-size: 13px;
}

.mock-practice-tabs__button strong {
  color: #10213a;
  font-size: 20px;
}

.mock-practice-loading,
.mock-practice-empty {
  padding: 28px;
  text-align: center;
  color: #60748e;
}

.mock-practice-table th,
.mock-practice-table td {
  vertical-align: top;
}

.mock-practice-row--info {
  background: rgba(240, 249, 255, 0.7);
}

.mock-practice-row--warning {
  background: rgba(255, 251, 235, 0.82);
}

.mock-practice-row--purple {
  background: rgba(245, 243, 255, 0.86);
}

.mock-practice-student {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mock-practice-student__avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
}

.mock-practice-student__copy,
.mock-practice-request,
.mock-practice-time,
.mock-practice-mentor,
.mock-practice-hours,
.mock-practice-feedback {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mock-practice-student__copy strong,
.mock-practice-request strong,
.mock-practice-time strong,
.mock-practice-mentor strong,
.mock-practice-hours strong,
.mock-practice-feedback strong {
  color: #10213a;
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

.mock-practice-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.mock-practice-tag--info {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.mock-practice-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.mock-practice-tag--purple {
  background: rgba(139, 92, 246, 0.14);
  color: #7c3aed;
}

.mock-practice-action {
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f766e, #22c55e);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 16px;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .mock-practice-hero {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mock-practice-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .mock-practice-hero {
    grid-template-columns: 1fr;
  }

  .mock-practice-toolbar {
    grid-template-columns: 1fr;
  }

  .mock-practice-tabs {
    flex-direction: column;
  }
}
</style>

<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="t('admin.career.mockPractice.pageTitle')"
      title-en="Mock Practice"
    />

    <div class="mock-practice__stats">
      <div v-for="card in statCards" :key="card.key" class="mock-practice__stat-card">
        <div class="mock-practice__stat-value" :style="{ color: card.color }">{{ card.value }}</div>
        <div class="mock-practice__stat-label">{{ card.label }}</div>
      </div>
    </div>

    <a-card :bordered="false">
      <div style="display: flex; gap: var(--osg-space-3); flex-wrap: wrap; align-items: center;">
        <a-input v-model:value="filters.keyword" :placeholder="t('admin.career.mockPractice.filter.searchPlaceholder')" allow-clear style="width: 200px" @press-enter="handleSearch" />
        <a-select v-model:value="filters.practiceType" :placeholder="t('admin.career.mockPractice.filter.typePlaceholder')" allow-clear style="width: 140px">
          <a-select-option value="mock_interview">{{ t('admin.career.mockPractice.type.mockInterview') }}</a-select-option>
          <a-select-option value="communication_test">{{ t('admin.career.mockPractice.type.communicationTest') }}</a-select-option>
          <a-select-option value="midterm_exam">{{ t('admin.career.mockPractice.type.midtermExam') }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.status" :placeholder="t('admin.career.mockPractice.filter.statusPlaceholder')" allow-clear style="width: 120px">
          <a-select-option value="pending">{{ t('admin.career.mockPractice.status.pending') }}</a-select-option>
          <a-select-option value="scheduled">{{ t('admin.career.mockPractice.status.scheduled') }}</a-select-option>
          <a-select-option value="completed">{{ t('admin.career.mockPractice.status.completed') }}</a-select-option>
          <a-select-option value="cancelled">{{ t('admin.career.mockPractice.status.cancelled') }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.career.mockPractice.filter.search') }}
        </a-button>
        <a-button @click="handleReset">{{ t('admin.career.mockPractice.filter.reset') }}</a-button>
      </div>
    </a-card>

    <a-card :bordered="false">
      <template #title>
        <div class="mock-practice__tabs">
          <button :class="['mock-tab', activeTab === 'pending' ? 'mock-tab--active mock-tab--pending' : '']" @click="switchTab('pending')">
            <i class="mdi mdi-account-clock" style="margin-right: 4px;"></i>{{ t('admin.career.mockPractice.tab.pending') }}
            <span class="mock-tab__badge">{{ stats.pendingCount }}</span>
          </button>
          <button :class="['mock-tab', activeTab === 'all' ? 'mock-tab--active mock-tab--all' : '']" @click="switchTab('all')">
            <i class="mdi mdi-format-list-bulleted" style="margin-right: 4px;"></i>{{ t('admin.career.mockPractice.tab.all') }}
            <span class="mock-tab__badge">{{ stats.totalCount }}</span>
          </button>
        </div>
      </template>

      <!-- Pending mentor assignment table -->
      <template v-if="activeTab === 'pending'">
        <a-alert type="error" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ t('admin.career.mockPractice.pendingAlert') }}</template>
        </a-alert>
        <a-table
          :columns="pendingColumns"
          :data-source="pendingRows"
          :row-key="(r: MockPracticeListItem) => r.practiceId"
          :pagination="pendingPagination"
          :loading="loading"
          :locale="{ emptyText: t('admin.career.mockPractice.pendingEmpty') }"
          :scroll="{ x: 'max-content' }"
        >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div class="osg-student-cell">
              <div class="osg-student-avatar" :style="{ background: studentAvatarColor(record.studentId) }">{{ studentInitials(record.studentName) }}</div>
              <div>
                <div style="font-weight: 600;">{{ record.studentName || t('admin.career.mockPractice.unnamedStudent') }}</div>
                <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'practiceType'">
            <a-tag :color="typeColor(record.practiceType)">
              <i :class="['mdi', typeIcon(record.practiceType)]" style="margin-right: 2px;"></i>{{ formatType(record.practiceType) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'requestContent'">
            <div>
              <strong>{{ record.requestContent }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.preferredMentorNames || t('admin.career.mockPractice.noPreferredMentor') }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div>
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatDateTime(record.submittedAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="primary" size="small" @click="openAssignModal(record)">
              <template #icon><i class="mdi mdi-account-plus"></i></template>
              {{ t('admin.career.mockPractice.action.assign') }}
            </a-button>
          </template>
        </template>
        </a-table>
      </template>

      <!-- All records table -->
      <a-table
        v-else
        :columns="allColumns"
        :data-source="allRows"
        :row-key="(r: MockPracticeListItem) => r.practiceId"
        :pagination="allPagination"
        :loading="loading"
        :locale="{ emptyText: t('admin.career.mockPractice.allEmpty') }"
        :scroll="{ x: 'max-content' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div class="osg-student-cell">
              <div class="osg-student-avatar" :style="{ background: studentAvatarColor(record.studentId) }">{{ studentInitials(record.studentName) }}</div>
              <div>
                <div style="font-weight: 600;">{{ record.studentName || t('admin.career.mockPractice.unnamedStudent') }}</div>
                <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'practiceType'">
            <a-tag :color="typeColor(record.practiceType)">
              <i :class="['mdi', typeIcon(record.practiceType)]" style="margin-right: 2px;"></i>{{ formatType(record.practiceType) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'requestContent'">
            <div>
              <strong>{{ record.requestContent }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatDateTime(record.scheduledAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div>
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatDateTime(record.submittedAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorNames'">
            <div>
              <strong>{{ record.mentorNames || t('admin.career.mockPractice.pendingAssign') }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.mentorBackgrounds || '—' }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.status)">{{ formatStatus(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'completedHours'">
            {{ record.completedHours ?? 0 }} hrs
          </template>
          <template v-else-if="column.dataIndex === 'feedbackRating'">
            <div>
              <strong>{{ record.feedbackRating ? `${record.feedbackRating}/5` : '—' }}</strong>
              <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.feedbackSummary || t('admin.career.mockPractice.noFeedback') }}</div>
              <a-button v-if="record.feedbackSummary || record.feedbackRating" type="link" size="small" style="padding: 0" @click="openFeedbackModal(record)">{{ t('admin.career.mockPractice.action.viewFeedback') }}</a-button>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

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
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
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
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import { useStandardClientPagination } from '@osg/shared'

const { t } = useI18n()

type ActiveTab = 'pending' | 'all'

const pendingColumns = computed(() => [
  { title: t('admin.career.mockPractice.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 150, fixed: 'left' as const },
  { title: t('admin.career.mockPractice.columns.type'), dataIndex: 'practiceType', key: 'practiceType', width: 120 },
  { title: t('admin.career.mockPractice.columns.requestContent'), dataIndex: 'requestContent', key: 'requestContent', width: 200 },
  { title: t('admin.career.mockPractice.columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', width: 140 },
  { title: t('admin.career.mockPractice.columns.action'), dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
])

const allColumns = computed(() => [
  { title: t('admin.career.mockPractice.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 150, fixed: 'left' as const },
  { title: t('admin.career.mockPractice.columns.type'), dataIndex: 'practiceType', key: 'practiceType', width: 120 },
  { title: t('admin.career.mockPractice.columns.requestContent'), dataIndex: 'requestContent', key: 'requestContent', width: 180 },
  { title: t('admin.career.mockPractice.columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('admin.career.mockPractice.columns.mentor'), dataIndex: 'mentorNames', key: 'mentorNames', width: 140 },
  { title: t('admin.career.mockPractice.columns.status'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('admin.career.mockPractice.columns.completedHours'), dataIndex: 'completedHours', key: 'completedHours', width: 90 },
  { title: t('admin.career.mockPractice.columns.feedbackRating'), dataIndex: 'feedbackRating', key: 'feedbackRating', width: 150 },
])

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
  practiceType: undefined,
  status: undefined
})

const loading = ref(false)
const activeTab = ref<ActiveTab>('pending')
const stats = ref<MockPracticeStats>({ ...defaultStats })
const rows = ref<MockPracticeListItem[]>([])
const assignableMentors = ref<StaffListItem[]>([])
const assignVisible = ref(false)
const assignSubmitting = ref(false)
const selectedRow = ref<MockPracticeListItem | null>(null)
const feedbackVisible = ref(false)
const selectedFeedbackRow = ref<MockPracticeListItem | null>(null)

const requestFilters = computed<MockPracticeFilters>(() => ({
  keyword: filters.keyword || undefined,
  practiceType: filters.practiceType || undefined,
  status: filters.status || undefined
}))

const statCards = computed(() => [
  { key: 'pending', label: t('admin.career.mockPractice.statCard.pending'), value: stats.value.pendingCount, color: '#F59E0B' },
  { key: 'scheduled', label: t('admin.career.mockPractice.statCard.scheduled'), value: stats.value.scheduledCount, color: '#3B82F6' },
  { key: 'completed', label: t('admin.career.mockPractice.statCard.completed'), value: stats.value.completedCount, color: '#22C55E' },
  { key: 'cancelled', label: t('admin.career.mockPractice.statCard.cancelled'), value: stats.value.cancelledCount, color: '#94A3B8' }
])

const pendingRows = computed(() => rows.value.filter((row) => row.status === 'pending'))
const allRows = computed(() => rows.value)
const pendingPagination = useStandardClientPagination(() => pendingRows.value.length)
const allPagination = useStandardClientPagination(() => allRows.value.length)

const assignMentorOptions = computed<MentorOption[]>(() => {
  const preferredNames = splitMentorNames(selectedRow.value?.preferredMentorNames)
  return assignableMentors.value.map((mentor) => ({
    mentorId: mentor.staffId,
    mentorName: mentor.staffName,
    mentorBackground: [mentor.majorDirection, mentor.city].filter(Boolean).join(' / ') || t('admin.career.mockPractice.assignMentorFallback'),
    preferred: preferredNames.includes(mentor.staffName)
  }))
})

async function loadAssignableMentors() {
  const response = await getStaffList({
    pageNum: 1,
    pageSize: 100,
    staffType: 'mentor',
    accountStatus: '0'
  })
  assignableMentors.value = (response.rows || []).filter((row) => row.staffId && row.staffName)
}

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
  void Promise.all([loadAssignableMentors(), loadData()])
})

const handleSearch = () => {
  void loadData()
}

const handleReset = () => {
  filters.keyword = ''
  filters.practiceType = undefined
  filters.status = undefined
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
    message.success(t('admin.career.mockPractice.messages.assignSuccess'))
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
  if (value === 'mock_interview') return t('admin.career.mockPractice.type.mockInterview')
  if (value === 'communication_test') return t('admin.career.mockPractice.type.communicationTest')
  if (value === 'midterm_exam') return t('admin.career.mockPractice.type.midtermExam')
  return t('admin.career.mockPractice.type.default')
}

function typeColor(value: string): string {
  if (value === 'mock_interview') return 'blue'
  if (value === 'communication_test') return 'orange'
  return 'purple'
}

function typeIcon(value: string): string {
  if (value === 'mock_interview') return 'mdi-account-voice'
  if (value === 'communication_test') return 'mdi-account-group'
  if (value === 'midterm_exam') return 'mdi-file-document-edit'
  return 'mdi-briefcase'
}

const AVATAR_PALETTE = ['#8B5CF6', '#3B82F6', '#F59E0B', '#22C55E', '#EC4899', '#06B6D4', '#EF4444', '#6366F1']

function studentAvatarColor(id?: number | string) {
  if (id === undefined || id === null || id === '') return AVATAR_PALETTE[0]
  const num = Number(id)
  const seed = Number.isFinite(num) ? Math.abs(num) : String(id).charCodeAt(0)
  return AVATAR_PALETTE[seed % AVATAR_PALETTE.length]
}

function studentInitials(name?: string | null) {
  const value = (name || '').trim()
  if (!value) return t('admin.career.mockPractice.studentFallback')
  return value.slice(0, 2)
}

function statusColor(value?: string): string {
  if (value === 'pending') return 'orange'
  if (value === 'scheduled') return 'green'
  if (value === 'completed') return 'cyan'
  if (value === 'cancelled') return 'default'
  return 'blue'
}

function formatStatus(value?: string) {
  if (value === 'pending') return t('admin.career.mockPractice.status.pending')
  if (value === 'scheduled') return t('admin.career.mockPractice.status.scheduled')
  if (value === 'completed') return t('admin.career.mockPractice.status.completed')
  if (value === 'cancelled') return t('admin.career.mockPractice.status.cancelled')
  return t('admin.career.mockPractice.status.unknown')
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
  if (!value) return t('admin.career.mockPractice.relativeJustNow')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('admin.career.mockPractice.relativeJustNow')
  const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / 36e5))
  if (diffHours < 24) return t('admin.career.mockPractice.relativeHoursAgo', { hours: diffHours })
  const diffDays = Math.round(diffHours / 24)
  return t('admin.career.mockPractice.relativeDaysAgo', { days: diffDays })
}
</script>

<style scoped>
.mock-practice__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.mock-practice__stat-card {
  text-align: center;
  padding: 20px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--osg-border-color, #e5e7eb);
}
.mock-practice__stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.mock-practice__stat-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text2, #64748b);
}

.mock-practice__tabs {
  display: flex;
  gap: 4px;
  background: var(--bg, #f1f5f9);
  padding: 3px;
  border-radius: 6px;
  width: fit-content;
}
.mock-tab {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}
.mock-tab:hover { background: #e2e8f0; }
.mock-tab--active { color: #fff; font-weight: 600; }
.mock-tab--pending.mock-tab--active { background: #EF4444; }
.mock-tab--all.mock-tab--active { background: var(--primary, #6366f1); }
.mock-tab__badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
}
.mock-tab:not(.mock-tab--active) .mock-tab__badge {
  background: #cbd5e1;
  color: #475569;
}

.osg-student-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.osg-student-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.5px;
}

</style>

<template>
  <div id="page-mock-practice" class="page-mock-practice osg-page">
    <PageHeader
      title-zh="模拟应聘管理"
      title-en="Mock Practice"
      description="处理学员的模拟面试、人际关系测试、期中考试申请"
    />

    <a-row :gutter="12" aria-label="mock practice stats">
      <a-col v-for="item in statsCards" :key="item.label" :xs="12" :sm="12" :md="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', padding: '16px' }">
          <div class="stats-card__value" :class="item.tone">{{ item.value }}</div>
          <div class="stats-card__label">{{ item.label }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" :body-style="{ padding: 0 }" class="mock-tab-card">
      <a-tabs v-model:active-key="activeTab" type="card" class="mock-tabs">
        <!-- pending tab：LM 独有「待分配导师」 -->
        <a-tab-pane key="pending" force-render>
          <template #tab>
            <span id="mock-tab-pending" class="mock-tab-label mock-tab-label--pending">
              <ClockCircleOutlined />
              待分配导师
              <span class="tab-count">{{ pendingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-pending" class="tab-pane-body">
            <a-alert
              type="warning"
              show-icon
              message="以下学员申请了模拟应聘，需要分配导师"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="pendingFilters.practiceType"
                  placeholder="全部类型"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="pendingFilters.keyword"
                  placeholder="搜索学员姓名/ID"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('pending')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('pending')">
                  <template #icon><SearchOutlined /></template>
                  筛选
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('pending')">
                  <template #icon><ReloadOutlined /></template>
                  重置
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="pendingColumns"
              :data-source="pendingRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.pending"
              :scroll="{ x: 700 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: '暂无待分配的模拟应聘记录' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    size="small"
                    type="primary"
                    data-surface-trigger="modal-assign-mock"
                    @click="openAssignMock(record.practiceId)"
                  >
                    <template #icon><UserAddOutlined /></template>
                    分配导师
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- mycoaching tab：我辅导的学员 -->
        <a-tab-pane key="mycoaching" force-render>
          <template #tab>
            <span id="mock-tab-mycoaching" class="mock-tab-label mock-tab-label--coaching">
              <BookOutlined />
              我辅导的学员
              <span class="tab-count">{{ coachingRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mycoaching" class="tab-pane-body">
            <a-alert
              type="info"
              show-icon
              message="以下是由您亲自辅导的学员模拟应聘记录"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="coachingFilters.practiceType"
                  placeholder="全部类型"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="状态">
                <a-select
                  v-model:value="coachingFilters.status"
                  placeholder="全部状态"
                  allow-clear
                  style="width: 140px"
                  :options="coachingStatusOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="coachingFilters.keyword"
                  placeholder="搜索学员姓名/ID"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('coaching')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('coaching')">
                  <template #icon><SearchOutlined /></template>
                  筛选
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('coaching')">
                  <template #icon><ReloadOutlined /></template>
                  重置
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="coachingColumns"
              :data-source="coachingRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.coaching"
              :scroll="{ x: 1100 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: '当前暂无辅导的模拟应聘记录' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <span class="tag" :class="record.statusTone">
                    <i v-if="record.statusIcon" class="mdi" :class="record.statusIcon" aria-hidden="true" />
                    {{ record.status }}
                  </span>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span v-if="record.hours" class="hours-text">{{ record.hours }}</span>
                  <span v-else class="muted-text">-</span>
                </template>
                <template v-else-if="column.key === 'feedback'">
                  <a-button
                    v-if="record.actionLabel"
                    size="small"
                    type="primary"
                    @click="handleAcknowledgeAssignment(record.practiceId)"
                  >
                    <template #icon><CheckOutlined /></template>
                    {{ record.actionLabel }}
                  </a-button>
                  <button
                    v-else-if="record.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(record.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                      <div class="student-meta">{{ record.feedbackSummary }}</div>
                    </div>
                  </button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- mymanage tab：我管理的学员 -->
        <a-tab-pane key="mymanage" force-render>
          <template #tab>
            <span id="mock-tab-mymanage" class="mock-tab-label mock-tab-label--managed">
              <TeamOutlined />
              我管理的学员
              <span class="tab-count tab-count--managed">{{ managedRows.length }}</span>
            </span>
          </template>
          <div id="mock-content-mymanage" class="tab-pane-body">
            <a-alert
              type="success"
              show-icon
              message="以下是您管理的学员的模拟应聘记录（由其他导师辅导）"
              style="margin-bottom: 12px;"
            />

            <a-form layout="inline" class="mock-filters">
              <a-form-item label="类型">
                <a-select
                  v-model:value="managedFilters.practiceType"
                  placeholder="全部类型"
                  allow-clear
                  style="width: 140px"
                  :options="practiceTypeOptions"
                />
              </a-form-item>
              <a-form-item label="状态">
                <a-select
                  v-model:value="managedFilters.status"
                  placeholder="全部状态"
                  allow-clear
                  style="width: 140px"
                  :options="managedStatusOptions"
                />
              </a-form-item>
              <a-form-item label="学员">
                <a-input
                  v-model:value="managedFilters.keyword"
                  placeholder="搜索学员姓名/ID"
                  allow-clear
                  style="width: 180px"
                  @press-enter="handleSearch('managed')"
                />
              </a-form-item>
              <a-form-item label="导师">
                <a-input
                  v-model:value="managedFilters.mentor"
                  placeholder="搜索导师姓名"
                  allow-clear
                  style="width: 160px"
                  @press-enter="handleSearch('managed')"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="handleSearch('managed')">
                  <template #icon><SearchOutlined /></template>
                  筛选
                </a-button>
              </a-form-item>
              <a-form-item>
                <a-button type="text" @click="handleReset('managed')">
                  <template #icon><ReloadOutlined /></template>
                  重置
                </a-button>
              </a-form-item>
            </a-form>

            <a-table
              :columns="managedColumns"
              :data-source="managedRows"
              :row-key="(r: PracticeRow) => r.practiceId"
              :pagination="false"
              :loading="loading.managed"
              :scroll="{ x: 1200 }"
              :row-class-name="(record: PracticeRow) => record.rowTone || ''"
              :locale="{ emptyText: '当前暂无管理学员的模拟应聘记录' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'student'">
                  <StudentAvatarCell
                    :name="record.studentName"
                    :id="record.studentId"
                    :background-color="record.avatarColor"
                  />
                </template>
                <template v-else-if="column.key === 'practiceType'">
                  <PracticeTypeTag :practice-type="record.practiceType" show-icon />
                </template>
                <template v-else-if="column.key === 'appliedAt'">
                  <span class="date-text">{{ record.appliedAt }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <span class="tag" :class="record.statusTone">{{ record.status }}</span>
                </template>
                <template v-else-if="column.key === 'mentor'">
                  <div class="mentor-stack">
                    <div class="mentor-stack__name">{{ record.mentorName }}</div>
                    <div class="student-meta">{{ record.mentorMeta }}</div>
                  </div>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span class="hours-text">{{ record.hours }}</span>
                </template>
                <template v-else-if="column.key === 'feedback'">
                  <button
                    v-if="record.hasFeedback"
                    type="button"
                    class="feedback-trigger"
                    data-surface-trigger="modal-lead-mock-feedback"
                    @click="openMockFeedback(record.practiceId)"
                  >
                    <div class="feedback-stack">
                      <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                      <div class="student-meta">{{ record.feedbackSummary }}</div>
                    </div>
                  </button>
                  <div v-else class="feedback-stack">
                    <div class="feedback-stack__title" :class="record.feedbackTone">{{ record.feedbackTitle }}</div>
                    <div class="student-meta">{{ record.feedbackSummary }}</div>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <LeadMockFeedbackModal
      v-model="isFeedbackModalOpen"
      :preview="selectedFeedback"
    />

    <AssignMockModal
      v-model="isAssignMockModalOpen"
      :preview="selectedAssignPreview"
      @request-confirm="handleAssignMockConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { PageHeader } from '@osg/shared/components/PageHeader'
import { PracticeTypeTag, StudentAvatarCell } from '@osg/shared/components'
import { message } from 'ant-design-vue'
import {
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import {
  acknowledgeLeadMentorMockPractice,
  assignLeadMentorMockPractice,
  getLeadMentorMockPracticeDetail,
  getLeadMentorMockPracticeList,
  getLeadMentorMockPracticeStats,
  type LeadMentorMockPracticeItem,
  type LeadMentorMockPracticeScope,
  type LeadMentorMockPracticeStats,
} from '@osg/shared/api'
import AssignMockModal, { type AssignMockPreview } from '@/components/AssignMockModal.vue'
import LeadMockFeedbackModal, { type MockFeedbackPreview } from '@/components/LeadMockFeedbackModal.vue'

type MockTab = 'pending' | 'mycoaching' | 'mymanage'
type ScopeKey = LeadMentorMockPracticeScope

interface StatsCard {
  label: string
  value: number
  tone: string
}

interface PracticeRow {
  practiceId: number
  studentId: number
  studentName: string
  avatar: string
  avatarColor: string
  practiceType: string
  typeTone: string
  typeIcon: string
  appliedAt: string
  rowTone?: string
  status?: string
  statusTone?: string
  statusIcon?: string
  hours?: string
  actionLabel?: string
  actionTone?: string
  actionIcon?: string
  mentorName?: string
  mentorMeta?: string
  feedbackTitle?: string
  feedbackTone?: string
  feedbackSummary?: string
  hasFeedback?: boolean
}

const activeTab = ref<MockTab>('mycoaching')
const isAssignMockModalOpen = ref(false)
const selectedAssignPreview = ref<AssignMockPreview | null>(null)
const activeAssignPracticeId = ref<number | null>(null)
const activeAssignDetail = ref<LeadMentorMockPracticeItem | null>(null)
const isFeedbackModalOpen = ref(false)
const selectedFeedback = ref<MockFeedbackPreview | null>(null)
const stats = ref<LeadMentorMockPracticeStats>({
  pendingCount: 0,
  scheduledCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  totalCount: 0,
})
const scopeRows = ref<Record<ScopeKey, LeadMentorMockPracticeItem[]>>({
  pending: [],
  coaching: [],
  managed: [],
})

const loading = reactive<Record<ScopeKey, boolean>>({
  pending: false,
  coaching: false,
  managed: false,
})

interface ScopeFilters {
  practiceType?: string
  status?: string
  keyword?: string
  mentor?: string
}

const pendingFilters = reactive<ScopeFilters>({})
const coachingFilters = reactive<ScopeFilters>({})
const managedFilters = reactive<ScopeFilters>({})

const practiceTypeOptions = [
  { value: '模拟面试', label: '模拟面试' },
  { value: '人际关系测试', label: '人际关系测试' },
  { value: '期中考试', label: '期中考试' },
]

const coachingStatusOptions = [
  { value: 'new_assignment', label: '新分配' },
  { value: 'pending', label: '待进行' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const managedStatusOptions = [
  { value: 'pending', label: '待进行' },
  { value: 'ongoing', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const pendingColumns = [
  { title: '学员', key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: '类型', key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: '申请时间', key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
]

const coachingColumns = [
  { title: '学员', key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: '类型', key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: '申请时间', key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 130 },
  { title: '已上课时', key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: '课程反馈', key: 'feedback', dataIndex: 'feedback', width: 220 },
]

const managedColumns = [
  { title: '学员', key: 'student', dataIndex: 'studentName', width: 200, fixed: 'left' as const },
  { title: '类型', key: 'practiceType', dataIndex: 'practiceType', width: 160 },
  { title: '申请时间', key: 'appliedAt', dataIndex: 'appliedAt', width: 140 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 110 },
  { title: '辅导导师', key: 'mentor', dataIndex: 'mentor', width: 180 },
  { title: '已上课时', key: 'hours', dataIndex: 'hours', width: 110, align: 'center' as const },
  { title: '课程反馈', key: 'feedback', dataIndex: 'feedback', width: 220 },
]

const statsCards = computed<StatsCard[]>(() => [
  { label: '待处理', value: stats.value.pendingCount || 0, tone: 'stats-card__value--warning' },
  { label: '已安排', value: stats.value.scheduledCount || 0, tone: 'stats-card__value--info' },
  { label: '已完成', value: stats.value.completedCount || 0, tone: 'stats-card__value--success' },
  { label: '已取消', value: stats.value.cancelledCount || 0, tone: 'stats-card__value--muted' },
])

const pendingRows = computed<PracticeRow[]>(() =>
  scopeRows.value.pending.map((row) => toPracticeRow(row, 'pending')),
)

const coachingRows = computed<PracticeRow[]>(() =>
  scopeRows.value.coaching.map((row) => toPracticeRow(row, 'coaching')),
)

const managedRows = computed<PracticeRow[]>(() =>
  scopeRows.value.managed.map((row) => toPracticeRow(row, 'managed')),
)

function buildScopeFilters(scope: ScopeKey): ScopeFilters {
  if (scope === 'pending') return pendingFilters
  if (scope === 'coaching') return coachingFilters
  return managedFilters
}

const loadScope = async (scope: ScopeKey) => {
  loading[scope] = true
  try {
    const filters = buildScopeFilters(scope)
    const response = await getLeadMentorMockPracticeList({
      scope,
      keyword: filters.keyword,
      practiceType: filters.practiceType,
      status: filters.status,
    })
    return Array.isArray(response?.rows) ? response.rows : []
  } finally {
    loading[scope] = false
  }
}

const loadAllScopes = async () => {
  try {
    const [nextStats, pending, coaching, managed] = await Promise.all([
      getLeadMentorMockPracticeStats(),
      loadScope('pending'),
      loadScope('coaching'),
      loadScope('managed'),
    ])
    stats.value = nextStats
    scopeRows.value = { pending, coaching, managed }
  } catch (_error) {
    stats.value = {
      pendingCount: 0,
      scheduledCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalCount: 0,
    }
    scopeRows.value = { pending: [], coaching: [], managed: [] }
    isAssignMockModalOpen.value = false
    selectedAssignPreview.value = null
    activeAssignPracticeId.value = null
    activeAssignDetail.value = null
    isFeedbackModalOpen.value = false
    selectedFeedback.value = null
    message.error('模拟应聘数据加载失败')
  }
}

async function handleSearch(scope: ScopeKey) {
  try {
    const rows = await loadScope(scope)
    scopeRows.value = { ...scopeRows.value, [scope]: rows }
  } catch (_error) {
    message.error('筛选失败，请稍后重试')
  }
}

async function handleReset(scope: ScopeKey) {
  const filters = buildScopeFilters(scope)
  filters.practiceType = undefined
  filters.status = undefined
  filters.keyword = undefined
  filters.mentor = undefined
  await handleSearch(scope)
}

const openMockFeedback = async (practiceId: number) => {
  try {
    const detail = await getLeadMentorMockPracticeDetail(practiceId)
    selectedFeedback.value = buildFeedbackPreview(detail)
    isFeedbackModalOpen.value = true
  } catch (_error) {
    selectedFeedback.value = null
    isFeedbackModalOpen.value = false
    message.error('模拟反馈加载失败')
  }
}

const openAssignMock = async (practiceId: number) => {
  try {
    const detail = await getLeadMentorMockPracticeDetail(practiceId)
    activeAssignPracticeId.value = practiceId
    activeAssignDetail.value = detail
    selectedAssignPreview.value = buildAssignPreview(detail)
    isAssignMockModalOpen.value = true
  } catch (_error) {
    activeAssignPracticeId.value = null
    activeAssignDetail.value = null
    selectedAssignPreview.value = null
    isAssignMockModalOpen.value = false
    message.error('模拟应聘详情加载失败')
  }
}

const handleAssignMockConfirm = async () => {
  if (!activeAssignPracticeId.value || !activeAssignDetail.value) {
    message.error('分配上下文丢失')
    return
  }

  const payload = collectAssignPayload(activeAssignDetail.value)
  if (!payload.mentorIds.length) {
    message.error('请至少选择1位导师')
    return
  }
  if (!payload.scheduledAt) {
    message.error('预约时间不能为空')
    return
  }

  try {
    await assignLeadMentorMockPractice(activeAssignPracticeId.value, payload)
    isAssignMockModalOpen.value = false
    message.success('导师分配已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('导师分配保存失败')
  }
}

const handleAcknowledgeAssignment = async (practiceId: number) => {
  try {
    await acknowledgeLeadMentorMockPractice(practiceId)
    message.success('分配确认已保存')
    await nextTick()
    await loadAllScopes()
    await nextTick()
  } catch (_error) {
    message.error('分配确认失败')
  }
}

onMounted(() => {
  void loadAllScopes()
})

function toPracticeRow(row: LeadMentorMockPracticeItem, scope: ScopeKey): PracticeRow {
  const typeUi = resolveTypeUi(row.practiceType)
  const statusUi = resolveStatusUi(row)
  const feedbackTitle = resolveFeedbackTitle(row)
  const feedbackTone = resolveFeedbackTone(row.feedbackRating)
  const hasFeedback = Boolean(row.feedbackSummary)

  return {
    practiceId: row.practiceId,
    studentId: row.studentId,
    studentName: row.studentName || '-',
    avatar: buildAvatarText(row.studentName),
    avatarColor: resolveAvatarColor(row.studentName),
    practiceType: row.practiceType || '-',
    typeTone: typeUi.typeTone,
    typeIcon: typeUi.typeIcon,
    appliedAt: formatDateTime(row.submittedAt, 'MM/DD HH:mm'),
    rowTone: typeUi.rowTone,
    status: row.statusLabel || row.status || '-',
    statusTone: statusUi.statusTone,
    statusIcon: statusUi.statusIcon,
    hours: scope === 'managed' ? (row.completedHoursLabel || '-') : (row.completedHoursLabel || ''),
    actionLabel: scope === 'coaching' && row.isNewAssignment ? '确认' : undefined,
    actionTone: scope === 'coaching' && row.isNewAssignment ? 'btn btn-sm btn-success' : undefined,
    actionIcon: scope === 'coaching' && row.isNewAssignment ? 'mdi-check' : undefined,
    mentorName: row.mentorNames || '-',
    mentorMeta: row.mentorBackgrounds || '-',
    feedbackTitle,
    feedbackTone,
    feedbackSummary: row.feedbackSummary || (row.isNewAssignment ? '等待导师确认' : '等待导师补充反馈'),
    hasFeedback,
  }
}

function buildAssignPreview(detail: LeadMentorMockPracticeItem): AssignMockPreview {
  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    mentorDemand: formatMentorDemand(detail.requestedMentorCount),
    mentorOptions: (detail.mentorOptions ?? []).map((mentor) => ({
      code: buildMentorCode(mentor.mentorName),
      name: mentor.mentorName || '-',
      meta: [mentor.mentorBackground, mentor.availabilityLabel].filter(Boolean).join(' · '),
      avatarColor: resolveAvatarColor(mentor.mentorName),
      selected: Boolean(mentor.selected),
    })),
    scheduledAt: toDateTimeInputValue(detail.scheduledAt),
    note: detail.note || '',
    avatarColor: resolveAvatarColor(detail.studentName),
  }
}

function buildFeedbackPreview(detail: LeadMentorMockPracticeItem): MockFeedbackPreview {
  const feedbackSummary = detail.feedbackSummary || detail.note || '暂无反馈'
  const suggestions = splitSuggestions(detail.note)

  return {
    studentName: detail.studentName || '-',
    practiceType: detail.practiceType || '-',
    companyName: detail.requestContent || '-',
    sessionTime: formatDateTime(detail.scheduledAt || detail.submittedAt, 'YYYY-MM-DD HH:mm'),
    mentorName: detail.mentorNames || '-',
    status: detail.statusLabel || detail.status || '-',
    score: normalizeScore(detail.feedbackRating),
    scoreLabel: resolveFeedbackTitle(detail),
    actualDuration: detail.completedHoursLabel || '-',
    feedback: feedbackSummary,
    suggestions,
    recommendation: buildRecommendation(detail),
    avatarColor: resolveAvatarColor(detail.studentName),
  }
}

function collectAssignPayload(detail: LeadMentorMockPracticeItem) {
  const modal = document.querySelector<HTMLElement>('[data-surface-id="modal-assign-mock"]')
  const mentorOptions = detail.mentorOptions ?? []
  const checkboxes = Array.from(
    modal?.querySelectorAll<HTMLInputElement>('.mentor-list input[type="checkbox"]') ?? [],
  )
  const mentorIds = mentorOptions
    .filter((_, index) => checkboxes[index]?.checked)
    .map((mentor) => mentor.mentorId)
  const scheduledAt =
    modal?.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value?.trim() || ''
  const note = modal?.querySelector<HTMLTextAreaElement>('textarea')?.value?.trim() || ''

  return {
    mentorIds,
    scheduledAt,
    note,
  }
}

function resolveTypeUi(practiceType?: string) {
  const normalized = (practiceType || '').trim()
  if (normalized === '模拟面试') {
    return { typeTone: 'tag--info', typeIcon: 'mdi-account-voice', rowTone: 'mock-row--blue' }
  }
  if (normalized === '人际关系测试') {
    return { typeTone: 'tag--warning', typeIcon: 'mdi-account-group', rowTone: 'mock-row--amber' }
  }
  if (normalized === '期中考试') {
    return { typeTone: 'tag--purple', typeIcon: 'mdi-file-document-edit', rowTone: 'mock-row--purple' }
  }
  return { typeTone: 'tag--info', typeIcon: 'mdi-clipboard-text', rowTone: 'mock-row--blue' }
}

function resolveStatusUi(row: LeadMentorMockPracticeItem) {
  if (row.isNewAssignment) {
    return { statusTone: 'tag--danger', statusIcon: 'mdi-bell-ring' }
  }

  const normalized = (row.status || '').trim().toLowerCase()
  if (normalized === 'completed') {
    return { statusTone: 'tag--success', statusIcon: 'mdi-check-circle' }
  }
  if (normalized === 'confirmed') {
    return { statusTone: 'tag--info', statusIcon: 'mdi-check-decagram' }
  }
  if (normalized === 'cancelled') {
    return { statusTone: 'tag--muted', statusIcon: 'mdi-close-circle' }
  }
  return { statusTone: 'tag--info', statusIcon: 'mdi-clock-outline' }
}

function resolveFeedbackTitle(row: Pick<LeadMentorMockPracticeItem, 'feedbackRating' | 'statusLabel' | 'status'>) {
  const rating = normalizeScore(row.feedbackRating)
  if (rating >= 5) {
    return '优秀'
  }
  if (rating >= 4) {
    return '良好'
  }
  if (rating >= 3) {
    return '待改进'
  }
  return row.statusLabel || row.status || '待反馈'
}

function resolveFeedbackTone(rating?: number) {
  const resolved = normalizeScore(rating)
  if (resolved >= 5) {
    return 'feedback-stack__title--success'
  }
  if (resolved >= 4) {
    return 'feedback-stack__title--warning'
  }
  return 'feedback-stack__title--muted'
}

function buildRecommendation(detail: LeadMentorMockPracticeItem) {
  if (detail.note) {
    return detail.note
  }
  if (normalizeScore(detail.feedbackRating) >= 4) {
    return '导师建议继续推进下一阶段训练'
  }
  return '建议先补一轮针对性训练后再继续推进'
}

function splitSuggestions(note?: string) {
  const items = (note || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length) {
    return items
  }

  return ['结合导师反馈继续补充高频题训练']
}

function formatMentorDemand(count?: number) {
  const resolved = Number(count ?? 0)
  return resolved > 0 ? `期望${resolved}位导师` : '待确认导师人数'
}

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatDateTime(value?: string, pattern: 'MM/DD HH:mm' | 'YYYY-MM-DD HH:mm' = 'MM/DD HH:mm') {
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

function normalizeScore(value?: number) {
  const score = Number(value ?? 0)
  return Number.isFinite(score) ? score : 0
}

function buildAvatarText(name?: string) {
  const trimmed = (name || '').trim()
  return trimmed.slice(0, 2) || '--'
}

function resolveAvatarColor(seed?: string) {
  const palette = ['var(--primary)', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899']
  const source = (seed || '').trim()
  if (!source) {
    return palette[0]
  }

  const hash = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function buildMentorCode(name?: string) {
  const parts = (name || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) {
    return '--'
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}
</script>

<style scoped>
/* ---- 顶层布局 ---- */
.page-mock-practice {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- Stats 卡片：色 tone ---- */
.stats-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}
.stats-card__value--warning { color: #F59E0B; }
.stats-card__value--info    { color: #3B82F6; }
.stats-card__value--success { color: #22C55E; }
.stats-card__value--muted   { color: var(--muted); }
.stats-card__label {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}

/* ---- Tab 卡 ---- */
.mock-tab-card { margin-bottom: 0; }
.mock-tabs :deep(.ant-tabs-tab) { padding: 8px 16px; }
.mock-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mock-tab-label--pending {
  color: #DC2626;
}
.mock-tab-label--coaching {
  color: var(--primary, #3b82f6);
}
.mock-tab-label--managed {
  color: #8B5CF6;
}
.tab-count {
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  font-size: 10px;
}
.tab-count--managed {
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
}
.tab-pane-body {
  padding: 12px 16px 16px;
}
.mock-filters {
  margin-bottom: 12px;
}
.mock-filters :deep(.ant-form-item) {
  margin-bottom: 8px;
}

/* ---- 行 tone（按 practiceType / isNewAssignment） ---- */
:deep(.mock-row--blue)   { background: #F0F9FF; }
:deep(.mock-row--amber)  { background: #FFFBEB; }
:deep(.mock-row--purple) { background: #F3E8FF; }
:deep(.mock-row--new) {
  background: linear-gradient(90deg, #FEE2E2, #FEF2F2);
  box-shadow: inset 4px 0 0 #EF4444;
}

/* ---- mentor-stack 在其他 cell 还用 ---- */
.mentor-stack__name {
  color: var(--text);
  font-weight: 600;
}
.date-text {
  font-size: 12px;
}

/* ---- 业务 tag tone（type / status） ---- */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.tag--info    { background: #DBEAFE; color: #1D4ED8; }
.tag--warning { background: #FEF3C7; color: #B45309; }
.tag--success { background: #DCFCE7; color: #166534; }
.tag--danger  { background: #EF4444; color: #fff; }
.tag--muted   { background: #F3F4F6; color: #6B7280; }
.tag--purple  { background: #8B5CF6; color: #fff; }

.hours-text {
  color: var(--primary);
  font-weight: 600;
}
.muted-text {
  color: var(--muted);
}

/* ---- 反馈栈（trigger 包裹） ---- */
.feedback-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.feedback-trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.feedback-stack__title {
  font-size: 12px;
  font-weight: 500;
}
.feedback-stack__title--success { color: #059669; }
.feedback-stack__title--warning { color: #D97706; }
.feedback-stack__title--muted   { color: var(--muted); }

.mentor-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>

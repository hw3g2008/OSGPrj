<template>
  <div class="osg-page">
    <PageHeader title="模拟应聘管理" subtitle="Mock Practice" description="管理所有学员的模拟面试、人际关系测试、期中考试申请">
      <template #actions>
        <a-space>
          <a-tag color="orange">{{ stats.pendingCount }} 条待处理</a-tag>
          <a-tag color="blue">{{ stats.totalCount }} 条全部记录</a-tag>
        </a-space>
      </template>
    </PageHeader>

    <a-row :gutter="12">
      <a-col v-for="card in statCards" :key="card.key" :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: card.bg, borderRadius: '12px' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ fontWeight: 700 }" />
          <div style="color: #64748b; font-size: 12px; margin-top: 4px">{{ card.meta }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.keyword" placeholder="搜索学员或申请内容" allow-clear style="width: 200px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.practiceType" placeholder="全部类型" allow-clear style="width: 130px">
            <a-select-option value="mock_interview">模拟面试</a-select-option>
            <a-select-option value="communication_test">人际关系测试</a-select-option>
            <a-select-option value="midterm_exam">期中考试</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.status" placeholder="全部状态" allow-clear style="width: 120px">
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="scheduled">已安排</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-tabs v-model:activeKey="activeTab" @change="(key: string) => switchTab(key as ActiveTab)">
        <a-tab-pane key="pending">
          <template #tab>
            待分配导师
            <a-badge :count="stats.pendingCount" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
        <a-tab-pane key="all">
          <template #tab>
            全部记录
            <a-badge :count="stats.totalCount" :number-style="{ backgroundColor: '#1890ff' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- 待分配导师表格 -->
      <a-table
        v-if="activeTab === 'pending'"
        :columns="pendingColumns"
        :data-source="pendingRows"
        :row-key="(r: MockPracticeListItem) => r.practiceId"
        :pagination="pendingPagination"
        :loading="loading"
        :locale="{ emptyText: '当前筛选条件下暂无待分配导师的申请' }"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div>
              <strong>{{ record.studentName || '未命名学员' }}</strong>
              <div style="color: #64748b; font-size: 12px">ID {{ record.studentId }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'practiceType'">
            <a-tag :color="typeColor(record.practiceType)">{{ formatType(record.practiceType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'requestContent'">
            <div>
              <strong>{{ record.requestContent }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ record.preferredMentorNames || '暂无意向导师' }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div>
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ formatDateTime(record.submittedAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="primary" size="small" @click="openAssignModal(record)">分配导师</a-button>
          </template>
        </template>
      </a-table>

      <!-- 全部记录表格 -->
      <a-table
        v-else
        :columns="allColumns"
        :data-source="allRows"
        :row-key="(r: MockPracticeListItem) => r.practiceId"
        :pagination="allPagination"
        :loading="loading"
        :locale="{ emptyText: '当前筛选条件下暂无模拟应聘记录' }"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div>
              <strong>{{ record.studentName || '未命名学员' }}</strong>
              <div style="color: #64748b; font-size: 12px">ID {{ record.studentId }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'practiceType'">
            <a-tag :color="typeColor(record.practiceType)">{{ formatType(record.practiceType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'requestContent'">
            <div>
              <strong>{{ record.requestContent }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ formatDateTime(record.scheduledAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            <div>
              <strong>{{ formatRelativeTime(record.submittedAt) }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ formatDateTime(record.submittedAt) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorNames'">
            <div>
              <strong>{{ record.mentorNames || '待分配' }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ record.mentorBackgrounds || '—' }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.status)">{{ formatStatus(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'completedHours'">
            {{ record.completedHours ?? 0 }} 小时
          </template>
          <template v-else-if="column.dataIndex === 'feedbackRating'">
            <div>
              <strong>{{ record.feedbackRating ? `${record.feedbackRating}/5` : '—' }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ record.feedbackSummary || '暂无反馈' }}</div>
              <a-button v-if="record.feedbackSummary || record.feedbackRating" type="link" size="small" style="padding: 0" @click="openFeedbackModal(record)">查看反馈</a-button>
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
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
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

type ActiveTab = 'pending' | 'all'

const pendingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 150 },
  { title: '类型', dataIndex: 'practiceType', key: 'practiceType', width: 120 },
  { title: '申请内容', dataIndex: 'requestContent', key: 'requestContent', width: 200 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 140 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
]

const allColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 150 },
  { title: '类型', dataIndex: 'practiceType', key: 'practiceType', width: 120 },
  { title: '申请内容', dataIndex: 'requestContent', key: 'requestContent', width: 180 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: '导师', dataIndex: 'mentorNames', key: 'mentorNames', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '已上课时', dataIndex: 'completedHours', key: 'completedHours', width: 90 },
  { title: '课程反馈', dataIndex: 'feedbackRating', key: 'feedbackRating', width: 150 },
]

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
  { key: 'pending', label: '待处理', value: stats.value.pendingCount, meta: '待分配导师', tone: 'warning', icon: 'mdi-timer-sand', bg: '#fffbeb' },
  { key: 'scheduled', label: '已安排', value: stats.value.scheduledCount, meta: '已锁定导师与时间', tone: 'info', icon: 'mdi-calendar-check', bg: '#eff6ff' },
  { key: 'completed', label: '已完成', value: stats.value.completedCount, meta: '已产出反馈', tone: 'success', icon: 'mdi-check-decagram', bg: '#f0fdf4' },
  { key: 'cancelled', label: '已取消', value: stats.value.cancelledCount, meta: '本轮未继续', tone: 'muted', icon: 'mdi-cancel', bg: '#f8fafc' }
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
    mentorBackground: [mentor.majorDirection, mentor.city].filter(Boolean).join(' / ') || '可分配导师',
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

function typeColor(value: string): string {
  if (value === 'mock_interview') return 'blue'
  if (value === 'communication_test') return 'orange'
  return 'purple'
}

function statusColor(value?: string): string {
  if (value === 'pending') return 'orange'
  if (value === 'scheduled') return 'green'
  if (value === 'completed') return 'cyan'
  if (value === 'cancelled') return 'default'
  return 'blue'
}

function formatStatus(value?: string) {
  if (value === 'pending') return '待处理'
  if (value === 'scheduled') return '已安排'
  if (value === 'completed') return '已完成'
  if (value === 'cancelled') return '已取消'
  return '未知'
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

<style scoped>
</style>

<template>
  <div class="osg-page">
    <PageHeader title="学员求职总览" subtitle="Job Overview" description="查看全部学员的求职进度，管理导师和题库分配">
      <template #actions>
        <a-space>
          <a-tag>{{ allRows.length }} 条申请</a-tag>
          <a-tag color="orange">{{ unassignedRows.length }} 条待分配</a-tag>
          <a-tag color="green">{{ stats.offerCount }} 条 Offer</a-tag>
          <a-button :loading="exporting" @click="handleExport">
            <template #icon><ExportOutlined /></template>
            导出
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <a-row :gutter="12">
      <a-col v-for="card in statsCards" :key="card.key" :span="Math.floor(24 / statsCards.length)">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: card.bg, borderRadius: '12px' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ color: card.color, fontWeight: 700 }" />
          <div style="color: #64748b; font-size: 12px; margin-top: 4px">{{ card.meta }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 分析区域 -->
    <a-row :gutter="16">
      <a-col :span="14">
        <a-card :bordered="false" title="求职转化漏斗" :body-style="{ padding: '16px' }">
          <template #extra><span style="color: #94a3b8; font-size: 12px">已投递 → 面试中 → 获 Offer</span></template>
          <div v-for="item in funnelRows" :key="item.label" class="funnel-row">
            <div class="funnel-label">
              <strong>{{ item.label }}</strong>
              <span>{{ item.count }} 人</span>
            </div>
            <div class="funnel-track">
              <div class="funnel-fill" :style="{ width: `${Math.max(item.rate, 6)}%` }"></div>
            </div>
            <span class="funnel-rate">{{ item.rate }}%</span>
          </div>
          <a-empty v-if="!funnelRows.length" description="当前暂无漏斗数据" />
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card :bordered="false" title="申请热度 Top 5" :body-style="{ padding: '16px' }">
          <template #extra><span style="color: #94a3b8; font-size: 12px">申请数 / Offer 率</span></template>
          <div v-for="company in hotCompanies" :key="company.companyName" class="hot-item">
            <div>
              <strong>{{ company.companyName }}</strong>
              <div style="color: #64748b; font-size: 12px">{{ company.applicationCount }} 份申请</div>
            </div>
            <div style="text-align: right">
              <span style="color: #64748b; font-size: 12px">{{ company.offerCount }} Offer</span>
              <div style="color: #16a34a; font-size: 18px; font-weight: 700">{{ company.offerRate }}%</div>
            </div>
          </div>
          <a-empty v-if="!hotCompanies.length" description="当前暂无热门公司统计" />
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.studentName" placeholder="搜索学员" allow-clear style="width: 150px" @press-enter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.companyName" placeholder="全部公司" allow-clear style="width: 140px">
            <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.currentStage" placeholder="全部状态" allow-clear style="width: 130px">
            <a-select-option v-for="option in stageOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.leadMentorId" placeholder="全部班主任" allow-clear style="width: 130px">
            <a-select-option v-for="option in mentorOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.assignStatus" placeholder="分配状态" allow-clear style="width: 120px">
            <a-select-option value="pending">待分配</a-select-option>
            <a-select-option value="assigned">已分配</a-select-option>
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

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="pending">
          <template #tab>
            待分配导师
            <a-badge :count="pendingBadge" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
        <a-tab-pane key="all">
          <template #tab>
            全部学员
            <a-badge :count="allRows.length" :number-style="{ backgroundColor: '#1890ff' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- 待分配导师表格 -->
      <template v-if="activeTab === 'pending'">
        <a-alert type="info" show-icon message="以下学员申请了辅导，需要为岗位申请分配导师。" style="margin-bottom: 12px; border-radius: 8px" />
        <a-table :columns="pendingColumns" :data-source="unassignedRows" :row-key="(r: UnassignedJobOverviewRow) => r.applicationId" :pagination="false" :loading="loading" :locale="{ emptyText: '当前没有待分配导师的岗位申请' }" :scroll="{ x: 1000 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div><strong>{{ record.studentName || '-' }}</strong><div style="color: #64748b; font-size: 12px">ID: {{ record.studentId }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'companyName'">
              <div><strong>{{ record.companyName }}</strong><div style="color: #64748b; font-size: 12px">{{ record.positionName }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'currentStage'">
              <a-tag :color="stageColor(record.currentStage)">{{ formatStage(record.currentStage) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: #64748b; font-size: 12px">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'requestedMentorCount'">
              <div><strong>{{ record.requestedMentorCount || 0 }} 位</strong><div style="color: #64748b; font-size: 12px">{{ record.preferredMentorNames || '暂无意向导师' }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              {{ formatRelativeDate(record.submittedAt) }}
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="primary" size="small" @click="handleOpenAssignMentor(record)">分配导师</a-button>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 全部学员表格 -->
      <a-table v-else :columns="allColumns" :data-source="allRows" :row-key="(r: JobOverviewRow) => r.applicationId" :pagination="false" :loading="loading" :locale="{ emptyText: '当前筛选条件下暂无学员求职记录' }" :scroll="{ x: 1200 }" :row-class-name="(record: JobOverviewRow) => allRowClassName(record)">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div><strong>{{ record.studentName || '-' }}</strong><div style="color: #64748b; font-size: 12px">ID: {{ record.studentId }}</div></div>
          </template>
          <template v-else-if="column.dataIndex === 'companyName'">
            <div><strong>{{ record.companyName }}</strong><div style="color: #64748b; font-size: 12px">{{ record.positionName }} · {{ record.city || record.region || '地区待补充' }}</div></div>
          </template>
          <template v-else-if="column.dataIndex === 'currentStage'">
            <a-space>
              <a-tag :color="stageColor(record.currentStage)">{{ formatStage(record.currentStage) }}</a-tag>
              <a-button v-if="record.stageUpdated" size="small" :loading="stageUpdatingId === record.applicationId" @click="handleStageConfirm(record)">确认</a-button>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'interviewTime'">
            <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: #64748b; font-size: 12px">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
          </template>
          <template v-else-if="column.dataIndex === 'coachingStatus'">
            <a-tag :color="coachingColor(record.coachingStatus)">{{ record.coachingStatus || '未申请' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            <div><strong>{{ record.mentorName || record.leadMentorName || '待分配' }}</strong><div style="color: #64748b; font-size: 12px">{{ record.mentorBackground || (record.assignedStatus === 'assigned' ? '导师信息待补充' : '未分配导师') }}</div></div>
          </template>
          <template v-else-if="column.dataIndex === 'hoursUsed'">
            <div><strong>{{ record.hoursUsed || 0 }}h</strong><div style="color: #64748b; font-size: 12px">{{ record.feedbackSummary || '暂无反馈' }}</div></div>
          </template>
        </template>
      </a-table>
    </a-card>

    <AssignMentorModal
      :visible="assignMentorVisible"
      :row="selectedAssignmentRow"
      :mentor-options="assignMentorOptions"
      :submitting="assignSubmitting"
      @update:visible="handleAssignMentorVisibleChange"
      @submit="handleAssignMentorSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import AssignMentorModal from './components/AssignMentorModal.vue'
import {
  assignMentors,
  exportJobOverview,
  getHotCompanies,
  getJobOverviewFunnel,
  getJobOverviewList,
  getJobOverviewStats,
  getUnassignedJobOverviewList,
  updateJobOverviewStage,
  type HotCompanyItem,
  type JobOverviewFilters,
  type JobOverviewFunnelNode,
  type JobOverviewRow,
  type JobOverviewStats,
  type UnassignedJobOverviewRow
} from '@osg/shared/api/admin/jobOverview'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'

type ActiveTab = 'pending' | 'all'

const pendingColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: '公司/岗位', dataIndex: 'companyName', key: 'companyName', width: 160 },
  { title: '阶段', dataIndex: 'currentStage', key: 'currentStage', width: 100 },
  { title: '面试时间', dataIndex: 'interviewTime', key: 'interviewTime', width: 130 },
  { title: '需求导师', dataIndex: 'requestedMentorCount', key: 'requestedMentorCount', width: 140 },
  { title: '申请时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
]

const allColumns = [
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: '公司/岗位', dataIndex: 'companyName', key: 'companyName', width: 180 },
  { title: '阶段', dataIndex: 'currentStage', key: 'currentStage', width: 130 },
  { title: '面试时间', dataIndex: 'interviewTime', key: 'interviewTime', width: 130 },
  { title: '辅导状态', dataIndex: 'coachingStatus', key: 'coachingStatus', width: 100 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 140 },
  { title: '课时 / 反馈', dataIndex: 'hoursUsed', key: 'hoursUsed', width: 140 },
]

interface AssignMentorOption {
  mentorId: number
  mentorName: string
  preferred: boolean
  hint?: string
}

interface AssignMentorSubmitPayload {
  mentorIds: number[]
  mentorNames: string[]
  assignNote: string
}

const defaultStats: JobOverviewStats = {
  appliedCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  rejectedCount: 0,
  withdrawnCount: 0,
  offerRate: 0,
  interviewPassRate: 0,
  offerRateYoY: '0%',
  interviewPassRateYoY: '0%'
}

const filters = reactive({
  studentName: '',
  companyName: undefined,
  currentStage: undefined,
  leadMentorId: undefined,
  assignStatus: undefined
})

const stageOptions = [
  { value: 'applied', label: '已投递' },
  { value: 'hirevue', label: 'HireVue' },
  { value: 'first_round', label: 'First Round' },
  { value: 'second_round', label: 'Second Round' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'final', label: 'Final' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'withdrawn', label: '主动放弃' }
]

const loading = ref(false)
const activeTab = ref<ActiveTab>('pending')
const stats = ref<JobOverviewStats>({ ...defaultStats })
const funnelRows = ref<JobOverviewFunnelNode[]>([])
const hotCompanies = ref<HotCompanyItem[]>([])
const allRows = ref<JobOverviewRow[]>([])
const unassignedRows = ref<UnassignedJobOverviewRow[]>([])
const assignableMentors = ref<StaffListItem[]>([])
const assignMentorVisible = ref(false)
const assignSubmitting = ref(false)
const selectedAssignmentRow = ref<UnassignedJobOverviewRow | null>(null)
const stageUpdatingId = ref<number | null>(null)
const exporting = ref(false)

const requestFilters = computed<JobOverviewFilters>(() => ({
  studentName: filters.studentName || undefined,
  companyName: filters.companyName || undefined,
  currentStage: filters.currentStage || undefined,
  leadMentorId: filters.leadMentorId ? Number(filters.leadMentorId) : undefined,
  assignStatus: filters.assignStatus || undefined
}))

const companyOptions = computed(() => {
  const values = new Set<string>()
  allRows.value.forEach((row) => row.companyName && values.add(row.companyName))
  unassignedRows.value.forEach((row) => row.companyName && values.add(row.companyName))
  return [...values]
})

const mentorOptions = computed(() => {
  const values = new Map<number, string>()
  allRows.value.forEach((row) => {
    const rawId = (row as JobOverviewRow & { leadMentorId?: number }).leadMentorId
    if (rawId && row.leadMentorName) {
      values.set(rawId, row.leadMentorName)
    }
  })
  return [...values.entries()].map(([value, label]) => ({ value: String(value), label }))
})

const pendingBadge = computed(() => (unassignedRows.value.length > 99 ? '99+' : String(unassignedRows.value.length)))
const assignMentorOptions = computed<AssignMentorOption[]>(() => {
  const row = selectedAssignmentRow.value
  if (!row) return []

  const preferredMentors = new Set(splitMentorNames(row.preferredMentorNames))
  return assignableMentors.value.map((mentor) => ({
    mentorId: mentor.staffId,
    mentorName: mentor.staffName,
    preferred: preferredMentors.has(mentor.staffName),
    hint: [mentor.majorDirection, mentor.city].filter(Boolean).join(' / ') || '可分配导师'
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

const statsCards = computed(() => [
  { key: 'applied', label: '已投递', value: stats.value.appliedCount, meta: `Offer率 ${formatDelta(stats.value.offerRateYoY)}`, bg: '#eff6ff', color: '#2563eb' },
  { key: 'interviewing', label: '面试中', value: stats.value.interviewingCount, meta: `通过率 ${formatDelta(stats.value.interviewPassRateYoY)}`, bg: '#fffbeb', color: '#d97706' },
  { key: 'offer', label: '已获 Offer', value: stats.value.offerCount, meta: `${stats.value.offerRate}% Offer rate`, bg: '#f0fdf4', color: '#16a34a' },
  { key: 'rejected', label: '已拒绝', value: stats.value.rejectedCount, meta: '关注失败复盘', bg: '#fef2f2', color: '#dc2626' },
  { key: 'withdrawn', label: '已放弃', value: stats.value.withdrawnCount, meta: '追踪后续转化', bg: '#f8fafc', color: '#64748b' }
])

async function loadDashboard() {
  loading.value = true
  try {
    const [statsData, funnelData, hotCompanyData, listData, unassignedData] = await Promise.all([
      getJobOverviewStats(requestFilters.value),
      getJobOverviewFunnel(requestFilters.value),
      getHotCompanies(requestFilters.value),
      getJobOverviewList(requestFilters.value),
      getUnassignedJobOverviewList({
        studentName: requestFilters.value.studentName,
        companyName: requestFilters.value.companyName,
        currentStage: requestFilters.value.currentStage,
        leadMentorId: requestFilters.value.leadMentorId
      })
    ])

    stats.value = { ...defaultStats, ...statsData }
    funnelRows.value = funnelData
    hotCompanies.value = hotCompanyData
    allRows.value = listData.rows ?? []
    unassignedRows.value = unassignedData.rows ?? []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  void loadDashboard()
}

function handleReset() {
  filters.studentName = ''
  filters.companyName = undefined
  filters.currentStage = undefined
  filters.leadMentorId = undefined
  filters.assignStatus = undefined
  void loadDashboard()
}

async function handleExport() {
  try {
    exporting.value = true
    await exportJobOverview({
      studentName: requestFilters.value.studentName,
      companyName: requestFilters.value.companyName,
      currentStage: requestFilters.value.currentStage,
      leadMentorId: requestFilters.value.leadMentorId,
      assignStatus: requestFilters.value.assignStatus,
      tab: activeTab.value
    })
    message.success('求职总览导出成功')
  } catch (_error) {
    message.error('求职总览导出失败')
  } finally {
    exporting.value = false
  }
}

function handleOpenAssignMentor(row: UnassignedJobOverviewRow) {
  selectedAssignmentRow.value = row
  assignMentorVisible.value = true
}

function handleAssignMentorVisibleChange(visible: boolean) {
  assignMentorVisible.value = visible
  if (!visible) {
    selectedAssignmentRow.value = null
  }
}

async function handleAssignMentorSubmit(payload: AssignMentorSubmitPayload) {
  if (!selectedAssignmentRow.value) return

  assignSubmitting.value = true
  try {
    await assignMentors({
      applicationId: selectedAssignmentRow.value.applicationId,
      mentorIds: payload.mentorIds,
      mentorNames: payload.mentorNames,
      assignNote: payload.assignNote
    })
    message.success(`${selectedAssignmentRow.value.studentName || '该学员'} 已完成导师分配`)
    assignMentorVisible.value = false
    selectedAssignmentRow.value = null
    await loadDashboard()
  } finally {
    assignSubmitting.value = false
  }
}

async function handleStageConfirm(row: JobOverviewRow) {
  stageUpdatingId.value = row.applicationId
  try {
    await updateJobOverviewStage({
      applicationId: row.applicationId,
      stageUpdated: false
    })
    message.success(`${row.studentName || '该学员'} 的阶段提醒已确认`)
    await loadDashboard()
  } finally {
    stageUpdatingId.value = null
  }
}

function formatStage(stage?: string) {
  const matched = stageOptions.find((item) => item.value === stage)
  return matched?.label || stage || '未更新'
}

function stageColor(stage?: string): string {
  switch (stage) {
    case 'offer': return 'green'
    case 'rejected': return 'red'
    case 'withdrawn': return 'default'
    case 'case_study': return 'orange'
    case 'first_round':
    case 'second_round':
    case 'final': return 'gold'
    case 'hirevue': return 'blue'
    default: return 'purple'
  }
}

function coachingColor(status?: string): string {
  if (status === '辅导中') return 'purple'
  if (status === '待审批') return 'orange'
  return 'default'
}

function allRowClassName(record: JobOverviewRow): string {
  if (record.stageUpdated) return 'row-updated'
  if (isEndedStage(record.currentStage)) return 'row-ended'
  return ''
}

function isEndedStage(stage?: string) {
  return stage === 'offer' || stage === 'rejected' || stage === 'withdrawn'
}

function formatDateTime(value?: string) {
  if (!value) return '待安排'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatInterviewCountdown(value?: string) {
  if (!value) return '待确认时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待解析'
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) return '已过面试时间'
  if (day === 0) return '今天'
  return `还剩 ${day} 天`
}

function formatRelativeDate(value?: string) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDelta(value?: string) {
  return value || '0%'
}

function splitMentorNames(value?: string | null) {
  return (value || '')
    .split(/[,，/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

onMounted(() => {
  void Promise.all([loadAssignableMentors(), loadDashboard()])
})
</script>

<style scoped>
.funnel-row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.funnel-label { display: flex; flex-direction: column; gap: 2px; }
.funnel-label strong { color: #0f172a; font-size: 13px; }
.funnel-label span, .funnel-rate { color: #64748b; font-size: 12px; }
.funnel-track { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.funnel-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.hot-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 10px; background: #f8fafc; margin-bottom: 8px; }
.hot-item strong { color: #0f172a; font-size: 13px; }
:deep(.row-updated) { background: rgba(239, 246, 255, 0.6); }
:deep(.row-ended) { background: rgba(248, 250, 252, 0.8); }
</style>

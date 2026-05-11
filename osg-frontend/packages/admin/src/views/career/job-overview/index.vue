<template>
  <div class="osg-page">
    <PageHeader title-zh="学员求职总览" title-en="Job Overview">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <!-- 关键指标 + 转化漏斗（左右两栏） -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- 左侧：本月关键指标 -->
      <a-card :bordered="false" style="margin: 0;">
        <template #title>
          <span style="font-weight: 600; font-size: 13px;"><i class="mdi mdi-chart-box" style="color: var(--primary); margin-right: 6px;"></i>本月关键指标</span>
        </template>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
          <div v-for="card in statsCards" :key="card.key" :style="{ textAlign: 'center', padding: '12px', background: card.bg, borderRadius: '8px' }">
            <div :style="{ fontSize: '24px', fontWeight: 700, color: card.color }">{{ card.value }}</div>
            <div style="font-size: var(--osg-font-size-xs); color: var(--text2, #64748b);">{{ card.label }}</div>
          </div>
        </div>
        <div style="display: flex; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 11px;">
          <span style="color: #22C55E;"><i class="mdi mdi-trending-up"></i> Offer率 {{ stats.offerRate }}% <span style="color: var(--muted);">{{ formatDelta(stats.offerRateYoY) }}</span></span>
          <span style="color: #3B82F6;"><i class="mdi mdi-trending-up"></i> 面试通过率 {{ stats.interviewPassRate }}% <span style="color: var(--muted);">{{ formatDelta(stats.interviewPassRateYoY) }}</span></span>
        </div>
      </a-card>

      <!-- 右侧：求职转化漏斗 -->
      <a-card :bordered="false" style="margin: 0;">
        <template #title>
          <span style="font-weight: 600; font-size: 13px;"><i class="mdi mdi-filter-variant" style="color: var(--primary); margin-right: 6px;"></i>求职转化漏斗</span>
        </template>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div v-for="item in funnelRows" :key="item.label" style="display: flex; align-items: center; gap: 12px;">
            <span style="width: 60px; font-size: 11px; color: var(--muted);">{{ item.label }}</span>
            <div style="flex: 1; height: 24px; background: #e2e8f0; border-radius: 4px; position: relative; overflow: hidden;">
              <div :style="{ width: `${Math.max(item.rate, 6)}%`, height: '100%', background: funnelColor(item.label), borderRadius: '4px' }"></div>
              <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 600;">{{ item.count }}</div>
            </div>
            <span style="font-size: 11px; color: var(--muted); width: 40px;">{{ item.rate }}%</span>
          </div>
        </div>
        <a-empty v-if="!funnelRows.length" description="当前暂无漏斗数据" />
      </a-card>
    </div>

    <!-- 筛选条件 -->
    <a-card :bordered="false">
      <div style="display: flex; gap: var(--osg-space-3); flex-wrap: wrap;">
        <a-input v-model:value="filters.studentName" placeholder="搜索学员姓名..." allow-clear style="width: 180px;" @press-enter="handleSearch" />
        <a-select v-model:value="filters.companyName" placeholder="全部公司" allow-clear style="width: 140px;">
          <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.currentStage" placeholder="全部状态" allow-clear style="width: 140px;">
          <a-select-option v-for="option in stageOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.leadMentorId" placeholder="全部班主任" allow-clear style="width: 140px;">
          <a-select-option v-for="option in mentorOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          搜索
        </a-button>
      </div>
    </a-card>

    <!-- 学员求职列表 -->
    <a-card :bordered="false">
      <template #title>
        <div style="display: flex; gap: 4px; background: var(--bg); padding: 3px; border-radius: 6px; width: fit-content;">
          <button :class="['job-tab', activeTab === 'pending' ? 'job-tab-active job-tab-pending' : '']" @click="activeTab = 'pending'">
            <i class="mdi mdi-account-clock" style="margin-right: 4px;"></i>待分配导师
            <span class="job-tab-badge">{{ unassignedRows.length }}</span>
          </button>
          <button :class="['job-tab', activeTab === 'all' ? 'job-tab-active job-tab-all' : '']" @click="activeTab = 'all'">
            <i class="mdi mdi-account-group" style="margin-right: 4px;"></i>全部学员
            <span class="job-tab-badge">{{ allRows.length }}</span>
          </button>
        </div>
      </template>

      <!-- 待分配导师表格 -->
      <template v-if="activeTab === 'pending'">
        <a-alert type="warning" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>以下学员申请了辅导，需要分配导师</template>
        </a-alert>
        <a-table :columns="pendingColumns" :data-source="unassignedRows" :row-key="(r: UnassignedJobOverviewRow) => r.applicationId" :pagination="unassignedPagination" :loading="loading" :locale="{ emptyText: '当前没有待分配导师的岗位申请' }" :scroll="{ x: 1000 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div><strong>{{ record.studentName || '-' }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'companyName'">
              <div><strong>{{ record.companyName }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.positionName }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'currentStage'">
              <a-tag :color="stageColor(record.currentStage)">{{ formatStage(record.currentStage) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'requestedMentorCount'">
              <div><strong>{{ record.requestedMentorCount || 0 }} 位</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.preferredMentorNames || '暂无意向导师' }}</div></div>
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
      <template v-else>
        <a-alert type="info" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>查看全部学员的求职进度（只读）</template>
        </a-alert>
        <a-table :columns="allColumns" :data-source="allRows" :row-key="(r: JobOverviewRow) => r.applicationId" :pagination="allListPagination" :loading="loading" :locale="{ emptyText: '当前筛选条件下暂无学员求职记录' }" :scroll="{ x: 1200 }" :row-class-name="(record: JobOverviewRow) => allRowClassName(record)">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div><strong>{{ record.studentName || '-' }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'companyName'">
              <div><strong>{{ record.companyName }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.positionName }} · {{ record.city || record.region || '地区待补充' }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'currentStage'">
              <a-space>
                <a-tag :color="stageColor(record.currentStage)">{{ formatStage(record.currentStage) }}</a-tag>
                <a-button v-if="record.stageUpdated" size="small" :loading="stageUpdatingId === record.applicationId" @click="handleStageConfirm(record)">确认</a-button>
              </a-space>
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'coachingStatus'">
              <a-tag :color="resolveCoachingTagColor(record.coachingStatus)">{{ resolveCoachingTagLabel(record.coachingStatus) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'mentorName'">
              <div><strong>{{ record.mentorName || record.leadMentorName || '待分配' }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.mentorBackground || (record.assignedStatus === 'assigned' ? '导师信息待补充' : '未分配导师') }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'hoursUsed'">
              <div><strong>{{ record.hoursUsed || 0 }}h</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.feedbackSummary || '暂无反馈' }}</div></div>
            </template>
          </template>
        </a-table>
      </template>
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
import { PageHeader } from '@osg/shared/components/PageHeader'
import AssignMentorModal from './components/AssignMentorModal.vue'
import {
  assignMentors,
  exportJobOverview,
  getJobOverviewFunnel,
  getJobOverviewList,
  getJobOverviewStats,
  getUnassignedJobOverviewList,
  updateJobOverviewStage,
  type JobOverviewFilters,
  type JobOverviewFunnelNode,
  type JobOverviewRow,
  type JobOverviewStats,
  type UnassignedJobOverviewRow
} from '@osg/shared/api/admin/jobOverview'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import { useStandardClientPagination } from '@osg/shared'
// §D.3 admin job-overview 接入 SSOT composable 派生辅导状态展示
import { deriveApplicationStatus } from '@osg/shared/composables'

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
  leadMentorId: undefined
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
const activeTab = ref<ActiveTab>('all')
const stats = ref<JobOverviewStats>({ ...defaultStats })
const funnelRows = ref<JobOverviewFunnelNode[]>([])
const allRows = ref<JobOverviewRow[]>([])
const unassignedRows = ref<UnassignedJobOverviewRow[]>([])
const unassignedPagination = useStandardClientPagination(() => unassignedRows.value.length)
const allListPagination = useStandardClientPagination(() => allRows.value.length)
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
  leadMentorId: filters.leadMentorId ? Number(filters.leadMentorId) : undefined
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
    const [statsData, funnelData, listData, unassignedData] = await Promise.all([
      getJobOverviewStats(requestFilters.value),
      getJobOverviewFunnel(requestFilters.value),
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

// §D.3 admin job-overview 改用 SSOT composable，删除本地硬编码 coachingColor 函数
function resolveCoachingTagColor(status?: string): string {
  const display = deriveApplicationStatus({ coachingStatus: status })
  switch (display.tone) {
    case 'info': return 'purple'
    case 'warning': return 'orange'
    case 'danger': return 'red'
    case 'success': return 'green'
    default: return 'default'
  }
}

function resolveCoachingTagLabel(status?: string): string {
  // none / 未填 → '未申请'，其他走 composable 派生
  if (!status || status === 'none') return '未申请'
  return deriveApplicationStatus({ coachingStatus: status }).label || '未申请'
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

function funnelColor(label: string) {
  if (label.includes('Offer') || label.includes('offer')) return '#DCFCE7'
  if (label.includes('面试')) return '#FEF3C7'
  return '#E0F2FE'
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
.job-tab {
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
.job-tab:hover { background: #e2e8f0; }
.job-tab-active { color: #fff; font-weight: 600; }
.job-tab-pending.job-tab-active { background: #EF4444; }
.job-tab-all.job-tab-active { background: var(--primary); }
.job-tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  margin-left: 4px;
}
:deep(.row-updated) { background: rgba(239, 246, 255, 0.6); }
:deep(.row-ended) { background: rgba(248, 250, 252, 0.8); }
</style>

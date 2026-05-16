<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.career.jobOverview.index.pageTitle')" title-en="Job Overview">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ t('admin.career.jobOverview.index.export') }}
        </a-button>
      </template>
    </PageHeader>

    <!-- Key Metrics + Conversion Funnel (two columns) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Left: monthly key metrics -->
      <a-card :bordered="false" style="margin: 0;">
        <template #title>
          <span style="font-weight: 600; font-size: 13px;"><i class="mdi mdi-chart-box" style="color: var(--primary); margin-right: 6px;"></i>{{ t('admin.career.jobOverview.index.statsTitle') }}</span>
        </template>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
          <div v-for="card in statsCards" :key="card.key" :style="{ textAlign: 'center', padding: '12px', background: card.bg, borderRadius: '8px' }">
            <div :style="{ fontSize: '24px', fontWeight: 700, color: card.color }">{{ card.value }}</div>
            <div style="font-size: var(--osg-font-size-xs); color: var(--text2, #64748b);">{{ card.label }}</div>
          </div>
        </div>
        <div style="display: flex; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 11px;">
          <span style="color: #22C55E;"><i class="mdi mdi-trending-up"></i> {{ t('admin.career.jobOverview.index.offerRateLabel') }} {{ stats.offerRate }}% <span style="color: var(--muted);">{{ formatDelta(stats.offerRateYoY) }}</span></span>
          <span style="color: #3B82F6;"><i class="mdi mdi-trending-up"></i> {{ t('admin.career.jobOverview.index.passRateLabel') }} {{ stats.interviewPassRate }}% <span style="color: var(--muted);">{{ formatDelta(stats.interviewPassRateYoY) }}</span></span>
        </div>
      </a-card>

      <!-- Right: job conversion funnel -->
      <a-card :bordered="false" style="margin: 0;">
        <template #title>
          <span style="font-weight: 600; font-size: 13px;"><i class="mdi mdi-filter-variant" style="color: var(--primary); margin-right: 6px;"></i>{{ t('admin.career.jobOverview.index.funnelTitle') }}</span>
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
        <a-empty v-if="!funnelRows.length" :description="t('admin.career.jobOverview.index.funnelEmpty')" />
      </a-card>
    </div>

    <!-- Filters -->
    <a-card :bordered="false">
      <div style="display: flex; gap: var(--osg-space-3); flex-wrap: wrap;">
        <a-input v-model:value="filters.studentName" :placeholder="t('admin.career.jobOverview.index.filter.studentPlaceholder')" allow-clear style="width: 220px;" @press-enter="handleSearch" />
        <a-select v-model:value="filters.companyName" :placeholder="t('admin.career.jobOverview.index.filter.companyPlaceholder')" allow-clear style="width: 140px;">
          <a-select-option v-for="option in companyOptions" :key="option" :value="option">{{ option }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.currentStage" :placeholder="t('admin.career.jobOverview.index.filter.stagePlaceholder')" allow-clear style="width: 140px;">
          <a-select-option v-for="option in stageOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.leadMentorId" :placeholder="t('admin.career.jobOverview.index.filter.leadMentorPlaceholder')" allow-clear style="width: 140px;">
          <a-select-option v-for="option in mentorOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ t('admin.career.jobOverview.index.filter.search') }}
        </a-button>
      </div>
    </a-card>

    <!-- Student job application list -->
    <a-card :bordered="false">
      <template #title>
        <div style="display: flex; gap: 4px; background: var(--bg); padding: 3px; border-radius: 6px; width: fit-content;">
          <button :class="['job-tab', activeTab === 'pending' ? 'job-tab-active job-tab-pending' : '']" @click="activeTab = 'pending'">
            <i class="mdi mdi-account-clock" style="margin-right: 4px;"></i>{{ t('admin.career.jobOverview.index.tab.pending') }}
            <span class="job-tab-badge">{{ unassignedRows.length }}</span>
          </button>
          <button :class="['job-tab', activeTab === 'all' ? 'job-tab-active job-tab-all' : '']" @click="activeTab = 'all'">
            <i class="mdi mdi-account-group" style="margin-right: 4px;"></i>{{ t('admin.career.jobOverview.index.tab.all') }}
            <span class="job-tab-badge">{{ allRows.length }}</span>
          </button>
        </div>
      </template>

      <!-- Pending assignment table -->
      <template v-if="activeTab === 'pending'">
        <a-alert type="warning" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ t('admin.career.jobOverview.index.pendingAlert') }}</template>
        </a-alert>
        <a-table :columns="pendingColumns" :data-source="unassignedRows" :row-key="(r: UnassignedCoachingRow) => r.coachingId" :pagination="unassignedPagination" :loading="loading" :locale="{ emptyText: t('admin.career.jobOverview.index.pendingEmpty') }" :scroll="{ x: 'max-content' }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div class="osg-student-cell">
                <div class="osg-student-avatar" :style="{ background: studentAvatarColor(record.studentId) }">{{ studentInitials(record.studentName) }}</div>
                <div>
                  <div style="font-weight: 600;">{{ record.studentName || '-' }}</div>
                  <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'companyName'">
              <div><strong>{{ record.companyName }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.positionName }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'interviewStage'">
              <a-tag :color="stageColor(record.interviewStage)">{{ formatStage(record.interviewStage) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'requestedMentorCount'">
              <div><strong>{{ t('admin.career.jobOverview.index.mentorCount', { count: record.requestedMentorCount || 0 }) }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.companyInterviewer || t('admin.career.jobOverview.index.noPreferredMentor') }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'submittedAt'">
              {{ formatRelativeDate(record.submittedAt) }}
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="primary" size="small" @click="handleOpenAssignMentor(record)">{{ t('admin.career.jobOverview.index.assignMentorBtn') }}</a-button>
            </template>
          </template>
        </a-table>
      </template>

      <!-- All students table -->
      <template v-else>
        <a-alert type="info" show-icon style="margin-bottom: 12px; border-radius: 8px;">
          <template #message>{{ t('admin.career.jobOverview.index.allAlert') }}</template>
        </a-alert>
        <a-table :columns="allColumns" :data-source="allRows" :row-key="(r: JobOverviewRow) => r.applicationId" :pagination="allListPagination" :loading="loading" :locale="{ emptyText: t('admin.career.jobOverview.index.allEmpty') }" :scroll="{ x: 'max-content' }" :row-class-name="(record: JobOverviewRow) => allRowClassName(record)">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'studentName'">
              <div class="osg-student-cell">
                <div class="osg-student-avatar" :style="{ background: studentAvatarColor(record.studentId) }">{{ studentInitials(record.studentName) }}</div>
                <div>
                  <div style="font-weight: 600;">{{ record.studentName || '-' }}</div>
                  <div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">ID: {{ record.studentId }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'companyName'">
              <div><strong>{{ record.companyName }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.positionName }} · {{ record.city || record.region || t('admin.career.jobOverview.index.regionPending') }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'currentStage'">
              <a-tag :color="stageColor(record.currentStage)">{{ formatStage(record.currentStage) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'interviewTime'">
              <div><strong>{{ formatDateTime(record.interviewTime) }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ formatInterviewCountdown(record.interviewTime) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'coachingStatus'">
              <a-tag :color="resolveCoachingTagColor(record.coachingStatus)">{{ resolveCoachingTagLabel(record.coachingStatus) }}</a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'mentorName'">
              <div><strong>{{ record.mentorName || record.leadMentorName || t('admin.career.jobOverview.index.mentorPending') }}</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.mentorBackground || (record.assignedStatus === 'assigned' ? t('admin.career.jobOverview.index.mentorInfoPending') : t('admin.career.jobOverview.index.noMentorAssigned')) }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'hoursUsed'">
              <div><strong>{{ record.hoursUsed || 0 }}h</strong><div style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">{{ record.feedbackSummary || t('admin.career.jobOverview.index.noFeedback') }}</div></div>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button v-if="record.stageUpdated" type="primary" size="small" :loading="stageUpdatingId === record.applicationId" @click="handleStageConfirm(record)">
                <template #icon><i class="mdi mdi-check-circle" aria-hidden="true"></i></template>
                {{ t('admin.career.jobOverview.index.confirmBtn') }}
              </a-button>
              <span v-else style="color: var(--text2, #64748b); font-size: var(--osg-font-size-sm)">—</span>
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
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import AssignMentorModal from './components/AssignMentorModal.vue'
import {
  assignMentorsByCoaching,
  exportJobOverview,
  getJobOverviewFunnel,
  getJobOverviewList,
  getJobOverviewStats,
  getUnassignedCoachingList,
  updateJobOverviewStage,
  type JobOverviewFilters,
  type JobOverviewFunnelNode,
  type JobOverviewRow,
  type JobOverviewStats,
  type UnassignedCoachingRow
} from '@osg/shared/api/admin/jobOverview'
import { getStaffList, type StaffListItem } from '@osg/shared/api/admin/staff'
import { useStandardClientPagination } from '@osg/shared'
// i18n-skip-line: dev comment — §D.3 admin job-overview 接入 SSOT composable 派生辅导状态展示
import { deriveApplicationStatus } from '@osg/shared/composables'

type ActiveTab = 'pending' | 'all'

const { t } = useI18n()

// i18n-skip-line: dev comment — §B3: 待分配 Tab 切到 coaching 维度，阶段字段用 interviewStage、提交时间用 coaching.create_time
const pendingColumns = computed(() => [
  { title: t('admin.career.jobOverview.index.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 140, fixed: 'left' as const },
  { title: t('admin.career.jobOverview.index.columns.companyPosition'), dataIndex: 'companyName', key: 'companyName', width: 200 },
  { title: t('admin.career.jobOverview.index.columns.stage'), dataIndex: 'interviewStage', key: 'interviewStage', width: 110 },
  { title: t('admin.career.jobOverview.index.columns.interviewTime'), dataIndex: 'interviewTime', key: 'interviewTime', width: 160 },
  { title: t('admin.career.jobOverview.index.columns.requestedMentor'), dataIndex: 'requestedMentorCount', key: 'requestedMentorCount', width: 160 },
  { title: t('admin.career.jobOverview.index.columns.appliedAt'), dataIndex: 'submittedAt', key: 'submittedAt', width: 110 },
  { title: t('admin.career.jobOverview.index.columns.action'), dataIndex: 'action', key: 'action', width: 100, fixed: 'right' as const },
])

const allColumns = computed(() => [
  { title: t('admin.career.jobOverview.index.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 140, fixed: 'left' as const },
  { title: t('admin.career.jobOverview.index.columns.companyPosition'), dataIndex: 'companyName', key: 'companyName', width: 220 },
  { title: t('admin.career.jobOverview.index.columns.stage'), dataIndex: 'currentStage', key: 'currentStage', width: 150 },
  { title: t('admin.career.jobOverview.index.columns.interviewTime'), dataIndex: 'interviewTime', key: 'interviewTime', width: 160 },
  { title: t('admin.career.jobOverview.index.columns.coachingStatus'), dataIndex: 'coachingStatus', key: 'coachingStatus', width: 110 },
  { title: t('admin.career.jobOverview.index.columns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 180 },
  { title: t('admin.career.jobOverview.index.columns.hoursAndFeedback'), dataIndex: 'hoursUsed', key: 'hoursUsed', width: 200 },
  { title: t('admin.career.jobOverview.index.columns.action'), dataIndex: 'action', key: 'action', width: 110, fixed: 'right' as const },
])

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

const stageOptions = computed(() => [
  { value: 'applied', label: t('admin.career.jobOverview.index.stage.applied') },
  { value: 'hirevue', label: 'HireVue' },
  { value: 'first_round', label: 'First Round' },
  { value: 'second_round', label: 'Second Round' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'final', label: 'Final' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: t('admin.career.jobOverview.index.stage.rejected') },
  { value: 'withdrawn', label: t('admin.career.jobOverview.index.stage.withdrawn') },
])

const loading = ref(false)
const activeTab = ref<ActiveTab>('pending')
const stats = ref<JobOverviewStats>({ ...defaultStats })
const funnelRows = ref<JobOverviewFunnelNode[]>([])
const allRows = ref<JobOverviewRow[]>([])
const unassignedRows = ref<UnassignedCoachingRow[]>([])
const unassignedPagination = useStandardClientPagination(() => unassignedRows.value.length)
const allListPagination = useStandardClientPagination(() => allRows.value.length)
const assignableMentors = ref<StaffListItem[]>([])
const assignMentorVisible = ref(false)
const assignSubmitting = ref(false)
const selectedAssignmentRow = ref<UnassignedCoachingRow | null>(null)
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
    hint: [mentor.majorDirection, mentor.city].filter(Boolean).join(' / ') || t('admin.career.jobOverview.assignMentor.available')
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
  { key: 'applied', label: t('admin.career.jobOverview.index.statsCard.applied'), value: stats.value.appliedCount, bg: '#eff6ff', color: '#2563eb' },
  { key: 'interviewing', label: t('admin.career.jobOverview.index.statsCard.interviewing'), value: stats.value.interviewingCount, bg: '#fffbeb', color: '#d97706' },
  { key: 'offer', label: t('admin.career.jobOverview.index.statsCard.offer'), value: stats.value.offerCount, bg: '#f0fdf4', color: '#16a34a' },
  { key: 'rejected', label: t('admin.career.jobOverview.index.statsCard.rejected'), value: stats.value.rejectedCount, bg: '#fef2f2', color: '#dc2626' },
  { key: 'withdrawn', label: t('admin.career.jobOverview.index.statsCard.withdrawn'), value: stats.value.withdrawnCount, bg: '#f8fafc', color: '#64748b' },
])

async function loadDashboard() {
  loading.value = true
  try {
    const [statsData, funnelData, listData, unassignedData] = await Promise.all([
      getJobOverviewStats(requestFilters.value),
      getJobOverviewFunnel(requestFilters.value),
      getJobOverviewList(requestFilters.value),
      // i18n-skip-line: dev comment — §B3: 后台「待分配」Tab 切到 coaching 维度，按 osg_coaching 行展示
      getUnassignedCoachingList({
        studentName: requestFilters.value.studentName,
        companyName: requestFilters.value.companyName,
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
    message.success(t('admin.career.jobOverview.index.exportSuccess'))
  } catch (_error) {
    message.error(t('admin.career.jobOverview.index.exportFail'))
  } finally {
    exporting.value = false
  }
}

function handleOpenAssignMentor(row: UnassignedCoachingRow) {
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
    // i18n-skip-line: dev comment — §B3: 按 coachingId 精确分配，避免一个 application 多条 coaching 时分错对象
    await assignMentorsByCoaching(selectedAssignmentRow.value.coachingId, {
      mentorIds: payload.mentorIds,
      mentorNames: payload.mentorNames,
      assignNote: payload.assignNote
    })
    message.success(t('admin.career.jobOverview.index.assignSuccess', { name: selectedAssignmentRow.value.studentName || t('admin.career.jobOverview.index.defaultStudentName') }))
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
    message.success(t('admin.career.jobOverview.index.stageConfirmSuccess', { name: row.studentName || t('admin.career.jobOverview.index.defaultStudentName') }))
    await loadDashboard()
  } finally {
    stageUpdatingId.value = null
  }
}

function formatStage(stage?: string) {
  const matched = stageOptions.value.find((item) => item.value === stage)
  return matched?.label || stage || t('admin.career.jobOverview.index.stage.unknown')
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

// i18n-skip-line: dev comment — §D.3 admin job-overview 改用 SSOT composable，删除本地硬编码 coachingColor 函数
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
  // i18n-skip-line: dev comment — none / 未填 → 未申请，其他走 composable 派生
  if (!status || status === 'none') return t('admin.career.jobOverview.index.coachingNotApplied')
  return deriveApplicationStatus({ coachingStatus: status }).label || t('admin.career.jobOverview.index.coachingNotApplied')
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
  if (!value) return t('admin.career.jobOverview.index.interviewTimePending')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatInterviewCountdown(value?: string) {
  if (!value) return t('admin.career.jobOverview.index.interviewTimePendingConfirm')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('admin.career.jobOverview.index.interviewTimeParseFailed')
  const diff = date.getTime() - Date.now()
  const day = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (day < 0) return t('admin.career.jobOverview.index.interviewTimePast')
  if (day === 0) return t('admin.career.jobOverview.index.interviewTimeToday')
  return t('admin.career.jobOverview.index.interviewTimeDaysLeft', { days: day })
}

function formatRelativeDate(value?: string) {
  if (!value) return t('admin.career.jobOverview.index.relativeJustNow')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return t('admin.career.jobOverview.index.relativeJustNow')
  if (hours < 24) return t('admin.career.jobOverview.index.relativeHoursAgo', { hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('admin.career.jobOverview.index.relativeDaysAgo', { days })
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function funnelColor(label: string) {
  if (label.includes('Offer') || label.includes('offer')) return '#DCFCE7'
  if (label.includes('面试')) return '#FEF3C7' // i18n-skip-line: pattern match against API data labels
  return '#E0F2FE'
}

function formatDelta(value?: string) {
  return value || '0%'
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
  if (!value) return t('admin.career.jobOverview.index.studentFallback')
  return value.slice(0, 2)
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

<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="$t('course_records')"
      title-en="Class Records"
      :description="scopeDescription"
    >
      <template #actions>
        <a-button type="primary" @click="openReportModal">
          <template #icon><PlusOutlined /></template>
          {{ $t('submit_course_record') }}
        </a-button>
      </template>
    </PageHeader>

    <a-tabs
      v-model:activeKey="activeScope"
      class="scope-tabs"
      @change="handleScopeChange"
    >
      <a-tab-pane key="mine">
        <template #tab>
          <span>{{ $t('my_submissions') }}</span>
          <a-badge
            v-if="scopeCount('mine') > 0"
            :count="scopeCount('mine')"
            :number-style="{ backgroundColor: '#1D4ED8' }"
            class="tab-badge"
          />
        </template>
      </a-tab-pane>
      <a-tab-pane key="managed">
        <template #tab>
          <span>{{ $t('students_i_manage') }}</span>
          <a-badge
            v-if="scopeCount('managed') > 0"
            :count="scopeCount('managed')"
            :number-style="{ backgroundColor: '#7C3AED' }"
            class="tab-badge"
          />
        </template>
      </a-tab-pane>
    </a-tabs>

    <a-alert type="info" show-icon class="flow-alert">
      <template #message>
        <a-space wrap :size="[12, 8]">
          <span class="flow-alert__title">{{ $t('course_record_process') }}</span>
          <a-tag v-for="(step, idx) in flowSteps" :key="step" color="blue">
            {{ idx + 1 }}. {{ step }}
          </a-tag>
        </a-space>
      </template>
    </a-alert>

    <div class="stats-row">
      <StatCard
        v-for="card in summaryCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :color="statColorMap[card.key]"
      />
    </div>

    <a-card :bordered="false" class="filter-card">
      <div class="filters">
        <a-input
          id="assistant-class-records-keyword"
          v-model:value="filters.keyword"
          :placeholder="`${$t('search_student_name')}/ID`"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <SearchOutlined style="color: #94A3B8" />
          </template>
        </a-input>

        <a-select
          v-model:value="filters.coachingType"
          :placeholder="$t('coaching_type')"
          allow-clear
          style="width: 140px"
          :options="coachingTypeSelectOptions"
        />

        <a-select
          v-model:value="filters.courseContent"
          :placeholder="$t('course_content')"
          allow-clear
          style="width: 180px"
          :options="courseContentSelectOptions"
        />

        <a-select
          v-model:value="filters.reporterRole"
          :placeholder="$t('submitter')"
          allow-clear
          style="width: 120px"
          :options="reporterRoleSelectOptions"
        />

        <a-range-picker
          v-model:value="filters.classDateRange"
          value-format="YYYY-MM-DD"
          style="width: 240px"
        />

        <a-button id="assistant-class-records-search" type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ $t('search') }}
        </a-button>
        <a-button id="assistant-class-records-reset" type="text" @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          {{ $t('reset') }}
        </a-button>
      </div>
    </a-card>

    <a-alert
      v-if="errorMessage"
      type="error"
      show-icon
      ::message="`'${$t('failed_to_load_course_records')}'`"
      :description="errorMessage"
      class="error-alert"
    >
      <template #action>
        <a-button size="small" type="link" @click="loadRecords">{{ $t('reload') }}</a-button>
      </template>
    </a-alert>

    <a-card v-else :bordered="false" :body-style="{ padding: 0 }" class="table-card">
      <a-tabs v-model:activeKey="activeTab" class="status-tabs" @change="handleTabChange">
        <a-tab-pane v-for="tab in tabList" :key="tab.key">
          <template #tab>
            <span>{{ tab.label }}</span>
            <a-badge
              v-if="tabCount(tab.key) > 0"
              :count="tabCount(tab.key)"
              :number-style="{ backgroundColor: tab.badgeColor }"
              class="tab-badge"
            />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-table
        :columns="columns"
        :data-source="filteredRecords"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 'max-content' }"
        :locale="{ emptyText: $t('no_course_records_under_current_filter') }"
        :row-class-name="rowClassName"
        row-key="recordId"
        :row-attrs="() => ({ 'data-class-record-row': '' })"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordId'">
            <a-tag color="blue">#{{ record.recordCode || `R${record.recordId}` }}</a-tag>
          </template>

          <template v-else-if="column.key === 'student'">
            <div class="cell-stack">
              <strong class="name-text">{{ record.studentName || '-' }}</strong>
              <span class="muted-id">ID: {{ record.studentId }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'reporter'">
            <div class="cell-stack">
              <strong class="name-text">{{ record.mentorName || '-' }}</strong>
              <span class="muted-id">{{ reporterRoleLabel(record.reporterRole) }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'coachingType'">
            <a-tag v-if="record.coachingType" :color="coachingTypeColor(record.coachingType)">
              {{ record.coachingType }}
            </a-tag>
            <span v-else class="muted-id">-</span>
          </template>

          <template v-else-if="column.key === 'courseContent'">
            <a-tag :style="contentTagStyle(record)">
              {{ record.courseContent || '-' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'classDate'">
            <span>{{ formatClassDate(record.classDate) }}</span>
          </template>

          <template v-else-if="column.key === 'durationHours'">
            <span>{{ formatHours(record.durationHours) }}</span>
          </template>

          <template v-else-if="column.key === 'courseFee'">
            <span class="fee-text">{{ formatFee(record.courseFee) }}</span>
          </template>

          <template v-else-if="column.key === 'studentRating'">
            <a-tag v-if="record.studentRating" color="green">
              ⭐ {{ record.studentRating }}
            </a-tag>
            <span v-else class="muted-id">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <ClassRecordStatusTag :status="record.status" />
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">
              {{ record.status === 'rejected' ? $t('view_reason') : $t('view_details') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="detailVisible"
      ::title="`selectedRecord?.status === 'rejected' ? '${$t('rejection_reason_2')}' : '${$t('course_record_details')}'`"
      :footer="null"
      :width="720"
      @cancel="closeDetail"
    >
      <a-descriptions v-if="selectedRecord" :column="2" bordered size="small">
        <a-descriptions-item label="记录ID">
          {{ selectedRecord.recordCode || `#R${selectedRecord.recordId}` }}
        </a-descriptions-item>
        <a-descriptions-item label="学员">
          {{ selectedRecord.studentName || '-' }}
          <span class="muted-id">（ID: {{ selectedRecord.studentId }}）</span>
        </a-descriptions-item>
        <a-descriptions-item label="申报人">
          {{ selectedRecord.mentorName || '-' }} / {{ reporterRoleLabel(selectedRecord.reporterRole) }}
        </a-descriptions-item>
        <a-descriptions-item label="辅导内容">
          <a-tag v-if="selectedRecord.coachingType" :color="coachingTypeColor(selectedRecord.coachingType)">
            {{ selectedRecord.coachingType }}
          </a-tag>
          <span v-else class="muted-id">-</span>
        </a-descriptions-item>
        <a-descriptions-item label="课程内容">
          <a-tag :style="contentTagStyle(selectedRecord)">
            {{ selectedRecord.courseContent || '-' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="上课日期">
          {{ formatClassDate(selectedRecord.classDate) }}
        </a-descriptions-item>
        <a-descriptions-item label="时长">
          {{ formatHours(selectedRecord.durationHours) }}
        </a-descriptions-item>
        <a-descriptions-item label="课时费">
          {{ formatFee(selectedRecord.courseFee) }}
        </a-descriptions-item>
        <a-descriptions-item
          v-if="selectedRecord.classStatus === 'absent'"
          :label="$t('absence_notes')"
          :span="2"
        >
          {{ extractAbsenceRemark(selectedRecord.comments) || $t('not_filled') }}
        </a-descriptions-item>
        <a-descriptions-item label="学员评价" :span="2">
          <a-tag v-if="selectedRecord.studentRating" color="green">
            ⭐ {{ selectedRecord.studentRating }}
          </a-tag>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="审核状态" :span="2">
          <ClassRecordStatusTag :status="selectedRecord.status" />
        </a-descriptions-item>
        <a-descriptions-item
          v-if="selectedRecord.status === 'rejected'"
          :label="$t('rejection_reason_2')"
          :span="2"
        >
          {{ selectedRecord.reviewRemark || '（未填写驳回原因）' }}
        </a-descriptions-item>
        <a-descriptions-item v-else label="反馈摘要" :span="2">
          {{ selectedRecord.reviewRemark || $t('no_feedback_summary_yet') }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <AssistantClassReportFlowModal
      v-model:open="reportModalOpen"
      @submitted="handleReportSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { ClassRecordStatusTag, StatCard } from '@osg/shared/components'
import AssistantClassReportFlowModal from './AssistantClassReportFlowModal.vue'
import {
  getAssistantClassRecordList,
  getAssistantClassRecordStats,
  type AssistantClassRecordFilters,
  type AssistantClassRecordRow,
  type AssistantClassRecordStats,
} from '@osg/shared/api'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const STORAGE_KEY = 'osg-assistant-class-records-state-v1'

interface FilterState {
  keyword: string
  coachingType: string | undefined
  courseContent: string | undefined
  reporterRole: string | undefined
  classDateRange: string[] | null
}

interface TabDef {
  key: string
  label: string
  badgeColor: string
}

// ── State ──
const loading = ref(true)
const errorMessage = ref('')
const records = ref<AssistantClassRecordRow[]>([])
const stats = ref<AssistantClassRecordStats | null>(null)
const activeScope = ref<string>('mine')
const activeTab = ref<string>('all')
const detailVisible = ref(false)
const selectedRecord = ref<AssistantClassRecordRow | null>(null)
const reportModalOpen = ref(false)
const pagination = reactive({ current: 1, pageSize: 10 })
let latestLoadRequestId = 0

const filters = reactive<FilterState>({
  keyword: '',
  coachingType: undefined,
  courseContent: undefined,
  reporterRole: undefined,
  classDateRange: [],
})

// ── Tabs ──
const tabList: TabDef[] = [
  { key: 'all', label: t('all'), badgeColor: '#94A3B8' },
  { key: 'pending', label: t('pending_review'), badgeColor: '#F59E0B' },
  { key: 'approved', label: t('approved'), badgeColor: '#22C55E' },
  { key: 'rejected', label: t('rejected_3'), badgeColor: '#EF4444' },
]

// ── Select Options ──
// value 为数据库真实 raw key（osg_class_record.course_type），传给后端 SQL 直接过滤
const coachingTypeSelectOptions = [
  { value: 'job_coaching', label: t('position_coaching') },
  { value: 'mock_practice', label: t('mock_application') },
  { value: 'basic_course', label: t('foundation_course_2') },
]

// value 为数据库真实 raw key（osg_class_record.class_status），label 对齐弹窗 jobContentOptions / basicContentOptions
const courseContentSelectOptions = [
  { value: 'technical', label: t('technical') },
  { value: 'behavioral', label: t('behavioral_training') },
  { value: 'resume_update', label: t('resume_update') },
  { value: 'mock_interview', label: t('mock_interview_session') },
  { value: 'networking_midterm', label: t('interpersonal_skills_session') },
  { value: 'mock_midterm', label: t('mock_midterm_exam') },
  { value: 'case_prep', label: t('consulting_case_preparation') },
  { value: 'other', label: t('other') },
  { value: 'absent', label: t('absent_2') },
]

const reporterRoleSelectOptions = [
  { value: 'mentor', label: t('mentor') },
  { value: 'headteacher', label: t('head_teacher') },
  { value: 'assistant', label: t('teaching_assistant') },
]

// ── Flow steps fallback ──
const defaultFlowSteps = [t('course_delivery'), t('record_submission'), t('review_processing'), t('feedback_review')]

const flowSteps = computed(() => {
  const steps = stats.value?.flowSteps?.filter(Boolean) || []
  return steps.length ? steps : defaultFlowSteps
})

const scopeDescription = computed(() => {
  return activeScope.value === 'mine'
    ? t('view_my_submitted_course_records_review_')
    : t('view_course_records_review_status_and_fe')
})

// ── Table columns ──
const columns: TableColumnsType<AssistantClassRecordRow> = [
  { title: '记录ID', key: 'recordId', width: 110 },
  { title: t('student'), key: 'student', width: 140 },
  { title: t('submitter'), key: 'reporter', width: 140 },
  { title: t('coaching_content'), key: 'coachingType', width: 120 },
  { title: t('course_content'), key: 'courseContent', width: 160 },
  { title: t('course_date'), key: 'classDate', width: 120 },
  { title: t('duration'), key: 'durationHours', width: 80 },
  { title: t('session_fee'), key: 'courseFee', width: 100 },
  { title: t('student_feedback'), key: 'studentRating', width: 110 },
  { title: t('review_status'), key: 'status', width: 100 },
  { title: t('operation'), key: 'action', width: 110, fixed: 'right' },
]

// ── Stats value styles ──
const statColorMap: Record<string, string> = {
  all: '#1E293B',
  pending: '#F59E0B',
  approved: '#22C55E',
  settlement: '#1D4ED8',
}

// ── Course content color Map (key = Chinese label, 对齐弹窗 + 后端 toCourseContentLabel) ──
const contentTagStyleMap: Record<string, Record<string, string>> = {
  '技术的': { background: '#DBEAFE', color: '#1D4ED8', border: 'none' },
  '行为训练': { background: '#DBEAFE', color: '#1D4ED8', border: 'none' },
  '简历更新': { background: '#FEF3C7', color: '#92400E', border: 'none' },
  '模拟面试的课程': { background: '#DBEAFE', color: '#1D4ED8', border: 'none' },
  '人际关系的课程': { background: '#EDE9FE', color: '#5B21B6', border: 'none' },
  '模拟期中考试': { background: '#F59E0B', color: '#FFFFFF', border: 'none' },
  '咨询案例准备': { background: '#DBEAFE', color: '#1D4ED8', border: 'none' },
  '其他': { background: '#F1F5F9', color: '#475569', border: 'none' },
  '旷课': { background: '#FEE2E2', color: '#B91C1C', border: 'none' },
}

// ── Computed ──
const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const range = Array.isArray(filters.classDateRange) ? filters.classDateRange : []
  const [rangeStart, rangeEnd] = range

  return [...records.value]
    .filter((record) => {
      const matchesKeyword =
        !keyword ||
        [record.studentName, record.mentorName, record.recordCode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))

      const matchesCoaching =
        !filters.coachingType ||
        coachingTypeToRaw(record.coachingType) === filters.coachingType

      const matchesContent =
        !filters.courseContent ||
        courseContentToRaw(record.courseContent) === filters.courseContent

      const matchesReporter =
        !filters.reporterRole ||
        reporterRoleToRaw(record.reporterRole) === filters.reporterRole

      const recordDate = String(record.classDate || '').slice(0, 10)
      const matchesDateRange =
        (!rangeStart || recordDate >= rangeStart) &&
        (!rangeEnd || recordDate <= rangeEnd)

      const matchesTab =
        activeTab.value === 'all' || normalizeStatus(record.status) === activeTab.value

      return (
        matchesKeyword &&
        matchesCoaching &&
        matchesContent &&
        matchesReporter &&
        matchesDateRange &&
        matchesTab
      )
    })
    .sort((left, right) =>
      String(right.classDate || right.submittedAt || '').localeCompare(
        String(left.classDate || left.submittedAt || ''),
      ),
    )
})

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: filteredRecords.value.length,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50'],
}))

const summaryCards = computed(() => {
  const current = stats.value
  const fallback = records.value
  const totalCount = current?.totalCount ?? fallback.length
  const pendingCount =
    current?.pendingCount ??
    fallback.filter((record) => normalizeStatus(record.status) === 'pending').length
  const approvedCount =
    current?.approvedCount ??
    fallback.filter((record) => normalizeStatus(record.status) === 'approved').length

  return [
    { key: 'all', label: t('all_courses'), value: totalCount },
    { key: 'pending', label: t('pending_review'), value: pendingCount },
    { key: 'approved', label: t('approved'), value: approvedCount },
    {
      key: 'settlement',
      label: t('pending_settlement_amount'),
      value: formatFee(current?.pendingSettlementAmount || 0),
    },
  ]
})

// ── Normalize / Label ──
function normalizeStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase()
  if (
    normalized.includes('completed') ||
    normalized.includes('done') ||
    normalized.includes('finish') ||
    normalized.includes('approved') ||
    normalized.includes(t('approve'))
  ) {
    return 'approved'
  }
  if (normalized.includes('rejected') || normalized.includes(t('reject_2'))) {
    return 'rejected'
  }
  return 'pending'
}

function reporterRoleLabel(role?: string | null) {
  const normalized = String(role || '').trim().toLowerCase()
  if (!normalized) return '-'
  if (normalized.includes('assistant') || normalized.includes(t('teaching_assistant'))) return t('teaching_assistant')
  if (normalized.includes('headteacher') || normalized.includes(t('head_teacher'))) return t('head_teacher')
  if (normalized.includes('mentor') || normalized.includes(t('mentor'))) return t('mentor')
  return String(role)
}

function reporterRoleToRaw(role?: string | null) {
  const label = reporterRoleLabel(role)
  if (label === t('teaching_assistant')) return 'assistant'
  if (label === t('head_teacher')) return 'headteacher'
  if (label === t('mentor')) return 'mentor'
  return ''
}

function coachingTypeToRaw(coachingType?: string | null) {
  const normalized = String(coachingType || '').trim()
  if (normalized === t('position_coaching')) return 'job_coaching'
  if (normalized === t('mock_application')) return 'mock_practice'
  if (normalized === t('foundation_course_2')) return 'basic_course'
  return ''
}

function courseContentToRaw(courseContent?: string | null) {
  const normalized = String(courseContent || '').trim()
  const match = courseContentSelectOptions.find((option) => option.label === normalized)
  return match?.value || ''
}

// ── Tag color helpers ──
function coachingTypeColor(coachingType?: string | null) {
  const normalized = String(coachingType || '').trim()
  if (normalized === t('position_coaching')) return 'blue'
  if (normalized === t('mock_application')) return 'green'
  if (normalized === t('foundation_course_2')) return 'purple'
  return undefined
}

function contentTagStyle(record: AssistantClassRecordRow) {
  const label = String(record.courseContent || '').trim()
  return contentTagStyleMap[label] || {}
}

function rowClassName(record: AssistantClassRecordRow) {
  return normalizeStatus(record.status) === 'rejected' ? 'rejected-row' : ''
}

// tab badge 计数：基于 stats（全局统计）而非 records（当前 tab 过滤后的列表），
// 以保证切 tab 时 badge 保持稳定。stats 由 loadStats 在不传 tab 的前提下拉取。
function tabCount(tabKey: string) {
  const s = stats.value
  if (!s) return 0
  if (tabKey === 'all') return s.totalCount ?? 0
  if (tabKey === 'pending') return s.pendingCount ?? 0
  if (tabKey === 'approved') return s.approvedCount ?? 0
  if (tabKey === 'rejected') return s.rejectedCount ?? 0
  return 0
}

function scopeCount(scopeKey: string) {
  const s = stats.value
  if (!s) return 0
  if (scopeKey === 'mine') return s.mineCount ?? 0
  if (scopeKey === 'managed') return s.managedCount ?? 0
  return 0
}

// ── Formatters ──
function formatClassDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10)
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const date = String(parsed.getDate()).padStart(2, '0')
  const year = parsed.getFullYear()
  return `${month}/${date}/${year}`
}

function formatHours(value?: number | null) {
  if (value == null) return '--'
  return `${value}h`
}

function extractAbsenceRemark(comments?: string | null): string {
  if (!comments) return ''
  const match = comments.match(/旷课备注:\s*([^\n]*)/)
  return match ? match[1].trim() : ''
}

function formatFee(value?: string | number | null) {
  if (value == null || value === '') return '¥0'
  const amount = Number(value)
  if (Number.isNaN(amount)) return `¥${value}`
  return `¥${amount.toLocaleString('zh-CN')}`
}

// ── Handlers ──
function openDetail(record: AssistantClassRecordRow) {
  selectedRecord.value = record
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
}

function openReportModal() {
  reportModalOpen.value = true
}

async function handleReportSubmitted() {
  if (activeTab.value === 'approved' || activeTab.value === 'rejected') {
    activeTab.value = 'pending'
  }
  pagination.current = 1
  persistState()
  await loadRecords()
}

async function handleSearch() {
  pagination.current = 1
  persistState()
  await loadRecords()
}

async function resetFilters() {
  filters.keyword = ''
  filters.coachingType = undefined
  filters.courseContent = undefined
  filters.reporterRole = undefined
  filters.classDateRange = []
  pagination.current = 1
  persistState()
  await loadRecords()
}

async function handleTabChange() {
  pagination.current = 1
  persistState()
  await loadRecords()
}

async function handleScopeChange() {
  pagination.current = 1
  persistState()
  await loadRecords()
}

function handleTableChange(config: TablePaginationConfig) {
  pagination.current = config.current || 1
  pagination.pageSize = config.pageSize || 10
  persistState()
}

// ── Persistence ──
function persistState() {
  try {
    const payload = {
      filters: { ...filters },
      activeScope: activeScope.value,
      activeTab: activeTab.value,
      pagination: { ...pagination },
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore localStorage errors (quota / privacy mode)
  }
}

function restoreState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const payload = JSON.parse(raw)
    if (payload && typeof payload === 'object') {
      if (payload.filters) Object.assign(filters, payload.filters)
      // 归一化：a-select 的 v-model 必须是 undefined 才显示 placeholder（空串会被 AntDv 识别为“已选空值”）
      if (filters.coachingType === '') filters.coachingType = undefined
      if (filters.courseContent === '') filters.courseContent = undefined
      if (filters.reporterRole === '') filters.reporterRole = undefined
      if (payload.activeScope) activeScope.value = payload.activeScope
      if (payload.activeTab) activeTab.value = payload.activeTab
      if (payload.pagination) Object.assign(pagination, payload.pagination)
    }
  } catch {
    // ignore parse errors
  }
}

// ── Query param builder ──
// 前端 concept → 后端参数名（OsgAssistantClassRecordController.list 接收）：
//   coachingType  → courseType     (DB osg_class_record.course_type: job_coaching / mock_practice / basic_course)
//   courseContent → classStatus    (DB osg_class_record.class_status: technical / behavioral / resume_update / mock_interview / networking_midterm / mock_midterm / case_prep / other / absent)
//   reporterRole  → courseSource   (申报人角色 raw key。如 mentor / headteacher / assistant)
//   activeTab     → tab            (状态 Tab。'all' 时不传，非 all 传并驱动后端 SQL过滤)
function buildQueryParams(): AssistantClassRecordFilters {
  const range = Array.isArray(filters.classDateRange) ? filters.classDateRange : []
  const [rangeStart, rangeEnd] = range
  return {
    keyword: filters.keyword || undefined,
    courseType: filters.coachingType || undefined,
    classStatus: filters.courseContent || undefined,
    courseSource: filters.reporterRole || undefined,
    tab: activeTab.value !== 'all' ? activeTab.value : undefined,
    classDateStart: rangeStart || undefined,
    classDateEnd: rangeEnd || undefined,
    scope: activeScope.value as 'mine' | 'managed',
  }
}

// ── Data loading ──
async function loadRecords() {
  const requestId = ++latestLoadRequestId
  loading.value = true
  errorMessage.value = ''

  try {
    const params = buildQueryParams()
    // stats 应反映当前筛选下的全局 tab 分布，所以传给 loadStats 的 params 必须剥离 tab。
    // 其它筛选条件（keyword/courseType/classStatus/courseSource/classDate*）保留。
    const { tab: _ignoredTab, ...statsParams } = params
    void loadStats(statsParams, requestId)
    const listResponse = await getAssistantClassRecordList(params)

    if (requestId !== latestLoadRequestId) return
    records.value = listResponse.rows || []
  } catch (error: any) {
    if (requestId !== latestLoadRequestId) return
    errorMessage.value = error?.message || '课程记录暂时无法加载，请稍后重试。'
  } finally {
    if (requestId === latestLoadRequestId) loading.value = false
  }
}

async function loadStats(
  params: AssistantClassRecordFilters,
  requestId: number,
) {
  try {
    const statsResponse = await getAssistantClassRecordStats(params)
    if (requestId !== latestLoadRequestId) return
    stats.value = statsResponse
  } catch {
    if (requestId === latestLoadRequestId) stats.value = null
  }
}

onMounted(() => {
  restoreState()
  void loadRecords()
})
</script>

<style scoped lang="scss">
// ── 根容器：对齐助教端公共样式（styles/app.scss 定义 .osg-page flex column gap:16px） ──
.osg-page {
  display: block;
}

// ── Flow alert banner ──
.flow-alert {
  margin-bottom: 8px;

  &__title {
    font-weight: 600;
    color: #1d4ed8;
    margin-right: 4px;
  }
}

// ── Stats row（4 张统计卡） ──
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

// ── Filter card（对齐助教端公共约定） ──
.filter-card {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

// ── Error alert（对齐助教端公共约定） ──
.error-alert {
  margin-bottom: 16px;
}

// ── Table card（对齐助教端公共约定） ──
.table-card {
  margin-bottom: 16px;
}

.scope-tabs {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;

  :deep(.ant-tabs-nav) {
    padding: 0 16px;
    margin-bottom: 0;
  }
}

.status-tabs {
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}

.tab-badge {
  margin-left: 8px;
}

// ── Table cell 内部堆叠布局 ──
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name-text {
  color: #1f2937;
  font-weight: 700;
}

.muted-id {
  font-size: 12px;
  color: #94a3b8;
}

.fee-text {
  font-weight: 600;
  color: #1d4ed8;
}

// ── 驳回行高亮（红色点缀） ──
:deep(.rejected-row) {
  background-color: rgba(239, 68, 68, 0.04);

  &:hover > td {
    background-color: rgba(239, 68, 68, 0.08) !important;
  }
}

// ── 响应式 ──
@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>


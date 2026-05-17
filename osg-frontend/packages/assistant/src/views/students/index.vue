<template>
  <div class="osg-page">
    <PageHeader
      :title-zh="t('assistant.students.title')"
      title-en="Student List"
    />

    <a-card :bordered="false" class="filter-card">
      <div class="filters">
        <a-input
          id="assistant-students-keyword"
          v-model:value="filters.keyword"
          :placeholder="t('assistant.students.k6')"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <SearchOutlined style="color: #94A3B8" />
          </template>
        </a-input>
        <!-- TODO: 待后端支持「关系类型」字段后补充「学员类型」筛选（我教的学员 / 助教为我） -->
        <a-input
          v-model:value="filters.school"
          :placeholder="t('assistant.students.k7')"
          allow-clear
          style="width: 160px"
          @press-enter="handleSearch"
        />
        <a-select
          v-model:value="filters.majorDirection"
          :placeholder="t('assistant.students.k8')"
          allow-clear
          style="width: 140px"
          :options="majorDirectionSelectOptions"
        />
        <a-select
          v-model:value="filters.accountStatus"
          :placeholder="t('assistant.students.k9')"
          allow-clear
          style="width: 140px"
          :options="accountStatusOptions"
        />
        <a-button id="assistant-students-search" type="primary" @click="handleSearch">
          <template #icon><SearchOutlined /></template>
          {{ t('assistant.students.k1') }}
        </a-button>
        <a-button id="assistant-students-reset" type="text" @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          {{ t('assistant.students.k2') }}
        </a-button>
      </div>
    </a-card>

    <a-alert
      v-if="errorMessage"
      type="error"
      show-icon
      :message="t('assistant.students.k10')"
      :description="errorMessage"
      class="error-alert"
    >
      <template #action>
        <a-button size="small" type="link" @click="loadStudents">{{ t('assistant.students.k3') }}</a-button>
      </template>
    </a-alert>

    <a-card v-else :bordered="false" :body-style="{ padding: 0 }" class="table-card">
      <a-table
        :columns="columns"
        :data-source="students"
        :loading="loading"
        :pagination="tablePagination"
        :scroll="{ x: 'max-content' }"
        :locale="{ emptyText: t('assistant.students.k11') }"
        row-key="studentId"
        :row-attrs="() => ({ 'data-student-row': '' })"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'studentId'">
            <a-tag color="blue">#{{ record.studentId }}</a-tag>
          </template>
          <template v-else-if="column.key === 'studentName'">
            <strong class="name-text">{{ record.studentName || '-' }}</strong>
          </template>
          <template v-else-if="column.key === 'email'">
            <span class="email-cell">{{ record.email || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'leadMentorName'">
            <span>{{ formatMentor(record.leadMentorName) }}</span>
          </template>
          <template v-else-if="column.key === 'school'">
            <a-tooltip :title="record.school || '-'">
              <span class="ellipsis-cell">{{ record.school || '-' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'majorDirection'">
            <span class="direction-tag" :class="directionToneClass(record.majorDirection)">
              {{ record.majorDirection || '-' }}
            </span>
          </template>
          <template v-else-if="column.key === 'jobCoachingCount'">
            <span class="metric metric--delivery">{{ formatCount(record.jobCoachingCount) }}</span>
          </template>
          <template v-else-if="column.key === 'basicCourseCount'">
            <span class="metric metric--interview">{{ formatCount(record.basicCourseCount) }}</span>
          </template>
          <template v-else-if="column.key === 'mockInterviewCount'">
            <span class="metric metric--offer">{{ formatCount(record.mockInterviewCount) }}</span>
          </template>
          <template v-else-if="column.key === 'remainingHours'">
            <RemainingHoursCell :hours="record.remainingHours" />
          </template>
          <template v-else-if="column.key === 'targetPosition'">
            <span>{{ record.targetPosition || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'contractStatus'">
            <div class="status-stack">
              <span class="status-tag" :class="contractStatusToneClass(record.contractStatus, record.isBlacklisted)">
                {{ formatContractStatus(record.contractStatus, record.isBlacklisted) }}
              </span>
              <span v-if="record.pendingReview" class="status-tag status-tag--warning">{{ t('assistant.students.k4') }}</span>
              <span v-if="formatReminder(record) !== t('assistant.students.k38')" class="status-hint">
                {{ formatReminder(record) }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'accountStatus'">
            <StudentStatusTag :account-status="record.accountStatus" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="handleViewJob(record)">{{ t('assistant.students.k5') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { StudentStatusTag, RemainingHoursCell } from '@osg/shared/components'
import {
  getAssistantStudentList,
  type AssistantStudentListItem,
} from '@osg/shared/api'

const { t } = useI18n()

const router = useRouter()

const handleViewJob = (row: AssistantStudentListItem) => {
  if (!row.studentName || row.studentName === '-') {
    return
  }
  void router.push({
    path: '/career/job-overview',
    query: { studentName: row.studentName },
  })
}

interface StudentFilterState {
  keyword: string
  school: string
  majorDirection: string
  accountStatus: string
  page: number
}

const STORAGE_KEY = 'assistant-student-list-state'

const loading = ref(true)
const errorMessage = ref('')
const students = ref<AssistantStudentListItem[]>([])
const total = ref(0)

const filters = reactive<StudentFilterState>({
  keyword: '',
  school: '',
  majorDirection: '',
  accountStatus: '',
  page: 1,
})

const pagination = reactive({
  current: 1,
  pageSize: 8,
})

const majorDirectionSelectOptions = computed(() => {
  const dynamic = Array.from(
    new Set(students.value.map((student) => student.majorDirection).filter(Boolean)),
  ) as string[]
  return dynamic.map((direction) => ({ value: direction, label: direction }))
})

const accountStatusOptions = [
  { value: '0', label: t('assistant.students.k12') },
  { value: '1', label: t('assistant.students.k13') },
  { value: '2', label: t('assistant.students.k14') },
  { value: '3', label: t('assistant.students.k15') },
]

const columns = [
  { title: 'ID', key: 'studentId', dataIndex: 'studentId', width: 96 },
  { title: t('assistant.students.k16'), key: 'studentName', dataIndex: 'studentName', width: 140 },
  { title: t('assistant.students.k17'), key: 'email', dataIndex: 'email', width: 200, ellipsis: true },
  { title: t('assistant.students.k18'), key: 'leadMentorName', dataIndex: 'leadMentorName', width: 120 },
  { title: t('assistant.students.k7'), key: 'school', dataIndex: 'school', width: 160, ellipsis: true },
  { title: t('assistant.students.k8'), key: 'majorDirection', dataIndex: 'majorDirection', width: 120 },
  { title: t('assistant.students.k19'), key: 'jobCoachingCount', dataIndex: 'jobCoachingCount', width: 100, align: 'center' as const },
  { title: t('assistant.students.k20'), key: 'basicCourseCount', dataIndex: 'basicCourseCount', width: 90, align: 'center' as const },
  { title: t('assistant.students.k21'), key: 'mockInterviewCount', dataIndex: 'mockInterviewCount', width: 100, align: 'center' as const },
  { title: t('assistant.students.k22'), key: 'remainingHours', dataIndex: 'remainingHours', width: 110, align: 'center' as const },
  { title: t('assistant.students.k23'), key: 'targetPosition', dataIndex: 'targetPosition', width: 140, ellipsis: true },
  { title: t('assistant.students.k24'), key: 'contractStatus', dataIndex: 'contractStatus', width: 160 },
  { title: t('assistant.students.k9'), key: 'accountStatus', dataIndex: 'accountStatus', width: 110 },
  { title: t('assistant.students.k25'), key: 'action', width: 110, fixed: 'right' as const },
]

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: total.value,
  showSizeChanger: false,
  showTotal: (count: number) => t('assistant.students.k39', { n: count }),
}))

function normalizePersistedState(value: unknown): StudentFilterState | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<StudentFilterState>
  const page = Number(raw.page)

  return {
    keyword: typeof raw.keyword === 'string' ? raw.keyword : '',
    school: typeof raw.school === 'string' ? raw.school : '',
    majorDirection: typeof raw.majorDirection === 'string' ? raw.majorDirection : '',
    accountStatus: typeof raw.accountStatus === 'string' ? raw.accountStatus : '',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  }
}

function readPersistedState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return normalizePersistedState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return null
  }
}

function persistState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      keyword: filters.keyword,
      school: filters.school,
      majorDirection: filters.majorDirection,
      accountStatus: filters.accountStatus,
      page: pagination.current,
    }),
  )
}

function applyPersistedState() {
  const persisted = readPersistedState()
  if (!persisted) {
    return
  }

  filters.keyword = persisted.keyword
  filters.school = persisted.school
  filters.majorDirection = persisted.majorDirection
  filters.accountStatus = persisted.accountStatus
  filters.page = persisted.page
  pagination.current = persisted.page
}

function formatCount(value?: number) {
  return Number(value ?? 0)
}

function formatMentor(value?: string) {
  return value && value.trim() ? value : t('assistant.students.fallbackMentor')
}

function formatContractStatus(value?: string, isBlacklisted?: boolean) {
  if (isBlacklisted || value === 'blacklist') {
    return t('assistant.students.k26')
  }
  if (value === 'expiring') {
    return t('assistant.students.k27')
  }
  if (value === 'expired') {
    return t('assistant.students.k28')
  }
  if (value === 'cancelled') {
    return t('assistant.students.k29')
  }
  if (value === 'pending_review') {
    return t('assistant.students.k4')
  }
  return t('assistant.students.k30')
}

function contractStatusToneClass(value?: string, isBlacklisted?: boolean) {
  if (isBlacklisted || value === 'blacklist' || value === 'expired' || value === 'cancelled') {
    return 'status-tag--danger'
  }
  if (value === 'expiring' || value === 'pending_review') {
    return 'status-tag--warning'
  }
  return 'status-tag--default'
}

function directionToneClass(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('consult')) {
    return 'direction-tag--consulting'
  }
  if (normalized.includes('tech')) {
    return 'direction-tag--tech'
  }
  if (normalized.includes('quant')) {
    return 'direction-tag--quant'
  }
  return 'direction-tag--finance'
}

function isLowHours(student: AssistantStudentListItem) {
  const remainingHours = typeof student.remainingHours === 'number' ? student.remainingHours : 0
  return remainingHours <= 5
}

function isContractExpiring(student: AssistantStudentListItem) {
  return student.contractStatus === 'expiring' || String(student.reminder || '').includes(t('assistant.students.k31'))
}

function formatReminder(student: AssistantStudentListItem) {
  if (student.reminder && student.reminder !== '-') {
    return student.reminder
  }
  if (student.pendingReview) {
    return t('assistant.students.k32')
  }
  if (student.isBlacklisted) {
    return t('assistant.students.k33')
  }
  if (isLowHours(student)) {
    return t('assistant.students.k34')
  }
  if (isContractExpiring(student)) {
    return t('assistant.students.k35')
  }
  return t('assistant.students.k36')
}

async function loadStudents() {
  loading.value = true
  errorMessage.value = ''
  persistState()

  try {
    const response = await getAssistantStudentList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      studentName: filters.keyword || undefined,
      school: filters.school || undefined,
      majorDirection: filters.majorDirection || undefined,
      accountStatus: filters.accountStatus || undefined,
    })

    const nextTotal = Number(response.total || 0)
    const nextPages = Math.max(1, Math.ceil(nextTotal / pagination.pageSize))

    if (pagination.current > nextPages) {
      pagination.current = nextPages
      persistState()
      await loadStudents()
      return
    }

    students.value = response.rows || []
    total.value = nextTotal
    persistState()
  } catch (error: any) {
    errorMessage.value = error?.message || t('assistant.students.k37')
  } finally {
    loading.value = false
  }
}

async function handleSearch() {
  pagination.current = 1
  await loadStudents()
}

async function resetFilters() {
  filters.keyword = ''
  filters.school = ''
  filters.majorDirection = ''
  filters.accountStatus = ''
  pagination.current = 1
  await loadStudents()
}

async function handleTableChange(config: TablePaginationConfig) {
  const nextPage = Number(config.current || 1)
  const nextSize = Number(config.pageSize || pagination.pageSize)
  if (nextPage === pagination.current && nextSize === pagination.pageSize) {
    return
  }
  pagination.current = nextPage
  pagination.pageSize = nextSize
  await loadStudents()
}

onMounted(() => {
  applyPersistedState()
  void loadStudents()
})
</script>

<style scoped lang="scss">
.osg-page {
  display: block;
}

.filter-card {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.error-alert {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.name-text {
  color: var(--primary, #7399c6);
  font-weight: 700;
}

.email-cell {
  font-size: 12px;
  color: #475569;
}

.ellipsis-cell {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.direction-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.direction-tag--finance,
.direction-tag--consulting {
  background: #dbeafe;
  color: #1d4ed8;
}

.direction-tag--tech {
  background: #fef3c7;
  color: #d48b22;
}

.direction-tag--quant {
  background: #e0e7ff;
  color: #4338ca;
}

.metric {
  font-weight: 700;
}

.metric--delivery {
  color: #0284c7;
}

.metric--interview {
  color: #f59e0b;
}

.metric--offer {
  color: #22c55e;
}

.remaining-hours {
  font-weight: 700;
}

.remaining-hours--success {
  color: #22c55e;
}

.remaining-hours--warning {
  color: var(--danger, #ef4444);
}

.remaining-hours--muted {
  color: var(--muted, #9ca3af);
}

.status-tag--active {
  background: #d1fae5;
  color: #16a34a;
}

.status-tag--frozen {
  background: #dbeafe;
  color: #5f82bb;
}

.status-tag--muted,
.status-tag--default {
  background: #f3f4f6;
  color: #6b7280;
}

.status-tag--warning {
  background: #fef3c7;
  color: #d48b22;
}

.status-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.status-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted, #9ca3af);
}
</style>

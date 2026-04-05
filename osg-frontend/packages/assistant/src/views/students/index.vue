<template>
  <div id="page-student-list" class="student-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员列表
          <span class="page-title-en">Student List</span>
        </h1>
        <p class="page-sub">
          查看助教负责学员的基础信息、关系状态和求职进度，快速定位需要优先跟进的学员。
        </p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">学员总览</span>
        <span class="readonly-pill">筛选已保存</span>
      </div>
    </div>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">当前页学员</span>
        <strong class="summary-card__value">{{ students.length }}</strong>
        <span class="summary-card__hint">当前筛选与分页结果中的学员数量</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">待跟进提醒</span>
        <strong class="summary-card__value summary-card__value--warning">{{ attentionCount }}</strong>
        <span class="summary-card__hint">待审核、低课时或合同临期的学员</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">账号正常</span>
        <strong class="summary-card__value summary-card__value--accent">{{ activeCount }}</strong>
        <span class="summary-card__hint">当前页仍保持可用状态的账号</span>
      </article>
      <article class="summary-card">
        <span class="summary-card__label">待审核</span>
        <strong class="summary-card__value summary-card__value--success">{{ pendingReviewCount }}</strong>
        <span class="summary-card__hint">资料或状态仍需后续确认的学员</span>
      </article>
    </section>

    <section class="toolbar-card">
      <div class="toolbar-card__row">
        <label class="toolbar-field">
          <span class="toolbar-field__label">学员搜索</span>
          <input
            id="assistant-students-keyword"
            v-model.trim="filters.keyword"
            class="form-input"
            type="text"
            placeholder="搜索学员姓名或邮箱"
            @keydown.enter.prevent="handleSearch"
          />
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">学校</span>
          <select v-model="filters.school" class="form-select">
            <option value="">全部学校</option>
            <option v-for="school in schoolOptions" :key="school" :value="school">
              {{ school }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">方向</span>
          <select v-model="filters.majorDirection" class="form-select">
            <option value="">全部方向</option>
            <option v-for="direction in majorDirectionOptions" :key="direction" :value="direction">
              {{ direction }}
            </option>
          </select>
        </label>

        <label class="toolbar-field">
          <span class="toolbar-field__label">账号状态</span>
          <select v-model="filters.accountStatus" class="form-select">
            <option value="">全部状态</option>
            <option value="0">正常</option>
            <option value="1">冻结</option>
            <option value="2">已结束</option>
            <option value="3">退款</option>
          </select>
        </label>
      </div>

      <div class="toolbar-card__meta">
        <span class="toolbar-chip">状态提醒</span>
        <span class="toolbar-chip">账号状态</span>
        <span class="toolbar-chip">学习进度</span>
        <button id="assistant-students-search" type="button" class="primary-button" @click="handleSearch">
          应用筛选
        </button>
        <button id="assistant-students-reset" type="button" class="ghost-button" @click="resetFilters">
          重置
        </button>
      </div>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>学员列表加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadStudents">重新加载</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>学员列表加载中</h2>
      <p>正在读取学员清单、筛选状态和提醒信息，请稍候。</p>
    </section>

    <section v-else-if="students.length === 0" class="state-card">
      <h2>当前筛选下暂无学员</h2>
      <p>可以清空关键词或筛选条件，再次查看完整学员列表。</p>
    </section>

    <section v-else class="table-card">
      <table class="data-table student-table">
        <thead>
          <tr>
            <th>学员</th>
            <th>班主任 / 学校</th>
            <th>求职方向</th>
            <th>课程进度</th>
            <th>状态区</th>
            <th>跟进说明</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="student in students"
            :key="student.studentId"
            data-student-row
            :class="rowToneClass(student)"
          >
            <td>
              <div class="student-primary">{{ student.studentName || '未命名学员' }}</div>
              <div class="table-muted">{{ student.email || '-' }}</div>
              <div class="table-meta">ID: {{ student.studentId }}</div>
            </td>
            <td>
              <div class="student-primary">{{ formatMentor(student.leadMentorName) }}</div>
              <div class="table-muted">{{ student.school || '未填写学校' }}</div>
            </td>
            <td>
              <span class="direction-pill" :class="directionToneClass(student.majorDirection)">
                {{ student.majorDirection || '未标注方向' }}
              </span>
              <div class="table-muted">{{ student.targetPosition || '未填写目标岗位' }}</div>
            </td>
            <td>
              <div class="metric-grid">
                <div class="metric-cell">
                  <span class="metric-label">求职辅导</span>
                  <strong>{{ Number(student.jobCoachingCount || 0) }}</strong>
                </div>
                <div class="metric-cell">
                  <span class="metric-label">基础课</span>
                  <strong>{{ Number(student.basicCourseCount || 0) }}</strong>
                </div>
                <div class="metric-cell">
                  <span class="metric-label">模拟应聘</span>
                  <strong>{{ Number(student.mockInterviewCount || 0) }}</strong>
                </div>
                <div class="metric-cell metric-cell--accent">
                  <span class="metric-label">剩余课时</span>
                  <strong>{{ formatHours(student.remainingHours) }}</strong>
                </div>
              </div>
            </td>
            <td class="student-status">
              <div class="status-stack">
                <span class="status-chip" :class="accountStatusToneClass(student.accountStatus)">
                  {{ formatAccountStatus(student.accountStatus) }}
                </span>
                <span class="status-chip" :class="contractStatusToneClass(student.contractStatus, student.isBlacklisted)">
                  {{ formatContractStatus(student.contractStatus, student.isBlacklisted) }}
                </span>
                <span class="status-chip status-chip--info">助教跟进</span>
                <span v-if="student.pendingReview" class="status-chip status-chip--warning">待审核</span>
              </div>
              <div class="table-muted">{{ formatReminder(student) }}</div>
            </td>
            <td>
              <div class="followup-note" :class="followupToneClass(student)">
                <div>{{ followupNote(student) }}</div>
                <button
                  type="button"
                  class="ghost-button ghost-button--inline followup-action"
                  data-action="view-job-overview"
                  @click="focusJobOverview(student)"
                >
                  查看求职
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer">
        <span class="table-footer__total">共 {{ total }} 条记录</span>
        <div class="table-footer__controls">
          <button type="button" class="ghost-button ghost-button--inline" :disabled="!hasPrev" @click="goPrev">
            上一页
          </button>
          <span class="page-indicator">{{ pagination.current }} / {{ totalPages }}</span>
          <button type="button" class="ghost-button ghost-button--inline" :disabled="!hasNext" @click="goNext">
            下一页
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAssistantStudentList,
  type AssistantStudentListItem,
} from '@osg/shared/api'

interface StudentFilterState {
  keyword: string
  school: string
  majorDirection: string
  accountStatus: string
  page: number
}

const STORAGE_KEY = 'assistant-student-list-state'

const router = useRouter()
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

const schoolOptions = computed(() =>
  Array.from(new Set(students.value.map((student) => student.school).filter(Boolean))) as string[],
)
const majorDirectionOptions = computed(() =>
  Array.from(new Set(students.value.map((student) => student.majorDirection).filter(Boolean))) as string[],
)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))
const hasPrev = computed(() => pagination.current > 1)
const hasNext = computed(() => pagination.current < totalPages.value)
const attentionCount = computed(() => students.value.filter((student) => needsAttention(student)).length)
const activeCount = computed(
  () => students.value.filter((student) => formatAccountStatus(student.accountStatus) === '正常').length,
)
const pendingReviewCount = computed(() => students.value.filter((student) => student.pendingReview).length)

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
  if (typeof window === 'undefined' || !window.localStorage?.getItem) {
    return null
  }

  try {
    return normalizePersistedState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return null
  }
}

function persistState() {
  if (typeof window === 'undefined' || !window.localStorage?.setItem) {
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

function formatHours(value?: number) {
  const safeValue = Number(value ?? 0)
  return Number.isInteger(safeValue) ? `${safeValue}h` : `${safeValue.toFixed(1)}h`
}

function formatMentor(value?: string) {
  return value && value.trim() ? value : '待补充班主任'
}

function formatAccountStatus(value?: string) {
  if (value === '1') return '冻结'
  if (value === '2') return '已结束'
  if (value === '3') return '退款'
  return '正常'
}

function accountStatusToneClass(value?: string) {
  if (value === '1') return 'status-chip--info'
  if (value === '2' || value === '3') return 'status-chip--danger'
  return 'status-chip--success'
}

function formatContractStatus(value?: string, isBlacklisted?: boolean) {
  if (isBlacklisted || value === 'blacklist') return '黑名单'
  if (value === 'expiring') return '即将到期'
  if (value === 'expired') return '已到期'
  if (value === 'cancelled') return '已终止'
  if (value === 'pending_review') return '待审核'
  return '正常服务'
}

function contractStatusToneClass(value?: string, isBlacklisted?: boolean) {
  if (isBlacklisted || value === 'blacklist' || value === 'expired' || value === 'cancelled') {
    return 'status-chip--danger'
  }
  if (value === 'expiring' || value === 'pending_review') {
    return 'status-chip--warning'
  }
  return 'status-chip--default'
}

function directionToneClass(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('consult')) return 'direction-pill--info'
  if (normalized.includes('tech')) return 'direction-pill--warning'
  if (normalized.includes('quant')) return 'direction-pill--accent'
  return 'direction-pill--default'
}

function isLowHours(student: AssistantStudentListItem) {
  const remainingHours = Number(student.remainingHours ?? 0)
  return remainingHours <= 5
}

function isContractExpiring(student: AssistantStudentListItem) {
  return student.contractStatus === 'expiring' || String(student.reminder || '').includes('到期')
}

function needsAttention(student: AssistantStudentListItem) {
  return Boolean(student.pendingReview || student.isBlacklisted || isLowHours(student) || isContractExpiring(student))
}

function formatReminder(student: AssistantStudentListItem) {
  if (student.reminder && student.reminder !== '-') return student.reminder
  if (student.pendingReview) return '资料变更待审核'
  if (student.isBlacklisted) return '当前学员已被纳入黑名单'
  if (isLowHours(student)) return '剩余课时偏低，建议优先跟进'
  if (isContractExpiring(student)) return '合同即将到期'
  return '当前暂无额外提醒'
}

function followupNote(student: AssistantStudentListItem) {
  if (student.pendingReview) return '优先确认学员资料或状态变更。'
  if (student.isBlacklisted) return '仅保留状态查看，后续由业务侧处理黑名单流程。'
  if (isLowHours(student)) return '建议结合课程安排与续费状态尽快跟进。'
  if (isContractExpiring(student)) return '合同临期，建议同步确认服务与求职节奏。'
  return '当前状态稳定，可继续按既有节奏跟进。'
}

function followupToneClass(student: AssistantStudentListItem) {
  if (student.pendingReview || student.isBlacklisted) return 'followup-note--danger'
  if (isLowHours(student) || isContractExpiring(student)) return 'followup-note--warning'
  return 'followup-note--default'
}

function rowToneClass(student: AssistantStudentListItem) {
  if (student.pendingReview) return 'student-row--pending'
  if (student.isBlacklisted) return 'student-row--danger'
  if (isLowHours(student)) return 'student-row--warning'
  return ''
}

function focusJobOverview(student: AssistantStudentListItem) {
  void router.push({
    path: '/career/job-overview',
    query: student.studentName ? { studentName: student.studentName } : {},
  })
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
    errorMessage.value = error?.message || '学员列表暂时无法加载，请稍后重试。'
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

async function goPrev() {
  if (!hasPrev.value) return
  pagination.current -= 1
  await loadStudents()
}

async function goNext() {
  if (!hasNext.value) return
  pagination.current += 1
  await loadStudents()
}

onMounted(() => {
  applyPersistedState()
  void loadStudents()
})
</script>

<style scoped lang="scss">
.student-list-page {
  color: var(--text);
}

.page-header,
.page-header__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.page-title-en {
  color: var(--muted);
  font-size: 15px;
  font-weight: 500;
}

.page-sub {
  margin: 8px 0 0;
  color: var(--text2);
  line-height: 1.7;
}

.page-header__actions {
  align-items: center;
}

.status-pill,
.readonly-pill,
.toolbar-chip,
.status-chip,
.direction-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill {
  padding: 8px 14px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
}

.readonly-pill {
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--text2);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.toolbar-card,
.table-card,
.state-card {
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--card-shadow);
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.summary-card__label,
.summary-card__hint,
.toolbar-field__label,
.table-muted,
.table-meta,
.metric-label {
  color: var(--text2);
}

.summary-card__label {
  font-size: 13px;
  font-weight: 600;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--warning {
  color: #b45309;
}

.summary-card__value--accent {
  color: var(--primary);
}

.summary-card__value--success {
  color: #15803d;
}

.summary-card__hint {
  font-size: 12px;
}

.toolbar-card {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px;
}

.toolbar-card__row {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) repeat(3, minmax(160px, 1fr));
  gap: 14px;
}

.toolbar-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-field {
  display: grid;
  gap: 8px;
}

.toolbar-field__label {
  font-size: 12px;
  font-weight: 700;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 0 14px;
  font-size: 14px;
}

.toolbar-chip {
  padding: 8px 12px;
  background: var(--bg);
  color: var(--text2);
}

.primary-button,
.ghost-button {
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.primary-button {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
}

.ghost-button {
  background: transparent;
  color: var(--primary);
}

.ghost-button--inline {
  padding: 0;
}

.ghost-button:disabled,
.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.followup-action {
  margin-top: 10px;
}

.table-card {
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--border);
  padding: 16px 14px;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  color: var(--text2);
  font-size: 12px;
  font-weight: 700;
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.student-primary {
  font-weight: 700;
}

.table-muted,
.table-meta {
  margin-top: 4px;
  font-size: 12px;
}

.metric-grid,
.status-stack {
  display: grid;
}

.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-cell {
  display: grid;
  gap: 4px;
  border-radius: 14px;
  background: var(--bg);
  padding: 10px 12px;
}

.metric-cell--accent strong {
  color: var(--primary);
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
}

.metric-cell strong {
  font-size: 16px;
}

.status-stack {
  gap: 8px;
}

.status-chip,
.direction-pill {
  padding: 6px 10px;
  width: fit-content;
}

.status-chip--success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.status-chip--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-chip--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.status-chip--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.status-chip--default,
.direction-pill--default {
  background: var(--bg);
  color: var(--text2);
}

.direction-pill--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.direction-pill--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.direction-pill--accent {
  background: rgba(99, 102, 241, 0.14);
  color: #4338ca;
}

.followup-note {
  border-radius: 16px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
}

.followup-note--default {
  background: var(--bg);
  color: var(--text2);
}

.followup-note--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.followup-note--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #991b1b;
}

.student-row--pending {
  background: linear-gradient(90deg, rgba(254, 240, 138, 0.2), rgba(254, 249, 195, 0.1));
}

.student-row--warning {
  background: rgba(245, 158, 11, 0.06);
}

.student-row--danger {
  background: rgba(239, 68, 68, 0.06);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--border);
  padding: 18px 20px;
}

.table-footer__total,
.page-indicator {
  color: var(--text2);
  font-size: 13px;
}

.table-footer__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.state-card {
  display: grid;
  gap: 8px;
  padding: 28px;
}

.state-card--error {
  border: 1px solid rgba(239, 68, 68, 0.14);
  background: #fff7f7;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-card__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .page-header,
  .page-header__actions,
  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .toolbar-card__row,
  .metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .table-card {
    overflow: auto;
  }

  .data-table {
    min-width: 960px;
  }
}
</style>

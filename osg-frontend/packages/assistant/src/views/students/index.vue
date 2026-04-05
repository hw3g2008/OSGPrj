<template>
  <div id="page-student-list" class="page-student-list">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          学员列表
          <span class="page-title-en">Student List</span>
        </h1>
        <p class="page-sub">查看我教的学员和助教为我的全部学员信息、服务状态与课程进度</p>
      </div>
    </div>

    <section class="filters">
      <input
        id="assistant-students-keyword"
        v-model.trim="filters.keyword"
        class="form-input"
        type="text"
        placeholder="搜索姓名"
        @keydown.enter.prevent="handleSearch"
      />
      <select v-model="filters.school" class="form-select">
        <option value="">学校</option>
        <option v-for="school in schoolOptions" :key="school" :value="school">
          {{ school }}
        </option>
      </select>
      <select v-model="filters.majorDirection" class="form-select">
        <option value="">主攻方向</option>
        <option v-for="direction in majorDirectionOptions" :key="direction" :value="direction">
          {{ direction }}
        </option>
      </select>
      <select v-model="filters.accountStatus" class="form-select">
        <option value="">账号状态</option>
        <option value="0">正常</option>
        <option value="1">冻结</option>
        <option value="2">已结束</option>
        <option value="3">退款</option>
      </select>
      <button id="assistant-students-search" type="button" class="btn" @click="handleSearch">
        搜索
      </button>
      <button id="assistant-students-reset" type="button" class="btn btn-text" @click="resetFilters">
        重置
      </button>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>学员列表加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-text" @click="loadStudents">重新加载</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>学员列表加载中</h2>
      <p>正在读取学员清单与筛选结果，请稍候。</p>
    </section>

    <section v-else class="card">
      <div class="card-body">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>英文姓名</th>
                <th>邮箱</th>
                <th>班主任</th>
                <th>学校</th>
                <th>主攻方向</th>
                <th>求职目标</th>
                <th>求职辅导</th>
                <th>基础课</th>
                <th>模拟应聘</th>
                <th>剩余课时</th>
                <th>账号状态</th>
                <th>服务状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in students" :key="student.studentId" data-student-row>
                <td>{{ student.studentId }}</td>
                <td class="name-cell">
                  <strong class="name-text">{{ student.studentName || '-' }}</strong>
                </td>
                <td class="email-cell">{{ student.email || '-' }}</td>
                <td>{{ formatMentor(student.leadMentorName) }}</td>
                <td>{{ student.school || '-' }}</td>
                <td>
                  <span class="direction-tag" :class="directionToneClass(student.majorDirection)">
                    {{ student.majorDirection || '-' }}
                  </span>
                </td>
                <td>{{ student.targetPosition || '-' }}</td>
                <td class="metric metric--delivery">{{ formatCount(student.jobCoachingCount) }}</td>
                <td class="metric metric--interview">{{ formatCount(student.basicCourseCount) }}</td>
                <td class="metric metric--offer">{{ formatCount(student.mockInterviewCount) }}</td>
                <td class="remaining-hours" :class="remainingHoursToneClass(student.remainingHours)">
                  {{ formatHours(student.remainingHours) }}
                </td>
                <td>
                  <span class="status-tag" :class="accountStatusToneClass(student.accountStatus)">
                    {{ formatAccountStatus(student.accountStatus) }}
                  </span>
                </td>
                <td>
                  <div class="status-stack">
                    <span class="status-tag" :class="contractStatusToneClass(student.contractStatus, student.isBlacklisted)">
                      {{ formatContractStatus(student.contractStatus, student.isBlacklisted) }}
                    </span>
                    <span v-if="student.pendingReview" class="status-tag status-tag--warning">待审核</span>
                    <span v-if="formatReminder(student) !== '当前暂无额外提醒'" class="status-hint">
                      {{ formatReminder(student) }}
                    </span>
                  </div>
                </td>
                <td>
                  <button type="button" class="btn btn-link">查看求职</button>
                </td>
              </tr>
              <tr v-if="!students.length">
                <td colspan="14" class="empty-state">暂无可查看学员</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div v-if="!loading && !errorMessage" class="page-footer">
      <span class="page-total">共 {{ total }} 条记录</span>
      <div class="pagination">
        <button type="button" class="pager-btn" :disabled="!hasPrev" @click="goPrev">上一页</button>
        <button type="button" class="pager-btn pager-btn--active">{{ pagination.current }}</button>
        <button type="button" class="pager-btn" :disabled="!hasNext" @click="goNext">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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

function formatHours(value?: number) {
  const safeValue = Number(value ?? 0)
  return Number.isInteger(safeValue) ? `${safeValue}h` : `${safeValue.toFixed(1)}h`
}

function formatMentor(value?: string) {
  return value && value.trim() ? value : '待补充班主任'
}

function formatAccountStatus(value?: string) {
  if (value === '1') {
    return '冻结'
  }
  if (value === '2') {
    return '已结束'
  }
  if (value === '3') {
    return '退款'
  }
  return '正常'
}

function accountStatusToneClass(value?: string) {
  if (value === '1') {
    return 'status-tag--frozen'
  }
  if (value === '2' || value === '3') {
    return 'status-tag--muted'
  }
  return 'status-tag--active'
}

function formatContractStatus(value?: string, isBlacklisted?: boolean) {
  if (isBlacklisted || value === 'blacklist') {
    return '黑名单'
  }
  if (value === 'expiring') {
    return '即将到期'
  }
  if (value === 'expired') {
    return '已到期'
  }
  if (value === 'cancelled') {
    return '已终止'
  }
  if (value === 'pending_review') {
    return '待审核'
  }
  return '正常服务'
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

function remainingHoursToneClass(value?: number) {
  const safeValue = Number(value ?? 0)
  if (safeValue >= 8) {
    return 'remaining-hours--success'
  }
  if (safeValue > 0) {
    return 'remaining-hours--warning'
  }
  return 'remaining-hours--muted'
}

function isLowHours(student: AssistantStudentListItem) {
  const remainingHours = typeof student.remainingHours === 'number' ? student.remainingHours : 0
  return remainingHours <= 5
}

function isContractExpiring(student: AssistantStudentListItem) {
  return student.contractStatus === 'expiring' || String(student.reminder || '').includes('到期')
}

function formatReminder(student: AssistantStudentListItem) {
  if (student.reminder && student.reminder !== '-') {
    return student.reminder
  }
  if (student.pendingReview) {
    return '资料变更待审核'
  }
  if (student.isBlacklisted) {
    return '当前学员已被纳入黑名单'
  }
  if (isLowHours(student)) {
    return '剩余课时偏低，建议优先跟进'
  }
  if (isContractExpiring(student)) {
    return '合同即将到期'
  }
  return '当前暂无额外提醒'
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
  if (!hasPrev.value) {
    return
  }
  pagination.current -= 1
  await loadStudents()
}

async function goNext() {
  if (!hasNext.value) {
    return
  }
  pagination.current += 1
  await loadStudents()
}

onMounted(() => {
  applyPersistedState()
  void loadStudents()
})
</script>

<style scoped lang="scss">
.page-student-list {
  display: block;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin-top: 8px;
  color: var(--text2);
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.form-input,
.form-select {
  height: 46px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
}

.form-input {
  width: 160px;
  padding: 0 14px;
}

.form-select {
  min-width: 128px;
  padding: 0 36px 0 12px;
  appearance: none;
  background: #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")
    no-repeat right 12px center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  background: #fff;
  color: #5b7fab;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
  cursor: pointer;
}

.btn-text {
  padding: 10px 12px;
  color: #7399c6;
  box-shadow: none;
  background: transparent;
}

.btn-link {
  height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7399c6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
}

.btn:disabled {
  cursor: not-allowed;
}

.card,
.state-card {
  margin-bottom: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.card-body {
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  min-width: 1400px;
}

.table th,
.table td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  background: #f8fbff;
  white-space: nowrap;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.name-cell {
  min-width: 116px;
}

.name-text {
  color: #7399c6;
}

.email-cell {
  min-width: 160px;
  font-size: 12px;
  color: #475569;
}

.direction-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
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
  color: var(--danger);
}

.remaining-hours--muted {
  color: var(--muted);
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
  color: var(--muted);
}

.empty-state {
  color: var(--muted);
  text-align: center;
}

.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-total {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pager-btn {
  min-width: 48px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.pager-btn:disabled {
  opacity: 1;
}

.pager-btn--active {
  min-width: 36px;
  background: #7399c6;
  border-color: #7399c6;
  color: #fff;
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

@media (max-width: 960px) {
  .filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-input,
  .form-select,
  .btn,
  .btn-text {
    width: 100%;
  }

  .page-footer {
    align-items: stretch;
  }

  .pagination {
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }

  .table th,
  .table td {
    padding: 12px 10px;
  }
}
</style>

<template>
  <div class="students-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">
          学员列表
          <span class="page-title-en">Student List</span>
        </h2>
        <p class="page-sub subtitle">管理学员信息、合同信息，支持各端查看和维护学员数据</p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="permission-button permission-button--primary students-page__add-button" @click="openAddStudentModal">
          <i class="mdi mdi-plus" aria-hidden="true"></i>
          <span>新增学员</span>
        </button>
      </div>
    </div>

    <div class="permission-card">
      <div v-if="pendingReviewCount > 0" class="students-banner">
        <div class="students-banner__icon" aria-hidden="true">
          <i class="mdi mdi-bell-ring"></i>
        </div>
        <div class="students-banner__content">
          <strong class="students-banner__title">⚠️ 有 {{ pendingReviewCount }} 位学员的信息变更待审核</strong>
          <span class="students-banner__text">学员提交的学业信息、求职方向等信息变更需要您审核，请及时处理</span>
        </div>
        <button type="button" class="students-banner__cta" @click="openPendingReviewStudent">
          <i class="mdi mdi-eye"></i>
          <span>立即查看</span>
        </button>
      </div>
      <div class="students-tabs" role="tablist" aria-label="学员列表类型切换">
        <button
          v-for="tab in studentTabs"
          :key="tab.key"
          type="button"
          :class="['students-tabs__tab', { 'students-tabs__tab--active': selectedTab === tab.key }]"
          :aria-selected="selectedTab === tab.key"
          @click="handleTabChange(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.key === 'blacklist'" class="students-tabs__count">{{ getTabCount(tab.key) }}</span>
        </button>
      </div>
      <FilterBar
        v-model="filters"
        :mentor-options="mentorOptions"
        :school-options="schoolOptions"
        :graduation-year-options="graduationYearOptions"
        :recruitment-cycle-options="recruitmentCycleOptions"
        :major-direction-options="majorDirectionOptions"
        @search="handleSearch"
        @export="handleExport"
      />
      <div class="permission-card__body permission-card__body--flush">
        <table class="permission-table">
          <thead>
            <tr>
              <th v-for="column in studentColumns" :key="column.key">
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in visibleStudentList"
              :key="record.studentId"
              :class="getStudentRowClass(record)"
            >
              <!-- 1. ID -->
              <td>{{ record.studentId }}</td>

              <!-- 2. 英文姓名 -->
              <td>
                <button type="button" class="student-link" @click="openStudentDetail(record)">
                  {{ record.studentName }}
                </button>
              </td>

              <!-- 3. 邮箱 -->
              <td><span style="font-size:11px">{{ record.email || '-' }}</span></td>

              <!-- 4. 班主任 -->
              <td>{{ record.leadMentorName || '-' }}</td>

              <!-- 5. 学校 -->
              <td>{{ record.school || '-' }}</td>

              <!-- 6. 主攻方向 -->
              <td>
                <span :class="['tag', 'purple']">{{ record.majorDirection || '-' }}</span>
              </td>

              <!-- 7. 投递岗位 -->
              <td>
                <span style="font-size:11px;color:#0284C7;cursor:pointer" @click="openJobsModal(record)">
                  {{ formatJobApplications(record) }}
                </span>
              </td>

              <!-- 8. 总课时 -->
              <td>
                <strong style="color:var(--primary)">{{ formatHours(record.totalHours) }}</strong>
              </td>

              <!-- 9. 岗位辅导 -->
              <td>
                <span style="color:#3B82F6;font-weight:600">{{ record.jobCoachingCount || 0 }}</span>次
              </td>

              <!-- 10. 基础课 -->
              <td>
                <span style="color:#6366F1;font-weight:600">{{ record.basicCourseCount || 0 }}</span>次
              </td>

              <!-- 11. 模拟应聘 -->
              <td>
                <span style="color:#22C55E;font-weight:600">{{ record.mockInterviewCount || 0 }}</span>次
              </td>

              <!-- 12. 剩余课时 -->
              <td>
                <span :style="{ color: getRemainingHoursColor(record.remainingHours), fontWeight: 600 }">
                  {{ formatHours(record.remainingHours) }}
                </span>
              </td>

              <!-- 13. 提醒 -->
              <td>
                <span v-if="getReminderLabel(record) !== '-'" :class="['tag', getReminderClass(getReminderLabel(record))]">
                  {{ getReminderLabel(record) }}
                </span>
                <span v-else style="color:var(--muted)">-</span>
              </td>

              <!-- 14. 账号状态 -->
              <td>
                <span :class="['tag', getStatusClass(record.accountStatus)]">
                  {{ formatStatus(record.accountStatus) }}
                </span>
              </td>

              <!-- 15. 操作 -->
              <td>
                <button type="button" class="btn-text-sm" @click="openStudentDetail(record)">详情</button>
                <button type="button" class="btn-text-sm" @click="openStudentEdit(record)">编辑</button>
                <ActionDropdown @select="handleStudentAction($event, record)" />
              </td>
            </tr>
            <tr v-if="!visibleStudentList.length">
              <td class="students-empty" :colspan="studentColumns.length">{{ emptyStateText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="students-pagination">
      <span class="students-pagination__total">共 {{ visibleTotal }} 条记录</span>
      <div class="students-pagination__controls">
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="!hasPrev"
          @click="goPrev"
        >
          上一页
        </button>
        <button type="button" class="permission-button permission-button--primary permission-button--small">
          {{ pagination.current }}
        </button>
        <button
          type="button"
          class="permission-button permission-button--outline permission-button--small"
          :disabled="!hasNext"
          @click="goNext"
        >
          下一页
        </button>
      </div>
    </div>

    <AddStudentModal
      v-model:visible="addStudentVisible"
      :submitting="creatingStudent"
      @submit="handleCreateStudent"
    />
    <StudentDetailModal
      v-model:visible="detailStudentVisible"
      :student-id="selectedStudent?.studentId ?? null"
      :student-name="selectedStudent?.studentName"
      :can-view="canManageStudentDetail"
      @request-edit="handleDetailEditRequest"
      @review-updated="handleDetailReviewUpdated"
    />
    <EditStudentModal
      v-model:visible="editStudentVisible"
      :student="selectedStudent"
      :submitting="editingStudent"
      @submit="handleEditStudentSubmit"
    />
    <StatusChangeModal
      v-model:visible="statusChangeVisible"
      :action="pendingStatusAction"
      :student-name="selectedStudent?.studentName"
      @submit="handleStatusChangeSubmit"
    />
    <BlacklistModal
      v-model:visible="blacklistVisible"
      :student-name="selectedStudent?.studentName"
      @submit="handleBlacklistSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  getStudentList,
  resetStudentPassword,
  updateStudent,
  type StudentListItem,
  type UpdateStudentPayload
} from '@osg/shared/api/admin/student'
import { getToken } from '@osg/shared/utils'
import { http } from '@osg/shared/utils/request'
import ActionDropdown from './components/ActionDropdown.vue'
import AddStudentModal from './components/AddStudentModal.vue'
import BlacklistModal from './components/BlacklistModal.vue'
import EditStudentModal from './components/EditStudentModal.vue'
import FilterBar from './components/FilterBar.vue'
import StatusChangeModal from './components/StatusChangeModal.vue'
import StudentDetailModal from './components/StudentDetailModal.vue'
import { studentColumns } from './columns'

interface FilterOption {
  label: string
  value: string | number
}

interface AddStudentFormPayload {
  studentName: string
  gender?: string
  email: string
  school: string
  major: string
  graduationYear?: number
  studyPlan: 'normal' | 'postgraduate' | 'deferred'
  targetRegion?: string
  recruitmentCycle: string[]
  majorDirections: string[]
  subDirection?: string
  leadMentorIds: number[]
  assistantIds: number[]
  contractAmount?: number
  totalHours?: number
  startDate?: string
  endDate?: string
}

type StudentActionKey = 'detail' | 'edit' | 'resetPassword' | 'freeze' | 'restore' | 'blacklist' | 'refund'
type StudentStatusAction = Extract<StudentActionKey, 'freeze' | 'restore' | 'refund'>

const studentList = ref<StudentListItem[]>([])
const mentorOptions = ref<FilterOption[]>([])
const schoolOptions = ref<FilterOption[]>([])
const graduationYearOptions = ref<FilterOption[]>([])
const recruitmentCycleOptions = ref<FilterOption[]>([])
const majorDirectionOptions = ref<FilterOption[]>([])
const exporting = ref(false)
const addStudentVisible = ref(false)
const creatingStudent = ref(false)
const detailStudentVisible = ref(false)
const editStudentVisible = ref(false)
const editingStudent = ref(false)
const statusChangeVisible = ref(false)
const blacklistVisible = ref(false)
const selectedStudent = ref<StudentListItem | null>(null)
const pendingStatusAction = ref<StudentStatusAction>('freeze')

const filters = reactive({
  studentName: undefined as string | undefined,
  leadMentorId: undefined as number | undefined,
  school: undefined as string | undefined,
  graduationYear: undefined as number | undefined,
  recruitmentCycle: undefined as string | undefined,
  majorDirection: undefined as string | undefined,
  accountStatus: undefined as string | undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const studentTabs = [
  { key: 'normal', label: '正常列表' },
  { key: 'blacklist', label: '黑名单' }
] as const

type StudentTabKey = (typeof studentTabs)[number]['key']

const selectedTab = ref<StudentTabKey>('normal')

const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize)))
const hasPrev = computed(() => pagination.current > 1)
const hasNext = computed(() => pagination.current < totalPages.value)
const visibleStudentList = computed(() =>
  studentList.value.filter((record) => (selectedTab.value === 'blacklist' ? isBlacklisted(record) : !isBlacklisted(record)))
)
const visibleTotal = computed(() =>
  selectedTab.value === 'blacklist' ? countBlacklisted(studentList.value) : Math.max(pagination.total - countBlacklisted(studentList.value), 0)
)
const emptyStateText = computed(() =>
  selectedTab.value === 'blacklist' ? '暂无黑名单学员' : '暂无学员数据'
)
const pendingReviewCount = computed(() => visibleStudentList.value.filter((record) => isPendingReview(record)).length)
const canManageStudentDetail = true

const loadStudentList = async () => {
  try {
    const res = await getStudentList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      studentName: filters.studentName,
      leadMentorId: filters.leadMentorId,
      school: filters.school,
      graduationYear: filters.graduationYear,
      recruitmentCycle: filters.recruitmentCycle,
      majorDirection: filters.majorDirection,
      accountStatus: filters.accountStatus
    })
    const rows = res.rows || []
    studentList.value = rows
    pagination.total = res.total || 0
    syncFilterOptions(rows)
    syncSelectedStudent(rows)
  } catch (_error) {
    message.error('加载学员列表失败')
  }
}

const handleSearch = async () => {
  pagination.current = 1
  await loadStudentList()
}

const resetFilters = () => {
  filters.studentName = undefined
  filters.leadMentorId = undefined
  filters.school = undefined
  filters.graduationYear = undefined
  filters.recruitmentCycle = undefined
  filters.majorDirection = undefined
  filters.accountStatus = undefined
}

const handleExport = async () => {
  try {
    exporting.value = true
    const params = new URLSearchParams()
    appendQueryParam(params, 'studentName', filters.studentName)
    appendQueryParam(params, 'leadMentorId', filters.leadMentorId)
    appendQueryParam(params, 'school', filters.school)
    appendQueryParam(params, 'graduationYear', filters.graduationYear)
    appendQueryParam(params, 'recruitmentCycle', filters.recruitmentCycle)
    appendQueryParam(params, 'majorDirection', filters.majorDirection)
    appendQueryParam(params, 'accountStatus', filters.accountStatus)
    appendQueryParam(params, 'tab', selectedTab.value)

    const token = getToken()
    const response = await fetch(`/api/admin/student/export?${params.toString()}`, {
      method: 'GET',
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : undefined
    })

    if (!response.ok) {
      throw new Error('导出请求失败')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success('学员列表导出成功')
  } catch (_error) {
    message.error('学员列表导出失败')
  } finally {
    exporting.value = false
  }
}

const openAddStudentModal = () => {
  addStudentVisible.value = true
}

const openStudentDetail = (record: StudentListItem) => {
  selectedStudent.value = record
  detailStudentVisible.value = true
}

const openStudentEdit = (record: StudentListItem) => {
  selectedStudent.value = record
  detailStudentVisible.value = false
  editStudentVisible.value = true
}

const openPendingReviewStudent = () => {
  const pendingRecord = visibleStudentList.value.find((record) => isPendingReview(record))
  if (pendingRecord) {
    openStudentDetail(pendingRecord)
    return
  }
  message.info('当前没有可查看的待审核学员')
}

const handleDetailEditRequest = (studentId: number) => {
  const matchedRecord = studentList.value.find((record) => record.studentId === studentId)
  if (matchedRecord) {
    selectedStudent.value = matchedRecord
  }
  if (!selectedStudent.value) {
    message.warning('未找到学员信息，暂时无法进入编辑弹窗')
    return
  }
  detailStudentVisible.value = false
  editStudentVisible.value = true
}

const handleDetailReviewUpdated = async () => {
  await loadStudentList()
}

const handleCreateStudent = async (payload: AddStudentFormPayload) => {
  try {
    creatingStudent.value = true
    await http.post('/admin/student', payload)
    addStudentVisible.value = false
    selectedTab.value = 'normal'
    pagination.current = 1
    resetFilters()
    await loadStudentList()
    message.success('新增学员成功，列表已刷新')
  } finally {
    creatingStudent.value = false
  }
}

const handleEditStudentSubmit = async (payload: UpdateStudentPayload) => {
  try {
    editingStudent.value = true
    const updated = await updateStudent(payload)
    editStudentVisible.value = false
    if (selectedStudent.value?.studentId === updated.studentId) {
      selectedStudent.value = {
        ...selectedStudent.value,
        ...updated
      }
    }
    await loadStudentList()
    message.success('学员信息已更新')
  } finally {
    editingStudent.value = false
  }
}

const handleStatusChangeSubmit = async (payload: { action: StudentStatusAction; reason?: string; remark?: string }) => {
  if (!selectedStudent.value) {
    message.warning('未找到学员信息，暂时无法变更状态')
    return
  }

  await http.put('/admin/student/status', {
    studentId: selectedStudent.value.studentId,
    action: payload.action,
    reason: payload.reason,
    remark: payload.remark
  })

  statusChangeVisible.value = false
  await loadStudentList()
  message.success('学员状态已更新')
}

const handleBlacklistSubmit = async (payload: { reason: string }) => {
  if (!selectedStudent.value) {
    message.warning('未找到学员信息，暂时无法加入黑名单')
    return
  }

  await http.post('/admin/student/blacklist', {
    studentId: selectedStudent.value.studentId,
    action: 'blacklist',
    reason: payload.reason
  })

  blacklistVisible.value = false
  await loadStudentList()
  message.success('已加入黑名单')
}

const handleTabChange = async (tab: StudentTabKey) => {
  if (selectedTab.value === tab) {
    return
  }
  selectedTab.value = tab
  pagination.current = 1
  await loadStudentList()
}

const goPrev = async () => {
  if (!hasPrev.value) {
    return
  }
  pagination.current -= 1
  await loadStudentList()
}

const goNext = async () => {
  if (!hasNext.value) {
    return
  }
  pagination.current += 1
  await loadStudentList()
}

const syncFilterOptions = (rows: StudentListItem[]) => {
  mentorOptions.value = buildOptions(rows, (row) => {
    if (row.leadMentorId == null) {
      return null
    }
    return {
      label: row.leadMentorName || `班主任 ${row.leadMentorId}`,
      value: row.leadMentorId
    }
  })
  schoolOptions.value = buildOptions(rows, (row) => createTextOption(row.school))
  graduationYearOptions.value = buildOptions(rows, (row) => {
    if (typeof row.graduationYear !== 'number') {
      return null
    }
    return { label: `${row.graduationYear}`, value: row.graduationYear }
  })
  recruitmentCycleOptions.value = buildOptions(rows, (row) => createTextOption(row.recruitmentCycle))
  majorDirectionOptions.value = buildOptions(rows, (row) => createTextOption(row.majorDirection))
}

const syncSelectedStudent = (rows: StudentListItem[]) => {
  if (!selectedStudent.value) {
    return
  }
  const matchedRecord = rows.find((record) => record.studentId === selectedStudent.value?.studentId)
  if (matchedRecord) {
    selectedStudent.value = matchedRecord
  }
}

const buildOptions = (
  rows: StudentListItem[],
  createOption: (row: StudentListItem) => FilterOption | null
) => {
  const seen = new Set<string>()
  const options: FilterOption[] = []
  rows.forEach((row) => {
    const option = createOption(row)
    if (!option) {
      return
    }
    const key = `${option.value}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    options.push(option)
  })
  return options
}

const createTextOption = (value?: string) => {
  if (!value) {
    return null
  }
  return {
    label: value,
    value
  }
}

const appendQueryParam = (params: URLSearchParams, key: string, value?: string | number) => {
  if (value === undefined || value === null || value === '') {
    return
  }
  params.set(key, `${value}`)
}

const getExportFilename = (contentDisposition?: string | null) => {
  if (!contentDisposition) {
    return 'students.xlsx'
  }
  const utf8Match = contentDisposition.match(/filename\\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i)
  return plainMatch?.[1] || 'students.xlsx'
}

const getTabCount = (tab: StudentTabKey) => {
  return tab === 'blacklist' ? countBlacklisted(studentList.value) : Math.max(pagination.total - countBlacklisted(studentList.value), 0)
}

const countBlacklisted = (rows: StudentListItem[]) => {
  return rows.filter((record) => isBlacklisted(record)).length
}

const isBlacklisted = (record: StudentListItem) => {
  const extraRecord = record as StudentListItem & Record<string, unknown>
  return extraRecord.isBlacklisted === true || record.contractStatus === 'blacklist' || `${record.reminder || ''}`.includes('黑名单')
}

const isPendingReview = (record: StudentListItem) => {
  const extraRecord = record as StudentListItem & Record<string, unknown>
  return (
    extraRecord.pendingReview === true ||
    extraRecord.reviewStatus === 'pending' ||
    record.contractStatus === 'pending_review' ||
    `${record.reminder || ''}`.includes('待审核')
  )
}

const isContractExpiring = (record: StudentListItem) => {
  return record.contractStatus === 'expiring' || `${record.reminder || ''}`.includes('到期')
}

const isLowHours = (record: StudentListItem) => {
  const hours = typeof record.remainingHours === 'number' ? record.remainingHours : undefined
  return Boolean(hours && hours > 0 && hours <= 5) && !isContractExpiring(record) && !isEndedStatus(record)
}

const isEndedStatus = (record: StudentListItem) => {
  return record.accountStatus === '2'
}

const isRefundedStatus = (record: StudentListItem) => {
  return record.accountStatus === '3'
}

const getStudentRowClass = (record: StudentListItem) => {
  return {
    'students-row--pending-review': isPendingReview(record),
    'students-row--low-hours': isLowHours(record),
    'students-row--contract-expiring': isContractExpiring(record),
    'students-row--ended': isEndedStatus(record),
    'students-row--refunded': isRefundedStatus(record)
  }
}

const handleStudentAction = (action: StudentActionKey, record: StudentListItem) => {
  if (action === 'detail') {
    openStudentDetail(record)
    return
  }

  if (action === 'edit') {
    openStudentEdit(record)
    return
  }

  if (action === 'freeze' || action === 'restore' || action === 'refund') {
    selectedStudent.value = record
    pendingStatusAction.value = action
    statusChangeVisible.value = true
    return
  }

  if (action === 'blacklist') {
    selectedStudent.value = record
    blacklistVisible.value = true
    return
  }
  if (action === 'resetPassword') {
    void handleResetStudentPassword(record)
  }
}

const handleResetStudentPassword = async (record: StudentListItem) => {
  const result = await resetStudentPassword(record.studentId)
  Modal.success({
    title: '重置密码成功',
    content: h('div', { class: 'students-reset-password-result' }, [
      h('p', `登录账号：${result.loginAccount}`),
      h('p', `默认密码：${result.defaultPassword}`)
    ]),
    okText: '知道了'
  })
}

const formatHours = (value?: number) => {
  const safeValue = typeof value === 'number' ? value : 0
  return `${safeValue}h`
}

const formatJobApplications = (record: StudentListItem) => {
  // 暂时返回占位文本,实际应该从API获取投递岗位数量
  const count = 3
  const company = 'Goldman Sachs'
  return `${company}等${count}个`
}

const getRemainingHoursColor = (hours?: number) => {
  const safeHours = typeof hours === 'number' ? hours : 0
  if (safeHours <= 5) return 'var(--danger)'
  if (safeHours > 10) return 'var(--success)'
  return 'var(--muted)'
}

const openJobsModal = (record: StudentListItem) => {
  // 打开投递岗位详情弹窗
  console.log('Open jobs modal for student:', record.studentId)
}

const formatGraduation = (year?: number) => {
  if (!year) return '-'
  return `${year} 届`
}

const formatLastLogin = (record: StudentListItem) => {
  // 这里可以根据实际的 lastLoginTime 字段来格式化
  // 暂时返回占位文本
  return '今天'
}

const formatLastUpdate = (record: StudentListItem) => {
  // 这里可以根据实际的 lastUpdateTime 字段来格式化
  // 暂时返回占位文本
  return '最近'
}

const getRemainingClass = (hours?: number) => {
  const safeHours = typeof hours === 'number' ? hours : 0
  if (safeHours <= 5) return 'student-remaining--danger'
  if (safeHours <= 10) return 'student-remaining--warning'
  return 'student-remaining--good'
}

const getRemainingIcon = (hours?: number) => {
  const safeHours = typeof hours === 'number' ? hours : 0
  if (safeHours <= 5) return 'mdi mdi-alert-circle-outline'
  return 'mdi mdi-timer-sand'
}

const getReminderClass = (reminder?: string) => {
  if (!reminder || reminder === '-' || reminder === '暂无提醒') {
    return 'student-reminder--quiet student-reminder--flat'
  }
  if (reminder.includes('课时') || reminder.includes('待审核')) {
    return 'student-reminder--danger student-reminder--flat'
  }
  if (reminder.includes('到期')) {
    return 'student-reminder--warning student-reminder--flat'
  }
  return 'student-reminder--info student-reminder--flat'
}

const getReminderIcon = (reminder?: string) => {
  if (!reminder || reminder === '-' || reminder === '暂无提醒') {
    return null
  }
  if (reminder.includes('课时')) {
    return 'mdi mdi-clock-alert'
  }
  if (reminder.includes('待审核')) {
    return 'mdi mdi-alert-circle'
  }
  if (reminder.includes('到期')) {
    return 'mdi mdi-calendar-alert'
  }
  return null
}

const getReminderNote = (record: StudentListItem) => {
  if (isPendingReview(record)) {
    return '请优先处理资料变更'
  }
  if (isLowHours(record)) {
    return '建议优先安排续签或排期'
  }
  if (isContractExpiring(record)) {
    return '合同即将到期'
  }
  return '资料状态正常'
}

const getStatusClass = (status?: string) => {
  switch (status) {
    case '1':
      return 'info'
    case '2':
      return 'default'
    case '3':
      return 'danger'
    default:
      return 'success'
  }
}

const getStatusNote = (record: StudentListItem) => {
  if (isEndedStatus(record)) {
    return '服务已结束'
  }
  if (isRefundedStatus(record)) {
    return '已退费'
  }
  if (record.accountStatus === '1') {
    return '账号已冻结'
  }
  if (isPendingReview(record) || isLowHours(record) || isContractExpiring(record)) {
    return '需优先跟进'
  }
  return '服务中'
}

const formatCountWithUnit = (value?: number) => {
  const safeValue = typeof value === 'number' ? value : 0
  return `${safeValue}次`
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1':
      return '冻结'
    case '2':
      return '已结束'
    case '3':
      return '退费'
    default:
      return '正常'
  }
}

const getReminderLabel = (record: StudentListItem) => {
  if (record.reminder && record.reminder !== '-') {
    return record.reminder
  }
  if (isPendingReview(record)) {
    return '信息待审核'
  }
  if (isLowHours(record)) {
    return '课时不足'
  }
  if (isContractExpiring(record)) {
    return '合同到期'
  }
  return '暂无提醒'
}

const getDirectionTone = (direction?: string) => {
  switch (direction) {
    case '咨询':
    case 'Consulting':
      return 'consulting'
    case '科技':
    case 'Tech':
      return 'tech'
    case '量化':
    case 'Quant':
      return 'quant'
    default:
      return 'finance'
  }
}

onMounted(() => {
  loadStudentList()
})
</script>

<style scoped lang="scss">
.students-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .page-header__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .students-page__add-button {
    border: 0;
    border-radius: 10px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    box-shadow: 0 14px 30px -22px rgba(124, 58, 237, 0.9);
  }

  .page-title {
    margin: 0;
    color: #111827;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
  }

  .page-title-en {
    margin-left: 8px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .page-sub {
    margin: 8px 0 0;
    color: #6b7280;
    font-size: 14px;
  }

  .permission-card {
    overflow: hidden;
  }

  .permission-card__body--flush {
    overflow: hidden;
  }

  .students-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
    background: linear-gradient(135deg, #fef3c7, #fffbeb);
    border: 2px solid #f59e0b;
    border-radius: 12px;
    margin: 16px 16px 16px;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    color: #854d0e;
  }

  .students-banner__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: #f59e0b;
    color: #ffffff;
    font-size: 24px;
    box-shadow: 0 10px 28px -16px rgba(245, 158, 11, 0.75);
    animation: studentsPulse 1.6s ease-in-out infinite;
  }

  .students-banner__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  }

  .students-banner__title {
    font-size: 16px;
    font-weight: 700;
  }

  .students-banner__text {
    font-size: 13px;
    color: #b45309;
  }

  .students-banner__cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 10px;
    padding: 10px 18px;
    background: #f59e0b;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .students-tabs {
    display: inline-flex;
    gap: 8px;
    margin: 0 16px 16px;
  }

  .students-tabs__tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 999px;
    padding: 6px 14px;
    background: #ffffff;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px #e5e7eb;
  }

  .students-tabs__tab:hover {
    color: #1d4ed8;
  }

  .students-tabs__tab--active {
    background: #eff6ff;
    color: #2563eb;
    box-shadow: inset 0 0 0 1px #bfdbfe;
  }

  .students-tabs__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 10px;
    font-weight: 700;
  }

  .students-tabs__tab--active .students-tabs__count {
    background: #fee2e2;
    color: #991b1b;
  }

  .permission-table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    font-size: 12px;

    th,
    td {
      padding: 16px 12px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: top;
      font-size: 12px;
      line-height: 1.5;
    }

    thead th {
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding-top: 14px;
      padding-bottom: 14px;
      background: #f8fafc;
      vertical-align: middle;
    }

    tbody tr:hover {
      background: #f9fafb;
    }
  }

  // 学员信息单元格样式
  .student-cell-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .student-meta-list {
    gap: 8px;
  }

  .student-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .student-name {
    border: 0;
    background: transparent;
    padding: 0;
    color: var(--primary);
    font-weight: 600;
    font-size: 13px;
    line-height: 1.4;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }
  }

  .student-id-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    background: #f3f4f6;
    color: var(--text2);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.3;
  }

  .student-email-line {
    color: var(--text2);
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
  }

  .student-meta-inline {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.3;
  }

  .student-pair-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
  }

  .student-pair-label {
    color: var(--muted);
    font-size: 11px;
    flex-shrink: 0;
  }

  .student-pair-value {
    color: var(--text);
    font-weight: 500;
    word-break: break-word;
  }

  .student-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    width: fit-content;
  }

  .student-pill--finance {
    background: #e0e7ff;
    color: #4338ca;
  }

  .student-pill--consulting {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .student-pill--tech {
    background: #fef3c7;
    color: #92400e;
  }

  .student-pill--quant {
    background: #ede9fe;
    color: #6d28d9;
  }

  // 课时盒子样式
  .student-hours-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .student-hours-box--compact {
    gap: 8px;
  }

  .student-hours-box__top {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .student-hours-box__label {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.3;
  }

  .student-hours-box__value {
    color: var(--primary);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
  }

  .student-remaining {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;

    i {
      font-size: 13px;
    }
  }

  .student-remaining--good {
    color: #16a34a;
  }

  .student-remaining--warning {
    color: #ea580c;
  }

  .student-remaining--danger {
    color: #dc2626;
  }

  .student-metric-strip {
    display: flex;
    gap: 12px;
  }

  .student-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .student-count-item__label {
    color: #9ca3af;
    font-size: 10px;
    line-height: 1.2;
  }

  .student-count-item__value {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
  }

  .student-count-item__value--blue {
    color: #3b82f6;
  }

  .student-count-item__value--indigo {
    color: #6366f1;
  }

  .student-count-item__value--green {
    color: #22c55e;
  }

  // 提醒样式
  .student-reminder {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    width: fit-content;

    i {
      font-size: 14px;
    }
  }

  .student-reminder--quiet {
    background: #f9fafb;
    color: #6b7280;
  }

  .student-reminder--danger {
    background: #fee2e2;
    color: #b91c1c;
  }

  .student-reminder--warning {
    background: #fef3c7;
    color: #92400e;
  }

  .student-reminder--info {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .student-reminder--flat {
    border-radius: 6px;
  }

  .student-note {
    color: #9ca3af;
    font-size: 11px;
    line-height: 1.4;
  }

  // 状态样式
  .student-status-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .student-status-stack--compact {
    gap: 4px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    width: fit-content;
  }

  .tag.success {
    background: #dcfce7;
    color: #166534;
  }

  .tag.info {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .tag.danger {
    background: #fee2e2;
    color: #b91c1c;
  }

  .tag.default {
    background: #f3f4f6;
    color: #6b7280;
  }

  // 操作按钮样式
  .student-action-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }

  .student-action-row--quiet {
    gap: 6px;
  }

  .student-action-link {
    border: 0;
    background: transparent;
    padding: 0;
    color: #2563eb;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
  }

  .student-action-divider {
    width: 1px;
    height: 12px;
    background: #d1d5db;
  }

  .students-row--low-hours {
    background: rgba(254, 226, 226, 0.58);
  }

  .students-row--low-hours:hover {
    background: rgba(254, 202, 202, 0.74);
  }

  .students-row--pending-review {
    background: linear-gradient(90deg, rgba(254, 240, 138, 0.92), rgba(254, 249, 195, 0.86));
  }

  .students-row--pending-review td:first-child {
    border-left: 4px solid #f59e0b;
  }

  .students-row--pending-review:hover {
    background: linear-gradient(90deg, rgba(253, 230, 138, 0.95), rgba(254, 240, 138, 0.88));
  }

  .students-row--contract-expiring {
    background: rgba(254, 249, 195, 0.72);
  }

  .students-row--contract-expiring:hover {
    background: rgba(253, 230, 138, 0.82);
  }

  .students-row--ended {
    opacity: 0.7;
  }

  .students-row--refunded {
    opacity: 0.5;
  }

  .students-empty {
    text-align: center;
    color: #9ca3af;
    padding: 28px 12px;
  }

  .students-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
  }

  .students-pagination__total {
    color: #6b7280;
    font-size: 13px;
  }

  .students-pagination__controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  // 翻页按钮样式
  .permission-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 16px;
    background: #ffffff;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .permission-button--primary {
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    border-color: #7c3aed;
    color: #ffffff;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #6d28d9, #7c3aed);
      border-color: #6d28d9;
    }
  }

  .permission-button--outline {
    background: #ffffff;
    border-color: #d1d5db;
    color: #374151;

    &:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #9ca3af;
      color: #111827;
    }
  }

  .permission-button--small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .student-link {
    border: none;
    background: transparent;
    padding: 0;
    color: var(--primary);
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
  }

  .student-link:hover {
    text-decoration: underline;
  }

  .btn-text-sm {
    border: none;
    background: transparent;
    color: var(--primary);
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-text-sm:hover {
    color: var(--primary-dark);
  }

  .tag {
    display: inline-flex;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .tag.purple {
    background: var(--primary-light);
    color: var(--primary-dark);
  }

  .tag.success {
    background: #D1FAE5;
    color: #065F46;
  }

  .tag.warning {
    background: #FEF3C7;
    color: #92400E;
  }

  .tag.danger {
    background: #FEE2E2;
    color: #991B1B;
  }

  .tag.info {
    background: #DBEAFE;
    color: #1E40AF;
  }

  @keyframes studentsPulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.15);
      opacity: 1;
    }

    50% {
      box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
      opacity: 0.68;
    }
  }

  @media (max-width: 960px) {
    .page-header {
      flex-direction: column;
    }

    .page-header__actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .students-banner {
      flex-wrap: wrap;
    }

    .students-tabs {
      padding-top: 16px;
      flex-wrap: wrap;
    }
  }
}
</style>

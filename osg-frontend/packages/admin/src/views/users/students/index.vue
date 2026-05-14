<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('student_list_2')" title-en="Student List" :description="$t('manage_student_information_and_contract_')">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-student" @click="openAddStudentModal">
          <template #icon><PlusOutlined /></template>
          {{ $t('new_students') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingReviewCount > 0"
      type="warning"
      show-icon
      :message="$t('pending_student_change_review_count', { count: pendingReviewCount })"
      :description="$t('information_changes_submitted_by_student')"
    >
      <template #action>
        <a-button type="primary" size="small" data-surface-trigger="modal-student-detail-bob" data-surface-sample-key="pending-review" @click="openPendingReviewStudent">
          {{ $t('view_now') }}
        </a-button>
      </template>
    </a-alert>

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

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <a-tabs v-model:activeKey="selectedTab" @change="(key: string) => handleTabChange(key as StudentTabKey)">
        <a-tab-pane v-for="tab in studentTabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge v-if="tab.key === 'blacklist'" :count="getTabCount(tab.key)" :number-style="{ backgroundColor: '#ef4444' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-alert
        v-if="selectedTab === 'blacklist'"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message><strong>{{ $t('blacklist_restrictions') }}</strong></template>
        <template #description>{{ $t('blacklisted_students_can_log_in_to_the_s') }}<strong>{{ $t('cannot_view_the_job_search_center_module') }}</strong>（{{ $t('including_position_info_interview_prepar_2') }}）</template>
      </a-alert>

      <a-table
        :columns="activeStudentColumns"
        :data-source="visibleStudentList"
        :row-key="(record: StudentListItem) => record.studentId"
        :pagination="tablePagination"
        :row-class-name="getRowClassName"
        :locale="{ emptyText: emptyStateText }"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentId'">
            <a-tag color="blue">#{{ record.studentId }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <a-button type="link" size="small" style="padding: 0; font-weight: 600" :data-surface-trigger="getStudentDetailSurfaceId(record)" :data-surface-sample-key="getStudentSurfaceSampleKey(record)" @click="openStudentDetail(record)">
              {{ record.studentName }}
            </a-button>
          </template>
          <template v-else-if="column.dataIndex === 'email'">
            <span style="color: #566178; font-size: 12px">{{ record.email || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'leadMentorName'">
            <span style="color: #566178; font-size: 12px">{{ record.leadMentorName || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'school'">
            <a-tooltip :title="record.school || '-'">
              <span style="color: #566178; font-size: 12px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.school || '-' }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'majorDirection'">
            <a-tooltip :title="record.majorDirection || '-'">
              <a-tag :color="getDirectionColor(record.majorDirection)" style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.majorDirection || '-' }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="column.dataIndex === 'positions'">
            <a-button type="link" size="small" style="padding: 0" @click="openJobsModal(record)">
              {{ formatJobApplications(record) }}
            </a-button>
          </template>
          <template v-else-if="column.dataIndex === 'totalHours'">
            <strong style="color: var(--primary)">{{ formatHours(record.totalHours) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'jobCoachingCount'">
            <span style="color: #3172f4; font-weight: 700">{{ record.jobCoachingCount || 0 }}{{ $t('times') }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'basicCourseCount'">
            <span style="color: #5a63ef; font-weight: 700">{{ record.basicCourseCount || 0 }}{{ $t('times') }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'mockInterviewCount'">
            <span style="color: #12a56a; font-weight: 700">{{ record.mockInterviewCount || 0 }}{{ $t('times') }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'remainingHours'">
            <strong :style="{ color: getRemainingHoursColor(record.remainingHours) }">{{ formatHours(record.remainingHours) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'reminder'">
            <template v-if="getReminderLabel(record) !== t('no_reminder')">
              <a-tag :color="getReminderTagColor(getReminderLabel(record))">{{ getReminderLabel(record) }}</a-tag>
            </template>
            <span v-else style="color: var(--muted)">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'accountStatus'">
            <div style="display: flex; flex-direction: column; gap: 4px">
              <a-tag :color="getStatusTagColor(record.accountStatus)">{{ formatStatus(record.accountStatus) }}</a-tag>
              <span style="font-size: 11px; color: #9ca3af">{{ getStatusNote(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4" wrap>
              <a-button type="link" size="small" :data-surface-trigger="getStudentDetailSurfaceId(record)" :data-surface-sample-key="getStudentSurfaceSampleKey(record)" @click="openStudentDetail(record)">{{ $t('details') }}</a-button>
              <template v-if="!isEndedStatus(record) && !isRefundedStatus(record)">
                <a-button type="link" size="small" data-surface-trigger="modal-edit-student-new" :data-surface-sample-key="getStudentSurfaceSampleKey(record)" @click="openStudentEdit(record)">{{ $t('edit') }}</a-button>
                <a-tooltip v-if="isContractExpiring(record)" :title="$t('renew_contract')">
                  <a-button type="text" size="small" :loading="renewContractLoadingId === record.studentId" style="color: #F59E0B" data-surface-trigger="modal-contract-renew" :data-surface-sample-key="`${getStudentSurfaceSampleKey(record)}-contract-renew`" @click="openStudentRenew(record)">
                    <template #icon><FileTextOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-dropdown v-else :trigger="['click']" placement="bottomRight">
                  <a-button type="link" size="small">{{ $t('more') }} <DownOutlined /></a-button>
                  <template #overlay>
                    <a-menu @click="({ key }: { key: string }) => handleStudentAction(key as StudentActionKey, record)">
                      <a-menu-item key="resetPassword">{{ $t('reset_password') }}</a-menu-item>
                      <template v-if="record.accountStatus === '1'">
                        <a-menu-item key="restore"><span style="color: var(--success)">{{ $t('restore_to_normal') }}</span></a-menu-item>
                      </template>
                      <template v-else>
                        <a-menu-item key="freeze">{{ $t('frozen') }}</a-menu-item>
                        <a-menu-item key="blacklist"><span style="color: #92400E">{{ $t('add_to_blacklist') }}</span></a-menu-item>
                      </template>
                      <a-menu-item key="refund"><span style="color: var(--danger)">{{ $t('refund') }}</span></a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <AddStudentModal
      v-model:visible="addStudentVisible"
      :submitting="creatingStudent"
      @submit="handleCreateStudent"
    />
    <StudentDetailModal
      v-model:visible="detailStudentVisible"
      :student-id="selectedStudent?.studentId ?? null"
      :student-name="selectedStudent?.studentName"
      :surface-id="selectedStudent ? getStudentDetailSurfaceId(selectedStudent) : 'modal-student-detail-new'"
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
    <RenewContractModal
      v-model:visible="renewContractVisible"
      :student-options="renewStudentOptions"
      :preset-contract="renewContractPreset"
      @submitted="handleStudentContractRenewed"
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
import { DownOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  getStudentList,
  resetStudentPassword,
  updateStudent,
  type StudentListItem,
  type UpdateStudentPayload
} from '@osg/shared/api/admin/student'
import {
  getStudentContractDetail,
  type ContractDetailPayload,
  type ContractListItem,
} from '@osg/shared/api/admin/contract'
import { getToken } from '@osg/shared/utils'
import { http } from '@osg/shared/utils/request'
import { PageHeader } from '@osg/shared/components/PageHeader'
import AddStudentModal from './components/AddStudentModal.vue'
import BlacklistModal from './components/BlacklistModal.vue'
import EditStudentModal from './components/EditStudentModal.vue'
import FilterBar from './components/FilterBar.vue'
import RenewContractModal from '../contracts/components/RenewContractModal.vue'
import StatusChangeModal from './components/StatusChangeModal.vue'
import StudentDetailModal from './components/StudentDetailModal.vue'
import { studentColumns, blacklistColumns } from './columns'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
interface FilterOption {
  label: string
  value: string | number
}

interface StudentDetailMentor {
  leadMentorId?: number
  leadMentorName?: string
  assistantId?: number
  assistantName?: string
}

interface StudentEditDetailPayload {
  studentId: number
  studentName: string
  email?: string
  gender?: string
  school?: string
  major?: string
  targetRegion?: string
  subDirection?: string
  accountStatus?: string
  contact?: {
    wechat?: string
    phone?: string
  }
  mentor?: StudentDetailMentor
}

type StudentEditableRecord = StudentListItem & {
  gender?: string
  phone?: string
  wechat?: string
  remark?: string
  assistantId?: number
  assistantName?: string
}

interface AddStudentFormPayload {
  studentName: string
  gender?: string
  email: string
  school: string
  major: string
  graduationYear?: number
  studyPlan: 'normal' | 'postgraduate' | 'deferred'
  targetRegion: string[]
  recruitmentCycle: string[]
  majorDirections: string[]
  subDirection?: string
  leadMentorIds: number[]
  assistantIds: number[]
  currency?: 'USD' | 'GBP'
  amountUsd?: number
  amountGbp?: number
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
const renewContractVisible = ref(false)
const renewContractLoadingId = ref<number | null>(null)
const renewContractPreset = ref<ContractListItem | null>(null)
const renewableStudentIds = ref<Set<number>>(new Set())
const statusChangeVisible = ref(false)
const blacklistVisible = ref(false)
const selectedStudent = ref<StudentEditableRecord | null>(null)
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
  { key: 'normal', label: t('active_list') },
  { key: 'blacklist', label: t('blacklist') }
] as const

type StudentTabKey = (typeof studentTabs)[number]['key']

const selectedTab = ref<StudentTabKey>('normal')

const visibleStudentList = computed(() =>
  studentList.value.filter((record) => (selectedTab.value === 'blacklist' ? isBlacklisted(record) : !isBlacklisted(record)))
)
const tablePagination = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  simple: false,
  showSizeChanger: false,
  showTotal: (total: number) => `${t('in_total')} ${total} ${t('records')}`
}))
const emptyStateText = computed(() =>
  selectedTab.value === 'blacklist' ? t('no_blacklisted_students') : t('no_student_data_available')
)
const activeStudentColumns = computed(() =>
  selectedTab.value === 'blacklist' ? blacklistColumns : studentColumns
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
    void hydrateRenewableStudentIds(rows)
  } catch (_error) {
    message.error(t('failed_to_load_student_list'))
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
      throw new Error(t('export_request_failed'))
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success(t('student_list_exported_successfully'))
  } catch (_error) {
    message.error(t('failed_to_export_student_list'))
  } finally {
    exporting.value = false
  }
}

const openAddStudentModal = () => {
  addStudentVisible.value = true
}

const getStudentDetailSurfaceId = (record: StudentListItem) => {
  return isPendingReview(record) ? 'modal-student-detail-bob' : 'modal-student-detail-new'
}

const getStudentSurfaceSampleKey = (record: StudentListItem) => {
  const normalizedName = `${record.studentName || ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedName || `student-${record.studentId}`
}

const openStudentDetail = (record: StudentListItem) => {
  selectedStudent.value = record
  detailStudentVisible.value = true
}

const openStudentEdit = async (record: StudentListItem) => {
  try {
    const detail = await http.get<StudentEditDetailPayload>(`/admin/student/${record.studentId}`)
    selectedStudent.value = {
      ...record,
      gender: detail.gender,
      phone: detail.contact?.phone,
      wechat: detail.contact?.wechat,
      leadMentorId: detail.mentor?.leadMentorId ?? record.leadMentorId,
      leadMentorName: detail.mentor?.leadMentorName ?? record.leadMentorName,
      assistantId: detail.mentor?.assistantId,
      assistantName: detail.mentor?.assistantName,
      targetRegion: detail.targetRegion ?? record.targetRegion,
      targetPosition: detail.subDirection ?? record.targetPosition,
    }
  } catch (_error) {
    selectedStudent.value = {
      ...record,
      assistantId: record.assistantId,
      assistantName: record.assistantName,
    }
    message.warning(t('failed_to_load_student_details_opened_ed'))
  }
  detailStudentVisible.value = false
  editStudentVisible.value = true
}

const hasRenewableContract = (record: StudentListItem) => {
  return renewableStudentIds.value.has(record.studentId)
}

const contractSortScore = (contract: ContractListItem) => {
  const isActive = contract.contractStatus === 'active' ? 1 : 0
  const endTime = contract.endDate ? new Date(contract.endDate).getTime() : 0
  const updateTime = contract.updateTime ? new Date(contract.updateTime).getTime() : 0
  return [isActive, endTime, updateTime] as const
}

const buildRenewPreset = (record: StudentListItem, payload: ContractDetailPayload): ContractListItem | null => {
  const contract = [...(payload.contracts || [])].sort((left, right) => {
    const [leftActive, leftEnd, leftUpdate] = contractSortScore(left)
    const [rightActive, rightEnd, rightUpdate] = contractSortScore(right)
    if (rightActive !== leftActive) return rightActive - leftActive
    if (rightEnd !== leftEnd) return rightEnd - leftEnd
    return rightUpdate - leftUpdate
  })[0]

  if (!contract) {
    return null
  }

  return {
    ...contract,
    studentId: record.studentId,
    studentName: record.studentName,
  }
}

const openStudentRenew = async (record: StudentListItem) => {
  try {
    renewContractLoadingId.value = record.studentId
    selectedStudent.value = record
    const payload = await getStudentContractDetail(record.studentId)
    const preset = buildRenewPreset(record, payload)
    if (!preset) {
      message.warning(t('no_renewable_original_contract_for_this_'))
      return
    }
    renewContractPreset.value = preset
    renewContractVisible.value = true
  } catch (_error) {
    message.error(t('failed_to_load_contract_renewal_context'))
  } finally {
    renewContractLoadingId.value = null
  }
}

const hydrateRenewableStudentIds = async (rows: StudentListItem[]) => {
  renewableStudentIds.value = new Set()
  const settled = await Promise.allSettled(
    rows.map(async (record) => {
      const payload = await getStudentContractDetail(record.studentId)
      return payload.contracts?.length ? record.studentId : null
    })
  )
  renewableStudentIds.value = new Set(
    settled
      .filter((result): result is PromiseFulfilledResult<number | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((value): value is number => typeof value === 'number')
  )
}

const openPendingReviewStudent = () => {
  const pendingRecord = visibleStudentList.value.find((record) => isPendingReview(record))
  if (pendingRecord) {
    openStudentDetail(pendingRecord)
    return
  }
  message.info(t('no_students_pending_review'))
}

const handleDetailEditRequest = async (studentId: number) => {
  const matchedRecord = studentList.value.find((record) => record.studentId === studentId)
  if (!matchedRecord) {
    message.warning(t('student_information_not_found_unable_to_'))
    return
  }
  await openStudentEdit(matchedRecord)
}

const handleDetailReviewUpdated = async () => {
  await loadStudentList()
}

const renewStudentOptions = computed(() => {
  if (!selectedStudent.value) {
    return []
  }
  return [{
    studentId: selectedStudent.value.studentId,
    studentName: selectedStudent.value.studentName,
  }]
})

const handleStudentContractRenewed = async () => {
  renewContractVisible.value = false
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
    message.success(t('student_added_successfully_list_refreshe'))
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
        ...updated,
        leadMentorId: payload.leadMentorId,
        assistantId: payload.assistantId,
      }
    }
    await loadStudentList()
    message.success(t('student_information_updated'))
  } finally {
    editingStudent.value = false
  }
}

const handleStatusChangeSubmit = async (payload: { action: StudentStatusAction; reason?: string; remark?: string }) => {
  if (!selectedStudent.value) {
    message.warning(t('student_information_not_found_unable_to__2'))
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
  message.success(t('student_status_updated'))
}

const handleBlacklistSubmit = async (payload: { reason: string }) => {
  if (!selectedStudent.value) {
    message.warning(t('student_information_not_found_unable_to__3'))
    return
  }

  await http.post('/admin/student/blacklist', {
    studentId: selectedStudent.value.studentId,
    action: 'blacklist',
    reason: payload.reason
  })

  blacklistVisible.value = false
  await loadStudentList()
  message.success(t('blacklisted'))
}

const handleTabChange = async (tab: StudentTabKey) => {
  if (selectedTab.value === tab) {
    return
  }
  selectedTab.value = tab
  pagination.current = 1
  await loadStudentList()
}

const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 10
  void loadStudentList()
}

const getRowClassName = (record: StudentListItem) => {
  if (isPendingReview(record)) return 'row-pending-review'
  if (isLowHours(record)) return 'row-low-hours'
  if (isContractExpiring(record)) return 'row-contract-expiring'
  if (isEndedStatus(record)) return 'row-ended'
  if (isRefundedStatus(record)) return 'row-refunded'
  return ''
}

const syncFilterOptions = (rows: StudentListItem[]) => {
  mentorOptions.value = buildOptions(rows, (row) => {
    if (row.leadMentorId == null) {
      return null
    }
    return {
      label: row.leadMentorName || t('head_teacher_with_id', { id: row.leadMentorId }),
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
  return extraRecord.isBlacklisted === true || record.contractStatus === 'blacklist' || `${record.reminder || ''}`.includes(t('blacklist'))
}

const isPendingReview = (record: StudentListItem) => {
  const extraRecord = record as StudentListItem & Record<string, unknown>
  return (
    extraRecord.pendingReview === true ||
    extraRecord.reviewStatus === 'pending' ||
    record.contractStatus === 'pending_review' ||
    `${record.reminder || ''}`.includes(t('pending_review'))
  )
}

const isContractExpiring = (record: StudentListItem) => {
  return record.contractStatus === 'expiring' || `${record.reminder || ''}`.includes(t('expired'))
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
    title: t('password_reset_successfully'),
    content: h('div', { class: 'students-reset-password-result' }, [
      h('p', t('login_account_with_value', { account: result.loginAccount })),
      h('p', t('default_password_with_value', { password: result.defaultPassword }))
    ]),
    okText: t('got_it')
  })
}

const formatHours = (value?: number) => {
  const safeValue = typeof value === 'number' ? value : 0
  return `${safeValue}h`
}

const formatJobApplications = (_record: StudentListItem) => {
  return t('no_applications')
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

const getDirectionColor = (direction?: string) => {
  if (!direction) return 'default'
  const d = direction.toLowerCase()
  if (d.includes(t('finance_2')) || d.includes('finance')) return 'purple'
  if (d.includes(t('consulting')) || d.includes('consulting')) return 'blue'
  if (d.includes(t('technology')) || d.includes('tech')) return 'orange'
  if (d.includes(t('quantitative')) || d.includes('quant')) return 'cyan'
  return 'purple'
}

const getReminderTagColor = (reminder?: string) => {
  if (!reminder || reminder === '-' || reminder === t('no_reminders')) return 'default'
  if (reminder.includes(t('pending_review'))) return 'red'
  if (reminder.includes(t('class_hours'))) return 'red'
  if (reminder.includes(t('expired'))) return 'orange'
  return 'blue'
}

const getStatusTagColor = (status?: string) => {
  switch (status) {
    case '1': return 'blue'
    case '2': return 'default'
    case '3': return 'red'
    default: return 'green'
  }
}

const getStatusNote = (record: StudentListItem) => {
  if (isEndedStatus(record)) {
    return t('service_ended')
  }
  if (isRefundedStatus(record)) {
    return t('refunded')
  }
  if (record.accountStatus === '1') {
    return t('account_frozen')
  }
  if (isPendingReview(record) || isLowHours(record) || isContractExpiring(record)) {
    return t('follow_up_required')
  }
  return t('in_service')
}

const formatStatus = (status?: string) => {
  switch (status) {
    case '1':
      return t('frozen')
    case '2':
      return t('ended')
    case '3':
      return t('refund')
    default:
      return t('active_3')
  }
}

const getReminderLabel = (record: StudentListItem) => {
  if (record.reminder && record.reminder !== '-') {
    return record.reminder
  }
  if (isPendingReview(record)) {
    return t('pending_review')
  }
  if (isLowHours(record)) {
    return t('insufficient_hours')
  }
  if (isContractExpiring(record)) {
    return t('contract_expired')
  }
  return t('no_reminders')
}

onMounted(() => {
  loadStudentList()
})
</script>

<style scoped>
:deep(.row-pending-review) {
  background: rgba(254, 240, 138, 0.6);
}
:deep(.row-low-hours) {
  background: rgba(254, 226, 226, 0.5);
}
:deep(.row-contract-expiring) {
  background: rgba(254, 249, 195, 0.6);
}
:deep(.row-ended) {
  opacity: 0.7;
}
:deep(.row-refunded) {
  opacity: 0.5;
}
</style>

<template>
  <div class="osg-page">
    <PageHeader title-zh="学员列表" title-en="Student List">
      <template #actions>
        <a-button type="primary" data-surface-trigger="modal-add-student" @click="openAddStudentModal">
          <template #icon><PlusOutlined /></template>
          新增学员
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingReviewCount > 0"
      type="warning"
      show-icon
      :message="`有 ${pendingReviewCount} 位学员的信息变更待审核`"
      description="学员提交的学业信息、求职方向等信息变更需要您审核，请及时处理"
    >
      <template #action>
        <a-button type="primary" size="small" data-surface-trigger="modal-student-detail-bob" data-surface-sample-key="pending-review" @click="openPendingReviewStudent">
          立即查看
        </a-button>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <FilterBar
        v-model="filters"
        :mentor-options="mentorOptions"
        :school-options="schoolOptions"
        :graduation-year-options="graduationYearOptions"
        :recruitment-cycle-options="recruitmentCycleOptions"
        :major-direction-options="majorDirectionOptions"
        :exporting="exporting"
        @search="handleSearch"
        @export="handleExport"
      />
    </a-card>

    <a-card :bordered="false">
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
        style="margin-bottom: var(--osg-space-4)"
      >
        <template #message><strong>黑名单限制</strong></template>
        <template #description>黑名单学员可以正常登录学生端，但<strong>无法查看求职中心模块</strong>（包括岗位信息、面试准备等功能）</template>
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
            <span style="color: #566178; font-size: var(--osg-font-size-sm)">{{ record.email || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'leadMentorName'">
            <span style="color: #566178; font-size: var(--osg-font-size-sm)">{{ record.leadMentorName || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'school'">
            <a-tooltip :title="record.school || '-'">
              <span style="color: #566178; font-size: var(--osg-font-size-sm); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ record.school || '-' }}</span>
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
            <span style="color: #3172f4; font-weight: 700">{{ record.jobCoachingCount || 0 }}次</span>
          </template>
          <template v-else-if="column.dataIndex === 'basicCourseCount'">
            <span style="color: #5a63ef; font-weight: 700">{{ record.basicCourseCount || 0 }}次</span>
          </template>
          <template v-else-if="column.dataIndex === 'mockInterviewCount'">
            <span style="color: #12a56a; font-weight: 700">{{ record.mockInterviewCount || 0 }}次</span>
          </template>
          <template v-else-if="column.dataIndex === 'remainingHours'">
            <strong :style="{ color: getRemainingHoursColor(record.remainingHours) }">{{ formatHours(record.remainingHours) }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'reminder'">
            <template v-if="getReminderLabel(record) !== '暂无提醒'">
              <a-tag :color="getReminderTagColor(getReminderLabel(record))">{{ getReminderLabel(record) }}</a-tag>
            </template>
            <span v-else style="color: var(--muted)">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'accountStatus'">
            <!--
              批次 7 + 7.5 行为矩阵双 tag：accountStatus 与 frozen 维度正交。
              见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.3
            -->
            <div style="display: flex; flex-direction: column; gap: 4px">
              <div style="display: flex; flex-wrap: wrap; gap: 4px">
                <a-tag :color="getLifecycleTagColor(record.accountStatus)">{{ getLifecycleLabel(record.accountStatus) }}</a-tag>
                <a-tag v-if="isFrozen(record) && !isRefundedStatus(record)" color="blue">冻结</a-tag>
              </div>
              <span style="font-size: var(--osg-font-size-xs); color: #9ca3af">{{ getStatusNote(record) }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="4" wrap>
              <a-button type="link" size="small" :data-surface-trigger="getStudentDetailSurfaceId(record)" :data-surface-sample-key="getStudentSurfaceSampleKey(record)" @click="openStudentDetail(record)">详情</a-button>
              <a-button v-if="!isEndedStatus(record) && !isRefundedStatus(record)" type="link" size="small" data-surface-trigger="modal-edit-student-new" :data-surface-sample-key="getStudentSurfaceSampleKey(record)" @click="openStudentEdit(record)">编辑</a-button>
              <a-tooltip v-if="!isEndedStatus(record) && !isRefundedStatus(record) && isContractExpiring(record)" title="续签合同">
                <a-button type="text" size="small" :loading="renewContractLoadingId === record.studentId" style="color: #F59E0B" data-surface-trigger="modal-contract-renew" :data-surface-sample-key="`${getStudentSurfaceSampleKey(record)}-contract-renew`" @click="openStudentRenew(record)">
                  <template #icon><FileTextOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-dropdown :trigger="['click']" placement="bottomRight">
                <a-button type="link" size="small">更多 <DownOutlined /></a-button>
                <template #overlay>
                  <!--
                    批次 7 + 7.5 操作菜单（§13.4）：
                      0/0 正常        : 冻结 / 结束合同 / 退费 / 加入黑名单
                      0/1 正常·冻结   : 解冻 / 结束合同 / 退费
                      2/0 合同结束     : 再冻结 / 退费
                      2/1 合同结束·冻结: 解冻 / 退费
                      3/- 退费        : 重新加入 → 续签合同弹窗
                  -->
                  <!--
                    批次 7 + 7.5 操作菜单（§13.4 修订）：
                      0/0 正常        : 冻结 / 结束合同 / 退费 / 加入黑名单
                      0/1 正常·冻结   : 解冻 / 结束合同 / 退费
                      2/0 合同结束     : 冻结 / 重新加入              ← 续签合同走 reactivateAccount=true 回 0/0
                      2/1 合同结束·冻结: 解冻（→ 进 2/0 再决定续签/退费）
                      3/-  退费       : 重新加入
                    设计取舍：合同结束/退费 学员都走「重新加入」复用同一 RenewContractModal +
                    reactivateAccount=true 链路；2/1 必须先解冻避免冻结状态下意外续费。
                  -->
                  <a-menu @click="({ key }: { key: string }) => handleStudentAction(key as StudentActionKey, record)">
                    <a-menu-item key="resetPassword">重置密码</a-menu-item>
                    <template v-if="isRefundedStatus(record)">
                      <a-menu-item key="rejoin"><span style="color: var(--success)">重新加入</span></a-menu-item>
                    </template>
                    <template v-else-if="isFrozen(record)">
                      <a-menu-item key="unfreeze"><span style="color: var(--success)">解冻</span></a-menu-item>
                      <a-menu-item v-if="!isEndedStatus(record)" key="end_contract">结束合同</a-menu-item>
                      <a-menu-item v-if="!isEndedStatus(record)" key="refund"><span style="color: var(--danger)">退费</span></a-menu-item>
                    </template>
                    <template v-else-if="isEndedStatus(record)">
                      <a-menu-item key="freeze">冻结</a-menu-item>
                      <a-menu-item key="rejoin"><span style="color: var(--success)">重新加入</span></a-menu-item>
                    </template>
                    <template v-else>
                      <a-menu-item key="freeze">冻结</a-menu-item>
                      <a-menu-item key="end_contract">结束合同</a-menu-item>
                      <a-menu-item key="blacklist"><span style="color: #92400E">加入黑名单</span></a-menu-item>
                      <a-menu-item key="refund"><span style="color: var(--danger)">退费</span></a-menu-item>
                    </template>
                  </a-menu>
                </template>
              </a-dropdown>
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
      :reactivate-account="renewContractReactivate"
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
  updateContract,
  type ContractDetailPayload,
  type ContractListItem,
  type UpdateContractPayload,
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

// 批次 7 + 7.5：拆 frozen 独立维度后菜单结构按 §13.4 重组。
// rejoin 走「续签合同弹窗 + reactivateAccount=true」路径，不需经 status modal。
type StudentActionKey =
  | 'detail'
  | 'edit'
  | 'resetPassword'
  | 'freeze'
  | 'unfreeze'
  | 'restore'
  | 'blacklist'
  | 'refund'
  | 'end_contract'
  | 'rejoin'
type StudentStatusAction = Extract<StudentActionKey, 'freeze' | 'unfreeze' | 'restore' | 'refund' | 'end_contract'>

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
// 批次 7.5：true 时 RenewContractModal 走「重新加入」入口（提交时附 reactivateAccount=true）
const renewContractReactivate = ref(false)
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
  { key: 'normal', label: '正常列表' },
  { key: 'blacklist', label: '黑名单' }
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
  showTotal: (total: number) => `共 ${total} 条记录`
}))
const emptyStateText = computed(() =>
  selectedTab.value === 'blacklist' ? '暂无黑名单学员' : '暂无学员数据'
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
      throw new Error(`导出请求失败 (HTTP ${response.status})`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const errJson = await response.json().catch(() => null)
      throw new Error(errJson?.msg || '导出请求未通过认证，请重新登录')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    message.success('学员列表导出成功')
  } catch (error) {
    console.error('[student export] failed:', error)
    const reason = error instanceof Error && error.message ? error.message : ''
    message.error('学员列表导出失败' + (reason ? `：${reason}` : ''))
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
    message.warning('学员详情加载失败，已使用列表数据打开编辑弹窗')
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
      message.warning('当前学员暂无可续签的原合同')
      return
    }
    renewContractPreset.value = preset
    renewContractReactivate.value = false
    renewContractVisible.value = true
  } catch (_error) {
    message.error('加载合同续签上下文失败')
  } finally {
    renewContractLoadingId.value = null
  }
}

// 批次 7.5「重新加入」：退费学员复用续签合同弹窗，提交时附 reactivateAccount=true。
// 即便无 active 合同也允许（renewContract 创建 contractType='renew' 新合同）。
// 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.6
const openStudentRejoin = async (record: StudentListItem) => {
  try {
    renewContractLoadingId.value = record.studentId
    selectedStudent.value = record
    let preset: ContractListItem | null = null
    try {
      const payload = await getStudentContractDetail(record.studentId)
      preset = buildRenewPreset(record, payload)
    } catch (_) {
      preset = null
    }
    // 没有任何历史合同也允许重新加入（创建首份续签合同）
    renewContractPreset.value =
      preset ?? ({
        contractId: 0,
        contractNo: '',
        studentId: record.studentId,
        studentName: record.studentName,
        contractType: 'renew',
        contractAmount: 0,
        totalHours: 0,
        startDate: '',
        endDate: '',
        contractStatus: '',
      } as ContractListItem)
    renewContractReactivate.value = true
    renewContractVisible.value = true
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
  message.info('当前没有可查看的待审核学员')
}

const handleDetailEditRequest = async (studentId: number) => {
  const matchedRecord = studentList.value.find((record) => record.studentId === studentId)
  if (!matchedRecord) {
    message.warning('未找到学员信息，暂时无法进入编辑弹窗')
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
  const wasRejoin = renewContractReactivate.value
  renewContractReactivate.value = false
  await loadStudentList()
  if (wasRejoin) {
    message.success('学员已通过续签合同重新加入')
  }
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

const handleEditStudentSubmit = async (
  payload: UpdateStudentPayload,
  contractPatch?: { contractId: number; payload: UpdateContractPayload }
) => {
  try {
    editingStudent.value = true
    const updated = await updateStudent(payload)
    // 学员主体保存成功后，再保存合同变更（仅当存在 patch）
    let contractError: unknown = null
    if (contractPatch) {
      try {
        await updateContract(contractPatch.contractId, contractPatch.payload)
      } catch (err) {
        contractError = err
      }
    }
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
    if (contractError) {
      const detail = (contractError as { message?: string })?.message || '请重试'
      message.warning(`学员信息已更新，但合同更新失败：${detail}`)
    } else {
      message.success(contractPatch ? '学员信息与合同已更新' : '学员信息已更新')
    }
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

// 批次 7 + 7.5：frozen 是与 accountStatus 维度正交的独立标记。
// 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.2
const isFrozen = (record: StudentListItem) => {
  const value = (record as StudentListItem & { frozen?: number }).frozen
  return value === 1 || (value as unknown as string) === '1'
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

  if (action === 'freeze' || action === 'unfreeze' || action === 'restore' || action === 'refund' || action === 'end_contract') {
    selectedStudent.value = record
    pendingStatusAction.value = action
    statusChangeVisible.value = true
    return
  }

  if (action === 'rejoin') {
    void openStudentRejoin(record)
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

const formatJobApplications = (_record: StudentListItem) => {
  return '暂无投递'
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
  if (d.includes('金融') || d.includes('finance')) return 'purple'
  if (d.includes('咨询') || d.includes('consulting')) return 'blue'
  if (d.includes('科技') || d.includes('tech')) return 'orange'
  if (d.includes('量化') || d.includes('quant')) return 'cyan'
  return 'purple'
}

const getReminderTagColor = (reminder?: string) => {
  if (!reminder || reminder === '-' || reminder === '暂无提醒') return 'default'
  if (reminder.includes('待审核')) return 'red'
  if (reminder.includes('课时')) return 'red'
  if (reminder.includes('到期')) return 'orange'
  return 'blue'
}

// 批次 7 + 7.5：lifecycle 维度只保留 0/2/3。「1 冻结」改用独立 frozen 标记，
// 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.2 / §13.3
const getLifecycleTagColor = (status?: string) => {
  switch (status) {
    case '2': return 'default'
    case '3': return 'red'
    default: return 'green'
  }
}

const getLifecycleLabel = (status?: string) => {
  switch (status) {
    case '2': return '合同结束'
    case '3': return '退费'
    default: return '正常'
  }
}

const getStatusNote = (record: StudentListItem) => {
  if (isRefundedStatus(record)) {
    return '已退费'
  }
  if (isFrozen(record)) {
    return isEndedStatus(record) ? '合同结束 · 冻结' : '账号已冻结'
  }
  if (isEndedStatus(record)) {
    return '服务已结束'
  }
  if (isPendingReview(record) || isLowHours(record) || isContractExpiring(record)) {
    return '需优先跟进'
  }
  return '服务中'
}

const getReminderLabel = (record: StudentListItem) => {
  if (record.reminder && record.reminder !== '-') {
    return record.reminder
  }
  if (isPendingReview(record)) {
    return '待审核'
  }
  if (isLowHours(record)) {
    return '课时不足'
  }
  if (isContractExpiring(record)) {
    return '合同到期'
  }
  return '暂无提醒'
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

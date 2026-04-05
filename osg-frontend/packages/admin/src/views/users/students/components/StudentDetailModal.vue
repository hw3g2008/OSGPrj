<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="960px"
    :shell-class="'sdm-shell'"
    :body-class="'sdm-body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="sdm-header">
        <div class="sdm-header__avatar">{{ initials }}</div>
        <div class="sdm-header__info">
          <span class="sdm-header__name">{{ modalTitle }}</span>
          <div class="sdm-header__meta">
            ID: {{ detail?.studentId ?? '-' }} ·
            <span class="sdm-header__status-pill">{{ formatAccountStatus(detail?.accountStatus) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="!canView" class="sdm-guard">
      <span class="mdi mdi-shield-alert-outline" aria-hidden="true"></span>
      <div>
        <strong>当前角色无权查看学员详情</strong>
        <p>仅文员与超管允许打开学员详情弹窗。该限制会在组件接入列表页后直接生效。</p>
      </div>
    </div>

    <template v-else>
      <div class="sdm-note" data-content-part="supporting-text">
        <span class="mdi mdi-card-account-details-outline sdm-note__icon" aria-hidden="true"></span>
        <div class="sdm-note__copy">
          <strong>学员资料台账</strong>
          <p>可查看资料、信息变更和合同信息，并从这里继续进入编辑或续签流程。</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="sdm-tabs">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          type="button"
          :class="['sdm-tabs__item', { 'sdm-tabs__item--active': activeTab === tab.key }]"
          :aria-label="`学员详情弹窗${tab.label}`"
          :data-tab="tab.key"
          :data-tab-text="tab.label"
          @click="activeTab = tab.key"
        >
          <i :class="['mdi', tab.icon]" aria-hidden="true" style="margin-right:6px"></i>{{ tab.label }}
          <span v-if="tab.key === 'changes' && pendingChanges.length > 0" class="sdm-tabs__dot"></span>
        </button>
      </div>

      <div v-if="canView" class="sdm-quick-actions" data-content-part="student-detail-quick-actions">
        <button
          type="button"
          class="permission-button permission-button--outline sdm-quick-actions__renew"
          data-surface-trigger="modal-contract-renew"
          :data-surface-sample-key="`student-${detail?.studentId || studentId}-contract-renew`"
          @click="renewVisible = true"
        >
          合同续签
        </button>
        <button
          type="button"
          class="permission-button permission-button--outline"
          data-surface-trigger="modal-student-applications"
          @click="activeTab = 'applications'"
        >
          学员投递岗位
        </button>
      </div>

      <!-- Loading / Error -->
      <div v-if="loading" class="sdm-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载学员详情...</span>
      </div>
      <div v-else-if="loadError" class="sdm-error">
        <strong>详情加载失败</strong>
        <p>{{ loadError }}</p>
      </div>

      <!-- Tab 1: 基本信息 -->
      <div v-else-if="activeTab === 'profile'" class="sdm-content">
        <!-- 核心信息 -->
        <section class="sdm-section sdm-section--primary">
          <div class="sdm-section__badge sdm-badge--primary">核心信息</div>
          <div class="sdm-grid sdm-grid--4">
            <div class="sdm-field">
              <span class="sdm-field__label">英文姓名</span>
              <div class="sdm-field__value sdm-field__value--bold">{{ detail?.studentName || '-' }}</div>
            </div>
            <div class="sdm-field">
              <span class="sdm-field__label">性别</span>
              <div class="sdm-field__value">{{ formatGender(detail?.gender) }}</div>
            </div>
            <div class="sdm-field sdm-field--span2">
              <span class="sdm-field__label">邮箱</span>
              <div class="sdm-field__value">{{ detail?.email || '-' }}</div>
            </div>
          </div>
        </section>

        <!-- 导师配置 -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> 导师配置
          </div>
          <div class="sdm-grid sdm-grid--2">
            <div class="sdm-field sdm-field" data-field-name="班主任">
              <span class="sdm-field__label">班主任</span>
              <div class="sdm-field__pills">
                <span v-if="detail?.mentor?.leadMentorName" class="sdm-pill sdm-pill--indigo">{{ detail.mentor.leadMentorName }}</span>
                <span v-else class="sdm-field__value">{{ detail?.mentor?.leadMentorId ?? '-' }}</span>
              </div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="助教">
              <span class="sdm-field__label">助教</span>
              <div class="sdm-field__pills">
                <span v-if="detail?.mentor?.assistantName" class="sdm-pill sdm-pill--green">{{ detail.mentor.assistantName }}</span>
                <span v-else class="sdm-field__value">{{ detail?.mentor?.assistantId ?? '-' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 学业信息 -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--blue">
            <i class="mdi mdi-school" aria-hidden="true"></i> 学业信息
          </div>
          <div class="sdm-grid sdm-grid--4">
            <div class="sdm-field sdm-field" data-field-name="学校">
              <span class="sdm-field__label">学校</span>
              <div class="sdm-field__value">{{ detail?.school || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="专业">
              <span class="sdm-field__label">专业</span>
              <div class="sdm-field__value">{{ detail?.major || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="毕业年份">
              <span class="sdm-field__label">毕业年份</span>
              <div class="sdm-field__value">{{ detail?.graduationYear ?? '-' }}</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">高中</span>
              <div class="sdm-field__value">-</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">是否读研或延毕</span>
              <div class="sdm-field__value">{{ formatStudyPlan(detail?.academic?.studyPlan, detail?.academic?.deferredGraduation) }}</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">签证</span>
              <div class="sdm-field__value">-</div>
            </div>
          </div>
        </section>

        <!-- 求职方向 -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> 求职方向
          </div>
          <!-- 求职地区 -->
          <div class="sdm-field sdm-field" style="margin-bottom:12px" data-field-name="求职地区">
            <span class="sdm-field__label">求职地区</span>
            <div class="sdm-field__pills">
              <span v-if="detail?.jobDirection?.targetRegion || detail?.targetRegion" class="sdm-pill sdm-pill--green">
                {{ detail?.jobDirection?.targetRegion || detail?.targetRegion }}
              </span>
              <span v-else class="sdm-field__value">-</span>
            </div>
          </div>
          <!-- 招聘周期 -->
          <div class="sdm-field sdm-field" style="margin-bottom:12px" data-field-name="招聘周期">
            <span class="sdm-field__label">招聘周期</span>
            <div class="sdm-field__pills">
              <span
                v-for="cycle in (detail?.jobDirection?.recruitmentCycles || detail?.recruitmentCycles || [])"
                :key="cycle"
                class="sdm-pill sdm-pill--blue"
              >{{ cycle }}</span>
              <span v-if="!(detail?.jobDirection?.recruitmentCycles || detail?.recruitmentCycles || []).length" class="sdm-field__value">-</span>
            </div>
          </div>
          <!-- 主攻方向 + 子方向 -->
          <div class="sdm-grid sdm-grid--direction">
            <div class="sdm-field sdm-field sdm-field--bordered" data-field-name="主攻方向">
              <span class="sdm-field__label" style="color:var(--primary)">主攻方向</span>
              <div class="sdm-field__pills">
                <span
                  v-for="dir in (detail?.jobDirection?.majorDirections || detail?.majorDirections || [])"
                  :key="dir"
                  class="sdm-pill sdm-pill--purple"
                >{{ dir }}</span>
                <span v-if="!(detail?.jobDirection?.majorDirections || detail?.majorDirections || []).length" class="sdm-field__value">-</span>
              </div>
            </div>
            <div class="sdm-field sdm-field sdm-field--bordered" data-field-name="子方向">
              <span class="sdm-field__label" style="color:var(--primary)">子方向</span>
              <div class="sdm-field__pills">
                <span class="sdm-pill sdm-pill--sub">{{ detail?.jobDirection?.subDirection || detail?.subDirection || '-' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 联系方式 -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> 联系方式
          </div>
          <div class="sdm-grid sdm-grid--3">
            <div class="sdm-field sdm-field" data-field-name="电话">
              <span class="sdm-field__label">电话</span>
              <div class="sdm-field__value">{{ detail?.contact?.phone || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="微信">
              <span class="sdm-field__label">微信</span>
              <div class="sdm-field__value">{{ detail?.contact?.wechat || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="账号状态">
              <span class="sdm-field__label">账号状态</span>
              <div>
                <span :class="['sdm-status-tag', `sdm-status-tag--${statusColor}`]">
                  {{ formatAccountStatus(detail?.accountStatus) }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Tab 2: 信息变更 -->
      <ChangeReviewTab
        v-else-if="activeTab === 'changes'"
        :pending-changes="pendingChanges"
        :history-changes="historyChanges"
        @approve="handleChangeDecision('approve', $event)"
        @reject="handleChangeDecision('reject', $event)"
      />

      <!-- Tab 3: 合同信息 -->
      <ContractTab
        v-else
        :summary="contractSummary"
        :contracts="contracts"
      />
    </template>

    <template #footer>
      <button
        type="button"
        class="sdm-footer-button sdm-footer-button--ghost"
        @click="handleClose"
      >
        取消
      </button>
      <button
        v-if="canView && studentId"
        type="button"
        class="sdm-footer-button sdm-footer-button--primary"
        data-surface-trigger="modal-edit-student-new"
        @click="handleRequestEdit"
      >
        编辑学员
      </button>
    </template>
  </OverlaySurfaceModal>

  <RenewContractModal
    v-model:visible="renewVisible"
    :student-options="[]"
    :preset-contract="latestContract"
    @submitted="handleContractRenewed"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { http } from '@osg/shared/utils/request'
import {
  getStudentChangeRequestList,
  type StudentChangeRequestItem
} from '@osg/shared/api/admin/studentChangeRequest'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import ChangeReviewTab from './ChangeReviewTab.vue'
import ContractTab from './ContractTab.vue'
import RenewContractModal from '../../contracts/components/RenewContractModal.vue'
import type { ContractListItem } from '@osg/shared/api/admin/contract'

interface StudentContact {
  email?: string
  wechat?: string
  phone?: string
}

interface StudentMentor {
  leadMentorId?: number
  leadMentorName?: string
  assistantId?: number
  assistantName?: string
}

interface StudentAcademic {
  studyPlan?: string
  deferredGraduation?: string
}

interface StudentJobDirection {
  targetRegion?: string
  recruitmentCycles?: string[]
  majorDirections?: string[]
  subDirection?: string
}

interface StudentDetailPayload {
  studentId: number
  studentName: string
  email?: string
  gender?: string
  school?: string
  major?: string
  graduationYear?: number
  targetRegion?: string
  subDirection?: string
  accountStatus?: string
  recruitmentCycles?: string[]
  majorDirections?: string[]
  contact?: StudentContact
  mentor?: StudentMentor
  academic?: StudentAcademic
  jobDirection?: StudentJobDirection
}

interface ContractSummary {
  totalAmount: number
  totalHours: number
  remainingHours: number
  usedHours: number
}

interface ContractRow {
  contractId: number
  contractNo: string
  contractType?: string
  contractAmount?: number
  totalHours?: number
  remainingHours?: number
  usedHours?: number
  startDate?: string
  endDate?: string
  contractStatus?: string
  renewalReason?: string
  attachmentPath?: string
  updateTime?: string
}

interface ContractPayload {
  studentId: number
  summary: ContractSummary
  contracts: ContractRow[]
}

interface ChangeItem {
  id: string | number
  field: string
  before: string
  after: string
  requestedAt: string
  requestedBy: string
  note?: string
  status?: string
  requestId?: number
  changeType?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  studentId?: number | null
  studentName?: string
  surfaceId?: string
  canView?: boolean
}>(), {
  studentId: null,
  studentName: '',
  surfaceId: 'modal-student-detail-new',
  canView: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'request-edit': [studentId: number]
  'review-updated': []
}>()

const tabDefs = [
  { key: 'profile', label: '基本信息', icon: 'mdi-account' },
  { key: 'changes', label: '信息变更', icon: 'mdi-bell-ring' },
  { key: 'contracts', label: '合同信息', icon: 'mdi-file-sign' }
] as const

const tabs = tabDefs

const activeTab = ref<(typeof tabs)[number]['key']>('profile')
const loading = ref(false)
const loadError = ref('')
const detail = ref<StudentDetailPayload | null>(null)
const contractPayload = ref<ContractPayload | null>(null)
const pendingChanges = ref<ChangeItem[]>([])
const historyChanges = ref<ChangeItem[]>([])

const fallbackStudentName = computed(() => props.studentName || '学员详情')
const modalTitle = computed(() => detail.value?.studentName || fallbackStudentName.value)
const firstDirectionLabel = computed(() => {
  const directions = detail.value?.jobDirection?.majorDirections || detail.value?.majorDirections || []
  return directions[0] || '方向待补充'
})

const initials = computed(() => {
  const name = detail.value?.studentName || props.studentName || ''
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
})

const statusColor = computed(() => {
  switch (detail.value?.accountStatus) {
    case '1': return 'frozen'
    case '2': return 'ended'
    case '3': return 'refunded'
    default: return 'normal'
  }
})

const contractSummary = computed<ContractSummary>(() => ({
  totalAmount: Number(contractPayload.value?.summary?.totalAmount || 0),
  totalHours: Number(contractPayload.value?.summary?.totalHours || 0),
  remainingHours: Number(contractPayload.value?.summary?.remainingHours || 0),
  usedHours: Number(contractPayload.value?.summary?.usedHours || 0)
}))

const contracts = computed(() => contractPayload.value?.contracts || [])
const renewVisible = ref(false)

const contractSortScore = (contract: ContractRow & {
  leadMentorId?: number
  leadMentorName?: string
  attachmentPath?: string
  updateTime?: string
}) => {
  const isActive = contract.contractStatus === 'active' ? 1 : 0
  const endTime = contract.endDate ? new Date(contract.endDate).getTime() : 0
  const updateTime = contract.updateTime ? new Date(contract.updateTime).getTime() : 0
  return [isActive, endTime, updateTime] as const
}

const latestContract = computed<ContractListItem | null>(() => {
  const contract = [...(contractPayload.value?.contracts || [])]
    .sort((left, right) => {
      const [leftActive, leftEnd, leftUpdate] = contractSortScore(left)
      const [rightActive, rightEnd, rightUpdate] = contractSortScore(right)
      if (rightActive !== leftActive) return rightActive - leftActive
      if (rightEnd !== leftEnd) return rightEnd - leftEnd
      return rightUpdate - leftUpdate
    })[0] as (ContractRow & {
      leadMentorId?: number
      leadMentorName?: string
      attachmentPath?: string
      updateTime?: string
    }) | undefined

  if (!contract || !detail.value?.studentId || !detail.value?.studentName) {
    return null
  }

  return {
    contractId: contract.contractId,
    contractNo: contract.contractNo || `CONTRACT-${contract.contractId}`,
    studentId: detail.value.studentId,
    studentName: detail.value.studentName,
    leadMentorId: contract.leadMentorId,
    leadMentorName: contract.leadMentorName,
    contractType: contract.contractType || 'renew',
    contractAmount: Number(contract.contractAmount || 0),
    totalHours: Number(contract.totalHours || 0),
    usedHours: Number(contract.usedHours || 0),
    remainingHours: Number(contract.remainingHours ?? contract.totalHours ?? 0),
    startDate: contract.startDate || '',
    endDate: contract.endDate || '',
    renewalReason: contract.renewalReason,
    contractStatus: contract.contractStatus || 'active',
    attachmentPath: contract.attachmentPath,
    updateTime: contract.updateTime,
  }
})

const loadStudentDetail = async () => {
  if (!props.visible || !props.studentId || !props.canView) {
    detail.value = null
    contractPayload.value = null
    pendingChanges.value = []
    historyChanges.value = []
    return
  }

  try {
    loading.value = true
    loadError.value = ''
    const [detailRes, contractRes, changeRequestRes] = await Promise.all([
      http.get<StudentDetailPayload>(`/admin/student/${props.studentId}`),
      http.get<ContractPayload>(`/admin/student/${props.studentId}/contracts`),
      getStudentChangeRequestList(props.studentId)
    ])
    detail.value = detailRes
    contractPayload.value = contractRes
    hydrateChangeRequests(changeRequestRes)
  } catch (error) {
    loadError.value = '请稍后重试，或检查学员详情接口是否可用。'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.studentId, props.canView] as const,
  async ([visible]) => {
    if (visible) {
      activeTab.value = 'profile'
    }
    await loadStudentDetail()
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleRequestEdit = () => {
  if (!props.studentId) {
    return
  }
  emit('request-edit', props.studentId)
}

const handleContractRenewed = async () => {
  await loadStudentDetail()
}

const handleChangeDecision = async () => {
  await loadStudentDetail()
  emit('review-updated')
}

const hydrateChangeRequests = (payload?: { rows?: StudentChangeRequestItem[] }) => {
  const rows = payload?.rows || []
  pendingChanges.value = rows
    .filter((item) => item.status === 'pending')
    .map(mapChangeRequestItem)
  historyChanges.value = rows
    .filter((item) => item.status !== 'pending')
    .map(mapChangeRequestItem)
}

const mapChangeRequestItem = (item: StudentChangeRequestItem): ChangeItem => {
  const requestId = item.requestId
  return {
    id: requestId ?? `${item.fieldKey || 'change'}-${item.requestedAt || 'unknown'}`,
    requestId,
    field: item.fieldLabel || item.fieldKey || '未命名字段',
    before: item.beforeValue || '-',
    after: item.afterValue || '-',
    requestedAt: formatTimestamp(item.requestedAt),
    requestedBy: item.requestedBy || '系统',
    note: item.remark || undefined,
    status: item.status,
    changeType: item.changeType || undefined
  }
}

const formatTimestamp = (value?: string) => {
  if (!value) {
    return '-'
  }
  return value.replace('T', ' ').replace(/Z$/, '')
}

const formatList = (items?: string[]) => {
  if (!items?.length) {
    return '-'
  }
  return items.join(' / ')
}

const formatGender = (gender?: string) => {
  switch (gender) {
    case '0':
      return '男'
    case '1':
      return '女'
    default:
      return '-'
  }
}

const formatAccountStatus = (status?: string) => {
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

const formatStudyPlan = (studyPlan?: string, deferredGraduation?: string) => {
  if (deferredGraduation && deferredGraduation !== 'false') {
    return '延毕'
  }
  switch (studyPlan) {
    case 'postgraduate':
    case 'true':
      return '读研'
    case 'deferred':
      return '延毕'
    case 'normal':
      return '正常毕业'
    default:
      return '正常毕业'
  }
}

const formatCurrency = (value?: number) => {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
</script>

<style scoped lang="scss">
:global([data-surface-id="modal-student-detail-new"] [data-surface-part="header"]),
:global([data-surface-id="modal-student-detail-bob"] [data-surface-part="header"]) {
  background: #fff !important;
  border-bottom: 1px solid rgba(79, 116, 255, 0.1) !important;
}

:global([data-surface-id="modal-student-detail-new"] .overlay-surface-modal__close),
:global([data-surface-id="modal-student-detail-bob"] .overlay-surface-modal__close) {
  background: #f5f7ff !important;
  color: #69758b !important;

  &:hover {
    background: #eef2ff !important;
    color: #4f74ff !important;
  }
}

.sdm-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sdm-header__avatar {
  width: 44px;
  height: 44px;
  background: #edf2ff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #4f74ff;
  flex-shrink: 0;
}

.sdm-header__name {
  display: block;
  color: #1a2234;
  font-size: 18px;
  font-weight: 700;
}

.sdm-header__meta {
  font-size: 13px;
  color: #69758b;
  margin-top: 4px;
}

.sdm-header__status-pill {
  display: inline-block;
  background: rgba(79, 116, 255, 0.12);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #3f68ff;
}

.sdm-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 18px 24px 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
}

.sdm-note__icon {
  font-size: 18px;
  line-height: 1;
}

.sdm-note__copy {
  strong {
    display: block;
    color: #3f68ff;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    margin: 4px 0 0;
    color: #546179;
    font-size: 13px;
    line-height: 1.6;
  }
}

/* ── Tabs ── */
.sdm-tabs {
  display: flex;
  margin-top: 18px;
  border-bottom: 1px solid var(--border, #E2E8F0);
  background: #f9fbff;
}

.sdm-tabs__item {
  flex: 1;
  padding: 14px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  color: var(--text2, #64748B);
  transition: color 0.2s, border-color 0.2s;
  position: relative;

  &--active {
    border-bottom-color: var(--primary, #6366F1);
    color: var(--primary, #6366F1);
  }

  &:hover:not(.sdm-tabs__item--active) {
    color: var(--text, #1E293B);
  }
}

.sdm-tabs__dot {
  position: absolute;
  top: 8px;
  right: 20%;
  width: 8px;
  height: 8px;
  background: var(--danger, #EF4444);
  border-radius: 50%;
}

.sdm-quick-actions {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px 0;
}

.sdm-quick-actions__renew {
  min-width: 120px;
}

/* ── Loading / Error / Guard ── */
.sdm-guard,
.sdm-loading,
.sdm-error {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
  border-radius: 12px;
  padding: 18px 20px;
  margin: 24px;
  background: linear-gradient(160deg, #fff7ed 0%, #ffedd5 100%);
  color: #7c2d12;

  .mdi { font-size: 22px; }
}

/* ── Content container ── */
.sdm-content {
  display: grid;
  gap: 20px;
  padding: 24px;
}

/* ── Section cards ── */
.sdm-section {
  background: #fff;
  border: 1px solid rgba(79, 116, 255, 0.1);
  border-radius: 16px;
  padding: 18px;
}

.sdm-section--primary {
  border-color: rgba(79, 116, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(79, 116, 255, 0.06);
}

/* ── Section badges ── */
.sdm-section__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 16px;
}

.sdm-badge--primary {
  background: #edf2ff;
  color: #3f68ff;
}

.sdm-badge--indigo {
  background: #edf2ff;
  color: #3f68ff;
}

.sdm-badge--blue {
  background: #eef6ff;
  color: #3f68ff;
}

.sdm-badge--amber {
  background: #fff2db;
  color: #c56a26;
}

.sdm-badge--green {
  background: #ebfbf2;
  color: #2f8f62;
}

/* ── Grid layouts ── */
.sdm-grid {
  display: grid;
  gap: 16px;
}

.sdm-grid--4 { grid-template-columns: repeat(4, 1fr); }
.sdm-grid--3 { grid-template-columns: repeat(3, 1fr); }
.sdm-grid--2 { grid-template-columns: repeat(2, 1fr); }
.sdm-grid--direction { grid-template-columns: 1fr 2fr; }

/* ── Field cells ── */
.sdm-field {
  background: #f9fbff;
  padding: 12px;
  border-radius: 14px;
}

.sdm-field--bordered {
  border: 1px solid rgba(79, 116, 255, 0.12);
}

.sdm-field--span2 {
  grid-column: span 2;
}

.sdm-field__label {
  display: block;
  color: var(--muted, #94A3B8);
  font-size: 11px;
  margin-bottom: 4px;
}

.sdm-field__value {
  font-size: 14px;
  color: #0F172A;
}

.sdm-field__value--bold {
  font-weight: 600;
  font-size: 15px;
}

.sdm-field__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ── Pill tags ── */
.sdm-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.sdm-pill--indigo {
  background: #E0E7FF;
  color: #4338CA;
}

.sdm-pill--green {
  background: #D1FAE5;
  color: #065F46;
}

.sdm-pill--blue {
  background: #DBEAFE;
  color: #1E40AF;
}

.sdm-pill--purple {
  background: var(--primary-light, #EEF2FF);
  color: var(--primary-dark, #4F46E5);
}

.sdm-pill--sub {
  background: #EFF6FF;
  color: #1E40AF;
  padding: 4px 10px;
  border-radius: 6px;
}

/* ── Status tag ── */
.sdm-status-tag {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.sdm-status-tag--normal {
  background: #D1FAE5;
  color: #065F46;
}

.sdm-status-tag--frozen {
  background: #DBEAFE;
  color: #1E40AF;
}

.sdm-status-tag--ended {
  background: #F3F4F6;
  color: #6B7280;
}

.sdm-status-tag--refunded {
  background: #FEE2E2;
  color: #991B1B;
}

/* ── Footer buttons ── */
.sdm-footer-button {
  min-width: 112px;
  border-radius: 14px;
  padding: 11px 20px;
  font-weight: 600;
  cursor: pointer;
}

.sdm-footer-button--ghost {
  border: 1px solid rgba(26, 34, 52, 0.12);
  background: #fff;
  color: #69758b;
}

.sdm-footer-button--primary {
  border: 0;
  background: linear-gradient(135deg, #3f68ff, #6788ff);
  color: #fff;
  box-shadow: 0 16px 34px rgba(79, 116, 255, 0.22);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .sdm-grid--4,
  .sdm-grid--3,
  .sdm-grid--direction {
    grid-template-columns: 1fr 1fr;
  }

  .sdm-grid--2 {
    grid-template-columns: 1fr;
  }

  .sdm-field--span2 {
    grid-column: span 1;
  }
}
</style>

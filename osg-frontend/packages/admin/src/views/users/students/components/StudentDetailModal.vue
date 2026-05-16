<template>
  <OverlaySurfaceModal
    :open="visible"
    :surface-id="surfaceId"
    width="960px"
    :shell-class="'sdm-shell'"
    :body-class="'sdm-body osg-modal-form'"
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
        <strong>{{ t('admin.students.detailModal.guardTitle') }}</strong>
        <p>{{ t('admin.students.detailModal.guardDesc') }}</p>
      </div>
    </div>

    <template v-else>
      <div class="sdm-overview" data-content-part="student-detail-overview">
        <article class="sdm-overview__card">
          <span class="sdm-overview__label">{{ t('admin.students.detailModal.overview.accountStatus') }}</span>
          <strong class="sdm-overview__value">{{ formatAccountStatus(detail?.accountStatus) }}</strong>
        </article>
        <article class="sdm-overview__card">
          <span class="sdm-overview__label">{{ t('admin.students.detailModal.overview.targetRegion') }}</span>
          <strong class="sdm-overview__value">{{ targetRegionPills.length ? targetRegionPills.join(' / ') : '-' }}</strong>
        </article>
        <article class="sdm-overview__card">
          <span class="sdm-overview__label">{{ t('admin.students.detailModal.overview.recruitmentCycle') }}</span>
          <strong class="sdm-overview__value">{{ recruitmentCyclePills.length ? recruitmentCyclePills.join(' / ') : '-' }}</strong>
        </article>
        <article class="sdm-overview__card">
          <span class="sdm-overview__label">{{ t('admin.students.detailModal.overview.remainingHours') }}</span>
          <strong class="sdm-overview__value">{{ contractSummary.remainingHours }}h</strong>
        </article>
      </div>

      <!-- Tabs -->
      <div class="sdm-tabs">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          type="button"
          :class="['sdm-tabs__item', { 'sdm-tabs__item--active': activeTab === tab.key }]"
          :aria-label="t('admin.students.detailModal.tabAriaLabelPrefix') + tab.label"
          :data-tab="tab.key"
          :data-tab-text="tab.label"
          @click="activeTab = tab.key"
        >
          <i :class="['mdi', tab.icon]" aria-hidden="true" style="margin-right:6px"></i>{{ tab.label }}
          <span v-if="tab.key === 'changes' && pendingChanges.length > 0" class="sdm-tabs__dot"></span>
        </button>
      </div>

      <div v-if="canView" class="sdm-quick-actions" data-content-part="student-detail-quick-actions">
        <a-button
          data-surface-trigger="modal-contract-renew"
          :data-surface-sample-key="`student-${detail?.studentId || studentId}-contract-renew`"
          @click="renewVisible = true"
        >
          {{ t('admin.students.detailModal.quickActions.renew') }}
        </a-button>
        <a-button @click="activeTab = 'changes'">{{ t('admin.students.detailModal.quickActions.changes') }}</a-button>
        <a-button @click="activeTab = 'contracts'">{{ t('admin.students.detailModal.quickActions.contracts') }}</a-button>
      </div>

      <!-- Loading / Error -->
      <div v-if="loading" class="sdm-loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>{{ t('admin.students.detailModal.loading') }}</span>
      </div>
      <div v-else-if="loadError" class="sdm-error">
        <strong>{{ t('admin.students.detailModal.loadError.title') }}</strong>
        <p>{{ loadError }}</p>
      </div>

      <!-- Tab 1: Profile -->
      <div v-else-if="activeTab === 'profile'" class="sdm-content">
        <!-- Core Info -->
        <section class="sdm-section sdm-section--primary">
          <div class="sdm-section__badge sdm-badge--primary">{{ t('admin.students.detailModal.sections.coreInfo') }}</div>
          <div class="sdm-grid sdm-grid--4">
            <div class="sdm-field">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.englishName') }}</span>
              <div class="sdm-field__value sdm-field__value--bold">{{ detail?.studentName || '-' }}</div>
            </div>
            <div class="sdm-field">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.gender') }}</span>
              <div class="sdm-field__value">{{ formatGender(detail?.gender) }}</div>
            </div>
            <div class="sdm-field sdm-field--span2">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.email') }}</span>
              <div class="sdm-field__value">{{ detail?.email || '-' }}</div>
            </div>
          </div>
        </section>

        <!-- Mentor Config -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--indigo">
            <i class="mdi mdi-account-group" aria-hidden="true"></i> {{ t('admin.students.detailModal.sections.mentorConfig') }}
          </div>
          <div class="sdm-grid sdm-grid--2">
            <div class="sdm-field sdm-field" data-field-name="班主任"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.leadMentor') }}</span>
              <div class="sdm-field__pills">
                <template v-if="leadMentorPillNames.length">
                  <span
                    v-for="(name, idx) in leadMentorPillNames"
                    :key="`lead-${idx}-${name}`"
                    class="sdm-pill sdm-pill--indigo"
                  >{{ name }}</span>
                </template>
                <span v-else class="sdm-field__value">-</span>
              </div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="助教"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.assistant') }}</span>
              <div class="sdm-field__pills">
                <template v-if="assistantPillNames.length">
                  <span
                    v-for="(name, idx) in assistantPillNames"
                    :key="`asst-${idx}-${name}`"
                    class="sdm-pill sdm-pill--green"
                  >{{ name }}</span>
                </template>
                <span v-else class="sdm-field__value">-</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Academic Info -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--blue">
            <i class="mdi mdi-school" aria-hidden="true"></i> {{ t('admin.students.detailModal.sections.academicInfo') }}
          </div>
          <div class="sdm-grid sdm-grid--4">
            <div class="sdm-field sdm-field" data-field-name="学校"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.school') }}</span>
              <div class="sdm-field__pills">
                <template v-if="schoolPills.length">
                  <span
                    v-for="(name, idx) in schoolPills"
                    :key="`school-${idx}-${name}`"
                    class="sdm-pill sdm-pill--blue"
                  >{{ name }}</span>
                </template>
                <span v-else class="sdm-field__value">-</span>
              </div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="专业"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.major') }}</span>
              <div class="sdm-field__value">{{ detail?.major || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="毕业年月"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.graduationMonth') }}</span>
              <div class="sdm-field__value">{{ detail?.graduationMonth || (detail?.graduationYear ? `${detail.graduationYear}-06` : '-') }}</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.highSchool') }}</span>
              <div class="sdm-field__value">{{ detail?.academic?.highSchool || detail?.highSchool || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.studyPlan') }}</span>
              <div class="sdm-field__value">{{ formatStudyPlan(detail?.academic?.studyPlan, detail?.academic?.deferredGraduation) }}</div>
            </div>
            <div class="sdm-field sdm-field">
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.visa') }}</span>
              <div class="sdm-field__value">{{ visaLabel }}</div>
            </div>
          </div>
        </section>

        <!-- Career Direction -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--amber">
            <i class="mdi mdi-target" aria-hidden="true"></i> {{ t('admin.students.detailModal.sections.careerDirection') }}
          </div>
          <!-- Target Region -->
          <div class="sdm-field sdm-field" style="margin-bottom:12px" data-field-name="求职地区"> <!-- i18n-skip-line: playwright selector -->
            <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.targetRegion') }}</span>
            <div class="sdm-field__pills">
              <template v-if="targetRegionPills.length">
                <span v-for="(name, idx) in targetRegionPills" :key="`region-${idx}-${name}`" class="sdm-pill sdm-pill--green">{{ name }}</span>
              </template>
              <span v-else class="sdm-field__value">-</span>
            </div>
          </div>
          <!-- Recruitment Cycle -->
          <div class="sdm-field sdm-field" style="margin-bottom:12px" data-field-name="招聘周期"> <!-- i18n-skip-line: playwright selector -->
            <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.recruitmentCycle') }}</span>
            <div class="sdm-field__pills">
              <template v-if="recruitmentCyclePills.length">
                <span v-for="(name, idx) in recruitmentCyclePills" :key="`cycle-${idx}-${name}`" class="sdm-pill sdm-pill--blue">{{ name }}</span>
              </template>
              <span v-else class="sdm-field__value">-</span>
            </div>
          </div>
          <!-- Major + Sub Directions -->
          <div class="sdm-grid sdm-grid--direction">
            <div class="sdm-field sdm-field sdm-field--bordered" data-field-name="主攻方向"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label" style="color:var(--primary)">{{ t('admin.students.detailModal.fields.majorDirections') }}</span>
              <div class="sdm-field__pills">
                <template v-if="majorDirectionPills.length">
                  <span v-for="(name, idx) in majorDirectionPills" :key="`mdir-${idx}-${name}`" class="sdm-pill sdm-pill--purple">{{ name }}</span>
                </template>
                <span v-else class="sdm-field__value">-</span>
              </div>
            </div>
            <div class="sdm-field sdm-field sdm-field--bordered" data-field-name="子方向"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label" style="color:var(--primary)">{{ t('admin.students.detailModal.fields.subDirections') }}</span>
              <div class="sdm-field__pills">
                <template v-if="subDirectionPills.length">
                  <span v-for="(name, idx) in subDirectionPills" :key="`sdir-${idx}-${name}`" class="sdm-pill sdm-pill--sub">{{ name }}</span>
                </template>
                <span v-else class="sdm-field__value">-</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Contact Info -->
        <section class="sdm-section">
          <div class="sdm-section__badge sdm-badge--green">
            <i class="mdi mdi-phone" aria-hidden="true"></i> {{ t('admin.students.detailModal.sections.contact') }}
          </div>
          <div class="sdm-grid sdm-grid--3">
            <div class="sdm-field sdm-field" data-field-name="电话"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.phone') }}</span>
              <div class="sdm-field__value">{{ detail?.contact?.phone || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="微信"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.wechat') }}</span>
              <div class="sdm-field__value">{{ detail?.contact?.wechat || '-' }}</div>
            </div>
            <div class="sdm-field sdm-field" data-field-name="账号状态"> <!-- i18n-skip-line: playwright selector -->
              <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.accountStatus') }}</span>
              <div style="display: flex; flex-wrap: wrap; gap: 4px">
                <span :class="['sdm-status-tag', `sdm-status-tag--${statusColor}`]">
                  {{ formatAccountStatus(detail?.accountStatus) }}
                </span>
                <span
                  v-if="isFrozenDetail && detail?.accountStatus !== '3'"
                  class="sdm-status-tag sdm-status-tag--blue"
                  data-field-name="冻结标记" <!-- i18n-skip-line: playwright selector -->
                >{{ t('admin.students.detailModal.frozen') }}</span>
              </div>
            </div>
          </div>

          <div class="sdm-field sdm-field" data-field-name="备注" style="margin-top: 12px"> <!-- i18n-skip-line: playwright selector -->
            <span class="sdm-field__label">{{ t('admin.students.detailModal.fields.remark') }}</span>
            <div class="sdm-field__value" style="white-space: pre-wrap">{{ detail?.remark || '-' }}</div>
          </div>
        </section>
      </div>

      <!-- Tab 2: Change Review -->
      <ChangeReviewTab
        v-else-if="activeTab === 'changes'"
        :pending-changes="pendingChanges"
        :history-changes="historyChanges"
        @approve="handleChangeDecision('approve', $event)"
        @reject="handleChangeDecision('reject', $event)"
      />

      <!-- Tab 3: Contracts -->
      <ContractTab
        v-else
        :summary="contractSummary"
        :contracts="contracts"
      />
    </template>

    <template #footer>
      <a-button @click="handleClose">{{ t('admin.students.detailModal.footer.cancel') }}</a-button>
      <a-button
        v-if="canView && studentId"
        type="primary"
        data-surface-trigger="modal-edit-student-new"
        @click="handleRequestEdit"
      >
        {{ t('admin.students.detailModal.footer.edit') }}
      </a-button>
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
import { useI18n } from 'vue-i18n'
import { http } from '@osg/shared/utils/request'
import {
  getStudentChangeRequestList,
  type StudentChangeRequestItem
} from '@osg/shared/api/admin/studentChangeRequest'
import { OverlaySurfaceModal } from '@osg/shared/components'
import ChangeReviewTab from './ChangeReviewTab.vue'
import ContractTab from './ContractTab.vue'
import RenewContractModal from '../../contracts/components/RenewContractModal.vue'
import type { ContractListItem } from '@osg/shared/api/admin/contract'
import { getAdminDictOptions } from '@/api/adminDict'

const { t } = useI18n()

interface StudentContact {
  email?: string
  wechat?: string
  phone?: string
}

interface StudentMentor {
  leadMentorId?: number
  leadMentorName?: string
  leadMentorIds?: number[]
  leadMentorNames?: string[]
  assistantId?: number
  assistantName?: string
  assistantIds?: number[]
  assistantNames?: string[]
}

interface StudentAcademic {
  studyPlan?: string
  deferredGraduation?: string
  highSchool?: string
  visaStatus?: string
  postgraduatePlan?: string
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
  schools?: string[]
  major?: string
  graduationYear?: number
  graduationMonth?: string
  highSchool?: string
  visaStatus?: string
  targetRegion?: string
  subDirection?: string
  accountStatus?: string
  frozen?: number | string
  recruitmentCycles?: string[]
  majorDirections?: string[]
  contact?: StudentContact
  mentor?: StudentMentor
  academic?: StudentAcademic
  jobDirection?: StudentJobDirection
  remark?: string
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
  currency?: string
  amountUsd?: number
  amountGbp?: number
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

type TabKey = 'profile' | 'changes' | 'contracts'

const tabDefs = computed(() => [
  { key: 'profile' as TabKey, label: t('admin.students.detailModal.tabs.profile'), icon: 'mdi-account' },
  { key: 'changes' as TabKey, label: t('admin.students.detailModal.tabs.changes'), icon: 'mdi-bell-ring' },
  { key: 'contracts' as TabKey, label: t('admin.students.detailModal.tabs.contracts'), icon: 'mdi-file-sign' },
])

const activeTab = ref<TabKey>('profile')
const loading = ref(false)
const loadError = ref('')
const detail = ref<StudentDetailPayload | null>(null)
const contractPayload = ref<ContractPayload | null>(null)
const pendingChanges = ref<ChangeItem[]>([])
const historyChanges = ref<ChangeItem[]>([])

const fallbackStudentName = computed(() => props.studentName || t('admin.students.detailModal.fallbackName'))
const modalTitle = computed(() => detail.value?.studentName || fallbackStudentName.value)
const firstDirectionLabel = computed(() => {
  const directions = detail.value?.jobDirection?.majorDirections || detail.value?.majorDirections || []
  return directions[0] || t('admin.students.detailModal.directionFallback')
})

const initials = computed(() => {
  const name = detail.value?.studentName || props.studentName || ''
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
})

// dict: key → label maps (display official name instead of key)
type DictMap = Record<string, string>
const dictMaps = ref<{
  school: DictMap
  region: DictMap
  cycle: DictMap
  majorDir: DictMap
  subDir: DictMap
  visa: DictMap
}>({ school: {}, region: {}, cycle: {}, majorDir: {}, subDir: {}, visa: {} })

const loadDictMaps = async () => {
  const types: Array<[keyof typeof dictMaps.value, string]> = [
    ['school', 'osg_school'],
    ['region', 'osg_region'],
    ['cycle', 'osg_recruit_cycle'],
    ['majorDir', 'osg_major_direction'],
    ['subDir', 'osg_sub_direction'],
    ['visa', 'osg_visa_status'],
  ]
  await Promise.all(types.map(async ([key, type]) => {
    try {
      const items = await getAdminDictOptions(type)
      const map: DictMap = {}
      for (const it of items || []) {
        if (it?.dictValue != null) map[String(it.dictValue)] = it.dictLabel || String(it.dictValue)
      }
      dictMaps.value[key] = map
    } catch { /* ignore */ }
  }))
}

const labelize = (map: DictMap, value?: string | null) => {
  if (!value) return ''
  return map[value] || value
}

const splitCsv = (csv?: string) => csv ? csv.split(',').map(v => v.trim()).filter(Boolean) : []

const schoolPills = computed(() => {
  const arr = detail.value?.schools?.length
    ? detail.value.schools
    : splitCsv(detail.value?.school)
  return arr.map(v => labelize(dictMaps.value.school, v))
})

const targetRegionPills = computed(() => splitCsv(detail.value?.jobDirection?.targetRegion || detail.value?.targetRegion).map(v => labelize(dictMaps.value.region, v)))
const recruitmentCyclePills = computed(() => (detail.value?.jobDirection?.recruitmentCycles || detail.value?.recruitmentCycles || []).map(v => labelize(dictMaps.value.cycle, v)))
const majorDirectionPills = computed(() => (detail.value?.jobDirection?.majorDirections || detail.value?.majorDirections || []).map(v => labelize(dictMaps.value.majorDir, v)))
const subDirectionPills = computed(() => splitCsv(detail.value?.jobDirection?.subDirection || detail.value?.subDirection).map(v => labelize(dictMaps.value.subDir, v)))
const visaLabel = computed(() => labelize(dictMaps.value.visa, detail.value?.academic?.visaStatus || detail.value?.visaStatus) || '-')

const leadMentorPillNames = computed(() => {
  const names = detail.value?.mentor?.leadMentorNames || []
  if (names.length) return names.filter(Boolean)
  if (detail.value?.mentor?.leadMentorName) return [detail.value.mentor.leadMentorName]
  return []
})

const assistantPillNames = computed(() => {
  const names = detail.value?.mentor?.assistantNames || []
  if (names.length) return names.filter(Boolean)
  if (detail.value?.mentor?.assistantName) return [detail.value.mentor.assistantName]
  return []
})

// i18n-skip-line: dev comment — 批次 7 + 7.5：frozen 是独立维度
const isFrozenDetail = computed(() => {
  const value = detail.value?.frozen
  return value === 1 || value === '1'
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
    currency: contract.currency,
    amountUsd: Number(contract.amountUsd || 0),
    amountGbp: Number(contract.amountGbp || 0),
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
    loadError.value = t('admin.students.detailModal.loadError.retry')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.studentId, props.canView] as const,
  async ([visible]) => {
    if (visible) {
      activeTab.value = 'profile'
      void loadDictMaps()
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
    field: item.fieldLabel || t('admin.students.detailModal.fieldFallback'),
    before: item.beforeValue || '-',
    after: item.afterValue || '-',
    requestedAt: formatTimestamp(item.requestedAt),
    requestedBy: item.requestedBy || t('admin.students.detailModal.requestedBySystem'),
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
    case '0': return t('admin.students.detailModal.gender.male')
    case '1': return t('admin.students.detailModal.gender.female')
    default: return '-'
  }
}

const formatAccountStatus = (status?: string) => {
  switch (status) {
    case '1': return t('admin.students.detailModal.accountStatus.frozen')
    case '2': return t('admin.students.detailModal.accountStatus.ended')
    case '3': return t('admin.students.detailModal.accountStatus.refunded')
    default: return t('admin.students.detailModal.accountStatus.normal')
  }
}

const formatStudyPlan = (studyPlan?: string, deferredGraduation?: string) => {
  if (deferredGraduation && deferredGraduation !== 'false') {
    return t('admin.students.detailModal.studyPlan.deferred')
  }
  switch (studyPlan) {
    case 'postgraduate':
    case 'true':
      return t('admin.students.detailModal.studyPlan.postgraduate')
    case 'deferred':
      return t('admin.students.detailModal.studyPlan.deferred')
    case 'normal':
    default:
      return t('admin.students.detailModal.studyPlan.normal')
  }
}

const formatCurrency = (value?: number, currency: string = 'USD') => {
  const num = Number(value || 0)
  if (currency === 'GBP') return `£${num.toLocaleString()}`
  return `$${num.toLocaleString()}`
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

.sdm-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 24px 0;
}

.sdm-overview__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 72px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(79, 116, 255, 0.1);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.sdm-overview__label {
  color: #7c88a4;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sdm-overview__value {
  color: #1a2234;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
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
  gap: 10px;
  padding: 16px 24px 0;
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

/* frozen secondary tag alongside the lifecycle tag */
.sdm-status-tag--blue {
  background: #DBEAFE;
  color: #1E40AF;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .sdm-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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

  .sdm-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>

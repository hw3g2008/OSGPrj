<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="student-detail-modal"
    width="980px"
    :body-class="'student-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="student-detail-modal__title-wrap">
        <div>
          <span class="student-detail-modal__eyebrow">Student Detail</span>
          <div class="student-detail-modal__title">
            <span class="mdi mdi-account-box-outline" aria-hidden="true"></span>
            <span>{{ modalTitle }}</span>
          </div>
        </div>
        <button
          type="button"
          class="student-detail-modal__edit-button"
          :disabled="!studentId"
          @click="handleRequestEdit"
        >
          <span class="mdi mdi-pencil-outline" aria-hidden="true"></span>
          <span>前往编辑页</span>
        </button>
      </div>
    </template>

    <div v-if="!canView" class="student-detail-modal__guard">
      <span class="mdi mdi-shield-alert-outline" aria-hidden="true"></span>
      <div>
        <strong>当前角色无权查看学员详情</strong>
        <p>仅文员与超管允许打开学员详情弹窗。该限制会在组件接入列表页后直接生效。</p>
      </div>
    </div>

    <template v-else>
      <div class="student-detail-modal__hero">
        <div>
          <strong>{{ detail?.studentName || fallbackStudentName }}</strong>
          <p>{{ detail?.school || '学校待补充' }} · {{ detail?.major || '专业待补充' }}</p>
        </div>
        <div class="student-detail-modal__hero-tags">
          <span class="student-detail-modal__pill student-detail-modal__pill--accent">
            {{ formatAccountStatus(detail?.accountStatus) }}
          </span>
          <span class="student-detail-modal__pill">{{ detail?.targetRegion || '地区待补充' }}</span>
          <span class="student-detail-modal__pill">{{ firstDirectionLabel }}</span>
        </div>
      </div>

      <div class="student-detail-modal__stats">
        <article class="student-detail-modal__stat-card">
          <span>合同总额</span>
          <strong>{{ formatCurrency(contractSummary.totalAmount) }}</strong>
          <small>当前已归档合同金额汇总</small>
        </article>
        <article class="student-detail-modal__stat-card">
          <span>总课时</span>
          <strong>{{ contractSummary.totalHours }}h</strong>
          <small>含当前所有有效合同</small>
        </article>
        <article class="student-detail-modal__stat-card">
          <span>剩余课时</span>
          <strong>{{ contractSummary.remainingHours }}h</strong>
          <small>按已审核课时记录实时汇总</small>
        </article>
      </div>

      <div class="student-detail-modal__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="['student-detail-modal__tab', { 'student-detail-modal__tab--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.hint }}</small>
        </button>
      </div>

      <div v-if="loading" class="student-detail-modal__loading">
        <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
        <span>正在加载学员详情...</span>
      </div>

      <div v-else-if="loadError" class="student-detail-modal__error">
        <strong>详情加载失败</strong>
        <p>{{ loadError }}</p>
      </div>

      <div v-else-if="activeTab === 'profile'" class="student-detail-modal__content">
        <section class="student-detail-modal__panel">
          <header>
            <strong>核心信息</strong>
            <span>展示身份、联系方式与当前求职阶段</span>
          </header>
          <dl class="student-detail-modal__detail-grid">
            <div>
              <dt>英文姓名</dt>
              <dd>{{ detail?.studentName || '-' }}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{{ detail?.email || '-' }}</dd>
            </div>
            <div>
              <dt>性别</dt>
              <dd>{{ formatGender(detail?.gender) }}</dd>
            </div>
            <div>
              <dt>微信</dt>
              <dd>{{ detail?.contact?.wechat || '-' }}</dd>
            </div>
            <div>
              <dt>手机号</dt>
              <dd>{{ detail?.contact?.phone || '-' }}</dd>
            </div>
            <div>
              <dt>账号状态</dt>
              <dd>{{ formatAccountStatus(detail?.accountStatus) }}</dd>
            </div>
          </dl>
        </section>

        <section class="student-detail-modal__split">
          <article class="student-detail-modal__panel">
            <header>
              <strong>导师配置</strong>
              <span>班主任、助教与当前交付归属</span>
            </header>
            <dl class="student-detail-modal__detail-grid">
              <div>
                <dt>班主任</dt>
                <dd>{{ detail?.mentor?.leadMentorName || '-' }}</dd>
              </div>
              <div>
                <dt>助教</dt>
                <dd>{{ detail?.mentor?.assistantName || '-' }}</dd>
              </div>
              <div>
                <dt>班主任 ID</dt>
                <dd>{{ detail?.mentor?.leadMentorId ?? '-' }}</dd>
              </div>
              <div>
                <dt>助教 ID</dt>
                <dd>{{ detail?.mentor?.assistantId ?? '-' }}</dd>
              </div>
            </dl>
          </article>

          <article class="student-detail-modal__panel">
            <header>
              <strong>学业信息</strong>
              <span>学校、专业、毕业年份与升学状态</span>
            </header>
            <dl class="student-detail-modal__detail-grid">
              <div>
                <dt>学校</dt>
                <dd>{{ detail?.school || '-' }}</dd>
              </div>
              <div>
                <dt>专业</dt>
                <dd>{{ detail?.major || '-' }}</dd>
              </div>
              <div>
                <dt>毕业年份</dt>
                <dd>{{ detail?.graduationYear ?? '-' }}</dd>
              </div>
              <div>
                <dt>是否读研 / 延毕</dt>
                <dd>{{ formatStudyPlan(detail?.academic?.studyPlan, detail?.academic?.deferredGraduation) }}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section class="student-detail-modal__panel">
          <header>
            <strong>求职方向</strong>
            <span>地区、招聘周期、主攻方向与子方向</span>
          </header>
          <div class="student-detail-modal__direction-wrap">
            <div class="student-detail-modal__direction-card">
              <span>求职地区</span>
              <strong>{{ detail?.jobDirection?.targetRegion || detail?.targetRegion || '-' }}</strong>
            </div>
            <div class="student-detail-modal__direction-card">
              <span>招聘周期</span>
              <strong>{{ formatList(detail?.jobDirection?.recruitmentCycles) }}</strong>
            </div>
            <div class="student-detail-modal__direction-card">
              <span>主攻方向</span>
              <strong>{{ formatList(detail?.jobDirection?.majorDirections) }}</strong>
            </div>
            <div class="student-detail-modal__direction-card">
              <span>子方向</span>
              <strong>{{ detail?.jobDirection?.subDirection || detail?.subDirection || '-' }}</strong>
            </div>
          </div>
        </section>
      </div>

      <ChangeReviewTab
        v-else-if="activeTab === 'changes'"
        :pending-changes="pendingChanges"
        :history-changes="historyChanges"
        @approve="handleChangeDecision('approve', $event)"
        @reject="handleChangeDecision('reject', $event)"
      />

      <ContractTab
        v-else
        :summary="contractSummary"
        :contracts="contracts"
      />
    </template>
  </OverlaySurfaceModal>
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
  canView?: boolean
}>(), {
  studentId: null,
  studentName: '',
  canView: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'request-edit': [studentId: number]
  'review-updated': []
}>()

const tabs = [
  { key: 'profile', label: '基本信息', hint: '学生画像 + 辅导归属' },
  { key: 'changes', label: '信息变更', hint: '待审核 + 历史记录' },
  { key: 'contracts', label: '合同信息', hint: '金额 / 课时 / 合同列表' }
] as const

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

const contractSummary = computed<ContractSummary>(() => ({
  totalAmount: Number(contractPayload.value?.summary?.totalAmount || 0),
  totalHours: Number(contractPayload.value?.summary?.totalHours || 0),
  remainingHours: Number(contractPayload.value?.summary?.remainingHours || 0),
  usedHours: Number(contractPayload.value?.summary?.usedHours || 0)
}))

const contracts = computed(() => contractPayload.value?.contracts || [])

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
.student-detail-modal__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.student-detail-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 6px;
  color: #9f6b2e;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.student-detail-modal__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
}

.student-detail-modal__edit-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(15, 118, 110, 0.22);
}

.student-detail-modal__edit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.student-detail-modal__guard,
.student-detail-modal__loading,
.student-detail-modal__error {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
  border-radius: 24px;
  padding: 18px 20px;
  background: linear-gradient(160deg, #fff7ed 0%, #ffedd5 100%);
  color: #7c2d12;
}

.student-detail-modal__guard .mdi,
.student-detail-modal__loading .mdi,
.student-detail-modal__error .mdi {
  font-size: 22px;
}

.student-detail-modal__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  border-radius: 28px;
  padding: 24px 28px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 42%),
    linear-gradient(135deg, #0f172a 0%, #1e293b 46%, #164e63 100%);
  color: #f8fafc;
}

.student-detail-modal__hero strong {
  display: block;
  margin-bottom: 8px;
  font-size: 26px;
  line-height: 1.1;
}

.student-detail-modal__hero p {
  margin: 0;
  color: rgba(248, 250, 252, 0.74);
}

.student-detail-modal__hero-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.student-detail-modal__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(12px);
}

.student-detail-modal__pill--accent {
  background: rgba(251, 191, 36, 0.16);
  color: #fef3c7;
}

.student-detail-modal__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.student-detail-modal__stat-card {
  border-radius: 24px;
  padding: 18px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 20px 50px rgba(15, 23, 42, 0.06);
}

.student-detail-modal__stat-card span,
.student-detail-modal__stat-card small {
  display: block;
}

.student-detail-modal__stat-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.student-detail-modal__stat-card strong {
  display: block;
  margin: 12px 0 8px;
  color: #0f172a;
  font-size: 26px;
  line-height: 1;
}

.student-detail-modal__stat-card small {
  color: #94a3b8;
  line-height: 1.5;
}

.student-detail-modal__tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.student-detail-modal__tab {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  padding: 16px 18px;
  background: #fff;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.student-detail-modal__tab span {
  font-weight: 700;
}

.student-detail-modal__tab small {
  color: #64748b;
  line-height: 1.4;
}

.student-detail-modal__tab:hover,
.student-detail-modal__tab--active {
  border-color: rgba(14, 165, 233, 0.28);
  box-shadow: 0 18px 40px rgba(14, 165, 233, 0.12);
  transform: translateY(-1px);
}

.student-detail-modal__content {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.student-detail-modal__split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.student-detail-modal__panel {
  border-radius: 24px;
  padding: 22px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.student-detail-modal__panel header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.student-detail-modal__panel header strong {
  color: #0f172a;
  font-size: 16px;
}

.student-detail-modal__panel header span {
  color: #64748b;
  font-size: 12px;
}

.student-detail-modal__detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 14px;
  margin: 0;
}

.student-detail-modal__detail-grid div {
  display: grid;
  gap: 6px;
}

.student-detail-modal__detail-grid dt {
  color: #94a3b8;
  font-size: 12px;
}

.student-detail-modal__detail-grid dd {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.student-detail-modal__direction-wrap {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.student-detail-modal__direction-card {
  border-radius: 20px;
  padding: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
}

.student-detail-modal__direction-card span {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 12px;
}

.student-detail-modal__direction-card strong {
  color: #0f172a;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .student-detail-modal__title-wrap,
  .student-detail-modal__hero {
    flex-direction: column;
  }

  .student-detail-modal__stats,
  .student-detail-modal__tabs,
  .student-detail-modal__split,
  .student-detail-modal__detail-grid,
  .student-detail-modal__direction-wrap {
    grid-template-columns: 1fr;
  }

  .student-detail-modal__hero-tags {
    justify-content: flex-start;
  }
}
</style>

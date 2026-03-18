<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="contract-detail-modal"
    width="960px"
    :body-class="'contract-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="cdm-header">
        <div class="cdm-header__avatar">{{ avatarInitials }}</div>
        <div class="cdm-header__info">
          <span class="cdm-header__name">{{ modalTitle }}</span>
          <div class="cdm-header__meta">ID: {{ studentId }} · {{ contracts.length }}份合同</div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="contract-detail-modal__state">
      <span class="mdi mdi-loading mdi-spin" aria-hidden="true"></span>
      <span>正在加载合同记录...</span>
    </div>

    <div v-else-if="loadError" class="contract-detail-modal__state contract-detail-modal__state--error">
      <strong>合同详情加载失败</strong>
      <p>{{ loadError }}</p>
    </div>

    <template v-else>
      <section class="contract-detail-modal__summary">
        <article class="contract-detail-modal__summary-card">
          <span>合同总金额</span>
          <strong>{{ formatCurrency(summary.totalAmount) }}</strong>
        </article>
        <article class="contract-detail-modal__summary-card">
          <span>剩余课时</span>
          <strong>{{ summary.remainingHours }}h</strong>
        </article>
        <article class="contract-detail-modal__summary-card">
          <span>已用课时</span>
          <strong>{{ summary.usedHours }}h</strong>
        </article>
        <article class="contract-detail-modal__summary-card">
          <span>总课时</span>
          <strong>{{ summary.totalHours }}h</strong>
        </article>
      </section>

      <div v-if="contracts.length" class="contract-detail-modal__table-wrap">
        <table class="contract-detail-modal__table">
          <thead>
            <tr>
              <th>合同ID</th>
              <th>类型</th>
              <th>金额</th>
              <th>课时</th>
              <th>有效期</th>
              <th>续签原因</th>
              <th>附件</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="contract in contracts"
              :key="contract.contractId"
              :class="{ 'contract-detail-modal__row--expiring': isExpiring(contract) }"
            >
              <td>{{ contract.contractNo || contract.contractId }}</td>
              <td>
                <span :class="typeBadgeClass(contract.contractType)">{{ formatType(contract.contractType) }}</span>
              </td>
              <td>{{ formatCurrency(contract.contractAmount) }}</td>
              <td>{{ contract.remainingHours ?? contract.totalHours ?? 0 }} / {{ contract.totalHours ?? 0 }}h</td>
              <td>{{ formatDateRange(contract.startDate, contract.endDate) }}</td>
              <td>{{ contract.renewalReason || '—' }}</td>
              <td>
                <a v-if="contract.attachmentPath" :href="contract.attachmentPath" target="_blank" rel="noreferrer">查看附件</a>
                <span v-else>—</span>
              </td>
              <td>{{ formatDate(contract.updateTime || contract.endDate) }}</td>
              <td>
                <button type="button" class="contract-detail-modal__table-action" @click="emit('request-renew')">
                  续签
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="contract-detail-modal__empty">暂无合同记录。</div>
    </template>

    <template #footer>
      <div class="contract-detail-modal__footer">
        <button type="button" class="contract-detail-modal__secondary" @click="handleClose">关闭</button>
        <button type="button" class="contract-detail-modal__primary" @click="emit('request-renew')">
          <span class="mdi mdi-refresh" aria-hidden="true"></span>
          <span>续签合同</span>
        </button>
      </div>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'
import { getStudentContractDetail, type ContractDetailPayload, type ContractListItem } from '@osg/shared/api/admin/contract'

const props = defineProps<{
  visible: boolean
  studentId: number | null
  studentName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'request-renew': []
}>()

const loading = ref(false)
const loadError = ref('')
const detail = ref<ContractDetailPayload | null>(null)

const summary = computed(() => detail.value?.summary || {
  totalAmount: 0,
  totalHours: 0,
  usedHours: 0,
  remainingHours: 0,
})

const contracts = computed<ContractListItem[]>(() => detail.value?.contracts || [])
const modalTitle = computed(() => `${props.studentName || '学员'}的合同记录`)

const avatarInitials = computed(() => {
  const name = props.studentName?.trim()
  if (!name) return 'ST'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
})

const loadDetail = async () => {
  if (!props.visible || !props.studentId) {
    detail.value = null
    loadError.value = ''
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await getStudentContractDetail(props.studentId)
  } catch (error) {
    detail.value = null
    loadError.value = error instanceof Error ? error.message : '合同详情加载失败'
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatDate = (value?: string) => value ? value.slice(0, 10) : '-'
const formatDateRange = (startDate?: string, endDate?: string) => `${formatDate(startDate)} 至 ${formatDate(endDate)}`

const formatType = (type?: string) => {
  if (type === 'renew') return '续签'
  if (type === 'supplement') return '补充'
  return '首签'
}

const typeBadgeClass = (type?: string) => {
  if (type === 'renew') return 'contract-detail-modal__type-badge contract-detail-modal__type-badge--blue'
  return 'contract-detail-modal__type-badge contract-detail-modal__type-badge--green'
}

const isExpiring = (contract: ContractListItem) => {
  if (!contract.endDate) return false
  const end = new Date(contract.endDate)
  const now = new Date()
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 30
}

watch(() => [props.visible, props.studentId], () => {
  void loadDetail()
}, { immediate: true })
</script>

<style scoped lang="scss">
/* ── Header (override OverlaySurfaceModal header) ── */
:global([data-surface-id="contract-detail-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #7399C6, #5A7BA3) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
  padding: 22px 26px !important;
}

:global([data-surface-id="contract-detail-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.cdm-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cdm-header__avatar {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.cdm-header__name {
  display: block;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.cdm-header__meta {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

/* ── Body ── */
.contract-detail-modal__body {
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.contract-detail-modal__state,
.contract-detail-modal__empty {
  border-radius: 18px;
  background: #f6f9fc;
  padding: 28px;
  color: #61748e;
  text-align: center;
}

.contract-detail-modal__state--error {
  background: #fff1f2;
  color: #b42318;
}

.contract-detail-modal__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.contract-detail-modal__summary-card {
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fc 100%);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.contract-detail-modal__summary-card span {
  color: #6c809a;
  font-size: 12px;
}

.contract-detail-modal__summary-card strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 24px;
}

.contract-detail-modal__table-wrap {
  overflow: auto;
  border-radius: 18px;
  border: 1px solid #ebf0f5;
}

.contract-detail-modal__table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.contract-detail-modal__table th,
.contract-detail-modal__table td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
}

.contract-detail-modal__table th {
  background: #f8fbff;
  color: #68809d;
  font-size: 12px;
  font-weight: 700;
}

.contract-detail-modal__table td {
  color: #173150;
  font-size: 13px;
}

.contract-detail-modal__row--expiring {
  background: #FFFBEB;
}

/* ── Type badges ── */
.contract-detail-modal__type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.contract-detail-modal__type-badge--green {
  background: #D1FAE5;
  color: #065F46;
}

.contract-detail-modal__type-badge--blue {
  background: #DBEAFE;
  color: #1E40AF;
}

.contract-detail-modal__table-action {
  border: 1px solid #d7e1ed;
  background: #fff;
  color: #2b4e74;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Footer ── */
.contract-detail-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.contract-detail-modal__secondary,
.contract-detail-modal__primary {
  border: none;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.contract-detail-modal__secondary {
  background: #f7f9fc;
  color: #1d3552;
  border: 1px solid #d8e1ed;
}

.contract-detail-modal__primary {
  background: linear-gradient(135deg, #5f85b4 0%, #7ea2d0 100%);
  color: #fff;
}

@media (max-width: 900px) {
  .cdm-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .contract-detail-modal__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

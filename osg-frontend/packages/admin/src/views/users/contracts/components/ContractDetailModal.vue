<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="contract-detail-modal"
    width="920px"
    :body-class="'contract-detail-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="contract-detail-modal__title-wrap">
        <div>
          <span class="contract-detail-modal__eyebrow">Contract Detail</span>
          <div class="contract-detail-modal__title">
            <span class="mdi mdi-file-document-multiple-outline" aria-hidden="true"></span>
            <span>{{ modalTitle }}</span>
          </div>
        </div>
        <button type="button" class="contract-detail-modal__action" @click="emit('request-renew')">
          <span class="mdi mdi-refresh" aria-hidden="true"></span>
          <span>续签合同</span>
        </button>
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
            <tr v-for="contract in contracts" :key="contract.contractId">
              <td>{{ contract.contractNo || contract.contractId }}</td>
              <td>{{ formatType(contract.contractType) }}</td>
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

watch(() => [props.visible, props.studentId], () => {
  void loadDetail()
}, { immediate: true })
</script>

<style scoped lang="scss">
.contract-detail-modal__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.contract-detail-modal__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #7a8ea8;
}

.contract-detail-modal__title {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #10213a;
}

.contract-detail-modal__action {
  border: none;
  border-radius: 12px;
  min-height: 40px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, #5f85b4 0%, #7ea2d0 100%);
  cursor: pointer;
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
  border-radius: 18px;
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
  margin-top: 18px;
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

@media (max-width: 900px) {
  .contract-detail-modal__title-wrap {
    flex-direction: column;
    align-items: flex-start;
  }

  .contract-detail-modal__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

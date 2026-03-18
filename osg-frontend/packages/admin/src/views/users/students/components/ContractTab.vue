<template>
  <section class="contract-tab">
    <div class="contract-tab__summary">
      <article class="contract-tab__summary-card">
        <span>合同总金额</span>
        <strong>{{ formatCurrency(summary.totalAmount) }}</strong>
      </article>
      <article class="contract-tab__summary-card">
        <span>总课时</span>
        <strong>{{ summary.totalHours }}h</strong>
      </article>
      <article class="contract-tab__summary-card">
        <span>已用课时</span>
        <strong>{{ summary.usedHours }}h</strong>
      </article>
      <article class="contract-tab__summary-card">
        <span>剩余课时</span>
        <strong>{{ summary.remainingHours }}h</strong>
      </article>
    </div>

    <div v-if="contracts.length" class="contract-tab__table-wrap">
      <table class="contract-tab__table">
        <thead>
          <tr>
            <th>合同编号</th>
            <th>类型</th>
            <th>金额</th>
            <th>课时</th>
            <th>有效期</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contract in contracts" :key="contract.contractId">
            <td>{{ contract.contractNo }}</td>
            <td>{{ contract.contractType || '-' }}</td>
            <td>{{ formatCurrency(contract.contractAmount) }}</td>
            <td>{{ contract.totalHours || 0 }}h / 剩余 {{ contract.remainingHours || 0 }}h</td>
            <td>{{ formatDateRange(contract.startDate, contract.endDate) }}</td>
            <td>
              <span :class="['contract-tab__status', `contract-tab__status--${contract.contractStatus || 'normal'}`]">
                {{ formatStatus(contract.contractStatus) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="contract-tab__empty">
      暂无合同记录。
    </div>
  </section>
</template>

<script setup lang="ts">
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

defineProps<{
  summary: ContractSummary
  contracts: ContractRow[]
}>()

const formatCurrency = (value?: number) => {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const formatDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) {
    return '-'
  }
  const fmt = (d?: string) => {
    if (!d) return '-'
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return `${fmt(startDate)} 至 ${fmt(endDate)}`
}

const formatStatus = (status?: string) => {
  switch (status) {
    case 'ended':
      return '已结束'
    case 'draft':
      return '草稿'
    default:
      return '正常'
  }
}
</script>

<style scoped lang="scss">
.contract-tab {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.contract-tab__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.contract-tab__summary-card {
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.contract-tab__summary-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.contract-tab__summary-card strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 24px;
}

.contract-tab__table-wrap {
  overflow: auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.contract-tab__table {
  width: 100%;
  border-collapse: collapse;
}

.contract-tab__table th,
.contract-tab__table td {
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.contract-tab__table th {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.contract-tab__table td {
  color: #0f172a;
}

.contract-tab__status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
}

.contract-tab__status--draft {
  background: #e0f2fe;
  color: #075985;
}

.contract-tab__status--ended {
  background: #e5e7eb;
  color: #475569;
}

.contract-tab__empty {
  border-radius: 24px;
  padding: 24px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

@media (max-width: 900px) {
  .contract-tab__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

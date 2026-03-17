<template>
  <section class="settlement-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Finance Center</p>
        <h1>财务结算</h1>
        <p class="page-subtitle">管理导师课时费支付，支持单条与批量标记已支付。</p>
      </div>
      <button type="button" class="ghost-button">导出</button>
    </header>

    <section class="process-banner">
      <div>
        <span class="banner-label">支付流程说明</span>
        <h2>审核通过 → 未支付 → 已支付</h2>
      </div>
      <div class="banner-steps">
        <span v-for="step in flowSteps" :key="step" class="banner-step">{{ step }}</span>
      </div>
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.label" class="stat-card">
        <p class="stat-card__label">{{ card.label }}</p>
        <p class="stat-card__value">{{ card.value }}</p>
      </article>
    </section>

    <section class="tabs-row">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span class="tab-pill__count">{{ tab.count }}</span>
      </button>
    </section>

    <section class="toolbar-card">
      <div class="toolbar-filters">
        <input v-model.trim="keyword" class="toolbar-input" type="search" placeholder="搜索导师 / 学员">
        <select v-model="source" class="toolbar-select">
          <option value="all">全部来源</option>
          <option value="mentor">导师端</option>
          <option value="clerk">班主任端</option>
          <option value="assistant">助教端</option>
        </select>
        <input v-model="startDate" class="toolbar-input" type="date">
        <input v-model="endDate" class="toolbar-input" type="date">
        <button type="button" class="primary-button" @click="loadData">查询</button>
      </div>

      <div v-if="activeTab === 'unpaid' && selectedSettlementIds.length" class="selection-bar">
        <span>已选择 {{ selectedSettlementIds.length }} 条，合计 {{ selectedAmount }}</span>
        <button type="button" class="primary-button" @click="openBatchPay">批量标记已支付</button>
      </div>
      <div v-else-if="activeTab === 'unpaid'" class="selection-bar selection-bar--hint">
        <span>批量标记已支付</span>
      </div>
    </section>

    <section class="table-card">
      <table class="settlement-table">
        <thead>
          <tr>
            <th>选择</th>
            <th>课程ID</th>
            <th>导师</th>
            <th>学员</th>
            <th>课程类型</th>
            <th>时长</th>
            <th>课时费</th>
            <th>日期</th>
            <th>来源</th>
            <th>状态</th>
            <th>支付日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.settlementId"
            :class="{ 'settlement-table__row--selected': selectedSettlementIds.includes(row.settlementId) }"
          >
            <td>
              <input
                v-if="activeTab === 'unpaid'"
                v-model="selectedSettlementIds"
                type="checkbox"
                :value="row.settlementId"
              >
              <span v-else>—</span>
            </td>
            <td>{{ row.recordCode || `#R${row.recordId}` }}</td>
            <td>{{ row.mentorName }}</td>
            <td>{{ row.studentName }}</td>
            <td>{{ row.courseTypeLabel }}</td>
            <td>{{ formatHours(row.durationHours) }}</td>
            <td>{{ formatFee(row.courseFee) }}</td>
            <td>{{ formatDate(row.classDate) }}</td>
            <td>
              <span class="source-pill" :class="`source-pill--${row.source}`">{{ row.sourceLabel }}</span>
            </td>
            <td>
              <span class="status-pill" :class="`status-pill--${row.paymentStatus}`">{{ row.paymentStatusLabel }}</span>
            </td>
            <td>{{ row.paymentDate || '--' }}</td>
            <td>
              <button
                v-if="row.paymentStatus === 'unpaid'"
                type="button"
                class="link-button"
                @click="openSinglePay(row)"
              >
                标记支付
              </button>
              <span v-else>查看</span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td class="empty-row" colspan="12">暂无结算记录</td>
          </tr>
        </tbody>
      </table>
    </section>

    <MarkPaidModal
      v-model="showMarkPaidModal"
      :summary-label="modalSummaryLabel"
      :amount="modalAmount"
      :submitting="submitting"
      @confirm="handleConfirmPaid"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import MarkPaidModal from './components/MarkPaidModal.vue'
import {
  batchPayFinanceSettlement,
  getFinanceSettlementList,
  getFinanceSettlementStats,
  markFinanceSettlementPaid,
  type FinanceSettlementRow,
  type FinanceSettlementSource,
  type FinanceSettlementStats,
  type FinanceSettlementTab
} from '@osg/shared/api/admin/finance'

const rows = ref<FinanceSettlementRow[]>([])
const stats = ref<FinanceSettlementStats | null>(null)
const activeTab = ref<FinanceSettlementTab>('unpaid')
const keyword = ref('')
const source = ref<FinanceSettlementSource>('all')
const startDate = ref('')
const endDate = ref('')
const selectedSettlementIds = ref<number[]>([])
const showMarkPaidModal = ref(false)
const submitting = ref(false)
const modalContext = ref<{ type: 'single' | 'batch'; row?: FinanceSettlementRow } | null>(null)

const flowSteps = computed(() => stats.value?.flowSteps ?? ['审核通过', '未支付', '已支付'])

const statCards = computed(() => {
  const current = stats.value
  return [
    { label: '未支付', value: formatFee(current?.unpaidAmount) },
    { label: '本月已支付', value: formatFee(current?.monthPaidAmount) },
    { label: '本周课程数', value: String(current?.weekClassCount ?? 0) }
  ]
})

const tabs = computed(() => {
  const unpaidCount = rows.value.filter((row) => row.paymentStatus === 'unpaid').length
  const paidCount = rows.value.filter((row) => row.paymentStatus === 'paid').length
  return [
    { key: 'unpaid' as const, label: '未支付', count: unpaidCount },
    { key: 'paid' as const, label: '已支付', count: paidCount }
  ]
})

const selectedRows = computed(() => rows.value.filter((row) => selectedSettlementIds.value.includes(row.settlementId)))
const selectedAmount = computed(() => {
  const total = selectedRows.value.reduce((sum, row) => sum + Number(row.courseFee || 0), 0)
  return formatFee(String(total.toFixed(1)))
})

const modalSummaryLabel = computed(() => {
  if (modalContext.value?.type === 'batch') {
    return `批量结算 ${selectedSettlementIds.value.length} 条记录`
  }
  const row = modalContext.value?.row
  return row ? `${row.mentorName} · ${row.studentName}` : '单条结算'
})

const modalAmount = computed(() => {
  if (modalContext.value?.type === 'batch') {
    return selectedAmount.value
  }
  return modalContext.value?.row ? formatFee(modalContext.value.row.courseFee) : '¥0.0'
})

const loadData = async () => {
  try {
    const filters = {
      keyword: keyword.value || undefined,
      source: source.value,
      tab: activeTab.value,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    }

    const [listResponse, statsResponse] = await Promise.all([
      getFinanceSettlementList(filters),
      getFinanceSettlementStats(filters)
    ])

    rows.value = listResponse.rows ?? []
    stats.value = statsResponse
    selectedSettlementIds.value = selectedSettlementIds.value.filter((id) => rows.value.some((row) => row.settlementId === id))
  } catch (_error) {
    message.error('课时结算加载失败')
  }
}

const switchTab = (tab: FinanceSettlementTab) => {
  activeTab.value = tab
  selectedSettlementIds.value = []
  void loadData()
}

const openSinglePay = (row: FinanceSettlementRow) => {
  modalContext.value = { type: 'single', row }
  showMarkPaidModal.value = true
}

const openBatchPay = () => {
  if (!selectedSettlementIds.value.length) {
    message.warning('请先选择至少一条未支付记录')
    return
  }
  modalContext.value = { type: 'batch' }
  showMarkPaidModal.value = true
}

const handleConfirmPaid = async (payload: { paymentDate: string; bankReferenceNo?: string; remark?: string }) => {
  if (!payload.paymentDate) {
    message.warning('请填写支付日期')
    return
  }

  submitting.value = true
  try {
    if (modalContext.value?.type === 'batch') {
      await batchPayFinanceSettlement({
        settlementIds: selectedSettlementIds.value,
        paymentDate: payload.paymentDate,
        bankReferenceNo: payload.bankReferenceNo,
        remark: payload.remark
      })
    } else if (modalContext.value?.row) {
      await markFinanceSettlementPaid(modalContext.value.row.settlementId, payload)
    }
    showMarkPaidModal.value = false
    modalContext.value = null
    selectedSettlementIds.value = []
    await loadData()
  } catch (_error) {
    // request util handles message
  } finally {
    submitting.value = false
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN')
}

const formatHours = (value?: number | null) => (value == null ? '--' : `${value}h`)

const formatFee = (value?: string | null) => {
  if (!value) return '¥0.0'
  const amount = Number(value)
  if (Number.isNaN(amount)) return `¥${value}`
  return `¥${amount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.settlement-page {
  display: grid;
  gap: 20px;
}

.page-header,
.toolbar-filters,
.tabs-row,
.selection-bar,
.banner-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: #c2410c;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.page-header p,
.process-banner h2,
.stat-card__label,
.stat-card__value {
  margin: 0;
}

.page-subtitle {
  margin-top: 8px;
  color: #475569;
}

.ghost-button,
.primary-button,
.link-button,
.tab-pill {
  border: none;
  border-radius: 14px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #fef3c7;
  color: #b45309;
}

.primary-button {
  background: #15803d;
  color: #fff;
}

.link-button {
  background: transparent;
  color: #15803d;
  padding: 0;
}

.process-banner,
.toolbar-card,
.table-card {
  padding: 20px 24px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.process-banner {
  background: linear-gradient(135deg, #fef3c7, #fffbeb);
}

.banner-label {
  display: inline-flex;
  margin-bottom: 8px;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.banner-step {
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.72);
  color: #92400e;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  border-radius: 20px;
  padding: 18px 20px;
  background: #f8fafc;
}

.stat-card__label {
  color: #64748b;
}

.stat-card__value {
  margin-top: 8px;
  color: #0f172a;
  font-size: 28px;
  font-weight: 700;
}

.tab-pill {
  background: #e2e8f0;
  color: #334155;
}

.tab-pill--active {
  background: #dcfce7;
  color: #166534;
}

.tab-pill__count {
  margin-left: 8px;
}

.toolbar-input,
.toolbar-select {
  min-width: 160px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 10px 12px;
  font: inherit;
}

.selection-bar {
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.selection-bar--hint {
  justify-content: flex-start;
  color: #64748b;
}

.settlement-table {
  width: 100%;
  border-collapse: collapse;
}

.settlement-table th,
.settlement-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.settlement-table__row--selected {
  background: #eff6ff;
}

.source-pill,
.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.source-pill--mentor {
  background: rgba(90, 123, 163, 0.16);
  color: #5a7ba3;
}

.source-pill--clerk {
  background: rgba(5, 150, 105, 0.14);
  color: #059669;
}

.source-pill--assistant {
  background: rgba(146, 64, 14, 0.14);
  color: #92400e;
}

.status-pill--unpaid {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
}

.status-pill--paid {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.empty-row {
  text-align: center;
  color: #94a3b8;
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-card {
    overflow-x: auto;
  }
}
</style>

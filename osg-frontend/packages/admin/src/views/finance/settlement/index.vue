<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('financial_settlement')" title-en="Settlement" :description="$t('manage_mentor_session_fee_payments_with_')">
      <template #actions>
        <a-button @click="loadData">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert type="warning" show-icon style="margin-bottom: 0">
      <template #message>{{ $t('payment_process_guide') }}</template>
      <template #description>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px">
          <a-tag v-for="step in flowSteps" :key="step" color="orange">{{ step }}</a-tag>
        </div>
      </template>
    </a-alert>

    <a-row :gutter="16">
      <a-col v-for="card in statCards" :key="card.label" :xs="24" :sm="8">
        <a-card :bordered="false" :body-style="{ padding: '16px 20px', background: card.bg }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ color: card.color, fontSize: '24px', fontWeight: 700 }" />
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px" @change="(key: string) => switchTab(key as FinanceSettlementTab)">
        <a-tab-pane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge :count="tab.count" :number-style="{ backgroundColor: tab.key === 'unpaid' ? '#faad14' : '#52c41a' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="$t('search_mentor_student')" allow-clear style="width: 180px" @press-enter="loadData" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="source" style="width: 120px">
            <a-select-option value="all">{{ $t('all_sources') }}</a-select-option>
            <a-select-option value="mentor">{{ $t('mentor_portal') }}</a-select-option>
            <a-select-option value="clerk">{{ $t('homeroom_teacher_portal') }}</a-select-option>
            <a-select-option value="assistant">{{ $t('teaching_assistant_portal') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="startDate" :placeholder="$t('start_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="endDate" :placeholder="$t('end_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ $t('search_3') }}
          </a-button>
        </a-form-item>
      </a-form>

      <div v-if="activeTab === 'unpaid'" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px">
        <span v-if="selectedSettlementIds.length" style="color: #1890ff">{{ $t('selected') }} {{ selectedSettlementIds.length }} {{ $t('records_total') }} {{ selectedAmount }}</span>
        <span v-else style="color: #94a3b8">{{ $t('mark_all_as_paid') }}</span>
        <a-button v-if="selectedSettlementIds.length" type="primary" @click="openBatchPay">{{ $t('mark_all_as_paid') }}</a-button>
      </div>

      <a-table
        :columns="settlementColumns"
        :data-source="rows"
        :row-key="(r: FinanceSettlementRow) => r.settlementId"
        :pagination="false"
        :locale="{ emptyText: $t('no_settlement_records') }"
        :scroll="{ x: 1300 }"
        :row-selection="activeTab === 'unpaid' ? { selectedRowKeys: selectedSettlementIds, onChange: onSelectChange } : undefined"
        :row-class-name="(record: FinanceSettlementRow) => selectedSettlementIds.includes(record.settlementId) ? 'row-selected' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'recordCode'">
            {{ record.recordCode || `#R${record.recordId}` }}
          </template>
          <template v-else-if="column.dataIndex === 'durationHours'">
            {{ formatHours(record.durationHours) }}
          </template>
          <template v-else-if="column.dataIndex === 'courseFee'">
            {{ formatFee(record.courseFee) }}
          </template>
          <template v-else-if="column.dataIndex === 'classDate'">
            {{ formatDate(record.classDate) }}
          </template>
          <template v-else-if="column.dataIndex === 'source'">
            <a-tag :color="sourceColorMap[record.source] || 'default'">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'paymentStatus'">
            <a-tag :color="record.paymentStatus === 'unpaid' ? 'blue' : 'green'">{{ record.paymentStatusLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'paymentDate'">
            {{ record.paymentDate || '--' }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button v-if="record.paymentStatus === 'unpaid'" type="link" size="small" @click="openSinglePay(record)">{{ $t('mark_as_paid') }}</a-button>
            <span v-else style="color: #94a3b8">{{ $t('view') }}</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <MarkPaidModal
      v-model="showMarkPaidModal"
      :summary-label="modalSummaryLabel"
      :amount="modalAmount"
      :submitting="submitting"
      @confirm="handleConfirmPaid"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const sourceColorMap: Record<string, string> = {
  mentor: 'purple',
  clerk: 'green',
  assistant: 'orange'
}

const settlementColumns = [
  { title: t('course_id'), dataIndex: 'recordCode', key: 'recordCode', width: 100 },
  { title: t('mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('course_type'), dataIndex: 'courseTypeLabel', key: 'courseTypeLabel', width: 100 },
  { title: t('duration'), dataIndex: 'durationHours', key: 'durationHours', width: 70 },
  { title: t('session_fee'), dataIndex: 'courseFee', key: 'courseFee', width: 90 },
  { title: t('date'), dataIndex: 'classDate', key: 'classDate', width: 100 },
  { title: t('source'), dataIndex: 'source', key: 'source', width: 90 },
  { title: t('status'), dataIndex: 'paymentStatus', key: 'paymentStatus', width: 80 },
  { title: t('payment_date'), dataIndex: 'paymentDate', key: 'paymentDate', width: 100 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 90 },
]

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

const flowSteps = computed(() => stats.value?.flowSteps ?? [t('approved_2'), t('unpaid'), t('paid')])

const statCards = computed(() => {
  const current = stats.value
  return [
    { label: t('unpaid'), value: formatFee(current?.unpaidAmount), bg: '#fffbeb', color: '#d97706' },
    { label: t('paid_this_month'), value: formatFee(current?.monthPaidAmount), bg: '#f0fdf4', color: '#16a34a' },
    { label: t('courses_this_week'), value: String(current?.weekClassCount ?? 0), bg: '#eff6ff', color: '#2563eb' }
  ]
})

const onSelectChange = (keys: number[]) => {
  selectedSettlementIds.value = keys
}

const tabs = computed(() => {
  const unpaidCount = rows.value.filter((row) => row.paymentStatus === 'unpaid').length
  const paidCount = rows.value.filter((row) => row.paymentStatus === 'paid').length
  return [
    { key: 'unpaid' as const, label: t('unpaid'), count: unpaidCount },
    { key: 'paid' as const, label: t('paid'), count: paidCount }
  ]
})

const selectedRows = computed(() => rows.value.filter((row) => selectedSettlementIds.value.includes(row.settlementId)))
const selectedAmount = computed(() => {
  const total = selectedRows.value.reduce((sum, row) => sum + Number(row.courseFee || 0), 0)
  return formatFee(String(total.toFixed(1)))
})

const modalSummaryLabel = computed(() => {
  if (modalContext.value?.type === 'batch') {
    return t('batch_settlement_records', { count: selectedSettlementIds.value.length })
  }
  const row = modalContext.value?.row
  return row ? `${row.mentorName} · ${row.studentName}` : t('single_settlement')
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
    message.error(t('failed_to_load_session_settlement_data'))
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
    message.warning(t('please_select_at_least_one_unpaid_record'))
    return
  }
  modalContext.value = { type: 'batch' }
  showMarkPaidModal.value = true
}

const handleConfirmPaid = async (payload: { paymentDate: string; bankReferenceNo?: string; remark?: string }) => {
  if (!payload.paymentDate) {
    message.warning(t('please_enter_the_payment_date'))
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

<style scoped>
:deep(.row-selected) {
  background: rgba(239, 246, 255, 0.6);
}
</style>

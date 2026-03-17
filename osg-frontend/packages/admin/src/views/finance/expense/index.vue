<template>
  <section class="expense-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Finance Center</p>
        <h1>报销管理</h1>
        <p class="page-subtitle">审核导师报销申请，支持新建报销与处理流转。</p>
      </div>
      <button type="button" class="primary-button" @click="showNewExpenseModal = true">新建报销</button>
    </header>

    <section class="tabs-row">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-pill"
        :class="{ 'tab-pill--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="tab-pill__count">{{ tab.count }}</span>
      </button>
    </section>

    <section class="toolbar-card">
      <input v-model.trim="keyword" class="toolbar-input" type="search" placeholder="搜索导师 / 说明">
      <button type="button" class="ghost-button" @click="loadExpenses">刷新</button>
    </section>

    <section class="types-card">
      <span v-for="type in expenseTypes" :key="type" class="type-pill">{{ type }}</span>
    </section>

    <section class="table-card">
      <table class="expense-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>导师</th>
            <th>报销类型</th>
            <th>金额</th>
            <th>日期</th>
            <th>说明</th>
            <th>附件</th>
            <th>状态</th>
            <th>审核备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.expenseId">
            <td>#{{ row.expenseId }}</td>
            <td>{{ row.mentorName }}</td>
            <td>{{ row.expenseType }}</td>
            <td>{{ formatFee(row.expenseAmount) }}</td>
            <td>{{ row.expenseDate }}</td>
            <td>{{ row.description }}</td>
            <td>
              <a v-if="row.attachmentUrl" :href="row.attachmentUrl" target="_blank" rel="noreferrer">附件</a>
              <span v-else>—</span>
            </td>
            <td>
              <span class="status-pill" :class="`status-pill--${row.status}`">{{ statusLabelMap[row.status] }}</span>
            </td>
            <td>{{ row.reviewComment || '—' }}</td>
            <td class="expense-table__actions">
              <template v-if="row.status === 'processing'">
                <button type="button" class="link-button link-button--approve" @click="handleReview(row.expenseId, 'approved')">通过</button>
                <button type="button" class="link-button link-button--deny" @click="handleReview(row.expenseId, 'denied')">拒绝</button>
              </template>
              <span v-else>已处理</span>
            </td>
          </tr>
          <tr v-if="!visibleRows.length">
            <td class="empty-row" colspan="10">暂无报销记录</td>
          </tr>
        </tbody>
      </table>
    </section>

    <NewExpenseModal
      v-model="showNewExpenseModal"
      :submitting="submitting"
      @confirm="handleCreateExpense"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import NewExpenseModal from './components/NewExpenseModal.vue'
import {
  createExpense,
  getExpenseList,
  reviewExpense,
  type CreateExpensePayload,
  type ExpenseRow,
  type ExpenseTab,
  type ExpenseType
} from '@osg/shared/api/admin/expense'

const expenseTypes: ExpenseType[] = [
  'Mentor Referral',
  'Student Referral',
  'Transportation',
  'Materials',
  'Other'
]

const statusLabelMap: Record<ExpenseRow['status'], string> = {
  processing: 'Processing',
  approved: 'Approved',
  denied: 'Denied'
}

const rows = ref<ExpenseRow[]>([])
const activeTab = ref<ExpenseTab>('all')
const keyword = ref('')
const showNewExpenseModal = ref(false)
const submitting = ref(false)

const tabs = computed(() => {
  const counts = {
    all: rows.value.length,
    processing: rows.value.filter((row) => row.status === 'processing').length,
    approved: rows.value.filter((row) => row.status === 'approved').length,
    denied: rows.value.filter((row) => row.status === 'denied').length
  }

  return [
    { key: 'all' as const, label: 'All', count: counts.all },
    { key: 'processing' as const, label: 'Processing', count: counts.processing },
    { key: 'approved' as const, label: 'Approved', count: counts.approved },
    { key: 'denied' as const, label: 'Denied', count: counts.denied }
  ]
})

const visibleRows = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    if (activeTab.value !== 'all' && row.status !== activeTab.value) {
      return false
    }
    if (!normalizedKeyword) {
      return true
    }
    return (
      row.mentorName.toLowerCase().includes(normalizedKeyword)
      || row.description.toLowerCase().includes(normalizedKeyword)
    )
  })
})

const loadExpenses = async () => {
  try {
    const response = await getExpenseList({ tab: 'all' })
    rows.value = response.rows ?? []
  } catch (_error) {
    message.error('报销列表加载失败')
  }
}

const handleCreateExpense = async (payload: CreateExpensePayload) => {
  submitting.value = true
  try {
    await createExpense(payload)
    showNewExpenseModal.value = false
    message.success('报销创建成功')
    await loadExpenses()
  } catch (_error) {
    // request util handles error message
  } finally {
    submitting.value = false
  }
}

const handleReview = async (expenseId: number, status: 'approved' | 'denied') => {
  try {
    await reviewExpense(expenseId, {
      status,
      reviewComment: status === 'approved' ? '审核通过' : '审核驳回'
    })
    message.success(status === 'approved' ? '报销已通过' : '报销已拒绝')
    await loadExpenses()
  } catch (_error) {
    // request util handles error message
  }
}

const formatFee = (value: string) => {
  const amount = Number(value)
  if (Number.isNaN(amount)) return `¥${value}`
  return `¥${amount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

onMounted(() => {
  void loadExpenses()
})
</script>

<style scoped lang="scss">
.expense-page {
  display: grid;
  gap: 20px;
}

.page-header,
.tabs-row,
.toolbar-card,
.types-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1,
.page-subtitle {
  margin: 0;
}

.page-subtitle {
  margin-top: 8px;
  color: #64748b;
}

.tab-pill,
.type-pill,
.ghost-button,
.primary-button,
.toolbar-input,
.link-button {
  border-radius: 14px;
  font: inherit;
}

.tab-pill {
  border: none;
  background: #fff1f2;
  color: #9f1239;
  padding: 10px 16px;
  cursor: pointer;
}

.tab-pill--active {
  background: #dc2626;
  color: #fff;
}

.tab-pill__count {
  margin-left: 8px;
}

.toolbar-card,
.types-card,
.table-card {
  padding: 16px 18px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.toolbar-input {
  min-width: 260px;
  border: 1px solid #cbd5e1;
  padding: 10px 12px;
}

.type-pill {
  background: #fff7ed;
  color: #c2410c;
  padding: 8px 12px;
  font-size: 13px;
}

.expense-table {
  width: 100%;
  border-collapse: collapse;
}

.expense-table th,
.expense-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.expense-table__actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-pill--processing {
  background: #fff7ed;
  color: #c2410c;
}

.status-pill--approved {
  background: #ecfdf5;
  color: #047857;
}

.status-pill--denied {
  background: #fef2f2;
  color: #b91c1c;
}

.empty-row {
  text-align: center;
  color: #94a3b8;
}

.ghost-button,
.primary-button,
.link-button {
  border: none;
  cursor: pointer;
}

.ghost-button {
  background: #f8fafc;
  color: #334155;
  padding: 10px 14px;
}

.primary-button {
  background: #dc2626;
  color: #fff;
  padding: 10px 16px;
}

.link-button {
  background: transparent;
  padding: 0;
}

.link-button--approve {
  color: #059669;
}

.link-button--deny {
  color: #dc2626;
}

@media (max-width: 900px) {
  .expense-table {
    display: block;
    overflow-x: auto;
  }
}
</style>

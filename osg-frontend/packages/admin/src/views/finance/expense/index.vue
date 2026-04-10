<template>
  <div class="osg-page">
    <PageHeader title="报销管理" subtitle="Expense Management" description="审核导师报销申请，支持新建报销与处理流转">
      <template #actions>
        <a-button type="primary" @click="showNewExpenseModal = true">
          <template #icon><PlusOutlined /></template>
          新建报销
        </a-button>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px">
        <a-tab-pane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge :count="tab.count" :number-style="{ backgroundColor: tab.key === 'processing' ? '#faad14' : tab.key === 'approved' ? '#52c41a' : tab.key === 'denied' ? '#ff4d4f' : '#1890ff' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索导师 / 说明" allow-clear style="width: 200px" @press-enter="loadExpenses" />
        </a-form-item>
        <a-form-item>
          <a-button @click="loadExpenses">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-form-item>
      </a-form>

      <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap">
        <a-tag v-for="type in expenseTypes" :key="type" color="orange">{{ type }}</a-tag>
      </div>

      <a-table :columns="expenseColumns" :data-source="visibleRows" :row-key="(r: ExpenseRow) => r.expenseId" :pagination="false" :locale="{ emptyText: '暂无报销记录' }" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'expenseAmount'">
            {{ formatFee(record.expenseAmount) }}
          </template>
          <template v-else-if="column.dataIndex === 'attachmentUrl'">
            <a v-if="record.attachmentUrl" :href="record.attachmentUrl" target="_blank" rel="noreferrer">附件</a>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColorMap[record.status]">{{ statusLabelMap[record.status] }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'reviewComment'">
            {{ record.reviewComment || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space v-if="record.status === 'processing'">
              <a-button type="link" size="small" style="color: #059669" @click="handleReview(record.expenseId, 'approved')">通过</a-button>
              <a-button type="link" size="small" danger @click="handleReview(record.expenseId, 'denied')">拒绝</a-button>
            </a-space>
            <span v-else style="color: #94a3b8">已处理</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <NewExpenseModal
      v-model="showNewExpenseModal"
      :submitting="submitting"
      @confirm="handleCreateExpense"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
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

const statusColorMap: Record<ExpenseRow['status'], string> = {
  processing: 'orange',
  approved: 'green',
  denied: 'red'
}

const expenseColumns = [
  { title: 'ID', dataIndex: 'expenseId', key: 'expenseId', width: 70, customRender: ({ text }: { text: number }) => `#${text}` },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '报销类型', dataIndex: 'expenseType', key: 'expenseType', width: 120 },
  { title: '金额', dataIndex: 'expenseAmount', key: 'expenseAmount', width: 90 },
  { title: '日期', dataIndex: 'expenseDate', key: 'expenseDate', width: 100 },
  { title: '说明', dataIndex: 'description', key: 'description', width: 150 },
  { title: '附件', dataIndex: 'attachmentUrl', key: 'attachmentUrl', width: 70 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '审核备注', dataIndex: 'reviewComment', key: 'reviewComment', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 120 },
]

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

<style scoped>
</style>

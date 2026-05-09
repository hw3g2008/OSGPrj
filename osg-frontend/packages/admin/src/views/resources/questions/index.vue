<template>
  <div class="osg-page">
    <PageHeader title-zh="面试真题审核" title-en="Question Review">
      <template #actions>
        <a-button @click="message.success('已导出当前筛选结果')">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingCount > 0"
      type="warning"
      show-icon
      :message="`当前有 ${pendingCount} 条面试真题待审核，请及时处理`"
      description="优先处理班主任流转过来的真题，审核通过后会自动开放给同公司 + 同部门 + 同办公地点 + 同面试状态 的学生。"
    >
      <template #action>
        <a-button size="small" @click="activeTab = 'pending'">查看待审核</a-button>
      </template>
    </a-alert>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" style="margin-bottom: 16px">
        <a-tab-pane v-for="tab in tabs" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge v-if="tab.key === 'pending'" :count="pendingCount" :number-style="{ backgroundColor: '#faad14' }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="filters.keyword" placeholder="搜索学员 / 公司 / 真题编号" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.companyName" placeholder="公司" allow-clear style="width: 120px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.interviewRound" placeholder="全部轮次" allow-clear style="width: 120px">
            <a-select-option v-for="round in interviewRoundOptions" :key="round" :value="round">{{ round }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.beginDate" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.endDate" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadRows">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <a-button type="primary" :disabled="!canBatchReview" @click="reviewSelected('approved')">批量通过</a-button>
        <a-button danger :disabled="!canBatchReview" @click="reviewSelected('rejected')">批量驳回</a-button>
        <span style="color: #1890ff">已选择 {{ selectedIds.length }} 条</span>
        <span style="margin-left: auto; font-size: 13px; color: #64748b">来源字典：入职面试申请 / 自主填写</span>
      </div>

      <a-table
        :columns="questionColumns"
        :data-source="rows"
        :row-key="(r: InterviewQuestionRow) => r.questionId"
        :pagination="false"
        :locale="{ emptyText: '暂无面试真题记录' }"
        :scroll="{ x: 1300 }"
        :row-selection="activeTab === 'pending' ? { selectedRowKeys: selectedIds, onChange: onSelectChange } : undefined"
        :row-class-name="(record: InterviewQuestionRow) => record.reviewStatus === 'pending' ? 'row-pending' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'questionCode'">
            <span style="font-family: monospace">{{ record.questionCode }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'studentName'">
            <div><strong>{{ record.studentName }}</strong></div>
            <small style="color: #94a3b8">{{ record.studentId || '—' }}</small>
          </template>
          <template v-else-if="column.dataIndex === 'companyName'">
            <strong>{{ record.companyName }}</strong>
          </template>
          <template v-else-if="column.dataIndex === 'questionCount'">
            {{ record.questionCount }} 题
          </template>
          <template v-else-if="column.dataIndex === 'sourceType'">
            <a-tag :color="record.sourceType === '入职面试申请' ? 'orange' : 'blue'">{{ record.sourceType }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            {{ formatTime(record.submittedAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button v-if="record.reviewStatus === 'pending'" type="link" size="small" @click="openReviewModal(record)">审核</a-button>
            <a-tag v-else :color="record.reviewStatus === 'approved' ? 'green' : 'red'">{{ reviewStatusLabel[record.reviewStatus] }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-alert type="info" show-icon message="审核规则" description="审核通过后，面试真题将自动开放给满足以下条件的学生：同公司 + 同部门 + 同办公地点 + 同面试状态。" />

    <QuestionReviewModal
      v-model="showReviewModal"
      :row="reviewingRow"
      :submitting="submitting"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import QuestionReviewModal from './components/QuestionReviewModal.vue'
import {
  batchApproveQuestions,
  batchRejectQuestions,
  getQuestionList,
  type InterviewQuestionRow,
  type InterviewRound,
  type QuestionReviewStatus,
  type QuestionTab
} from '@osg/shared/api/admin/question'

const questionColumns = [
  { title: 'ID', dataIndex: 'questionCode', key: 'questionCode', width: 100 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '公司', dataIndex: 'companyName', key: 'companyName', width: 120 },
  { title: '部门', dataIndex: 'departmentName', key: 'departmentName', width: 100 },
  { title: '办公地点', dataIndex: 'officeLocation', key: 'officeLocation', width: 100 },
  { title: '轮次', dataIndex: 'interviewRound', key: 'interviewRound', width: 80 },
  { title: '题目数', dataIndex: 'questionCount', key: 'questionCount', width: 80 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 110 },
  { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 90 },
]

const tabs: Array<{ key: QuestionTab; label: string }> = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' }
]

const interviewRoundOptions: InterviewRound[] = ['R1', 'R2', 'Final', 'Superday', 'HireVue']
const reviewStatusLabel: Record<QuestionReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回'
}

const activeTab = ref<QuestionTab>('pending')
const rows = ref<InterviewQuestionRow[]>([])
const pendingCount = ref(0)
const selectedIds = ref<number[]>([])
const showReviewModal = ref(false)
const reviewingRow = ref<InterviewQuestionRow | null>(null)
const submitting = ref(false)
const filters = ref({
  keyword: '',
  companyName: '',
  interviewRound: undefined as InterviewRound | undefined,
  beginDate: '',
  endDate: ''
})

const canBatchReview = computed(() => activeTab.value === 'pending' && selectedIds.value.length > 0)

const onSelectChange = (keys: number[]) => {
  selectedIds.value = keys
}

const loadRows = async () => {
  try {
    const response = await getQuestionList({
      tab: activeTab.value,
      keyword: filters.value.keyword || undefined,
      companyName: filters.value.companyName || undefined,
      interviewRound: filters.value.interviewRound,
      beginDate: filters.value.beginDate || undefined,
      endDate: filters.value.endDate || undefined
    })
    rows.value = response.rows ?? []
    pendingCount.value = response.pendingCount ?? 0
    selectedIds.value = []
  } catch (_error) {
    message.error('面试真题列表加载失败')
  }
}

const handleReset = () => {
  filters.value = {
    keyword: '',
    companyName: '',
    interviewRound: undefined,
    beginDate: '',
    endDate: ''
  }
  void loadRows()
}

const openReviewModal = (row: InterviewQuestionRow) => {
  reviewingRow.value = row
  showReviewModal.value = true
}

const reviewSelected = async (target: 'approved' | 'rejected') => {
  if (!canBatchReview.value) return
  submitting.value = true
  try {
    if (target === 'approved')
    {
      await batchApproveQuestions({ questionIds: selectedIds.value, reviewComment: '批量通过' })
      message.success('批量通过成功')
    }
    else
    {
      await batchRejectQuestions({ questionIds: selectedIds.value, reviewComment: '批量驳回' })
      message.success('批量驳回成功')
    }
    await loadRows()
  } catch (_error) {
    // request util handles message
  } finally {
    submitting.value = false
  }
}

const handleApprove = async (payload: { row: InterviewQuestionRow; reviewComment?: string }) => {
  submitting.value = true
  try {
    await batchApproveQuestions({
      questionIds: [payload.row.questionId],
      reviewComment: payload.reviewComment
    })
    showReviewModal.value = false
    message.success('审核通过并已开放')
    await loadRows()
  } catch (_error) {
    // request util handles message
  } finally {
    submitting.value = false
  }
}

const handleReject = async (payload: { row: InterviewQuestionRow; reviewComment?: string }) => {
  submitting.value = true
  try {
    await batchRejectQuestions({
      questionIds: [payload.row.questionId],
      reviewComment: payload.reviewComment
    })
    showReviewModal.value = false
    message.success('已驳回该条真题')
    await loadRows()
  } catch (_error) {
    // request util handles message
  } finally {
    submitting.value = false
  }
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

watch(activeTab, () => {
  void loadRows()
})

onMounted(() => {
  void loadRows()
})
</script>

<style scoped>
:deep(.row-pending) {
  background: rgba(254, 252, 232, 0.6);
}
</style>

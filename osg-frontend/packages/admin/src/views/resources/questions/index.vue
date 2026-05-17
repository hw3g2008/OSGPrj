<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.resources.questions.title')" title-en="Question Review">
      <template #actions>
        <a-button @click="message.success(t('admin.resources.questions.messages.exported'))">
          <template #icon><ExportOutlined /></template>
          {{ t('admin.resources.questions.actions.export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingCount > 0"
      type="warning"
      show-icon
      :message="t('admin.resources.questions.banner.message', { count: pendingCount })"
      :description="t('admin.resources.questions.banner.description')"
    >
      <template #action>
        <a-button size="small" @click="activeTab = 'pending'">{{ t('admin.resources.questions.actions.viewPending') }}</a-button>
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
          <a-input v-model:value="filters.keyword" :placeholder="t('admin.resources.questions.filters.keyword')" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.companyName" :placeholder="t('admin.resources.questions.filters.company')" allow-clear style="width: 120px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.interviewRound" :placeholder="t('admin.resources.questions.filters.allRounds')" allow-clear style="width: 120px">
            <a-select-option v-for="round in interviewRoundOptions" :key="round" :value="round">{{ round }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.beginDate" :placeholder="t('admin.resources.questions.filters.startDate')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.endDate" :placeholder="t('admin.resources.questions.filters.endDate')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadRows">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.resources.questions.actions.search') }}
            </a-button>
            <a-button @click="handleReset">{{ t('admin.resources.questions.actions.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <a-button type="primary" :disabled="!canBatchReview" @click="reviewSelected('approved')">{{ t('admin.resources.questions.actions.batchApprove') }}</a-button>
        <a-button danger :disabled="!canBatchReview" @click="reviewSelected('rejected')">{{ t('admin.resources.questions.actions.batchReject') }}</a-button>
        <span style="color: #1890ff">{{ t('admin.resources.questions.selectedCount', { count: selectedIds.length }) }}</span>
        <span style="margin-left: auto; font-size: 13px; color: #64748b">{{ t('admin.resources.questions.sourceDictionary') }}</span>
      </div>

      <a-table
        :columns="questionColumns"
        :data-source="rows"
        :row-key="(r: InterviewQuestionRow) => r.questionId"
        :pagination="false"
        :locale="{ emptyText: t('admin.resources.questions.empty') }"
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
            {{ t('admin.resources.questions.questionCount', { count: record.questionCount }) }}
          </template>
          <template v-else-if="column.dataIndex === 'sourceType'">
            <a-tag :color="isInterviewApplicationSource(record.sourceType) ? 'orange' : 'blue'">{{ formatSourceType(record.sourceType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            {{ formatTime(record.submittedAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button v-if="record.reviewStatus === 'pending'" type="link" size="small" @click="openReviewModal(record)">{{ t('admin.resources.questions.actions.review') }}</a-button>
            <a-tag v-else :color="record.reviewStatus === 'approved' ? 'green' : 'red'">{{ reviewStatusLabel[record.reviewStatus as QuestionReviewStatus] }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-alert type="info" show-icon :message="t('admin.resources.questions.rules.title')" :description="t('admin.resources.questions.rules.description')" />

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
import { i18n } from '@osg/shared'
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

const t = (key: string, named?: Record<string, unknown>) =>
  named
    ? (i18n.global.t as unknown as (k: string, n: Record<string, unknown>) => string)(key, named)
    : (i18n.global.t as unknown as (k: string) => string)(key)

const questionColumns = computed(() => [
  { title: 'ID', dataIndex: 'questionCode', key: 'questionCode', width: 100, fixed: 'left' as const },
  { title: t('admin.resources.questions.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('admin.resources.questions.columns.company'), dataIndex: 'companyName', key: 'companyName', width: 120 },
  { title: t('admin.resources.questions.columns.department'), dataIndex: 'departmentName', key: 'departmentName', width: 100 },
  { title: t('admin.resources.questions.columns.officeLocation'), dataIndex: 'officeLocation', key: 'officeLocation', width: 100 },
  { title: t('admin.resources.questions.columns.round'), dataIndex: 'interviewRound', key: 'interviewRound', width: 80 },
  { title: t('admin.resources.questions.columns.questionCount'), dataIndex: 'questionCount', key: 'questionCount', width: 80 },
  { title: t('admin.resources.questions.columns.source'), dataIndex: 'sourceType', key: 'sourceType', width: 110 },
  { title: t('admin.resources.questions.columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('admin.resources.questions.columns.action'), dataIndex: 'action', key: 'action', width: 90, fixed: 'right' as const },
])

const tabs: Array<{ key: QuestionTab; label: string }> = [
  { key: 'pending', label: t('admin.resources.questions.tabs.pending') },
  { key: 'approved', label: t('admin.resources.questions.tabs.approved') },
  { key: 'rejected', label: t('admin.resources.questions.tabs.rejected') }
]

const interviewRoundOptions: InterviewRound[] = ['R1', 'R2', 'Final', 'Superday', 'HireVue']
const reviewStatusLabel: Record<QuestionReviewStatus, string> = {
  pending: t('admin.resources.questions.tabs.pending'),
  approved: t('admin.resources.questions.tabs.approved'),
  rejected: t('admin.resources.questions.tabs.rejected')
}

const formatSourceType = (sourceType: string) =>
  sourceType === '入职面试申请' // i18n-skip-line: backend values
    ? t('admin.resources.questions.sources.interviewApplication')
    : t('admin.resources.questions.sources.selfSubmitted')

const isInterviewApplicationSource = (sourceType: string) => sourceType === '入职面试申请' // i18n-skip-line: backend values

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
      await batchApproveQuestions({ questionIds: selectedIds.value, reviewComment: t('admin.resources.questions.actions.batchApprove') })
      message.success(t('admin.resources.questions.messages.batchApproveSuccess'))
    }
    else
    {
      await batchRejectQuestions({ questionIds: selectedIds.value, reviewComment: t('admin.resources.questions.actions.batchReject') })
      message.success(t('admin.resources.questions.messages.batchRejectSuccess'))
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
    message.success(t('admin.resources.questions.messages.approveSuccess'))
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
    message.success(t('admin.resources.questions.messages.rejectSuccess'))
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

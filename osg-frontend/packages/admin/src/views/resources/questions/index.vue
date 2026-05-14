<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('interview_question_review')" title-en="Question Review" :description="$t('review_interview_questions_submitted_by_')">
      <template #actions>
        <a-button @click="message.success($t('current_filtered_results_exported'))">
          <template #icon><ExportOutlined /></template>
          {{ $t('export') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="pendingCount > 0"
      type="warning"
      show-icon
      :message="$t('pending_interview_questions_count', { count: pendingCount })"
      :description="$t('prioritize_questions_forwarded_by_the_cl')"
    >
      <template #action>
        <a-button size="small" @click="activeTab = 'pending'">{{ $t('view_pending_reviews') }}</a-button>
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
          <a-input v-model:value="filters.keyword" :placeholder="$t('search_student_company_question_id')" allow-clear style="width: 200px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="filters.companyName" :placeholder="$t('company')" allow-clear style="width: 120px" @press-enter="loadRows" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.interviewRound" :placeholder="$t('all_rounds')" allow-clear style="width: 120px">
            <a-select-option v-for="round in interviewRoundOptions" :key="round" :value="round">{{ round }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.beginDate" :placeholder="$t('start_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-date-picker v-model:value="filters.endDate" :placeholder="$t('end_date_2')" value-format="YYYY-MM-DD" style="width: 130px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadRows">
              <template #icon><SearchOutlined /></template>
              {{ $t('search') }}
            </a-button>
            <a-button @click="handleReset">{{ $t('reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <a-button type="primary" :disabled="!canBatchReview" @click="reviewSelected('approved')">{{ $t('batch_approve') }}</a-button>
        <a-button danger :disabled="!canBatchReview" @click="reviewSelected('rejected')">{{ $t('batch_reject') }}</a-button>
        <span style="color: #1890ff">{{ $t('selected_records_count', { count: selectedIds.length }) }}</span>
        <span style="margin-left: auto; font-size: 13px; color: #64748b">{{ $t('source_interview_application_self_submit') }}</span>
      </div>

      <a-table
        :columns="questionColumns"
        :data-source="rows"
        :row-key="(r: InterviewQuestionRow) => r.questionId"
        :pagination="false"
        :locale="{ emptyText: $t('no_interview_question_records') }"
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
            {{ $t('question_count_with_value', { count: record.questionCount }) }}
          </template>
          <template v-else-if="column.dataIndex === 'sourceType'">
            <a-tag :color="sourceTypeColor(record.sourceType)">{{ sourceTypeDisplay(record.sourceType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'submittedAt'">
            {{ formatTime(record.submittedAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button v-if="record.reviewStatus === 'pending'" type="link" size="small" @click="openReviewModal(record)">{{ $t('review') }}</a-button>
            <a-tag v-else :color="record.reviewStatus === 'approved' ? 'green' : 'red'">{{ reviewStatusLabel[record.reviewStatus] }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-alert type="info" show-icon :message="$t('review_rules')" :description="`${$t('once_approved_interview_questions_will_b')}。`" />

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
  type QuestionTab,
  QUESTION_SOURCE_TYPE_MAP
} from '@osg/shared/api/admin/question'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const sourceTypeDisplay = (raw: string) => {
  const entry = QUESTION_SOURCE_TYPE_MAP[raw]
  return entry ? t(entry.i18nKey) : raw
}
const sourceTypeColor = (raw: string) => QUESTION_SOURCE_TYPE_MAP[raw]?.color ?? 'blue'

const questionColumns = [
  { title: 'ID', dataIndex: 'questionCode', key: 'questionCode', width: 100 },
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: t('company'), dataIndex: 'companyName', key: 'companyName', width: 120 },
  { title: t('department'), dataIndex: 'departmentName', key: 'departmentName', width: 100 },
  { title: t('office_location'), dataIndex: 'officeLocation', key: 'officeLocation', width: 100 },
  { title: t('round'), dataIndex: 'interviewRound', key: 'interviewRound', width: 80 },
  { title: t('question_count'), dataIndex: 'questionCount', key: 'questionCount', width: 80 },
  { title: t('source'), dataIndex: 'sourceType', key: 'sourceType', width: 110 },
  { title: t('submission_time'), dataIndex: 'submittedAt', key: 'submittedAt', width: 130 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 90 },
]

const tabs: Array<{ key: QuestionTab; label: string }> = [
  { key: 'pending', label: t('pending_review') },
  { key: 'approved', label: t('approved') },
  { key: 'rejected', label: t('rejected_3') }
]

const interviewRoundOptions: InterviewRound[] = ['R1', 'R2', 'Final', 'Superday', 'HireVue']
const reviewStatusLabel: Record<QuestionReviewStatus, string> = {
  pending: t('pending_review'),
  approved: t('approved'),
  rejected: t('rejected_3')
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
    message.error(t('failed_to_load_interview_question_list'))
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
      await batchApproveQuestions({ questionIds: selectedIds.value, reviewComment: t('batch_approve') })
      message.success(t('batch_approval_successful'))
    }
    else
    {
      await batchRejectQuestions({ questionIds: selectedIds.value, reviewComment: t('batch_reject') })
      message.success(t('batch_rejection_successful'))
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
    message.success(t('approved_and_shared'))
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
    message.success(t('this_question_has_been_rejected'))
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


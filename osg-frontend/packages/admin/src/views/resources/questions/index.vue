<template>
  <section class="questions-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Interview Resource Center</p>
        <h1>面试真题审核</h1>
        <p class="page-subtitle">审核学员提交的面试真题，通过后自动开放给相同申请的学生</p>
      </div>
      <button type="button" class="ghost-button" @click="message.success('已导出当前筛选结果')">导出</button>
    </header>

    <section v-if="pendingCount > 0" class="banner-card">
      <div>
        <strong>当前有 {{ pendingCount }} 条面试真题待审核，请及时处理</strong>
        <p>优先处理班主任流转过来的真题，审核通过后会自动开放给同公司 + 同部门 + 同办公地点 + 同面试状态 的学生。</p>
      </div>
      <button type="button" class="ghost-button ghost-button--warn" @click="activeTab = 'pending'">查看待审核</button>
    </section>

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
        <span v-if="tab.key === 'pending'" class="tab-pill__count">{{ pendingCount }}</span>
      </button>
    </section>

    <section class="toolbar-card">
      <input v-model.trim="filters.keyword" class="toolbar-input" type="search" placeholder="搜索学员 / 公司 / 真题编号">
      <input v-model.trim="filters.companyName" class="toolbar-input" type="search" placeholder="公司">
      <select v-model="filters.interviewRound" class="toolbar-select">
        <option value="">全部轮次</option>
        <option v-for="round in interviewRoundOptions" :key="round" :value="round">{{ round }}</option>
      </select>
      <input v-model="filters.beginDate" class="toolbar-input toolbar-input--date" type="date">
      <input v-model="filters.endDate" class="toolbar-input toolbar-input--date" type="date">
      <button type="button" class="ghost-button" @click="loadRows">搜索</button>
      <button type="button" class="ghost-button ghost-button--light" @click="handleReset">重置</button>
    </section>

    <section class="batch-card">
      <button type="button" class="primary-button" :disabled="!canBatchReview" @click="reviewSelected('approved')">批量通过</button>
      <button type="button" class="ghost-button ghost-button--danger" :disabled="!canBatchReview" @click="reviewSelected('rejected')">批量驳回</button>
      <span>已选择 {{ selectedIds.length }} 条</span>
      <span class="batch-card__legend">来源字典：入职面试申请 / 自主填写</span>
    </section>

    <section class="table-card">
      <table class="question-table">
        <thead>
          <tr>
            <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll"></th>
            <th>ID</th>
            <th>学员</th>
            <th>公司</th>
            <th>部门</th>
            <th>办公地点</th>
            <th>轮次</th>
            <th>题目数</th>
            <th>来源</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.questionId" :class="{ 'question-row--pending': row.reviewStatus === 'pending' }">
            <td>
              <input
                :disabled="activeTab !== 'pending'"
                type="checkbox"
                :checked="selectedIds.includes(row.questionId)"
                @change="toggleRow(row.questionId)"
              >
            </td>
            <td class="code-cell">{{ row.questionCode }}</td>
            <td>
              <strong>{{ row.studentName }}</strong>
              <small>{{ row.studentId || '—' }}</small>
            </td>
            <td><strong>{{ row.companyName }}</strong></td>
            <td>{{ row.departmentName }}</td>
            <td>{{ row.officeLocation }}</td>
            <td>{{ row.interviewRound }}</td>
            <td>{{ row.questionCount }} 题</td>
            <td>
              <span class="source-pill" :class="`source-pill--${row.sourceType === '入职面试申请' ? 'referral' : 'self'}`">
                {{ row.sourceType }}
              </span>
            </td>
            <td>{{ formatTime(row.submittedAt) }}</td>
            <td>
              <button
                v-if="row.reviewStatus === 'pending'"
                type="button"
                class="link-button"
                @click="openReviewModal(row)"
              >
                审核
              </button>
              <span v-else class="status-pill" :class="`status-pill--${row.reviewStatus}`">
                {{ reviewStatusLabel[row.reviewStatus] }}
              </span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="11" class="empty-row">暂无面试真题记录</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="rule-card">
      <strong>审核规则</strong>
      <p>审核通过后，面试真题将自动开放给满足以下条件的学生：同公司 + 同部门 + 同办公地点 + 同面试状态。</p>
    </section>

    <QuestionReviewModal
      v-model="showReviewModal"
      :row="reviewingRow"
      :submitting="submitting"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
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
  interviewRound: '' as InterviewRound | '',
  beginDate: '',
  endDate: ''
})

const canBatchReview = computed(() => activeTab.value === 'pending' && selectedIds.value.length > 0)
const allSelected = computed(() => rows.value.length > 0 && selectedIds.value.length === rows.value.length && activeTab.value === 'pending')

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
    interviewRound: '',
    beginDate: '',
    endDate: ''
  }
  void loadRows()
}

const toggleRow = (questionId: number) => {
  if (selectedIds.value.includes(questionId))
  {
    selectedIds.value = selectedIds.value.filter((item) => item !== questionId)
    return
  }
  selectedIds.value = [...selectedIds.value, questionId]
}

const toggleSelectAll = () => {
  if (allSelected.value)
  {
    selectedIds.value = []
    return
  }
  selectedIds.value = rows.value.map((row) => row.questionId)
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
.questions-page {
  display: grid;
  gap: 18px;
  padding: 8px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: #475569;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  font-size: 34px;
  color: #0f172a;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #475569;
}

.banner-card,
.toolbar-card,
.batch-card,
.table-card,
.rule-card {
  padding: 18px 20px;
  border: 1px solid #dbe4f0;
  border-radius: 24px;
  background: #fff;
}

.banner-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: #facc15;
}

.banner-card p {
  margin: 6px 0 0;
  color: #7c2d12;
}

.tabs-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border: 1px solid #dbe4f0;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
}

.tab-pill--active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}

.tab-pill__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
}

.toolbar-card {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.toolbar-input,
.toolbar-select {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
}

.toolbar-input--date {
  min-width: 0;
}

.batch-card {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #475569;
}

.batch-card__legend {
  margin-left: auto;
  font-size: 13px;
  color: #64748b;
}

.question-table {
  width: 100%;
  border-collapse: collapse;
}

.question-table th,
.question-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.question-row--pending {
  background: #fefce8;
}

.code-cell {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.source-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.source-pill--referral {
  color: #92400e;
  background: #fef3c7;
}

.source-pill--self {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-pill--approved {
  color: #166534;
  background: #dcfce7;
}

.status-pill--rejected {
  color: #b91c1c;
  background: #fee2e2;
}

.link-button {
  border: none;
  background: transparent;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.empty-row {
  text-align: center;
  color: #64748b;
}

.rule-card {
  color: #0c4a6e;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.primary-button,
.ghost-button {
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.ghost-button {
  border: 1px solid #cbd5e1;
  color: #0f172a;
  background: #fff;
}

.ghost-button--warn {
  color: #92400e;
  border-color: #f59e0b;
  background: rgba(255, 255, 255, 0.68);
}

.ghost-button--danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff1f2;
}

.ghost-button--light {
  color: #475569;
}

.primary-button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 1100px) {
  .toolbar-card {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-header,
  .banner-card,
  .batch-card {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-card__legend {
    margin-left: 0;
  }

  .toolbar-card {
    grid-template-columns: 1fr;
  }

  .table-card {
    overflow-x: auto;
  }
}
</style>

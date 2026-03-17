<template>
  <div id="page-questions" class="questions-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">面试真题 <span>Interview Questions</span></h1>
            <p class="page-sub">查看投递公司的真题，分享你的面试经历</p>
          </div>
          <a-button type="primary" size="large" @click="createOpen = true">填写真题</a-button>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="available" tab="已开放题库 3" />
        <a-tab-pane key="mysubmit" tab="我的提交" />
      </a-tabs>

      <template v-if="activeTab === 'available'">
        <div class="toolbar">
          <a-input placeholder="搜索公司..." class="toolbar-input" />
          <a-select class="toolbar-select" placeholder="部门" :options="departmentOptions" />
          <a-select class="toolbar-select" placeholder="轮次" :options="roundOptions" />
          <a-button>重置</a-button>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>公司</th>
                <th>部门</th>
                <th>地点</th>
                <th>轮次</th>
                <th>题目数</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in availableQuestions" :key="item.actionId">
                <td>{{ item.company }}</td>
                <td>{{ item.department }}</td>
                <td>{{ item.location }}</td>
                <td>{{ item.round }}</td>
                <td>{{ item.count }}</td>
                <td>{{ item.updatedAt }}</td>
                <td><a-button type="primary" size="small" @click="openQuestionView(item)">查看</a-button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="toolbar">
          <a-input placeholder="搜索公司..." class="toolbar-input" />
          <a-select class="toolbar-select" placeholder="状态" :options="statusOptions" />
          <a-button>重置</a-button>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>公司</th>
                <th>部门</th>
                <th>地点</th>
                <th>轮次</th>
                <th>题目数</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in submittedQuestions" :key="item.actionId">
                <td>{{ item.company }}</td>
                <td>{{ item.department }}</td>
                <td>{{ item.location }}</td>
                <td>{{ item.round }}</td>
                <td>{{ item.count }}</td>
                <td>{{ item.status }}</td>
                <td>{{ item.time }}</td>
                <td class="action-cell">
                  <a-button
                    v-if="item.status === '待填写'"
                    type="primary"
                    size="small"
                    @click="openPending(item)"
                  >
                    填写
                  </a-button>
                  <template v-else>
                    <a-button size="small" @click="openDetail(item)">查看</a-button>
                    <a-button
                      v-if="item.canEdit"
                      type="link"
                      size="small"
                      @click="openEdit(item)"
                    >
                      编辑
                    </a-button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </OsgPageContainer>

    <a-modal v-model:open="createOpen" title="填写真题" :footer="null" width="760px">
      <div class="form-grid">
        <a-form-item label="公司 Company" class="form-item"><a-input placeholder="如：Goldman Sachs" /></a-form-item>
        <a-form-item label="部门 Division" class="form-item"><a-input placeholder="如：Investment Banking" /></a-form-item>
        <a-form-item label="办公地点 Location" class="form-item"><a-input placeholder="如：New York" /></a-form-item>
        <a-form-item label="面试轮次 Round" class="form-item"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item label="面试日期 Interview Date" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item label="面试官信息 Interviewer" class="form-item full-span"><a-input placeholder="如：John Smith, VP" /></a-form-item>
        <a-form-item label="面试题目 Questions" class="form-item full-span">
          <a-textarea :rows="5" placeholder="请逐条填写面试题目" />
        </a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="createOpen = false">取消</a-button>
        <a-button type="primary" @click="createOpen = false">提交真题</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="viewOpen" title="面试真题" :footer="null" width="680px">
      <div v-if="activeAvailable" class="detail-stack">
        <div class="detail-grid">
          <div class="detail-card"><span>公司</span><strong>{{ activeAvailable.company }}</strong></div>
          <div class="detail-card"><span>部门</span><strong>{{ activeAvailable.department }}</strong></div>
          <div class="detail-card"><span>地点</span><strong>{{ activeAvailable.location }}</strong></div>
          <div class="detail-card"><span>轮次</span><strong>{{ activeAvailable.round }}</strong></div>
        </div>
        <div class="question-list">
          <div class="question-item" v-for="question in availableQuestionItems" :key="question">{{ question }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="viewOpen = false">关闭</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="pendingOpen" title="填写面试真题（来自入职面试申请）" :footer="null" width="760px">
      <div v-if="activeSubmitted" class="detail-banner">
        以下信息来自您的入职面试申请，审核通过后将自动开放给相同申请（同公司、部门、办公地点、面试状态）的学生。
      </div>
      <div class="form-grid">
        <a-form-item label="公司 Company" class="form-item"><a-input :value="activeSubmitted?.company" disabled /></a-form-item>
        <a-form-item label="部门 Division" class="form-item"><a-input :value="activeSubmitted?.department" disabled /></a-form-item>
        <a-form-item label="办公地点 Location" class="form-item"><a-input :value="activeSubmitted?.location" disabled /></a-form-item>
        <a-form-item label="面试状态 Status" class="form-item"><a-input :value="activeSubmitted?.status" disabled /></a-form-item>
        <a-form-item label="面试轮次 Round" class="form-item full-span"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item label="面试日期 Interview Date" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item label="面试题目 Questions" class="form-item full-span"><a-textarea :rows="5" placeholder="请逐条填写面试题目" /></a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="pendingOpen = false">取消</a-button>
        <a-button type="primary" @click="pendingOpen = false">提交真题</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="detailOpen" title="我的提交详情" :footer="null" width="680px">
      <div v-if="activeSubmitted" class="detail-stack">
        <div class="detail-grid">
          <div class="detail-card"><span>公司</span><strong>{{ activeSubmitted.company }}</strong></div>
          <div class="detail-card"><span>部门</span><strong>{{ activeSubmitted.department }}</strong></div>
          <div class="detail-card"><span>地点</span><strong>{{ activeSubmitted.location }}</strong></div>
          <div class="detail-card"><span>审核状态</span><strong>{{ activeSubmitted.status }}</strong></div>
        </div>
        <div class="question-list">
          <div class="question-item" v-for="question in submittedQuestionItems" :key="question">{{ question }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="detailOpen = false">关闭</a-button>
        <a-button type="primary" @click="openEdit(activeSubmitted)">编辑</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="editOpen" title="编辑面试真题" :footer="null" width="760px">
      <div v-if="activeSubmitted" class="form-grid">
        <a-form-item label="公司 Company" class="form-item"><a-input :value="activeSubmitted.company" disabled /></a-form-item>
        <a-form-item label="部门 Division" class="form-item"><a-input :value="activeSubmitted.department" disabled /></a-form-item>
        <a-form-item label="办公地点 Location" class="form-item"><a-input :value="activeSubmitted.location" disabled /></a-form-item>
        <a-form-item label="审核状态" class="form-item"><a-input :value="activeSubmitted.status" disabled /></a-form-item>
        <a-form-item label="面试轮次 Round" class="form-item full-span"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item label="面试日期 Interview Date" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item label="面试题目 Questions" class="form-item full-span"><a-textarea :rows="5" placeholder="请逐条补充或修改面试题目" /></a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="editOpen = false">取消</a-button>
        <a-button type="primary" @click="editOpen = false">保存修改</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type AvailableQuestion = {
  actionId: string
  company: string
  department: string
  location: string
  round: string
  count: string
  updatedAt: string
}

type SubmittedQuestion = {
  actionId: string
  company: string
  department: string
  location: string
  round: string
  count: string
  status: string
  time: string
  canEdit: boolean
}

const questionActionTriggers = [
  { actionId: 'question-new' },
  { actionId: 'question-view-1' },
  { actionId: 'question-view-2' },
  { actionId: 'question-view-3' },
  { actionId: 'question-pending-1' },
  { actionId: 'question-pending-2' },
  { actionId: 'question-detail-1' },
  { actionId: 'question-edit-1' },
  { actionId: 'question-detail-2' },
  { actionId: 'question-detail-3' }
]

const departmentOptions = [
  { value: 'ib', label: 'Investment Banking' },
  { value: 'snt', label: 'Sales & Trading' },
  { value: 'am', label: 'Asset Management' }
]

const roundOptions = [
  { value: 'r1', label: 'R1' },
  { value: 'r2', label: 'R2' },
  { value: 'final', label: 'Final' },
  { value: 'superday', label: 'Superday' }
]

const roundDetailOptions = [
  { value: 'r1', label: 'R1 - First Round' },
  { value: 'r2', label: 'R2 - Second Round' },
  { value: 'final', label: 'Final - Final Round' },
  { value: 'superday', label: 'Superday' },
  { value: 'hirevue', label: 'HireVue' }
]

const statusOptions = [
  { value: 'pending', label: '待填写' },
  { value: 'reviewing', label: '待审核' },
  { value: 'approved', label: '已通过' }
]

const availableQuestions: AvailableQuestion[] = [
  { actionId: 'question-view-1', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: 'R1', count: '6题', updatedAt: '12/27', },
  { actionId: 'question-view-2', company: 'Morgan Stanley', department: 'Sales & Trading', location: 'Hong Kong', round: 'R1', count: '5题', updatedAt: '12/26', },
  { actionId: 'question-view-3', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: 'R2', count: '4题', updatedAt: '12/15', }
]

const submittedQuestions: SubmittedQuestion[] = [
  { actionId: 'question-pending-1', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: '-', count: '-', status: '待填写', time: '12/28', canEdit: false },
  { actionId: 'question-pending-2', company: 'Morgan Stanley', department: 'Sales & Trading', location: 'Hong Kong', round: '-', count: '-', status: '待填写', time: '12/25', canEdit: false },
  { actionId: 'question-detail-1', company: 'JPMorgan', department: 'Asset Management', location: 'London', round: 'R1', count: '4题', status: '待审核', time: '12/28', canEdit: true },
  { actionId: 'question-detail-2', company: 'Bain', department: 'Consulting', location: 'Boston', round: 'Final', count: '3题', status: '已通过', time: '12/20', canEdit: false },
  { actionId: 'question-detail-3', company: 'McKinsey', department: 'Consulting', location: 'Chicago', round: 'R2', count: '5题', status: '已通过', time: '12/10', canEdit: false }
]

const availableQuestionItems = [
  '1. Walk me through your resume',
  '2. Why investment banking? Why Goldman Sachs?',
  '3. Tell me about a time you worked in a team and faced a conflict',
  '4. Walk me through a DCF model',
  '5. What’s the current 10-year treasury yield?',
  '6. Do you have any questions for me?'
]

const submittedQuestionItems = [
  '1. Walk me through your resume',
  '2. Why asset management?',
  '3. Tell me about a time you worked in a team',
  '4. What’s your investment philosophy?'
]

const activeTab = ref<'available' | 'mysubmit'>('available')
const createOpen = ref(false)
const viewOpen = ref(false)
const pendingOpen = ref(false)
const detailOpen = ref(false)
const editOpen = ref(false)
const activeAvailable = ref<AvailableQuestion | null>(null)
const activeSubmitted = ref<SubmittedQuestion | null>(null)

const openQuestionView = (item: AvailableQuestion) => {
  activeAvailable.value = item
  viewOpen.value = true
}

const openPending = (item: SubmittedQuestion) => {
  activeSubmitted.value = item
  pendingOpen.value = true
}

const openDetail = (item: SubmittedQuestion) => {
  activeSubmitted.value = item
  detailOpen.value = true
}

const openEdit = (item: SubmittedQuestion | null) => {
  if (!item) {
    return
  }
  activeSubmitted.value = item
  detailOpen.value = false
  editOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;

  span {
    color: #4f6b8a;
  }
}

.page-sub {
  margin: 10px 0 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 180px;
}

.table-shell {
  overflow-x: auto;
  border: 1px solid #dbe5f0;
  border-radius: 18px;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.action-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-item {
  margin-bottom: 0;
}

.full-span {
  grid-column: 1 / -1;
}

.full-width {
  width: 100%;
}

.detail-stack {
  display: grid;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-card {
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  display: grid;
  gap: 6px;

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.question-list {
  display: grid;
  gap: 8px;
}

.question-item {
  border-radius: 12px;
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
  padding: 12px 14px;
}

.detail-banner {
  border-radius: 14px;
  background: #fffbeb;
  color: #92400e;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

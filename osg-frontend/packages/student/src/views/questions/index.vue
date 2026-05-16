<template>
  <div id="page-questions" class="questions-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.questions.k1') }} <span>Interview Questions</span></h1>
          </div>
          <a-button type="primary" size="large" @click="createOpen = true">{{ t('student.questions.k2') }}</a-button>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="available" :tab="t('student.questions.k22')" />
        <a-tab-pane key="mysubmit" :tab="t('student.questions.k23')" />
      </a-tabs>

      <template v-if="activeTab === 'available'">
        <div class="toolbar">
          <a-input :placeholder="t('student.questions.k24')" class="toolbar-input" />
          <a-select class="toolbar-select" :placeholder="t('student.questions.k5')" :options="departmentOptions" />
          <a-select class="toolbar-select" :placeholder="t('student.questions.k7')" :options="roundOptions" />
          <a-button>{{ t('student.questions.k3') }}</a-button>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>{{ t('student.questions.k4') }}</th>
                <th>{{ t('student.questions.k5') }}</th>
                <th>{{ t('student.questions.k6') }}</th>
                <th>{{ t('student.questions.k7') }}</th>
                <th>{{ t('student.questions.k8') }}</th>
                <th>{{ t('student.questions.k9') }}</th>
                <th>{{ t('student.questions.k10') }}</th>
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
                <td><a-button type="primary" size="small" @click="openQuestionView(item)">{{ t('student.questions.k11') }}</a-button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="toolbar">
          <a-input :placeholder="t('student.questions.k24')" class="toolbar-input" />
          <a-select class="toolbar-select" :placeholder="t('student.questions.k12')" :options="statusOptions" />
          <a-button>{{ t('student.questions.k3') }}</a-button>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>{{ t('student.questions.k4') }}</th>
                <th>{{ t('student.questions.k5') }}</th>
                <th>{{ t('student.questions.k6') }}</th>
                <th>{{ t('student.questions.k7') }}</th>
                <th>{{ t('student.questions.k8') }}</th>
                <th>{{ t('student.questions.k12') }}</th>
                <th>{{ t('student.questions.k13') }}</th>
                <th>{{ t('student.questions.k10') }}</th>
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
                    v-if="item.status === STATUS_PENDING"

                    type="primary"
                    size="small"
                    @click="openPending(item)"
                  >
                    {{ t('student.questions.k14') }}
                  </a-button>
                  <template v-else>
                    <a-button size="small" @click="openDetail(item)">{{ t('student.questions.k11') }}</a-button>
                    <a-button
                      v-if="item.canEdit"
                      type="link"
                      size="small"
                      @click="openEdit(item)"
                    >
                      {{ t('student.questions.k15') }}
                    </a-button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </OsgPageContainer>

    <a-modal v-model:open="createOpen" :title="t('student.questions.k2')" :footer="null" width="760px" wrap-class-name="osg-modal-form">
      <div class="form-grid">
        <a-form-item :label="t('student.questions.k25')" class="form-item"><a-input :placeholder="t('student.questions.k26')" /></a-form-item>
        <a-form-item :label="t('student.questions.k27')" class="form-item"><a-input :placeholder="t('student.questions.k28')" /></a-form-item>
        <a-form-item :label="t('student.questions.k29')" class="form-item"><a-input :placeholder="t('student.questions.k30')" /></a-form-item>
        <a-form-item :label="t('student.questions.k31')" class="form-item"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item :label="t('student.questions.k32')" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item :label="t('student.questions.k33')" class="form-item full-span"><a-input :placeholder="t('student.questions.k34')" /></a-form-item>
        <a-form-item :label="t('student.questions.k35')" class="form-item full-span">
          <a-textarea :rows="5" :placeholder="t('student.questions.k36')" />
        </a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="createOpen = false">{{ t('student.questions.k16') }}</a-button>
        <a-button type="primary" @click="createOpen = false">{{ t('student.questions.k17') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="viewOpen" :title="t('student.questions.k1')" :footer="null" width="680px" wrap-class-name="osg-modal-form">
      <div v-if="activeAvailable" class="detail-stack">
        <div class="detail-grid">
          <div class="detail-card"><span>{{ t('student.questions.k4') }}</span><strong>{{ activeAvailable.company }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k5') }}</span><strong>{{ activeAvailable.department }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k6') }}</span><strong>{{ activeAvailable.location }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k7') }}</span><strong>{{ activeAvailable.round }}</strong></div>
        </div>
        <div class="question-list">
          <div class="question-item" v-for="question in availableQuestionItems" :key="question">{{ question }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="viewOpen = false">{{ t('student.questions.k18') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="pendingOpen" :title="t('student.questions.k37')" :footer="null" width="760px" wrap-class-name="osg-modal-form">
      <div v-if="activeSubmitted" class="detail-banner">
        {{ t('student.questions.k19') }}
      </div>
      <div class="form-grid">
        <a-form-item :label="t('student.questions.k25')" class="form-item"><a-input :value="activeSubmitted?.company" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k27')" class="form-item"><a-input :value="activeSubmitted?.department" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k29')" class="form-item"><a-input :value="activeSubmitted?.location" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k38')" class="form-item"><a-input :value="activeSubmitted?.status" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k31')" class="form-item full-span"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item :label="t('student.questions.k32')" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item :label="t('student.questions.k35')" class="form-item full-span"><a-textarea :rows="5" :placeholder="t('student.questions.k36')" /></a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="pendingOpen = false">{{ t('student.questions.k16') }}</a-button>
        <a-button type="primary" @click="pendingOpen = false">{{ t('student.questions.k17') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="detailOpen" :title="t('student.questions.k39')" :footer="null" width="680px" wrap-class-name="osg-modal-form">
      <div v-if="activeSubmitted" class="detail-stack">
        <div class="detail-grid">
          <div class="detail-card"><span>{{ t('student.questions.k4') }}</span><strong>{{ activeSubmitted.company }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k5') }}</span><strong>{{ activeSubmitted.department }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k6') }}</span><strong>{{ activeSubmitted.location }}</strong></div>
          <div class="detail-card"><span>{{ t('student.questions.k20') }}</span><strong>{{ activeSubmitted.status }}</strong></div>
        </div>
        <div class="question-list">
          <div class="question-item" v-for="question in submittedQuestionItems" :key="question">{{ question }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <a-button @click="detailOpen = false">{{ t('student.questions.k18') }}</a-button>
        <a-button type="primary" @click="openEdit(activeSubmitted)">{{ t('student.questions.k15') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="editOpen" :title="t('student.questions.k40')" :footer="null" width="760px" wrap-class-name="osg-modal-form">
      <div v-if="activeSubmitted" class="form-grid">
        <a-form-item :label="t('student.questions.k25')" class="form-item"><a-input :value="activeSubmitted.company" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k27')" class="form-item"><a-input :value="activeSubmitted.department" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k29')" class="form-item"><a-input :value="activeSubmitted.location" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k20')" class="form-item"><a-input :value="activeSubmitted.status" disabled /></a-form-item>
        <a-form-item :label="t('student.questions.k31')" class="form-item full-span"><a-select :options="roundDetailOptions" /></a-form-item>
        <a-form-item :label="t('student.questions.k32')" class="form-item full-span"><a-date-picker class="full-width" /></a-form-item>
        <a-form-item :label="t('student.questions.k35')" class="form-item full-span"><a-textarea :rows="5" :placeholder="t('student.questions.k41')" /></a-form-item>
      </div>
      <div class="dialog-actions">
        <a-button @click="editOpen = false">{{ t('student.questions.k16') }}</a-button>
        <a-button type="primary" @click="editOpen = false">{{ t('student.questions.k21') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const STATUS_PENDING = '待填写' // i18n-skip-line: backend enum value

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
  { value: 'pending', label: t('student.questions.k42') },
  { value: 'reviewing', label: t('student.questions.k43') },
  { value: 'approved', label: t('student.questions.k44') }
]

const availableQuestions: AvailableQuestion[] = [
  { actionId: 'question-view-1', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: 'R1', count: t('student.questions.k45'), updatedAt: '12/27', },
  { actionId: 'question-view-2', company: 'Morgan Stanley', department: 'Sales & Trading', location: 'Hong Kong', round: 'R1', count: t('student.questions.k46'), updatedAt: '12/26', },
  { actionId: 'question-view-3', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: 'R2', count: t('student.questions.k47'), updatedAt: '12/15', }
]

const submittedQuestions: SubmittedQuestion[] = [
  { actionId: 'question-pending-1', company: 'Goldman Sachs', department: 'Investment Banking', location: 'New York', round: '-', count: '-', status: t('student.questions.k42'), time: '12/28', canEdit: false },
  { actionId: 'question-pending-2', company: 'Morgan Stanley', department: 'Sales & Trading', location: 'Hong Kong', round: '-', count: '-', status: t('student.questions.k42'), time: '12/25', canEdit: false },
  { actionId: 'question-detail-1', company: 'JPMorgan', department: 'Asset Management', location: 'London', round: 'R1', count: t('student.questions.k47'), status: t('student.questions.k43'), time: '12/28', canEdit: true },
  { actionId: 'question-detail-2', company: 'Bain', department: 'Consulting', location: 'Boston', round: 'Final', count: t('student.questions.k48'), status: t('student.questions.k44'), time: '12/20', canEdit: false },
  { actionId: 'question-detail-3', company: 'McKinsey', department: 'Consulting', location: 'Chicago', round: 'R2', count: t('student.questions.k46'), status: t('student.questions.k44'), time: '12/10', canEdit: false }
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

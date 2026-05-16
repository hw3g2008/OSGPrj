<template>
  <div id="page-ai-interview" class="ai-interview-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.aiInterview.k1') }} <span>AI Interview Analysis</span></h1>
          </div>
          <a-button type="primary" size="large" @click="uploadOpen = true">{{ t('student.aiInterview.k2') }}</a-button>
        </div>
      </template>

      <section class="highlight-card">
        <div class="highlight-head">{{ t('student.aiInterview.k3') }}</div>
        <div class="highlight-grid">
          <div class="score-column">
            <div class="score-item">
              <span class="score-label">{{ t('student.aiInterview.k4') }}</span>
              <strong>Goldman_Sachs_Interview_Round2.mp4</strong>
            </div>
            <div class="score-item">
              <span class="score-label">{{ t('student.aiInterview.k5') }}</span>
              <div class="score-bar">
                <strong>85</strong>
                <div class="bar-track"><span class="bar-fill" /></div>
              </div>
            </div>
            <div class="metric-grid">
              <div class="metric-card"><span>{{ t('student.aiInterview.k6') }}</span><strong>{{ t('student.aiInterview.k7') }}</strong></div>
              <div class="metric-card"><span>{{ t('student.aiInterview.k8') }}</span><strong>{{ t('student.aiInterview.k9') }}</strong></div>
              <div class="metric-card"><span>{{ t('student.aiInterview.k10') }}</span><strong>{{ t('student.aiInterview.k11') }}</strong></div>
              <div class="metric-card"><span>{{ t('student.aiInterview.k12') }}</span><strong>{{ t('student.aiInterview.k13') }}</strong></div>
            </div>
          </div>
          <div class="suggestion-column">
            <div class="suggestion-heading">{{ t('student.aiInterview.k14') }}</div>
            <div class="suggestion-card success">
              <div class="suggestion-title">{{ t('student.aiInterview.k15') }}</div>
              <p>{{ t('student.aiInterview.k16') }}</p>
            </div>
            <div class="suggestion-card warning">
              <div class="suggestion-title">{{ t('student.aiInterview.k17') }}</div>
              <p>{{ t('student.aiInterview.k18') }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="history-card">
        <div class="history-head">{{ t('student.aiInterview.k19') }}</div>
        <div class="table-shell">
          <a-table
            :columns="historyColumns"
            :data-source="interviewHistory"
            :pagination="false"
            :row-key="(record: any) => record.fileName"
            class="record-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-button type="link" size="small" @click="openDetail(record)">{{ t('student.aiInterview.k20') }}</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="uploadOpen" :title="t('student.aiInterview.k30')" :footer="null" width="560px" wrap-class-name="osg-modal-form">
      <div class="upload-stack">
        <p>{{ t('student.aiInterview.k21') }}</p>
        <a-upload-dragger :show-upload-list="false" accept=".mp3,.mp4,.wav,.m4a">
          <p class="upload-title">{{ t('student.aiInterview.k22') }}</p>
          <p class="upload-hint">{{ t('student.aiInterview.k23') }}</p>
        </a-upload-dragger>
      </div>

      <div class="dialog-actions">
        <a-button @click="uploadOpen = false">{{ t('student.aiInterview.k24') }}</a-button>
        <a-button type="primary" @click="uploadOpen = false">{{ t('student.aiInterview.k25') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="detailOpen" :title="t('student.aiInterview.k31')" :footer="null" width="680px" wrap-class-name="osg-modal-form">
      <div v-if="activeDetail" class="detail-stack">
        <div class="detail-summary">
          <div>
            <div class="score-label">{{ t('student.aiInterview.k26') }}</div>
            <strong>{{ activeDetail.fileName }}</strong>
          </div>
          <a-tag color="success">{{ activeDetail.score }}</a-tag>
        </div>
        <div class="detail-box">
          <strong>{{ t('student.aiInterview.k27') }}</strong>
          <p>{{ activeDetail.company }} · {{ activeDetail.round }}</p>
        </div>
        <div class="detail-box">
          <strong>{{ t('student.aiInterview.k28') }}</strong>
          <p>{{ activeDetail.report }}</p>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="detailOpen = false">{{ t('student.aiInterview.k29') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

type InterviewHistoryItem = {
  fileName: string
  company: string
  round: string
  score: string
  analyzedAt: string
  report: string
}

const historyColumns = [
  { title: t('student.aiInterview.k26'), dataIndex: 'fileName', key: 'fileName' },
  { title: t('student.aiInterview.k32'), dataIndex: 'company', key: 'company' },
  { title: t('student.aiInterview.k33'), dataIndex: 'round', key: 'round' },
  { title: t('student.aiInterview.k5'), dataIndex: 'score', key: 'score' },
  { title: t('student.aiInterview.k34'), dataIndex: 'analyzedAt', key: 'analyzedAt' },
  { title: t('student.aiInterview.k35'), key: 'action' },
]

const interviewHistory: InterviewHistoryItem[] = [
  {
    fileName: 'Goldman_Sachs_Interview_Round2.mp4',
    company: 'Goldman Sachs',
    round: 'Second Round',
    score: t('student.aiInterview.k36'),
    analyzedAt: '12/15/2025',
    report: t('student.aiInterview.k37')
  },
  {
    fileName: 'McKinsey_Case_Practice.mp3',
    company: 'McKinsey',
    round: 'Case Interview',
    score: t('student.aiInterview.k11'),
    analyzedAt: '12/10/2025',
    report: t('student.aiInterview.k38')
  },
  {
    fileName: 'Morgan_Stanley_Behavioral.mp4',
    company: 'Morgan Stanley',
    round: 'First Round',
    score: t('student.aiInterview.k39'),
    analyzedAt: '12/05/2025',
    report: t('student.aiInterview.k40')
  }
]

const uploadOpen = ref(false)
const detailOpen = ref(false)
const activeDetail = ref<InterviewHistoryItem | null>(null)

const openDetail = (item: InterviewHistoryItem) => {
  activeDetail.value = item
  detailOpen.value = true
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

.highlight-card,
.history-card {
  border-radius: 22px;
  border: 1px solid #dbe5f0;
  background: #fff;
  overflow: hidden;
}

.highlight-card {
  margin-bottom: 20px;
}

.highlight-head {
  padding: 16px 20px;
  background: linear-gradient(135deg, #7399c6, #9bb8d9);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

.highlight-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
  gap: 20px;
  padding: 20px;
}

.score-column,
.suggestion-column {
  display: grid;
  gap: 16px;
}

.suggestion-heading {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.score-item {
  display: grid;
  gap: 6px;
}

.score-label {
  color: #64748b;
  font-size: 12px;
}

.score-bar {
  display: grid;
  gap: 10px;

  strong {
    font-size: 34px;
    color: #2563eb;
  }
}

.bar-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
}

.bar-fill {
  display: block;
  width: 85%;
  height: 100%;
  border-radius: 999px;
  background: #2563eb;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  display: grid;
  gap: 6px;

  span {
    font-size: 12px;
    color: #64748b;
  }

  strong {
    color: #1d4ed8;
  }
}

.suggestion-card {
  border-radius: 16px;
  padding: 16px;

  p {
    margin: 0;
    line-height: 1.7;
  }
}

.success {
  background: #f0fdf4;
  color: #166534;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

.suggestion-title {
  margin-bottom: 8px;
  font-weight: 700;
}

.history-head {
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
}

.table-shell {
  overflow-x: auto;
}

.record-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 18px;
    border-top: 1px solid #e2e8f0;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
  }
}

.upload-stack {
  display: grid;
  gap: 16px;
}

.upload-title {
  margin: 0;
  font-weight: 700;
}

.upload-hint {
  margin: 8px 0 0;
  color: #64748b;
}

.detail-stack {
  display: grid;
  gap: 16px;
}

.detail-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.detail-box {
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px 18px;

  p {
    margin: 8px 0 0;
    line-height: 1.7;
    color: #334155;
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

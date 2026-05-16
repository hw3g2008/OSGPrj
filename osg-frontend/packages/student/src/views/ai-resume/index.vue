<template>
  <div id="page-ai-resume" class="ai-resume-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.aiResume.k1') }} <span>AI Resume Analysis</span></h1>
          </div>
          <a-button type="primary" size="large" @click="uploadOpen = true">{{ t('student.aiResume.k2') }}</a-button>
        </div>
      </template>

      <section class="result-card">
        <div class="result-head">{{ t('student.aiResume.k3') }}</div>
        <div class="result-grid">
          <div class="left-column">
            <div class="file-row">
              <span class="label">{{ t('student.aiResume.k4') }}</span>
              <strong>Resume_TestStudent_v1.pdf</strong>
              <a-tag color="success">{{ t('student.aiResume.k5') }}</a-tag>
            </div>
            <div class="score-panel">
              <div class="score-value">82</div>
              <div class="score-text">{{ t('student.aiResume.k6') }}</div>
            </div>
            <div class="metric-list">
              <div class="metric-row"><span>{{ t('student.aiResume.k7') }}</span><strong>95/100</strong></div>
              <div class="metric-row"><span>{{ t('student.aiResume.k8') }}</span><strong>85/100</strong></div>
              <div class="metric-row"><span>{{ t('student.aiResume.k9') }}</span><strong>78/100</strong></div>
              <div class="metric-row"><span>{{ t('student.aiResume.k10') }}</span><strong>68/100</strong></div>
            </div>
          </div>
          <div class="right-column">
            <div class="suggestion-card success">
              <div class="suggestion-title">{{ t('student.aiResume.k11') }}</div>
              <ul>
                <li>{{ t('student.aiResume.k12') }}</li>
                <li>{{ t('student.aiResume.k13') }}</li>
                <li>{{ t('student.aiResume.k14') }}</li>
              </ul>
            </div>
            <div class="suggestion-card warning">
              <div class="suggestion-title">{{ t('student.aiResume.k15') }}</div>
              <ul>
                <li>{{ t('student.aiResume.k16') }}</li>
                <li>{{ t('student.aiResume.k17') }}</li>
                <li>{{ t('student.aiResume.k18') }}</li>
              </ul>
            </div>
            <div class="suggestion-card info">
              <div class="suggestion-title">{{ t('student.aiResume.k19') }}</div>
              <ul>
                <li>{{ t('student.aiResume.k20') }}</li>
                <li>{{ t('student.aiResume.k21') }}</li>
                <li>{{ t('student.aiResume.k22') }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="history-card">
        <div class="history-head">
          <span>{{ t('student.aiResume.k23') }}</span>
          <span class="history-count">{{ t('student.aiResume.k24') }}</span>
        </div>
        <div class="table-shell">
          <a-table
            :columns="historyColumns"
            :data-source="aiResumeHistory"
            :pagination="false"
            :row-key="(record: any) => record.fileName"
            class="record-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-button type="link" size="small" @click="openReport(record)">{{ t('student.aiResume.k25') }}</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="uploadOpen" :title="t('student.aiResume.k36')" :footer="null" width="560px" wrap-class-name="osg-modal-form">
      <div class="upload-stack">
        <p>{{ t('student.aiResume.k26') }}</p>
        <a-upload-dragger :show-upload-list="false" accept=".pdf,.doc,.docx">
          <p class="upload-title">{{ t('student.aiResume.k27') }}</p>
          <p class="upload-hint">{{ t('student.aiResume.k28') }}</p>
        </a-upload-dragger>
      </div>
      <div class="dialog-actions">
        <a-button @click="uploadOpen = false">{{ t('student.aiResume.k29') }}</a-button>
        <a-button type="primary" @click="uploadOpen = false">{{ t('student.aiResume.k30') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="reportOpen" :title="t('student.aiResume.k37')" :footer="null" width="760px" wrap-class-name="osg-modal-form">
      <div v-if="activeReport" class="report-grid">
        <div class="report-summary">
          <div class="report-title">{{ activeReport.fileName }}</div>
          <div class="report-meta">{{ t('student.aiResume.k44', { time: activeReport.analyzedAt }) }}</div>
          <div class="report-score">{{ activeReport.score }}</div>
        </div>
        <div class="report-panel">
          <h4>{{ t('student.aiResume.k31') }}</h4>
          <ul>
            <li>{{ t('student.aiResume.k12') }}</li>
            <li>{{ t('student.aiResume.k13') }}</li>
            <li>{{ t('student.aiResume.k14') }}</li>
          </ul>
        </div>
        <div class="report-panel">
          <h4>{{ t('student.aiResume.k32') }}</h4>
          <ul>
            <li>{{ t('student.aiResume.k33') }}</li>
            <li>{{ t('student.aiResume.k34') }}</li>
            <li>{{ t('student.aiResume.k18') }}</li>
          </ul>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="reportOpen = false">{{ t('student.aiResume.k35') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

type AiResumeHistoryItem = {
  fileName: string
  analyzedAt: string
  score: string
  status: string
}

const historyColumns = [
  { title: t('student.aiResume.k38'), dataIndex: 'analyzedAt', key: 'analyzedAt' },
  { title: t('student.aiResume.k39'), dataIndex: 'fileName', key: 'fileName' },
  { title: t('student.aiResume.k40'), dataIndex: 'score', key: 'score' },
  { title: t('student.aiResume.k41'), dataIndex: 'status', key: 'status' },
  { title: t('student.aiResume.k42'), key: 'action' },
]

const aiResumeHistory: AiResumeHistoryItem[] = [
  {
    fileName: 'Resume_TestStudent_v1.pdf',
    analyzedAt: '12/01/2025 14:35',
    score: '82',
    status: t('student.aiResume.k43')
  },
  {
    fileName: 'Resume_TestStudent_v1_original.pdf',
    analyzedAt: '11/20/2025 09:15',
    score: '68',
    status: t('student.aiResume.k43')
  }
]

const uploadOpen = ref(false)
const reportOpen = ref(false)
const activeReport = ref<AiResumeHistoryItem | null>(null)

const openReport = (item: AiResumeHistoryItem) => {
  activeReport.value = item
  reportOpen.value = true
}
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
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

.result-card,
.history-card {
  border: 1px solid #dbe5f0;
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
}

.result-card {
  margin-bottom: 20px;
}

.result-head,
.history-head {
  padding: 16px 20px;
  font-size: 17px;
  font-weight: 700;
}

.result-head {
  background: linear-gradient(135deg, #7399c6, #9bb8d9);
  color: #fff;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
}

.left-column,
.right-column {
  display: grid;
  gap: 14px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.label {
  color: #64748b;
}

.score-panel {
  border-radius: 18px;
  background: linear-gradient(135deg, #e8f0f8, #f0f6fb);
  padding: 24px;
  text-align: center;
}

.score-value {
  font-size: 52px;
  font-weight: 800;
  color: #22c55e;
}

.score-text {
  color: #64748b;
  font-size: 13px;
}

.metric-list {
  display: grid;
  gap: 10px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-radius: 12px;
  background: #f8fafc;
  padding: 12px 14px;
}

.suggestion-card {
  border-radius: 16px;
  padding: 14px 16px;

  ul {
    margin: 8px 0 0;
    padding-left: 20px;
    line-height: 1.7;
  }
}

.success {
  background: #dcfce7;
  color: #166534;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

.info {
  background: #e8f0f8;
  color: #1e3a8a;
}

.suggestion-title {
  font-weight: 700;
}

.history-head {
  display: flex;
  justify-content: space-between;
}

.history-count {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
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

.report-grid {
  display: grid;
  gap: 16px;
}

.report-summary {
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px 18px;
}

.report-title {
  font-size: 18px;
  font-weight: 700;
}

.report-meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.report-score {
  margin-top: 10px;
  font-size: 32px;
  font-weight: 800;
  color: #22c55e;
}

.report-panel {
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px 18px;

  h4 {
    margin: 0 0 10px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    line-height: 1.7;
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

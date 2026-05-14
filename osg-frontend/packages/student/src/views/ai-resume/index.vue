<template>
  <div id="page-ai-resume" class="ai-resume-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">AI{{ $t('resume_analysis') }} <span>AI Resume Analysis</span></h1>
            <p class="page-sub">{{ $t('upload_your_resume_to_get_ai_powered_ana') }}</p>
          </div>
          <a-button type="primary" size="large" @click="uploadOpen = true">{{ $t('upload_for_analysis') }}</a-button>
        </div>
      </template>

      <section class="result-card">
        <div class="result-head">{{ $t('latest_analysis_results') }}</div>
        <div class="result-grid">
          <div class="left-column">
            <div class="file-row">
              <span class="label">{{ $t('analyzed_file') }}：</span>
              <strong>Resume_TestStudent_v1.pdf</strong>
              <a-tag color="success">{{ $t('analyzed') }}</a-tag>
            </div>
            <div class="score-panel">
              <div class="score-value">82</div>
              <div class="score-text">{{ $t('overall_score') }} Overall Score</div>
            </div>
            <div class="metric-list">
              <div class="metric-row"><span>{{ $t('format_compliance') }} Format</span><strong>95/100</strong></div>
              <div class="metric-row"><span>{{ $t('content_completeness') }} Completeness</span><strong>85/100</strong></div>
              <div class="metric-row"><span>{{ $t('keyword_match') }} Keywords</span><strong>78/100</strong></div>
              <div class="metric-row"><span>{{ $t('quantified_achievements') }} Quantification</span><strong>68/100</strong></div>
            </div>
          </div>
          <div class="right-column">
            <div class="suggestion-card success">
              <div class="suggestion-title">AI{{ $t('improvement_suggestions') }}</div>
              <ul>
                <li>{{ $t('clean_formatting_professional_layout') }}</li>
                <li>{{ $t('complete_education_background_and_intern') }}</li>
                <li>{{ $t('skills_section_covers_key_competencies') }}</li>
              </ul>
            </div>
            <div class="suggestion-card warning">
              <div class="suggestion-title">{{ $t('needs_improvement_2') }} Areas to Improve</div>
              <ul>
                <li>{{ $t('internship_experience_lacks_quantitative') }} XX%）</li>
                <li>{{ $t('consider_adding_more_industry_relevant_k') }}（DCF, M&A 等）</li>
                <li>Leadership {{ $t('experience_descriptions_could_be_more_sp') }}</li>
              </ul>
            </div>
            <div class="suggestion-card info">
              <div class="suggestion-title">{{ $t('suggested_edits') }}</div>
              <ul>
                <li>将“{{ $t('participated_in_project') }}”{{ $t('change_to') }}“{{ $t('led_and_completed_xx_project') }}”</li>
                <li>{{ $t('add_gpa_ranking_information_if_applicabl') }}）</li>
                <li>{{ $t('add_coursework_or_projects_relevant_to_t') }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="history-card">
        <div class="history-head">
          <span>{{ $t('analysis_history') }} Analysis History</span>
          <span class="history-count">{{ $t('2_records_total') }}</span>
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
                <a-button type="link" size="small" @click="openReport(record)">{{ $t('view_report') }}</a-button>
              </template>
            </template>
          </a-table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="uploadOpen" :title="$t('upload_resume_for_analysis')" :footer="null" width="560px">
      <div class="upload-stack">
        <p>{{ $t('upload_your_resume_file_to_generate_an_a') }}。</p>
        <a-upload-dragger :show-upload-list="false" accept=".pdf,.doc,.docx">
          <p class="upload-title">{{ $t('drag_your_resume_here_or_click_to_select') }}</p>
          <p class="upload-hint">{{ $t('supports_pdf_word_formats') }}</p>
        </a-upload-dragger>
      </div>
      <div class="dialog-actions">
        <a-button @click="uploadOpen = false">{{ $t('cancel') }}</a-button>
        <a-button type="primary" @click="uploadOpen = false">{{ $t('start_analysis') }}</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="reportOpen" :title="`AI${$t('resume_analysis_report')}`" :footer="null" width="760px">
      <div v-if="activeReport" class="report-grid">
        <div class="report-summary">
          <div class="report-title">{{ activeReport.fileName }}</div>
          <div class="report-meta">分析时间：{{ activeReport.analyzedAt }}</div>
          <div class="report-score">{{ activeReport.score }}</div>
        </div>
        <div class="report-panel">
          <h4>{{ $t('strengths') }}</h4>
          <ul>
            <li>{{ $t('clean_formatting_professional_layout') }}</li>
            <li>{{ $t('complete_education_background_and_intern') }}</li>
            <li>{{ $t('skills_section_covers_key_competencies') }}</li>
          </ul>
        </div>
        <div class="report-panel">
          <h4>{{ $t('needs_improvement_2') }}</h4>
          <ul>
            <li>{{ $t('internship_experience_lacks_quantitative_2') }}</li>
            <li>{{ $t('consider_adding_more_industry_relevant_k') }}</li>
            <li>Leadership {{ $t('experience_descriptions_could_be_more_sp') }}</li>
          </ul>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="reportOpen = false">{{ $t('close') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
type AiResumeHistoryItem = {
  fileName: string
  analyzedAt: string
  score: string
  status: string
}

const historyColumns = [
  { title: t('analysis_time'), dataIndex: 'analyzedAt', key: 'analyzedAt' },
  { title: t('file_name'), dataIndex: 'fileName', key: 'fileName' },
  { title: 'AI评分', dataIndex: 'score', key: 'score' },
  { title: t('status'), dataIndex: 'status', key: 'status' },
  { title: t('operation'), key: 'action' },
]

const aiResumeHistory: AiResumeHistoryItem[] = [
  {
    fileName: 'Resume_TestStudent_v1.pdf',
    analyzedAt: '12/01/2025 14:35',
    score: '82',
    status: t('completed')
  },
  {
    fileName: 'Resume_TestStudent_v1_original.pdf',
    analyzedAt: '11/20/2025 09:15',
    score: '68',
    status: t('completed')
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


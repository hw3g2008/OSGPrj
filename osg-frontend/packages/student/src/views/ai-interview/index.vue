<template>
  <div id="page-ai-interview" class="ai-interview-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">AI面试分析 <span>AI Interview Analysis</span></h1>
            <p class="page-sub">上传面试录音或视频，获取AI智能分析和改进建议</p>
          </div>
          <a-button type="primary" size="large" @click="uploadOpen = true">上传面试</a-button>
        </div>
      </template>

      <section class="highlight-card">
        <div class="highlight-head">最新分析结果</div>
        <div class="highlight-grid">
          <div class="score-column">
            <div class="score-item">
              <span class="score-label">分析文件</span>
              <strong>Goldman_Sachs_Interview_Round2.mp4</strong>
            </div>
            <div class="score-item">
              <span class="score-label">综合评分</span>
              <div class="score-bar">
                <strong>85</strong>
                <div class="bar-track"><span class="bar-fill" /></div>
              </div>
            </div>
            <div class="metric-grid">
              <div class="metric-card"><span>表达清晰度</span><strong>90分</strong></div>
              <div class="metric-card"><span>逻辑结构</span><strong>88分</strong></div>
              <div class="metric-card"><span>专业知识</span><strong>82分</strong></div>
              <div class="metric-card"><span>自信程度</span><strong>80分</strong></div>
            </div>
          </div>
          <div class="suggestion-column">
            <div class="suggestion-heading">AI改进建议</div>
            <div class="suggestion-card success">
              <div class="suggestion-title">优势</div>
              <p>回答结构清晰，使用 STAR 方法得当，专业术语运用准确。</p>
            </div>
            <div class="suggestion-card warning">
              <div class="suggestion-title">改进建议</div>
              <p>建议在回答技术问题时增加更多具体数据支撑，语速可以稍微放慢。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="history-card">
        <div class="history-head">分析历史</div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>公司</th>
                <th>面试轮次</th>
                <th>综合评分</th>
                <th>分析时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in interviewHistory" :key="item.fileName">
                <td>{{ item.fileName }}</td>
                <td>{{ item.company }}</td>
                <td>{{ item.round }}</td>
                <td>{{ item.score }}</td>
                <td>{{ item.analyzedAt }}</td>
                <td>
                  <a-button type="link" size="small" @click="openDetail(item)">查看详情</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="uploadOpen" title="上传面试素材" :footer="null" width="560px">
      <div class="upload-stack">
        <p>支持上传录音或视频文件，用于生成 AI 面试分析结果。</p>
        <a-upload-dragger :show-upload-list="false" accept=".mp3,.mp4,.wav,.m4a">
          <p class="upload-title">拖拽文件到这里，或点击选择文件</p>
          <p class="upload-hint">支持 mp3 / mp4 / wav / m4a</p>
        </a-upload-dragger>
      </div>

      <div class="dialog-actions">
        <a-button @click="uploadOpen = false">取消</a-button>
        <a-button type="primary" @click="uploadOpen = false">开始分析</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="detailOpen" title="AI面试分析详情" :footer="null" width="680px">
      <div v-if="activeDetail" class="detail-stack">
        <div class="detail-summary">
          <div>
            <div class="score-label">文件名</div>
            <strong>{{ activeDetail.fileName }}</strong>
          </div>
          <a-tag color="success">{{ activeDetail.score }}</a-tag>
        </div>
        <div class="detail-box">
          <strong>公司 / 轮次</strong>
          <p>{{ activeDetail.company }} · {{ activeDetail.round }}</p>
        </div>
        <div class="detail-box">
          <strong>AI 分析报告</strong>
          <p>{{ activeDetail.report }}</p>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="detailOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type InterviewHistoryItem = {
  fileName: string
  company: string
  round: string
  score: string
  analyzedAt: string
  report: string
}

const interviewHistory: InterviewHistoryItem[] = [
  {
    fileName: 'Goldman_Sachs_Interview_Round2.mp4',
    company: 'Goldman Sachs',
    round: 'Second Round',
    score: '85分',
    analyzedAt: '12/15/2025',
    report: '表达稳定、结构清晰，建议补充更多定量结果支撑核心观点。'
  },
  {
    fileName: 'McKinsey_Case_Practice.mp3',
    company: 'McKinsey',
    round: 'Case Interview',
    score: '82分',
    analyzedAt: '12/10/2025',
    report: 'Case 框架完整，建议在假设验证阶段更积极地主动澄清信息。'
  },
  {
    fileName: 'Morgan_Stanley_Behavioral.mp4',
    company: 'Morgan Stanley',
    round: 'First Round',
    score: '75分',
    analyzedAt: '12/05/2025',
    report: '回答素材足够，但语言节奏偏快，可以增加 pause 和总结句。'
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

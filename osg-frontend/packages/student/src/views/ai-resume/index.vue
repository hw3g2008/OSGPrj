<template>
  <div id="page-ai-resume" class="ai-resume-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">AI简历分析 <span>AI Resume Analysis</span></h1>
            <p class="page-sub">上传简历获取AI智能分析和改进建议</p>
          </div>
          <a-button type="primary" size="large" @click="uploadOpen = true">上传分析</a-button>
        </div>
      </template>

      <section class="result-card">
        <div class="result-head">最新分析结果</div>
        <div class="result-grid">
          <div class="left-column">
            <div class="file-row">
              <span class="label">分析文件：</span>
              <strong>Resume_TestStudent_v1.pdf</strong>
              <a-tag color="success">已分析</a-tag>
            </div>
            <div class="score-panel">
              <div class="score-value">82</div>
              <div class="score-text">综合评分 Overall Score</div>
            </div>
            <div class="metric-list">
              <div class="metric-row"><span>格式规范 Format</span><strong>95/100</strong></div>
              <div class="metric-row"><span>内容完整度 Completeness</span><strong>85/100</strong></div>
              <div class="metric-row"><span>关键词匹配 Keywords</span><strong>78/100</strong></div>
              <div class="metric-row"><span>量化成就 Quantification</span><strong>68/100</strong></div>
            </div>
          </div>
          <div class="right-column">
            <div class="suggestion-card success">
              <div class="suggestion-title">AI改进建议</div>
              <ul>
                <li>格式清晰，排版专业</li>
                <li>教育背景和实习经历完整</li>
                <li>技能部分涵盖关键能力</li>
              </ul>
            </div>
            <div class="suggestion-card warning">
              <div class="suggestion-title">待改进 Areas to Improve</div>
              <ul>
                <li>实习经历缺少量化数据（如：提升 XX%）</li>
                <li>建议添加更多行业关键词（DCF, M&A 等）</li>
                <li>Leadership 经历描述可更具体</li>
              </ul>
            </div>
            <div class="suggestion-card info">
              <div class="suggestion-title">推荐修改</div>
              <ul>
                <li>将“参与项目”改为“主导完成 XX 项目”</li>
                <li>添加 GPA/排名信息（如适用）</li>
                <li>增加与目标岗位相关的课程项目</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="history-card">
        <div class="history-head">
          <span>分析历史 Analysis History</span>
          <span class="history-count">共 2 条记录</span>
        </div>
        <div class="table-shell">
          <table class="record-table">
            <thead>
              <tr>
                <th>分析时间</th>
                <th>文件名</th>
                <th>AI评分</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in aiResumeHistory" :key="item.fileName">
                <td>{{ item.analyzedAt }}</td>
                <td>{{ item.fileName }}</td>
                <td>{{ item.score }}</td>
                <td>{{ item.status }}</td>
                <td>
                  <a-button type="link" size="small" @click="openReport(item)">查看报告</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </OsgPageContainer>

    <a-modal v-model:open="uploadOpen" title="上传简历分析" :footer="null" width="560px">
      <div class="upload-stack">
        <p>上传简历文件，生成 AI 简历分析结果。</p>
        <a-upload-dragger :show-upload-list="false" accept=".pdf,.doc,.docx">
          <p class="upload-title">拖拽简历到这里，或点击选择文件</p>
          <p class="upload-hint">支持 PDF / Word 格式</p>
        </a-upload-dragger>
      </div>
      <div class="dialog-actions">
        <a-button @click="uploadOpen = false">取消</a-button>
        <a-button type="primary" @click="uploadOpen = false">开始分析</a-button>
      </div>
    </a-modal>

    <a-modal v-model:open="reportOpen" title="AI简历分析报告" :footer="null" width="760px">
      <div v-if="activeReport" class="report-grid">
        <div class="report-summary">
          <div class="report-title">{{ activeReport.fileName }}</div>
          <div class="report-meta">分析时间：{{ activeReport.analyzedAt }}</div>
          <div class="report-score">{{ activeReport.score }}</div>
        </div>
        <div class="report-panel">
          <h4>优势</h4>
          <ul>
            <li>格式清晰，排版专业</li>
            <li>教育背景和实习经历完整</li>
            <li>技能部分涵盖关键能力</li>
          </ul>
        </div>
        <div class="report-panel">
          <h4>待改进</h4>
          <ul>
            <li>实习经历缺少量化数据</li>
            <li>建议添加更多行业关键词</li>
            <li>Leadership 经历描述可更具体</li>
          </ul>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="reportOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type AiResumeHistoryItem = {
  fileName: string
  analyzedAt: string
  score: string
  status: string
}

const aiResumeHistory: AiResumeHistoryItem[] = [
  {
    fileName: 'Resume_TestStudent_v1.pdf',
    analyzedAt: '12/01/2025 14:35',
    score: '82',
    status: '已完成'
  },
  {
    fileName: 'Resume_TestStudent_v1_original.pdf',
    analyzedAt: '11/20/2025 09:15',
    score: '68',
    status: '已完成'
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

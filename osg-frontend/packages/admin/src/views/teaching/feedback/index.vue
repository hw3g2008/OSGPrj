<template>
  <section class="feedback-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">课程反馈</h1>
        <p class="page-subtitle">查看导师对学员的评估反馈（仅显示Prep Feedback、Networking、Mock Midterm三种类型）</p>
      </div>
      <button type="button" class="btn-outline" @click="handleExport">
        <span class="mdi mdi-export" aria-hidden="true" /> 导出
      </button>
    </header>

    <!-- 统计卡片 -->
    <section class="summary-grid">
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--primary">{{ stats.totalCount }}</div>
        <div class="summary-card__label">全部反馈</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--success">{{ stats.prepCount }}</div>
        <div class="summary-card__label">Prep Feedback</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--purple">{{ stats.networkingCount }}</div>
        <div class="summary-card__label">Networking</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__value summary-card__value--amber">{{ stats.mockMidtermCount }}</div>
        <div class="summary-card__label">Mock Midterm</div>
      </div>
    </section>

    <!-- Tab 切换 -->
    <div class="feedback-tabs">
      <button
        v-for="tab in tabList"
        :key="tab.key"
        type="button"
        class="feedback-tab"
        :class="{ 'feedback-tab--active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span class="feedback-tab__badge" :class="`feedback-tab__badge--${tab.tone}`">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Prep Feedback 内容 -->
    <template v-if="activeTab === 'prep'">
      <div class="tab-hint tab-hint--green">
        <span class="mdi mdi-information" aria-hidden="true" />
        Prep Feedback 包含：入职面试、模拟面试、笔试辅导 等课程类型的反馈
      </div>
      <div class="filter-row">
        <input v-model.trim="keyword" class="filter-input" type="text" placeholder="搜索学员...">
        <select v-model="filterMentor" class="filter-select filter-select--narrow">
          <option value="">全部导师</option>
          <option v-for="m in mentorOptions" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="filterPerformance" class="filter-select">
          <option value="">学员表现</option>
          <option value="优秀">优秀</option>
          <option value="良好">良好</option>
          <option value="一般">一般</option>
          <option value="需改进">需改进</option>
        </select>
        <select v-model="filterSource" class="filter-select filter-select--narrow">
          <option value="">提交来源</option>
          <option value="mentor">导师端</option>
          <option value="headteacher">班主任端</option>
          <option value="assistant">助教端</option>
        </select>
        <input v-model="filterDateStart" type="date" class="filter-input filter-input--date">
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date">
        <button type="button" class="btn-outline" @click="loadData">
          <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
        </button>
      </div>
      <div class="table-card">
        <div class="table-wrap">
          <table class="feedback-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>导师</th>
                <th>学员</th>
                <th>课程类型</th>
                <th>公司/岗位</th>
                <th>学员表现</th>
                <th>日期</th>
                <th>来源</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.feedbackId">
                <td>{{ row.feedbackId }}</td>
                <td><strong>{{ row.mentorName }}</strong></td>
                <td><strong>{{ row.studentName }}</strong></td>
                <td>
                  <span class="type-tag" :class="courseTypeTagClass(row.courseType)">{{ row.courseLabel }}</span>
                </td>
                <td>{{ row.companyPosition || '-' }}</td>
                <td>
                  <span class="performance-tag" :class="performanceClass(row.performanceLabel)">
                    {{ row.performanceLabel || '--' }}
                  </span>
                </td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>
                  <span class="source-tag" :class="sourceTagClass(row.source)">{{ row.sourceLabel }}</span>
                </td>
                <td>{{ row.updatedAt || '--' }}</td>
                <td><button type="button" class="action-link" @click="handleView(row)">查看</button></td>
              </tr>
              <tr v-if="!rows.length">
                <td class="empty-row" colspan="10">暂无课程反馈</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Networking 内容 -->
    <template v-if="activeTab === 'networking'">
      <div class="tab-hint tab-hint--purple">
        <span class="mdi mdi-information" aria-hidden="true" />
        Networking 包含：人际关系期中考试 等课程类型的反馈
      </div>
      <div class="filter-row">
        <input v-model.trim="keyword" class="filter-input" type="text" placeholder="搜索学员...">
        <select v-model="filterMentor" class="filter-select filter-select--narrow">
          <option value="">全部导师</option>
          <option v-for="m in mentorOptions" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="filterSource" class="filter-select filter-select--narrow">
          <option value="">提交来源</option>
          <option value="mentor">导师端</option>
          <option value="headteacher">班主任端</option>
          <option value="assistant">助教端</option>
        </select>
        <input v-model="filterDateStart" type="date" class="filter-input filter-input--date">
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date">
        <button type="button" class="btn-outline" @click="loadData">
          <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
        </button>
      </div>
      <div class="table-card">
        <div class="table-wrap">
          <table class="feedback-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>导师</th>
                <th>学员</th>
                <th>班主任</th>
                <th>邮件质量</th>
                <th>邮件礼仪</th>
                <th>通话质量</th>
                <th>是否推荐</th>
                <th>日期</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.feedbackId">
                <td>{{ row.feedbackId }}</td>
                <td><strong>{{ row.mentorName }}</strong></td>
                <td><strong>{{ row.studentName }}</strong></td>
                <td>{{ row.headTeacherName || '--' }}</td>
                <td>{{ formatScore(row.emailQuality, 5) }}</td>
                <td>{{ formatScore(row.etiquetteScore, 5) }}</td>
                <td>{{ formatScore(row.callQuality, 10) }}</td>
                <td>
                  <span :class="['recommend-tag', row.recommendedLabel === '是' ? 'recommend-tag--yes' : 'recommend-tag--pending']">
                    {{ row.recommendedLabel || '--' }}
                  </span>
                </td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>
                  <span class="source-tag" :class="sourceTagClass(row.source)">{{ row.sourceLabel }}</span>
                </td>
                <td><button type="button" class="action-link" @click="handleView(row)">查看</button></td>
              </tr>
              <tr v-if="!rows.length">
                <td class="empty-row" colspan="11">暂无课程反馈</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Mock Midterm 内容 -->
    <template v-if="activeTab === 'mock_midterm'">
      <div class="tab-hint tab-hint--amber">
        <span class="mdi mdi-information" aria-hidden="true" />
        Mock Midterm 包含：模拟期中考试 等课程类型的反馈
      </div>
      <div class="filter-row">
        <input v-model.trim="keyword" class="filter-input" type="text" placeholder="搜索学员...">
        <select v-model="filterMentor" class="filter-select filter-select--narrow">
          <option value="">全部导师</option>
          <option v-for="m in mentorOptions" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="filterPerformance" class="filter-select">
          <option value="">学员表现</option>
          <option value="优秀">优秀</option>
          <option value="良好">良好</option>
          <option value="一般">一般</option>
          <option value="需改进">需改进</option>
        </select>
        <select v-model="filterSource" class="filter-select filter-select--narrow">
          <option value="">提交来源</option>
          <option value="mentor">导师端</option>
          <option value="headteacher">班主任端</option>
          <option value="assistant">助教端</option>
        </select>
        <input v-model="filterDateStart" type="date" class="filter-input filter-input--date">
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateEnd" type="date" class="filter-input filter-input--date">
        <button type="button" class="btn-outline" @click="loadData">
          <span class="mdi mdi-magnify" aria-hidden="true" /> 搜索
        </button>
      </div>
      <div class="table-card">
        <div class="table-wrap">
          <table class="feedback-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>导师</th>
                <th>学员</th>
                <th>学员表现</th>
                <th>评分</th>
                <th>考核题目</th>
                <th>日期</th>
                <th>来源</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.feedbackId">
                <td>{{ row.feedbackId }}</td>
                <td><strong>{{ row.mentorName }}</strong></td>
                <td><strong>{{ row.studentName }}</strong></td>
                <td>
                  <span class="performance-tag" :class="performanceClass(row.performanceLabel)">
                    {{ row.performanceLabel || '--' }}
                  </span>
                </td>
                <td>{{ row.score ?? '--' }}</td>
                <td>{{ row.assessmentTopic || '--' }}</td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>
                  <span class="source-tag" :class="sourceTagClass(row.source)">{{ row.sourceLabel }}</span>
                </td>
                <td>{{ row.updatedAt || '--' }}</td>
                <td><button type="button" class="action-link" @click="handleView(row)">查看</button></td>
              </tr>
              <tr v-if="!rows.length">
                <td class="empty-row" colspan="10">暂无课程反馈</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getFeedbackList, type FeedbackRow, type FeedbackStats, type FeedbackTab } from '@osg/shared/api/admin/feedback'

const keyword = ref('')
const filterMentor = ref('')
const filterPerformance = ref('')
const filterSource = ref('')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const activeTab = ref<FeedbackTab>('prep')
const rows = ref<FeedbackRow[]>([])
const stats = ref<FeedbackStats>({
  totalCount: 0,
  prepCount: 0,
  networkingCount: 0,
  mockMidtermCount: 0
})

const mentorOptions = ref<string[]>([])

const tabList = computed(() => [
  { key: 'prep' as const, label: 'Prep Feedback', count: stats.value.prepCount, tone: 'success' },
  { key: 'networking' as const, label: 'Networking', count: stats.value.networkingCount, tone: 'purple' },
  { key: 'mock_midterm' as const, label: 'Mock Midterm', count: stats.value.mockMidtermCount, tone: 'warning' }
])

const loadData = async () => {
  try {
    const response = await getFeedbackList({
      type: activeTab.value,
      keyword: keyword.value
    })

    rows.value = response.rows ?? []
    stats.value = response.stats ?? stats.value

    // Extract unique mentor names for filter options
    const mentors = new Set<string>()
    rows.value.forEach((row) => {
      if (row.mentorName) mentors.add(row.mentorName)
    })
    mentorOptions.value = Array.from(mentors)
  } catch (_error) {
    message.error('课程反馈加载失败')
  }
}

const switchTab = (tab: FeedbackTab) => {
  activeTab.value = tab
  keyword.value = ''
  filterMentor.value = ''
  filterPerformance.value = ''
  filterSource.value = ''
  filterDateStart.value = ''
  filterDateEnd.value = ''
  void loadData()
}

const handleExport = () => {
  message.info('导出功能将在后续版本中接入')
}

const handleView = (_row: FeedbackRow) => {
  message.info('查看详情功能将在后续版本中接入')
}

const formatScore = (value?: number | null, base = 5) => {
  return value == null ? '--' : `${value}/${base}`
}

const performanceClass = (value?: string | null) => {
  if (value === '优秀' || value === '良好') return 'performance-tag--success'
  if (value === '一般') return 'performance-tag--warning'
  return 'performance-tag--danger'
}

const courseTypeTagClass = (courseType?: string) => {
  const map: Record<string, string> = {
    onboarding_interview: 'type-tag--info',
    mock_interview: 'type-tag--success',
    written_test: 'type-tag--purple'
  }
  return map[courseType || ''] || 'type-tag--info'
}

const sourceTagClass = (source?: string) => {
  const map: Record<string, string> = {
    mentor: 'source-tag--mentor',
    headteacher: 'source-tag--headteacher',
    assistant: 'source-tag--assistant'
  }
  return map[source || ''] || ''
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.feedback-page {
  display: grid;
  gap: 16px;
}

/* --- Header --- */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: var(--text-primary, #1e293b);
  font-size: 24px;
  font-weight: 700;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary, #64748b);
  font-size: 14px;
}

/* --- Buttons --- */
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #1e293b);
  font-weight: 500;
  cursor: pointer;
}

/* --- Summary grid --- */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  text-align: center;
}

.summary-card__value {
  font-size: 28px;
  font-weight: 700;
}

.summary-card__value--primary { color: var(--primary, #3b82f6); }
.summary-card__value--success { color: #22c55e; }
.summary-card__value--purple { color: #8b5cf6; }
.summary-card__value--amber { color: #f59e0b; }

.summary-card__label {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  margin-top: 4px;
}

/* --- Tabs --- */
.feedback-tabs {
  display: flex;
  gap: 0;
}

.feedback-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  background: transparent;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  font-weight: 500;
}

.feedback-tab--active {
  color: var(--text-primary, #1e293b);
  border-bottom-color: var(--primary, #3b82f6);
}

.feedback-tab__badge {
  margin-left: 4px;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.feedback-tab__badge--success { background: #dcfce7; color: #166534; }
.feedback-tab__badge--purple { background: #ede9fe; color: #6d28d9; }
.feedback-tab__badge--warning { background: #fef3c7; color: #92400e; }

/* --- Tab hints --- */
.tab-hint {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-hint--green { background: #ecfdf5; color: #065f46; }
.tab-hint--purple { background: #f3e8ff; color: #6b21a8; }
.tab-hint--amber { background: #fef3c7; color: #92400e; }

/* --- Filter row --- */
.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-input {
  width: 160px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
}

.filter-input--date { width: 130px; }

.filter-select {
  width: 140px;
  height: 36px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  background: var(--card-bg, #ffffff);
}

.filter-select--narrow { width: 120px; }

.filter-date-sep {
  color: var(--text-secondary, #64748b);
  line-height: 36px;
}

/* --- Table card --- */
.table-card {
  border-radius: 12px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  overflow: hidden;
}

.table-wrap { overflow-x: auto; }

.feedback-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.feedback-table th,
.feedback-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-align: left;
  white-space: nowrap;
}

.feedback-table th {
  background: var(--table-header-bg, #f8fafc);
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

/* --- Tags --- */
.type-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--info { background: #dbeafe; color: #1d4ed8; }
.type-tag--success { background: #dcfce7; color: #166534; }
.type-tag--purple { background: #ede9fe; color: #6d28d9; }

.performance-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.performance-tag--success { background: #dcfce7; color: #166534; }
.performance-tag--warning { background: #fef3c7; color: #92400e; }
.performance-tag--danger { background: #fee2e2; color: #b91c1c; }

.source-tag {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
}

.source-tag--mentor { background: #e8f0f8; color: #5a7ba3; }
.source-tag--headteacher { background: #ecfdf5; color: #059669; }
.source-tag--assistant { background: #fef3c7; color: #92400e; }

.recommend-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.recommend-tag--yes { background: #dcfce7; color: #166534; }
.recommend-tag--pending { background: #fef3c7; color: #92400e; }

/* --- Action link --- */
.action-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--primary, #3b82f6);
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}

/* --- Empty --- */
.empty-row {
  color: var(--text-secondary, #64748b);
  text-align: center;
  padding: 24px 0;
}
</style>

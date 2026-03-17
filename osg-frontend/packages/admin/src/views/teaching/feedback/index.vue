<template>
  <section class="feedback-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">Teaching Center</p>
        <h1>课程反馈</h1>
        <p class="page-subtitle">
          查看导师对学员的评估反馈，仅展示 Prep Feedback、Networking 和 Mock Midterm 三种类型。
        </p>
      </div>
      <button type="button" class="ghost-button">导出</button>
    </header>

    <section class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-card"
      >
        <p class="summary-card__label">{{ card.label }}</p>
        <p class="summary-card__value">{{ card.value }}</p>
      </article>
    </section>

    <section class="feedback-shell">
      <div class="feedback-toolbar">
        <div class="feedback-tabs" role="tablist" aria-label="课程反馈类型">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="feedback-tab"
            :class="{ 'feedback-tab--active': activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <span>{{ tab.label }}</span>
            <span class="feedback-tab__count">{{ tab.count }}</span>
          </button>
        </div>

        <div class="feedback-search">
          <input
            v-model.trim="keyword"
            class="feedback-search__input"
            type="search"
            placeholder="搜索导师 / 学员"
            @keyup.enter="loadData"
          >
          <button type="button" class="primary-button" @click="loadData">查询</button>
        </div>
      </div>

      <p class="feedback-hint">{{ tabHint }}</p>

      <div class="feedback-table-wrap">
        <table class="feedback-table">
          <thead>
            <tr v-if="activeTab === 'prep'">
              <th>ID</th>
              <th>导师</th>
              <th>学员</th>
              <th>课程类型</th>
              <th>学员表现</th>
              <th>日期</th>
              <th>来源</th>
              <th>更新时间</th>
            </tr>
            <tr v-else-if="activeTab === 'networking'">
              <th>ID</th>
              <th>导师</th>
              <th>学员</th>
              <th>邮件质量</th>
              <th>邮件礼仪</th>
              <th>通话质量</th>
              <th>是否推荐</th>
              <th>日期</th>
              <th>来源</th>
            </tr>
            <tr v-else>
              <th>ID</th>
              <th>导师</th>
              <th>学员</th>
              <th>学员表现</th>
              <th>评分</th>
              <th>考核题目</th>
              <th>日期</th>
              <th>来源</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.feedbackId">
              <template v-if="activeTab === 'prep'">
                <td>#{{ row.feedbackId }}</td>
                <td>{{ row.mentorName }}</td>
                <td>{{ row.studentName }}</td>
                <td>{{ row.courseLabel }}</td>
                <td>
                  <span class="badge" :class="performanceClass(row.performanceLabel)">
                    {{ row.performanceLabel || '--' }}
                  </span>
                </td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>{{ row.sourceLabel }}</td>
                <td>{{ row.updatedAt || '--' }}</td>
              </template>

              <template v-else-if="activeTab === 'networking'">
                <td>#{{ row.feedbackId }}</td>
                <td>{{ row.mentorName }}</td>
                <td>{{ row.studentName }}</td>
                <td>{{ formatScore(row.emailQuality, 5) }}</td>
                <td>{{ formatScore(row.etiquetteScore, 5) }}</td>
                <td>{{ formatScore(row.callQuality, 10) }}</td>
                <td>{{ row.recommendedLabel || '--' }}</td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>{{ row.sourceLabel }}</td>
              </template>

              <template v-else>
                <td>#{{ row.feedbackId }}</td>
                <td>{{ row.mentorName }}</td>
                <td>{{ row.studentName }}</td>
                <td>
                  <span class="badge" :class="performanceClass(row.performanceLabel)">
                    {{ row.performanceLabel || '--' }}
                  </span>
                </td>
                <td>{{ row.score ?? '--' }}</td>
                <td>{{ row.assessmentTopic || '--' }}</td>
                <td>{{ row.feedbackDate || '--' }}</td>
                <td>{{ row.sourceLabel }}</td>
                <td>{{ row.updatedAt || '--' }}</td>
              </template>
            </tr>
            <tr v-if="!rows.length">
              <td class="empty-row" :colspan="activeTab === 'networking' ? 9 : 8">暂无课程反馈</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getFeedbackList, type FeedbackRow, type FeedbackStats, type FeedbackTab } from '@osg/shared/api/admin/feedback'

const keyword = ref('')
const activeTab = ref<FeedbackTab>('prep')
const rows = ref<FeedbackRow[]>([])
const stats = ref<FeedbackStats>({
  totalCount: 0,
  prepCount: 0,
  networkingCount: 0,
  mockMidtermCount: 0
})

const summaryCards = computed(() => [
  { label: '全部反馈', value: String(stats.value.totalCount) },
  { label: 'Prep Feedback', value: String(stats.value.prepCount) },
  { label: 'Networking', value: String(stats.value.networkingCount) },
  { label: 'Mock Midterm', value: String(stats.value.mockMidtermCount) }
])

const tabs = computed(() => [
  { key: 'prep' as const, label: 'Prep Feedback', count: stats.value.prepCount },
  { key: 'networking' as const, label: 'Networking', count: stats.value.networkingCount },
  { key: 'mock_midterm' as const, label: 'Mock Midterm', count: stats.value.mockMidtermCount }
])

const tabHint = computed(() => {
  if (activeTab.value === 'networking') {
    return 'Networking 包含：人际关系期中考试等课程类型的反馈。'
  }
  if (activeTab.value === 'mock_midterm') {
    return 'Mock Midterm 包含：模拟期中考试等课程类型的反馈。'
  }
  return 'Prep Feedback 包含：入职面试、模拟面试、笔试辅导等课程类型的反馈。'
})

const loadData = async () => {
  try {
    const response = await getFeedbackList({
      type: activeTab.value,
      keyword: keyword.value
    })

    rows.value = response.rows ?? []
    stats.value = response.stats ?? stats.value
  } catch (_error) {
    message.error('课程反馈加载失败')
  }
}

const switchTab = (tab: FeedbackTab) => {
  activeTab.value = tab
  void loadData()
}

const formatScore = (value?: number | null, base = 5) => {
  return value == null ? '--' : `${value}/${base}`
}

const performanceClass = (value?: string | null) => {
  if (value === '优秀' || value === '良好') return 'badge--positive'
  if (value === '一般') return 'badge--warning'
  return 'badge--danger'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped lang="scss">
.feedback-page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-eyebrow {
  margin: 0 0 6px;
  color: #0891b2;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
}

.page-subtitle {
  margin: 8px 0 0;
  max-width: 720px;
  color: #475569;
}

.ghost-button,
.primary-button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-button {
  background: #ecfeff;
  color: #155e75;
}

.primary-button {
  background: #0f766e;
  color: #fff;
}

.summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.summary-card {
  padding: 18px 20px;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background: linear-gradient(135deg, #f8fafc, #eff6ff);
}

.summary-card__label {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.summary-card__value {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 700;
}

.feedback-shell {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.feedback-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.feedback-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feedback-tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 10px 16px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.feedback-tab--active {
  border-color: #0f766e;
  background: #ccfbf1;
  color: #115e59;
}

.feedback-tab__count {
  min-width: 28px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  font-size: 12px;
}

.feedback-search {
  display: flex;
  gap: 10px;
}

.feedback-search__input {
  min-width: 240px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 14px;
}

.feedback-hint {
  margin: 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #475569;
}

.feedback-table-wrap {
  overflow-x: auto;
}

.feedback-table {
  width: 100%;
  border-collapse: collapse;
}

.feedback-table th,
.feedback-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.feedback-table th {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge--positive {
  background: #dcfce7;
  color: #166534;
}

.badge--warning {
  background: #fef3c7;
  color: #92400e;
}

.badge--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.empty-row {
  padding: 24px 0;
  text-align: center;
  color: #64748b;
}

@media (max-width: 768px) {
  .page-header,
  .feedback-toolbar,
  .feedback-search {
    flex-direction: column;
    align-items: stretch;
  }

  .feedback-search__input {
    min-width: 0;
    width: 100%;
  }
}
</style>

<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.teaching.feedback.pageTitle')" title-en="Feedback">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          {{ t('admin.teaching.feedback.export') }}
        </a-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: '#eff6ff', borderRadius: '12px' }">
          <a-statistic :title="t('admin.teaching.feedback.statCards.total')" :value="stats.totalCount" :value-style="{ color: '#3b82f6', fontWeight: 700 }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: '#f0fdf4', borderRadius: '12px' }">
          <a-statistic title="Prep Feedback" :value="stats.prepCount" :value-style="{ color: '#22c55e', fontWeight: 700 }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: '#faf5ff', borderRadius: '12px' }">
          <a-statistic title="Networking" :value="stats.networkingCount" :value-style="{ color: '#8b5cf6', fontWeight: 700 }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: '#fffbeb', borderRadius: '12px' }">
          <a-statistic title="Mock Midterm" :value="stats.mockMidtermCount" :value-style="{ color: '#f59e0b', fontWeight: 700 }" />
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-tabs v-model:activeKey="activeTab" @change="(key: string) => switchTab(key as FeedbackTab)">
        <a-tab-pane v-for="tab in tabList" :key="tab.key">
          <template #tab>
            {{ tab.label }}
            <a-badge :count="tab.count" :number-style="{ backgroundColor: tab.badgeColor }" style="margin-left: 4px" />
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- Tab hint -->
      <a-alert v-if="activeTab === 'prep'" type="success" show-icon :message="t('admin.teaching.feedback.alert.prep')" style="margin-bottom: 16px; border-radius: 8px" />
      <a-alert v-else-if="activeTab === 'networking'" type="info" show-icon :message="t('admin.teaching.feedback.alert.networking')" style="margin-bottom: 16px; border-radius: 8px; background: #f3e8ff; border-color: #d8b4fe" />
      <a-alert v-else-if="activeTab === 'mock_midterm'" type="warning" show-icon :message="t('admin.teaching.feedback.alert.mockMidterm')" style="margin-bottom: 16px; border-radius: 8px" />

      <!-- 通用筛选 -->
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" :placeholder="t('admin.teaching.feedback.filter.searchPlaceholder')" allow-clear style="width: 150px" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterMentor" :placeholder="t('admin.teaching.feedback.filter.mentorPlaceholder')" allow-clear style="width: 120px">
            <a-select-option v-for="m in mentorOptions" :key="m" :value="m">{{ m }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="activeTab !== 'networking'">
          <a-select v-model:value="filterPerformance" :placeholder="t('admin.teaching.feedback.filter.performancePlaceholder')" allow-clear style="width: 120px">
            <a-select-option v-for="p in perfOptions" :key="p.value" :value="p.value">{{ p.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterSource" :placeholder="t('admin.teaching.feedback.filter.sourcePlaceholder')" allow-clear style="width: 120px">
            <a-select-option v-for="s in sourceOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filterDateStart" :placeholder="t('admin.teaching.feedback.filter.dateStart')" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" :placeholder="t('admin.teaching.feedback.filter.dateEnd')" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            {{ t('admin.teaching.feedback.filter.search') }}
          </a-button>
        </a-form-item>
      </a-form>

      <!-- Prep Feedback 表格 -->
      <a-table v-if="activeTab === 'prep'" :columns="prepColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: t('admin.teaching.feedback.empty') }" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'mentorName'"><strong>{{ record.mentorName }}</strong></template>
          <template v-else-if="column.dataIndex === 'studentName'"><strong>{{ record.studentName }}</strong></template>
          <template v-else-if="column.dataIndex === 'courseType'">
            <a-tag :color="courseTypeColor(record.courseType)">{{ record.courseLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'performanceLabel'">
            <a-tag :color="performanceColor(record.performanceLabel)">{{ record.performanceLabel || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'source'">
            <a-tag :color="sourceColor(record.source)">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">{{ t('admin.teaching.feedback.action.view') }}</a-button>
          </template>
        </template>
      </a-table>

      <!-- Networking 表格 -->
      <a-table v-else-if="activeTab === 'networking'" :columns="networkingColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: t('admin.teaching.feedback.empty') }" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'mentorName'"><strong>{{ record.mentorName }}</strong></template>
          <template v-else-if="column.dataIndex === 'studentName'"><strong>{{ record.studentName }}</strong></template>
          <template v-else-if="column.dataIndex === 'emailQuality'">{{ formatScore(record.emailQuality, 5) }}</template>
          <template v-else-if="column.dataIndex === 'etiquetteScore'">{{ formatScore(record.etiquetteScore, 5) }}</template>
          <template v-else-if="column.dataIndex === 'callQuality'">{{ formatScore(record.callQuality, 10) }}</template>
          <template v-else-if="column.dataIndex === 'recommendedLabel'">
            <a-tag :color="record.recommendedLabel === RECOMMENDED_YES ? 'green' : 'orange'">{{ record.recommendedLabel || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'source'">
            <a-tag :color="sourceColor(record.source)">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">{{ t('admin.teaching.feedback.action.view') }}</a-button>
          </template>
        </template>
      </a-table>

      <!-- Mock Midterm 表格 -->
      <a-table v-else :columns="mockColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: t('admin.teaching.feedback.empty') }" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'mentorName'"><strong>{{ record.mentorName }}</strong></template>
          <template v-else-if="column.dataIndex === 'studentName'"><strong>{{ record.studentName }}</strong></template>
          <template v-else-if="column.dataIndex === 'performanceLabel'">
            <a-tag :color="performanceColor(record.performanceLabel)">{{ record.performanceLabel || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'source'">
            <a-tag :color="sourceColor(record.source)">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">{{ t('admin.teaching.feedback.action.view') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { getFeedbackList, type FeedbackRow, type FeedbackStats, type FeedbackTab } from '@osg/shared/api/admin/feedback'

const { t } = useI18n()

const PERF_VALUES = ['优秀', '良好', '一般', '需改进'] as const // i18n-skip-line: backend values
const PERF_GOOD_VALS: string[] = ['优秀', '良好'] // i18n-skip-line: backend values
const PERF_AVG_VAL = '一般' // i18n-skip-line: backend value
const RECOMMENDED_YES = '是' // i18n-skip-line: backend value

const perfOptions = computed(() => [
  { value: PERF_VALUES[0], label: t('admin.teaching.feedback.filter.perf.excellent') },
  { value: PERF_VALUES[1], label: t('admin.teaching.feedback.filter.perf.good') },
  { value: PERF_VALUES[2], label: t('admin.teaching.feedback.filter.perf.average') },
  { value: PERF_VALUES[3], label: t('admin.teaching.feedback.filter.perf.needsImprovement') },
])

const sourceOptions = computed(() => [
  { value: 'mentor', label: t('admin.teaching.feedback.filter.sources.mentor') },
  { value: 'headteacher', label: t('admin.teaching.feedback.filter.sources.headteacher') },
  { value: 'assistant', label: t('admin.teaching.feedback.filter.sources.assistant') },
])

const prepColumns = computed(() => [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70, fixed: 'left' as const },
  { title: t('admin.teaching.feedback.prepColumns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('admin.teaching.feedback.prepColumns.student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('admin.teaching.feedback.prepColumns.courseType'), dataIndex: 'courseType', key: 'courseType', width: 110 },
  { title: t('admin.teaching.feedback.prepColumns.companyPosition'), dataIndex: 'companyPosition', key: 'companyPosition', width: 140 },
  { title: t('admin.teaching.feedback.prepColumns.performance'), dataIndex: 'performanceLabel', key: 'performanceLabel', width: 100 },
  { title: t('admin.teaching.feedback.prepColumns.date'), dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: t('admin.teaching.feedback.prepColumns.source'), dataIndex: 'source', key: 'source', width: 90 },
  { title: t('admin.teaching.feedback.prepColumns.updatedAt'), dataIndex: 'updatedAt', key: 'updatedAt', width: 120 },
  { title: t('admin.teaching.feedback.prepColumns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

const networkingColumns = computed(() => [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70, fixed: 'left' as const },
  { title: t('admin.teaching.feedback.networkingColumns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('admin.teaching.feedback.networkingColumns.student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('admin.teaching.feedback.networkingColumns.headTeacher'), dataIndex: 'headTeacherName', key: 'headTeacherName', width: 100 },
  { title: t('admin.teaching.feedback.networkingColumns.emailQuality'), dataIndex: 'emailQuality', key: 'emailQuality', width: 90 },
  { title: t('admin.teaching.feedback.networkingColumns.emailEtiquette'), dataIndex: 'etiquetteScore', key: 'etiquetteScore', width: 90 },
  { title: t('admin.teaching.feedback.networkingColumns.callQuality'), dataIndex: 'callQuality', key: 'callQuality', width: 90 },
  { title: t('admin.teaching.feedback.networkingColumns.recommended'), dataIndex: 'recommendedLabel', key: 'recommendedLabel', width: 90 },
  { title: t('admin.teaching.feedback.networkingColumns.date'), dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: t('admin.teaching.feedback.networkingColumns.source'), dataIndex: 'source', key: 'source', width: 90 },
  { title: t('admin.teaching.feedback.networkingColumns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

const mockColumns = computed(() => [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70, fixed: 'left' as const },
  { title: t('admin.teaching.feedback.mockColumns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('admin.teaching.feedback.mockColumns.student'), dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: t('admin.teaching.feedback.mockColumns.performance'), dataIndex: 'performanceLabel', key: 'performanceLabel', width: 100 },
  { title: t('admin.teaching.feedback.mockColumns.score'), dataIndex: 'score', key: 'score', width: 80 },
  { title: t('admin.teaching.feedback.mockColumns.assessmentTopic'), dataIndex: 'assessmentTopic', key: 'assessmentTopic', width: 150 },
  { title: t('admin.teaching.feedback.mockColumns.date'), dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: t('admin.teaching.feedback.mockColumns.source'), dataIndex: 'source', key: 'source', width: 90 },
  { title: t('admin.teaching.feedback.mockColumns.updatedAt'), dataIndex: 'updatedAt', key: 'updatedAt', width: 120 },
  { title: t('admin.teaching.feedback.mockColumns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

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
  { key: 'prep' as const, label: 'Prep Feedback', count: stats.value.prepCount, badgeColor: '#22c55e' },
  { key: 'networking' as const, label: 'Networking', count: stats.value.networkingCount, badgeColor: '#8b5cf6' },
  { key: 'mock_midterm' as const, label: 'Mock Midterm', count: stats.value.mockMidtermCount, badgeColor: '#f59e0b' }
])

const loadData = async () => {
  try {
    const response = await getFeedbackList({
      type: activeTab.value,
      keyword: keyword.value
    })

    rows.value = response.rows ?? []
    stats.value = response.stats ?? stats.value

    const mentors = new Set<string>()
    rows.value.forEach((row) => {
      if (row.mentorName) mentors.add(row.mentorName)
    })
    mentorOptions.value = Array.from(mentors)
  } catch (_error) {
    message.error(t('admin.teaching.feedback.messages.loadError'))
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
  message.info(t('admin.teaching.feedback.messages.exportInfo'))
}

const handleView = (_row: FeedbackRow) => {
  message.info(t('admin.teaching.feedback.messages.viewInfo'))
}

const formatScore = (value?: number | null, base = 5) => {
  return value == null ? '--' : `${value}/${base}`
}

const performanceColor = (value?: string | null) => {
  if (!value) return 'red'
  if (PERF_GOOD_VALS.includes(value)) return 'green'
  if (value === PERF_AVG_VAL) return 'orange'
  return 'red'
}

const courseTypeColor = (courseType?: string) => {
  const map: Record<string, string> = {
    onboarding_interview: 'blue',
    mock_interview: 'green',
    written_test: 'purple'
  }
  return map[courseType || ''] || 'blue'
}

const sourceColor = (source?: string) => {
  const map: Record<string, string> = {
    mentor: 'blue',
    headteacher: 'green',
    assistant: 'orange'
  }
  return map[source || ''] || 'default'
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
</style>

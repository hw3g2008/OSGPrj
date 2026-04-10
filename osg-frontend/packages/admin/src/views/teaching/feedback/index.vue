<template>
  <div class="osg-page">
    <PageHeader title="课程反馈" subtitle="Feedback" description="查看导师对学员的评估反馈（仅显示Prep Feedback、Networking、Mock Midterm三种类型）">
      <template #actions>
        <a-button @click="handleExport">
          <template #icon><ExportOutlined /></template>
          导出
        </a-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: '#eff6ff', borderRadius: '12px' }">
          <a-statistic title="全部反馈" :value="stats.totalCount" :value-style="{ color: '#3b82f6', fontWeight: 700 }" />
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
      <a-alert v-if="activeTab === 'prep'" type="success" show-icon message="Prep Feedback 包含：入职面试、模拟面试、笔试辅导 等课程类型的反馈" style="margin-bottom: 16px; border-radius: 8px" />
      <a-alert v-else-if="activeTab === 'networking'" type="info" show-icon message="Networking 包含：人际关系期中考试 等课程类型的反馈" style="margin-bottom: 16px; border-radius: 8px; background: #f3e8ff; border-color: #d8b4fe" />
      <a-alert v-else-if="activeTab === 'mock_midterm'" type="warning" show-icon message="Mock Midterm 包含：模拟期中考试 等课程类型的反馈" style="margin-bottom: 16px; border-radius: 8px" />

      <!-- 通用筛选 -->
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item>
          <a-input v-model:value="keyword" placeholder="搜索学员..." allow-clear style="width: 150px" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterMentor" placeholder="全部导师" allow-clear style="width: 120px">
            <a-select-option v-for="m in mentorOptions" :key="m" :value="m">{{ m }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="activeTab !== 'networking'">
          <a-select v-model:value="filterPerformance" placeholder="学员表现" allow-clear style="width: 120px">
            <a-select-option value="优秀">优秀</a-select-option>
            <a-select-option value="良好">良好</a-select-option>
            <a-select-option value="一般">一般</a-select-option>
            <a-select-option value="需改进">需改进</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filterSource" placeholder="提交来源" allow-clear style="width: 120px">
            <a-select-option value="mentor">导师端</a-select-option>
            <a-select-option value="headteacher">班主任端</a-select-option>
            <a-select-option value="assistant">助教端</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-date-picker v-model:value="filterDateStart" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 130px" />
            <span>~</span>
            <a-date-picker v-model:value="filterDateEnd" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 130px" />
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadData">
            <template #icon><SearchOutlined /></template>
            搜索
          </a-button>
        </a-form-item>
      </a-form>

      <!-- Prep Feedback 表格 -->
      <a-table v-if="activeTab === 'prep'" :columns="prepColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: '暂无课程反馈' }" :scroll="{ x: 1100 }">
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
            <a-button type="link" size="small" @click="handleView(record)">查看</a-button>
          </template>
        </template>
      </a-table>

      <!-- Networking 表格 -->
      <a-table v-else-if="activeTab === 'networking'" :columns="networkingColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: '暂无课程反馈' }" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'mentorName'"><strong>{{ record.mentorName }}</strong></template>
          <template v-else-if="column.dataIndex === 'studentName'"><strong>{{ record.studentName }}</strong></template>
          <template v-else-if="column.dataIndex === 'emailQuality'">{{ formatScore(record.emailQuality, 5) }}</template>
          <template v-else-if="column.dataIndex === 'etiquetteScore'">{{ formatScore(record.etiquetteScore, 5) }}</template>
          <template v-else-if="column.dataIndex === 'callQuality'">{{ formatScore(record.callQuality, 10) }}</template>
          <template v-else-if="column.dataIndex === 'recommendedLabel'">
            <a-tag :color="record.recommendedLabel === '是' ? 'green' : 'orange'">{{ record.recommendedLabel || '--' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'source'">
            <a-tag :color="sourceColor(record.source)">{{ record.sourceLabel }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="handleView(record)">查看</a-button>
          </template>
        </template>
      </a-table>

      <!-- Mock Midterm 表格 -->
      <a-table v-else :columns="mockColumns" :data-source="rows" :row-key="(r: FeedbackRow) => r.feedbackId" :pagination="false" :locale="{ emptyText: '暂无课程反馈' }" :scroll="{ x: 1100 }">
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
            <a-button type="link" size="small" @click="handleView(record)">查看</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ExportOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { getFeedbackList, type FeedbackRow, type FeedbackStats, type FeedbackTab } from '@osg/shared/api/admin/feedback'

const prepColumns = [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '课程类型', dataIndex: 'courseType', key: 'courseType', width: 110 },
  { title: '公司/岗位', dataIndex: 'companyPosition', key: 'companyPosition', width: 140 },
  { title: '学员表现', dataIndex: 'performanceLabel', key: 'performanceLabel', width: 100 },
  { title: '日期', dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const networkingColumns = [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '班主任', dataIndex: 'headTeacherName', key: 'headTeacherName', width: 100 },
  { title: '邮件质量', dataIndex: 'emailQuality', key: 'emailQuality', width: 90 },
  { title: '邮件礼仪', dataIndex: 'etiquetteScore', key: 'etiquetteScore', width: 90 },
  { title: '通话质量', dataIndex: 'callQuality', key: 'callQuality', width: 90 },
  { title: '是否推荐', dataIndex: 'recommendedLabel', key: 'recommendedLabel', width: 90 },
  { title: '日期', dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 90 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const mockColumns = [
  { title: 'ID', dataIndex: 'feedbackId', key: 'feedbackId', width: 70 },
  { title: '导师', dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: '学员', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '学员表现', dataIndex: 'performanceLabel', key: 'performanceLabel', width: 100 },
  { title: '评分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '考核题目', dataIndex: 'assessmentTopic', key: 'assessmentTopic', width: 150 },
  { title: '日期', dataIndex: 'feedbackDate', key: 'feedbackDate', width: 100 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 120 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

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

const performanceColor = (value?: string | null) => {
  if (value === '优秀' || value === '良好') return 'green'
  if (value === '一般') return 'orange'
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

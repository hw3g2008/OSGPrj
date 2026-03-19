<template>
  <div id="page-report" class="report-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">上课记录 <span>Class Report</span></h1>
            <p class="page-sub">查看课程记录并进行评价反馈</p>
          </div>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="all" tab="全部" />
        <a-tab-pane key="pending" tab="待评价" />
        <a-tab-pane key="rated" tab="已评价" />
      </a-tabs>

      <div class="toolbar">
        <a-input placeholder="搜索导师/课程..." class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="课程来源" :options="sourceOptions" />
        <a-select class="toolbar-select" placeholder="课程类型" :options="courseTypeOptions" />
        <a-select class="toolbar-select" placeholder="评价状态" :options="rateStatusOptions" />
        <a-date-picker class="toolbar-date" />
      </div>

      <div class="table-shell">
        <table class="record-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>课程类型</th>
              <th>导师</th>
              <th>课时</th>
              <th>上课日期</th>
              <th>来源</th>
              <th>我的评价</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ row.courseType }}</td>
              <td>{{ row.mentor }}</td>
              <td>{{ row.duration }}</td>
              <td>{{ row.date }}</td>
              <td>{{ row.source }}</td>
              <td>{{ row.rate }}</td>
              <td>
                <a-button
                  :type="row.status === '待评价' ? 'primary' : 'default'"
                  size="small"
                  @click="openRate(row)"
                >
                  {{ row.actionLabel }}
                </a-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="rateOpen" title="课程评价" :footer="null" width="620px">
      <div v-if="activeRow" class="rate-stack">
        <div class="mentor-card">
          <div class="avatar">JL</div>
          <div>
            <div class="mentor-name">{{ activeRow.mentor }}</div>
            <div class="mentor-meta">{{ activeRow.courseType }} · {{ activeRow.date }} · {{ activeRow.duration }}</div>
          </div>
        </div>

        <div class="rating-block">
          <div class="rating-title">整体评分</div>
          <div class="rating-actions">
            <a-button
              v-for="score in [1, 2, 3, 4, 5]"
              :key="score"
              :type="rating >= score ? 'primary' : 'default'"
              @click="rating = score"
            >
              ⭐
            </a-button>
            <span class="rating-text">{{ ratingText }}</span>
          </div>
        </div>

        <div class="tag-grid">
          <a-tag v-for="tag in rateTags" :key="tag" color="blue">{{ tag }}</a-tag>
        </div>

        <a-textarea v-model:value="feedbackText" :rows="4" placeholder="请详细描述您的上课体验、导师表现以及改进建议..." />
      </div>

      <div class="dialog-actions">
        <a-button @click="rateOpen = false">取消</a-button>
        <a-button type="primary" @click="rateOpen = false">提交评价</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type ReportRow = {
  id: string
  courseType: string
  mentor: string
  duration: string
  date: string
  source: string
  rate: string
  status: '待评价' | '已评价'
  actionLabel: string
}

const sourceOptions = [
  { value: 'request', label: '我的申请' },
  { value: 'mentor', label: '导师填报' }
]

const courseTypeOptions = [
  { value: 'interview', label: '入职面试' },
  { value: 'mock', label: '模拟面试' },
  { value: 'written', label: '笔试辅导' },
  { value: 'midterm', label: '模拟期中' },
  { value: 'network', label: '人际关系' }
]

const rateStatusOptions = [
  { value: 'pending', label: '待评价' },
  { value: 'rated', label: '已评价' }
]

const reportRows: ReportRow[] = [
  {
    id: '231776',
    courseType: '模拟面试',
    mentor: 'Jerry Li',
    duration: '1.5h',
    date: '12/28/2025',
    source: '我的申请',
    rate: '待评价',
    status: '待评价',
    actionLabel: '评价'
  },
  {
    id: '231775',
    courseType: '入职面试',
    mentor: 'Test Lead Mentor',
    duration: '2.0h',
    date: '12/25/2025',
    source: '导师填报',
    rate: '已评价 ⭐4.5',
    status: '已评价',
    actionLabel: '重新评价'
  },
  {
    id: '214991',
    courseType: '笔试辅导',
    mentor: 'Test Lead Mentor',
    duration: '1.0h',
    date: '12/20/2025',
    source: '我的申请',
    rate: '已评价 ⭐5.0',
    status: '已评价',
    actionLabel: '重新评价'
  }
]

const rateTags = ['专业能力强', '耐心细致', '反馈及时', '收获很大', '准时守约']
const activeTab = ref<'all' | 'pending' | 'rated'>('all')
const rateOpen = ref(false)
const rating = ref(0)
const feedbackText = ref('')
const activeRow = ref<ReportRow | null>(null)

const filteredRows = computed(() => {
  if (activeTab.value === 'pending') {
    return reportRows.filter((row) => row.status === '待评价')
  }

  if (activeTab.value === 'rated') {
    return reportRows.filter((row) => row.status === '已评价')
  }

  return reportRows
})

const ratingText = computed(() => {
  const texts = ['', '1分 - 很差', '2分 - 一般', '3分 - 还行', '4分 - 很好', '5分 - 非常棒']
  return texts[rating.value] || '请选择'
})

const openRate = (row: ReportRow) => {
  activeRow.value = row
  rating.value = row.status === '待评价' ? 0 : 4
  feedbackText.value = ''
  rateOpen.value = true
}
</script>

<style scoped lang="scss">
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

.toolbar-select,
.toolbar-date {
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

.rate-stack {
  display: grid;
  gap: 18px;
}

.mentor-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

.mentor-name {
  font-size: 16px;
  font-weight: 700;
}

.mentor-meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.rating-block {
  display: grid;
  gap: 10px;
}

.rating-title {
  font-weight: 700;
  color: #334155;
}

.rating-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.rating-text {
  margin-left: 6px;
  color: #2563eb;
  font-weight: 700;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

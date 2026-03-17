<template>
  <div id="page-feedback" class="feedback-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">课程反馈 <span>Feedback</span></h1>
          </div>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="prep" tab="Prep Feedback" />
        <a-tab-pane key="networking" tab="Networking" />
        <a-tab-pane key="mock" tab="Mock Midterm" />
      </a-tabs>

      <div class="toolbar">
        <a-input placeholder="搜索 Mentor..." class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="Performance" :options="performanceOptions" />
        <a-date-picker class="toolbar-date" />
      </div>

      <div class="table-shell">
        <table class="record-table">
          <thead>
            <tr>
              <th v-for="column in currentColumns" :key="column">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in currentRows" :key="row.actionId">
              <td v-for="column in currentColumns" :key="`${row.actionId}-${column}`">
                <template v-if="column === 'Action'">
                  <a-button type="link" size="small" @click="openDetail(row)">View</a-button>
                </template>
                <template v-else>
                  <span v-html="row[column]"></span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="detailOpen" title="Feedback Detail" :footer="null" width="620px">
      <div v-if="activeDetail" class="detail-stack">
        <div class="detail-banner">
          <div class="detail-title">{{ activeDetail.headline }}</div>
          <div class="detail-meta">{{ activeDetail.meta }}</div>
        </div>
        <div class="detail-box">{{ activeDetail.body }}</div>
      </div>

      <div class="dialog-actions">
        <a-button type="primary" @click="detailOpen = false">Close</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

type FeedbackRow = {
  actionId: string
  headline: string
  meta: string
  body: string
  [key: string]: string
}

const performanceOptions = [
  { value: 'Great', label: 'Great' },
  { value: 'Okay', label: 'Okay' },
  { value: 'Disappointing', label: 'Disappointing' }
]

const feedbackActionTriggers = [
  { actionId: 'fb-prep-1' },
  { actionId: 'fb-prep-2' },
  { actionId: 'fb-prep-3' },
  { actionId: 'fb-networking-1' },
  { actionId: 'fb-networking-2' },
  { actionId: 'fb-networking-3' },
  { actionId: 'fb-mock-1' },
  { actionId: 'fb-mock-2' },
  { actionId: 'fb-mock-3' },
  { actionId: 'fb-mock-4' }
]

const tabColumns = {
  prep: ['ID', 'Student', 'Mentor', 'Performance', 'Create Time', 'Action'],
  networking: ['ID', 'Mentor', 'Lead Mentor', 'Email Quality', 'Call Quality', 'Recommend', 'Create Time', 'Action'],
  mock: ['ID', 'Mentor', 'Score', 'Performance', 'Question', 'Create Time', 'Action']
}

const tabRows: Record<string, FeedbackRow[]> = {
  prep: [
    {
      actionId: 'fb-prep-1',
      headline: 'Prep Feedback #11099',
      meta: '03/05/2025 15:31:41 · Great',
      body: '回答结构清晰，对行业问题的理解扎实，建议继续强化 behavioral examples 的数据表达。',
      ID: '11099',
      Student: '1Test Student<br><span style="color:#64748b;font-size:12px">12766</span>',
      Mentor: 'Test Lead Mentor',
      Performance: 'Great',
      'Create Time': '03/05/2025 15:31:41',
      Action: 'View'
    },
    {
      actionId: 'fb-prep-2',
      headline: 'Prep Feedback #10743',
      meta: '03/02/2025 14:51:27 · Disappointing',
      body: '材料准备不足，建议先补齐公司研究和基础 technical 框架后再安排下一轮练习。',
      ID: '10743',
      Student: '1Test Student<br><span style="color:#64748b;font-size:12px">12766</span>',
      Mentor: 'Test Lead Mentor',
      Performance: 'Disappointing',
      'Create Time': '03/02/2025 14:51:27',
      Action: 'View'
    },
    {
      actionId: 'fb-prep-3',
      headline: 'Prep Feedback #3505',
      meta: '10/30/2024 00:53:34 · Okay',
      body: '知识点覆盖基本完整，但缺少高质量 follow-up 回答，建议继续增加 mock 次数。',
      ID: '3505',
      Student: '1Test Student<br><span style="color:#64748b;font-size:12px">12766</span>',
      Mentor: 'Test Lead Mentor',
      Performance: 'Okay',
      'Create Time': '10/30/2024 00:53:34',
      Action: 'View'
    }
  ],
  networking: [
    {
      actionId: 'fb-networking-1',
      headline: 'Networking Feedback #1001',
      meta: '12/28/2025 14:30 · Recommend Yes',
      body: 'Email outreach 比较成熟，电话沟通节奏稳定，对方愿意继续保持联系。',
      ID: '1001',
      Mentor: 'Jerry Li',
      'Lead Mentor': 'Test Lead Mentor',
      'Email Quality': '4/5',
      'Call Quality': '8/10',
      Recommend: 'Yes',
      'Create Time': '12/28/2025 14:30',
      Action: 'View'
    },
    {
      actionId: 'fb-networking-2',
      headline: 'Networking Feedback #1002',
      meta: '12/25/2025 10:15 · Recommend Maybe',
      body: '脚本痕迹偏重，建议补充更个性化的 follow-up 和针对性提问。',
      ID: '1002',
      Mentor: 'Test Lead Mentor',
      'Lead Mentor': 'Test Lead Mentor',
      'Email Quality': '3/5',
      'Call Quality': '6/10',
      Recommend: 'Maybe',
      'Create Time': '12/25/2025 10:15',
      Action: 'View'
    },
    {
      actionId: 'fb-networking-3',
      headline: 'Networking Feedback #1003',
      meta: '12/20/2025 16:45 · Recommend Yes',
      body: '对方反馈积极，后续可围绕香港 office 的团队差异继续深挖。',
      ID: '1003',
      Mentor: 'Michael Wang',
      'Lead Mentor': 'Test Lead Mentor',
      'Email Quality': '5/5',
      'Call Quality': '9/10',
      Recommend: 'Yes',
      'Create Time': '12/20/2025 16:45',
      Action: 'View'
    }
  ],
  mock: [
    {
      actionId: 'fb-mock-1',
      headline: 'Mock Feedback #501',
      meta: '12/27/2025 10:30 · 85',
      body: 'DCF Analysis 表现稳定，case 结构完整，建议继续提升对 market assumptions 的灵活应对。',
      ID: '501',
      Mentor: 'Test Lead Mentor',
      Score: '85',
      Performance: 'Great',
      Question: 'DCF Analysis',
      'Create Time': '12/27/2025 10:30',
      Action: 'View'
    },
    {
      actionId: 'fb-mock-2',
      headline: 'Mock Feedback #502',
      meta: '12/22/2025 14:00 · 72',
      body: 'LBO Model 部分还不够熟练，建议加强 debt schedule 和 returns bridge 讲解。',
      ID: '502',
      Mentor: 'Jerry Li',
      Score: '72',
      Performance: 'Okay',
      Question: 'LBO Model',
      'Create Time': '12/22/2025 14:00',
      Action: 'View'
    },
    {
      actionId: 'fb-mock-3',
      headline: 'Mock Feedback #503',
      meta: '12/18/2025 11:20 · 91',
      body: 'M&A Valuation 回答优秀，框架清楚且表达自信，是当前最稳定的一次演练。',
      ID: '503',
      Mentor: 'Michael Wang',
      Score: '91',
      Performance: 'Great',
      Question: 'M&A Valuation',
      'Create Time': '12/18/2025 11:20',
      Action: 'View'
    },
    {
      actionId: 'fb-mock-4',
      headline: 'Mock Feedback #504',
      meta: '12/15/2025 09:45 · 58',
      body: 'Financial Modeling 框架不稳，需要回到基础重练并补齐公式解释。',
      ID: '504',
      Mentor: 'Test Lead Mentor',
      Score: '58',
      Performance: 'Disappointing',
      Question: 'Financial Modeling',
      'Create Time': '12/15/2025 09:45',
      Action: 'View'
    }
  ]
}

const activeTab = ref<'prep' | 'networking' | 'mock'>('prep')
const detailOpen = ref(false)
const activeDetail = ref<FeedbackRow | null>(null)

const currentColumns = computed(() => tabColumns[activeTab.value])
const currentRows = computed(() => tabRows[activeTab.value])

const openDetail = (row: FeedbackRow) => {
  activeDetail.value = row
  detailOpen.value = true
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 180px;
}

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

.detail-stack {
  display: grid;
  gap: 16px;
}

.detail-banner {
  border-radius: 16px;
  background: linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%);
  padding: 16px 18px;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.detail-meta {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.detail-box {
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px 18px;
  line-height: 1.8;
  color: #334155;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>

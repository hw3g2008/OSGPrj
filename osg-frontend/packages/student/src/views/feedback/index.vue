<template>
  <div id="page-feedback" class="feedback-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.feedback.k1') }} <span>Feedback</span></h1>
          </div>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="prep" tab="Prep Feedback" />
        <a-tab-pane key="networking" tab="Networking" />
        <a-tab-pane key="mock" tab="Mock Midterm" />
      </a-tabs>

      <div class="toolbar">
        <a-input :placeholder="t('student.feedback.k2')" class="toolbar-input" />
        <a-select class="toolbar-select" placeholder="Performance" :options="performanceOptions" />
        <a-date-picker class="toolbar-date" />
      </div>

      <div class="table-shell">
        <a-table
          :columns="antColumns"
          :data-source="currentRows"
          :pagination="false"
          :row-key="(record: any) => record.actionId"
          class="record-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'Action'">
              <a-button type="link" size="small" @click="openDetail(record)">View</a-button>
            </template>
            <template v-else>
              <span v-html="record[column.key]"></span>
            </template>
          </template>
        </a-table>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="detailOpen" title="Feedback Detail" :footer="null" width="620px" wrap-class-name="osg-modal-form">
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
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

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
      body: t('student.feedback.k3'),
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
      body: t('student.feedback.k4'),
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
      body: t('student.feedback.k5'),
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
      body: t('student.feedback.k6'),
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
      body: t('student.feedback.k7'),
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
      body: t('student.feedback.k8'),
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
      body: t('student.feedback.k9'),
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
      body: t('student.feedback.k10'),
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
      body: t('student.feedback.k11'),
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
      body: t('student.feedback.k12'),
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
const antColumns = computed(() =>
  currentColumns.value.map((c: string) => ({ title: c, key: c }))
)

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

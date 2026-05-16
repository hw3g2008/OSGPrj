<template>
  <div id="page-report" class="report-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ t('student.report.k1') }} <span>Class Report</span></h1>
          </div>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="all" :tab="t('student.report.k4')" />
        <a-tab-pane key="pending" :tab="t('student.report.k5')" />
        <a-tab-pane key="rated" :tab="t('student.report.k6')" />
      </a-tabs>

      <div class="toolbar">
        <a-input :placeholder="t('student.report.k7')" class="toolbar-input" />
        <a-select class="toolbar-select" :placeholder="t('student.report.k8')" :options="sourceOptions" />
        <a-select class="toolbar-select" :placeholder="t('student.report.k9')" :options="courseTypeOptions" />
        <a-select class="toolbar-select" :placeholder="t('student.report.k10')" :options="rateStatusOptions" />
        <a-date-picker class="toolbar-date" />
      </div>

      <div class="table-shell">
        <a-table
          :columns="reportColumns"
          :data-source="filteredRows"
          :pagination="false"
          :row-key="(record: any) => record.id"
          class="record-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <a-button
                :type="record.status === STATUS_PENDING_REVIEW ? 'primary' : 'default'"
                size="small"
                @click="openRate(record)"
              >
                {{ record.actionLabel }}
              </a-button>
            </template>
          </template>
        </a-table>
      </div>
    </OsgPageContainer>

    <a-modal v-model:open="rateOpen" :title="t('student.report.k11')" :footer="null" width="620px" wrap-class-name="osg-modal-form">
      <div v-if="activeRow" class="rate-stack">
        <div class="mentor-card">
          <div class="avatar">JL</div>
          <div>
            <div class="mentor-name">{{ activeRow.mentor }}</div>
            <div class="mentor-meta">{{ activeRow.courseType }} · {{ activeRow.date }} · {{ activeRow.duration }}</div>
          </div>
        </div>

        <a-form layout="vertical" class="rate-form">
          <a-form-item :label="t('student.report.k12')" required>
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
          </a-form-item>

          <a-form-item :label="t('student.report.k13')">
            <div class="tag-grid">
              <a-tag v-for="tag in rateTags" :key="tag" color="blue">{{ tag }}</a-tag>
            </div>
          </a-form-item>

          <a-form-item :label="t('student.report.k14')" required>
            <a-textarea
              v-model:value="feedbackText"
              :rows="4"
              :placeholder="t('student.report.k15')"
            />
          </a-form-item>
        </a-form>
      </div>

      <div class="dialog-actions">
        <a-button @click="rateOpen = false">{{ t('student.report.k2') }}</a-button>
        <a-button type="primary" @click="rateOpen = false">{{ t('student.report.k3') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OsgPageContainer } from '@osg/shared/components'

const { t } = useI18n()

const STATUS_PENDING_REVIEW = '待评价' // i18n-skip-line: backend enum value

const reportColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: t('student.report.k9'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('student.report.k16'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('student.report.k17'), dataIndex: 'duration', key: 'duration' },
  { title: t('student.report.k18'), dataIndex: 'date', key: 'date' },
  { title: t('student.report.k19'), dataIndex: 'source', key: 'source' },
  { title: t('student.report.k20'), dataIndex: 'rate', key: 'rate' },
  { title: t('student.report.k21'), key: 'action' },
]

type ReportRow = {
  id: string
  courseType: string
  mentor: string
  duration: string
  date: string
  source: string
  rate: string
  status: t('student.report.k5') | t('student.report.k6')
  actionLabel: string
}

const sourceOptions = [
  { value: 'request', label: t('student.report.k22') },
  { value: 'mentor', label: t('student.report.k23') }
]

const courseTypeOptions = [
  { value: 'interview', label: t('student.report.k24') },
  { value: 'mock', label: t('student.report.k25') },
  { value: 'written', label: t('student.report.k26') },
  { value: 'midterm', label: t('student.report.k27') },
  { value: 'network', label: t('student.report.k28') }
]

const rateStatusOptions = [
  { value: 'pending', label: t('student.report.k5') },
  { value: 'rated', label: t('student.report.k6') }
]

const reportRows: ReportRow[] = [
  {
    id: '231776',
    courseType: t('student.report.k25'),
    mentor: 'Jerry Li',
    duration: '1.5h',
    date: '12/28/2025',
    source: t('student.report.k22'),
    rate: t('student.report.k5'),
    status: t('student.report.k5'),
    actionLabel: t('student.report.k29')
  },
  {
    id: '231775',
    courseType: t('student.report.k24'),
    mentor: 'Test Lead Mentor',
    duration: '2.0h',
    date: '12/25/2025',
    source: t('student.report.k23'),
    rate: t('student.report.k30'),
    status: t('student.report.k6'),
    actionLabel: t('student.report.k31')
  },
  {
    id: '214991',
    courseType: t('student.report.k26'),
    mentor: 'Test Lead Mentor',
    duration: '1.0h',
    date: '12/20/2025',
    source: t('student.report.k22'),
    rate: t('student.report.k32'),
    status: t('student.report.k6'),
    actionLabel: t('student.report.k31')
  }
]

const rateTags = [t('student.report.k33'), t('student.report.k34'), t('student.report.k35'), t('student.report.k36'), t('student.report.k37')]
const activeTab = ref<'all' | 'pending' | 'rated'>('all')
const rateOpen = ref(false)
const rating = ref(0)
const feedbackText = ref('')
const activeRow = ref<ReportRow | null>(null)

const filteredRows = computed(() => {
  if (activeTab.value === 'pending') {
    return reportRows.filter((row) => row.status === t('student.report.k5'))
  }

  if (activeTab.value === 'rated') {
    return reportRows.filter((row) => row.status === t('student.report.k6'))
  }

  return reportRows
})

const ratingText = computed(() => {
  const texts = ['', t('student.report.k38'), t('student.report.k39'), t('student.report.k40'), t('student.report.k41'), t('student.report.k42')]
  return texts[rating.value] || t('student.report.k43')
})

const openRate = (row: ReportRow) => {
  activeRow.value = row
  rating.value = row.status === t('student.report.k5') ? 0 : 4
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

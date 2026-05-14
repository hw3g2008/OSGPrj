<template>
  <div id="page-report" class="report-page">
    <OsgPageContainer>
      <template #header>
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ $t('class_records') }} <span>Class Report</span></h1>
            <p class="page-sub">{{ $t('view_course_records_and_submit_feedback') }}</p>
          </div>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="all" :tab="$t('all')" />
        <a-tab-pane key="pending" :tab="$t('pending_evaluation')" />
        <a-tab-pane key="rated" :tab="$t('rated')" />
      </a-tabs>

      <div class="toolbar">
        <a-input placeholder="搜索导师/课程..." class="toolbar-input" />
        <a-select class="toolbar-select" :placeholder="$t('course_source')" :options="sourceOptions" />
        <a-select class="toolbar-select" :placeholder="$t('course_type')" :options="courseTypeOptions" />
        <a-select class="toolbar-select" :placeholder="$t('review_status_2')" :options="rateStatusOptions" />
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
                :type="record.status === $t('pending_evaluation') ? 'primary' : 'default'"
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

    <a-modal v-model:open="rateOpen" :title="$t('course_review_2')" :footer="null" width="620px">
      <div v-if="activeRow" class="rate-stack">
        <div class="mentor-card">
          <div class="avatar">JL</div>
          <div>
            <div class="mentor-name">{{ activeRow.mentor }}</div>
            <div class="mentor-meta">{{ activeRow.courseType }} · {{ activeRow.date }} · {{ activeRow.duration }}</div>
          </div>
        </div>

        <a-form layout="vertical" class="rate-form">
          <a-form-item label="整体评分" required>
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

          <a-form-item label="评价标签（可多选）">
            <div class="tag-grid">
              <a-tag v-for="tag in rateTags" :key="tag" color="blue">{{ tag }}</a-tag>
            </div>
          </a-form-item>

          <a-form-item label="详细反馈" required>
            <a-textarea
              v-model:value="feedbackText"
              :rows="4"
              :placeholder="`${$t('please_describe_your_class_experience_me')}...`"
            />
          </a-form-item>
        </a-form>
      </div>

      <div class="dialog-actions">
        <a-button @click="rateOpen = false">{{ $t('cancel') }}</a-button>
        <a-button type="primary" @click="rateOpen = false">{{ $t('submit_review') }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const reportColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: t('course_type'), dataIndex: 'courseType', key: 'courseType' },
  { title: t('mentor'), dataIndex: 'mentor', key: 'mentor' },
  { title: t('class_hours'), dataIndex: 'duration', key: 'duration' },
  { title: t('course_date'), dataIndex: 'date', key: 'date' },
  { title: t('source'), dataIndex: 'source', key: 'source' },
  { title: t('my_review'), dataIndex: 'rate', key: 'rate' },
  { title: t('operation'), key: 'action' },
]

type ReportRow = {
  id: string
  courseType: string
  mentor: string
  duration: string
  date: string
  source: string
  rate: string
  status: string
  actionLabel: string
}

const sourceOptions = [
  { value: 'request', label: t('my_applications') },
  { value: 'mentor', label: t('mentor_submission_2') }
]

const courseTypeOptions = [
  { value: 'interview', label: t('interview_2') },
  { value: 'mock', label: t('mock_interview') },
  { value: 'written', label: t('written_test_coaching') },
  { value: 'midterm', label: t('mock_midterm') },
  { value: 'network', label: t('interpersonal_skills') }
]

const rateStatusOptions = [
  { value: 'pending', label: t('pending_evaluation') },
  { value: 'rated', label: t('rated') }
]

const reportRows: ReportRow[] = [
  {
    id: '231776',
    courseType: t('mock_interview'),
    mentor: 'Jerry Li',
    duration: '1.5h',
    date: '12/28/2025',
    source: t('my_applications'),
    rate: t('pending_evaluation'),
    status: t('pending_evaluation'),
    actionLabel: t('feedback')
  },
  {
    id: '231775',
    courseType: t('interview_2'),
    mentor: 'Test Lead Mentor',
    duration: '2.0h',
    date: '12/25/2025',
    source: t('mentor_submission_2'),
    rate: '已评价 ⭐4.5',
    status: t('rated'),
    actionLabel: t('re_review')
  },
  {
    id: '214991',
    courseType: t('written_test_coaching'),
    mentor: 'Test Lead Mentor',
    duration: '1.0h',
    date: '12/20/2025',
    source: t('my_applications'),
    rate: '已评价 ⭐5.0',
    status: t('rated'),
    actionLabel: t('re_review')
  }
]

const rateTags = [t('strong_professional_skills'), t('patient_and_thorough'), t('timely_feedback'), t('very_insightful'), t('punctual_and_reliable')]
const activeTab = ref<'all' | 'pending' | 'rated'>('all')
const rateOpen = ref(false)
const rating = ref(0)
const feedbackText = ref('')
const activeRow = ref<ReportRow | null>(null)

const filteredRows = computed(() => {
  if (activeTab.value === 'pending') {
    return reportRows.filter((row) => row.status === t('pending_evaluation'))
  }

  if (activeTab.value === 'rated') {
    return reportRows.filter((row) => row.status === t('rated'))
  }

  return reportRows
})

const ratingText = computed(() => {
  const texts = ['', '1分 - 很差', '2分 - 一般', '3分 - 还行', '4分 - 很好', '5分 - 非常棒']
  return texts[rating.value] || t('please_select')
})

const openRate = (row: ReportRow) => {
  activeRow.value = row
  rating.value = row.status === t('pending_evaluation') ? 0 : 4
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


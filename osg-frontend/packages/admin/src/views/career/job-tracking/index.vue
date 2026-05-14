<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('position_tracking_for_all_trainees')" title-en="Job Tracking" :description="$t('view_the_job_application_progress_of_all')">
      <template #actions>
        <span style="color: #64748b; font-size: 13px">{{ rows.length }} {{ $t('job_records') }} · {{ stats.interviewingCount }} {{ $t('interview_in_progress') }}</span>
      </template>
    </PageHeader>

    <a-row :gutter="16">
      <a-col v-for="card in statCards" :key="card.key" :span="Math.floor(24 / statCards.length)">
        <a-card :bordered="false" :body-style="{ textAlign: 'center', background: card.bg, borderRadius: '12px' }">
          <a-statistic :title="card.label" :value="card.value" :value-style="{ fontWeight: 700 }" />
          <div style="color: #64748b; font-size: 12px; margin-top: 4px">{{ card.meta }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false">
      <a-form layout="inline" style="margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
        <a-form-item :label="$t('student_name')">
          <a-input v-model:value="filters.studentName" :placeholder="$t('search_students')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="$t('head_teacher')">
          <a-input v-model:value="filters.leadMentorName" :placeholder="$t('example_jess_amy')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="$t('status')">
          <a-select v-model:value="filters.trackingStatus" :placeholder="$t('all')" allow-clear style="width: 120px">
            <a-select-option value="tracking">{{ $t('tracking') }}</a-select-option>
            <a-select-option value="applied">{{ $t('already_applied') }}</a-select-option>
            <a-select-option value="interviewing">{{ $t('during_the_interview') }}</a-select-option>
            <a-select-option value="offer">{{ $t('obtained') }}Offer</a-select-option>
            <a-select-option value="rejected">{{ $t('rejected') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('company')">
          <a-input v-model:value="filters.companyName" :placeholder="$t('search_company')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="$t('location')">
          <a-input v-model:value="filters.location" :placeholder="$t('search_city_region')" allow-clear style="width: 150px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadTrackingBoard">
              <template #icon><SearchOutlined /></template>
              {{ $t('search') }}
            </a-button>
            <a-button @click="resetFilters">{{ $t('reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <a-table
        :columns="trackingColumns"
        :data-source="rows"
        :row-key="(record: JobTrackingRow) => record.applicationId"
        :pagination="false"
        :loading="loading"
        :locale="{ emptyText: $t('there_are_currently_no_job_tracking_reco') }"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'studentName'">
            <div>
              <strong>{{ record.studentName || '-' }}</strong>
              <div style="color: #9ca3af; font-size: 12px">ID: {{ record.studentId }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'mentorName'">
            {{ record.mentorName || $t('not_allocated') }}
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            {{ record.location || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'trackingStatus'">
            <div>
              <a-tag :color="colorOf(record.trackingStatus)">{{ labelOf(record.trackingStatus) }}</a-tag>
              <div v-if="record.interviewStage" style="color: #64748b; font-size: 12px; margin-top: 2px">{{ stageLabelOf(record.interviewStage) }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'interviewTime'">
            <div>
              <strong>{{ formatDateTime(record.interviewTime) }}</strong>
              <div style="color: #9ca3af; font-size: 12px">{{ record.preferredMentor || $t('intended_tutor_has_not_been_filled_in') }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditor(record)">{{ $t('edit') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editingVisible"
      :title="`${$t('update_job_search_status')} · ${editingRow?.studentName} · ${editingRow?.companyName}`"
      :confirm-loading="submitting"
      :ok-text="$t('save_updates')"
      :cancel-text="$t('cancel')"
      :width="600"
      @ok="submitUpdate"
      @cancel="closeEditor"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="margin-top: 16px">
        <a-form-item :label="$t('current_status')">
          <a-select v-model:value="form.trackingStatus">
            <a-select-option value="not-applied">{{ $t('not_applied') }}</a-select-option>
            <a-select-option value="applied">{{ $t('already_applied') }}</a-select-option>
            <a-select-option value="tracking">{{ $t('tracking') }}</a-select-option>
            <a-select-option value="interviewing">{{ $t('during_the_interview') }}</a-select-option>
            <a-select-option value="offer">{{ $t('obtained') }}Offer</a-select-option>
            <a-select-option value="rejected">{{ $t('rejected') }}</a-select-option>
          </a-select>
        </a-form-item>

        <template v-if="form.trackingStatus === 'interviewing'">
          <a-form-item :label="$t('interview_stage')">
            <a-select v-model:value="form.interviewStage">
              <a-select-option v-for="option in interviewStageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="$t('interview_time')">
            <a-date-picker v-model:value="form.interviewTime" show-time :placeholder="$t('choose_interview_time')" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="$t('intended_mentor')">
            <a-input v-model:value="form.preferredMentor" :placeholder="$t('example_jess')" />
          </a-form-item>
          <a-form-item :label="$t('exclude_tutor')">
            <a-input v-model:value="form.excludedMentor" :placeholder="$t('example_amy')" />
          </a-form-item>
        </template>

        <a-form-item :label="$t('remarks')">
          <a-textarea v-model:value="form.note" :rows="4" :placeholder="$t('additional_follow_up_instructions')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getJobTrackingList,
  updateJobTracking,
  type JobTrackingFilters,
  type JobTrackingRow,
  type JobTrackingStats
} from '@osg/shared/api/admin/jobTracking'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const trackingColumns = [
  { title: t('student'), dataIndex: 'studentName', key: 'studentName', width: 140 },
  { title: t('mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('company'), dataIndex: 'companyName', key: 'companyName', width: 140 },
  { title: t('position'), dataIndex: 'positionName', key: 'positionName', width: 160 },
  { title: t('location'), dataIndex: 'location', key: 'location', width: 100 },
  { title: t('status'), dataIndex: 'trackingStatus', key: 'trackingStatus', width: 120 },
  { title: t('interview_time'), dataIndex: 'interviewTime', key: 'interviewTime', width: 180 },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
]

const defaultStats: JobTrackingStats = {
  totalStudentCount: 0,
  trackingCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  rejectedCount: 0
}

const filters = reactive<JobTrackingFilters>({
  studentName: '',
  leadMentorName: '',
  trackingStatus: undefined,
  companyName: '',
  location: ''
})

const interviewStageOptions = [
  { value: 'oa', label: 'OA' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'first_round', label: 'First Round' },
  { value: 'final', label: 'Final Round' }
]

const loading = ref(false)
const submitting = ref(false)
const rows = ref<JobTrackingRow[]>([])
const stats = ref<JobTrackingStats>({ ...defaultStats })
const editingVisible = ref(false)
const editingRow = ref<JobTrackingRow | null>(null)
const form = reactive({
  trackingStatus: 'tracking',
  interviewStage: 'first_round',
  interviewTime: '',
  preferredMentor: '',
  excludedMentor: '',
  note: ''
})

const requestFilters = computed<JobTrackingFilters>(() => ({
  studentName: filters.studentName || undefined,
  leadMentorName: filters.leadMentorName || undefined,
  trackingStatus: filters.trackingStatus || undefined,
  companyName: filters.companyName || undefined,
  location: filters.location || undefined
}))

const statCards = computed(() => [
  { key: 'totalStudentCount', label: t('all_students'), value: stats.value.totalStudentCount, meta: t('number_of_unique_students'), tone: 'blue', bg: '#eff6ff' },
  { key: 'trackingCount', label: t('tracking'), value: stats.value.trackingCount, meta: t('submitted_and_awaiting_advancement'), tone: 'slate', bg: '#f1f5f9' },
  { key: 'interviewingCount', label: t('during_the_interview'), value: stats.value.interviewingCount, meta: t('need_to_follow_up_the_schedule'), tone: 'amber', bg: '#fffbeb' },
  { key: 'offerCount', label: t('got_offer'), value: stats.value.offerCount, meta: t('conversion_completed'), tone: 'green', bg: '#f0fdf4' },
  { key: 'rejectedCount', label: t('rejected'), value: stats.value.rejectedCount, meta: t('to_be_reviewed'), tone: 'red', bg: '#fef2f2' }
])

async function loadTrackingBoard() {
  loading.value = true
  try {
    const response = await getJobTrackingList(requestFilters.value)
    stats.value = response.stats ?? { ...defaultStats }
    rows.value = response.rows ?? []
  } catch (error) {
    console.error(error)
    message.error(t('position_tracking_failed_to_load'))
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.studentName = ''
  filters.leadMentorName = ''
  filters.trackingStatus = undefined
  filters.companyName = ''
  filters.location = ''
  void loadTrackingBoard()
}

function openEditor(row: JobTrackingRow) {
  editingRow.value = row
  form.trackingStatus = row.trackingStatus || 'tracking'
  form.interviewStage = row.interviewStage || 'first_round'
  form.interviewTime = toDatetimeLocal(row.interviewTime)
  form.preferredMentor = row.preferredMentor || ''
  form.excludedMentor = row.excludedMentor || ''
  form.note = row.note || ''
  editingVisible.value = true
}

function closeEditor() {
  editingVisible.value = false
  editingRow.value = null
}

async function submitUpdate() {
  if (!editingRow.value) {
    return
  }

  submitting.value = true
  try {
    await updateJobTracking(editingRow.value.applicationId, {
      trackingStatus: form.trackingStatus,
      interviewStage: form.trackingStatus === 'interviewing' ? form.interviewStage : undefined,
      interviewTime: form.trackingStatus === 'interviewing' && form.interviewTime ? fromDatetimeLocal(form.interviewTime) : undefined,
      preferredMentor: form.trackingStatus === 'interviewing' ? form.preferredMentor : undefined,
      excludedMentor: form.trackingStatus === 'interviewing' ? form.excludedMentor : undefined,
      note: form.note || undefined
    })
    message.success(t('job_tracking_updated'))
    closeEditor()
    await loadTrackingBoard()
  } catch (error) {
    console.error(error)
    message.error(t('position_tracking_update_failed'))
  } finally {
    submitting.value = false
  }
}

function labelOf(status?: string) {
  switch (status) {
    case 'applied':
      return t('already_applied')
    case 'interviewing':
      return t('during_the_interview')
    case 'offer':
      return t('got_offer')
    case 'rejected':
      return t('rejected')
    default:
      return t('tracking')
  }
}

function colorOf(status?: string) {
  switch (status) {
    case 'applied':
      return 'blue'
    case 'interviewing':
      return 'orange'
    case 'offer':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'blue'
  }
}

function stageLabelOf(stage?: string | null) {
  const hit = interviewStageOptions.find((option) => option.value === stage)
  return hit?.label || stage || '-'
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function toDatetimeLocal(value?: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeLocal(value: string) {
  return value ? `${value}:00` : undefined
}

onMounted(() => {
  void loadTrackingBoard()
})
</script>

<style scoped>
</style>

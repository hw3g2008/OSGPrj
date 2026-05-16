<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.career.jobTracking.pageTitle')" title-en="Job Tracking">
      <template #actions>
        <span style="color: #64748b; font-size: 13px">{{ t('admin.career.jobTracking.headerStats', { total: rows.length, interviewing: stats.interviewingCount }) }}</span>
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
        <a-form-item :label="t('admin.career.jobTracking.filters.studentName')">
          <a-input v-model:value="filters.studentName" :placeholder="t('admin.career.jobTracking.filters.studentPlaceholder')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="t('admin.career.jobTracking.filters.leadMentor')">
          <a-input v-model:value="filters.leadMentorName" :placeholder="t('admin.career.jobTracking.filters.leadMentorPlaceholder')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="t('admin.career.jobTracking.filters.status')">
          <a-select v-model:value="filters.trackingStatus" :placeholder="t('admin.career.jobTracking.filters.statusAll')" allow-clear style="width: 120px">
            <a-select-option value="tracking">{{ t('admin.career.jobTracking.status.tracking') }}</a-select-option>
            <a-select-option value="applied">{{ t('admin.career.jobTracking.status.applied') }}</a-select-option>
            <a-select-option value="interviewing">{{ t('admin.career.jobTracking.status.interviewing') }}</a-select-option>
            <a-select-option value="offer">{{ t('admin.career.jobTracking.status.offer') }}</a-select-option>
            <a-select-option value="rejected">{{ t('admin.career.jobTracking.status.rejected') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('admin.career.jobTracking.filters.company')">
          <a-input v-model:value="filters.companyName" :placeholder="t('admin.career.jobTracking.filters.companyPlaceholder')" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item :label="t('admin.career.jobTracking.filters.location')">
          <a-input v-model:value="filters.location" :placeholder="t('admin.career.jobTracking.filters.locationPlaceholder')" allow-clear style="width: 150px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadTrackingBoard">
              <template #icon><SearchOutlined /></template>
              {{ t('admin.career.jobTracking.filters.search') }}
            </a-button>
            <a-button @click="resetFilters">{{ t('admin.career.jobTracking.filters.reset') }}</a-button>
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
        :locale="{ emptyText: t('admin.career.jobTracking.empty') }"
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
            {{ record.mentorName || t('admin.career.jobTracking.unassigned') }}
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
              <div style="color: #9ca3af; font-size: 12px">{{ record.preferredMentor || t('admin.career.jobTracking.noPreferredMentor') }}</div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEditor(record)">{{ t('admin.career.jobTracking.action.edit') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editingVisible"
      :title="t('admin.career.jobTracking.modal.title', { name: editingRow?.studentName, company: editingRow?.companyName })"
      :confirm-loading="submitting"
      :ok-text="t('admin.career.jobTracking.modal.save')"
      :cancel-text="t('admin.career.jobTracking.modal.cancel')"
      :width="600"
      @ok="submitUpdate"
      @cancel="closeEditor"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }" style="margin-top: 16px">
        <a-form-item :label="t('admin.career.jobTracking.modal.currentStatus')">
          <a-select v-model:value="form.trackingStatus">
            <a-select-option value="not-applied">{{ t('admin.career.jobTracking.status.notApplied') }}</a-select-option>
            <a-select-option value="applied">{{ t('admin.career.jobTracking.status.applied') }}</a-select-option>
            <a-select-option value="tracking">{{ t('admin.career.jobTracking.status.tracking') }}</a-select-option>
            <a-select-option value="interviewing">{{ t('admin.career.jobTracking.status.interviewing') }}</a-select-option>
            <a-select-option value="offer">{{ t('admin.career.jobTracking.status.offer') }}</a-select-option>
            <a-select-option value="rejected">{{ t('admin.career.jobTracking.status.rejected') }}</a-select-option>
          </a-select>
        </a-form-item>

        <template v-if="form.trackingStatus === 'interviewing'">
          <a-form-item :label="t('admin.career.jobTracking.modal.interviewStage')">
            <a-select v-model:value="form.interviewStage">
              <a-select-option v-for="option in interviewStageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('admin.career.jobTracking.modal.interviewTime')">
            <a-date-picker v-model:value="form.interviewTime" show-time :placeholder="t('admin.career.jobTracking.modal.interviewTimePlaceholder')" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="t('admin.career.jobTracking.modal.preferredMentor')">
            <a-input v-model:value="form.preferredMentor" :placeholder="t('admin.career.jobTracking.modal.mentorPlaceholder')" />
          </a-form-item>
          <a-form-item :label="t('admin.career.jobTracking.modal.excludedMentor')">
            <a-input v-model:value="form.excludedMentor" :placeholder="t('admin.career.jobTracking.modal.excludedMentorPlaceholder')" />
          </a-form-item>
        </template>

        <a-form-item :label="t('admin.career.jobTracking.modal.note')">
          <a-textarea v-model:value="form.note" :rows="4" :placeholder="t('admin.career.jobTracking.modal.notePlaceholder')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

const trackingColumns = computed(() => [
  { title: t('admin.career.jobTracking.columns.student'), dataIndex: 'studentName', key: 'studentName', width: 140, fixed: 'left' as const },
  { title: t('admin.career.jobTracking.columns.mentor'), dataIndex: 'mentorName', key: 'mentorName', width: 100 },
  { title: t('admin.career.jobTracking.columns.company'), dataIndex: 'companyName', key: 'companyName', width: 140 },
  { title: t('admin.career.jobTracking.columns.position'), dataIndex: 'positionName', key: 'positionName', width: 160 },
  { title: t('admin.career.jobTracking.columns.location'), dataIndex: 'location', key: 'location', width: 100 },
  { title: t('admin.career.jobTracking.columns.status'), dataIndex: 'trackingStatus', key: 'trackingStatus', width: 120 },
  { title: t('admin.career.jobTracking.columns.interviewTime'), dataIndex: 'interviewTime', key: 'interviewTime', width: 180 },
  { title: t('admin.career.jobTracking.columns.action'), dataIndex: 'action', key: 'action', width: 80, fixed: 'right' as const },
])

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
  { key: 'totalStudentCount', label: t('admin.career.jobTracking.stats.totalStudents'), value: stats.value.totalStudentCount, meta: t('admin.career.jobTracking.statsMeta.totalStudents'), tone: 'blue', bg: '#eff6ff' },
  { key: 'trackingCount', label: t('admin.career.jobTracking.stats.tracking'), value: stats.value.trackingCount, meta: t('admin.career.jobTracking.statsMeta.tracking'), tone: 'slate', bg: '#f1f5f9' },
  { key: 'interviewingCount', label: t('admin.career.jobTracking.stats.interviewing'), value: stats.value.interviewingCount, meta: t('admin.career.jobTracking.statsMeta.interviewing'), tone: 'amber', bg: '#fffbeb' },
  { key: 'offerCount', label: t('admin.career.jobTracking.stats.offer'), value: stats.value.offerCount, meta: t('admin.career.jobTracking.statsMeta.offer'), tone: 'green', bg: '#f0fdf4' },
  { key: 'rejectedCount', label: t('admin.career.jobTracking.stats.rejected'), value: stats.value.rejectedCount, meta: t('admin.career.jobTracking.statsMeta.rejected'), tone: 'red', bg: '#fef2f2' }
])

async function loadTrackingBoard() {
  loading.value = true
  try {
    const response = await getJobTrackingList(requestFilters.value)
    stats.value = response.stats ?? { ...defaultStats }
    rows.value = response.rows ?? []
  } catch (error) {
    console.error(error)
    message.error(t('admin.career.jobTracking.messages.loadFailed'))
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
    message.success(t('admin.career.jobTracking.messages.updateSuccess'))
    closeEditor()
    await loadTrackingBoard()
  } catch (error) {
    console.error(error)
    message.error(t('admin.career.jobTracking.messages.updateFailed'))
  } finally {
    submitting.value = false
  }
}

function labelOf(status?: string) {
  switch (status) {
    case 'applied':
      return t('admin.career.jobTracking.status.applied')
    case 'interviewing':
      return t('admin.career.jobTracking.status.interviewing')
    case 'offer':
      return t('admin.career.jobTracking.status.offer')
    case 'rejected':
      return t('admin.career.jobTracking.status.rejected')
    default:
      return t('admin.career.jobTracking.status.tracking')
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

<template>
  <div class="osg-page">
    <PageHeader :title-zh="$t('tutor_schedule_management')" title-en="Mentor Schedule" :description="$t('monitor_schedule_submissions_and_coordin')">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          {{ exporting ? $t('exporting') + '...' : $t('export_schedule') }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="unfilledCount > 0"
      type="error"
      show-icon
      :message="$t('unfilled_mentor_schedule_count', { count: unfilledCount })"
      :description="selectedWeek === 'next' ? $t('please_complete_next_weeks_schedule_as_s') : $t('2_days_until_the_deadline')"
    >
      <template #action>
        <a-button type="primary" danger size="small" @click="handleRemindAll">
          <template #icon><SendOutlined /></template>
          {{ $t('remind_all') }}
        </a-button>
      </template>
    </a-alert>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <template #title>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px">
          <a-radio-group v-model:value="selectedWeek" button-style="solid" @change="(e: any) => handleWeekChange(e.target.value)">
            <a-radio-button v-for="option in weekOptions" :key="option.value" :value="option.value">
              {{ option.label }} ({{ option.range }})
            </a-radio-button>
          </a-radio-group>
          <span style="font-size: 14px; font-weight: 600; color: var(--text)">
            {{ $t('all_mentors') }} ({{ rows.length }}{{ $t('people') }})
          </span>
        </div>
      </template>
      <a-form layout="inline" style="margin-bottom: 16px" :data-field-name="$t('mentor_schedule_management')">
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="`${$t('search_for_tutor_name')}/ID...`" allow-clear style="width: 200px" :data-field-name="$t('search_2')" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.staffType" :placeholder="$t('all_types')" allow-clear style="width: 120px" :data-field-name="$t('type')">
            <a-select-option value="lead_mentor">{{ $t('head_teacher') }}</a-select-option>
            <a-select-option value="mentor">{{ $t('professional_mentor') }}</a-select-option>
            <a-select-option value="assistant">{{ $t('teaching_assistant') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.weekday" :placeholder="$t('all_dates')" allow-clear style="width: 110px" :data-field-name="$t('date')">
            <a-select-option v-for="day in weekdays" :key="day.value" :value="String(day.value)">{{ day.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.timeSlot" :placeholder="$t('all_time_slots')" allow-clear style="width: 110px" :data-field-name="$t('time_slot')">
            <a-select-option v-for="slot in timeSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <a-table
        :columns="scheduleColumns"
        :data-source="visibleRows"
        :scroll="{ x: 'max-content' }"
        :row-key="(record: StaffScheduleListItem) => record.staffId"
        :pagination="schedulePagination"
        :row-class-name="(record: StaffScheduleListItem) => record.filled ? '' : 'row-unfilled'"
        :locale="{ emptyText: $t('no_schedule_data_under_current_filter') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'staffName'">
            <div style="display: flex; align-items: center; gap: 12px">
              <a-avatar :style="{ background: record.filled ? 'linear-gradient(135deg, #7399c6, #5a7ba3)' : '#dc2626', flexShrink: 0 }" :size="36">{{ getAvatarText(record.staffName) }}</a-avatar>
              <div>
                <div :style="{ fontWeight: 600, color: record.filled ? 'var(--text)' : '#991b1b' }">{{ record.staffName }}</div>
                <div style="font-size: 11px; color: var(--muted)">ID: {{ record.staffId }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'staffType'">
            <a-tag :color="record.staffType === 'lead_mentor' ? 'blue' : 'purple'">{{ formatType(record.staffType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'availableHours'">
            <strong :style="{ color: record.filled ? 'var(--primary)' : '#dc2626' }">
              {{ record.filled ? formatHours(record.availableHours) : '-' }}
            </strong>
          </template>
          <template v-else-if="column.dataIndex === 'availableSlotLabels'">
            <div v-if="record.filled" style="display: flex; flex-wrap: wrap; gap: 4px">
              <a-tag v-for="label in record.availableSlotLabels" :key="label" :color="isWeekendSlot(label) ? 'green' : 'default'">{{ label }}</a-tag>
            </div>
            <a-tag v-else color="error">{{ $t('schedule_not_submitted') }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space v-if="record.filled">
              <a-button type="link" size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-edit`" @click="openEditModal(record)">{{ $t('adjust_schedule') }}</a-button>
            </a-space>
            <a-space v-else>
              <a-button type="primary" danger size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-fill`" @click="openEditModal(record)">{{ $t('fill_schedule_on_behalf') }}</a-button>
              <a-button size="small" @click="handleRemindAll"><template #icon><SendOutlined /></template></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <EditScheduleModal
      v-model:visible="editVisible"
      :record="selectedRecord"
      :week-scope="selectedWeek"
      @submit="handleEditSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined, SendOutlined } from '@ant-design/icons-vue'
import { getToken } from '@osg/shared/utils'
import {
  getStaffScheduleList,
  remindAllStaff,
  saveStaffSchedule,
  type StaffScheduleListItem,
  type TimeSlot,
  type WeekScope,
} from '@osg/shared/api/admin/schedule'
import EditScheduleModal from './components/EditScheduleModal.vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const scheduleColumns = [
  { title: t('mentor'), dataIndex: 'staffName', key: 'staffName', width: 200 },
  { title: t('type'), dataIndex: 'staffType', key: 'staffType', width: 90, align: 'center' as const },
  { title: t('available_hours'), dataIndex: 'availableHours', key: 'availableHours', width: 80, align: 'center' as const },
  { title: t('available_time'), dataIndex: 'availableSlotLabels', key: 'availableSlotLabels' },
  { title: t('operation'), dataIndex: 'action', key: 'action', width: 160 },
]

const rows = ref<StaffScheduleListItem[]>([])
const exporting = ref(false)
const reminding = ref(false)
const editVisible = ref(false)
const selectedRecord = ref<StaffScheduleListItem | null>(null)
const selectedWeek = ref<WeekScope>('current')

const weekOptions: { value: WeekScope; label: string; range: string }[] = [
  { value: 'current', label: t('this_week'), range: '03/09 - 03/15' },
  { value: 'next', label: t('next_week'), range: '03/16 - 03/22' },
]

const weekdays = [
  { value: 1, label: t('monday') },
  { value: 2, label: t('tuesday') },
  { value: 3, label: t('wednesday') },
  { value: 4, label: t('thursday') },
  { value: 5, label: t('friday') },
  { value: 6, label: t('saturday') },
  { value: 7, label: t('sunday') },
]

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: t('morning') },
  { value: 'afternoon', label: t('afternoon') },
  { value: 'evening', label: t('evening') },
]

const filters = reactive({
  keyword: '',
  staffType: undefined as string | undefined,
  weekday: undefined as string | undefined,
  timeSlot: undefined as string | undefined,
})

const unfilledCount = computed(() => rows.value.filter((item) => !item.filled).length)

const visibleRows = computed(() => {
  return rows.value.filter((record) => {
    const keyword = filters.keyword.trim().toLowerCase()
    const matchesKeyword = !keyword
      || String(record.staffId).includes(keyword)
      || record.staffName.toLowerCase().includes(keyword)
    const matchesType = !filters.staffType || record.staffType === filters.staffType
    const matchesWeekday = !filters.weekday
      || record.selectedSlotKeys.some((key) => key.startsWith(`${filters.weekday}-`))
    const matchesTimeSlot = !filters.timeSlot
      || record.selectedSlotKeys.some((key) => key.endsWith(`-${filters.timeSlot}`))
    return matchesKeyword && matchesType && matchesWeekday && matchesTimeSlot
  })
})

const schedulePagination = computed(() => ({
  pageSize: 10,
  showSizeChanger: false,
  total: visibleRows.value.length,
  showTotal: (n: number) => `${t('in_total')} ${n} ${t('records')}`,
  hideOnSinglePage: false
}))

const loadScheduleList = async () => {
  const response = await getStaffScheduleList({
    pageNum: 1,
    pageSize: 100,
    week: selectedWeek.value,
  })
  rows.value = response.rows || []
}

const handleWeekChange = async (week: WeekScope) => {
  if (selectedWeek.value === week) {
    return
  }
  selectedWeek.value = week
  await loadScheduleList()
}

const handleRemindAll = async () => {
  try {
    reminding.value = true
    const result = await remindAllStaff({ week: selectedWeek.value })
    if (result.recipientCount > 0) {
      message.success(t('mentor_schedule_reminded_count', { count: result.recipientCount }))
    } else {
      message.info(t('no_mentors_to_remind_at_the_moment'))
    }
  } catch (_error) {
    message.error(t('failed_to_remind_mentors'))
  } finally {
    reminding.value = false
  }
}

const handleExport = async () => {
  try {
    exporting.value = true
    const token = getToken()
    const response = await fetch(`/api/admin/schedule/export?week=${selectedWeek.value}`, {
      method: 'GET',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    })

    if (!response.ok) {
      throw new Error(t('export_request_failed'))
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success(t('mentor_schedule_exported_successfully'))
  } catch (_error) {
    message.error(t('failed_to_export_mentor_schedule'))
  } finally {
    exporting.value = false
  }
}

const openEditModal = (record: StaffScheduleListItem) => {
  selectedRecord.value = record
  editVisible.value = true
}

const handleEditSubmit = async (payload: {
  staffId: number
  week: WeekScope
  availableHours: number
  reason: string
  notifyStaff: boolean
  selectedSlotKeys: string[]
}) => {
  try {
    await saveStaffSchedule(payload)
    message.success(t('mentor_schedule_saved'))
    editVisible.value = false
    await loadScheduleList()
  } catch (_error) {
    message.error(t('failed_to_save_mentor_schedule'))
  }
}

const getAvatarText = (staffName: string) =>
  staffName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

const formatType = (staffType?: string) => {
  if (staffType === 'lead_mentor') {
    return t('head_teacher')
  }
  return t('professional_mentor')
}

const formatHours = (value?: number) => `${value ?? 0}h`

const isWeekendSlot = (label: string) => label.startsWith(t('saturday')) || label.startsWith(t('sunday'))

const getExportFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return t('mentor_schedule_export_filename')
  }
  const match = contentDisposition.match(/filename\\*=UTF-8''([^;]+)|filename="?([^"]+)"?/)
  const encoded = match?.[1] || match?.[2]
  return encoded ? decodeURIComponent(encoded) : t('mentor_schedule_export_filename')
}

onMounted(() => {
  void loadScheduleList()
})
</script>

<style scoped>
:deep(.row-unfilled) {
  background: #fef2f2;
}
</style>


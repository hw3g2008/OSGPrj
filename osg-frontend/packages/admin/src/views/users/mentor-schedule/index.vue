<template>
  <div class="osg-page">
    <PageHeader :title-zh="t('admin.users.mentorSchedule.pageTitle')" title-en="Mentor Schedule">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          {{ exporting ? t('admin.users.mentorSchedule.export.loading') : t('admin.users.mentorSchedule.export.idle') }}
        </a-button>
      </template>
    </PageHeader>

    <div v-if="unfilledCount > 0" class="unfilled-banner" role="alert">
      <span class="unfilled-banner__icon" aria-hidden="true">
        <ExclamationCircleFilled />
      </span>
      <span class="unfilled-banner__title">{{ t('admin.users.mentorSchedule.unfilled.title', { count: unfilledCount }) }}</span>
      <span class="unfilled-banner__desc">
        {{ selectedWeek === 'next' ? t('admin.users.mentorSchedule.unfilled.descNext') : t('admin.users.mentorSchedule.unfilled.descCurrent') }}
      </span>
      <button type="button" class="unfilled-banner__action" :disabled="reminding" @click="handleRemindAll">
        {{ reminding ? t('admin.users.mentorSchedule.unfilled.reminding') : t('admin.users.mentorSchedule.unfilled.remindBtn') }}
      </button>
    </div>

    <a-card :bordered="false" style="box-shadow: var(--card-shadow)">
      <template #title>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px">
          <a-radio-group v-model:value="selectedWeek" button-style="solid" @change="(e: any) => handleWeekChange(e.target.value)">
            <a-radio-button v-for="option in weekOptions" :key="option.value" :value="option.value">
              {{ option.label }} ({{ option.range }})
            </a-radio-button>
          </a-radio-group>
          <span style="font-size: 14px; font-weight: 600; color: var(--text)">
            {{ t('admin.users.mentorSchedule.header.allMentors', { count: rows.length }) }}
          </span>
        </div>
      </template>
      <a-form layout="inline" style="margin-bottom: 16px" data-field-name="导师排期管理页">
        <a-form-item>
          <a-input v-model:value="filters.keyword" :placeholder="t('admin.users.mentorSchedule.filter.keyword')" allow-clear style="width: 200px" data-field-name="搜索框" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.staffType" :placeholder="t('admin.users.mentorSchedule.filter.allTypes')" allow-clear style="width: 120px" data-field-name="类型">
            <a-select-option value="lead_mentor">{{ t('admin.users.mentorSchedule.staffTypes.lead_mentor') }}</a-select-option>
            <a-select-option value="mentor">{{ t('admin.users.mentorSchedule.staffTypes.mentor') }}</a-select-option>
            <a-select-option value="assistant">{{ t('admin.users.mentorSchedule.staffTypes.assistant') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.weekday" :placeholder="t('admin.users.mentorSchedule.filter.allDays')" allow-clear style="width: 110px" data-field-name="日期">
            <a-select-option v-for="day in weekdays" :key="day.value" :value="String(day.value)">{{ day.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.timeSlot" :placeholder="t('admin.users.mentorSchedule.filter.allSlots')" allow-clear style="width: 110px" data-field-name="时段">
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
        :locale="{ emptyText: t('admin.users.mentorSchedule.table.empty') }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'staffName'">
            <div style="display: flex; align-items: center; gap: 12px">
              <a-avatar :style="{ background: 'linear-gradient(135deg, #7399c6, #5a7ba3)', flexShrink: 0 }" :size="36">{{ getAvatarText(record.staffName) }}</a-avatar>
              <div style="display: flex; align-items: center; gap: 6px">
                <span style="font-weight: 600; color: var(--text)">{{ record.staffName }}</span>
                <span v-if="!record.filled" class="unfilled-dot" :aria-label="t('admin.users.mentorSchedule.table.unfilledAria')" />
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'staffType'">
            <a-tag :color="getTypeColor(record.staffType)">{{ formatType(record.staffType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'availableHours'">
            <strong v-if="record.filled" style="color: var(--primary)">{{ formatHours(record.availableHours) }}</strong>
            <span v-else style="color: var(--text-secondary, #9ca3af)">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'availableSlotLabels'">
            <div v-if="record.filled" style="display: flex; flex-wrap: wrap; gap: 4px">
              <a-tag v-for="label in record.availableSlotLabels" :key="label" :color="isWeekendSlot(label) ? 'green' : 'default'">{{ label }}</a-tag>
            </div>
            <a-tag v-else color="warning">
              <template #icon><ExclamationCircleOutlined /></template>
              {{ t('admin.users.mentorSchedule.table.unfilledTag') }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space v-if="record.filled">
              <a-button type="link" size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-edit`" @click="openEditModal(record)">{{ t('admin.users.mentorSchedule.table.adjust') }}</a-button>
            </a-space>
            <a-space v-else>
              <a-button type="primary" size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-fill`" @click="openEditModal(record)">{{ t('admin.users.mentorSchedule.table.fill') }}</a-button>
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
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { DownloadOutlined, ExclamationCircleFilled, ExclamationCircleOutlined, SendOutlined } from '@ant-design/icons-vue'
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
import { scheduleColumnDefs } from './columns'

const { t, tm } = useI18n()

const EXPORT_GENERIC_FAIL = 'export_generic_fail' // i18n-skip-line: error sentinel
const WEEKEND_PREFIXES_ZH = ['周六', '周日'] // i18n-skip-line: backend values

const rows = ref<StaffScheduleListItem[]>([])
const exporting = ref(false)
const reminding = ref(false)
const editVisible = ref(false)
const selectedRecord = ref<StaffScheduleListItem | null>(null)
const selectedWeek = ref<WeekScope>('current')

const weekOptions = computed<{ value: WeekScope; label: string; range: string }[]>(() => [
  { value: 'current', label: t('admin.users.mentorSchedule.weekOptions.current'), range: '03/09 - 03/15' },
  { value: 'next', label: t('admin.users.mentorSchedule.weekOptions.next'), range: '03/16 - 03/22' },
])

const weekdays = computed(() => {
  const labels = tm('admin.users.mentorSchedule.weekdays') as string[]
  return labels.map((label, i) => ({ value: i + 1, label }))
})

const timeSlots = computed<{ value: TimeSlot; label: string }[]>(() => [
  { value: 'morning', label: t('admin.users.mentorSchedule.timeSlots.morning') },
  { value: 'afternoon', label: t('admin.users.mentorSchedule.timeSlots.afternoon') },
  { value: 'evening', label: t('admin.users.mentorSchedule.timeSlots.evening') },
])

const scheduleColumns = computed(() =>
  scheduleColumnDefs.map(def => ({
    ...def,
    title: t(`admin.users.mentorSchedule.columns.${def.dataIndex}` as never),
  }))
)

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
  showTotal: (total: number) => t('admin.users.mentorSchedule.table.showTotal', { total }),
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
      message.success(t('admin.users.mentorSchedule.messages.remindSuccess', { count: result.recipientCount }))
    } else {
      message.info(t('admin.users.mentorSchedule.messages.noRemind'))
    }
  } catch (_error) {
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
      throw new Error(EXPORT_GENERIC_FAIL)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const errJson = await response.json().catch(() => null)
      const reason = errJson?.msg || t('admin.users.mentorSchedule.messages.exportAuthFail')
      throw new Error(reason)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    message.success(t('admin.users.mentorSchedule.messages.exportSuccess'))
  } catch (error) {
    const reason = error instanceof Error && error.message && error.message !== EXPORT_GENERIC_FAIL
      ? error.message
      : ''
    message.error(
      reason
        ? t('admin.users.mentorSchedule.messages.exportFailReason', { reason })
        : t('admin.users.mentorSchedule.messages.exportFail')
    )
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
    message.success(t('admin.users.mentorSchedule.messages.saveSuccess'))
    editVisible.value = false
    await loadScheduleList()
  } catch (_error) {
  }
}

const getAvatarText = (staffName: string) =>
  staffName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

const formatType = (staffType?: string) =>
  t(`admin.users.mentorSchedule.staffTypes.${staffType || 'mentor'}` as never)

const getTypeColor = (staffType?: string) => {
  if (staffType === 'lead_mentor') return 'blue'
  if (staffType === 'assistant') return 'cyan'
  return 'purple'
}

const formatHours = (value?: number) => `${value ?? 0}h`

const isWeekendSlot = (label: string) => WEEKEND_PREFIXES_ZH.some(p => label.startsWith(p))

const getExportFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return t('admin.users.mentorSchedule.filename')
  }
  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/)
  const encoded = match?.[1] || match?.[2]
  return encoded ? decodeURIComponent(encoded) : t('admin.users.mentorSchedule.filename')
}

onMounted(() => {
  void loadScheduleList()
})
</script>

<style scoped>
:deep(.row-unfilled) > td:first-child {
  box-shadow: inset 3px 0 0 0 #dc2626;
}

.unfilled-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  flex-shrink: 0;
}

.unfilled-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, #fee2e2 0%, #fef2f2 60%, #fff5f5 100%);
  border: 1px solid #fecaca;
}

.unfilled-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 10px -4px rgba(220, 38, 38, 0.5);
}

.unfilled-banner__title {
  font-size: 15px;
  font-weight: 700;
  color: #991b1b;
  letter-spacing: 0.3px;
}

.unfilled-banner__desc {
  font-size: 13px;
  color: #b91c1c;
  opacity: 0.75;
}

.unfilled-banner__action {
  margin-left: auto;
  padding: 8px 18px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(220, 38, 38, 0.18);
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  box-shadow: 0 2px 8px -2px rgba(220, 38, 38, 0.18);
  transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.unfilled-banner__action:hover:not(:disabled) {
  background: #fff5f5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgba(220, 38, 38, 0.28);
}

.unfilled-banner__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

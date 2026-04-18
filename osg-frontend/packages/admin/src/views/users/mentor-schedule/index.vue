<template>
  <div class="osg-page">
    <PageHeader title="导师排期管理" subtitle="Mentor Schedule" description="监控排期填写情况，协调导师资源">
      <template #actions>
        <a-button :loading="exporting" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          {{ exporting ? '导出中...' : '导出排期表' }}
        </a-button>
      </template>
    </PageHeader>

    <a-alert
      v-if="unfilledCount > 0"
      type="error"
      show-icon
      :message="`${unfilledCount} 位导师排期未填写`"
      :description="selectedWeek === 'next' ? '请尽快补齐下周排期' : '距离截止还有 2 天'"
    >
      <template #action>
        <a-button type="primary" danger size="small" @click="handleRemindAll">
          <template #icon><SendOutlined /></template>
          一键催促全部
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
            全部导师 ({{ rows.length }}人)
          </span>
        </div>
      </template>
      <a-form layout="inline" style="margin-bottom: 16px" data-field-name="导师排期管理页">
        <a-form-item>
          <a-input v-model:value="filters.keyword" placeholder="搜索导师姓名/ID..." allow-clear style="width: 200px" data-field-name="搜索框" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.staffType" placeholder="全部类型" allow-clear style="width: 120px" data-field-name="类型">
            <a-select-option value="lead_mentor">班主任</a-select-option>
            <a-select-option value="mentor">专业导师</a-select-option>
            <a-select-option value="assistant">助教</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.weekday" placeholder="全部日期" allow-clear style="width: 110px" data-field-name="日期">
            <a-select-option v-for="day in weekdays" :key="day.value" :value="String(day.value)">{{ day.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="filters.timeSlot" placeholder="全部时段" allow-clear style="width: 110px" data-field-name="时段">
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
        :locale="{ emptyText: '当前筛选条件下暂无排期数据' }"
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
            <a-tag v-else color="error">未填写排期</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space v-if="record.filled">
              <a-button type="link" size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-edit`" @click="openEditModal(record)">调整排期</a-button>
            </a-space>
            <a-space v-else>
              <a-button type="primary" danger size="small" data-surface-trigger="mentor-schedule-edit-modal" :data-surface-sample-key="`mentor-schedule-${record.staffId}-fill`" @click="openEditModal(record)">代填排期</a-button>
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
import PageHeader from '@/components/PageHeader.vue'

const scheduleColumns = [
  { title: '导师', dataIndex: 'staffName', key: 'staffName', width: 200 },
  { title: '类型', dataIndex: 'staffType', key: 'staffType', width: 90, align: 'center' as const },
  { title: '可用时长', dataIndex: 'availableHours', key: 'availableHours', width: 80, align: 'center' as const },
  { title: '可用时间', dataIndex: 'availableSlotLabels', key: 'availableSlotLabels' },
  { title: '操作', dataIndex: 'action', key: 'action', width: 160 },
]

const rows = ref<StaffScheduleListItem[]>([])
const exporting = ref(false)
const reminding = ref(false)
const editVisible = ref(false)
const selectedRecord = ref<StaffScheduleListItem | null>(null)
const selectedWeek = ref<WeekScope>('current')

const weekOptions: { value: WeekScope; label: string; range: string }[] = [
  { value: 'current', label: '本周', range: '03/09 - 03/15' },
  { value: 'next', label: '下周', range: '03/16 - 03/22' },
]

const weekdays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
]

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
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
  showTotal: (t: number) => `共 ${t} 条记录`,
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
      message.success(`已提醒 ${result.recipientCount} 位导师补齐排期`)
    } else {
      message.info('当前无可提醒导师')
    }
  } catch (_error) {
    message.error('催促导师失败')
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
      throw new Error('导出请求失败')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getExportFilename(response.headers.get('content-disposition'))
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    message.success('导师排期导出成功')
  } catch (_error) {
    message.error('导师排期导出失败')
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
    message.success('导师排期已保存')
    editVisible.value = false
    await loadScheduleList()
  } catch (_error) {
    message.error('导师排期保存失败')
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
    return '班主任'
  }
  return '专业导师'
}

const formatHours = (value?: number) => `${value ?? 0}h`

const isWeekendSlot = (label: string) => label.startsWith('周六') || label.startsWith('周日')

const getExportFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return '导师排期表.xlsx'
  }
  const match = contentDisposition.match(/filename\\*=UTF-8''([^;]+)|filename="?([^"]+)"?/)
  const encoded = match?.[1] || match?.[2]
  return encoded ? decodeURIComponent(encoded) : '导师排期表.xlsx'
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

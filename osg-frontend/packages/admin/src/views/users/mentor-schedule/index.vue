<template>
  <div class="mentor-schedule-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">导师排期管理</h2>
        <p class="page-subtitle">监控排期填写情况，协调导师资源</p>
      </div>
      <div class="page-header__actions">
        <button
          type="button"
          class="permission-button permission-button--primary"
          :disabled="exporting"
          @click="handleExport"
        >
          <i class="mdi mdi-download" aria-hidden="true"></i>
          <span>{{ exporting ? '导出中...' : '导出排期表' }}</span>
        </button>
      </div>
    </div>

    <div v-if="unfilledCount > 0" class="schedule-banner">
      <div class="schedule-banner__left">
        <i class="mdi mdi-alert-circle" aria-hidden="true"></i>
        <span class="schedule-banner__text">
          <strong>{{ unfilledCount }} 位导师排期未填写</strong>
          <span>{{ selectedWeek === 'next' ? '请尽快补齐下周排期' : '距离截止还有 2 天' }}</span>
        </span>
      </div>
      <button type="button" class="schedule-banner__action" @click="handleRemindAll">
        <i class="mdi mdi-email-send" aria-hidden="true"></i> 一键催促全部
      </button>
    </div>

    <div class="schedule-card">
      <div class="schedule-card__header">
        <div class="schedule-card__top-row">
          <div class="schedule-week-group">
            <button
              v-for="(option, idx) in weekOptions"
              :key="option.value"
              type="button"
              :class="[
                'schedule-week-btn',
                { 'schedule-week-btn--active': selectedWeek === option.value },
                idx === 0 ? 'schedule-week-btn--first' : 'schedule-week-btn--last'
              ]"
              @click="handleWeekChange(option.value)"
            >
              {{ option.label }} <span class="schedule-week-btn__range">({{ option.range }})</span>
            </button>
          </div>
          <div class="schedule-total-count">
            <i class="mdi mdi-account-group" aria-hidden="true"></i>
            全部导师 ({{ rows.length }}人)
          </div>
        </div>
        <div class="schedule-filters" data-field-name="导师排期管理页">
          <input v-model="filters.keyword" type="text" class="schedule-input" data-field-name="搜索框" placeholder="搜索导师姓名/ID..." />
          <select v-model="filters.staffType" class="schedule-select" data-field-name="类型">
            <option value="">全部类型</option>
            <option value="lead_mentor">班主任</option>
            <option value="mentor">专业导师</option>
            <option value="assistant">助教</option>
          </select>
          <select v-model="filters.weekday" class="schedule-select" data-field-name="日期">
            <option value="">全部日期</option>
            <option v-for="day in weekdays" :key="day.value" :value="String(day.value)">{{ day.label }}</option>
          </select>
          <select v-model="filters.timeSlot" class="schedule-select" data-field-name="时段">
            <option value="">全部时段</option>
            <option v-for="slot in timeSlots" :key="slot.value" :value="slot.value">{{ slot.label }}</option>
          </select>
        </div>
      </div>

      <div class="schedule-card__body">
        <table class="schedule-table">
          <thead>
            <tr>
              <th style="width:200px">导师</th>
              <th style="width:90px;text-align:center">类型</th>
              <th style="width:80px;text-align:center">可用时长</th>
              <th style="text-align:center">可用时间</th>
              <th style="width:100px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in visibleRows"
              :key="record.staffId"
              :class="{ 'schedule-row--unfilled': !record.filled }"
            >
              <td>
                <div class="schedule-staff-row">
                  <div class="schedule-avatar" :class="{ 'schedule-avatar--unfilled': !record.filled }">{{ getAvatarText(record.staffName) }}</div>
                  <div>
                    <div class="schedule-staff-name" :class="{ 'schedule-staff-name--unfilled': !record.filled }">{{ record.staffName }}</div>
                    <div class="schedule-staff-id" :class="{ 'schedule-staff-id--unfilled': !record.filled }">ID: {{ record.staffId }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['schedule-type-tag', `schedule-type-tag--${getTypeTone(record.staffType)}`]">
                  {{ formatType(record.staffType) }}
                </span>
              </td>
              <td>
                <strong :class="record.filled ? 'schedule-hours' : 'schedule-hours--empty'">
                  {{ record.filled ? formatHours(record.availableHours) : '-' }}
                </strong>
              </td>
              <td>
                <div v-if="record.filled" class="schedule-slots">
                  <span
                    v-for="label in record.availableSlotLabels"
                    :key="label"
                    :class="['schedule-slot', { 'schedule-slot--weekend': isWeekendSlot(label) }]"
                  >{{ label }}</span>
                </div>
                <span v-else class="schedule-slot schedule-slot--empty">
                  <i class="mdi mdi-alert-circle" aria-hidden="true"></i> 未填写排期
                </span>
              </td>
              <td>
                <div v-if="record.filled" class="schedule-action-filled">
                  <button
                    type="button"
                    class="schedule-action-link"
                    data-surface-trigger="mentor-schedule-edit-modal"
                    :data-surface-sample-key="`mentor-schedule-${record.staffId}-edit`"
                    @click="openEditModal(record)"
                  >
                    <i class="mdi mdi-pencil" aria-hidden="true"></i> 调整导师排期
                  </button>
                </div>
                <div v-else class="schedule-action-unfilled">
                  <button
                    type="button"
                    class="schedule-btn-fill"
                    data-surface-trigger="mentor-schedule-edit-modal"
                    :data-surface-sample-key="`mentor-schedule-${record.staffId}-fill`"
                    @click="openEditModal(record)"
                  >
                    <i class="mdi mdi-pencil" aria-hidden="true"></i> 代填导师排期
                  </button>
                  <button type="button" class="schedule-btn-remind" @click="handleRemindAll">
                    <i class="mdi mdi-email-fast" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleRows.length">
              <td colspan="5" class="schedule-empty">当前筛选条件下暂无排期数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="schedule-card__footer">
        <button type="button" class="schedule-view-all">
          查看全部 {{ rows.length }} 位导师 <i class="mdi mdi-chevron-down" aria-hidden="true"></i>
        </button>
      </div>
    </div>

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
  staffType: '',
  weekday: '',
  timeSlot: '',
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

const getTypeTone = (staffType?: string) => (staffType === 'lead_mentor' ? 'lead' : 'mentor')

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

<style scoped lang="scss">
.mentor-schedule-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Page header
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.page-subtitle {
  margin: 6px 0 0;
  color: var(--text2);
  font-size: 14px;
}

.page-header__actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.permission-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.permission-button--primary {
  background: linear-gradient(135deg, #6366F1, #8b5cf6);
  color: #fff;
}

// Banner
.schedule-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
}

.schedule-banner__left {
  display: flex;
  align-items: center;
  gap: 12px;

  > i { font-size: 24px; color: #dc2626; }
}

.schedule-banner__text {
  display: flex;
  align-items: baseline;
  gap: 8px;

  strong { color: #991b1b; font-size: 14px; }
  span { color: #b91c1c; font-size: 13px; }
}

.schedule-banner__action {
  border: 0;
  border-radius: 6px;
  padding: 8px 16px;
  background: #dc2626;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

// Card
.schedule-card {
  border-radius: 16px;
  border: 1px solid var(--border, #e2e8f0);
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.schedule-card__header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.schedule-card__top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// Week switch - connected button group
.schedule-week-group {
  display: inline-flex;
}

.schedule-week-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d1d5db;
  padding: 10px 22px;
  background: #f5f5f5;
  color: var(--muted, #6b7280);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.schedule-week-btn--first { border-radius: 8px 0 0 8px; }
.schedule-week-btn--last { border-radius: 0 8px 8px 0; border-left: 0; }

.schedule-week-btn--active {
  background: var(--primary, #6366f1);
  border-color: var(--primary, #6366f1);
  color: #fff;
}

.schedule-week-btn__range {
  font-size: 11px;
  opacity: 0.8;
}

.schedule-total-count {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;

  i { color: var(--primary, #6366f1); font-size: 18px; }
}

// Filters
.schedule-filters {
  display: flex;
  align-items: center;
  gap: 14px;
}

.schedule-input,
.schedule-select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 14px;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  min-height: 38px;
}

.schedule-input { width: 200px; }
.schedule-select { width: 110px; }

// Table
.schedule-card__body {
  overflow-x: auto;
}

.schedule-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 13px;

  th, td {
    padding: 18px 20px;
    text-align: left;
    border-bottom: 1px solid var(--border, #e2e8f0);
    vertical-align: middle;
    white-space: nowrap;
  }

  // Center columns: 类型(2), 可用时长(3), 可用时间(4)
  th:nth-child(2), td:nth-child(2),
  th:nth-child(3), td:nth-child(3),
  th:nth-child(4), td:nth-child(4) {
    text-align: center;
  }

  // Allow time slots column to wrap
  td:nth-child(4) {
    white-space: normal;
  }

  thead th {
    background: #f8fafc;
    color: var(--text2, #6b7280);
    font-size: 12px;
    font-weight: 600;
    padding: 14px 20px;
    white-space: nowrap;
  }

  tbody tr:not(.schedule-row--unfilled):hover {
    background: #f9fafb;
  }
}

.schedule-row--unfilled {
  background: #fef2f2;
}

// Staff cell
.schedule-staff-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.schedule-avatar--unfilled { background: #dc2626; }

.schedule-staff-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.schedule-staff-name--unfilled { color: #991b1b; }

.schedule-staff-id {
  font-size: 11px;
  color: var(--muted, #6b7280);
}

.schedule-staff-id--unfilled { color: #b91c1c; }

// Type tag
.schedule-type-tag {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.schedule-type-tag--lead { background: #dbeafe; color: #1d4ed8; }
.schedule-type-tag--mentor { background: #ede9fe; color: #6d28d9; }

// Hours
.schedule-hours { color: var(--primary, #6366f1); font-size: 14px; font-weight: 600; }
.schedule-hours--empty { color: #dc2626; font-size: 14px; font-weight: 600; }

// Slots
.schedule-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.schedule-slot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #e8f0f8;
  font-size: 11px;
  color: var(--text);
}

.schedule-slot--weekend { background: #dcfce7; }

.schedule-slot--empty {
  background: #fee2e2;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
}

// Actions
.schedule-action-filled {
  display: flex;
}

.schedule-action-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--primary, #6366f1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.schedule-action-unfilled {
  display: flex;
  gap: 4px;
}

.schedule-btn-fill {
  border: 0;
  border-radius: 6px;
  padding: 6px 12px;
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.schedule-btn-remind {
  border: 1px solid #dc2626;
  border-radius: 6px;
  padding: 6px 10px;
  background: #fff;
  color: #dc2626;
  font-size: 14px;
  cursor: pointer;
}

// Footer
.schedule-card__footer {
  padding: 12px;
  text-align: center;
  border-top: 1px solid var(--border, #e2e8f0);
}

.schedule-view-all {
  border: 0;
  background: transparent;
  color: var(--text2, #6b7280);
  font-size: 13px;
  cursor: pointer;

  &:hover { color: var(--primary, #6366f1); }
}

.schedule-empty {
  padding: 28px 0;
  color: var(--text2);
  text-align: center;
}

@media (max-width: 720px) {
  .schedule-banner { flex-direction: column; align-items: stretch; }
  .schedule-card__top-row { flex-direction: column; align-items: stretch; gap: 12px; }
  .schedule-filters { flex-wrap: wrap; }
  .schedule-input, .schedule-select { width: 100%; }
}
</style>

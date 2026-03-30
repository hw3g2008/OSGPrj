<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="mentor-schedule-edit-modal"
    width="800px"
    @cancel="handleClose"
  >
    <template #title>
      <span class="esm-header-title">
        <i class="mdi mdi-calendar-edit" aria-hidden="true"></i>
        {{ modalTitle }}
      </span>
    </template>

    <!-- Staff info card -->
    <div class="esm-staff-card">
      <div class="esm-staff-card__avatar">{{ avatarText }}</div>
      <div class="esm-staff-card__info">
        <div class="esm-staff-card__name">{{ record?.staffName || '待选择导师' }}</div>
        <div class="esm-staff-card__meta">ID: {{ record?.staffId }} · {{ record?.staffType === 'lead_mentor' ? '班主任' : '专业导师' }} · {{ record?.majorDirection || '-' }}</div>
      </div>
      <div class="esm-staff-card__hours">
        <div class="esm-staff-card__hours-label">{{ weekLabel }}可用时长</div>
        <div class="esm-staff-card__hours-value">{{ formState.availableHours }}h</div>
      </div>
    </div>

    <!-- Week switch -->
    <div class="esm-week-switch">
      <button
        type="button"
        :class="['esm-week-btn', { 'esm-week-btn--active': localWeek === 'current' }]"
        @click="localWeek = 'current'"
      >
        本周 {{ weekRanges.current }}
      </button>
      <button
        type="button"
        :class="['esm-week-btn', { 'esm-week-btn--active': localWeek === 'next' }]"
        @click="localWeek = 'next'"
      >
        下周 {{ weekRanges.next }}
      </button>
    </div>

    <!-- Hours input -->
    <div class="esm-section" data-field-name="调整导师排期弹窗可上课时长">
      <label class="esm-label">
        <i class="mdi mdi-clock-outline" aria-hidden="true"></i>
        可上课时长 <span class="esm-required">*</span>
      </label>
      <div class="esm-hours-row">
        <input
          v-model.number="formState.availableHours"
          type="number"
          min="0"
          max="40"
          class="esm-hours-input"
        />
        <span class="esm-hours-unit">小时</span>
        <div class="esm-quick-btns">
          <button
            v-for="value in quickHours"
            :key="value"
            type="button"
            class="esm-quick-btn"
            @click="formState.availableHours = value"
          >
            {{ value }}h
          </button>
        </div>
      </div>
    </div>

    <!-- Day grid -->
    <div class="esm-section" data-field-name="调整导师排期弹窗每天可上课时间">
      <label class="esm-label">
        <i class="mdi mdi-calendar-check" aria-hidden="true"></i>
        每天可上课时间 <span class="esm-required">*</span>
        <span class="esm-hint">（可多选）</span>
      </label>
      <div class="esm-day-grid">
        <fieldset
          v-for="day in weekdays"
          :key="day.value"
          :class="['esm-day', { 'esm-day--weekend': day.weekend, 'esm-day--holiday': day.holiday }]"
          :data-field-name="`${day.label}可用时段`"
        >
          <legend class="esm-day__legend">{{ day.label }}可用时段</legend>
          <div :class="['esm-day__label', { 'esm-day__label--weekend': day.weekend, 'esm-day__label--holiday': day.holiday }]">{{ day.label }}</div>
          <div :class="['esm-day__date', { 'esm-day__date--weekend': day.weekend, 'esm-day__date--holiday': day.holiday }]">{{ day.date }}</div>
          <div class="esm-day__slots">
            <label
              v-for="slot in timeSlots"
              :key="`${day.value}-${slot.value}`"
              class="esm-slot"
            >
              <input
                :checked="isChecked(day.value, slot.value)"
                type="checkbox"
                @change="toggleSlot(day.value, slot.value)"
              />
              <span>{{ slot.label }}</span>
            </label>
          </div>
        </fieldset>
      </div>
      <div class="esm-day-hint">
        <i class="mdi mdi-information-outline" aria-hidden="true"></i>
        绿色=周末，红色=节假日
      </div>
    </div>

    <!-- Reason -->
    <div class="esm-section">
      <label class="esm-label">
        <i class="mdi mdi-note-text" aria-hidden="true"></i>
        调整原因 <span class="esm-required">*</span>
      </label>
      <textarea
        v-model.trim="formState.reason"
        rows="2"
        class="esm-textarea"
        placeholder="请填写调整原因，将同步通知给导师"
      />
      <div v-if="errorMessage" class="esm-error">{{ errorMessage }}</div>
    </div>

    <!-- Notify -->
    <fieldset class="esm-notify-card" data-field-name="同步通知导师复选框">
      <label class="esm-notify-label">
        <input v-model="formState.notifyStaff" type="checkbox" class="esm-notify-checkbox" />
        <span><strong>同步通知导师</strong> - 调整后将发送邮件和站内消息通知该导师</span>
      </label>
    </fieldset>

    <template #footer>
      <button
        type="button"
        class="permission-button permission-button--outline"
        data-surface-part="cancel-control"
        @click="handleClose"
      >
        取消
      </button>
      <button
        type="button"
        class="permission-button permission-button--primary esm-save-btn"
        data-surface-part="confirm-control"
        @click="handleSubmit"
      >
        <i class="mdi mdi-check" aria-hidden="true"></i> 保存并通知
      </button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { StaffScheduleListItem, TimeSlot, WeekScope } from '@osg/shared/api/admin/schedule'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  record?: StaffScheduleListItem | null
  weekScope: WeekScope
}>(), {
  record: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: {
    staffId: number
    week: WeekScope
    availableHours: number
    reason: string
    notifyStaff: boolean
    selectedSlotKeys: string[]
  }]
}>()

const quickHours = [5, 10, 15, 20]
const errorMessage = ref('')

const weekRanges = { current: '03/09 - 03/15', next: '03/16 - 03/22' }
const localWeek = ref<WeekScope>(props.weekScope)

const currentWeekDates = ['03/10', '03/11', '03/12', '03/13', '03/14', '03/15', '03/16']
const nextWeekDates = ['03/17', '03/18', '03/19', '03/20', '03/21', '03/22', '03/23']
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const weekdays = computed(() => {
  const dates = localWeek.value === 'next' ? nextWeekDates : currentWeekDates
  return dates.map((date, i) => ({
    value: i + 1,
    label: dayLabels[i],
    date,
    weekend: i >= 5,
    holiday: false,
  }))
})

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
]

const formState = reactive({
  availableHours: 0,
  reason: '',
  notifyStaff: true,
  selectedSlotKeys: [] as string[],
})

const avatarText = computed(() => {
  const name = props.record?.staffName?.trim()
  if (!name) {
    return 'MS'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
})

const weekLabel = computed(() => (localWeek.value === 'next' ? '下周排期' : '本周排期'))

const modalTitle = computed(() => (props.record?.filled ? '调整导师排期' : '代填导师排期'))

const resetForm = () => {
  localWeek.value = props.weekScope
  formState.availableHours = Number(props.record?.availableHours ?? 0)
  formState.reason = ''
  formState.notifyStaff = true
  formState.selectedSlotKeys = [...(props.record?.selectedSlotKeys ?? [])]
  errorMessage.value = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

const slotKey = (weekday: number, timeSlot: TimeSlot) => `${weekday}-${timeSlot}`

const isChecked = (weekday: number, timeSlot: TimeSlot) =>
  formState.selectedSlotKeys.includes(slotKey(weekday, timeSlot))

const toggleSlot = (weekday: number, timeSlot: TimeSlot) => {
  const key = slotKey(weekday, timeSlot)
  const nextKeys = new Set(formState.selectedSlotKeys)
  if (nextKeys.has(key)) {
    nextKeys.delete(key)
  } else {
    nextKeys.add(key)
  }
  formState.selectedSlotKeys = Array.from(nextKeys)
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  if (!props.record?.staffId) {
    errorMessage.value = '未找到导师信息，暂时无法保存。'
    return
  }
  if (!formState.reason) {
    errorMessage.value = '请填写调整原因。'
    return
  }
  errorMessage.value = ''
  emit('submit', {
    staffId: props.record.staffId,
    week: localWeek.value,
    availableHours: Number(formState.availableHours) || 0,
    reason: formState.reason,
    notifyStaff: formState.notifyStaff,
    selectedSlotKeys: [...formState.selectedSlotKeys],
  })
}
</script>

<style scoped lang="scss">
// Header
:global([data-surface-id="mentor-schedule-edit-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, var(--primary, #6366F1), #4338CA) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="mentor-schedule-edit-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  &:hover { background: rgba(255, 255, 255, 0.35) !important; }
}

.esm-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;

  i { font-size: 22px; }
}

// Staff info card
.esm-staff-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 20px;
}

.esm-staff-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7399c6, #5a7ba3);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}

.esm-staff-card__info { flex: 1; }
.esm-staff-card__name { font-weight: 700; font-size: 16px; color: var(--text); }
.esm-staff-card__meta { font-size: 13px; color: var(--muted, #6b7280); margin-top: 4px; }

.esm-staff-card__hours { text-align: right; }
.esm-staff-card__hours-label { font-size: 13px; color: var(--muted, #6b7280); }
.esm-staff-card__hours-value { font-size: 24px; font-weight: 700; color: var(--primary, #6366f1); }

// Week switch
.esm-week-switch {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.esm-week-btn {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.esm-week-btn--active {
  background: var(--primary, #6366f1);
  border-color: var(--primary, #6366f1);
  color: #fff;
}

// Sections
.esm-section { margin-bottom: 24px; }

.esm-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;

  i { color: var(--primary, #6366f1); }
}

.esm-required { color: #dc2626; }
.esm-hint { font-weight: 400; font-size: 12px; color: var(--muted, #6b7280); }

// Hours input
.esm-hours-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.esm-hours-input {
  width: 120px;
  border: 2px solid var(--primary, #6366f1);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  color: var(--text);
}

.esm-hours-unit { color: var(--muted, #6b7280); font-size: 15px; }

.esm-quick-btns {
  display: flex;
  gap: 8px;
  margin-left: 24px;
}

.esm-quick-btn {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 14px;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;

  &:hover { background: #f3f4f6; }
}

// Day grid
.esm-day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.esm-day {
  text-align: center;
  padding: 12px 6px;
  background: #f8fafc;
  border-radius: 10px;
  border: 2px solid var(--border, #e2e8f0);
}

.esm-day--weekend {
  background: #dcfce7;
  border-color: #22c55e;
}

.esm-day--holiday {
  background: #fee2e2;
  border-color: #dc2626;
}

.esm-day__label { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
.esm-day__label--weekend { color: #166534; }
.esm-day__label--holiday { color: #dc2626; }

.esm-day__date { font-size: 10px; color: var(--muted, #6b7280); margin-bottom: 8px; }
.esm-day__date--weekend { color: #166534; }
.esm-day__date--holiday { color: #dc2626; }

.esm-day__slots {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.esm-slot {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  cursor: pointer;

  input { width: 14px; height: 14px; }
}

.esm-day-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted, #6b7280);

  i { margin-right: 4px; }
}

// Reason
.esm-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
}

.esm-error { margin-top: 8px; color: #dc2626; font-size: 13px; }

// Notify card
.esm-notify-card {
  padding: 16px;
  background: #eef2ff;
  border-radius: 10px;
  margin-bottom: 16px;
}

.esm-notify-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
}

.esm-notify-checkbox { width: 18px; height: 18px; }

// Footer buttons
.permission-button {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.permission-button--outline {
  background: #fff;
  border: 1px solid #d1d5db;
  color: var(--text);
}

.permission-button--primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}

.esm-save-btn { padding: 12px 32px; }

@media (max-width: 960px) {
  .esm-day-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 640px) {
  .esm-day-grid { grid-template-columns: repeat(2, 1fr); }
  .esm-staff-card { flex-direction: column; text-align: center; }
  .esm-staff-card__hours { text-align: center; }
  .esm-week-switch { flex-direction: column; }
  .esm-hours-row { flex-wrap: wrap; }
  .esm-quick-btns { margin-left: 0; }
}
</style>

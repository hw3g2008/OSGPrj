<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="mentor-schedule-edit-modal"
    variant="accent"
    width="820px"
    @cancel="handleClose"
  >
    <template #title>
      <span class="esm-title">
        <span class="esm-title__icon mdi mdi-calendar-edit" aria-hidden="true"></span>
        <span class="esm-title__text">{{ modalTitle }}</span>
      </span>
    </template>

    <!-- Staff info card -->
    <section class="esm-staff-card">
      <div class="esm-staff-card__avatar">
        <span class="esm-staff-card__avatar-ring" aria-hidden="true"></span>
        <span class="esm-staff-card__avatar-text">{{ avatarText }}</span>
      </div>
      <div class="esm-staff-card__info">
        <div class="esm-staff-card__name">{{ record?.staffName || '待选择导师' }}</div>
        <div class="esm-staff-card__meta">
          <span class="esm-staff-card__meta-chip">ID {{ record?.staffId }}</span>
          <span class="esm-staff-card__meta-dot" aria-hidden="true"></span>
          <span>{{ formatStaffType(record?.staffType) }}</span>
          <span class="esm-staff-card__meta-dot" aria-hidden="true"></span>
          <span>{{ record?.majorDirection || '—' }}</span>
        </div>
      </div>
      <div class="esm-staff-card__hours">
        <div class="esm-staff-card__hours-label">{{ weekLabel }}可用时长</div>
        <div class="esm-staff-card__hours-value">
          <span class="esm-staff-card__hours-num">{{ formState.availableHours }}</span>
          <span class="esm-staff-card__hours-unit">h</span>
        </div>
      </div>
    </section>

    <!-- Week switch -->
    <div
      class="esm-week-switch"
      role="tablist"
      :data-active="localWeek"
    >
      <span class="esm-week-switch__indicator" aria-hidden="true"></span>
      <button
        type="button"
        role="tab"
        :aria-selected="localWeek === 'current'"
        :class="['esm-week-switch__tab', { 'esm-week-switch__tab--active': localWeek === 'current' }]"
        @click="localWeek = 'current'"
      >
        <span class="esm-week-switch__label">本周</span>
        <span class="esm-week-switch__range">{{ weekRanges.current }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="localWeek === 'next'"
        :class="['esm-week-switch__tab', { 'esm-week-switch__tab--active': localWeek === 'next' }]"
        @click="localWeek = 'next'"
      >
        <span class="esm-week-switch__label">下周</span>
        <span class="esm-week-switch__range">{{ weekRanges.next }}</span>
      </button>
    </div>

    <!-- Hours input -->
    <section class="esm-section" data-field-name="调整导师排期弹窗可上课时长">
      <header class="esm-section__head">
        <span class="esm-section__icon mdi mdi-clock-outline" aria-hidden="true"></span>
        <span class="esm-section__title">可上课时长</span>
        <span class="esm-required" aria-hidden="true">*</span>
      </header>
      <div class="esm-hours">
        <div class="esm-hours__field">
          <a-input-number
            v-model:value="formState.availableHours"
            :min="0"
            :max="40"
            :controls="false"
            class="esm-hours__input"
          />
          <span class="esm-hours__unit">小时 / 周</span>
        </div>
        <div class="esm-hours__quick" role="group" aria-label="快捷选择">
          <button
            v-for="value in quickHours"
            :key="value"
            type="button"
            :class="['esm-chip', { 'esm-chip--active': formState.availableHours === value }]"
            @click="formState.availableHours = value"
          >
            {{ value }}h
          </button>
        </div>
      </div>
    </section>

    <!-- Day grid -->
    <section class="esm-section" data-field-name="调整导师排期弹窗每天可上课时间">
      <header class="esm-section__head">
        <span class="esm-section__icon mdi mdi-calendar-check" aria-hidden="true"></span>
        <span class="esm-section__title">每天可上课时间</span>
        <span class="esm-required" aria-hidden="true">*</span>
        <span class="esm-section__hint">可多选</span>
      </header>
      <div class="esm-day-list">
        <fieldset
          v-for="day in weekdays"
          :key="day.value"
          :class="['esm-day-row', { 'esm-day-row--weekend': day.weekend }]"
          :data-field-name="`${day.label}可用时段`"
        >
          <legend class="sr-only">{{ day.label }}可用时段</legend>
          <div class="esm-day-row__lead">
            <span class="esm-day-row__rail" aria-hidden="true"></span>
            <span class="esm-day-row__date">{{ day.dayNum }}</span>
            <span class="esm-day-row__meta">
              <span class="esm-day-row__weekday">{{ day.label }}</span>
              <span class="esm-day-row__month">{{ day.monthLabel }}</span>
            </span>
            <span
              v-if="day.weekend"
              class="esm-day-row__tag esm-day-row__tag--weekend"
            >
              周末
            </span>
          </div>
          <div class="esm-day-row__slots">
            <label
              v-for="slot in timeSlots"
              :key="`${day.value}-${slot.value}`"
              :class="['esm-slot-pill', { 'esm-slot-pill--checked': isChecked(day.value, slot.value) }]"
            >
              <a-checkbox
                class="esm-slot-pill__cb"
                :checked="isChecked(day.value, slot.value)"
                @change="toggleSlot(day.value, slot.value)"
              >
                <span class="esm-slot-pill__icon mdi" :class="slot.icon" aria-hidden="true"></span>
                <span class="esm-slot-pill__label">{{ slot.label }}</span>
              </a-checkbox>
            </label>
          </div>
        </fieldset>
      </div>
      <div class="esm-day-hint">
        <span class="esm-day-hint__legend">
          <span class="esm-day-hint__swatch esm-day-hint__swatch--weekend"></span>
          周末
        </span>
      </div>
    </section>

    <!-- Reason -->
    <section class="esm-section">
      <header class="esm-section__head">
        <span class="esm-section__icon mdi mdi-note-text" aria-hidden="true"></span>
        <span class="esm-section__title">调整原因</span>
        <span class="esm-required" aria-hidden="true">*</span>
      </header>
      <a-textarea
        v-model:value="formState.reason"
        :rows="3"
        class="esm-reason"
        placeholder="请填写调整原因，将同步通知给导师"
      />
      <div v-if="errorMessage" class="esm-error" role="alert">
        <span class="mdi mdi-alert-circle-outline" aria-hidden="true"></span>
        {{ errorMessage }}
      </div>
    </section>

    <!-- Notify -->
    <fieldset class="esm-notify-card" data-field-name="同步通知导师复选框">
      <legend class="sr-only">同步通知导师</legend>
      <span class="esm-notify-card__icon mdi mdi-bell-ring-outline" aria-hidden="true"></span>
      <label class="esm-notify-label">
        <a-checkbox v-model:checked="formState.notifyStaff">
          <span class="esm-notify-label__title">同步通知导师</span>
          <span class="esm-notify-label__desc">调整后将发送邮件和站内消息通知该导师</span>
        </a-checkbox>
      </label>
    </fieldset>

    <template #footer>
      <a-button data-surface-part="cancel-control" class="esm-footer-btn" @click="handleClose">取消</a-button>
      <a-button type="primary" data-surface-part="confirm-control" class="esm-footer-btn esm-footer-btn--primary" @click="handleSubmit">
        <span class="mdi mdi-check" aria-hidden="true"></span>
        保存并通知
      </a-button>
    </template>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { StaffScheduleListItem, TimeSlot, WeekScope } from '@osg/shared/api/admin/schedule'
import { OverlaySurfaceModal } from '@osg/shared/components'

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

const formatStaffType = (staffType?: string) => {
  if (staffType === 'lead_mentor') return '班主任'
  if (staffType === 'assistant') return '助教'
  return '导师'
}

const weekRanges = { current: '03/09 - 03/15', next: '03/16 - 03/22' }
const localWeek = ref<WeekScope>(props.weekScope)

const currentWeekDates = ['03/10', '03/11', '03/12', '03/13', '03/14', '03/15', '03/16']
const nextWeekDates = ['03/17', '03/18', '03/19', '03/20', '03/21', '03/22', '03/23']
const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const weekdays = computed(() => {
  const dates = localWeek.value === 'next' ? nextWeekDates : currentWeekDates
  return dates.map((date, i) => {
    const [month, day] = date.split('/')
    return {
      value: i + 1,
      label: dayLabels[i],
      date,
      dayNum: day,
      monthLabel: `${Number(month)}月`,
      weekend: i >= 5,
    }
  })
})

const timeSlots: { value: TimeSlot; label: string; icon: string }[] = [
  { value: 'morning', label: '上午', icon: 'mdi-weather-sunset-up' },
  { value: 'afternoon', label: '下午', icon: 'mdi-white-balance-sunny' },
  { value: 'evening', label: '晚上', icon: 'mdi-weather-night' },
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
// Architectural Schedule — Indigo primary theme
$indigo-900: #1e1b4b;
$indigo-700: #4338ca;
$indigo-600: #4f46e5;
$indigo-500: #6366f1;
$indigo-400: #818cf8;
$indigo-300: #a5b4fc;
$indigo-200: #c7d2fe;
$indigo-100: #e0e7ff;
$indigo-50:  #eef2ff;
$ink-900: #0f172a;
$ink-800: #1e293b;
$slate-700: #334155;
$slate-600: #475569;
$slate-500: #64748b;
$slate-400: #94a3b8;
$slate-300: #cbd5e1;
$slate-200: #e2e8f0;
$slate-100: #f1f5f9;
$slate-50:  #f8fafc;
$amber-500: #f59e0b;
$rose-500: #f43f5e;
$rose-100: #ffe4e6;

// ── Surface ─────────────────────────────────────────────
:global([data-surface-id="mentor-schedule-edit-modal"] [data-surface-part="header"]) {
  background:
    radial-gradient(120% 200% at 0% 0%, rgba(165, 180, 252, 0.28) 0%, transparent 55%),
    radial-gradient(120% 220% at 100% 100%, rgba(139, 92, 246, 0.18) 0%, transparent 60%),
    linear-gradient(135deg, $indigo-700 0%, $indigo-600 55%, $indigo-500 100%) !important;
  border-bottom: none !important;
  padding-block: 18px !important;
}

:global([data-surface-id="mentor-schedule-edit-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #fff !important;
  &:hover { background: rgba(255, 255, 255, 0.32) !important; }
}

:global([data-surface-id="mentor-schedule-edit-modal"] [data-surface-part="body"]) {
  background: #fbfcfd;
  padding: 22px 26px 6px !important;
}

:global([data-surface-id="mentor-schedule-edit-modal"] [data-surface-part="footer"]) {
  background: #fbfcfd;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding: 14px 26px !important;
  gap: 10px;
}

// ── Title ───────────────────────────────────────────────
.esm-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  letter-spacing: 0.6px;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: linear-gradient(135deg, $indigo-400, $indigo-500);
    color: #fff;
    font-size: 14px;
    box-shadow: 0 4px 10px -4px rgba(79, 70, 229, 0.5);
  }

  &__text {
    color: #fff !important;
    font-size: 16px;
    font-weight: 600;
  }
}

// ── Staff card ──────────────────────────────────────────
.esm-staff-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  margin-bottom: 18px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid $slate-200;

  &__avatar {
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  &__avatar-ring {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: linear-gradient(135deg, $indigo-300, $indigo-600 58%, $indigo-500);
  }

  &__avatar-text {
    position: absolute;
    inset: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, $indigo-700 0%, $indigo-600 55%, $indigo-500 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: $slate-700;
    letter-spacing: 0.2px;
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 12.5px;
    color: $slate-500;
  }

  &__meta-chip {
    padding: 2px 8px;
    border-radius: 6px;
    background: $slate-100;
    color: $slate-700;
    font-weight: 600;
    font-size: 11.5px;
    letter-spacing: 0.4px;
  }

  &__meta-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: $slate-300;
  }

  &__hours {
    text-align: right;
    padding-left: 14px;
    border-left: 1px solid $slate-200;
  }

  &__hours-label {
    font-size: 11.5px;
    color: $slate-500;
    letter-spacing: 0.4px;
  }

  &__hours-value {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    margin-top: 4px;
  }

  &__hours-num {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    color: $slate-700;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }

  &__hours-unit {
    font-size: 13px;
    font-weight: 700;
    color: $indigo-500;
  }
}

// ── Week segmented control ──────────────────────────────
.esm-week-switch {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: 22px;
  border-radius: 10px;
  background: $slate-100;
  border: 1px solid $slate-200;

  &__indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc(50% - 4px);
    border-radius: 8px;
    background: linear-gradient(135deg, $indigo-700 0%, $indigo-600 55%, $indigo-500 100%);
    box-shadow: 0 4px 12px -6px rgba(79, 70, 229, 0.5);
    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &[data-active="next"] .esm-week-switch__indicator {
    transform: translateX(100%);
  }

  &__tab {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: $slate-500;
    transition: color 0.2s ease;

    &:hover { color: $slate-700; }

    &--active {
      color: #fff;
      &:hover { color: #fff; }
    }
  }

  &__label {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.4px;
  }

  &__range {
    font-size: 12px;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }

  &__tab--active &__range { opacity: 0.85; }
}

// ── Section ─────────────────────────────────────────────
.esm-section {
  margin-bottom: 20px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: $indigo-50;
    color: $indigo-500;
    font-size: 13px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $slate-700;
    letter-spacing: 0.3px;
  }

  &__hint {
    margin-left: 4px;
    padding: 1px 8px;
    border-radius: 999px;
    background: $slate-100;
    font-size: 11px;
    font-weight: 500;
    color: $slate-500;
  }
}

.esm-required {
  color: $rose-500;
  font-weight: 700;
  margin-left: 2px;
}

// ── Hours card ──────────────────────────────────────────
.esm-hours {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid $slate-200;

  &__field {
    display: inline-flex;
    align-items: baseline;
    gap: 12px;
    padding-right: 16px;
    border-right: 1px solid $slate-200;
  }

  :deep(.esm-hours__input) {
    width: 96px;

    .ant-input-number-input {
      height: 40px;
      padding: 0 10px;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      color: $slate-700;
      font-feature-settings: "tnum";
      font-variant-numeric: tabular-nums;
    }

    &.ant-input-number {
      border-radius: 8px;
      border-color: $slate-200;
      background: $slate-50;
      box-shadow: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    &.ant-input-number:hover {
      border-color: $indigo-300;
      background: #fff;
    }

    &.ant-input-number.ant-input-number-focused {
      border-color: $indigo-400;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
  }

  &__unit {
    font-size: 13px;
    color: $slate-500;
    letter-spacing: 0.3px;
  }

  &__quick {
    display: inline-flex;
    gap: 8px;
    margin-left: auto;
  }
}

.esm-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 7px 14px;
  border-radius: 8px;
  background: $slate-50;
  border: 1px solid $slate-200;
  font-size: 13px;
  font-weight: 600;
  color: $slate-700;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;

  &:hover {
    transform: translateY(-1px);
    border-color: $indigo-300;
    color: $indigo-600;
    background: #fff;
  }

  &--active {
    background: linear-gradient(135deg, $indigo-700 0%, $indigo-600 55%, $indigo-500 100%);
    border-color: $indigo-500;
    color: #fff;

    &:hover { color: #fff; background: linear-gradient(135deg, $indigo-700 0%, $indigo-600 55%, $indigo-500 100%); }
  }
}

// ── Day list (row layout) ───────────────────────────────
.esm-day-list {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid $slate-200;
  background: #fff;
  overflow: hidden;
}

.esm-day-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: none;
  border-top: 1px solid $slate-100;
  background: #fff;
  transition: background 0.2s ease;
  min-width: 0;

  &:first-child { border-top: none; }
  &:hover { background: $slate-50; }

  &--weekend { background: linear-gradient(90deg, $indigo-50 0%, transparent 40%); }
  &--weekend:hover { background: linear-gradient(90deg, $indigo-50 0%, $slate-50 60%); }

  &__lead {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-left: 12px;
    min-width: 0;
  }

  &__rail {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 28px;
    border-radius: 2px;
    background: $slate-300;
  }

  &--weekend &__rail { background: $indigo-400; }

  &__date {
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    color: $slate-700;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    min-width: 32px;
  }

  &--weekend &__date { color: $indigo-600; }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__weekday {
    font-size: 13px;
    font-weight: 600;
    color: $slate-600;
    letter-spacing: 0.4px;
  }

  &__month {
    font-size: 11px;
    color: $slate-500;
    letter-spacing: 0.5px;
  }

  &__tag {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;

    &--weekend {
      background: $indigo-100;
      color: $indigo-600;
    }
  }

  &__slots {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
}

.esm-slot-pill {
  display: block;
  border-radius: 10px;
  border: 1px solid $slate-200;
  background: $slate-50;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: $indigo-300;
    background: #fff;
  }

  &--checked {
    border-color: $indigo-400;
    background: $indigo-50;
  }

  :deep(.ant-checkbox-wrapper) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    color: $slate-700;
    white-space: nowrap;
  }

  &--checked :deep(.ant-checkbox-wrapper) {
    color: $indigo-600;
    font-weight: 700;
  }

  :deep(.ant-checkbox) {
    flex-shrink: 0;
  }

  :deep(.ant-checkbox-checked .ant-checkbox-inner) {
    background-color: $indigo-400;
    border-color: $indigo-400;
  }

  :deep(.ant-checkbox:hover .ant-checkbox-inner),
  :deep(.ant-checkbox-input:focus + .ant-checkbox-inner) {
    border-color: $indigo-400;
  }

  &__icon {
    font-size: 14px;
    color: $slate-400;
    flex-shrink: 0;
  }

  &--checked &__icon {
    color: $indigo-500;
  }

  &__label {
    font-size: 13px;
    letter-spacing: 0.5px;
  }
}

.esm-day-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: $slate-500;

  &__legend {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;

    &--weekend { background: $indigo-400; }
  }
}

// ── Reason ──────────────────────────────────────────────
:deep(.esm-reason.ant-input) {
  border-radius: 10px;
  border-color: $slate-200;
  background: #fff;
  font-size: 13.5px;
  resize: vertical;
  padding: 12px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover { border-color: $indigo-300; }
  &:focus,
  &.ant-input-focused {
    border-color: $indigo-400;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
}

.esm-error {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: $rose-100;
  color: #be123c;
  font-size: 12.5px;
  font-weight: 600;
}

// ── Notify ──────────────────────────────────────────────
.esm-notify-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 4px 0 8px;
  border-radius: 10px;
  border: 1px solid $slate-200;
  background: #fff;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: $indigo-50;
    color: $indigo-500;
    font-size: 16px;
    flex-shrink: 0;
  }
}

.esm-notify-label {
  cursor: pointer;
  flex: 1;

  :deep(.ant-checkbox-wrapper) {
    display: inline-flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
  }

  :deep(.ant-checkbox-checked .ant-checkbox-inner) {
    background-color: $indigo-400;
    border-color: $indigo-400;
  }

  &__title {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: $slate-700;
  }

  &__desc {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: $slate-500;
    line-height: 1.5;
  }
}

// ── Footer buttons ──────────────────────────────────────
:deep(.esm-footer-btn) {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.esm-footer-btn--primary.ant-btn-primary) {
  background: var(--primary-gradient, linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%));
  border: none;
  box-shadow: 0 6px 14px -6px rgba(79, 70, 229, 0.5);

  &:hover,
  &:focus {
    background: linear-gradient(135deg, #4338CA 0%, #7C3AED 100%);
    box-shadow: 0 8px 18px -6px rgba(79, 70, 229, 0.65);
  }

  .mdi { color: #fff; }
}

// ── Utilities ───────────────────────────────────────────
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// ── Responsive ──────────────────────────────────────────
@media (max-width: 720px) {
  .esm-staff-card {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "avatar info"
      "hours  hours";
    gap: 12px;
  }
  .esm-staff-card__avatar { grid-area: avatar; }
  .esm-staff-card__info   { grid-area: info; }
  .esm-staff-card__hours  {
    grid-area: hours;
    text-align: left;
    padding-left: 0;
    padding-top: 10px;
    border-left: none;
    border-top: 1px solid $slate-200;
  }

  .esm-day-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .esm-day-row__slots {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .esm-hours { flex-direction: column; align-items: stretch; }
  .esm-hours__field {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid $slate-200;
    padding-bottom: 12px;
    justify-content: center;
  }
  .esm-hours__quick { margin-left: 0; flex-wrap: wrap; justify-content: center; }
}
</style>

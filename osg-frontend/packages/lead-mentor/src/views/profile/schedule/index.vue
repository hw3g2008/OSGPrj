<template>
  <div id="page-schedule" class="page-schedule" data-page="profile-schedule">
    <PageHeader
      :title-zh="$t('my_schedule')"
      title-en="My Schedule"
      :description="$t('set_your_availability_update_next_weeks_')"
    />

    <section class="schedule-banner" :aria-label="$t('schedule_reminder')">
      <div class="schedule-banner__icon">
        <i class="mdi mdi-calendar-alert" aria-hidden="true" />
      </div>
      <div class="schedule-banner__content">
        <div class="schedule-banner__title">
          <i class="mdi mdi-alert" aria-hidden="true" />
          {{ $t('please_update_next_weeks_schedule_before') }}
        </div>
        <div class="schedule-banner__sub">{{ bannerDetail }}</div>
      </div>
      <span class="schedule-banner__tag">{{ $t('update_based_on_actual_status') }}</span>
    </section>

    <section class="card">
      <div class="card-body">
        <div class="status-shell">
          <div class="mentor-summary">
            <div class="user-avatar">{{ mentorInitial }}</div>
            <div>
              <div class="mentor-name">{{ displayName }}</div>
              <div class="mentor-meta">当前登录班主任 · ID: {{ userIdLabel }}</div>
            </div>
          </div>
          <div class="status-metrics">
            <div class="status-metric">
              <div class="status-metric__value status-metric__value--hours">{{ currentWeekHoursLabel }}</div>
              <div class="status-metric__label">{{ $t('available_this_week') }}</div>
            </div>
            <div class="status-metric">
              <div class="status-metric__value status-metric__value--days">{{ currentWeekAvailableDaysLabel }}</div>
              <div class="status-metric__label">{{ $t('available_days') }}</div>
            </div>
            <div class="status-metric">
              <div class="status-metric__value status-metric__value--pending">{{ scheduleStatusLabel }}</div>
              <div class="status-metric__label">{{ $t('schedule_status') }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <span class="card-title">
          <i class="mdi mdi-calendar-week" aria-hidden="true" />
          {{ $t('this_week_schedule') }}
        </span>
        <span class="card-tag">{{ $t('read_only_view') }}</span>
        <span class="card-range">{{ currentWeekRange }}</span>
      </div>
      <div class="card-body">
        <div class="schedule-stats">
          <div class="schedule-stat">
            <div class="schedule-stat__value">{{ currentWeekHoursLabel }}</div>
            <div class="schedule-stat__label">{{ $t('available_hours') }}</div>
          </div>
          <div class="schedule-stat">
            <div class="schedule-stat__value schedule-stat__value--success">{{ currentWeekAvailableDaysLabel }}</div>
            <div class="schedule-stat__label">{{ $t('available_days') }}</div>
          </div>
        </div>

        <div class="readonly-block">
          <label class="form-label">
            <i class="mdi mdi-calendar-check" aria-hidden="true" />
            {{ $t('set_availability') }}
            <span class="form-label-note">({{ $t('read_only') }})</span>
          </label>
          <div class="readonly-grid">
            <article
              v-for="day in currentWeekDays"
              :key="day.key"
              class="readonly-day"
              :class="[`readonly-day--${day.accent}`]"
            >
              <div class="readonly-day__label">{{ day.label }}</div>
              <div class="readonly-day__date">{{ day.date }}</div>
              <div class="readonly-day__value">{{ currentWeekDayValue(day.key) }}</div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-header card-header--warning">
        <span class="card-title card-title--warning">
          <i class="mdi mdi-calendar-arrow-right" aria-hidden="true" />
          {{ $t('next_week_schedule') }}
        </span>
        <span class="card-range card-range--warning">
          {{ nextWeekRange }}
          <span class="card-tag card-tag--warning">{{ nextWeekStatusLabel }}</span>
        </span>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label form-label--large">
            <i class="mdi mdi-clock-outline" aria-hidden="true" />
            {{ $t('available_teaching_hours_next_week') }}
            <span class="required-mark">*</span>
          </label>
          <div class="hours-row">
            <input
              id="lead-next-weekly-hours"
              v-model="weeklyHours"
              type="number"
              min="0"
              max="40"
              class="form-input form-input--hours"
              placeholder="?"
            />
            <span class="hours-unit">{{ $t('hours') }}</span>
            <div class="hours-quick-actions">
              <button
                v-for="option in quickHourOptions"
                :key="option"
                type="button"
                class="btn btn-outline btn-sm"
                @click="setWeeklyHours(option)"
              >
                {{ option }}h
              </button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label form-label--large">
            <i class="mdi mdi-calendar-check" aria-hidden="true" />
            {{ $t('daily_available_time') }}
            <span class="required-mark">*</span>
            <span class="form-label-note">（{{ $t('multiple_selections_possible') }}）</span>
          </label>
          <div class="editable-grid">
            <article
              v-for="day in nextWeekDays"
              :key="day.key"
              class="editable-day"
              :class="[`editable-day--${day.accent}`]"
            >
              <div class="editable-day__label">{{ day.label }}</div>
              <div class="editable-day__date">{{ day.date }}</div>
              <div class="slot-list">
                <label v-for="slot in timeSlots" :key="slot.id" class="slot-option">
                  <input
                    v-model="nextWeekSelections[day.key]"
                    type="checkbox"
                    :value="slot.id"
                  />
                  <span>{{ slot.label }}</span>
                </label>
              </div>
            </article>
          </div>
          <div class="editable-note">
            <i class="mdi mdi-information-outline" aria-hidden="true" />
            {{ $t('green_background_indicates_weekends_red_') }}。
          </div>
        </div>

        <div class="form-group">
          <label class="form-label form-label--large">
            <i class="mdi mdi-note-text" aria-hidden="true" />
            {{ $t('notes_optional') }}）
          </label>
          <textarea
            v-model="note"
            class="form-textarea"
            rows="2"
            :placeholder="$t('note_any_special_circumstances_here_e_g_')"
          />
        </div>

        <div class="form-footer">
          <button type="button" class="btn btn-primary btn-primary--warning" @click="saveNextSchedule()">
            <i class="mdi mdi-check" aria-hidden="true" />
            {{ $t('save_next_weeks_schedule') }}
          </button>
          <button type="button" class="btn btn-outline" @click="resetDraft">{{ $t('reset') }}</button>
          <div class="form-footer__warning">
            <i class="mdi mdi-alert" aria-hidden="true" />
            {{ $t('please_complete_before_sunday') }}
          </div>
        </div>
      </div>
    </section>

    <LeadForceScheduleModal
      :model-value="isForceScheduleModalOpen"
      :week-range="nextWeekRange"
      :days="nextWeekDays"
      :draft="forceScheduleDraft"
      @update:model-value="handleForceScheduleModalModelValue"
      @submit-request="applyForceScheduleDraft"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getLeadMentorSchedule,
  getLeadMentorScheduleStatus,
  saveLeadMentorNextSchedule,
  type LeadMentorScheduleStatusView,
  type LeadMentorScheduleView,
} from '@osg/shared/api'
import { getUser } from '@osg/shared/utils'
import type { UserInfo } from '@osg/shared/types'
import LeadForceScheduleModal, {
  type ForceScheduleDayOption,
  type ForceScheduleDraft,
} from '@/components/LeadForceScheduleModal.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

interface WeekDayCard {
  key: string
  label: string
  date: string
  accent: 'weekday' | 'weekend' | 'holiday'
}

interface TimeSlotOption {
  id: string
  label: string
}

const WEEKDAY_LABELS = [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday'), t('sunday')]
const quickHourOptions = [5, 10, 15, 20]
const timeSlots: TimeSlotOption[] = [
  { id: 'morning', label: '上午 9-12' },
  { id: 'afternoon', label: '下午 14-18' },
  { id: 'evening', label: '晚上 19-22' },
]

const route = useRoute()
const router = useRouter()
const userInfo = computed(() => getUser<UserInfo>())
const currentSchedule = ref<LeadMentorScheduleView | null>(null)
const nextSchedule = ref<LeadMentorScheduleView | null>(null)
const statusView = ref<LeadMentorScheduleStatusView | null>(null)
const weeklyHours = ref('')
const note = ref('')
const isForceScheduleModalOpen = ref(false)
const forceScheduleDismissed = ref(false)

function formatMonthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function createWeek(offsetDays: number) {
  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = monday.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(monday.getDate() + diffToMonday + offsetDays)

  const days: WeekDayCard[] = []
  for (let index = 0; index < 7; index += 1) {
    const current = new Date(monday)
    current.setDate(monday.getDate() + index)
    days.push({
      key: String(index + 1),
      label: WEEKDAY_LABELS[index],
      date: formatMonthDay(current),
      accent: index === 2 ? 'holiday' : index >= 5 ? 'weekend' : 'weekday',
    })
  }
  return days
}

function buildWeekRange(days: WeekDayCard[], suffix: string) {
  return `${days[0]?.date ?? '--/--'} - ${days[6]?.date ?? '--/--'} (${suffix})`
}

const currentWeekDays: ForceScheduleDayOption[] = createWeek(0)
const nextWeekDays: ForceScheduleDayOption[] = createWeek(7)
const nextWeekSelections = reactive<Record<string, string[]>>(
  Object.fromEntries(nextWeekDays.map((day) => [day.key, []])),
)

const displayName = computed(() => {
  return userInfo.value?.nickName?.trim() || userInfo.value?.userName?.trim() || t('currently_logged_in_mentor')
})

const mentorInitial = computed(() => {
  const name = displayName.value.trim()
  return name.slice(0, 1).toUpperCase() || 'L'
})

const userIdLabel = computed(() => {
  return String(userInfo.value?.userId ?? '--')
})

const localCurrentWeekRange = buildWeekRange(currentWeekDays, t('this_week'))
const localNextWeekRange = buildWeekRange(nextWeekDays, t('next_week'))
const bannerDetail = computed(() => {
  return statusView.value?.bannerDetail || t('incomplete_schedule_will_prevent_session')
})
const currentWeekHoursLabel = computed(() => formatHours(currentSchedule.value?.availableHours))
const currentWeekAvailableDaysLabel = computed(() => formatCount(currentSchedule.value?.availableDayCount))
const scheduleStatusLabel = computed(() => statusView.value?.scheduleStatus || t('pending_sync'))
const currentWeekRange = computed(() => {
  return currentSchedule.value?.weekRange ? `${currentSchedule.value.weekRange} (本周)` : localCurrentWeekRange
})
const nextWeekRange = computed(() => {
  return nextSchedule.value?.weekRange ? `${nextSchedule.value.weekRange} (下周)` : localNextWeekRange
})
const nextWeekStatusLabel = computed(() => (statusView.value?.nextWeekFilled ? '已提交' : t('pending_submission')))
const forceScheduleDraft = computed<ForceScheduleDraft>(() => ({
  weeklyHours: weeklyHours.value,
  dailySlots: Object.fromEntries(
    nextWeekDays.map((day) => [day.key, nextWeekSelections[day.key]?.[0] ?? '']),
  ),
}))

function setWeeklyHours(option: number) {
  weeklyHours.value = String(option)
}

function formatHours(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--h'
  }
  return `${value}h`
}

function formatCount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }
  return String(value)
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return fallback
}

function applyNextScheduleDraft(scheduleView: LeadMentorScheduleView | null) {
  weeklyHours.value = scheduleView?.availableHours && scheduleView.availableHours > 0
    ? String(scheduleView.availableHours)
    : ''
  note.value = scheduleView?.note || ''

  nextWeekDays.forEach((day) => {
    const backendDay = scheduleView?.days.find((entry) => String(entry.weekday) === day.key)
    nextWeekSelections[day.key] = [...(backendDay?.selectedSlots ?? [])]
  })
}

function resetDraft() {
  applyNextScheduleDraft(nextSchedule.value)
}

function currentWeekDayValue(dayKey: string) {
  const backendDay = currentSchedule.value?.days.find((day) => String(day.weekday) === dayKey)
  if (!backendDay) {
    return t('pending_sync')
  }
  return backendDay.selectedSlotLabels.length > 0 ? backendDay.selectedSlotLabels.join(' / ') : t('not_filled')
}

function closeForceScheduleModal() {
  isForceScheduleModalOpen.value = false
  forceScheduleDismissed.value = true

  if (route.query.forceScheduleModal === '1') {
    const nextQuery = { ...route.query }
    delete nextQuery.forceScheduleModal
    void router.replace({ path: route.path, query: nextQuery })
  }
}

function handleForceScheduleModalModelValue(nextValue: boolean) {
  if (nextValue) {
    isForceScheduleModalOpen.value = true
    return
  }

  closeForceScheduleModal()
}

function applyForceScheduleDraft(draft: ForceScheduleDraft) {
  weeklyHours.value = draft.weeklyHours
  nextWeekDays.forEach((day) => {
    const nextValue = draft.dailySlots[day.key] ?? ''
    nextWeekSelections[day.key] = nextValue ? [nextValue] : []
  })
  closeForceScheduleModal()
}

function collectSelectedSlotKeys() {
  return nextWeekDays.flatMap((day) =>
    (nextWeekSelections[day.key] ?? []).map((slotId) => `${day.key}-${slotId}`),
  )
}

async function loadScheduleViews(preserveDraft = false) {
  try {
    const [currentView, nextView, nextStatus] = await Promise.all([
      getLeadMentorSchedule('current'),
      getLeadMentorSchedule('next'),
      getLeadMentorScheduleStatus(),
    ])

    currentSchedule.value = currentView
    nextSchedule.value = nextView
    statusView.value = nextStatus
    if (!preserveDraft) {
      applyNextScheduleDraft(nextView)
    }
    if (!nextStatus.forceScheduleModal) {
      forceScheduleDismissed.value = false
    }
  } catch (error) {
    message.error(extractErrorMessage(error, t('schedule_load_failed')))
  }
}

async function saveNextSchedule() {
  try {
    await saveLeadMentorNextSchedule({
      availableHours: Number(weeklyHours.value),
      selectedSlotKeys: collectSelectedSlotKeys(),
      note: note.value.trim(),
    })
    await loadScheduleViews()
    message.success(t('next_weeks_schedule_has_been_saved'))
  } catch (error) {
    message.error(extractErrorMessage(error, t('failed_to_save_schedule')))
  }
}

watch(
  [() => route.query.forceScheduleModal, statusView, forceScheduleDismissed],
  ([forceScheduleModal, nextStatus, dismissed]) => {
    const shouldAutoOpen = !!nextStatus?.forceScheduleModal && !dismissed
    isForceScheduleModalOpen.value = forceScheduleModal === '1' || shouldAutoOpen
  },
  { immediate: true, deep: true },
)

// Route-param auto-open keeps the overdue modal reproducible for tests and real-browser review.
void loadScheduleViews()
</script>

<style scoped>
.page-schedule {
  color: #1e293b;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.page-title-en {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.page-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--muted);
}

.schedule-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

.schedule-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #d97706;
}

.schedule-banner__content {
  flex: 1;
}

.schedule-banner__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 600;
  color: #92400e;
}

.schedule-banner__sub {
  font-size: 13px;
  color: #b45309;
}

.schedule-banner__tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.card {
  margin-bottom: 20px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px;
  background: linear-gradient(135deg, #e8f0f8, #dbeafe);
  border-radius: 16px 16px 0 0;
}

.card-header--warning {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

.card-body {
  padding: 22px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.card-title--warning {
  color: #92400e;
}

.card-tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.card-tag--warning {
  margin-left: 8px;
  background: #dc2626;
  color: #fff;
}

.card-range {
  margin-left: auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
}

.card-range--warning {
  color: #92400e;
}

.status-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.mentor-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.mentor-name {
  font-weight: 600;
  color: #0f172a;
}

.mentor-meta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.status-metrics {
  display: flex;
  gap: 24px;
  text-align: center;
}

.status-metric__value {
  font-size: 24px;
  font-weight: 700;
}

.status-metric__value--hours {
  color: #22c55e;
}

.status-metric__value--days {
  color: #3b82f6;
}

.status-metric__value--pending {
  color: #d97706;
}

.status-metric__label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.schedule-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 10px;
  background: #f8fafc;
}

.schedule-stat {
  flex: 1;
  text-align: center;
}

.schedule-stat:first-child {
  border-right: 1px solid var(--border);
}

.schedule-stat__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
}

.schedule-stat__value--success {
  color: #22c55e;
}

.schedule-stat__label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.readonly-block {
  margin-bottom: 4px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text2);
}

.form-label--large {
  font-size: 15px;
}

.form-label i {
  margin-right: 6px;
}

.form-label-note {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}

.required-mark {
  color: var(--danger);
}

.readonly-grid,
.editable-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.editable-grid {
  gap: 12px;
}

.readonly-day,
.editable-day {
  text-align: center;
  border-radius: 12px;
}

.readonly-day {
  padding: 12px 6px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
}

.readonly-day--holiday {
  border-color: #dc2626;
  background: #fee2e2;
}

.readonly-day--weekend {
  border-color: #22c55e;
  background: #dcfce7;
}

.editable-day {
  padding: 16px 8px;
  border: 2px dashed #d97706;
  background: #fef3c7;
}

.editable-day--holiday {
  border-color: #dc2626;
  background: #fee2e2;
}

.editable-day--weekend {
  border-color: #22c55e;
  background: #dcfce7;
}

.readonly-day__label,
.editable-day__label {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.readonly-day__date,
.editable-day__date {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--muted);
}

.readonly-day--holiday .readonly-day__label,
.readonly-day--holiday .readonly-day__date,
.editable-day--holiday .editable-day__label,
.editable-day--holiday .editable-day__date {
  color: #dc2626;
}

.readonly-day--weekend .readonly-day__label,
.readonly-day--weekend .readonly-day__date,
.editable-day--weekend .editable-day__label,
.editable-day--weekend .editable-day__date {
  color: #166534;
}

.readonly-day__value {
  font-size: 11px;
  color: #64748b;
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.slot-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  cursor: pointer;
}

.hours-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-input {
  width: 120px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.form-input--hours {
  border-width: 2px;
  border-color: #d97706;
}

.hours-unit {
  font-size: 15px;
  color: var(--muted);
}

.hours-quick-actions {
  display: flex;
  gap: 8px;
  margin-left: 24px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-sm {
  padding: 8px 14px;
}

.btn-outline {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text2);
}

.btn-primary {
  color: #fff;
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-primary--warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.editable-note {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--muted);
}

.form-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  resize: vertical;
  font-size: 14px;
  color: #0f172a;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.form-footer__warning {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--danger);
}

@media (max-width: 1280px) {
  .readonly-grid,
  .editable-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .status-shell,
  .hours-row,
  .form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .status-metrics,
  .hours-quick-actions {
    margin-left: 0;
    justify-content: space-between;
  }

  .card-range {
    margin-left: 0;
  }
}

@media (max-width: 720px) {
  .readonly-grid,
  .editable-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .schedule-banner,
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

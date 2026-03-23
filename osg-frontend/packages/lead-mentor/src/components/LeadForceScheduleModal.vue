<template>
  <div
    v-if="modelValue"
    class="lead-force-schedule-modal modal"
    data-surface-id="modal-lead-force-schedule"
  >
    <button
      type="button"
      class="lead-force-schedule-backdrop"
      data-surface-part="backdrop"
      aria-label="关闭强制填写排期弹层"
      @click="closeModal"
    />

    <div
      class="lead-force-schedule-shell modal-content"
      data-surface-part="shell"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="lead-force-schedule-header modal-header" data-surface-part="header">
        <div>
          <span :id="titleId" class="lead-force-schedule-title modal-title">
            <i class="mdi mdi-calendar-alert" aria-hidden="true" />
            强制填写排期
          </span>
          <div class="lead-force-schedule-alert">
            <i class="mdi mdi-alert" aria-hidden="true" />
            当前尚未提交下周排期，请立即补全可用时间
          </div>
        </div>
      </div>

      <div class="lead-force-schedule-body modal-body" data-surface-part="body">
        <div class="lead-force-schedule-range">
          <span class="lead-force-schedule-range__label">填写周期</span>
          <strong>{{ weekRange }}</strong>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="mdi mdi-clock-outline" aria-hidden="true" />
            下周可上课时长 <span class="required-mark">*</span>
          </label>
          <div class="force-hours-row">
            <input
              v-model="formState.weeklyHours"
              type="number"
              min="0"
              max="40"
              class="form-input"
              placeholder="10"
            />
            <span class="force-hours-unit">小时</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">每天可上课时间 <span class="required-mark">*</span></label>
          <div class="force-day-grid">
            <article
              v-for="day in days"
              :key="day.key"
              class="force-day-card"
              :class="[`force-day-card--${day.accent}`]"
            >
              <div class="force-day-card__head">
                <span class="force-day-card__label">{{ day.label }}</span>
                <span class="force-day-card__date">{{ day.date }}</span>
              </div>
              <select v-model="formState.dailySlots[day.key]" class="form-select">
                <option value="">请选择</option>
                <option
                  v-for="slot in SLOT_OPTIONS"
                  :key="`${day.key}-${slot.id}`"
                  :value="slot.id"
                >
                  {{ slot.label }}
                </option>
              </select>
            </article>
          </div>
        </div>
      </div>

      <div class="lead-force-schedule-footer modal-footer">
        <button type="button" class="btn btn-primary" @click="submitDraft">
          <i class="mdi mdi-check" aria-hidden="true" />
          确认提交排期
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

export interface ForceScheduleDayOption {
  key: string
  label: string
  date: string
  accent: 'weekday' | 'weekend' | 'holiday'
}

export interface ForceScheduleDraft {
  weeklyHours: string
  dailySlots: Record<string, string>
}

interface SlotOption {
  id: string
  label: string
}

const SLOT_OPTIONS: SlotOption[] = [
  { id: 'morning', label: '上午 9-12' },
  { id: 'afternoon', label: '下午 14-18' },
  { id: 'evening', label: '晚上 19-22' },
]

const props = defineProps<{
  modelValue: boolean
  weekRange: string
  days: ForceScheduleDayOption[]
  draft: ForceScheduleDraft
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submit-request': [payload: ForceScheduleDraft]
}>()

const formState = reactive<ForceScheduleDraft>({
  weeklyHours: '',
  dailySlots: {},
})

const syncDraft = (draft: ForceScheduleDraft) => {
  formState.weeklyHours = draft.weeklyHours ?? ''
  const nextDailySlots: Record<string, string> = {}
  props.days.forEach((day) => {
    nextDailySlots[day.key] = draft.dailySlots?.[day.key] ?? ''
  })
  formState.dailySlots = nextDailySlots
}

watch(
  () => props.draft,
  (draft) => {
    syncDraft(draft)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (modelValue) => {
    if (modelValue) {
      syncDraft(props.draft)
    }
  },
)

const titleId = 'lead-force-schedule-title'

const closeModal = () => {
  emit('update:modelValue', false)
}

const submitDraft = () => {
  const nextDailySlots: Record<string, string> = {}
  props.days.forEach((day) => {
    nextDailySlots[day.key] = (formState.dailySlots[day.key] || '').trim()
  })

  emit('submit-request', {
    weeklyHours: formState.weeklyHours.trim(),
    dailySlots: nextDailySlots,
  })
}
</script>

<style scoped>
.lead-force-schedule-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lead-force-schedule-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.5);
}

.lead-force-schedule-shell {
  position: relative;
  z-index: 1;
  width: min(90%, 700px);
  max-height: 90vh;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.lead-force-schedule-header {
  padding: 22px 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border-radius: 16px 16px 0 0;
}

.lead-force-schedule-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.lead-force-schedule-alert {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.94);
}

.lead-force-schedule-body {
  padding: 26px;
}

.lead-force-schedule-range {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff7ed;
  color: #9a3412;
}

.lead-force-schedule-range__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #c2410c;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text2);
}

.form-label .mdi {
  margin-right: 4px;
}

.force-hours-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-input {
  width: 100px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  background: #fff;
  color: #0f172a;
}

.force-hours-unit {
  font-size: 13px;
  color: var(--muted);
}

.force-day-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.force-day-card {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.force-day-card--weekend {
  background: #ecfdf5;
}

.force-day-card--holiday {
  background: #fef2f2;
}

.force-day-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.force-day-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.force-day-card__date {
  font-size: 12px;
  color: var(--muted);
}

.form-select {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 11px;
  background:
    #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")
    no-repeat
    right 12px center;
  appearance: none;
}

.lead-force-schedule-footer {
  padding: 18px 26px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
}

.btn {
  width: 100%;
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.btn-primary {
  width: 100%;
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.required-mark {
  color: #dc2626;
}

@media (max-width: 768px) {
  .lead-force-schedule-shell {
    width: min(94%, 700px);
  }

  .force-day-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <OverlaySurfaceModal
    :open="visible"
    surface-id="mentor-schedule-edit-modal"
    width="980px"
    :body-class="'edit-schedule-modal__body'"
    @cancel="handleClose"
  >
    <template #title>
      <div class="edit-schedule-modal__title-wrap">
        <div class="edit-schedule-modal__avatar">
          {{ avatarText }}
        </div>
        <div>
          <span class="edit-schedule-modal__eyebrow">Mentor Schedule</span>
          <div class="edit-schedule-modal__title">{{ modalTitle }}</div>
          <p class="edit-schedule-modal__subtitle">
            {{ record?.staffName || '待选择导师' }} · {{ weekLabel }} · {{ record?.majorDirection || '待补充方向' }}
          </p>
        </div>
      </div>
    </template>

    <div class="edit-schedule-modal__hero">
      <strong>按 7 天 × 3 时段维护导师排期</strong>
      <p>保存时会把本周或下周的排期矩阵一次性提交，并记录本次调整原因。</p>
    </div>

    <section class="edit-schedule-modal__section edit-schedule-modal__section--meta">
      <div class="edit-schedule-modal__meta-card">
        <span>当前状态</span>
        <strong>{{ record?.filled ? '已填写，可继续调整' : '未填写，建议优先代填' }}</strong>
      </div>
      <div class="edit-schedule-modal__meta-card">
        <span>可用时长</span>
        <div class="edit-schedule-modal__hours-row">
          <input
            v-model.number="formState.availableHours"
            type="number"
            min="0"
            step="0.5"
            class="edit-schedule-modal__hours-input"
          />
          <span>小时</span>
        </div>
        <div class="edit-schedule-modal__quick-actions">
          <button
            v-for="value in quickHours"
            :key="value"
            type="button"
            class="edit-schedule-modal__chip"
            @click="formState.availableHours = value"
          >
            {{ value }}h
          </button>
        </div>
      </div>
      <label class="edit-schedule-modal__meta-card edit-schedule-modal__meta-card--checkbox">
        <input v-model="formState.notifyStaff" type="checkbox" />
        <span>保存后同步通知导师</span>
      </label>
    </section>

    <section class="edit-schedule-modal__section">
      <header class="edit-schedule-modal__section-header">
        <strong>每天可上课时间</strong>
        <span>周末以绿色强调，直接勾选可用时段即可。</span>
      </header>
      <div class="edit-schedule-modal__grid">
        <article
          v-for="day in weekdays"
          :key="day.value"
          :class="['edit-schedule-modal__day-card', { 'edit-schedule-modal__day-card--weekend': day.weekend }]"
        >
          <header>
            <strong>{{ day.label }}</strong>
            <span>{{ day.hint }}</span>
          </header>
          <div class="edit-schedule-modal__slot-list">
            <label
              v-for="slot in timeSlots"
              :key="`${day.value}-${slot.value}`"
              class="edit-schedule-modal__slot"
            >
              <input
                :checked="isChecked(day.value, slot.value)"
                type="checkbox"
                @change="toggleSlot(day.value, slot.value)"
              />
              <span>{{ slot.label }}</span>
            </label>
          </div>
        </article>
      </div>
    </section>

    <section class="edit-schedule-modal__section">
      <header class="edit-schedule-modal__section-header">
        <strong>调整原因</strong>
        <span>不填写原因将无法提交。</span>
      </header>
      <textarea
        v-model.trim="formState.reason"
        rows="4"
        class="edit-schedule-modal__textarea"
        placeholder="例如：导师请假后重新协调时段，已与学员沟通完成。"
      />
      <div v-if="errorMessage" class="edit-schedule-modal__error">
        {{ errorMessage }}
      </div>
    </section>

    <template #footer>
      <button type="button" class="permission-button permission-button--outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="permission-button permission-button--primary" @click="handleSubmit">
        保存并通知
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

const weekdays = [
  { value: 1, label: '周一', hint: 'Mon', weekend: false },
  { value: 2, label: '周二', hint: 'Tue', weekend: false },
  { value: 3, label: '周三', hint: 'Wed', weekend: false },
  { value: 4, label: '周四', hint: 'Thu', weekend: false },
  { value: 5, label: '周五', hint: 'Fri', weekend: false },
  { value: 6, label: '周六', hint: 'Sat', weekend: true },
  { value: 7, label: '周日', hint: 'Sun', weekend: true },
]

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

const weekLabel = computed(() => (props.weekScope === 'next' ? '下周排期' : '本周排期'))

const modalTitle = computed(() => (props.record?.filled ? '调整导师排期' : '代填导师排期'))

const resetForm = () => {
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
    week: props.weekScope,
    availableHours: Number(formState.availableHours) || 0,
    reason: formState.reason,
    notifyStaff: formState.notifyStaff,
    selectedSlotKeys: [...formState.selectedSlotKeys],
  })
}
</script>

<style scoped lang="scss">
/* ── Header override (gradient) ── */
:global([data-surface-id="mentor-schedule-edit-modal"] [data-surface-part="header"]) {
  background: linear-gradient(135deg, #6366F1, #4338CA) !important;
  border-bottom: none !important;
  border-radius: 16px 16px 0 0;
}

:global([data-surface-id="mentor-schedule-edit-modal"] .overlay-surface-modal__close) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;

  &:hover {
    background: rgba(255, 255, 255, 0.35) !important;
  }
}

.edit-schedule-modal__title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-schedule-modal__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.edit-schedule-modal__eyebrow {
  display: inline-flex;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.edit-schedule-modal__title {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.edit-schedule-modal__subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 13px;
}

.edit-schedule-modal__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background: #f8fafc;
}

.edit-schedule-modal__hero {
  border-radius: 18px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.16) 0%, rgba(51, 65, 85, 0.08) 100%);
  color: #334155;
}

.edit-schedule-modal__hero strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  font-size: 16px;
}

.edit-schedule-modal__hero p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.edit-schedule-modal__section {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 20px;
  background: #fff;
}

.edit-schedule-modal__section--meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.edit-schedule-modal__meta-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 16px;
  padding: 16px;
  background: #f8fafc;
}

.edit-schedule-modal__meta-card span {
  color: #64748b;
  font-size: 12px;
}

.edit-schedule-modal__meta-card strong {
  color: #0f172a;
  font-size: 15px;
}

.edit-schedule-modal__meta-card--checkbox {
  justify-content: center;
  gap: 12px;
}

.edit-schedule-modal__meta-card--checkbox input {
  width: 18px;
  height: 18px;
}

.edit-schedule-modal__hours-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
}

.edit-schedule-modal__hours-input {
  width: 120px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.edit-schedule-modal__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-schedule-modal__chip {
  border: 0;
  border-radius: 999px;
  padding: 6px 12px;
  background: #e2e8f0;
  color: #334155;
  cursor: pointer;
}

.edit-schedule-modal__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.edit-schedule-modal__section-header strong {
  color: #0f172a;
  font-size: 15px;
}

.edit-schedule-modal__section-header span {
  color: #64748b;
  font-size: 12px;
}

.edit-schedule-modal__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.edit-schedule-modal__day-card {
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 14px;
  background: #f8fbff;
}

.edit-schedule-modal__day-card--weekend {
  border-color: #86efac;
  background: #f0fdf4;
}

.edit-schedule-modal__day-card header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.edit-schedule-modal__day-card strong {
  color: #0f172a;
}

.edit-schedule-modal__day-card span {
  color: #64748b;
  font-size: 12px;
}

.edit-schedule-modal__slot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-schedule-modal__slot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 13px;
}

.edit-schedule-modal__textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  resize: vertical;
  min-height: 120px;
}

.edit-schedule-modal__error {
  margin-top: 10px;
  color: #dc2626;
  font-size: 13px;
}

@media (max-width: 960px) {
  .edit-schedule-modal__section--meta,
  .edit-schedule-modal__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .edit-schedule-modal__section--meta,
  .edit-schedule-modal__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

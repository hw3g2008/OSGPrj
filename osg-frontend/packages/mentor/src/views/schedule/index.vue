<template>
  <div id="page-schedule">
    <div class="page-header">
      <div>
        <h1 class="page-title">我的排期 <span class="page-title-en">My Schedule</span></h1>
        <p class="page-sub">设置您的可用时间，每周日前需更新下周排期</p>
      </div>
    </div>

    <div v-if="showReminder" class="warning-banner">
      <i class="mdi mdi-alert-circle warning-icon" />
      <div class="warning-copy">
        <div class="warning-title"><i class="mdi mdi-alert" /> 您本周未填写排期，无法被安排课程！</div>
        <div class="warning-desc">请立即填写本周排期，否则将影响您的课时收入</div>
      </div>
      <button class="btn btn-danger" type="button" @click="focusCurrentWeek">
        <i class="mdi mdi-calendar-edit" /> 立即填写
      </button>
    </div>

    <div class="status-card" :class="{ 'border-danger': !hasFilledCurrentWeek, 'border-success': hasFilledCurrentWeek }">
      <div class="status-user">
        <div class="user-avatar">{{ userInitials }}</div>
        <div>
          <div class="status-name">{{ userName }}</div>
          <div class="text-muted text-sm">ID: {{ userId || '-' }} · 导师</div>
        </div>
      </div>
      <div class="status-stats">
        <div>
          <div class="stat-big" :style="{ color: hasFilledCurrentWeek ? '#22C55E' : '#DC2626' }">{{ currentWeekHours }}h</div>
          <div class="text-muted text-sm">本周可用</div>
        </div>
        <div>
          <div class="stat-big" :style="{ color: hasFilledCurrentWeek ? '#22C55E' : '#DC2626' }">{{ currentWeekAvailableDays }}</div>
          <div class="text-muted text-sm">可用天数</div>
        </div>
        <div>
          <div class="stat-big" :style="{ color: hasFilledCurrentWeek ? '#22C55E' : '#DC2626' }">{{ hasFilledCurrentWeek ? '✓' : '✗' }}</div>
          <div class="text-muted text-sm">{{ hasFilledCurrentWeek ? '已填写' : '未填写' }}</div>
        </div>
      </div>
    </div>

    <div ref="currentWeekCardRef" class="card" id="this-week-unfilled">
      <div class="card-header current-header">
        <div>
          <span class="card-title"><i class="mdi mdi-calendar-week card-title-icon current" />本周排期</span>
          <span class="tag danger" :class="{ success: hasFilledCurrentWeek }">{{ hasFilledCurrentWeek ? '已填写' : '未填写' }}</span>
        </div>
        <span class="week-range">{{ currentWeekRangeLabel }} (本周)</span>
      </div>
      <div class="card-body">
        <div v-if="!hasFilledCurrentWeek" class="empty-state">
          <i class="mdi mdi-calendar-remove empty-icon" />
          <h3>您本周还未填写排期</h3>
          <p>未填写排期将无法被安排课程，请立即填写</p>
        </div>

        <div class="form-group">
          <label class="form-label">本周可上课时长 <span class="req">*</span></label>
          <div class="hours-row">
            <input
              id="mentor-this-weekly-hours"
              ref="currentHoursInputRef"
              type="number"
              class="form-input week-hours"
              min="0"
              max="40"
              placeholder="?"
              :value="currentWeek.totalHours"
              @input="syncCurrentHours"
            >
            <span class="text-muted">小时</span>
            <div class="hour-shortcuts">
              <button class="btn btn-outline btn-sm" type="button" @click="setCurrentHours(5)">5h</button>
              <button class="btn btn-outline btn-sm" type="button" @click="setCurrentHours(10)">10h</button>
              <button class="btn btn-outline btn-sm" type="button" @click="setCurrentHours(20)">20h</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">本周每天可上课时间 <span class="req">*</span></label>
          <div class="schedule-grid">
            <div v-for="day in currentDays" :key="day.key" class="day-card" :class="{ weekend: day.weekend }">
              <div class="day-name">{{ day.label }}</div>
              <div class="day-date">{{ day.dateLabel }}</div>
              <label v-for="slot in timeSlots" :key="slot.key" class="slot-option">
                <input v-model="currentWeek.days[day.key][slot.key]" type="checkbox">
                <span>{{ slot.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary current-submit" type="button" @click="submitCurrentWeek">
            <i class="mdi mdi-check-circle" /> 提交本周排期
          </button>
        </div>
      </div>
    </div>

    <div class="card" id="mentor-next-week-panel">
      <div class="card-header next-header">
        <div>
          <span class="card-title"><i class="mdi mdi-calendar-arrow-right card-title-icon next" />下周排期</span>
          <span class="tag warning">待填写</span>
        </div>
        <span class="week-range">{{ nextWeekRangeLabel }} (下周)</span>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">下周可上课时长 <span class="req">*</span></label>
          <div class="hours-row">
            <input
              id="mentor-next-weekly-hours"
              type="number"
              class="form-input week-hours"
              min="0"
              max="40"
              placeholder="?"
              :value="nextWeek.totalHours"
              @input="syncNextHours"
            >
            <span class="text-muted">小时</span>
            <div class="hour-shortcuts">
              <button class="btn btn-outline btn-sm" type="button" @click="setNextHours(5)">5h</button>
              <button class="btn btn-outline btn-sm" type="button" @click="setNextHours(10)">10h</button>
              <button class="btn btn-outline btn-sm" type="button" @click="setNextHours(15)">15h</button>
              <button class="btn btn-outline btn-sm" type="button" @click="setNextHours(20)">20h</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">每天可上课时间 <span class="req">*</span> <span class="helper">（可多选）</span></label>
          <div class="schedule-grid next-grid">
            <div v-for="day in nextDays" :key="day.key" class="day-card" :class="{ weekend: day.weekend }">
              <div class="day-name">{{ day.label }}</div>
              <div class="day-date">{{ day.dateLabel }}</div>
              <label v-for="slot in timeSlots" :key="slot.key" class="slot-option">
                <input v-model="nextWeek.days[day.key][slot.key]" type="checkbox">
                <span>{{ slot.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">备注（可选）</label>
          <textarea
            v-model="nextWeek.note"
            class="form-textarea"
            rows="2"
            placeholder="如有特殊情况请在此说明，例如：元旦假期安排"
          />
        </div>

        <div class="form-actions split">
          <button class="btn btn-primary next-submit" type="button" @click="saveNextWeek">
            <i class="mdi mdi-check" /> 保存下周排期
          </button>
          <button class="btn btn-outline" type="button" @click="resetNextWeek">重置</button>
        </div>
      </div>
    </div>

    <div v-if="feedbackModal.visible" id="modal-mentor-schedule-feedback" class="modal active" @click.self="closeFeedbackModal">
      <div class="modal-content" :class="feedbackModal.tone === 'error' ? 'modal-content--error' : 'modal-content--success'" style="max-width:480px">
        <div class="modal-header" :class="feedbackModal.tone === 'error' ? 'modal-header--error' : 'modal-header--success'">
          <span class="modal-title">
            <i :class="feedbackModal.tone === 'error' ? 'mdi mdi-alert-circle' : 'mdi mdi-check-circle'" />
            {{ feedbackModal.title }}
          </span>
          <button class="modal-close" @click="closeFeedbackModal">×</button>
        </div>
        <div class="modal-body">
          <div class="success-card">
            <div class="success-icon" :class="{ 'success-icon--error': feedbackModal.tone === 'error' }">
              <i :class="feedbackModal.tone === 'error' ? 'mdi mdi-alert' : 'mdi mdi-bell-ring'" />
            </div>
            <div class="success-text">{{ feedbackModal.message }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" type="button" @click="closeFeedbackModal">知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { http } from '@osg/shared/utils/request'
import { getUser } from '@osg/shared/utils'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type SlotKey = 'morning' | 'afternoon' | 'evening'

interface DaySlots {
  morning: boolean
  afternoon: boolean
  evening: boolean
}

interface WeekState {
  weekStartDate: string
  totalHours: string
  note: string
  days: Record<DayKey, DaySlots>
}

const dayDefinitions: Array<{ key: DayKey; label: string; offset: number; weekend: boolean }> = [
  { key: 'monday', label: '周一', offset: 0, weekend: false },
  { key: 'tuesday', label: '周二', offset: 1, weekend: false },
  { key: 'wednesday', label: '周三', offset: 2, weekend: false },
  { key: 'thursday', label: '周四', offset: 3, weekend: false },
  { key: 'friday', label: '周五', offset: 4, weekend: false },
  { key: 'saturday', label: '周六', offset: 5, weekend: true },
  { key: 'sunday', label: '周日', offset: 6, weekend: true },
]

const timeSlots: Array<{ key: SlotKey; label: string }> = [
  { key: 'morning', label: '上午' },
  { key: 'afternoon', label: '下午' },
  { key: 'evening', label: '晚上' },
]

const currentWeekCardRef = ref<HTMLElement | null>(null)
const currentHoursInputRef = ref<HTMLInputElement | null>(null)
const feedbackModal = reactive({
  visible: false,
  title: '',
  message: '',
  tone: 'success' as 'success' | 'error',
})

const user = getUser<any>()
const userName = computed(() => user?.nickName || user?.userName || 'Mentor')
const userId = computed(() => user?.userId || '')
const userInitials = computed(() => {
  const value = userName.value.trim()
  return value ? value.slice(0, 2).toUpperCase() : 'M'
})

function createDaySlots(): DaySlots {
  return { morning: false, afternoon: false, evening: false }
}

function createWeekState(weekStartDate: string): WeekState {
  return {
    weekStartDate,
    totalHours: '',
    note: '',
    days: {
      monday: createDaySlots(),
      tuesday: createDaySlots(),
      wednesday: createDaySlots(),
      thursday: createDaySlots(),
      friday: createDaySlots(),
      saturday: createDaySlots(),
      sunday: createDaySlots(),
    },
  }
}

function getBackendBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname, port } = window.location
    const backendPort = port === '3002' ? '28080' : port || '28080'
    return `${protocol}//${hostname}:${backendPort}`
  }
  return 'http://127.0.0.1:28080'
}

function getScheduleApiUrl() {
  return `${getBackendBaseUrl()}/api/mentor/schedule`
}

function toLocalDate(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekStart(date: Date, weekOffset = 0) {
  const current = new Date(date)
  current.setHours(0, 0, 0, 0)
  const day = current.getDay() || 7
  current.setDate(current.getDate() - (day - 1) + weekOffset * 7)
  return current
}

function formatWeekRange(startDate: string) {
  const start = toLocalDate(startDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const monthStart = String(start.getMonth() + 1).padStart(2, '0')
  const dayStart = String(start.getDate()).padStart(2, '0')
  const monthEnd = String(end.getMonth() + 1).padStart(2, '0')
  const dayEnd = String(end.getDate()).padStart(2, '0')
  return `${monthStart}/${dayStart} - ${monthEnd}/${dayEnd}`
}

function parseDayValue(value: unknown): DaySlots {
  const slots = createDaySlots()
  const text = String(value ?? '').trim()
  if (!text || text === 'unavailable') {
    return slots
  }
  if (text === 'all_day') {
    return { morning: true, afternoon: true, evening: true }
  }
  for (const token of text.split(/[|,]/).map(part => part.trim()).filter(Boolean)) {
    if (token in slots) {
      slots[token as SlotKey] = true
    }
  }
  return slots
}

function serializeDayValue(slots: DaySlots) {
  const active = timeSlots.filter(slot => slots[slot.key]).map(slot => slot.key)
  if (active.length === 0) {
    return 'unavailable'
  }
  if (active.length === timeSlots.length) {
    return 'all_day'
  }
  return active.join(',')
}

function hydrateWeek(state: WeekState, data: Record<string, any>) {
  state.weekStartDate = data.weekStartDate ? formatDate(toLocalDate(data.weekStartDate)) : state.weekStartDate
  state.totalHours = data.totalHours === 0 ? '0' : String(data.totalHours || '')
  state.note = data.remark || data.note || ''
  dayDefinitions.forEach((day) => {
    state.days[day.key] = parseDayValue(data[day.key])
  })
}

function buildPayload(state: WeekState) {
  return {
    weekStartDate: state.weekStartDate,
    totalHours: Number(state.totalHours || 0),
    monday: serializeDayValue(state.days.monday),
    tuesday: serializeDayValue(state.days.tuesday),
    wednesday: serializeDayValue(state.days.wednesday),
    thursday: serializeDayValue(state.days.thursday),
    friday: serializeDayValue(state.days.friday),
    saturday: serializeDayValue(state.days.saturday),
    sunday: serializeDayValue(state.days.sunday),
    remark: state.note.trim(),
  }
}

const currentWeek = reactive(createWeekState(formatDate(getWeekStart(new Date()))))
const nextWeek = reactive(createWeekState(formatDate(getWeekStart(new Date(), 1))))

const currentWeekHours = computed(() => Number(currentWeek.totalHours || 0))
const nextWeekHours = computed(() => Number(nextWeek.totalHours || 0))
const hasFilledCurrentWeek = computed(() => currentWeekHours.value > 0 || dayDefinitions.some(day => serializeDayValue(currentWeek.days[day.key]) !== 'unavailable'))
const currentWeekAvailableDays = computed(() => dayDefinitions.filter(day => serializeDayValue(currentWeek.days[day.key]) !== 'unavailable').length)
const showReminder = computed(() => !hasFilledCurrentWeek.value)
const currentWeekRangeLabel = computed(() => formatWeekRange(currentWeek.weekStartDate))
const nextWeekRangeLabel = computed(() => formatWeekRange(nextWeek.weekStartDate))
const currentDays = computed(() => dayDefinitions.map((day) => ({
  ...day,
  dateLabel: (() => {
    const date = getWeekStart(new Date(currentWeek.weekStartDate), 0)
    date.setDate(date.getDate() + day.offset)
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  })(),
})))
const nextDays = computed(() => dayDefinitions.map((day) => ({
  ...day,
  dateLabel: (() => {
    const date = getWeekStart(new Date(nextWeek.weekStartDate), 0)
    date.setDate(date.getDate() + day.offset)
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  })(),
})))

function focusCurrentWeek() {
  currentWeekCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  currentHoursInputRef.value?.focus()
}

function setCurrentHours(value: number) {
  currentWeek.totalHours = String(value)
  currentHoursInputRef.value?.focus()
}

function setNextHours(value: number) {
  nextWeek.totalHours = String(value)
}

function syncCurrentHours(event: Event) {
  currentWeek.totalHours = (event.target as HTMLInputElement).value
}

function syncNextHours(event: Event) {
  nextWeek.totalHours = (event.target as HTMLInputElement).value
}

function openFeedbackModal(title: string, message: string, tone: 'success' | 'error' = 'success') {
  feedbackModal.visible = true
  feedbackModal.title = title
  feedbackModal.message = message
  feedbackModal.tone = tone
}

function closeFeedbackModal() {
  feedbackModal.visible = false
  feedbackModal.title = ''
  feedbackModal.message = ''
  feedbackModal.tone = 'success'
}

async function persistSchedule(state: WeekState, successMessage: string) {
  try {
    await http.put(getScheduleApiUrl(), buildPayload(state))
    openFeedbackModal('保存成功', successMessage, 'success')
  } catch {
    openFeedbackModal('提交失败', '提交失败，请稍后重试', 'error')
  }
}

async function submitCurrentWeek() {
  if (!hasFilledCurrentWeek.value) {
    openFeedbackModal('提示', '请至少填写本周排期', 'error')
    return
  }
  await persistSchedule(currentWeek, '本周排期已提交！')
}

async function saveNextWeek() {
  if (nextWeekHours.value <= 0) {
    openFeedbackModal('提示', '请至少填写下周可上课时长', 'error')
    return
  }
  await persistSchedule(nextWeek, '下周排期已保存！')
}

function resetNextWeek() {
  nextWeek.totalHours = ''
  nextWeek.note = ''
  dayDefinitions.forEach((day) => {
    nextWeek.days[day.key] = createDaySlots()
  })
}

onMounted(async () => {
  try {
    const data = await http.get(getScheduleApiUrl())
    if (data && typeof data === 'object' && 'monday' in data) {
      hydrateWeek(currentWeek, data as Record<string, any>)
    }
  } catch {
    // Keep the page usable even when the backend returns no schedule data.
  }
})
</script>

<style scoped>
.page-header{margin-bottom:24px}
.page-title{font-size:26px;font-weight:700;color:#1E293B}
.page-title-en{font-size:14px;color:#94A3B8;font-weight:400;margin-left:8px}
.page-sub{font-size:14px;color:#64748B;margin-top:6px}
.warning-banner{padding:16px 20px;background:linear-gradient(135deg,#FEE2E2,#FECACA);border-radius:12px;margin-bottom:20px;display:flex;align-items:center;gap:16px;border:2px solid #DC2626}
.warning-icon{font-size:32px;color:#DC2626}
.warning-copy{flex:1}
.warning-title{font-weight:600;color:#991B1B;margin-bottom:4px;display:flex;align-items:center;gap:6px}
.warning-desc{font-size:13px;color:#B91C1C}
.status-card{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 24px rgba(115,153,198,0.12)}
.status-card.border-danger{border:2px solid #DC2626}
.status-card.border-success{border:2px solid #22C55E}
.status-user{display:flex;align-items:center;gap:16px}
.user-avatar{width:50px;height:50px;background:linear-gradient(135deg,#7399C6,#9BB8D9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px}
.status-name{font-weight:600}
.status-stats{display:flex;gap:24px;text-align:center}
.stat-big{font-size:24px;font-weight:700}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(115,153,198,0.12);margin-bottom:20px;overflow:hidden}
.card-header{padding:18px 22px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;gap:12px}
.card-title{font-size:16px;font-weight:600;display:inline-flex;align-items:center;gap:8px}
.card-title-icon{font-size:18px}
.card-title-icon.current{color:#DC2626}
.card-title-icon.next{color:#D97706}
.week-range{font-size:13px;font-weight:500;color:#92400E}
.current-header{background:linear-gradient(135deg,#FEE2E2,#FECACA)}
.next-header{background:linear-gradient(135deg,#FEF3C7,#FDE68A)}
.card-body{padding:22px}
.empty-state{padding:36px 20px;background:#FEF2F2;border-radius:12px;margin-bottom:20px;text-align:center}
.empty-icon{font-size:64px;color:#DC2626;margin-bottom:16px;display:block}
.empty-state h3{font-size:18px;color:#991B1B;margin-bottom:8px}
.empty-state p{font-size:14px;color:#B91C1C;margin-bottom:0}
.form-group{margin-bottom:24px}
.form-label{display:block;font-size:15px;font-weight:600;margin-bottom:12px;color:#1E293B}
.req{color:#DC2626}
.helper{font-weight:400;font-size:12px;color:#64748B}
.hours-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.week-hours{width:120px;text-align:center;font-size:20px;font-weight:700}
.hour-shortcuts{display:flex;gap:8px;flex-wrap:wrap;margin-left:12px}
.btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:linear-gradient(135deg,#7399C6,#9BB8D9);color:#fff;box-shadow:0 4px 12px rgba(115,153,198,0.3)}
.btn-danger{background:#DC2626;color:#fff;box-shadow:0 4px 12px rgba(220,38,38,0.3)}
.btn-outline{background:#fff;color:#64748B;border:1px solid #E2E8F0}
.btn-sm{padding:6px 12px;font-size:13px}
.btn-outline:hover{border-color:#7399C6;color:#7399C6}
.schedule-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
.day-card{padding:12px 10px;background:#F8FAFC;border-radius:10px;border:2px dashed #E2E8F0}
.day-card.weekend{background:#DCFCE7;border-color:#22C55E}
.day-name{font-weight:700;font-size:13px;margin-bottom:4px}
.day-date{font-size:11px;color:#64748B;margin-bottom:10px}
.slot-option{display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;margin-bottom:6px}
.slot-option:last-child{margin-bottom:0}
.form-textarea,.form-input{width:100%;padding:12px 14px;border:2px solid #E2E8F0;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box}
.form-textarea{resize:vertical}
.form-actions{display:flex;justify-content:center;padding-top:16px;border-top:1px solid #E2E8F0}
.form-actions.split{justify-content:flex-start}
.current-submit{padding:14px 40px;font-size:16px;background:#DC2626;box-shadow:0 4px 12px rgba(220,38,38,0.3)}
.next-submit{padding:12px 32px;background:linear-gradient(135deg,#F59E0B,#D97706)}
.modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-content{background:#fff;border-radius:20px;max-height:90vh;overflow-y:auto}
.modal-content--success{box-shadow:0 24px 64px rgba(15,23,42,.22)}
.modal-content--error{box-shadow:0 24px 64px rgba(127,29,29,.18)}
.modal-header{padding:22px 26px;background:linear-gradient(135deg,#7399C6,#5A7BA3);color:#fff;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center}
.modal-header--success{background:linear-gradient(135deg,#7399C6,#4F8B72)}
.modal-header--error{background:linear-gradient(135deg,#DC2626,#B91C1C)}
.modal-title{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}
.modal-close{width:36px;height:36px;border-radius:10px;border:none;background:rgba(255,255,255,0.2);cursor:pointer;font-size:20px;color:#fff}
.modal-body{padding:24px}
.modal-footer{padding:18px 26px;border-top:1px solid #E2E8F0;display:flex;justify-content:flex-end;gap:12px;background:#F8FAFC;border-radius:0 0 20px 20px}
.success-card{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:8px 0}
.success-icon{width:56px;height:56px;border-radius:18px;background:#E8F0F8;color:#7399C6;display:flex;align-items:center;justify-content:center;font-size:28px}
.success-icon--error{background:#FEE2E2;color:#DC2626}
.success-text{font-size:15px;font-weight:600;color:#1E293B;line-height:1.6}
.text-muted{color:#94A3B8}
.text-sm{font-size:12px}
.tag{display:inline-flex;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
.tag.danger{background:#FEE2E2;color:#991B1B}
.tag.warning{background:#FEF3C7;color:#92400E}
.tag.success{background:#D1FAE5;color:#065F46}
</style>

<template>
  <div id="page-schedule" class="page-schedule">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          我的排期
          <span class="page-title-en">My Schedule</span>
        </h1>
        <p class="page-sub">设置助教可用时间，每周保存后会同步下一次刷新结果。</p>
      </div>
    </div>

    <section class="schedule-banner" aria-label="排期提醒">
      <div class="schedule-banner__icon">
        <i class="mdi mdi-calendar-alert" aria-hidden="true" />
      </div>
      <div class="schedule-banner__content">
        <div class="schedule-banner__title">
          <i class="mdi mdi-alert" aria-hidden="true" />
          请及时维护本周排期
        </div>
        <div class="schedule-banner__sub">
          {{ hasAvailability ? '当前排期已同步，可继续微调后保存。' : '请至少选择一天可授课时间段。' }}
        </div>
      </div>
      <span class="schedule-banner__tag">按真实状态更新</span>
    </section>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>排期加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-outline" @click="loadSchedule">重新加载</button>
    </section>

    <template v-else-if="!loading">
      <section class="card">
        <div class="card-body">
          <div class="status-shell">
            <div class="mentor-summary">
              <div class="user-avatar">A</div>
              <div>
                <div class="mentor-name">Assistant</div>
                <div class="mentor-meta">当前登录助教 · 周区间 {{ weekRangeLabel }}</div>
              </div>
            </div>
            <div class="status-metrics">
              <div class="status-metric">
                <div class="status-metric__value status-metric__value--hours">{{ totalHoursLabel }}</div>
                <div class="status-metric__label">本周可用</div>
              </div>
              <div class="status-metric">
                <div class="status-metric__value status-metric__value--days">{{ availableDayCount }}</div>
                <div class="status-metric__label">可用天数</div>
              </div>
              <div class="status-metric">
                <div class="status-metric__value status-metric__value--pending">{{ lastWeekAvailable ? '可复制' : '待完善' }}</div>
                <div class="status-metric__label">排期状态</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <span class="card-title">
            <i class="mdi mdi-calendar-week" aria-hidden="true" />
            本周排期
          </span>
          <span class="card-tag">只读视图</span>
          <span class="card-range">{{ weekRangeLabel }}</span>
        </div>
        <div class="card-body">
          <div class="schedule-stats">
            <div class="schedule-stat">
              <div class="schedule-stat__value">{{ totalHoursLabel }}</div>
              <div class="schedule-stat__label">可用时长</div>
            </div>
            <div class="schedule-stat">
              <div class="schedule-stat__value schedule-stat__value--success">{{ availableDayCount }}</div>
              <div class="schedule-stat__label">可用天数</div>
            </div>
          </div>

          <div class="readonly-block">
            <label class="form-label">
              <i class="mdi mdi-calendar-check" aria-hidden="true" />
              已设置的可用时间
              <span class="form-label-note">(只读)</span>
            </label>
            <div class="readonly-grid">
              <article v-for="day in dayOptions" :key="day.key" class="readonly-day">
                <div class="readonly-day__label">{{ day.label }}</div>
                <div class="readonly-day__value">{{ slotLabel(schedule[day.key]) }}</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header card-header--warning">
          <span class="card-title card-title--warning">
            <i class="mdi mdi-calendar-arrow-right" aria-hidden="true" />
            编辑排期
          </span>
          <span class="card-range card-range--warning">
            {{ weekRangeLabel }}
            <span class="card-tag card-tag--warning">可保存</span>
          </span>
        </div>
        <div class="card-body">
          <div class="editable-grid">
            <article v-for="day in dayOptions" :key="day.key" class="editable-day">
              <div class="editable-day__label">{{ day.label }}</div>
              <select :id="`assistant-schedule-${day.key}`" v-model="schedule[day.key]" class="form-select">
                <option v-for="option in slotOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </article>
          </div>

          <div class="form-group">
            <label class="form-label form-label--large">
              <i class="mdi mdi-clock-outline" aria-hidden="true" />
              本周总时长
              <span class="required-mark">*</span>
            </label>
            <div class="hours-row">
              <input
                id="assistant-schedule-total-hours"
                v-model.number="schedule.totalHours"
                type="number"
                min="0"
                max="80"
                class="form-input form-input--hours"
              />
              <span class="hours-unit">小时</span>
            </div>
          </div>

          <section
            v-if="scheduleNotice"
            id="assistant-schedule-feedback"
            class="feedback-banner feedback-banner--compact"
            :class="feedbackToneClass(scheduleNotice.type)"
          >
            <strong>{{ scheduleNotice.title }}</strong>
            <span>{{ scheduleNotice.text }}</span>
          </section>

          <div class="form-footer">
            <button id="assistant-schedule-copy-last-week" type="button" class="btn btn-outline" :disabled="copyingLastWeek" @click="copyLastWeek">
              {{ copyingLastWeek ? '复制中...' : '复制上周排期' }}
            </button>
            <button id="assistant-schedule-save" type="button" class="btn btn-primary btn-primary--warning" :disabled="saving" @click="saveSchedule">
              {{ saving ? '保存中...' : '保存排期' }}
            </button>
          </div>
        </div>
      </section>
    </template>

    <section v-else class="state-card">
      <h2>排期加载中</h2>
      <p>正在读取本周排期与上一周可复制内容，请稍候。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getAssistantCurrentSchedule,
  getAssistantLastWeekSchedule,
  saveAssistantSchedule,
  type AssistantSchedule,
} from '@osg/shared/api'

interface NoticeState {
  type: 'success' | 'error'
  title: string
  text: string
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const dayOptions: Array<{ key: DayKey; label: string }> = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' },
]

const slotOptions = [
  { value: 'unavailable', label: '不可用' },
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
  { value: 'all_day', label: '全天' },
]

const loading = ref(true)
const saving = ref(false)
const copyingLastWeek = ref(false)
const errorMessage = ref('')
const scheduleNotice = ref<NoticeState | null>(null)
const lastWeekSnapshot = ref<AssistantSchedule | null>(null)

const schedule = reactive<AssistantSchedule>(createEmptySchedule())

const availableDayCount = computed(() => dayOptions.filter((day) => schedule[day.key] !== 'unavailable').length)
const hasAvailability = computed(() => availableDayCount.value > 0)
const totalHoursLabel = computed(() => `${Number(schedule.totalHours || 0)} 小时`)
const currentWeekStart = computed(() => getCurrentWeekStart())
const weekRangeLabel = computed(() => buildWeekRange(schedule.weekStartDate || currentWeekStart.value))
const lastWeekAvailable = computed(() => hasSchedulePayload(lastWeekSnapshot.value))

function createEmptySchedule(): AssistantSchedule {
  return {
    weekStartDate: getCurrentWeekStart(),
    totalHours: 0,
    monday: 'unavailable',
    tuesday: 'unavailable',
    wednesday: 'unavailable',
    thursday: 'unavailable',
    friday: 'unavailable',
    saturday: 'unavailable',
    sunday: 'unavailable',
  }
}

function getCurrentWeekStart() {
  const current = new Date()
  const normalizedDay = current.getDay() === 0 ? 7 : current.getDay()
  current.setDate(current.getDate() - normalizedDay + 1)
  return [current.getFullYear(), String(current.getMonth() + 1).padStart(2, '0'), String(current.getDate()).padStart(2, '0')].join('-')
}

function buildWeekRange(weekStartDate: string) {
  const parsed = new Date(weekStartDate)
  if (Number.isNaN(parsed.getTime())) {
    return `周视图 ${weekStartDate}`
  }
  const weekEnd = new Date(parsed)
  weekEnd.setDate(parsed.getDate() + 6)
  const startMonth = String(parsed.getMonth() + 1).padStart(2, '0')
  const startDate = String(parsed.getDate()).padStart(2, '0')
  const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0')
  const endDate = String(weekEnd.getDate()).padStart(2, '0')
  return `${startMonth}/${startDate} - ${endMonth}/${endDate}`
}

function normalizeSlotValue(value?: string) {
  return slotOptions.some((option) => option.value === value) ? value || 'unavailable' : 'unavailable'
}

function slotLabel(value?: string) {
  return slotOptions.find((option) => option.value === value)?.label || '不可用'
}

function hasSchedulePayload(value: AssistantSchedule | null | undefined) {
  if (!value) return false
  if (Number(value.totalHours || 0) > 0) return true
  return dayOptions.some((day) => String(value[day.key] || '').trim() && value[day.key] !== 'unavailable')
}

function applySchedule(nextSchedule: AssistantSchedule | null | undefined) {
  const snapshot = nextSchedule && hasSchedulePayload(nextSchedule)
    ? nextSchedule
    : {
        ...createEmptySchedule(),
        weekStartDate: nextSchedule?.weekStartDate || getCurrentWeekStart(),
        id: nextSchedule?.id,
        mentorId: nextSchedule?.mentorId,
      }

  schedule.id = snapshot.id
  schedule.mentorId = snapshot.mentorId
  schedule.weekStartDate = snapshot.weekStartDate || getCurrentWeekStart()
  schedule.totalHours = Number(snapshot.totalHours || 0)
  dayOptions.forEach((day) => {
    schedule[day.key] = normalizeSlotValue(snapshot[day.key])
  })
}

function validateSchedule() {
  scheduleNotice.value = null
  const totalHours = Number(schedule.totalHours || 0)
  if (!hasAvailability.value) {
    scheduleNotice.value = { type: 'error', title: '无法保存', text: '请至少选择一天可授课时间段。' }
    return false
  }
  if (!Number.isFinite(totalHours) || totalHours <= 0) {
    scheduleNotice.value = { type: 'error', title: '无法保存', text: '请填写大于 0 的本周总时长。' }
    return false
  }
  if (totalHours > 80) {
    scheduleNotice.value = { type: 'error', title: '无法保存', text: '本周总时长不能超过 80 小时。' }
    return false
  }
  return true
}

async function loadSchedule() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [currentSchedule, lastWeekSchedule] = await Promise.all([
      getAssistantCurrentSchedule(),
      getAssistantLastWeekSchedule().catch(() => null),
    ])
    applySchedule(currentSchedule)
    lastWeekSnapshot.value = lastWeekSchedule
  } catch (error: any) {
    errorMessage.value = error?.message || '排期暂时无法加载，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function copyLastWeek() {
  copyingLastWeek.value = true
  scheduleNotice.value = null
  try {
    const source = lastWeekSnapshot.value || (await getAssistantLastWeekSchedule())
    lastWeekSnapshot.value = source
    if (!hasSchedulePayload(source)) {
      scheduleNotice.value = { type: 'error', title: '暂无可复制内容', text: '上一周暂无排期记录，可直接手动填写本周排期。' }
      return
    }
    applySchedule({ ...(source as AssistantSchedule), id: schedule.id, mentorId: schedule.mentorId, weekStartDate: schedule.weekStartDate || currentWeekStart.value })
    scheduleNotice.value = { type: 'success', title: '复制成功', text: '已载入上一周排期，可继续按本周实际情况微调。' }
  } catch (error: any) {
    scheduleNotice.value = { type: 'error', title: '复制失败', text: error?.message || '暂时无法读取上一周排期。' }
  } finally {
    copyingLastWeek.value = false
  }
}

async function saveSchedule() {
  if (!validateSchedule()) return
  saving.value = true
  try {
    await saveAssistantSchedule({ ...schedule, totalHours: Number(schedule.totalHours || 0), weekStartDate: schedule.weekStartDate || currentWeekStart.value })
    await loadSchedule()
    scheduleNotice.value = { type: 'success', title: '保存成功', text: '课程排期已更新，刷新页面后仍会保留最新结果。' }
  } catch (error: any) {
    scheduleNotice.value = { type: 'error', title: '保存失败', text: error?.message || '排期暂时无法保存，请稍后重试。' }
  } finally {
    saving.value = false
  }
}

function feedbackToneClass(type: NoticeState['type']) {
  return type === 'success' ? 'feedback-banner--success' : 'feedback-banner--error'
}

onMounted(() => {
  void loadSchedule()
})
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

.schedule-banner__content { flex: 1; }
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

.card,
.state-card {
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

.card-title--warning { color: #92400e; }

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

.card-range--warning { color: #92400e; }

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

.mentor-name { font-weight: 600; color: #0f172a; }
.mentor-meta { margin-top: 4px; font-size: 13px; color: var(--muted); }

.status-metrics {
  display: flex;
  gap: 24px;
  text-align: center;
}

.status-metric__value { font-size: 24px; font-weight: 700; }
.status-metric__value--hours { color: #22c55e; }
.status-metric__value--days { color: #3b82f6; }
.status-metric__value--pending { color: #d97706; }
.status-metric__label { margin-top: 4px; font-size: 12px; color: var(--muted); }

.schedule-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 10px;
  background: #f8fafc;
}

.schedule-stat { flex: 1; text-align: center; }
.schedule-stat:first-child { border-right: 1px solid var(--border); }
.schedule-stat__value { font-size: 28px; font-weight: 700; color: var(--primary); }
.schedule-stat__value--success { color: #22c55e; }
.schedule-stat__label { margin-top: 4px; font-size: 12px; color: var(--muted); }

.form-group { margin-bottom: 24px; }
.form-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text2);
}

.form-label--large { font-size: 15px; }
.form-label i { margin-right: 6px; }
.form-label-note { font-size: 12px; font-weight: 400; color: var(--muted); }
.required-mark { color: var(--danger); }

.readonly-grid,
.editable-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.readonly-day,
.editable-day {
  text-align: center;
  border-radius: 12px;
  padding: 12px 8px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
}

.readonly-day__label,
.editable-day__label {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.readonly-day__value { font-size: 11px; color: #64748b; }

.form-input,
.form-select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
}

.form-input--hours {
  width: 120px;
  border-width: 2px;
  border-color: #d97706;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
}

.hours-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hours-unit { font-size: 15px; color: var(--muted); }

.form-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
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

.feedback-banner {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
}

.feedback-banner--success {
  background: #f0fdf4;
  border: 1px solid rgba(22, 163, 74, 0.18);
  color: #166534;
}

.feedback-banner--error {
  background: #fff7f7;
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.state-card { padding: 24px; }
.state-card--error { background: #fff7f7; }
.state-card h2 { margin: 0 0 8px; }
.state-card p { margin: 0; color: var(--text2); }

@media (max-width: 1280px) {
  .readonly-grid,
  .editable-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 960px) {
  .status-shell,
  .hours-row,
  .form-footer { flex-direction: column; align-items: stretch; }
  .status-metrics { justify-content: space-between; }
  .card-range { margin-left: 0; }
}

@media (max-width: 720px) {
  .readonly-grid,
  .editable-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .schedule-banner,
  .card-header,
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>

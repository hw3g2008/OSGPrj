<template>
  <div id="page-schedule" class="schedule-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          课程排期
          <span class="page-title-en">Schedule</span>
        </h1>
        <p class="page-sub">
          维护本周可授课时间段与总时长，保存后刷新页面仍会展示最新排期结果。
        </p>
      </div>

      <div class="page-header__actions">
        <span class="status-pill">{{ weekRangeLabel }}</span>
        <button type="button" class="ghost-button" @click="refreshSchedule">刷新排期</button>
      </div>
    </div>

    <section v-if="errorMessage" class="state-card state-card--error">
      <h2>排期加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="ghost-button" @click="loadSchedule">重新加载</button>
    </section>

    <section v-else-if="loading" class="state-card">
      <h2>排期加载中</h2>
      <p>正在读取本周排期与上一周可复制内容，请稍候。</p>
    </section>

    <template v-else>
      <section class="schedule-banner" :class="hasAvailability ? 'schedule-banner--ready' : 'schedule-banner--warning'">
        <div>
          <h2>{{ hasAvailability ? '本周排期已设置' : '本周尚未设置排期' }}</h2>
          <p>
            {{ hasAvailability
              ? '当前周视图已加载真实排期数据，可继续调整后重新保存。'
              : '请至少选择一天可授课时间段，并填写每周总时长。' }}
          </p>
        </div>
        <strong class="schedule-banner__value">{{ availableDayCount }} 天可用</strong>
      </section>

      <section v-if="pageNotice" class="feedback-banner" :class="feedbackToneClass(pageNotice.type)">
        <strong>{{ pageNotice.title }}</strong>
        <span>{{ pageNotice.text }}</span>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <span class="summary-card__label">可授课天数</span>
          <strong class="summary-card__value">{{ availableDayCount }}</strong>
          <span class="summary-card__hint">当前周排期中已开放的日期数量</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">总时长</span>
          <strong class="summary-card__value">{{ totalHoursLabel }}</strong>
          <span class="summary-card__hint">本周计划可安排的授课总时长</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">周起始日</span>
          <strong class="summary-card__value summary-card__value--small">{{ schedule.weekStartDate || currentWeekStart }}</strong>
          <span class="summary-card__hint">本周排期所属的周起始日期</span>
        </article>
        <article class="summary-card">
          <span class="summary-card__label">上周参考</span>
          <strong class="summary-card__value summary-card__value--small">
            {{ lastWeekAvailable ? '可复制' : '暂无数据' }}
          </strong>
          <span class="summary-card__hint">可一键复制上一周排期作为起点</span>
        </article>
      </section>

      <div class="content-grid">
        <section class="panel-card panel-card--editor">
          <header class="panel-card__header">
            <div>
              <h2>本周排期</h2>
              <p>为每一天选择可授课时段，并填写本周总时长。</p>
            </div>
          </header>

          <div class="panel-card__body">
            <div class="schedule-grid">
              <article v-for="day in dayOptions" :key="day.key" class="day-card">
                <span class="day-card__label">{{ day.label }}</span>
                <select
                  :id="`assistant-schedule-${day.key}`"
                  v-model="schedule[day.key]"
                  class="form-select"
                >
                  <option
                    v-for="option in slotOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </article>
            </div>

            <div class="hours-card">
              <label class="form-field">
                <span class="form-field__label">本周总时长</span>
                <div class="hours-field">
                  <input
                    id="assistant-schedule-total-hours"
                    v-model.number="schedule.totalHours"
                    class="form-input"
                    type="number"
                    min="0"
                    max="80"
                  />
                  <span class="hours-field__suffix">小时</span>
                </div>
              </label>
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
          </div>

          <footer class="panel-card__footer">
            <button
              id="assistant-schedule-copy-last-week"
              type="button"
              class="ghost-button"
              :disabled="copyingLastWeek"
              @click="copyLastWeek"
            >
              {{ copyingLastWeek ? '复制中...' : '复制上周排期' }}
            </button>
            <button id="assistant-schedule-save" type="button" class="primary-button" :disabled="saving" @click="saveSchedule">
              {{ saving ? '保存中...' : '保存排期' }}
            </button>
          </footer>
        </section>

        <aside class="panel-card panel-card--aside">
          <header class="panel-card__header">
            <div>
              <h2>填写提示</h2>
              <p>建议先选择可用时间段，再根据整体安排填写总时长。</p>
            </div>
          </header>

          <div class="panel-card__body panel-card__body--tips">
            <div class="tip-chip">上午</div>
            <div class="tip-chip">下午</div>
            <div class="tip-chip">晚上</div>
            <div class="tip-chip">全天</div>
            <p class="tip-copy">
              若本周安排与上周相近，可直接复制上周排期后再微调，减少重复填写。
            </p>
          </div>
        </aside>
      </div>
    </template>
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

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

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
const pageNotice = ref<NoticeState | null>(null)
const scheduleNotice = ref<NoticeState | null>(null)
const lastWeekSnapshot = ref<AssistantSchedule | null>(null)

const schedule = reactive<AssistantSchedule>(createEmptySchedule())

const availableDayCount = computed(() =>
  dayOptions.filter((day) => schedule[day.key] !== 'unavailable').length,
)
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
  return [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0'),
  ].join('-')
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

function hasSchedulePayload(value: AssistantSchedule | null | undefined) {
  if (!value) {
    return false
  }
  if (Number(value.totalHours || 0) > 0) {
    return true
  }
  return dayOptions.some((day) => {
    const slotValue = String(value[day.key] || '').trim()
    return Boolean(slotValue) && slotValue !== 'unavailable'
  })
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

function normalizeSlotValue(value?: string) {
  return slotOptions.some((option) => option.value === value) ? value || 'unavailable' : 'unavailable'
}

function clearScheduleNotice() {
  scheduleNotice.value = null
}

function validateSchedule() {
  clearScheduleNotice()

  const totalHours = Number(schedule.totalHours || 0)
  if (!hasAvailability.value) {
    scheduleNotice.value = {
      type: 'error',
      title: '无法保存',
      text: '请至少选择一天可授课时间段。',
    }
    return false
  }

  if (!Number.isFinite(totalHours) || totalHours <= 0) {
    scheduleNotice.value = {
      type: 'error',
      title: '无法保存',
      text: '请填写大于 0 的本周总时长。',
    }
    return false
  }

  if (totalHours > 80) {
    scheduleNotice.value = {
      type: 'error',
      title: '无法保存',
      text: '本周总时长不能超过 80 小时。',
    }
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

async function refreshSchedule() {
  await loadSchedule()
  if (!errorMessage.value) {
    pageNotice.value = {
      type: 'success',
      title: '已刷新',
      text: '当前周排期已更新为最新结果。',
    }
  }
}

async function copyLastWeek() {
  copyingLastWeek.value = true
  clearScheduleNotice()

  try {
    const source = lastWeekSnapshot.value || (await getAssistantLastWeekSchedule())
    lastWeekSnapshot.value = source

    if (!hasSchedulePayload(source)) {
      scheduleNotice.value = {
        type: 'error',
        title: '暂无可复制内容',
        text: '上一周暂无排期记录，可直接手动填写本周排期。',
      }
      return
    }

    const copiedSchedule = source as AssistantSchedule

    applySchedule({
      ...copiedSchedule,
      id: schedule.id,
      mentorId: schedule.mentorId,
      weekStartDate: schedule.weekStartDate || currentWeekStart.value,
      totalHours: Number(copiedSchedule.totalHours || 0),
    })
    scheduleNotice.value = {
      type: 'success',
      title: '复制成功',
      text: '已载入上一周排期，可继续按本周实际情况微调。',
    }
  } catch (error: any) {
    scheduleNotice.value = {
      type: 'error',
      title: '复制失败',
      text: error?.message || '暂时无法读取上一周排期。',
    }
  } finally {
    copyingLastWeek.value = false
  }
}

async function saveSchedule() {
  if (!validateSchedule()) {
    return
  }

  saving.value = true

  try {
    await saveAssistantSchedule({
      ...schedule,
      totalHours: Number(schedule.totalHours || 0),
      weekStartDate: schedule.weekStartDate || currentWeekStart.value,
    })
    await loadSchedule()
    pageNotice.value = {
      type: 'success',
      title: '保存成功',
      text: '课程排期已更新，刷新页面后仍会保留最新结果。',
    }
  } catch (error: any) {
    scheduleNotice.value = {
      type: 'error',
      title: '保存失败',
      text: error?.message || '排期暂时无法保存，请稍后重试。',
    }
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

<style scoped lang="scss">
.schedule-page {
  display: grid;
  gap: 24px;
  color: var(--text);
}

.page-header,
.page-header__actions,
.panel-card__footer,
.hours-field,
.feedback-banner {
  display: flex;
  align-items: center;
}

.page-header,
.schedule-banner,
.summary-card,
.panel-card,
.state-card,
.feedback-banner {
  border-radius: 24px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: var(--card-shadow);
}

.page-header,
.schedule-banner,
.panel-card__header,
.panel-card__body,
.panel-card__footer,
.state-card {
  padding: 24px 28px;
}

.page-header {
  justify-content: space-between;
  gap: 20px;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
}

.page-title-en {
  margin-left: 10px;
  color: var(--muted);
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  margin: 10px 0 0;
  max-width: 720px;
  color: var(--text2);
  line-height: 1.7;
}

.page-header__actions,
.panel-card__footer,
.feedback-banner {
  gap: 12px;
}

.status-pill,
.tip-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.status-pill {
  padding: 10px 14px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary);
}

.schedule-banner {
  justify-content: space-between;
  gap: 18px;
}

.schedule-banner h2,
.panel-card__header h2,
.state-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.schedule-banner p,
.panel-card__header p,
.state-card p,
.tip-copy {
  margin: 8px 0 0;
  color: var(--text2);
  line-height: 1.7;
}

.schedule-banner__value {
  white-space: nowrap;
  font-size: 24px;
  font-weight: 700;
}

.schedule-banner--ready {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
}

.schedule-banner--warning {
  background: linear-gradient(135deg, #fff7ed 0%, #fff7f7 100%);
}

.feedback-banner {
  padding: 16px 18px;
}

.feedback-banner strong {
  white-space: nowrap;
}

.feedback-banner span {
  line-height: 1.7;
}

.feedback-banner--compact {
  border-radius: 18px;
}

.feedback-banner--success {
  background: #f0fdf4;
  border-color: rgba(22, 163, 74, 0.18);
  color: #166534;
}

.feedback-banner--error {
  background: #fff7f7;
  border-color: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.summary-grid,
.content-grid,
.schedule-grid,
.panel-card__body,
.panel-card__body--tips {
  display: grid;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 10px;
  padding: 22px;
}

.summary-card__label,
.summary-card__hint,
.form-field__label {
  color: var(--text2);
}

.summary-card__label,
.form-field__label {
  font-size: 13px;
  font-weight: 700;
}

.summary-card__value {
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--small {
  font-size: 18px;
}

.summary-card__hint {
  line-height: 1.7;
}

.content-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.8fr);
  gap: 20px;
}

.panel-card {
  overflow: hidden;
}

.panel-card__header,
.panel-card__body {
  gap: 8px;
}

.schedule-grid {
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

.day-card,
.hours-card {
  padding: 18px;
  border-radius: 18px;
  background: var(--bg);
}

.day-card {
  display: grid;
  gap: 10px;
}

.day-card__label {
  font-size: 13px;
  font-weight: 700;
}

.hours-card {
  margin-top: 18px;
}

.form-field {
  display: grid;
  gap: 8px;
}

.form-input,
.form-select {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  color: var(--text);
  padding: 0 14px;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(115, 153, 198, 0.16);
}

.hours-field {
  gap: 12px;
}

.hours-field__suffix {
  color: var(--text2);
  font-size: 13px;
  font-weight: 700;
}

.panel-card__footer {
  justify-content: flex-end;
}

.panel-card__body--tips {
  gap: 12px;
}

.tip-chip {
  width: fit-content;
  padding: 8px 12px;
  background: var(--bg);
  color: var(--text2);
}

.primary-button,
.ghost-button {
  min-height: 42px;
  border: 0;
  border-radius: 14px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.primary-button {
  background: var(--primary);
  color: #fff;
}

.ghost-button {
  background: var(--bg);
  color: var(--text2);
}

.primary-button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.state-card {
  display: grid;
  gap: 8px;
}

.state-card--error {
  background: #fff7f7;
}

@media (max-width: 1200px) {
  .summary-grid,
  .content-grid,
  .schedule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header,
  .schedule-banner,
  .panel-card__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header,
  .schedule-banner,
  .panel-card__header,
  .panel-card__body,
  .panel-card__footer,
  .state-card {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>

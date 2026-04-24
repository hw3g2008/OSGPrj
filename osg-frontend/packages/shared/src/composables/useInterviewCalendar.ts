/**
 * useInterviewCalendar - 面试日历逻辑层（三端共用）
 *
 * SSOT：Assistant（2026-04-23 实现）+ 吸纳 Mentor 可切月能力。
 *
 * 行为规约：
 * - 默认 monthOffset=0，折叠态显示当前月份 + 包含今天的周（周日~周六）
 * - 切月 shiftMonth(±1) 后：
 *   · 折叠态胶囊 = 该月 1 号所在周（周日~周六）
 *   · 展开 42 格 = 该月完整网格（6×7 跨月凑整周）
 *   · 事件列表 = 当前折叠周 7 天内的事件
 *   · 今天高亮仅在 iso === 今天真实日期时启用
 *
 * 色彩语义（统一 4 态）：
 *   today   - 今天（深蓝实心，ant 'blue'）
 *   danger  - 面试日（浅红底，ant 'red'）
 *   info    - 辅导日（浅蓝底，ant 'processing'）
 *   default - 普通日（灰，ant ''）
 */
import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import type {
  CalendarItemView,
  CalendarTone,
  CompactDayView,
  InterviewEvent,
  MonthCellView,
  SummaryEventView,
} from '../types/interviewCalendar'

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAYS_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function addMonths(date: Date, offset: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + offset)
  return next
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function isCoachingStatus(status?: string): boolean {
  return /辅导|coach/i.test(status ?? '')
}

function formatMonthDay(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export interface UseInterviewCalendarReturn {
  /** 当前切月偏移（通过 shiftMonth 修改；不建议直接写） */
  monthOffset: Ref<number>
  /** 月份文字 "X月" */
  currentMonthLabel: ComputedRef<string>
  /** 折叠态 7 格胶囊 */
  compactDays: ComputedRef<CompactDayView[]>
  /** 折叠态 summary 胶囊（最多 3 条） */
  summaryEvents: ComputedRef<SummaryEventView[]>
  /** 展开态 42 格月视图 */
  monthCells: ComputedRef<MonthCellView[]>
  /** 本周事件列表（含距离标签） */
  calendarItems: ComputedRef<CalendarItemView[]>
  /** 切月：+1 下一月 / -1 上一月 */
  shiftMonth: (offset: number) => void
}

export function useInterviewCalendar(
  events: MaybeRefOrGetter<InterviewEvent[]>,
): UseInterviewCalendarReturn {
  const monthOffset = ref(0)

  function shiftMonth(offset: number) {
    monthOffset.value += offset
  }

  /** 锚点日期：当月 = 今天；非当月 = 该月 1 号 */
  const currentMonthDate = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (monthOffset.value === 0) return today
    const m = addMonths(today, monthOffset.value)
    return new Date(m.getFullYear(), m.getMonth(), 1)
  })

  /** 折叠态「该周」的起点（周日） */
  const weekStartDate = computed(() => {
    const d = new Date(currentMonthDate.value)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  const currentMonthLabel = computed(() => `${currentMonthDate.value.getMonth() + 1}月`)

  const compactDays = computed<CompactDayView[]>(() => {
    const todayIso = localIsoDate(new Date())
    const weekStart = weekStartDate.value
    const list = toValue(events)

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      const iso = localIsoDate(day)

      const event = list.find(
        (r) => r.interviewTime && String(r.interviewTime).slice(0, 10) === iso,
      )

      let tagColor = ''
      let tagStyle: Record<string, string> = {}
      if (iso === todayIso) {
        tagStyle = { background: 'var(--primary)', color: '#fff', border: 'none' }
      } else if (event) {
        tagColor = isCoachingStatus(event.coachingStatus) ? 'processing' : 'red'
      }

      return {
        key: `day-${iso}`,
        weekday: WEEKDAYS_CN[day.getDay()],
        date: String(day.getDate()),
        tagColor,
        tagStyle,
      }
    })
  })

  const summaryEvents = computed<SummaryEventView[]>(() => {
    const weekStart = weekStartDate.value
    const weekStartIso = localIsoDate(weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const weekEndIso = localIsoDate(weekEnd)
    const list = toValue(events)

    return list
      .filter((r) => {
        if (!r.interviewTime) return false
        const iso = String(r.interviewTime).slice(0, 10)
        return iso >= weekStartIso && iso < weekEndIso
      })
      .sort((a, b) => String(a.interviewTime).localeCompare(String(b.interviewTime)))
      .slice(0, 3)
      .map((r) => ({
        label: formatMonthDay(r.interviewTime),
        student: r.studentName || '-',
        tagColor: isCoachingStatus(r.coachingStatus) ? 'processing' : 'red',
      }))
  })

  const monthCells = computed<MonthCellView[]>(() => {
    const anchor = currentMonthDate.value
    const currentYear = anchor.getFullYear()
    const currentMonth = anchor.getMonth()
    const todayIso = localIsoDate(new Date())
    const list = toValue(events)

    const firstDay = new Date(currentYear, currentMonth, 1)
    const gridStart = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - firstDay.getDay())

    const cells: MonthCellView[] = []
    for (let i = 0; i < 42; i++) {
      const day = new Date(gridStart)
      day.setDate(gridStart.getDate() + i)
      const iso = localIsoDate(day)
      const isCurrentMonth = day.getMonth() === currentMonth

      const event = list.find(
        (r) => r.interviewTime && String(r.interviewTime).slice(0, 10) === iso,
      )

      let tone: CalendarTone = 'default'
      if (iso === todayIso) {
        tone = 'today'
      } else if (event) {
        tone = isCoachingStatus(event.coachingStatus) ? 'info' : 'danger'
      }

      cells.push({
        label: String(day.getDate()),
        iso,
        tone,
        isCurrentMonth,
        hasEvent: !!event,
      })
    }
    return cells
  })

  const calendarItems = computed<CalendarItemView[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    const weekStart = weekStartDate.value
    const weekStartIso = localIsoDate(weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const weekEndIso = localIsoDate(weekEnd)
    const list = toValue(events)

    return list
      .filter((r) => {
        if (!r.interviewTime) return false
        const iso = String(r.interviewTime).slice(0, 10)
        return iso >= weekStartIso && iso < weekEndIso
      })
      .sort((a, b) => String(a.interviewTime).localeCompare(String(b.interviewTime)))
      .map<CalendarItemView>((r) => {
        const d = new Date(String(r.interviewTime))
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const daysDiff = Math.round((dateOnly.getTime() - todayTime) / 86400000)

        let tag: string
        let tone: CalendarTone
        const coaching = isCoachingStatus(r.coachingStatus)
        if (daysDiff < 0) {
          tag = '已过'
          tone = 'default'
        } else if (daysDiff === 0) {
          tag = '今天'
          tone = 'today'
        } else {
          if (daysDiff === 1) tag = '明天'
          else if (daysDiff === 2) tag = '后天'
          else tag = `${daysDiff}天后`
          tone = coaching ? 'info' : 'danger'
        }

        const tagColor =
          tone === 'today'
            ? 'blue'
            : tone === 'info'
              ? 'processing'
              : tone === 'danger'
                ? 'red'
                : ''

        return {
          ...r,
          tone,
          tag,
          tagColor,
          weekday: WEEKDAYS_FULL[d.getDay()],
          dateNum: String(d.getDate()),
        }
      })
  })

  return {
    monthOffset,
    currentMonthLabel,
    compactDays,
    summaryEvents,
    monthCells,
    calendarItems,
    shiftMonth,
  }
}

/**
 * useInterviewCalendar - 面试日历逻辑层（四端共用）
 *
 * SSOT：Assistant（2026-04-23 实现）+ 吸纳 Mentor 可切月能力 +
 *      T14（2026-05-08）增加按星期切换。
 *
 * 行为规约：
 * - 默认 viewMode='month'，monthOffset=0，折叠态显示当前月份 + 包含今天的周（周日~周六）
 * - 月模式：shiftMonth(±1) 切月，折叠胶囊 = 该月 1 号所在周
 * - 周模式：shiftWeek(±1) 切周（按周一开始，符合中文习惯）；
 *   折叠胶囊 / 42 格 / 事件列表都基于当前周窗口推导。
 * - 切到 month 模式时 weekOffset 重置为 0；切到 week 模式时 weekOffset 重置为 0。
 * - 切月/切周后，currentRange 暴露当前显示的 [start, end) 区间，组件层 emit
 *   'range-change'，供页面层联动 list API（按 interview_at 过滤）。
 *
 * 色彩语义（统一 4 态）：
 *   today   - 今天（深蓝实心，ant 'blue'）
 *   danger  - 面试日（浅红底，ant 'red'）
 *   info    - 辅导日（浅蓝底，ant 'processing'）
 *   default - 普通日（灰，ant ''）
 */
import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import { i18n } from '../i18n'
import type {
  CalendarItemView,
  CalendarTone,
  CompactDayView,
  InterviewEvent,
  MonthCellView,
  SummaryEventView,
} from '../types/interviewCalendar'

type TFunc = (key: string, named?: Record<string, unknown>) => string

const WEEKDAY_SHORT_KEYS = [
  'common.shared.calendar.weekdayShort.sun',
  'common.shared.calendar.weekdayShort.mon',
  'common.shared.calendar.weekdayShort.tue',
  'common.shared.calendar.weekdayShort.wed',
  'common.shared.calendar.weekdayShort.thu',
  'common.shared.calendar.weekdayShort.fri',
  'common.shared.calendar.weekdayShort.sat',
] as const

const WEEKDAY_FULL_KEYS = [
  'common.shared.calendar.weekdayFull.sun',
  'common.shared.calendar.weekdayFull.mon',
  'common.shared.calendar.weekdayFull.tue',
  'common.shared.calendar.weekdayFull.wed',
  'common.shared.calendar.weekdayFull.thu',
  'common.shared.calendar.weekdayFull.fri',
  'common.shared.calendar.weekdayFull.sat',
] as const

function defaultT(): TFunc {
  return ((key, named) =>
    named ? (i18n.global.t as unknown as TFunc)(key, named) : (i18n.global.t as unknown as TFunc)(key))
}

export type CalendarViewMode = 'month' | 'week'

/** 当前显示的时间窗口（[start, end) 半开区间） */
export interface CalendarRange {
  start: Date
  end: Date
  mode: CalendarViewMode
}

function addMonths(date: Date, offset: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + offset)
  return next
}

function addDays(date: Date, offset: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * 周一为起点的 weekStart（中文习惯）：
 * - 周一 → 当天
 * - 周二 → 回退 1 天
 * - 周日 → 回退 6 天
 */
function getMondayWeekStart(d: Date): Date {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  // getDay(): 0(日) 1(一) ... 6(六)；周一为 1
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function isCoachingStatus(status?: string): boolean {
  // 业务逻辑模式匹配（非展示文案）：匹配后端状态字符串，可能含中文"辅导"或英文 coach 前缀。
  // 按 glossary §4，错误判断/状态匹配用的字符串不做 t() 化。
  return /辅导|coach/i.test(status ?? '') // TODO(i18n) intentionally kept: pattern match, not display text
}

function formatMonthDay(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export interface UseInterviewCalendarOptions {
  /** Optional translate function; defaults to i18n.global.t (works in any context, incl. tests). */
  t?: TFunc
}

export interface UseInterviewCalendarReturn {
  /** 视图模式：'month' | 'week' */
  viewMode: Ref<CalendarViewMode>
  /** 当前切月偏移（月模式有效） */
  monthOffset: Ref<number>
  /** 当前切周偏移（周模式有效） */
  weekOffset: Ref<number>
  /** 月份文字 "X月" */
  currentMonthLabel: ComputedRef<string>
  /** 周区间文字 "5月8日 ~ 5月14日" */
  currentWeekLabel: ComputedRef<string>
  /** 当前模式下的标题文字（月 → currentMonthLabel；周 → currentWeekLabel） */
  currentRangeLabel: ComputedRef<string>
  /** 折叠态 7 格胶囊 */
  compactDays: ComputedRef<CompactDayView[]>
  /** 折叠态 summary 胶囊（最多 3 条） */
  summaryEvents: ComputedRef<SummaryEventView[]>
  /** 展开态 42 格月视图 */
  monthCells: ComputedRef<MonthCellView[]>
  /** 当前周事件列表（含距离标签） */
  calendarItems: ComputedRef<CalendarItemView[]>
  /** 当前显示窗口（供页面层 emit 'range-change'） */
  currentRange: ComputedRef<CalendarRange>
  /** 切月：+1 下一月 / -1 上一月（月模式下生效） */
  shiftMonth: (offset: number) => void
  /** 切周：+1 下一周 / -1 上一周（周模式下生效） */
  shiftWeek: (offset: number) => void
  /** 切换视图模式（'month' | 'week'）；切换时偏移归零 */
  setViewMode: (mode: CalendarViewMode) => void
}

export function useInterviewCalendar(
  events: MaybeRefOrGetter<InterviewEvent[]>,
  options: UseInterviewCalendarOptions = {},
): UseInterviewCalendarReturn {
  const t: TFunc = options.t ?? defaultT()
  const viewMode = ref<CalendarViewMode>('month')
  const monthOffset = ref(0)
  const weekOffset = ref(0)

  function shiftMonth(offset: number) {
    monthOffset.value += offset
  }

  function shiftWeek(offset: number) {
    weekOffset.value += offset
  }

  function setViewMode(mode: CalendarViewMode) {
    if (mode === viewMode.value) return
    viewMode.value = mode
    monthOffset.value = 0
    weekOffset.value = 0
  }

  /** 锚点日期：
   * - month 模式：当月（offset=0）= 今天；其他月 = 该月 1 号
   * - week  模式：基于今天 + weekOffset 周
   */
  const currentMonthDate = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (viewMode.value === 'week') {
      // 周模式下，月视图锚点跟随当前周所在月
      return addDays(getMondayWeekStart(today), weekOffset.value * 7)
    }
    if (monthOffset.value === 0) return today
    const m = addMonths(today, monthOffset.value)
    return new Date(m.getFullYear(), m.getMonth(), 1)
  })

  /**
   * 折叠态/事件列表的「该周」起点：
   * - month 模式：兼容旧行为 = 锚点日期所在周的「周日」（与历史 SSOT 一致）
   * - week  模式：按周一为起点（中文习惯）
   */
  const weekStartDate = computed(() => {
    if (viewMode.value === 'week') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return addDays(getMondayWeekStart(today), weekOffset.value * 7)
    }
    const d = new Date(currentMonthDate.value)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  const weekEndDate = computed(() => {
    const start = weekStartDate.value
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return end
  })

  const currentMonthLabel = computed(() =>
    t('common.shared.calendar.monthLabel', { month: currentMonthDate.value.getMonth() + 1 }),
  )

  const currentWeekLabel = computed(() => {
    const start = weekStartDate.value
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return t('common.shared.calendar.weekRangeLabel', {
      m1: start.getMonth() + 1,
      d1: start.getDate(),
      m2: end.getMonth() + 1,
      d2: end.getDate(),
    })
  })

  const currentRangeLabel = computed(() =>
    viewMode.value === 'week' ? currentWeekLabel.value : currentMonthLabel.value,
  )

  const currentRange = computed<CalendarRange>(() => {
    if (viewMode.value === 'week') {
      return {
        start: new Date(weekStartDate.value),
        end: new Date(weekEndDate.value),
        mode: 'week',
      }
    }
    const anchor = currentMonthDate.value
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    return { start, end, mode: 'month' }
  })

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
        weekday: t(WEEKDAY_SHORT_KEYS[day.getDay()]),
        date: String(day.getDate()),
        tagColor,
        tagStyle,
      }
    })
  })

  const summaryEvents = computed<SummaryEventView[]>(() => {
    const weekStart = weekStartDate.value
    const weekStartIso = localIsoDate(weekStart)
    const weekEnd = weekEndDate.value
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
        student: r.studentName || '',
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
    const weekEnd = weekEndDate.value
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
          tag = t('common.shared.calendar.relativeDay.past')
          tone = 'default'
        } else if (daysDiff === 0) {
          tag = t('common.shared.calendar.relativeDay.today')
          tone = 'today'
        } else {
          if (daysDiff === 1) tag = t('common.shared.calendar.relativeDay.tomorrow')
          else if (daysDiff === 2) tag = t('common.shared.calendar.relativeDay.dayAfter')
          else tag = t('common.shared.calendar.relativeDay.nDaysLater', { n: daysDiff })
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
          weekday: t(WEEKDAY_FULL_KEYS[d.getDay()]),
          dateNum: String(d.getDate()),
        }
      })
  })

  return {
    viewMode,
    monthOffset,
    weekOffset,
    currentMonthLabel,
    currentWeekLabel,
    currentRangeLabel,
    compactDays,
    summaryEvents,
    monthCells,
    calendarItems,
    currentRange,
    shiftMonth,
    shiftWeek,
    setViewMode,
  }
}

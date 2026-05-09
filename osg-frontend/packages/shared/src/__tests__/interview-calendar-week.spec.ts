/**
 * T14 测试：useInterviewCalendar 周切换分支
 *
 * 覆盖目标：
 * 1. 默认 viewMode='month'，currentRangeLabel 显示 "X月"
 * 2. setViewMode('week') 后偏移归零，currentRangeLabel 显示周区间
 * 3. shiftWeek(±N) 改变 weekOffset，currentRange.start 步进 7N 天
 * 4. 周起点为周一（中文习惯）
 * 5. month 模式下 shiftMonth/shiftWeek 互不影响
 * 6. setViewMode 切换时偏移归零
 * 7. currentRange.mode 与 viewMode 同步
 * 8. 周模式下 calendarItems 仅含当周事件
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useInterviewCalendar } from '../composables/useInterviewCalendar'
import type { InterviewEvent } from '../types/interviewCalendar'

/**
 * 固定 "今天" 为 2026-05-08（周五），方便周一为 5/4 的边界推演。
 * 周日 5/3、周一 5/4、周二 5/5 …… 周日 5/10
 */
const FIXED_NOW = new Date(2026, 4, 8, 10, 0, 0) // 2026-05-08 10:00:00

describe('useInterviewCalendar - week mode (T14)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认 viewMode=month，标题显示 X月', () => {
    const events = ref<InterviewEvent[]>([])
    const { viewMode, currentRangeLabel, currentMonthLabel } = useInterviewCalendar(events)
    expect(viewMode.value).toBe('month')
    expect(currentRangeLabel.value).toBe('5月')
    expect(currentMonthLabel.value).toBe('5月')
  })

  it('setViewMode("week") 切到周模式，标题为 "X月Y日 ~ X月Y日"，且周起点为周一', () => {
    const events = ref<InterviewEvent[]>([])
    const { viewMode, setViewMode, currentRangeLabel, currentWeekLabel, currentRange } =
      useInterviewCalendar(events)

    setViewMode('week')

    expect(viewMode.value).toBe('week')
    // 2026-05-08 是周五，周一为 5-04
    expect(currentRange.value.mode).toBe('week')
    expect(currentRange.value.start.getDay()).toBe(1) // 周一
    expect(currentRange.value.start.getDate()).toBe(4)
    expect(currentRange.value.start.getMonth()).toBe(4)
    // end 是半开区间 = start + 7 天
    expect(currentRange.value.end.getDate()).toBe(11)
    // 标签 "5月4日 ~ 5月10日"
    expect(currentWeekLabel.value).toBe('5月4日 ~ 5月10日')
    expect(currentRangeLabel.value).toBe(currentWeekLabel.value)
  })

  it('shiftWeek(+1) / shiftWeek(-1) 切下/上一周（步进 7 天）', () => {
    const events = ref<InterviewEvent[]>([])
    const { setViewMode, shiftWeek, weekOffset, currentRange } = useInterviewCalendar(events)
    setViewMode('week')

    expect(weekOffset.value).toBe(0)
    expect(currentRange.value.start.getDate()).toBe(4) // 本周一 5/4

    shiftWeek(1)
    expect(weekOffset.value).toBe(1)
    expect(currentRange.value.start.getDate()).toBe(11) // 下周一 5/11

    shiftWeek(-2)
    expect(weekOffset.value).toBe(-1)
    expect(currentRange.value.start.getDate()).toBe(27) // 上周一 4/27（跨月）
    expect(currentRange.value.start.getMonth()).toBe(3) // 4 月
  })

  it('setViewMode 切换时，monthOffset 与 weekOffset 都归零', () => {
    const events = ref<InterviewEvent[]>([])
    const {
      setViewMode,
      shiftMonth,
      shiftWeek,
      monthOffset,
      weekOffset,
    } = useInterviewCalendar(events)

    shiftMonth(2)
    expect(monthOffset.value).toBe(2)

    setViewMode('week')
    // 切到 week，offset 归零
    expect(monthOffset.value).toBe(0)
    expect(weekOffset.value).toBe(0)

    shiftWeek(3)
    expect(weekOffset.value).toBe(3)

    setViewMode('month')
    expect(monthOffset.value).toBe(0)
    expect(weekOffset.value).toBe(0)
  })

  it('setViewMode 传入相同模式时，不重置偏移（早返回分支）', () => {
    const events = ref<InterviewEvent[]>([])
    const { setViewMode, shiftMonth, monthOffset } = useInterviewCalendar(events)

    shiftMonth(3)
    expect(monthOffset.value).toBe(3)

    setViewMode('month') // 与当前一致
    expect(monthOffset.value).toBe(3) // 不应被清零
  })

  it('month 模式下 currentRange = [当月1号, 下月1号)', () => {
    const events = ref<InterviewEvent[]>([])
    const { currentRange, shiftMonth } = useInterviewCalendar(events)

    expect(currentRange.value.mode).toBe('month')
    expect(currentRange.value.start.getDate()).toBe(1)
    expect(currentRange.value.start.getMonth()).toBe(4) // 5 月（基础月）
    expect(currentRange.value.end.getMonth()).toBe(5) // 6 月

    shiftMonth(1)
    expect(currentRange.value.start.getMonth()).toBe(5) // 6 月
    expect(currentRange.value.end.getMonth()).toBe(6) // 7 月
  })

  it('周模式下 calendarItems 仅包含当周事件', () => {
    const events = ref<InterviewEvent[]>([
      { id: 1, interviewTime: '2026-05-04 10:00:00', studentName: 'A' }, // 本周
      { id: 2, interviewTime: '2026-05-08 14:00:00', studentName: 'B' }, // 本周
      { id: 3, interviewTime: '2026-05-15 09:00:00', studentName: 'C' }, // 下周
      { id: 4, interviewTime: '2026-04-30 09:00:00', studentName: 'D' }, // 上周
    ])
    const { setViewMode, calendarItems, shiftWeek } = useInterviewCalendar(events)
    setViewMode('week')

    const ids = calendarItems.value.map((i) => i.id).sort()
    expect(ids).toEqual([1, 2])

    shiftWeek(1)
    const nextIds = calendarItems.value.map((i) => i.id).sort()
    expect(nextIds).toEqual([3])
  })

  it('周一为「今天」时（边界），周起点 = 今天本身（不向前回退）', () => {
    // 2026-05-04 是周一
    vi.setSystemTime(new Date(2026, 4, 4, 9, 0, 0))
    const events = ref<InterviewEvent[]>([])
    const { setViewMode, currentRange } = useInterviewCalendar(events)
    setViewMode('week')

    expect(currentRange.value.start.getDay()).toBe(1) // 周一
    expect(currentRange.value.start.getDate()).toBe(4)
  })

  it('周日为「今天」时（边界），周起点回退 6 天', () => {
    // 2026-05-10 是周日
    vi.setSystemTime(new Date(2026, 4, 10, 23, 0, 0))
    const events = ref<InterviewEvent[]>([])
    const { setViewMode, currentRange } = useInterviewCalendar(events)
    setViewMode('week')

    expect(currentRange.value.start.getDay()).toBe(1) // 周一
    expect(currentRange.value.start.getDate()).toBe(4) // 5/4 而不是 5/11
  })

  it('viewMode 同步反映在 currentRange.mode 上', () => {
    const events = ref<InterviewEvent[]>([])
    const { setViewMode, currentRange } = useInterviewCalendar(events)
    expect(currentRange.value.mode).toBe('month')

    setViewMode('week')
    expect(currentRange.value.mode).toBe('week')

    setViewMode('month')
    expect(currentRange.value.mode).toBe('month')
  })

  it('shiftWeek/shiftMonth 不互相干扰（独立 ref）', () => {
    const events = ref<InterviewEvent[]>([])
    const { shiftMonth, shiftWeek, monthOffset, weekOffset } = useInterviewCalendar(events)

    shiftMonth(1)
    shiftWeek(2)
    expect(monthOffset.value).toBe(1)
    expect(weekOffset.value).toBe(2)
  })

  it('events 含 falsy interviewTime 的记录会被过滤（短路覆盖）', () => {
    const events = ref<InterviewEvent[]>([
      { id: 1, interviewTime: '', studentName: 'A' },
      { id: 2, interviewTime: '2026-05-08 14:00:00', studentName: 'B' },
      { id: 3, studentName: 'C' }, // 没有 interviewTime
    ])
    const { setViewMode, calendarItems } = useInterviewCalendar(events)
    setViewMode('week')

    expect(calendarItems.value.map((i) => i.id)).toEqual([2])
  })
})

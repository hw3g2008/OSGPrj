/**
 * useInterviewCalendar 单元测试
 * 放在 assistant 端 __tests__（shared 包自身暂无 vitest 环境；assistant 的 vitest 已别名 @osg/shared）
 */
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInterviewCalendar } from '@osg/shared'
import type { InterviewEvent } from '@osg/shared'

// 固定"今天" = 2026-04-23（周四）以使断言稳定
const FIXED_TODAY = new Date(2026, 3, 23, 10, 0, 0)

describe('useInterviewCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TODAY)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认 monthOffset=0，月份标签 = 当前月', () => {
    const { monthOffset, currentMonthLabel } = useInterviewCalendar(ref<InterviewEvent[]>([]))
    expect(monthOffset.value).toBe(0)
    expect(currentMonthLabel.value).toBe('4月')
  })

  it('compactDays 返回 7 格，当月时今天（4/23）有深蓝 tagStyle', () => {
    const { compactDays } = useInterviewCalendar(ref<InterviewEvent[]>([]))
    expect(compactDays.value.length).toBe(7)
    // 本周周日 = 4/19，周六 = 4/25
    expect(compactDays.value[0].date).toBe('19')
    expect(compactDays.value[6].date).toBe('25')
    // 今天 4/23 = 周四 = 第 5 格（index 4），tagStyle.background 应为深蓝
    const today = compactDays.value[4]
    expect(today.date).toBe('23')
    expect(today.tagStyle.background).toBe('var(--primary)')
    expect(today.tagStyle.color).toBe('#fff')
  })

  it('shiftMonth(+1) 切到 5 月：折叠态 = 5/1 所在周（4/26-5/2），无今天高亮', () => {
    const { shiftMonth, currentMonthLabel, compactDays } = useInterviewCalendar(
      ref<InterviewEvent[]>([]),
    )
    shiftMonth(1)
    expect(currentMonthLabel.value).toBe('5月')
    expect(compactDays.value[0].date).toBe('26')
    expect(compactDays.value[6].date).toBe('2')
    // 没有一格是今天（tagStyle.background 应都不是 primary）
    expect(compactDays.value.every((d) => d.tagStyle.background !== 'var(--primary)')).toBe(true)
  })

  it('shiftMonth(-1) + shiftMonth(+1) 应恢复到 monthOffset=0', () => {
    const { shiftMonth, monthOffset } = useInterviewCalendar(ref<InterviewEvent[]>([]))
    shiftMonth(-1)
    expect(monthOffset.value).toBe(-1)
    shiftMonth(1)
    expect(monthOffset.value).toBe(0)
  })

  it('monthCells 返回 42 格且第一格为月首所在周的周日', () => {
    const { monthCells } = useInterviewCalendar(ref<InterviewEvent[]>([]))
    expect(monthCells.value.length).toBe(42)
    // 4 月 1 号是周三，所在周的周日 = 3/29
    expect(monthCells.value[0].label).toBe('29')
    expect(monthCells.value[0].isCurrentMonth).toBe(false)
    // 4 月 23 是今天，tone = today
    const today = monthCells.value.find((c) => c.iso === '2026-04-23')
    expect(today?.tone).toBe('today')
    expect(today?.isCurrentMonth).toBe(true)
  })

  it('4 态色彩派生：面试事件 → danger，辅导事件 → info', () => {
    const events: InterviewEvent[] = [
      {
        id: 1,
        interviewTime: '2026-04-20 10:00:00',
        studentName: '张三',
        coachingStatus: 'interview', // 非辅导 → 面试 danger
      },
      {
        id: 2,
        interviewTime: '2026-04-22 14:00:00',
        studentName: '李四',
        coachingStatus: '辅导中', // 辅导 info
      },
    ]
    const { monthCells, compactDays } = useInterviewCalendar(ref(events))

    // monthCells: 4/20 → danger，4/22 → info
    const c20 = monthCells.value.find((c) => c.iso === '2026-04-20')
    const c22 = monthCells.value.find((c) => c.iso === '2026-04-22')
    expect(c20?.tone).toBe('danger')
    expect(c22?.tone).toBe('info')

    // compactDays: 周一(4/20) = 面试 red，周三(4/22) = 辅导 processing
    const mon = compactDays.value[1]
    const wed = compactDays.value[3]
    expect(mon.date).toBe('20')
    expect(mon.tagColor).toBe('red')
    expect(wed.date).toBe('22')
    expect(wed.tagColor).toBe('processing')
  })

  it('calendarItems 距离标签：已过 / 今天 / 明天 / 后天 / N天后', () => {
    const events: InterviewEvent[] = [
      { id: 1, interviewTime: '2026-04-20 10:00:00', studentName: '甲', coachingStatus: '' }, // 已过
      { id: 2, interviewTime: '2026-04-23 10:00:00', studentName: '乙', coachingStatus: '' }, // 今天
      { id: 3, interviewTime: '2026-04-24 10:00:00', studentName: '丙', coachingStatus: '' }, // 明天
      { id: 4, interviewTime: '2026-04-25 10:00:00', studentName: '丁', coachingStatus: '' }, // 后天
    ]
    const { calendarItems } = useInterviewCalendar(ref(events))
    expect(calendarItems.value.length).toBe(4)
    expect(calendarItems.value[0].tag).toBe('已过')
    expect(calendarItems.value[0].tone).toBe('default')
    expect(calendarItems.value[1].tag).toBe('今天')
    expect(calendarItems.value[1].tone).toBe('today')
    expect(calendarItems.value[2].tag).toBe('明天')
    expect(calendarItems.value[3].tag).toBe('后天')
  })

  it('calendarItems 只返回本周事件，跨周事件不纳入', () => {
    const events: InterviewEvent[] = [
      { id: 1, interviewTime: '2026-04-15 10:00:00', studentName: '上周', coachingStatus: '' }, // 上周
      { id: 2, interviewTime: '2026-04-22 10:00:00', studentName: '本周', coachingStatus: '' }, // 本周
      { id: 3, interviewTime: '2026-04-28 10:00:00', studentName: '下周', coachingStatus: '' }, // 下周
    ]
    const { calendarItems } = useInterviewCalendar(ref(events))
    expect(calendarItems.value.length).toBe(1)
    expect(calendarItems.value[0].studentName).toBe('本周')
  })

  it('summaryEvents 最多 3 条且按时间升序', () => {
    const events: InterviewEvent[] = [
      { id: 1, interviewTime: '2026-04-22 14:00:00', studentName: 'B', coachingStatus: '' },
      { id: 2, interviewTime: '2026-04-20 10:00:00', studentName: 'A', coachingStatus: '' },
      { id: 3, interviewTime: '2026-04-24 10:00:00', studentName: 'C', coachingStatus: '' },
      { id: 4, interviewTime: '2026-04-25 10:00:00', studentName: 'D', coachingStatus: '' },
    ]
    const { summaryEvents } = useInterviewCalendar(ref(events))
    expect(summaryEvents.value.length).toBe(3)
    expect(summaryEvents.value[0].student).toBe('A')
    expect(summaryEvents.value[1].student).toBe('B')
    expect(summaryEvents.value[2].student).toBe('C')
  })
})

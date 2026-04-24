/**
 * <InterviewCalendar> 组件单测
 */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InterviewCalendar } from '@osg/shared'
import type { InterviewEvent } from '@osg/shared'

const FIXED_TODAY = new Date(2026, 3, 23, 10, 0, 0)

describe('<InterviewCalendar>', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TODAY)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('默认渲染折叠态，展开按钮文案为"展开"', () => {
    const wrapper = mount(InterviewCalendar, {
      props: { events: [] },
    })
    // 折叠态 toolbar 存在
    expect(wrapper.find('.osg-ic__toolbar').exists()).toBe(true)
    // 月视图不存在
    expect(wrapper.find('.osg-ic__month-view').exists()).toBe(false)
    // 按钮文案
    expect(wrapper.find('.osg-ic__toggle').text()).toContain('展开')
  })

  it('showMonthNav=true 默认展示左右箭头，false 隐藏', async () => {
    const w1 = mount(InterviewCalendar, { props: { events: [] } })
    expect(w1.findAll('.osg-ic__month-arrow').length).toBe(2)

    const w2 = mount(InterviewCalendar, {
      props: { events: [], showMonthNav: false },
    })
    expect(w2.findAll('.osg-ic__month-arrow').length).toBe(0)
    // 但月份文字仍然应该展示
    expect(w2.find('.osg-ic__month').text()).toBe('4月')
  })

  it('点击展开按钮切换到展开态，渲染 42 格 + 本周事件列表', async () => {
    const wrapper = mount(InterviewCalendar, { props: { events: [] } })
    await wrapper.find('.osg-ic__toggle').trigger('click')
    expect(wrapper.find('.osg-ic__month-view').exists()).toBe(true)
    expect(wrapper.findAll('.osg-ic__month-cell').length).toBe(42)
    expect(wrapper.find('.osg-ic__week-title').text()).toContain('本周学员面试安排')
    // 空数据 → 空态提示
    expect(wrapper.find('.osg-ic__week-empty').text()).toContain('本周暂无')
  })

  it('defaultExpanded=true 首次渲染即为展开态', () => {
    const wrapper = mount(InterviewCalendar, {
      props: { events: [], defaultExpanded: true },
    })
    expect(wrapper.find('.osg-ic__month-view').exists()).toBe(true)
    expect(wrapper.find('.osg-ic__toggle').text()).toContain('收起')
  })

  it('点击月份箭头触发 month-change emit', async () => {
    const wrapper = mount(InterviewCalendar, { props: { events: [] } })
    const arrows = wrapper.findAll('.osg-ic__month-arrow')
    await arrows[1].trigger('click') // ▶ 下一月
    const emitted = wrapper.emitted('month-change')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([1])
    // 月份文字也应更新
    expect(wrapper.find('.osg-ic__month').text()).toBe('5月')
  })

  it('点击事件卡触发 event-click emit，携带事件数据', async () => {
    const events: InterviewEvent[] = [
      {
        id: 42,
        interviewTime: '2026-04-23 14:00:00',
        studentName: '张三',
        company: '字节',
      },
    ]
    const wrapper = mount(InterviewCalendar, {
      props: { events, defaultExpanded: true },
    })
    const card = wrapper.find('.osg-ic__week-card')
    expect(card.exists()).toBe(true)
    await card.trigger('click')
    const emitted = wrapper.emitted('event-click')
    expect(emitted).toBeTruthy()
    expect((emitted?.[0][0] as InterviewEvent).id).toBe(42)
  })
})

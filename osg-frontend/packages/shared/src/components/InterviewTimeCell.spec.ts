/**
 * InterviewTimeCell unit tests（M1.1.5）
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import InterviewTimeCell from './InterviewTimeCell.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('InterviewTimeCell', () => {
  it('1. time 有值 → 渲染 time + 不渲染 fallback', () => {
    wrapper = mount(InterviewTimeCell, { props: { time: '10/15 14:30' } })
    expect(wrapper.find('.interview-time-cell__time').text()).toBe(
      '10/15 14:30',
    )
    expect(wrapper.find('.interview-time-cell__empty').exists()).toBe(false)
  })

  it('2. time 空 → 渲染 fallback', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: '', fallback: '-' },
    })
    expect(wrapper.find('.interview-time-cell__empty').text()).toBe('-')
    expect(wrapper.find('.interview-time-cell').exists()).toBe(false)
  })

  it('3. time null → 渲染 fallback', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: null, fallback: '未安排' },
    })
    expect(wrapper.find('.interview-time-cell__empty').text()).toBe('未安排')
  })

  it('4. fallback 默认值 = "-"', () => {
    wrapper = mount(InterviewTimeCell, { props: { time: '' } })
    expect(wrapper.find('.interview-time-cell__empty').text()).toBe('-')
  })

  it('5. hint 有值 → 渲染 hint', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: '10/15', hint: '还剩 5 天' },
    })
    expect(wrapper.find('.interview-time-cell__hint').text()).toBe('还剩 5 天')
  })

  it('6. hint 空 → 不渲染 hint 行', () => {
    wrapper = mount(InterviewTimeCell, { props: { time: '10/15', hint: '' } })
    expect(wrapper.find('.interview-time-cell__hint').exists()).toBe(false)
  })

  it('7. emphasizeOverdue=true → time 加 danger class', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: '10/15', emphasizeOverdue: true },
    })
    expect(
      wrapper.find('.interview-time-cell__time--danger').exists(),
    ).toBe(true)
  })

  it('8. emphasizeOverdue=false（默认）→ 不加 danger class', () => {
    wrapper = mount(InterviewTimeCell, { props: { time: '10/15' } })
    expect(
      wrapper.find('.interview-time-cell__time--danger').exists(),
    ).toBe(false)
  })

  it('9. time 仅空白 → 视为空，渲染 fallback', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: '   ', fallback: '-' },
    })
    expect(wrapper.find('.interview-time-cell__empty').text()).toBe('-')
  })

  it('10. emphasizeOverdue + hint 同时 → 都生效', () => {
    wrapper = mount(InterviewTimeCell, {
      props: { time: '10/15', hint: '已过期', emphasizeOverdue: true },
    })
    expect(
      wrapper.find('.interview-time-cell__time--danger').exists(),
    ).toBe(true)
    expect(wrapper.find('.interview-time-cell__hint').text()).toBe('已过期')
  })
})

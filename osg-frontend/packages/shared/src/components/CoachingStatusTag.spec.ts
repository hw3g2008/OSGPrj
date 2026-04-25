/**
 * CoachingStatusTag unit tests（M1.1.2）
 *
 * SSOT：以 Assistant coachingColor() 为基准 + Mentor enum 兼容
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'

import CoachingStatusTag from './CoachingStatusTag.vue'
import { resolveCoachingStatusColor } from '../utils/jobOverviewTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('resolveCoachingStatusColor (utility)', () => {
  it('1. 辅导中 → purple', () => {
    expect(resolveCoachingStatusColor('辅导中')).toBe('purple')
  })

  it('2. coaching → purple (lowercase enum)', () => {
    expect(resolveCoachingStatusColor('coaching')).toBe('purple')
  })

  it('3. 待审批 → orange', () => {
    expect(resolveCoachingStatusColor('待审批')).toBe('orange')
  })

  it('4. pending → orange', () => {
    expect(resolveCoachingStatusColor('pending')).toBe('orange')
  })

  it('5. 新申请 → red', () => {
    expect(resolveCoachingStatusColor('新申请')).toBe('red')
  })

  it('6. new → red', () => {
    expect(resolveCoachingStatusColor('new')).toBe('red')
  })

  it('7. 未知值 → default', () => {
    expect(resolveCoachingStatusColor('completed')).toBe('default')
  })

  it('8. 空字符串 → default', () => {
    expect(resolveCoachingStatusColor('')).toBe('default')
  })

  it('9. null → default', () => {
    expect(resolveCoachingStatusColor(null)).toBe('default')
  })

  it('10. undefined → default', () => {
    expect(resolveCoachingStatusColor(undefined)).toBe('default')
  })
})

describe('CoachingStatusTag (component)', () => {
  it('11. 空状态 → 显示 fallback 文本，不显示 a-tag', () => {
    wrapper = mount(CoachingStatusTag, { props: { status: '', fallback: '未申请' } })
    expect(wrapper.text()).toContain('未申请')
    expect(wrapper.find('.ant-tag').exists()).toBe(false)
  })

  it('12. 有状态 → 渲染 a-tag 且不是 fallback', () => {
    wrapper = mount(CoachingStatusTag, { props: { status: '辅导中' } })
    expect(wrapper.text()).toContain('辅导中')
    expect(wrapper.find('.coaching-status-tag-empty').exists()).toBe(false)
  })

  it('13. textMode=raw（默认）→ 显示原值', () => {
    wrapper = mount(CoachingStatusTag, { props: { status: 'new' } })
    expect(wrapper.text().trim()).toBe('new')
  })

  it('14. textMode=normalized + new → 显示 "新申请"', () => {
    wrapper = mount(CoachingStatusTag, {
      props: { status: 'new', textMode: 'normalized' },
    })
    expect(wrapper.text().trim()).toBe('新申请')
  })

  it('15. textMode=normalized + coaching → 显示 "辅导中"', () => {
    wrapper = mount(CoachingStatusTag, {
      props: { status: 'coaching', textMode: 'normalized' },
    })
    expect(wrapper.text().trim()).toBe('辅导中')
  })

  it('16. textMode=normalized + 中文原值（非映射 enum）→ 直接显示原值', () => {
    wrapper = mount(CoachingStatusTag, {
      props: { status: '辅导中', textMode: 'normalized' },
    })
    expect(wrapper.text().trim()).toBe('辅导中')
  })

  it('17. icon slot — stub a-tag 后能转发 icon slot', () => {
    wrapper = mount(CoachingStatusTag, {
      props: { status: 'new', textMode: 'normalized' },
      slots: {
        icon: () => h('span', { class: 'test-icon' }, '🔔'),
      },
      global: {
        stubs: {
          'a-tag': {
            template: '<div class="stub-tag"><slot name="icon" />[<slot />]</div>',
          },
        },
      },
    })
    expect(wrapper.find('.test-icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('🔔')
    expect(wrapper.text()).toContain('新申请')
  })

  it('18. fallback 默认值 = "-"', () => {
    wrapper = mount(CoachingStatusTag, { props: { status: '' } })
    expect(wrapper.text()).toContain('-')
  })
})

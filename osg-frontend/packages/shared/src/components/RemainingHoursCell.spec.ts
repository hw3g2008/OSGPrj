/**
 * RemainingHoursCell unit tests
 *
 * SSOT：原型 prototype/assistant.html students 列表「剩余课时」列
 * 三态：success (≥8h) / warning (>0h<8h) / muted (=0h / null)
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import RemainingHoursCell from './RemainingHoursCell.vue'
import {
  resolveRemainingHoursToneClass,
  formatRemainingHours,
} from '../utils/studentTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('resolveRemainingHoursToneClass (utility)', () => {
  it('1. value=8 → success（边界 ≥8h）', () => {
    expect(resolveRemainingHoursToneClass(8)).toBe('osg-remaining-hours-cell--success')
  })

  it('2. value=15 → success（充足）', () => {
    expect(resolveRemainingHoursToneClass(15)).toBe('osg-remaining-hours-cell--success')
  })

  it('3. value=8.5 → success（小数 ≥8h）', () => {
    expect(resolveRemainingHoursToneClass(8.5)).toBe('osg-remaining-hours-cell--success')
  })

  it('4. value=2.5 → warning（>0h<8h）', () => {
    expect(resolveRemainingHoursToneClass(2.5)).toBe('osg-remaining-hours-cell--warning')
  })

  it('5. value=7.99 → warning（边界 <8h）', () => {
    expect(resolveRemainingHoursToneClass(7.99)).toBe('osg-remaining-hours-cell--warning')
  })

  it('6. value=0.1 → warning（>0h 极小值）', () => {
    expect(resolveRemainingHoursToneClass(0.1)).toBe('osg-remaining-hours-cell--warning')
  })

  it('7. value=0 → muted（已耗尽）', () => {
    expect(resolveRemainingHoursToneClass(0)).toBe('osg-remaining-hours-cell--muted')
  })

  it('8. value=null / undefined / NaN → muted (fallback)', () => {
    expect(resolveRemainingHoursToneClass(null)).toBe('osg-remaining-hours-cell--muted')
    expect(resolveRemainingHoursToneClass(undefined)).toBe('osg-remaining-hours-cell--muted')
    expect(resolveRemainingHoursToneClass(NaN)).toBe('osg-remaining-hours-cell--muted')
  })

  it('9. value=负数 → muted (fallback)', () => {
    expect(resolveRemainingHoursToneClass(-5)).toBe('osg-remaining-hours-cell--muted')
  })

  it('10. value=string "12" → success (容错)', () => {
    expect(resolveRemainingHoursToneClass('12')).toBe('osg-remaining-hours-cell--success')
  })

  it('11. value=string "abc" → muted (NaN fallback)', () => {
    expect(resolveRemainingHoursToneClass('abc')).toBe('osg-remaining-hours-cell--muted')
  })
})

describe('formatRemainingHours (utility)', () => {
  it('12. 整数 → Nh', () => {
    expect(formatRemainingHours(8)).toBe('8h')
    expect(formatRemainingHours(0)).toBe('0h')
    expect(formatRemainingHours(15)).toBe('15h')
  })

  it('13. 小数 → N.Nh (toFixed(1))', () => {
    expect(formatRemainingHours(2.5)).toBe('2.5h')
    expect(formatRemainingHours(8.5)).toBe('8.5h')
    expect(formatRemainingHours(7.99)).toBe('8.0h')
  })

  it('14. null / undefined / NaN → "0h"', () => {
    expect(formatRemainingHours(null)).toBe('0h')
    expect(formatRemainingHours(undefined)).toBe('0h')
    expect(formatRemainingHours(NaN)).toBe('0h')
  })

  it('15. string "5.5" → "5.5h"', () => {
    expect(formatRemainingHours('5.5')).toBe('5.5h')
  })
})

describe('RemainingHoursCell (component)', () => {
  it('16. hours=15 → 渲染 "15h" + success class', () => {
    wrapper = mount(RemainingHoursCell, { props: { hours: 15 } })
    expect(wrapper.text().trim()).toBe('15h')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell--success')
  })

  it('17. hours=2.5 → 渲染 "2.5h" + warning class', () => {
    wrapper = mount(RemainingHoursCell, { props: { hours: 2.5 } })
    expect(wrapper.text().trim()).toBe('2.5h')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell--warning')
  })

  it('18. hours=0 → 渲染 "0h" + muted class', () => {
    wrapper = mount(RemainingHoursCell, { props: { hours: 0 } })
    expect(wrapper.text().trim()).toBe('0h')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell--muted')
  })

  it('19. hours=null → 渲染 "0h" + muted class', () => {
    wrapper = mount(RemainingHoursCell, { props: { hours: null } })
    expect(wrapper.text().trim()).toBe('0h')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell--muted')
  })

  it('20. label prop 覆盖默认文案', () => {
    wrapper = mount(RemainingHoursCell, {
      props: { hours: 15, label: '充足' },
    })
    expect(wrapper.text().trim()).toBe('充足')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell--success')
  })

  it('21. 渲染元素是 strong（语义正确）', () => {
    wrapper = mount(RemainingHoursCell, { props: { hours: 15 } })
    expect(wrapper.element.tagName).toBe('STRONG')
    expect(wrapper.classes()).toContain('osg-remaining-hours-cell')
  })
})

/**
 * PositionsFooter unit tests
 *
 * 验证组件能正确渲染 4 项统计：总数 / 开放中 / 已关闭 / 我的学员
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PositionsFooter from './PositionsFooter.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('PositionsFooter', () => {
  it('1. 渲染 4 项统计文案与数值', () => {
    wrapper = mount(PositionsFooter, {
      props: { total: 12, open: 10, closed: 2, students: 8 },
    })
    const text = wrapper.text()
    expect(text).toMatch(/共\s*12\s*个岗位/)
    expect(text).toContain('开放中 10')
    expect(text).toContain('已关闭 2')
    expect(text).toContain('我的学员 8人')
  })

  it('2. 数值为 0 也应正常显示（不省略）', () => {
    wrapper = mount(PositionsFooter, {
      props: { total: 0, open: 0, closed: 0, students: 0 },
    })
    const text = wrapper.text()
    expect(text).toMatch(/共\s*0\s*个岗位/)
    expect(text).toContain('开放中 0')
    expect(text).toContain('已关闭 0')
    expect(text).toContain('我的学员 0人')
  })

  it('3. tone class 正确绑定（open/closed/students）', () => {
    wrapper = mount(PositionsFooter, {
      props: { total: 5, open: 3, closed: 2, students: 1 },
    })
    expect(wrapper.find('.osg-positions-footer__indicator--open').exists()).toBe(true)
    expect(wrapper.find('.osg-positions-footer__indicator--closed').exists()).toBe(true)
    expect(wrapper.find('.osg-positions-footer__indicator--students').exists()).toBe(true)
  })
})

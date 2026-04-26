/**
 * StudentStatusTag unit tests
 *
 * SSOT：以 Assistant + Lead-Mentor 共用 accountStatus enum 为基准
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import StudentStatusTag from './StudentStatusTag.vue'
import {
  resolveStudentStatusToneClass,
  resolveStudentStatusLabel,
} from '../utils/studentTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('resolveStudentStatusToneClass (utility)', () => {
  it('1. "1" → frozen (冻结)', () => {
    expect(resolveStudentStatusToneClass('1')).toBe('osg-student-status-tag--frozen')
  })

  it('2. "2" → ended (已结束)', () => {
    expect(resolveStudentStatusToneClass('2')).toBe('osg-student-status-tag--ended')
  })

  it('3. "3" → refunded (退款)', () => {
    expect(resolveStudentStatusToneClass('3')).toBe('osg-student-status-tag--refunded')
  })

  it('4. "0" → active (正常)', () => {
    expect(resolveStudentStatusToneClass('0')).toBe('osg-student-status-tag--active')
  })

  it('5. 空字符串 → active', () => {
    expect(resolveStudentStatusToneClass('')).toBe('osg-student-status-tag--active')
  })

  it('6. null → active', () => {
    expect(resolveStudentStatusToneClass(null)).toBe('osg-student-status-tag--active')
  })

  it('7. undefined → active', () => {
    expect(resolveStudentStatusToneClass(undefined)).toBe('osg-student-status-tag--active')
  })

  it('8. 含空白的 "1" → frozen (trim)', () => {
    expect(resolveStudentStatusToneClass(' 1 ')).toBe('osg-student-status-tag--frozen')
  })
})

describe('resolveStudentStatusLabel (utility)', () => {
  it('9. "1" → "冻结"', () => {
    expect(resolveStudentStatusLabel('1')).toBe('冻结')
  })

  it('10. "2" → "已结束"', () => {
    expect(resolveStudentStatusLabel('2')).toBe('已结束')
  })

  it('11. "3" → "退款"', () => {
    expect(resolveStudentStatusLabel('3')).toBe('退款')
  })

  it('12. 空 / null / undefined / "0" → "正常"', () => {
    expect(resolveStudentStatusLabel('')).toBe('正常')
    expect(resolveStudentStatusLabel(null)).toBe('正常')
    expect(resolveStudentStatusLabel(undefined)).toBe('正常')
    expect(resolveStudentStatusLabel('0')).toBe('正常')
  })
})

describe('StudentStatusTag (component)', () => {
  it('13. accountStatus="1" → 渲染 "冻结" + frozen class', () => {
    wrapper = mount(StudentStatusTag, { props: { accountStatus: '1' } })
    expect(wrapper.text().trim()).toBe('冻结')
    expect(wrapper.classes()).toContain('osg-student-status-tag--frozen')
  })

  it('14. accountStatus="2" → 渲染 "已结束" + ended class', () => {
    wrapper = mount(StudentStatusTag, { props: { accountStatus: '2' } })
    expect(wrapper.text().trim()).toBe('已结束')
    expect(wrapper.classes()).toContain('osg-student-status-tag--ended')
  })

  it('15. accountStatus="3" → 渲染 "退款" + refunded class', () => {
    wrapper = mount(StudentStatusTag, { props: { accountStatus: '3' } })
    expect(wrapper.text().trim()).toBe('退款')
    expect(wrapper.classes()).toContain('osg-student-status-tag--refunded')
  })

  it('16. accountStatus 空 → 渲染 "正常" + active class', () => {
    wrapper = mount(StudentStatusTag, { props: { accountStatus: '' } })
    expect(wrapper.text().trim()).toBe('正常')
    expect(wrapper.classes()).toContain('osg-student-status-tag--active')
  })

  it('17. label prop 覆盖默认文案', () => {
    wrapper = mount(StudentStatusTag, {
      props: { accountStatus: '1', label: '冻结中' },
    })
    expect(wrapper.text().trim()).toBe('冻结中')
    expect(wrapper.classes()).toContain('osg-student-status-tag--frozen')
  })

  it('18. label 是空白字符串 → 走默认文案（不被空 label 覆盖）', () => {
    wrapper = mount(StudentStatusTag, {
      props: { accountStatus: '1', label: '   ' },
    })
    expect(wrapper.text().trim()).toBe('冻结')
  })

  it('19. 渲染元素是 span（不是 a-tag）', () => {
    wrapper = mount(StudentStatusTag, { props: { accountStatus: '0' } })
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.classes()).toContain('osg-student-status-tag')
  })
})

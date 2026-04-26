/**
 * ClassRecordStatusTag unit tests
 *
 * SSOT：原型 prototype/assistant.html + lead-mentor.html 课程记录列表「审核状态」列
 * enum：pending / approved / rejected（三端完全一致）
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ClassRecordStatusTag from './ClassRecordStatusTag.vue'
import {
  normalizeClassRecordStatus,
  resolveClassRecordStatusToneClass,
  resolveClassRecordStatusLabel,
} from '../utils/classRecordTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('normalizeClassRecordStatus (utility)', () => {
  it('1. "approved" → approved', () => {
    expect(normalizeClassRecordStatus('approved')).toBe('approved')
  })

  it('2. "rejected" → rejected', () => {
    expect(normalizeClassRecordStatus('rejected')).toBe('rejected')
  })

  it('3. "pending" → pending', () => {
    expect(normalizeClassRecordStatus('pending')).toBe('pending')
  })

  it('4. 大写 "APPROVED" → approved (case-insensitive)', () => {
    expect(normalizeClassRecordStatus('APPROVED')).toBe('approved')
  })

  it('5. 含空白 "  rejected  " → rejected (trim)', () => {
    expect(normalizeClassRecordStatus('  rejected  ')).toBe('rejected')
  })

  it('6. 未知值 / 空 / null / undefined → pending (fallback)', () => {
    expect(normalizeClassRecordStatus('unknown')).toBe('pending')
    expect(normalizeClassRecordStatus('')).toBe('pending')
    expect(normalizeClassRecordStatus(null)).toBe('pending')
    expect(normalizeClassRecordStatus(undefined)).toBe('pending')
  })
})

describe('resolveClassRecordStatusToneClass (utility)', () => {
  it('7. "approved" → approved tone class', () => {
    expect(resolveClassRecordStatusToneClass('approved')).toBe(
      'osg-class-record-status-tag--approved',
    )
  })

  it('8. "rejected" → rejected tone class', () => {
    expect(resolveClassRecordStatusToneClass('rejected')).toBe(
      'osg-class-record-status-tag--rejected',
    )
  })

  it('9. "pending" → pending tone class', () => {
    expect(resolveClassRecordStatusToneClass('pending')).toBe(
      'osg-class-record-status-tag--pending',
    )
  })

  it('10. 未知值 / 空 → pending tone class (fallback)', () => {
    expect(resolveClassRecordStatusToneClass('unknown')).toBe(
      'osg-class-record-status-tag--pending',
    )
    expect(resolveClassRecordStatusToneClass('')).toBe(
      'osg-class-record-status-tag--pending',
    )
    expect(resolveClassRecordStatusToneClass(null)).toBe(
      'osg-class-record-status-tag--pending',
    )
  })
})

describe('resolveClassRecordStatusLabel (utility)', () => {
  it('11. "approved" → "已通过"', () => {
    expect(resolveClassRecordStatusLabel('approved')).toBe('已通过')
  })

  it('12. "rejected" → "已驳回"', () => {
    expect(resolveClassRecordStatusLabel('rejected')).toBe('已驳回')
  })

  it('13. "pending" → "待审核"', () => {
    expect(resolveClassRecordStatusLabel('pending')).toBe('待审核')
  })

  it('14. 未知值 / 空 → "待审核" (fallback)', () => {
    expect(resolveClassRecordStatusLabel('unknown')).toBe('待审核')
    expect(resolveClassRecordStatusLabel('')).toBe('待审核')
    expect(resolveClassRecordStatusLabel(null)).toBe('待审核')
    expect(resolveClassRecordStatusLabel(undefined)).toBe('待审核')
  })
})

describe('ClassRecordStatusTag (component)', () => {
  it('15. status="approved" → 渲染 "已通过" + approved class', () => {
    wrapper = mount(ClassRecordStatusTag, { props: { status: 'approved' } })
    expect(wrapper.text().trim()).toBe('已通过')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag--approved')
  })

  it('16. status="rejected" → 渲染 "已驳回" + rejected class', () => {
    wrapper = mount(ClassRecordStatusTag, { props: { status: 'rejected' } })
    expect(wrapper.text().trim()).toBe('已驳回')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag--rejected')
  })

  it('17. status="pending" → 渲染 "待审核" + pending class', () => {
    wrapper = mount(ClassRecordStatusTag, { props: { status: 'pending' } })
    expect(wrapper.text().trim()).toBe('待审核')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag--pending')
  })

  it('18. status 空 → fallback 到 pending', () => {
    wrapper = mount(ClassRecordStatusTag, { props: { status: '' } })
    expect(wrapper.text().trim()).toBe('待审核')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag--pending')
  })

  it('19. label prop 覆盖默认文案', () => {
    wrapper = mount(ClassRecordStatusTag, {
      props: { status: 'approved', label: '审核通过 ✓' },
    })
    expect(wrapper.text().trim()).toBe('审核通过 ✓')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag--approved')
  })

  it('20. label 是空白字符串 → 走默认文案（不被空 label 覆盖）', () => {
    wrapper = mount(ClassRecordStatusTag, {
      props: { status: 'approved', label: '   ' },
    })
    expect(wrapper.text().trim()).toBe('已通过')
  })

  it('21. 渲染元素是 span（不是 a-tag）', () => {
    wrapper = mount(ClassRecordStatusTag, { props: { status: 'approved' } })
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.classes()).toContain('osg-class-record-status-tag')
  })
})

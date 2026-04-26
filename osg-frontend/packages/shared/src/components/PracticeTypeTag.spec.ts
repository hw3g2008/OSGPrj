/**
 * PracticeTypeTag unit tests
 *
 * SSOT：原型 prototype/assistant.html + lead-mentor.html 模拟应聘列表「类型」列
 * 兼容英文 enum + 中文 label 输入
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PracticeTypeTag from './PracticeTypeTag.vue'
import {
  normalizePracticeType,
  resolvePracticeTypeToneClass,
  resolvePracticeTypeLabel,
  resolvePracticeTypeIcon,
} from '../utils/practiceTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('normalizePracticeType (utility)', () => {
  it('1. 英文 enum mock_interview → mock_interview', () => {
    expect(normalizePracticeType('mock_interview')).toBe('mock_interview')
  })

  it('2. 中文 label 模拟面试 → mock_interview', () => {
    expect(normalizePracticeType('模拟面试')).toBe('mock_interview')
  })

  it('3. 英文 enum relation_test → relation_test', () => {
    expect(normalizePracticeType('relation_test')).toBe('relation_test')
  })

  it('4. 中文 label 人际关系测试 → relation_test', () => {
    expect(normalizePracticeType('人际关系测试')).toBe('relation_test')
  })

  it('5. asst 独有 communication_test → communication_test', () => {
    expect(normalizePracticeType('communication_test')).toBe('communication_test')
    expect(normalizePracticeType('沟通测试')).toBe('communication_test')
  })

  it('6. midterm / midterm_exam / 期中考试 → midterm', () => {
    expect(normalizePracticeType('midterm')).toBe('midterm')
    expect(normalizePracticeType('midterm_exam')).toBe('midterm')
    expect(normalizePracticeType('期中考试')).toBe('midterm')
  })

  it('7. 大小写不敏感 + trim', () => {
    expect(normalizePracticeType('  MOCK_INTERVIEW  ')).toBe('mock_interview')
    expect(normalizePracticeType('Midterm_Exam')).toBe('midterm')
  })

  it('8. 未知 / 空 / null / undefined → unknown', () => {
    expect(normalizePracticeType('unknown')).toBe('unknown')
    expect(normalizePracticeType('')).toBe('unknown')
    expect(normalizePracticeType(null)).toBe('unknown')
    expect(normalizePracticeType(undefined)).toBe('unknown')
  })
})

describe('resolvePracticeTypeToneClass (utility)', () => {
  it('9. mock_interview → mock-interview tone', () => {
    expect(resolvePracticeTypeToneClass('mock_interview')).toBe(
      'osg-practice-type-tag--mock-interview',
    )
  })

  it('10. relation_test / communication_test → relation-test tone', () => {
    expect(resolvePracticeTypeToneClass('relation_test')).toBe(
      'osg-practice-type-tag--relation-test',
    )
    expect(resolvePracticeTypeToneClass('communication_test')).toBe(
      'osg-practice-type-tag--relation-test',
    )
  })

  it('11. midterm → midterm tone', () => {
    expect(resolvePracticeTypeToneClass('midterm')).toBe(
      'osg-practice-type-tag--midterm',
    )
  })

  it('12. unknown / 空 → fallback mock-interview', () => {
    expect(resolvePracticeTypeToneClass('unknown')).toBe(
      'osg-practice-type-tag--mock-interview',
    )
    expect(resolvePracticeTypeToneClass('')).toBe(
      'osg-practice-type-tag--mock-interview',
    )
  })
})

describe('resolvePracticeTypeLabel (utility)', () => {
  it('13. enum 转中文', () => {
    expect(resolvePracticeTypeLabel('mock_interview')).toBe('模拟面试')
    expect(resolvePracticeTypeLabel('relation_test')).toBe('人际关系测试')
    expect(resolvePracticeTypeLabel('communication_test')).toBe('沟通测试')
    expect(resolvePracticeTypeLabel('midterm')).toBe('期中考试')
  })

  it('14. 中文 label 原样保留', () => {
    expect(resolvePracticeTypeLabel('模拟面试')).toBe('模拟面试')
    expect(resolvePracticeTypeLabel('人际关系测试')).toBe('人际关系测试')
  })

  it('15. unknown / 空 → 返回 raw input (空时返回空)', () => {
    expect(resolvePracticeTypeLabel('weird_value')).toBe('weird_value')
    expect(resolvePracticeTypeLabel('')).toBe('')
    expect(resolvePracticeTypeLabel(null)).toBe('')
  })
})

describe('resolvePracticeTypeIcon (utility)', () => {
  it('16. mock_interview → mdi-account-voice', () => {
    expect(resolvePracticeTypeIcon('mock_interview')).toBe('mdi-account-voice')
  })

  it('17. relation_test / communication_test → mdi-account-group', () => {
    expect(resolvePracticeTypeIcon('relation_test')).toBe('mdi-account-group')
    expect(resolvePracticeTypeIcon('communication_test')).toBe('mdi-account-group')
  })

  it('18. midterm → mdi-file-document-edit', () => {
    expect(resolvePracticeTypeIcon('midterm')).toBe('mdi-file-document-edit')
  })

  it('19. unknown / 空 → 空字符串（不渲染图标）', () => {
    expect(resolvePracticeTypeIcon('weird')).toBe('')
    expect(resolvePracticeTypeIcon('')).toBe('')
  })
})

describe('PracticeTypeTag (component)', () => {
  it('20. mock_interview → 渲染 "模拟面试" + mock-interview tone', () => {
    wrapper = mount(PracticeTypeTag, { props: { practiceType: 'mock_interview' } })
    expect(wrapper.text().trim()).toBe('模拟面试')
    expect(wrapper.classes()).toContain('osg-practice-type-tag--mock-interview')
  })

  it('21. 中文 "人际关系测试" → 渲染 + relation-test tone', () => {
    wrapper = mount(PracticeTypeTag, { props: { practiceType: '人际关系测试' } })
    expect(wrapper.text().trim()).toBe('人际关系测试')
    expect(wrapper.classes()).toContain('osg-practice-type-tag--relation-test')
  })

  it('22. midterm → 渲染 "期中考试" + midterm tone', () => {
    wrapper = mount(PracticeTypeTag, { props: { practiceType: 'midterm' } })
    expect(wrapper.text().trim()).toBe('期中考试')
    expect(wrapper.classes()).toContain('osg-practice-type-tag--midterm')
  })

  it('23. show-icon=true + mock_interview → 渲染 mdi-account-voice icon', () => {
    wrapper = mount(PracticeTypeTag, {
      props: { practiceType: 'mock_interview', showIcon: true },
    })
    const icon = wrapper.find('i.mdi')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('mdi-account-voice')
  })

  it('24. show-icon=false (默认) → 不渲染 icon', () => {
    wrapper = mount(PracticeTypeTag, { props: { practiceType: 'mock_interview' } })
    expect(wrapper.find('i.mdi').exists()).toBe(false)
  })

  it('25. label prop 覆盖默认文案', () => {
    wrapper = mount(PracticeTypeTag, {
      props: { practiceType: 'mock_interview', label: '试镜' },
    })
    expect(wrapper.text().trim()).toBe('试镜')
  })

  it('26. 渲染元素是 span（不是 a-tag）', () => {
    wrapper = mount(PracticeTypeTag, { props: { practiceType: 'mock_interview' } })
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.classes()).toContain('osg-practice-type-tag')
  })
})

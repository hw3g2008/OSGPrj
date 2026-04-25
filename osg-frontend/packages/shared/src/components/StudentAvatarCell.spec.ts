/**
 * StudentAvatarCell unit tests（M1.1.3）
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import StudentAvatarCell from './StudentAvatarCell.vue'
import {
  resolveAvatarColor,
  STUDENT_AVATAR_PALETTE,
} from '../utils/jobOverviewTone'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('resolveAvatarColor (utility)', () => {
  it('1. 空 name → 用 "assistant" 作为 seed → palette[1] (length=9 → 9%4=1)', () => {
    expect(resolveAvatarColor('')).toBe(STUDENT_AVATAR_PALETTE[9 % 4])
  })

  it('2. null name → 等同空字符串', () => {
    expect(resolveAvatarColor(null)).toBe(STUDENT_AVATAR_PALETTE[9 % 4])
  })

  it('3. 长度为 4 的 name → palette[0]', () => {
    const color = resolveAvatarColor('王小明二') // length 4 → 4 % 4 = 0
    expect(color).toBe(STUDENT_AVATAR_PALETTE[0])
  })

  it('4. 长度为 5 的 name → palette[1]', () => {
    const color = resolveAvatarColor('王小明二三') // length 5 → 5 % 4 = 1
    expect(color).toBe(STUDENT_AVATAR_PALETTE[1])
  })

  it('5. palette 是 4 色固定', () => {
    expect(STUDENT_AVATAR_PALETTE.length).toBe(4)
    expect(STUDENT_AVATAR_PALETTE).toEqual([
      '#2563eb',
      '#7c3aed',
      '#0891b2',
      '#ea580c',
    ])
  })
})

describe('StudentAvatarCell (component)', () => {
  it('6. 渲染基础三件套：avatar 字 + 姓名 + ID', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '张三', id: 123 },
    })
    expect(wrapper.find('.student-cell__avatar').text()).toBe('张')
    expect(wrapper.find('.student-cell__name').text()).toBe('张三')
    expect(wrapper.find('.student-cell__meta').text()).toBe('ID: 123')
  })

  it('7. avatar 字 = 姓名首字符', () => {
    wrapper = mount(StudentAvatarCell, { props: { name: 'Alice' } })
    expect(wrapper.find('.student-cell__avatar').text()).toBe('A')
  })

  it('8. 空姓名 → avatar 字 = "学"', () => {
    wrapper = mount(StudentAvatarCell, { props: { name: '' } })
    expect(wrapper.find('.student-cell__avatar').text()).toBe('学')
  })

  it('9. null 姓名 → avatar 字 = "学" + 姓名展示 fallback', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: null, nameFallback: '未知' },
    })
    expect(wrapper.find('.student-cell__avatar').text()).toBe('学')
    expect(wrapper.find('.student-cell__name').text()).toBe('未知')
  })

  it('10. showId=false → 不渲染 meta', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '张三', id: 123, showId: false },
    })
    expect(wrapper.find('.student-cell__meta').exists()).toBe(false)
  })

  it('11. id 为 null → 显示 idFallback', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '张三', id: null, idFallback: '-' },
    })
    expect(wrapper.find('.student-cell__meta').text()).toBe('ID: -')
  })

  it('12. 自定义 backgroundColor → 覆盖默认 palette', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '张三', backgroundColor: '#ff0000' },
    })
    const avatar = wrapper.find('.student-cell__avatar')
    expect((avatar.element as HTMLElement).style.background).toContain(
      'rgb(255, 0, 0)',
    )
  })

  it('13. 不传 backgroundColor → 用 SSOT palette', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '王小明二' }, // length 4 → palette[0] = #2563eb
    })
    const avatar = wrapper.find('.student-cell__avatar')
    const bg = (avatar.element as HTMLElement).style.background
    // rgb(37, 99, 235) = #2563eb
    expect(bg).toContain('rgb(37, 99, 235)')
  })

  it('14. id 是字符串 → 正确显示', () => {
    wrapper = mount(StudentAvatarCell, {
      props: { name: '张三', id: 'STU001' },
    })
    expect(wrapper.find('.student-cell__meta').text()).toBe('ID: STU001')
  })
})

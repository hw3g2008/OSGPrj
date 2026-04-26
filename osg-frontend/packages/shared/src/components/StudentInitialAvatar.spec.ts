import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StudentInitialAvatar from './StudentInitialAvatar.vue'
import { resolveAvatarColor } from '../utils/jobOverviewTone'

describe('StudentInitialAvatar', () => {
  describe('initial 字符', () => {
    it('显示姓名首字符', () => {
      const wrapper = mount(StudentInitialAvatar, { props: { name: '张三' } })
      expect(wrapper.text()).toBe('张')
    })

    it('英文名取首字符', () => {
      const wrapper = mount(StudentInitialAvatar, { props: { name: 'Alice' } })
      expect(wrapper.text()).toBe('A')
    })

    it('空姓名 fallback 为 "学"', () => {
      const wrapperEmpty = mount(StudentInitialAvatar, { props: { name: '' } })
      expect(wrapperEmpty.text()).toBe('学')

      const wrapperNullish = mount(StudentInitialAvatar, { props: {} })
      expect(wrapperNullish.text()).toBe('学')
    })

    it('支持自定义 fallback', () => {
      const wrapper = mount(StudentInitialAvatar, {
        props: { name: '', fallback: '?' },
      })
      expect(wrapper.text()).toBe('?')
    })
  })

  describe('颜色（SSOT）', () => {
    function hexToRgb(hex: string): string {
      const value = hex.replace('#', '')
      const bigint = parseInt(value, 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      return `rgb(${r}, ${g}, ${b})`
    }

    it('未传 color 时复用 resolveAvatarColor SSOT', () => {
      const wrapper = mount(StudentInitialAvatar, { props: { name: '张三' } })
      const expectedBg = resolveAvatarColor('张三')
      const div = wrapper.find('.osg-student-avatar')
      // jsdom inline-style 自动把 hex 归一为 rgb
      expect(div.attributes('style')).toContain(hexToRgb(expectedBg))
    })

    it('传入 color 覆盖默认', () => {
      const wrapper = mount(StudentInitialAvatar, {
        props: { name: '张三', color: '#FF0000' },
      })
      const div = wrapper.find('.osg-student-avatar')
      expect(div.attributes('style')).toContain('rgb(255, 0, 0)')
    })
  })

  describe('size', () => {
    it('默认 size = 36', () => {
      const wrapper = mount(StudentInitialAvatar, { props: { name: '张' } })
      const div = wrapper.find('.osg-student-avatar')
      expect(div.attributes('style')).toContain('width: 36px')
      expect(div.attributes('style')).toContain('height: 36px')
    })

    it('支持自定义 size', () => {
      const wrapper = mount(StudentInitialAvatar, {
        props: { name: '张', size: 48 },
      })
      const div = wrapper.find('.osg-student-avatar')
      expect(div.attributes('style')).toContain('width: 48px')
      expect(div.attributes('style')).toContain('height: 48px')
    })

    it('size 影响字体大小（约为 size 的 0.4 倍）', () => {
      const wrapper = mount(StudentInitialAvatar, {
        props: { name: '张', size: 50 },
      })
      const div = wrapper.find('.osg-student-avatar')
      // 50 * 0.4 = 20
      expect(div.attributes('style')).toContain('font-size: 20px')
    })
  })

  describe('结构', () => {
    it('渲染单个圆形 div 容器', () => {
      const wrapper = mount(StudentInitialAvatar, { props: { name: '张' } })
      const div = wrapper.find('.osg-student-avatar')
      expect(div.exists()).toBe(true)
      expect(div.attributes('style')).toContain('border-radius: 50%')
    })
  })
})

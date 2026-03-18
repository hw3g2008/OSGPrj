import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaceholderPage from '@/components/PlaceholderPage.vue'

describe('PlaceholderPage', () => {
  it('renders with given title', () => {
    const wrapper = mount(PlaceholderPage, {
      props: { title: '课时结算' }
    })
    expect(wrapper.find('.page-title').text()).toBe('课时结算')
  })

  it('shows "敬请期待" text', () => {
    const wrapper = mount(PlaceholderPage, {
      props: { title: '测试' }
    })
    expect(wrapper.find('.placeholder-title').text()).toBe('敬请期待')
  })

  it('shows "Coming Soon" english text', () => {
    const wrapper = mount(PlaceholderPage, {
      props: { title: '测试' }
    })
    expect(wrapper.find('.placeholder-en').text()).toBe('Coming Soon')
  })

  it('shows clock icon', () => {
    const wrapper = mount(PlaceholderPage, {
      props: { title: '测试' }
    })
    expect(wrapper.find('.mdi-clock-outline').exists()).toBe(true)
  })
})

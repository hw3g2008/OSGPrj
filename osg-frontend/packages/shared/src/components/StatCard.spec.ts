import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import StatCard from './StatCard.vue'

const global = { plugins: [Antd] }

describe('StatCard', () => {
  it('renders label and value via a-statistic', () => {
    const wrapper = mount(StatCard, {
      props: { label: '全部课程', value: 42 },
      global,
    })
    expect(wrapper.find('.osg-stat-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('全部课程')
    expect(wrapper.text()).toContain('42')
  })

  it('applies valueStyle color when provided', () => {
    const wrapper = mount(StatCard, {
      props: { label: '新分配', value: 5, color: '#EF4444' },
      global,
    })
    const statistic = wrapper.findComponent({ name: 'AStatistic' })
    expect(statistic.exists()).toBe(true)
    expect(statistic.props('valueStyle')).toEqual({ color: '#EF4444' })
  })

  it('renders without color (default)', () => {
    const wrapper = mount(StatCard, {
      props: { label: '待审核', value: 0 },
      global,
    })
    const statistic = wrapper.findComponent({ name: 'AStatistic' })
    expect(statistic.props('valueStyle')).toBeUndefined()
  })

  it('accepts string value (e.g. formatted currency)', () => {
    const wrapper = mount(StatCard, {
      props: { label: '待结算金额', value: '¥12,000' },
      global,
    })
    expect(wrapper.text()).toContain('¥12,000')
  })
})

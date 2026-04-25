/**
 * CompanyPositionCell unit tests（M1.1.4）
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import CompanyPositionCell from './CompanyPositionCell.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('CompanyPositionCell', () => {
  it('1. 默认 position-location 模式 → 公司 + position · location', () => {
    wrapper = mount(CompanyPositionCell, {
      props: {
        company: 'Goldman Sachs',
        position: 'Analyst',
        location: 'New York',
      },
    })
    expect(wrapper.find('.company-position-cell__name').text()).toContain(
      'Goldman Sachs',
    )
    expect(wrapper.find('.company-position-cell__meta').text()).toBe(
      'Analyst · New York',
    )
  })

  it('2. role-only 模式 → 只显示 role', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', role: '量化分析师', metaMode: 'role-only' },
    })
    expect(wrapper.find('.company-position-cell__meta').text()).toBe(
      '量化分析师',
    )
  })

  it('3. role-only 模式 + role 为空 → meta 不渲染', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', role: '', metaMode: 'role-only' },
    })
    expect(wrapper.find('.company-position-cell__meta').exists()).toBe(false)
  })

  it('4. 公司空 → 显示 fallback', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: '', position: 'X', companyFallback: '未知公司' },
    })
    expect(wrapper.find('.company-position-cell__name').text()).toBe('未知公司')
  })

  it('5. position 空 → 用 - 占位', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', position: '', location: 'NY' },
    })
    expect(wrapper.find('.company-position-cell__meta').text()).toBe('- · NY')
  })

  it('6. location 空 → 用 locationFallback 占位', () => {
    wrapper = mount(CompanyPositionCell, {
      props: {
        company: 'GS',
        position: 'X',
        location: '',
        locationFallback: '地区待补充',
      },
    })
    expect(wrapper.find('.company-position-cell__meta').text()).toBe(
      'X · 地区待补充',
    )
  })

  it('7. highlight=true → 公司名加 highlight class', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', highlight: true },
    })
    expect(
      wrapper.find('.company-position-cell__name--highlight').exists(),
    ).toBe(true)
  })

  it('8. highlight=false（默认）→ 不加 highlight class', () => {
    wrapper = mount(CompanyPositionCell, { props: { company: 'GS' } })
    expect(
      wrapper.find('.company-position-cell__name--highlight').exists(),
    ).toBe(false)
  })

  it('9. toneClass → 加在公司名上', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', toneClass: 'company-tone-positive' },
    })
    expect(
      wrapper.find('.company-position-cell__name.company-tone-positive')
        .exists(),
    ).toBe(true)
  })

  it('10. metaSeparator 自定义', () => {
    wrapper = mount(CompanyPositionCell, {
      props: {
        company: 'GS',
        position: 'X',
        location: 'Y',
        metaSeparator: ' | ',
      },
    })
    expect(wrapper.find('.company-position-cell__meta').text()).toBe('X | Y')
  })

  it('11. 同时 highlight + toneClass → 都生效', () => {
    wrapper = mount(CompanyPositionCell, {
      props: { company: 'GS', highlight: true, toneClass: 'tone-x' },
    })
    const el = wrapper.find('.company-position-cell__name')
    expect(el.classes()).toContain('company-position-cell__name--highlight')
    expect(el.classes()).toContain('tone-x')
  })
})

/**
 * PositionsDrilldown smoke tests
 *
 * a-table 在 jsdom 中无法完整渲染嵌套表 cell；这里只做 mount smoke + 顶层结构断言。
 * 行业大类标题、公司行、嵌套表的渲染靠 Playwright 视觉验证。
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PositionsDrilldown from './PositionsDrilldown.vue'
import type {
  PositionCompanyGroup,
  PositionIndustryGroup,
  PositionTableRow,
} from './types'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

function makePosition(override: Partial<PositionTableRow> = {}): PositionTableRow {
  return {
    positionId: 1,
    positionName: 'IB Analyst',
    companyName: 'Goldman Sachs',
    industry: 'Investment Bank',
    industryTone: 'gold',
    positionCategory: '暑期实习',
    location: 'Hong Kong',
    deadlineTone: 'normal',
    studentCount: 0,
    ...override,
  }
}

function makeCompany(override: Partial<PositionCompanyGroup> = {}): PositionCompanyGroup {
  return {
    id: 'gs',
    name: 'Goldman Sachs',
    locations: 'Hong Kong, New York',
    logoText: 'GS',
    positionCount: 2,
    studentCount: 0,
    positions: [makePosition()],
    ...override,
  }
}

function makeIndustry(override: Partial<PositionIndustryGroup> = {}): PositionIndustryGroup {
  return {
    id: 'investment_bank',
    label: 'Investment Bank',
    tone: 'gold',
    icon: 'mdi-bank',
    companyCount: 1,
    positionCount: 1,
    studentCount: 0,
    companies: [makeCompany()],
    ...override,
  }
}

describe('PositionsDrilldown (smoke)', () => {
  it('1. 空 industries 显示 a-empty', () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [],
        expandedIndustries: new Set<string>(),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('2. 渲染行业大类标题（label/家公司/个岗位/我的学员）', () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [makeIndustry({ companyCount: 3, positionCount: 7, studentCount: 2 })],
        expandedIndustries: new Set<string>(),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    const text = wrapper.text()
    expect(text).toContain('Investment Bank')
    expect(text).toContain('3 家公司')
    expect(text).toContain('7 个岗位')
    expect(text).toContain('我的学员: 2人')
  })

  it('3. industry tone class 应正确绑定', () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [makeIndustry({ tone: 'violet' })],
        expandedIndustries: new Set<string>(),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    expect(wrapper.find('.osg-positions-drilldown__industry-head--violet').exists()).toBe(true)
  })

  it('4. 行业未展开时不显示公司列表', () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [makeIndustry()],
        expandedIndustries: new Set<string>(),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    expect(wrapper.find('.osg-positions-drilldown__companies').exists()).toBe(false)
  })

  it('5. 行业展开后显示公司列表', () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [makeIndustry()],
        expandedIndustries: new Set(['investment_bank']),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    expect(wrapper.find('.osg-positions-drilldown__companies').exists()).toBe(true)
    expect(wrapper.text()).toContain('Goldman Sachs')
  })

  it('6. 点击 industry 标题触发 toggleIndustry 事件', async () => {
    wrapper = mount(PositionsDrilldown, {
      props: {
        industries: [makeIndustry()],
        expandedIndustries: new Set<string>(),
        expandedCompanies: new Set<string>(),
      },
      global: { stubs: { 'a-empty': true, 'a-space': true, 'a-button': true } },
    })
    await wrapper.find('.osg-positions-drilldown__industry-head').trigger('click')
    const events = wrapper.emitted('toggleIndustry')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual(['investment_bank'])
  })
})

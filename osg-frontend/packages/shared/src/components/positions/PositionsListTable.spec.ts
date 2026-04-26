/**
 * PositionsListTable smoke test
 *
 * 大部分渲染逻辑（tone class / logo 派生）通过 utils/positionsTone.spec.ts 单独覆盖。
 * 这里只做 mount smoke：确保组件能在测试环境下挂载、接受 props 不抛错。
 *
 * 注意：a-table 在 jsdom 中不会渲染 cell 内部 slots（虚拟 DOM 限制），
 *       所以无法在此 spec 里断言每个 cell 的具体内容。
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PositionsListTable from './PositionsListTable.vue'
import type { PositionTableRow } from './types'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

function makeRow(override: Partial<PositionTableRow> = {}): PositionTableRow {
  return {
    positionId: 1,
    positionName: 'IB Analyst',
    companyName: 'Goldman Sachs',
    industry: 'Investment Bank',
    industryTone: 'gold',
    positionCategory: '暑期实习',
    location: 'Hong Kong',
    recruitmentCycle: '2025 Summer',
    publishTime: '2025-09-15',
    deadline: '2025-12-31',
    deadlineTone: 'urgent',
    studentCount: 2,
    ...override,
  }
}

describe('PositionsListTable (smoke)', () => {
  it('1. 空数组也能 mount', () => {
    wrapper = mount(PositionsListTable, {
      props: { positions: [] },
      global: {
        stubs: { 'a-table': true, 'a-tag': true, 'a-button': true, 'a-space': true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('2. 多行数据能 mount，不抛错', () => {
    wrapper = mount(PositionsListTable, {
      props: {
        positions: [
          makeRow({ positionId: 1, industryTone: 'gold' }),
          makeRow({ positionId: 2, industryTone: 'violet' }),
          makeRow({ positionId: 3, industryTone: 'blue' }),
        ],
      },
      global: {
        stubs: { 'a-table': true, 'a-tag': true, 'a-button': true, 'a-space': true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('3. 接受 columns prop 覆盖', () => {
    const customColumns = [
      { title: '岗位', key: 'positionName', dataIndex: 'positionName', width: 200 },
      { title: '公司', key: 'companyName', dataIndex: 'companyName', width: 200 },
    ]
    wrapper = mount(PositionsListTable, {
      props: { positions: [makeRow()], columns: customColumns },
      global: {
        stubs: { 'a-table': true, 'a-tag': true, 'a-button': true, 'a-space': true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('4. 接受 pagination=false', () => {
    wrapper = mount(PositionsListTable, {
      props: { positions: [makeRow()], pagination: false },
      global: {
        stubs: { 'a-table': true, 'a-tag': true, 'a-button': true, 'a-space': true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})

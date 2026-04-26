import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const applicationsSource = fs.readFileSync(
  path.resolve(__dirname, '../views/applications/index.vue'),
  'utf-8'
)

describe('student applications source contract', () => {
  it('keeps the applications title, four tabs, table columns, and real data wiring from the prototype shell', () => {
    const expectedLabels = [
      'applicationsMeta.pageSummary.titleZh',
      'applicationsMeta.pageSummary.titleEn',
      'applicationsMeta.pageSummary.subtitle',
      '全部',
      '已投递',
      '面试中',
      '已结束',
      '公司/岗位',
      '阶段',
      '面试时间',
      '辅导状态',
      '导师',
      '课时/反馈',
      '操作'
    ]

    for (const label of expectedLabels) {
      expect(applicationsSource).toContain(label)
    }

    expect(applicationsSource).toContain('listStudentApplications')
    expect(applicationsSource).toContain('getStudentApplicationsMeta')
    expect(applicationsSource).toContain('updateStudentPositionApply')
    expect(applicationsSource).toContain('updateStudentPositionProgress')
  })

  it('loads applications meta from backend instead of hardcoding delivery-critical filters and schedule summaries in Vue', () => {
    expect(applicationsSource).toContain('getStudentApplicationsMeta')

    const forbiddenHardcodedTruth = [
      '<a-select-option value="applied">已投递</a-select-option>',
      '<a-select-option value="hirevue">HireVue / OT</a-select-option>',
      '<a-select-option value="coaching">辅导中</a-select-option>',
      '<a-select-option value="pending">待审批</a-select-option>',
      '<a-select-option value="ib">Investment Bank</a-select-option>',
      '<a-select-option value="consulting">Consulting</a-select-option>',
      'function buildInterviewLabel',
      'function buildInterviewSummary'
    ]

    for (const token of forbiddenHardcodedTruth) {
      expect(applicationsSource).not.toContain(token)
    }
  })

  it('keeps the prototype-level filter and list card hierarchy', () => {
    const filterIndex = applicationsSource.indexOf('class="filter-card"')
    const listCardIndex = applicationsSource.indexOf('class="applications-list-card"')
    const listHeaderIndex = applicationsSource.indexOf('class="applications-list-header"')
    const tabStripIndex = applicationsSource.indexOf('class="applications-tab-strip"')
    const tableBodyIndex = applicationsSource.indexOf('class="applications-table-body"')

    expect(filterIndex).toBeGreaterThan(-1)
    expect(listCardIndex).toBeGreaterThan(-1)
    expect(listHeaderIndex).toBeGreaterThan(-1)
    expect(tabStripIndex).toBeGreaterThan(-1)
    expect(tableBodyIndex).toBeGreaterThan(-1)

    expect(filterIndex).toBeLessThan(listCardIndex)
    expect(listCardIndex).toBeLessThan(listHeaderIndex)
    expect(listHeaderIndex).toBeLessThan(tabStripIndex)
    expect(tabStripIndex).toBeLessThan(tableBodyIndex)
  })

  // [本期不落地] 面试安排、更新申请进度 等 S-005 行为
  it.skip('defines the modal and action trigger coverage required by story S-005', () => {
    const triggerMatches = applicationsSource.match(/actionId:/g) ?? []

    expect(applicationsSource).toContain('const applicationsActionTriggers = [')
    expect(triggerMatches).toHaveLength(6)
    expect(applicationsSource).toContain('面试安排')
    expect(applicationsSource).toContain('更新申请进度')
    expect(applicationsSource).toContain('标记已投递')
  })
})

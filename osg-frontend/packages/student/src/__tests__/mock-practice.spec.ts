import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mockPracticeSource = fs.readFileSync(
  path.resolve(__dirname, '../views/mock-practice/index.vue'),
  'utf-8'
)

describe('student mock practice source contract', () => {
  it('keeps the mock practice shell and records table headers via backend-owned page metadata', () => {
    const expectedLabels = [
      'mockPracticeMeta.pageSummary.titleZh',
      'mockPracticeMeta.pageSummary.titleEn',
      'mockPracticeMeta.pageSummary.subtitle',
      'mockPracticeMeta.practiceSection.recordsTitle',
      'mockPracticeMeta.practiceSection.keywordPlaceholder',
      'mockPracticeMeta.practiceSection.typePlaceholder',
      'mockPracticeMeta.practiceSection.statusPlaceholder',
      'mockPracticeMeta.practiceSection.rangePlaceholder',
      '类型',
      '申请内容',
      '申请时间',
      '导师',
      '已上课时',
      '课程反馈'
    ]

    for (const label of expectedLabels) {
      expect(mockPracticeSource).toContain(label)
    }

    expect(mockPracticeSource).toContain('getStudentMockPracticeMeta')
  })

  it('keeps the class request shell and options wired through backend-owned metadata', () => {
    const expectedLabels = [
      'mockPracticeMeta.requestSection.titleZh',
      'mockPracticeMeta.requestSection.titleEn',
      'mockPracticeMeta.requestSection.subtitle',
      'mockPracticeMeta.requestSection.heroTitle',
      'mockPracticeMeta.requestSection.heroSubtitle',
      'mockPracticeMeta.requestSection.actionButtonText',
      'mockPracticeMeta.requestSection.tableTitle',
      'mockPracticeMeta.requestSection.keywordPlaceholder',
      'mockPracticeMeta.requestSection.typePlaceholder',
      'mockPracticeMeta.requestSection.statusPlaceholder',
      'mockPracticeMeta.requestSection.modalTitle',
      'ID',
      '公司',
      '状态',
      '提交时间',
      'mockPracticeMeta.requestCourseOptions'
    ]

    for (const label of expectedLabels) {
      expect(mockPracticeSource).toContain(label)
    }

    expect(mockPracticeSource).toContain('mockPracticeMeta.requestTabs')
    expect(mockPracticeSource).toContain('mockPracticeMeta.requestFilters.typeOptions')
    expect(mockPracticeSource).toContain('mockPracticeMeta.requestFilters.statusOptions')
    expect(mockPracticeSource).toContain('mockPracticeMeta.requestCourseOptions')
  })

  it('loads delivery-critical cards, filters, and display metadata from the backend instead of Vue constants', () => {
    expect(mockPracticeSource).toContain('getStudentMockPracticeMeta')

    const forbiddenHardcodedTruth = [
      'const practiceEntries = [',
      'const requestCourseOptions = [',
      '<a-select-option value="模拟面试">模拟面试</a-select-option>',
      '<a-select-option value="人际关系测试">人际关系测试</a-select-option>',
      '<a-select-option value="期中考试">期中考试</a-select-option>',
      '<a-select-option value="week">本周</a-select-option>',
      '<a-select-option value="month">本月</a-select-option>',
      '<a-select-option value="all">全部</a-select-option>',
      '<a-select-option value="Staffing">Staffing</a-select-option>',
      '<a-select-option value="Hirevue">Hirevue</a-select-option>',
      '<a-select-option value="OT">OT</a-select-option>',
      '<a-select-option value="Processing">Processing</a-select-option>',
      '<a-select-option value="Completed">Completed</a-select-option>',
      "return '申请模拟面试'",
      "return '申请人际关系测试'",
      "return '申请期中考试'"
    ]

    for (const token of forbiddenHardcodedTruth) {
      expect(mockPracticeSource).not.toContain(token)
    }
  })
})

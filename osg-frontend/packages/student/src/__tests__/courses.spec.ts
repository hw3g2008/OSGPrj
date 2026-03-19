import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const coursesSource = fs.readFileSync(
  path.resolve(__dirname, '../views/courses/index.vue'),
  'utf-8'
)

describe('student courses source contract', () => {
  it('keeps the class records shell wired through backend-owned metadata', () => {
    const expectedLabels = [
      'classRecordsMeta.pageSummary.titleZh',
      'classRecordsMeta.pageSummary.titleEn',
      'classRecordsMeta.pageSummary.subtitle',
      'classRecordsMeta.reminderBanner.title',
      'classRecordsMeta.reminderBanner.ctaLabel',
      'classRecordsMeta.tabDefinitions',
      'classRecordsMeta.filters.keywordPlaceholder',
      'classRecordsMeta.filters.coachingTypePlaceholder',
      'classRecordsMeta.filters.courseContentPlaceholder',
      'classRecordsMeta.filters.timeRangePlaceholder',
      'classRecordsMeta.tableHeaders.recordId',
      'classRecordsMeta.tableHeaders.coachingDetail',
      'classRecordsMeta.tableHeaders.courseContent',
      'classRecordsMeta.tableHeaders.mentor',
      'classRecordsMeta.tableHeaders.classDate',
      'classRecordsMeta.tableHeaders.duration',
      'classRecordsMeta.tableHeaders.rating',
      'classRecordsMeta.tableHeaders.action'
    ]

    for (const label of expectedLabels) {
      expect(coursesSource).toContain(label)
    }
  })

  it('wires the real list and rate APIs while keeping the rating/detail workflows', () => {
    expect(coursesSource).toContain('listStudentClassRecords')
    expect(coursesSource).toContain('getStudentClassRecordsMeta')
    expect(coursesSource).toContain('rateStudentClassRecord')
    expect(coursesSource).toContain('hydrateRateForm')
    expect(coursesSource).toContain('currentCourse.detailTitle')
    expect(coursesSource).toContain('classRecordsMeta.ratingDialog.title')
    expect(coursesSource).toContain('classRecordsMeta.ratingDialog.tagPlaceholder')
    expect(coursesSource).toContain('classRecordsMeta.detailDialog.closeLabel')
    expect(coursesSource).toContain('classRecordsMeta.detailDialog.confirmLabel')
  })

  it('does not keep delivery-critical tabs, placeholders, tags, or dialog copy hardcoded in the Vue page', () => {
    const forbiddenHardcodedTruth = [
      '<a-tab-pane key="all" tab="全部" />',
      'placeholder="搜索导师..."',
      'placeholder="辅导类型"',
      'placeholder="课程内容"',
      'placeholder="时间范围"',
      '<a-select-option value="岗位辅导">岗位辅导</a-select-option>',
      '<a-select-option value="模拟应聘">模拟应聘</a-select-option>',
      '<a-select-option value="新简历">新简历</a-select-option>',
      '<a-select-option value="模拟期中考试">模拟期中考试</a-select-option>',
      '<a-select-option value="week">本周</a-select-option>',
      '<a-select-option value="month">本月</a-select-option>',
      '<a-select-option value="all">全部</a-select-option>',
      '<a-select-option value="专业能力强">专业能力强</a-select-option>',
      '<a-select-option value="耐心细致">耐心细致</a-select-option>',
      '<a-select-option value="反馈及时">反馈及时</a-select-option>',
      '<a-select-option value="收获很大">收获很大</a-select-option>',
      '<a-select-option value="准时守约">准时守约</a-select-option>',
      '课程评价',
      '修改评价',
      '提交评价',
      '去评价',
      '新增课程记录'
    ]

    for (const token of forbiddenHardcodedTruth) {
      expect(coursesSource).not.toContain(token)
    }
  })
})

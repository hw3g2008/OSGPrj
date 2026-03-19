import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const feedbackSource = fs.readFileSync(
  path.resolve(__dirname, '../views/feedback/index.vue'),
  'utf-8'
)
const reportSource = fs.readFileSync(
  path.resolve(__dirname, '../views/report/index.vue'),
  'utf-8'
)
const aiInterviewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/ai-interview/index.vue'),
  'utf-8'
)
const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

describe('student feedback/report/ai interview story S-009 source contract', () => {
  it('keeps the feedback title, tabs, filters, and ten modal triggers from the prototype', () => {
    const expectedLabels = [
      '课程反馈',
      'Feedback',
      'Prep Feedback',
      'Networking',
      'Mock Midterm',
      '搜索 Mentor...',
      'Performance',
      'Student',
      'Lead Mentor',
      'Email Quality',
      'Call Quality',
      'Recommend',
      'Question',
      'Create Time',
      'View'
    ]

    for (const label of expectedLabels) {
      expect(feedbackSource).toContain(label)
    }

    const triggerMatches =
      feedbackSource.match(/const feedbackActionTriggers = \[(.|\n)*?\]/)?.[0].match(/actionId:/g) ?? []

    expect(feedbackSource).toContain('const feedbackActionTriggers = [')
    expect(triggerMatches).toHaveLength(10)
  })

  it('keeps the class report shell, tabs, and student rate dialog from the prototype', () => {
    const expectedLabels = [
      '上课记录',
      'Class Report',
      '查看课程记录并进行评价反馈',
      '全部',
      '待评价',
      '已评价',
      '搜索导师/课程...',
      '课程来源',
      '课程类型',
      '评价状态',
      '课时',
      '我的评价',
      '重新评价',
      '课程评价'
    ]

    for (const label of expectedLabels) {
      expect(reportSource).toContain(label)
    }
  })

  it('keeps the ai interview upload shell, latest analysis, and history table from the prototype', () => {
    const expectedLabels = [
      'AI面试分析',
      'AI Interview Analysis',
      '上传面试录音或视频，获取AI智能分析和改进建议',
      '上传面试',
      '最新分析结果',
      '分析文件',
      '综合评分',
      'AI改进建议',
      '优势',
      '改进建议',
      '分析历史',
      '公司',
      '面试轮次',
      '查看详情'
    ]

    for (const label of expectedLabels) {
      expect(aiInterviewSource).toContain(label)
    }
  })

  it('registers real feedback/report/ai interview routes instead of placeholders', () => {
    expect(routerSource).toContain("path: 'feedback'")
    expect(routerSource).toContain("path: 'report'")
    expect(routerSource).toContain("path: 'ai-interview'")
    expect(routerSource).not.toContain("placeholderPage('ai-interview'")
  })
})

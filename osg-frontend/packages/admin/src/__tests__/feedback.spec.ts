import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const feedbackViewPath = path.resolve(__dirname, '../views/teaching/feedback/index.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('课程反馈页面', () => {
  it('renders the feedback page shell with three tabs and summary cards', () => {
    expect(fs.existsSync(feedbackViewPath)).toBe(true)

    const source = readSource(feedbackViewPath)
    expect(source).toContain('课程反馈')
    expect(source).toContain('Prep Feedback')
    expect(source).toContain('Networking')
    expect(source).toContain('Mock Midterm')
    expect(source).toContain('全部反馈')
    expect(source).toContain('学员表现')
    expect(source).toContain('邮件质量')
    expect(source).toContain('考核题目')
  })

  it('wires the feedback page to the real feedback API instead of placeholders', () => {
    const source = readSource(feedbackViewPath)

    expect(source).toContain('getFeedbackList(')
    expect(source).toContain('activeTab')
    expect(source).toContain('summaryCards')
    expect(source).not.toContain('课程反馈页面开发中')
  })
})

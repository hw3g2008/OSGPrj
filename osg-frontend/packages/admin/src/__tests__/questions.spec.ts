import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const questionsViewPath = path.resolve(__dirname, '../views/resources/questions/index.vue')
const reviewModalPath = path.resolve(__dirname, '../views/resources/questions/components/QuestionReviewModal.vue')
const questionApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/question.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('面试真题审核页面', () => {
  it('renders the review shell, banner, tabs, scope preview, and modal anchors from the PRD', () => {
    expect(fs.existsSync(questionsViewPath)).toBe(true)
    expect(fs.existsSync(reviewModalPath)).toBe(true)
    expect(fs.existsSync(questionApiPath)).toBe(true)

    const pageSource = readSource(questionsViewPath)
    const modalSource = readSource(reviewModalPath)

    expect(pageSource).toContain('面试真题审核')
    expect(pageSource).toContain('审核学员提交的面试真题，通过后自动开放给相同申请的学生')
    expect(pageSource).toContain('当前有')
    expect(pageSource).toContain('待审核')
    expect(pageSource).toContain('已通过')
    expect(pageSource).toContain('已驳回')
    expect(pageSource).toContain('批量通过')
    expect(pageSource).toContain('批量驳回')
    expect(pageSource).toContain('同公司 + 同部门 + 同办公地点 + 同面试状态')
    expect(pageSource).toContain('入职面试申请')
    expect(pageSource).toContain('自主填写')
    expect(modalSource).toContain('审核面试真题')
    expect(modalSource).toContain('学员信息')
    expect(modalSource).toContain('面试信息')
    expect(modalSource).toContain('面试题目')
    expect(modalSource).toContain('补充说明')
    expect(modalSource).toContain('开放范围预览')
    expect(modalSource).toContain('通过并开放')
  })

  it('wires the page to the real question review APIs instead of placeholders', () => {
    const pageSource = readSource(questionsViewPath)
    const apiSource = readSource(questionApiPath)

    expect(apiSource).toContain('getQuestionList(')
    expect(apiSource).toContain('batchApproveQuestions(')
    expect(apiSource).toContain('batchRejectQuestions(')
    expect(pageSource).toContain('getQuestionList(')
    expect(pageSource).toContain('batchApproveQuestions(')
    expect(pageSource).toContain('batchRejectQuestions(')
    expect(pageSource).toContain('<QuestionReviewModal')
    expect(pageSource).not.toContain('面试真题审核开发中')
  })
})

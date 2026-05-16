import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const questionsViewPath = path.resolve(__dirname, '../views/resources/questions/index.vue')
const reviewModalPath = path.resolve(__dirname, '../views/resources/questions/components/QuestionReviewModal.vue')
const questionApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/question.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('面试真题审核页面', () => {
  it('renders the review shell, banner, tabs, scope preview, and modal anchors via i18n keys', () => {
    expect(fs.existsSync(questionsViewPath)).toBe(true)
    expect(fs.existsSync(reviewModalPath)).toBe(true)
    expect(fs.existsSync(questionApiPath)).toBe(true)

    const pageSource = readSource(questionsViewPath)
    const modalSource = readSource(reviewModalPath)

    expect(pageSource).toContain("import { i18n } from '@osg/shared'")
    expect(modalSource).toContain("import { i18n } from '@osg/shared'")
    expect(pageSource).toContain("t('admin.resources.questions.title')")
    expect(pageSource).toContain("t('admin.resources.questions.banner.message'")
    expect(pageSource).toContain("t('admin.resources.questions.tabs.pending')")
    expect(pageSource).toContain("t('admin.resources.questions.actions.batchApprove')")
    expect(pageSource).toContain("formatSourceType(record.sourceType)")
    expect(modalSource).toContain("t('admin.resources.questions.modal.title')")
    expect(modalSource).toContain("t('admin.resources.questions.modal.studentInfo')")
    expect(modalSource).toContain("formatSourceType(row.sourceType)")
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

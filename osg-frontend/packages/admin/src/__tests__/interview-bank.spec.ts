import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const viewPath = path.resolve(__dirname, '../views/resources/interview-bank/index.vue')
const modalPath = path.resolve(__dirname, '../views/resources/interview-bank/components/InterviewBankFormModal.vue')
const apiPath = path.resolve(__dirname, '../../../shared/src/api/admin/interviewBank.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('真人面试题库页面', () => {
  it('renders the interview-bank shell, pending banner, and modal fields from the PRD', () => {
    expect(fs.existsSync(viewPath)).toBe(true)
    expect(fs.existsSync(modalPath)).toBe(true)
    expect(fs.existsSync(apiPath)).toBe(true)

    const pageSource = readSource(viewPath)
    const modalSource = readSource(modalPath)

    expect(pageSource).toContain('真人面试题库')
    expect(pageSource).toContain('管理真人面试问题集锦，按面试阶段和类型分类')
    expect(pageSource).toContain('题库列表')
    expect(pageSource).toContain('学员申请')
    expect(pageSource).toContain('待分配')
    expect(pageSource).toContain('班主任流转')
    expect(pageSource).toContain('mdi-account-tie')
    expect(pageSource).toContain('Screening Call')
    expect(pageSource).toContain('First Round')
    expect(pageSource).toContain('Second Round')
    expect(pageSource).toContain('Superday')
    expect(pageSource).toContain('Behavioral')
    expect(pageSource).toContain('Technical')
    expect(pageSource).toContain('Case')
    expect(pageSource).toContain('Investment Banking')
    expect(pageSource).toContain('Consulting')
    expect(pageSource).toContain('PE')
    expect(pageSource).toContain('VC')
    expect(modalSource).toContain('题库名称')
    expect(modalSource).toContain('面试阶段')
    expect(modalSource).toContain('类型')
    expect(modalSource).toContain('行业')
    expect(modalSource).toContain('题目数')
    expect(modalSource).toContain('状态')
  })

  it('wires the page to the real interview-bank APIs instead of placeholders', () => {
    const pageSource = readSource(viewPath)
    const apiSource = readSource(apiPath)

    expect(apiSource).toContain('getInterviewBankList(')
    expect(apiSource).toContain('createInterviewBank(')
    expect(apiSource).toContain('updateInterviewBank(')
    expect(pageSource).toContain('getInterviewBankList(')
    expect(pageSource).toContain('createInterviewBank(')
    expect(pageSource).toContain('updateInterviewBank(')
    expect(pageSource).toContain('<InterviewBankFormModal')
    expect(pageSource).not.toContain('真人面试题库开发中')
  })
})

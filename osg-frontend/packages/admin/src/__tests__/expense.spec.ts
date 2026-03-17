import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const expenseViewPath = path.resolve(__dirname, '../views/finance/expense/index.vue')
const newExpenseModalPath = path.resolve(__dirname, '../views/finance/expense/components/NewExpenseModal.vue')
const expenseApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/expense.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('报销管理页面', () => {
  it('renders the expense management shell with four tabs, five expense types, and new-expense modal fields', () => {
    expect(fs.existsSync(expenseViewPath)).toBe(true)
    expect(fs.existsSync(newExpenseModalPath)).toBe(true)
    expect(fs.existsSync(expenseApiPath)).toBe(true)

    const pageSource = readSource(expenseViewPath)
    const modalSource = readSource(newExpenseModalPath)

    expect(pageSource).toContain('报销管理')
    expect(pageSource).toContain('All')
    expect(pageSource).toContain('Processing')
    expect(pageSource).toContain('Approved')
    expect(pageSource).toContain('Denied')
    expect(pageSource).toContain('Mentor Referral')
    expect(pageSource).toContain('Student Referral')
    expect(pageSource).toContain('Transportation')
    expect(pageSource).toContain('Materials')
    expect(pageSource).toContain('Other')
    expect(modalSource).toContain('导师')
    expect(modalSource).toContain('报销类型')
    expect(modalSource).toContain('金额')
    expect(modalSource).toContain('日期')
    expect(modalSource).toContain('说明')
    expect(modalSource).toContain('附件')
  })

  it('wires the page to the real expense APIs instead of placeholders', () => {
    const pageSource = readSource(expenseViewPath)
    const apiSource = readSource(expenseApiPath)

    expect(apiSource).toContain('getExpenseList(')
    expect(apiSource).toContain('createExpense(')
    expect(apiSource).toContain('reviewExpense(')
    expect(pageSource).toContain('getExpenseList(')
    expect(pageSource).toContain('createExpense(')
    expect(pageSource).toContain('reviewExpense(')
    expect(pageSource).toContain('<NewExpenseModal')
    expect(pageSource).not.toContain('报销管理开发中')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const settlementViewPath = path.resolve(__dirname, '../views/finance/settlement/index.vue')
const markPaidModalPath = path.resolve(__dirname, '../views/finance/settlement/components/MarkPaidModal.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('课时结算页面', () => {
  it('renders the finance settlement shell with process banner, stats cards, tabs, and modal copy', () => {
    expect(fs.existsSync(settlementViewPath)).toBe(true)
    expect(fs.existsSync(markPaidModalPath)).toBe(true)

    const pageSource = readSource(settlementViewPath)
    const modalSource = readSource(markPaidModalPath)

    expect(pageSource).toContain('财务结算')
    expect(pageSource).toContain('支付流程说明')
    expect(pageSource).toContain('未支付')
    expect(pageSource).toContain('本月已支付')
    expect(pageSource).toContain('本周课程数')
    expect(pageSource).toContain('未支付')
    expect(pageSource).toContain('已支付')
    expect(pageSource).toContain('批量标记已支付')
    expect(pageSource).toContain('导师端')
    expect(pageSource).toContain('班主任端')
    expect(pageSource).toContain('助教端')
    expect(modalSource).toContain('支付日期')
    expect(modalSource).toContain('银行流水号')
    expect(modalSource).toContain('确认已支付')
  })

  it('wires the page to the real finance APIs and mark-paid modal instead of placeholders', () => {
    const pageSource = readSource(settlementViewPath)

    expect(pageSource).toContain('getFinanceSettlementList(')
    expect(pageSource).toContain('getFinanceSettlementStats(')
    expect(pageSource).toContain('markFinanceSettlementPaid(')
    expect(pageSource).toContain('batchPayFinanceSettlement(')
    expect(pageSource).toContain('selectedSettlementIds')
    expect(pageSource).toContain('<MarkPaidModal')
    expect(pageSource).not.toContain('课时结算页面开发中')
  })
})

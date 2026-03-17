import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const viewPath = path.resolve(__dirname, '../views/resources/online-test-bank/index.vue')
const modalPath = path.resolve(__dirname, '../views/resources/online-test-bank/components/TestBankFormModal.vue')
const apiPath = path.resolve(__dirname, '../../../shared/src/api/admin/testBank.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('在线测试题库页面', () => {
  it('renders the two-tab shell, pending banner, and modal fields from the PRD', () => {
    expect(fs.existsSync(viewPath)).toBe(true)
    expect(fs.existsSync(modalPath)).toBe(true)
    expect(fs.existsSync(apiPath)).toBe(true)

    const pageSource = readSource(viewPath)
    const modalSource = readSource(modalPath)

    expect(pageSource).toContain('在线测试题库')
    expect(pageSource).toContain('管理HireVue、Pymetrics、SHL等在线测试资源')
    expect(pageSource).toContain('题库列表')
    expect(pageSource).toContain('学员申请')
    expect(pageSource).toContain('待分配')
    expect(pageSource).toContain('班主任流转')
    expect(pageSource).toContain('mdi-video')
    expect(pageSource).toContain('mdi-brain')
    expect(pageSource).toContain('mdi-calculator')
    expect(modalSource).toContain('题库名称')
    expect(modalSource).toContain('公司')
    expect(modalSource).toContain('类型')
    expect(modalSource).toContain('题目数')
    expect(modalSource).toContain('状态')
  })

  it('wires the page to the real test-bank APIs instead of placeholders', () => {
    const pageSource = readSource(viewPath)
    const apiSource = readSource(apiPath)

    expect(apiSource).toContain('getTestBankList(')
    expect(apiSource).toContain('createTestBank(')
    expect(apiSource).toContain('updateTestBank(')
    expect(pageSource).toContain('getTestBankList(')
    expect(pageSource).toContain('createTestBank(')
    expect(pageSource).toContain('updateTestBank(')
    expect(pageSource).toContain('<TestBankFormModal')
    expect(pageSource).not.toContain('在线测试题库开发中')
  })
})

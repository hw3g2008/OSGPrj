import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const qbankViewPath = path.resolve(__dirname, '../views/resources/qbank/index.vue')
const qbankModalPath = path.resolve(__dirname, '../views/resources/qbank/components/QbankFolderModal.vue')
const qbankApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/qbank.ts')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('题库管理页面', () => {
  it('renders the qbank shell, folder table columns, modal fields, and sidebar entry anchors', () => {
    expect(fs.existsSync(qbankViewPath)).toBe(true)
    expect(fs.existsSync(qbankModalPath)).toBe(true)
    expect(fs.existsSync(qbankApiPath)).toBe(true)

    const pageSource = readSource(qbankViewPath)
    const modalSource = readSource(qbankModalPath)

    expect(pageSource).toContain('题库管理')
    expect(pageSource).toContain('Question Bank')
    expect(pageSource).toContain('New Folder')
    expect(pageSource).toContain('Expired')
    expect(pageSource).toContain('Authorized To')
    expect(pageSource).toContain('mdi-folder')
    expect(modalSource).toContain('Folder Name')
    expect(modalSource).toContain('全部用户')
    expect(modalSource).toContain('指定班级')
    expect(modalSource).toContain('指定用户')
    expect(modalSource).toContain('过期时间')
  })

  it('wires the qbank page to the real APIs and modal instead of placeholders', () => {
    const pageSource = readSource(qbankViewPath)
    const apiSource = readSource(qbankApiPath)

    expect(apiSource).toContain('getQbankList(')
    expect(apiSource).toContain('createQbankFolder(')
    expect(apiSource).toContain('updateQbankAuth(')
    expect(apiSource).toContain('updateQbankExpiry(')
    expect(pageSource).toContain('getQbankList(')
    expect(pageSource).toContain('createQbankFolder(')
    expect(pageSource).toContain('updateQbankAuth(')
    expect(pageSource).toContain('updateQbankExpiry(')
    expect(pageSource).toContain('<QbankFolderModal')
    expect(pageSource).not.toContain('题库管理开发中')
  })
})

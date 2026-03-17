import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const allClassesViewPath = path.resolve(__dirname, '../views/teaching/all-classes/index.vue')
const detailModalPath = path.resolve(__dirname, '../views/teaching/all-classes/components/ClassDetailModal.vue')

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

describe('全部课程页面', () => {
  it('renders the all-classes shell with five tabs, six modal variants, and pagination copy', () => {
    expect(fs.existsSync(allClassesViewPath)).toBe(true)
    expect(fs.existsSync(detailModalPath)).toBe(true)

    const pageSource = readSource(allClassesViewPath)
    const modalSource = readSource(detailModalPath)

    expect(pageSource).toContain('全部课程')
    expect(pageSource).toContain('全部')
    expect(pageSource).toContain('待审核')
    expect(pageSource).toContain('未支付')
    expect(pageSource).toContain('已支付')
    expect(pageSource).toContain('已驳回')
    expect(pageSource).toContain('每页 10 条')
    expect(modalSource).toContain('入职面试')
    expect(modalSource).toContain('模拟面试')
    expect(modalSource).toContain('模拟期中考试')
    expect(modalSource).toContain('人际关系期中')
    expect(modalSource).toContain('笔试辅导')
    expect(modalSource).toContain('已驳回')
    expect(modalSource).toContain('class-detail-modal__hero--entry')
    expect(modalSource).toContain('class-detail-modal__hero--mock')
    expect(modalSource).toContain('class-detail-modal__hero--midterm')
    expect(modalSource).toContain('class-detail-modal__hero--networking')
    expect(modalSource).toContain('class-detail-modal__hero--written')
    expect(modalSource).toContain('class-detail-modal__hero--rejected')
  })

  it('wires the page to the real all-classes APIs and detail modal instead of placeholders', () => {
    const pageSource = readSource(allClassesViewPath)

    expect(pageSource).toContain('getAllClassesList(')
    expect(pageSource).toContain('getAllClassesDetail(')
    expect(pageSource).toContain('activeTab')
    expect(pageSource).toContain('currentPage')
    expect(pageSource).toContain('<ClassDetailModal')
    expect(pageSource).not.toContain('全部课程页面开发中')
  })
})

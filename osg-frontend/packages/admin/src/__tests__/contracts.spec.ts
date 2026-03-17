import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const contractsPagePath = path.resolve(__dirname, '../views/users/contracts/index.vue')

function readSource() {
  return fs.readFileSync(contractsPagePath, 'utf-8')
}

function readBlock(source: string, anchor: string, nextAnchor?: string) {
  const start = source.indexOf(anchor)
  if (start === -1) {
    throw new Error(`anchor not found: ${anchor}`)
  }
  if (!nextAnchor) {
    return source.slice(start)
  }
  const end = source.indexOf(nextAnchor, start + anchor.length)
  return end === -1 ? source.slice(start) : source.slice(start, end)
}

describe('contracts page shell', () => {
  it('keeps the page header focused on the renew-contract CTA', () => {
    const source = readSource()
    const headerBlock = readBlock(source, '<div class="page-header">', '\n\n    <section class="contracts-stats">')
    const filtersActionBlock = readBlock(source, '<div class="contracts-filters__actions">', '\n        </div>')

    expect(headerBlock).toContain('续签合同')
    expect(headerBlock).toContain('新增学员时的合同信息会自动同步到此处')
    expect(headerBlock).not.toContain('mdi-file-export-outline')
    expect(filtersActionBlock).toContain('搜索')
    expect(filtersActionBlock).toContain('重置')
    expect(filtersActionBlock).toContain('导出')
  })

  it('renders contract stat cards in the value-first order used by the prototype shell', () => {
    const source = readSource()

    expect(source).toContain('<div class="contracts-stats__value">{{ card.value }}</div>')
    expect(source).toContain('<div class="contracts-stats__label">{{ card.label }}</div>')
    expect(source.indexOf('contracts-stats__value')).toBeLessThan(source.indexOf('contracts-stats__label'))
  })

  it('uses a compact inline filter shell instead of the labeled six-column grid', () => {
    const source = readSource()
    const filtersStyleBlock = readBlock(source, '.contracts-filters {', '\n}\n\n.contracts-filter-group {')

    expect(source).not.toContain('<label class="contracts-field">')
    expect(source).toContain('placeholder="姓名或学员ID"')
    expect(filtersStyleBlock).toContain('display: flex;')
    expect(filtersStyleBlock).toContain('flex-wrap: wrap;')
    expect(filtersStyleBlock).toContain('align-items: center;')
    expect(filtersStyleBlock).not.toContain('grid-template-columns')
  })

  it('keeps the row-level actions as lightweight text buttons instead of highlighting renew as a primary action', () => {
    const source = readSource()

    expect(source).toContain('class="contracts-actions"')
    expect(source).not.toContain('contracts-action--primary')
  })
})

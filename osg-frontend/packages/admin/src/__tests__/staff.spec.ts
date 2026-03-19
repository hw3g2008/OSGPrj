import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const staffPagePath = path.resolve(__dirname, '../views/users/staff/index.vue')

function readSource() {
  return fs.readFileSync(staffPagePath, 'utf-8')
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

describe('staff page shell', () => {
  it('keeps the page header focused on the add-mentor CTA', () => {
    const source = readSource()
    const headerBlock = readBlock(source, '<div class="page-header">', '\n\n    <section class="permission-card">')

    expect(headerBlock).toContain('新增导师')
    expect(headerBlock).not.toContain('重置筛选')
  })

  it('keeps the pending-review banner visually aligned with the prototype and exposes a direct handle button', () => {
    const source = readSource()

    expect(source).toContain('staff-banner__icon')
    expect(source).toContain('staff-banner__action')
    expect(source).toContain('立即处理')
  })

  it('uses an inline filter toolbar while keeping semantic labels in the source', () => {
    const source = readSource()
    const filtersStyleBlock = readBlock(source, '.staff-filters {', '\n}\n\n.staff-field {')

    expect(source).toContain('class="staff-field__label"')
    expect(filtersStyleBlock).toContain('display: flex;')
    expect(filtersStyleBlock).toContain('flex-wrap: wrap;')
    expect(filtersStyleBlock).toContain('align-items: center;')
    expect(filtersStyleBlock).not.toContain('grid-template-columns')
  })

  it('keeps row actions visually lightweight, matching the prototype text-button rhythm', () => {
    const source = readSource()

    expect(source).toContain('更多')
    expect(source).toContain('class="staff-action-link"')
    expect(source).not.toContain('linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)')
  })
})

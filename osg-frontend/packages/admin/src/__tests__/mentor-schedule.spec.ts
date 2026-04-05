import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schedulePagePath = path.resolve(__dirname, '../views/users/mentor-schedule/index.vue')

function readSource() {
  return fs.readFileSync(schedulePagePath, 'utf-8')
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

describe('mentor schedule page shell', () => {
  it('keeps the page header focused on export while leaving the remind CTA in the banner', () => {
    const source = readSource()
    const headerBlock = readBlock(source, '<div class="page-header">', '\n\n    <div v-if="unfilledCount > 0" class="schedule-banner">')

    expect(headerBlock).toContain('监控排期填写情况，协调导师资源')
    expect(headerBlock).toContain('导出排期表')
    expect(headerBlock).toContain('permission-button--primary')
    expect(source).toContain('class="schedule-banner__action"')
    expect(source).toContain('一键催促全部')
  })

  it('uses an inline filter toolbar driven by placeholders and data-field-name metadata', () => {
    const source = readSource()
    const filtersStyleBlock = readBlock(source, '.schedule-filters {', '\n}\n\n.schedule-input,')

    expect(source).toContain('data-field-name="导师排期管理页"')
    expect(source).toContain('data-field-name="类型"')
    expect(source).toContain('data-field-name="日期"')
    expect(source).toContain('data-field-name="时段"')
    expect(filtersStyleBlock).toContain('display: flex;')
    expect(filtersStyleBlock).toContain('align-items: center;')
    expect(source).toContain("@media (max-width: 720px)")
    expect(source).toContain('.schedule-filters { flex-wrap: wrap; }')
    expect(filtersStyleBlock).not.toContain('grid-template-columns')
  })
})

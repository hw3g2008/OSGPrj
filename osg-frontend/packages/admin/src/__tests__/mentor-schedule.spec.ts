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

  it('uses an inline filter toolbar while keeping semantic labels in the source', () => {
    const source = readSource()
    const filtersStyleBlock = readBlock(source, '.schedule-filters {', '\n}\n\n.schedule-field {')

    expect(source).toContain('class="schedule-field__label"')
    expect(filtersStyleBlock).toContain('display: flex;')
    expect(filtersStyleBlock).toContain('flex-wrap: wrap;')
    expect(filtersStyleBlock).toContain('align-items: center;')
    expect(filtersStyleBlock).not.toContain('grid-template-columns')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminVisualContractPath = path.resolve(
  __dirname,
  '../../../../../osg-spec-docs/docs/01-product/prd/admin/UI-VISUAL-CONTRACT.yaml',
)
const studentsVisualFixturePath = path.resolve(
  __dirname,
  '../../../../tests/e2e/fixtures/admin/students/list.json',
)

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

function readPageBlock(source: string, pageId: string): string {
  const marker = `  - page_id: ${pageId}`
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(`page block not found: ${pageId}`)
  }
  const next = source.indexOf('\n  - page_id: ', start + marker.length)
  return next === -1 ? source.slice(start) : source.slice(start, next)
}

describe('admin visual contract', () => {
  it('keeps students page on mock+clip contract with declared fixture routes', () => {
    const source = readSource(adminVisualContractPath)
    const studentsBlock = readPageBlock(source, 'students')

    expect(studentsBlock).toContain('data_mode: mock')
    expect(studentsBlock).toContain('capture_mode: clip')
    expect(studentsBlock).toContain('clip_selector: .students-page')
    expect(studentsBlock).toContain('fixture_routes:')
    expect(studentsBlock).toContain('url: /api/getInfo')
    expect(studentsBlock).toContain('url: /admin/student/list')
  })

  it('keeps the students visual fixture aligned with the six-row prototype shell', () => {
    const fixture = JSON.parse(readSource(studentsVisualFixturePath)) as {
      total: number
      rows: Array<{ contractStatus?: string; isBlacklisted?: boolean }>
    }

    const blacklisted = fixture.rows.filter((row) => row.isBlacklisted === true || row.contractStatus === 'blacklist')
    const visibleNormalRows = fixture.rows.length - blacklisted.length

    expect(fixture.total).toBe(8)
    expect(blacklisted).toHaveLength(2)
    expect(visibleNormalRows).toBe(6)
  })
})

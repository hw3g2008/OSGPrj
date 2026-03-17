import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const prototypeSource = fs.readFileSync(
  path.resolve(__dirname, '../../../../../osg-spec-docs/source/prototype/admin.html'),
  'utf-8'
)

describe('prototype students page structure', () => {
  it('uses the optimized students layout markers instead of the old flat table-only shell', () => {
    expect(prototypeSource).toContain('students-prototype-shell')
    expect(prototypeSource).toContain('students-filters__primary')
    expect(prototypeSource).toContain('students-filters__secondary')
    expect(prototypeSource).toContain('students-table--optimized')
    expect(prototypeSource).toContain('学员信息')
    expect(prototypeSource).toContain('学习信息')
    expect(prototypeSource).toContain('求职信息')
    expect(prototypeSource).toContain('student-cell-block')
  })

  it('does not constrain the students page to a narrow centered shell', () => {
    expect(prototypeSource).not.toContain('max-width: 1240px')
    expect(prototypeSource).toContain('max-width: none')
    expect(prototypeSource).toContain('width: 100%')
  })

  it('uses the denser follow-up layout markers for alert and metrics', () => {
    expect(prototypeSource).toContain('students-alert--compact')
    expect(prototypeSource).toContain('student-meta-list')
    expect(prototypeSource).toContain('student-metric-strip')
    expect(prototypeSource).toContain('student-metric')
  })

  it('clarifies the filter hierarchy and compresses row metadata further', () => {
    expect(prototypeSource).toContain('students-filters__section-title')
    expect(prototypeSource).toContain('student-meta-inline')
    expect(prototypeSource).toContain('students-blacklist-table')
  })

  it('keeps the reminder and list header in a compact inline rhythm', () => {
    expect(prototypeSource).toContain('students-alert--inline')
    expect(prototypeSource).toContain('students-list-meta--compact')
    expect(prototypeSource).toContain('students-tabs-note--compact')
    expect(prototypeSource).toContain('students-meta-chip--quiet')
  })

  it('keeps the right-side reminder, status and actions visually quieter', () => {
    expect(prototypeSource).toContain('student-reminder--flat')
    expect(prototypeSource).toContain('student-status-stack--compact')
    expect(prototypeSource).toContain('student-action-row--quiet')
  })

  it('gives the left-side information columns a clearer pair-row hierarchy', () => {
    expect(prototypeSource).toContain('student-email-line')
    expect(prototypeSource).toContain('student-pair-row')
    expect(prototypeSource).toContain('student-pair-label')
    expect(prototypeSource).toContain('student-pair-value')
  })

  it('stabilizes the students table with explicit column sizing', () => {
    expect(prototypeSource).toContain('students-colgroup')
    expect(prototypeSource).toContain('students-col--info')
    expect(prototypeSource).toContain('students-col--hours')
    expect(prototypeSource).toContain('students-col--actions')
  })

  it('flattens the filter shell and table header rhythm', () => {
    expect(prototypeSource).toContain('students-filters--flat')
    expect(prototypeSource).toContain('students-table--soft-head')
  })

  it('keeps the list summary and pagination in a flatter closing rhythm', () => {
    expect(prototypeSource).toContain('students-list-meta--inline')
    expect(prototypeSource).toContain('students-pagination--compact')
    expect(prototypeSource).toContain('students-pagination__summary')
  })

  it('tightens the alert and table density for a more final-looking admin page', () => {
    expect(prototypeSource).toContain('students-alert--micro')
    expect(prototypeSource).toContain('students-table--dense')
    expect(prototypeSource).toContain('student-hours-box--compact')
  })

  it('keeps the top shell and row rhythm extra light for the final polish pass', () => {
    expect(prototypeSource).toContain('students-filters--micro')
    expect(prototypeSource).toContain('students-list-meta--micro')
    expect(prototypeSource).toContain('student-cell-block--tight')
  })

  it('settles the upper layout stack into a tighter final rhythm', () => {
    expect(prototypeSource).toContain('students-prototype-shell--settled')
    expect(prototypeSource).toContain('students-header--compact')
    expect(prototypeSource).toContain('students-tabs-row--micro')
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const positionsSource = fs.readFileSync(
  path.resolve(__dirname, '../views/positions/index.vue'),
  'utf-8'
)
const positionsVisualFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../tests/e2e/fixtures/student/positions/list.json'),
    'utf-8'
  )
) as { data: Array<{ deadline: string }> }

function isClosedAgainstVisualSnapshot(deadline: string) {
  const [monthText, dayText] = deadline.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  const visualSnapshotDate = new Date('2026-03-16T12:00:00+08:00')
  const deadlineDate = new Date(2026, month - 1, day, 23, 59, 59, 999)
  return deadlineDate.getTime() < visualSnapshotDate.getTime()
}

describe('student positions source contract', () => {
  it('keeps the job tracker title, filters, and table headers from the prototype', () => {
    const expectedLabels = [
      '岗位信息',
      'Job Tracker',
      '追踪各大公司招聘岗位信息，记录您的申请进度',
      '全部分类',
      '全部行业',
      '全部公司',
      '全部地区',
      '搜索岗位名称...',
      '岗位名称',
      '岗位分类',
      '部门',
      '地区',
      '招聘周期',
      '发布时间',
      '截止时间',
      '操作',
      '开放中',
      '已关闭'
    ]

    for (const label of expectedLabels) {
      expect(positionsSource).toContain(label)
    }
  })

  it('defines the modal/action trigger coverage required by story S-004', () => {
    const triggerMatches = positionsSource.match(/actionId:/g) ?? []

    expect(positionsSource).toContain('const positionsActionTriggers = [')
    expect(triggerMatches).toHaveLength(15)
    expect(positionsSource).toContain('手动添加岗位')
    expect(positionsSource).toContain('标记已投递')
    expect(positionsSource).toContain('申请面试辅导')
    expect(positionsSource).toContain('记录岗位进度')
  })

  it('uses prototype-style content tabs and business-side company meta for the positions drilldown shell', () => {
    expect(positionsSource).toContain('content-tab-strip')
    expect(positionsSource).toContain('content-tab-trigger')
    expect(positionsSource).toContain('companyOptionsByValue')
    expect(positionsSource).toContain('company-career-link')
    expect(positionsSource).toContain('Goldman Sachs')
    expect(positionsSource).toContain('JP Morgan')
    expect(positionsSource).toContain('McKinsey')
  })

  it('keeps the visual fixture aligned with the prototype footer summary counts', () => {
    const total = positionsVisualFixture.data.length
    const closed = positionsVisualFixture.data.filter((record) => isClosedAgainstVisualSnapshot(record.deadline)).length
    const open = total - closed

    expect(total).toBe(12)
    expect(open).toBe(10)
    expect(closed).toBe(2)
  })

  it('loads banner, filters, and display metadata from business APIs instead of static frontend constants', () => {
    expect(positionsSource).toContain('getStudentPositionMeta')
    expect(positionsSource).not.toContain("const industryMeta: Record<IndustryKey")
    expect(positionsSource).not.toContain('const companyBrandColors: Record<string, string>')
    expect(positionsSource).not.toContain('function normalizeLocation(location: string)')
    expect(positionsSource).not.toContain('当前展示 <strong>2025 Summer</strong>')
    expect(positionsSource).not.toContain("<a-select-option value=\"gs\">Goldman Sachs</a-select-option>")
    expect(positionsSource).not.toContain("<a-select-option value=\"ldn\">London</a-select-option>")
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indexSource = fs.readFileSync(
  path.resolve(__dirname, '../views/job-overview/index.vue'),
  'utf-8',
)

describe('mentor job overview source contract (FIX-E strict mode)', () => {
  it('declares exactly the 5 required columns: 学员/公司/岗位/面试状态/面试时间', () => {
    const matches = indexSource.match(/title:\s*'([^']+)'/g) || []
    const titles = matches.map((m) => m.replace(/title:\s*'([^']+)'/, '$1'))
    expect(titles).toEqual(['学员', '公司', '岗位', '面试状态', '面试时间'])
  })

  it('does not import or render InterviewCalendar', () => {
    expect(indexSource).not.toContain('InterviewCalendar')
    expect(indexSource).not.toContain('allCalendarEvents')
    expect(indexSource).not.toContain('/api/mentor/job-overview/calendar')
  })

  it('does not render a job detail modal or confirm/查看详情 actions', () => {
    expect(indexSource).not.toContain('modal-job-detail')
    expect(indexSource).not.toContain('查看详情')
    expect(indexSource).not.toContain('btn-confirm')
    expect(indexSource).not.toContain('confirmJob')
    expect(indexSource).not.toContain('/confirm')
  })

  it('exposes only the 面试状态 filter — no keyword search, no company select', () => {
    expect(indexSource).not.toContain('搜索学员姓名')
    expect(indexSource).not.toContain('全部公司')
    expect(indexSource).toContain("placeholder=\"全部面试状态\"")
    const selectMatches = indexSource.match(/<a-select(?!-)/g) || []
    expect(selectMatches).toHaveLength(1)
  })

  it('falls back interviewTime to 待定 when null', () => {
    expect(indexSource).toContain('待定')
    expect(indexSource).toMatch(/!record\.interviewTime/)
  })

  it('falls back studentName to 学员{id} when missing', () => {
    expect(indexSource).toMatch(/学员\$\{record\.studentId\}|`学员\$\{record\.studentId\}`/)
  })

  it('describes the page as "查看分配给我的学员求职进度"', () => {
    expect(indexSource).toContain('查看分配给我的学员求职进度')
  })

  it('exports current list with status param only (no keyword/company)', () => {
    expect(indexSource).toMatch(/params:\s*\{\s*status:\s*selectedStatus\.value\s*\}/)
  })

  it('loads only the list endpoint on mount (no calendar fetch)', () => {
    expect(indexSource).toContain('/api/mentor/job-overview/list')
    expect(indexSource).not.toContain('getMentorJobOverviewCalendar')
  })
})

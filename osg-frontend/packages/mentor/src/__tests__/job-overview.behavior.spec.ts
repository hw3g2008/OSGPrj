import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indexSource = fs.readFileSync(
  path.resolve(__dirname, '../views/job-overview/index.vue'),
  'utf-8',
)

// Step3-F2 (2026-05-10): 升级 source contract — §5.2 mentor job-overview 要求 row 维度 = coaching、
// 列扩到 8（学员/公司/岗位/城市/面试状态/面试时间/已上报课消数/操作）+ 上报课消按钮，并保留
// 上一阶段 FIX-E 锁定的反向断言（不能有 InterviewCalendar / 查看详情 / confirm 入口）。
describe('mentor job overview source contract (§5.2 strict mode)', () => {
  it('declares the 8 required columns: 学员/公司/岗位/城市/面试状态/面试时间/已上报课消数/操作', () => {
    const matches = indexSource.match(/title:\s*'([^']+)'/g) || []
    const titles = matches.map((m) => m.replace(/title:\s*'([^']+)'/, '$1'))
    expect(titles).toEqual(['学员', '公司', '岗位', '城市', '面试状态', '面试时间', '已上报课消数', '操作'])
  })

  it('exposes a 上报课消 action that opens the shared ReportModal with job_coaching prefill', () => {
    // §5.2 上报课消按钮存在
    expect(indexSource).toContain('上报课消')
    // ReportModal 通过 mentor 现有 ../courses/components/ReportModal.vue 接入 shared ClassReportFlowModal
    expect(indexSource).toContain("import ReportModal from '../courses/components/ReportModal.vue'")
    // 预填走 job_coaching reference type
    expect(indexSource).toContain("'job_coaching'")
  })

  it('uses coachingId as row-key with applicationId fallback', () => {
    expect(indexSource).toMatch(/row-key=.*record\.coachingId\s*\?\?\s*record\.id/)
  })

  it('does not render the deprecated stats cards (statsCards 已按 Step 3 §5.2 删除)', () => {
    expect(indexSource).not.toContain('stats-row')
    expect(indexSource).not.toContain('StatCard')
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

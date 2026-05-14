import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const indexSource = fs.readFileSync(
  path.resolve(__dirname, '../views/job-overview/index.vue'),
  'utf-8',
)

// RULE-A 批次 3 (2026-05-11): 导师端学员求职总览升级为 9 列 + 4 项筛选。
// - 列：学生ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 已上报课消数 / 操作
// - 筛选：公司 / 面试阶段 / 面试时间 / 是否上报课消
// - 列名修正：「面试状态」→「面试阶段」
describe('mentor job overview source contract (RULE-A 批次 3)', () => {
  it('declares the 9 required columns with 学生ID 列 fixed left', () => {
    const matches = indexSource.match(/title:\s*'([^']+)'/g) || []
    const titles = matches.map((m) => m.replace(/title:\s*'([^']+)'/, '$1'))
    expect(titles).toEqual([
      '学生ID',
      '学生姓名',
      '岗位',
      '公司',
      '城市',
      '面试阶段',
      '面试时间',
      '已上报课消数',
      '操作',
    ])
  })

  it('first column 学生ID is fixed left', () => {
    expect(indexSource).toContain("{ title: '学生ID', key: 'studentId'")
    expect(indexSource).toMatch(/title:\s*'学生ID'[^}]*fixed:\s*'left'/s)
  })

  it('column name is 面试阶段, not 面试状态', () => {
    expect(indexSource).toContain("title: '面试阶段'")
    expect(indexSource).not.toMatch(/title:\s*'面试状态'/)
  })

  it('exposes 4 filter controls: 公司 / 面试阶段 / 面试时间 / 是否上报课消', () => {
    expect(indexSource).toContain('placeholder="全部公司"')
    expect(indexSource).toContain('placeholder="全部面试阶段"')
    expect(indexSource).toContain('placeholder="是否上报课消"')
    // 面试时间用 a-range-picker
    expect(indexSource).toContain('<a-range-picker')
    // 搜索按钮存在
    expect(indexSource).toContain('搜索')
  })

  it('filters reactive state includes 4 filter fields', () => {
    expect(indexSource).toContain('companyName:')
    expect(indexSource).toContain('currentStage:')
    expect(indexSource).toContain('interviewRange:')
    expect(indexSource).toContain('lessonReported:')
  })

  it('exposes 上报课消 action with job_coaching prefill', () => {
    expect(indexSource).toContain('上报课消')
    expect(indexSource).toContain("import ReportModal from '../courses/components/ReportModal.vue'")
    expect(indexSource).toContain("'job_coaching'")
  })

  it('uses coachingId as row-key with applicationId fallback', () => {
    expect(indexSource).toMatch(/row-key=.*record\.coachingId\s*\?\?\s*record\.id/)
  })

  it('does not render the deprecated stats cards', () => {
    expect(indexSource).not.toContain('stats-row')
    expect(indexSource).not.toContain('StatCard')
  })

  it('does not import or render InterviewCalendar', () => {
    expect(indexSource).not.toContain('InterviewCalendar')
    expect(indexSource).not.toContain('allCalendarEvents')
    expect(indexSource).not.toContain('/mentor/job-overview/calendar')
  })

  it('does not render a job detail modal or confirm/查看详情 actions', () => {
    expect(indexSource).not.toContain('modal-job-detail')
    expect(indexSource).not.toContain('查看详情')
    expect(indexSource).not.toContain('btn-confirm')
    expect(indexSource).not.toContain('confirmJob')
    expect(indexSource).not.toContain('/confirm')
  })

  it('falls back interviewTime to 待定 when null', () => {
    expect(indexSource).toContain('待定')
    expect(indexSource).toMatch(/!record\.interviewTime/)
  })

  it('falls back studentName to 学员{id} when missing', () => {
    expect(indexSource).toMatch(/学员\$\{record\.studentId\}|`学员\$\{record\.studentId\}`/)
  })

  it('renders the RULE-A page header "学员求职总览 Job Overview"', () => {
    // §baseline: 旧副标题"查看分配给我的学员求职进度"已删除，view 现采用 PageHeader 标题。
    expect(indexSource).toContain('学员求职总览')
    expect(indexSource).toContain('Job Overview')
  })

  it('exports current list with 4 filter params', () => {
    expect(indexSource).toContain('companyName: filters.companyName')
    expect(indexSource).toContain('currentStage: filters.currentStage')
    expect(indexSource).toContain('lessonReported: filters.lessonReported')
  })

  it('loads only the list endpoint on mount (no calendar fetch)', () => {
    expect(indexSource).toContain('/mentor/job-overview/list')
    expect(indexSource).not.toContain('getMentorJobOverviewCalendar')
  })
})

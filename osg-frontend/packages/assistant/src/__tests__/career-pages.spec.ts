import fs from 'node:fs'
import path from 'node:path'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantPositionDrillDown: vi.fn(),
  getAssistantPositionStudents: vi.fn(),
  getAssistantJobOverviewList: vi.fn(),
  getAssistantJobOverviewCalendar: vi.fn(),
  getAssistantMockPracticeList: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

const industryMetaFixture = [
  { value: 'bulge_bracket', label: 'Bulge Bracket', tone: 'gold', icon: 'mdi-trophy' },
  { value: 'elite_boutique', label: 'Elite Boutique', tone: 'violet', icon: 'mdi-diamond-stone' },
  { value: 'middle_market', label: 'Middle Market', tone: 'blue', icon: 'mdi-city' },
  { value: 'buyside', label: 'Buy-Side', tone: 'amber', icon: 'mdi-currency-usd' },
  { value: 'consulting', label: 'Consulting', tone: 'teal', icon: 'mdi-lightbulb' },
  { value: 'swe_pm', label: 'SWE / PM', tone: 'indigo', icon: 'mdi-laptop' },
  { value: 'other_company', label: '其他公司', tone: 'slate', icon: 'mdi-briefcase' },
]

// 用 importActual 保留 PositionsListTable / PositionsDrilldown / PositionsFooter 真实组件
// （与 LM positions-shell.spec.ts 对齐，M2 共享组件抽取后必需）
vi.mock('@osg/shared', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared')>('@osg/shared')
  return {
    ...actual,
    useIndustryMeta: () => ({
      meta: { value: industryMetaFixture },
      load: vi.fn().mockResolvedValue(industryMetaFixture),
    }),
  }
})

const {
  getAssistantPositionDrillDown,
  getAssistantPositionStudents,
  getAssistantJobOverviewList,
  getAssistantJobOverviewCalendar,
  getAssistantMockPracticeList,
} = apiMocks

import PositionsPage from '@/views/career/positions/index.vue'

const positionDrillDownFixture = [
  {
    industry: 'Investment Bank',
    companyCount: 2,
    positionCount: 2,
    openCount: 1,
    studentCount: 3,
    companies: [
      {
        companyName: 'Goldman Sachs',
        companyType: 'Investment Bank',
        companyWebsite: 'https://goldmansachs.com/careers',
        positionCount: 1,
        openCount: 1,
        studentCount: 2,
        positions: [
          {
            positionId: 101,
            positionCategory: 'summer',
            industry: 'Investment Bank',
            companyName: 'Goldman Sachs',
            companyType: 'Investment Bank',
            companyWebsite: 'https://goldmansachs.com/careers',
            positionName: 'IB Analyst',
            department: 'IBD',
            region: 'Hong Kong',
            city: 'Hong Kong',
            recruitmentCycle: '2026 Summer',
            projectYear: '2026',
            publishTime: '2026-03-20T10:00:00',
            displayStatus: 'visible',
            positionUrl: 'https://goldmansachs.com/jobs/101',
            studentCount: 2,
          },
        ],
      },
      {
        companyName: 'JP Morgan',
        companyType: 'Investment Bank',
        companyWebsite: 'https://jpmorgan.com/careers',
        positionCount: 1,
        openCount: 0,
        studentCount: 1,
        positions: [
          {
            positionId: 102,
            positionCategory: 'fulltime',
            industry: 'Investment Bank',
            companyName: 'JP Morgan',
            companyType: 'Investment Bank',
            companyWebsite: 'https://jpmorgan.com/careers',
            positionName: 'Markets Associate',
            department: 'Global Markets',
            region: 'New York',
            city: 'New York',
            recruitmentCycle: '2026 Full-time',
            projectYear: '2026',
            publishTime: '2026-03-19T10:00:00',
            displayStatus: 'hidden',
            positionUrl: 'https://jpmorgan.com/jobs/102',
            studentCount: 1,
          },
        ],
      },
    ],
  },
]

const studentRowsFixture = [
  {
    studentId: 2001,
    studentName: 'Amy Student',
    positionName: 'IB Analyst',
    status: 'First Round',
    statusTone: 'warning',
    usedHours: 2,
  },
]

const jobOverviewFixture = {
  total: 2,
  rows: [
    {
      id: 1,
      studentId: 3001,
      studentName: 'Amy Student',
      mentorId: 1,
      company: 'Goldman Sachs',
      position: 'IB Analyst',
      location: 'Hong Kong',
      interviewStage: 'First Round',
      interviewTime: '2026-03-25T14:00:00',
      coachingStatus: 'pending',
      result: '',
    },
    {
      id: 2,
      studentId: 3002,
      studentName: 'Ben Student',
      mentorId: 1,
      company: 'McKinsey',
      position: 'Business Analyst',
      location: 'Shanghai',
      interviewStage: 'Final',
      interviewTime: '2026-03-26T16:00:00',
      coachingStatus: 'coaching',
      result: 'offer',
    },
  ],
}

const jobOverviewCalendarFixture = [
  {
    id: 1,
    studentId: 3001,
    studentName: 'Amy Student',
    mentorId: 1,
    company: 'Goldman Sachs',
    position: 'IB Analyst',
    location: 'Hong Kong',
    interviewStage: 'First Round',
    interviewTime: '2026-03-25T14:00:00',
    coachingStatus: 'pending',
    result: '',
  },
]

const mockPracticeFixture = {
  total: 3,
  rows: [
    {
      practiceId: 11,
      studentId: 4001,
      studentName: 'Amy Student',
      practiceType: 'mock_interview',
      requestContent: 'Goldman Sachs mock interview',
      requestedMentorCount: 1,
      preferredMentorNames: 'Jerry',
      status: 'scheduled',
      mentorNames: 'Jerry',
      mentorBackgrounds: 'Goldman Sachs IBD',
      scheduledAt: '2026-03-28T10:00:00',
      completedHours: 0,
      feedbackRating: null,
      feedbackSummary: '',
      submittedAt: '2026-03-23T12:00:00',
    },
    {
      practiceId: 12,
      studentId: 4002,
      studentName: 'Ben Student',
      practiceType: 'communication_test',
      requestContent: 'Communication drill',
      requestedMentorCount: 1,
      preferredMentorNames: 'Tina',
      status: 'completed',
      mentorNames: 'Tina',
      mentorBackgrounds: 'Morgan Stanley',
      scheduledAt: '2026-03-21T15:00:00',
      completedHours: 2,
      feedbackRating: 5,
      feedbackSummary: '表达节奏稳定，反馈完整。',
      submittedAt: '2026-03-20T12:00:00',
    },
    {
      practiceId: 13,
      studentId: 4003,
      studentName: 'Cara Student',
      practiceType: 'relation_test',
      requestContent: 'Relationship practice',
      requestedMentorCount: 1,
      preferredMentorNames: 'Nina',
      status: 'pending',
      mentorNames: '',
      mentorBackgrounds: '',
      scheduledAt: '',
      completedHours: 0,
      feedbackRating: null,
      feedbackSummary: '',
      submittedAt: '2026-03-24T09:00:00',
    },
  ],
}

async function flushUi() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('assistant career pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssistantPositionDrillDown.mockResolvedValue(positionDrillDownFixture)
    getAssistantPositionStudents.mockResolvedValue(studentRowsFixture)
    getAssistantJobOverviewList.mockResolvedValue(jobOverviewFixture)
    getAssistantJobOverviewCalendar.mockResolvedValue(jobOverviewCalendarFixture)
    getAssistantMockPracticeList.mockResolvedValue(mockPracticeFixture)
  })

  it('positions page source aligns with admin Ant Design shell while hiding management surfaces', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../views/career/positions/index.vue'),
      'utf-8',
    )

    // PageHeader 迁移到 @osg/shared 后的新接口（D-Bilingual P1）
    expect(src).toContain('<PageHeader')
    expect(src).toContain('title-zh="岗位信息"')
    expect(src).toContain('title-en="Job Tracker"')
    expect(src).toContain("from '@osg/shared/components/PageHeader'")

    // 使用 Ant Design Vue 组件（对齐 admin 框架）
    expect(src).toContain('<a-radio-group')
    expect(src).toContain('<a-form layout="inline"')
    expect(src).toContain('<a-table')
    expect(src).toContain('<a-modal')
    expect(src).toContain('<a-spin')
    // <a-statistic> 已抽到共享 PositionsFooter；page 通过 PositionsListTable / PositionsDrilldown 引用
    expect(src).toContain('<PositionsListTable')
    expect(src).toContain('<PositionsDrilldown')

    // 下钻视图：与 admin 一致的两级折叠（使用 Set + toggle 函数）
    expect(src).toContain('expandedIndustries')
    expect(src).toContain('expandedCompanies')
    expect(src).toContain('function toggleIndustry')
    expect(src).toContain('function toggleCompany')
    expect(src).toContain('positions-drilldown__industry-head')
    expect(src).toContain('positions-drilldown__company-head')
    expect(src).toContain('positions-drilldown__position-list')

    // 列表视图：分页 + 水平滚动（解决"左右不能滑动"）
    expect(src).toContain(':pagination="tablePagination"')
    // :scroll="{ x: 1400 }" 已随 a-table 抽到共享 PositionsListTable，page source 不再直接含有
    expect(src).toContain('showSizeChanger: true')

    // 默认视图 = 列表（不是全展开下钻）
    expect(src).toContain("ref<ViewMode>('list')")

    // 统计已接入 shared PositionsFooter 组件（M2 followup commit 15257ed9）
    expect(src).toContain('<PositionsFooter')
    expect(src).toContain('PositionsFooter,')

    // 只读：不包含 admin 端的管理入口
    expect(src).not.toContain('新增岗位')
    expect(src).not.toContain('批量上传')
    expect(src).not.toContain('下载模板')
    expect(src).not.toContain('openCreateModal')
    expect(src).not.toContain('openEditModal')
    expect(src).not.toContain('排序')
    expect(src).not.toContain('分配导师')
    expect(src).not.toContain('更换导师')

    // 行业 tone 色系已抽到共享 useIndustryMeta + positionsTone 工具，
    // 共享组件渲染时使用 osg-industry-tag--{tone} / osg-positions-drilldown__industry-head--{tone}
    // page source 不再直接含 'industry-gold' 等字面值（参见 LM positions-shell.spec.ts 同步）
    // 此处仅断言 page 仍引用 useIndustryMeta hook（line 309 已覆盖）

    // 保留助教端业务语义
    expect(src).toContain('我的学员')
    expect(src).toContain('getAssistantPositionDrillDown')
    expect(src).toContain('getAssistantPositionStudents')
    expect(src).toContain('useIndustryMeta')
  })

  it('positions page mounts and loads drilldown data from the shared API', async () => {
    // 使用 stub 模式挂载，只验证数据加载链路（避免 jsdom 下 antd 真实渲染的 computedStyle 问题）
    const wrapper = mount(PositionsPage, {
      global: {
        stubs: {
          PageHeader: true,
          'a-radio-group': true,
          'a-radio-button': true,
          'a-card': { template: '<div><slot /></div>' },
          'a-statistic': true,
          'a-form': { template: '<div><slot /></div>' },
          'a-form-item': { template: '<div><slot /></div>' },
          'a-select': true,
          'a-select-option': true,
          'a-input': true,
          'a-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'a-space': { template: '<div><slot /></div>' },
          'a-spin': { template: '<div><slot /></div>' },
          'a-empty': true,
          'a-alert': true,
          'a-tag': { template: '<span><slot /></span>' },
          'a-table': { template: '<div class="stub-table"><slot /></div>' },
          'a-modal': true,
        },
      },
    })
    await flushUi()
    await flushUi()

    expect(getAssistantPositionDrillDown).toHaveBeenCalled()
    // drilldown 数据落地后，grouped 计算会产出行业 header（切到 drilldown 视图查看）
    const vm: any = wrapper.vm
    vm.viewMode = 'drilldown'
    await flushUi()
    // 共享 PositionsDrilldown 用 osg- 前缀防命名冲突（M2 抽取后必需）
    expect(wrapper.find('.osg-positions-drilldown').exists()).toBe(true)
    expect(wrapper.find('.osg-positions-drilldown__industry-head').exists()).toBe(true)
    // 默认未展开：companies 容器不应渲染
    expect(wrapper.find('.osg-positions-drilldown__companies').exists()).toBe(false)

    wrapper.unmount()
  })

  it('job overview page collapses to single managed tab anchored on coachingId', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../views/career/job-overview/index.vue'),
      'utf-8',
    )

    // PageHeader（保留 D-Bilingual 接口）
    expect(src).toContain('<PageHeader')
    expect(src).toContain('title-zh="学员求职总览"')
    expect(src).toContain('title-en="Job Overview"')
    expect(src).toContain("from '@osg/shared/components/PageHeader'")

    // 使用 osg-page 全局布局 class
    expect(src).toContain('class="osg-page"')

    // Ant Design Vue 组件
    expect(src).toContain('<a-card')
    expect(src).toContain('<a-table')
    expect(src).toContain('<StageTag')
    expect(src).toContain('<a-input')
    expect(src).toContain('<a-select')
    expect(src).toContain('<a-button')

    // §02 §5.1：助教端只显示一栏「我管理的学员」，无双 tab 切换
    expect(src).toContain('我管理的学员')
    expect(src).not.toContain("activeTab === 'coaching'")
    expect(src).not.toContain("activeTab === 'managed'")
    expect(src).not.toContain('我辅导的学员')
    expect(src).not.toContain('coachingColumns')
    expect(src).not.toContain('managedColumns')

    // row-key 优先 coachingId（fallback application id 兼容期）
    expect(src).toContain('coachingId ?? record.id')

    // §02 §5.1 列结构：学员 / 公司岗位 / 城市 / 面试阶段 / 面试时间 / 导师 / 最近评分 / 操作
    expect(src).toContain("title: '城市'")
    expect(src).toContain("dataIndex: 'location'")
    expect(src).toContain("title: '导师'")
    expect(src).toContain("dataIndex: 'mentorName'")
    expect(src).toContain("title: '最近评分'")
    expect(src).toContain("dataIndex: 'latestRating'")
    // 删除「辅导状态」列
    expect(src).not.toContain("title: '辅导状态'")
    expect(src).not.toContain("dataIndex: 'coachingStatus'")

    // 日历区保留
    expect(src).toContain('<InterviewCalendar')
    expect(src).toContain(':events="calendarRecords"')
    expect(src).toContain("from '@osg/shared/components'")

    // 行高亮（保留视觉提示）
    expect(src).toContain('row-new')
    expect(src).toContain('row-coaching')
    expect(src).toContain('row-pending')
    expect(src).toContain('row-ended')

    // 不再保留 type 筛选（双 tab 已删，下面 select 文案断言为子串："学员" 在标题里仍存在故不直接断言）
    expect(src).toContain('全部公司')
    expect(src).toContain('全部状态')

    // 只读：不包含 admin 端管理入口
    expect(src).not.toContain('待分配导师')
    expect(src).not.toContain('分配导师')
    expect(src).not.toContain('更换导师')
    expect(src).not.toContain('阶段确认')

    // 保留助教端业务语义
    expect(src).toContain('getAssistantJobOverviewList')
    expect(src).toContain('getAssistantJobOverviewCalendar')
    expect(src).toContain('查看详情')
    expect(src).toContain('跟进详情')
  })

  it('mock practice page collapses to single managed tab without stats cards', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../views/career/mock-practice/index.vue'),
      'utf-8',
    )

    // PageHeader（保留原型文案）
    expect(src).toContain('<PageHeader')
    expect(src).toContain('title-zh="模拟应聘管理"')
    expect(src).toContain('title-en="Mock Practice"')
    expect(src).toContain('description="处理学员的模拟面试、人际关系测试、期中考试申请"')
    expect(src).toContain("from '@osg/shared/components/PageHeader'")

    expect(src).toContain('class="osg-page"')

    // 删除统计卡片（§04 §4.1 删 statsCards）
    expect(src).not.toContain('statsCards')
    expect(src).not.toContain("label: '我辅导的'")
    expect(src).not.toContain("label: '已完成'")
    expect(src).not.toContain("label: '累计课时'")

    // §04 §4.1：单栏「我管理的学员」，无双 tab
    expect(src).toContain('我管理的学员')
    expect(src).not.toContain('我辅导的学员')
    expect(src).not.toContain("activeTab === 'coaching'")
    expect(src).not.toContain("activeTab === 'managed'")
    expect(src).not.toContain('id="mock-tab-coaching"')
    expect(src).not.toContain('id="mock-tab-managed"')
    expect(src).not.toContain('coachingColumns')
    expect(src).not.toContain('managedColumns')

    // 旧双栏 banner 文案删除
    expect(src).not.toContain('以下是由您亲自辅导的学员模拟应聘记录')
    expect(src).not.toContain('以下是您管理的学员的模拟应聘记录（由其他导师辅导）')

    // §04 §4.2 筛选只保留「类型」
    expect(src).not.toContain('搜索导师姓名')
    expect(src).not.toContain('搜索学员姓名/ID')
    expect(src).not.toContain("placeholder=\"全部状态\"")

    // §04 §4.3 列：学生 ID / 学生姓名 / 类型 / 申请时间 / 辅导老师 / 已上报课消数 / 操作
    expect(src).toContain("title: '学生 ID'")
    expect(src).toContain("title: '学生姓名'")
    expect(src).toContain("title: '类型'")
    expect(src).toContain("title: '申请时间'")
    expect(src).toContain("title: '辅导老师'")
    expect(src).toContain("title: '已上报课消数'")
    expect(src).toContain("dataIndex: 'reportedLessonCount'")

    // 旧列删除
    expect(src).not.toContain("title: '已上课时'")
    expect(src).not.toContain("title: '课程反馈'")
    expect(src).not.toContain("dataIndex: 'completedHours'")
    expect(src).not.toContain("dataIndex: 'feedback'")

    // 「确认」按钮等仅 mentor 视角元素删除
    expect(src).not.toContain('isNewAssigned')
    expect(src).not.toContain('confirmRecord')
    expect(src).not.toContain('confirmAssistantMockPractice')

    // 类型选项保留
    expect(src).toContain("value: 'mock_interview', label: '模拟面试'")
    expect(src).toContain("value: 'relation_test', label: '人际关系测试'")
    expect(src).toContain("value: 'midterm', label: '期中考试'")

    // 不包含 admin 入口
    expect(src).not.toContain('分配导师')
    expect(src).not.toContain('录入反馈')
    expect(src).not.toContain('新建模拟应聘')

    // 保留助教端业务语义
    expect(src).toContain('getAssistantMockPracticeList')
    expect(src).toContain('查看详情')
    expect(src).toContain('模拟应聘详情')
  })
})

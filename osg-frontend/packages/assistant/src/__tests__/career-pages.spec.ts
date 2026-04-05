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

const {
  getAssistantPositionDrillDown,
  getAssistantPositionStudents,
  getAssistantJobOverviewList,
  getAssistantJobOverviewCalendar,
  getAssistantMockPracticeList,
} = apiMocks

import JobOverviewPage from '@/views/career/job-overview/index.vue'
import MockPracticePage from '@/views/career/mock-practice/index.vue'
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
  total: 2,
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

  it('renders the positions page with lead-mentor structure while keeping assistant read-only students detail', async () => {
    const wrapper = mount(PositionsPage)
    await flushUi()

    expect(getAssistantPositionDrillDown).toHaveBeenCalledWith({})
    expect(wrapper.find('#page-positions').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Positions')
    expect(wrapper.find('.status-pill').text()).toContain('岗位总览')
    expect(wrapper.find('.filter-row').exists()).toBe(true)
    expect(wrapper.find('#assistant-position-drilldown').exists()).toBe(true)
    expect(wrapper.find('#assistant-position-list').exists()).toBe(true)
    expect(wrapper.findAll('.category-section')).toHaveLength(1)
    expect(wrapper.findAll('.company-section')).toHaveLength(2)
    expect(wrapper.find('.page-footer-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('Goldman Sachs')
    expect(wrapper.text()).toContain('IB Analyst')
    expect(wrapper.text()).toContain('我的学员: 3人')
    expect(wrapper.text()).toContain('开放中 1')
    expect(wrapper.text()).not.toContain('只读浏览')
    expect(wrapper.text()).not.toContain('分配导师')
    expect(wrapper.text()).not.toContain('更换导师')

    await wrapper.get('#assistant-positions-keyword').setValue('JP Morgan')
    await flushUi()

    expect(wrapper.text()).toContain('JP Morgan')
    expect(wrapper.findAll('.company-section')).toHaveLength(1)
    expect(wrapper.find('.company-name').text()).toContain('JP Morgan')

    await wrapper.get('.student-link').trigger('click')
    await flushUi()

    expect(getAssistantPositionStudents).toHaveBeenCalledWith(102)
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('First Round')
    expect(wrapper.text()).toContain('2h')
  })

  it('renders the job overview page with lead-mentor calendar shell but without management actions', async () => {
    const wrapper = mount(JobOverviewPage)
    await flushUi()

    expect(getAssistantJobOverviewList).toHaveBeenCalledTimes(1)
    expect(getAssistantJobOverviewCalendar).toHaveBeenCalledTimes(1)
    expect(wrapper.find('#page-job-overview').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Job Overview')
    expect(wrapper.find('.summary-grid').exists()).toBe(true)
    expect(wrapper.findAll('.summary-card')).toHaveLength(4)
    expect(wrapper.find('.calendar-card').exists()).toBe(true)
    expect(wrapper.find('.calendar-toolbar').exists()).toBe(true)
    expect(wrapper.find('.compact-days').exists()).toBe(true)
    expect(wrapper.find('.status-pill').text()).toContain('求职总览')
    expect(wrapper.find('.pending-pill').text()).toContain('1')
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('Goldman Sachs')
    expect(wrapper.text()).toContain('Business Analyst')
    expect(wrapper.text()).toContain('跟进详情')
    expect(wrapper.text()).not.toContain('敬请期待')
    expect(wrapper.text()).not.toContain('承载位')
    expect(wrapper.text()).not.toContain('待分配导师')
    expect(wrapper.text()).not.toContain('分配导师')
    expect(wrapper.text()).not.toContain('更换导师')
    expect(wrapper.text()).not.toContain('确认')

    await wrapper.get('.link-button').trigger('click')
    await flushUi()

    expect(wrapper.find('.detail-callout').exists()).toBe(true)
    expect(wrapper.text()).toContain('Goldman Sachs')
  })

  it('renders the mock practice page with lead-mentor card tabs shell while keeping assistant read-only detail flow', async () => {
    const wrapper = mount(MockPracticePage)
    await flushUi()

    expect(getAssistantMockPracticeList).toHaveBeenCalledTimes(1)
    expect(wrapper.find('#page-mock-practice').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Mock Practice')
    expect(wrapper.find('.stats-grid').exists()).toBe(true)
    expect(wrapper.findAll('.stats-card')).toHaveLength(4)
    expect(wrapper.find('.card-header').exists()).toBe(true)
    expect(wrapper.find('.tabs').exists()).toBe(true)
    expect(wrapper.find('#mock-tab-pending').exists()).toBe(true)
    expect(wrapper.find('#mock-tab-feedback').exists()).toBe(true)
    expect(wrapper.find('#mock-tab-all').exists()).toBe(true)
    expect(wrapper.find('#mock-content-all').exists()).toBe(true)
    expect(wrapper.find('.panel-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('表达节奏稳定')
    expect(wrapper.text()).toContain('Jerry')
    expect(wrapper.text()).not.toContain('敬请期待')
    expect(wrapper.text()).not.toContain('新建模拟应聘')
    expect(wrapper.text()).not.toContain('待分配导师')
    expect(wrapper.text()).not.toContain('分配导师')
    expect(wrapper.text()).not.toContain('确认执行')
    expect(wrapper.text()).not.toContain('保存修改')

    await wrapper.get('#mock-tab-feedback').trigger('click')
    await flushUi()
    expect(wrapper.text()).toContain('已完成反馈')
    expect(wrapper.text()).toContain('Ben Student')

    await wrapper.get('.detail-trigger').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('模拟应聘详情')
    expect(wrapper.text()).toContain('Goldman Sachs mock interview')
    expect(wrapper.text()).toContain('Goldman Sachs IBD')
  })
})

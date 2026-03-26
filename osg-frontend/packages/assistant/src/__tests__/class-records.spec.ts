import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantClassRecordList: vi.fn(),
  getAssistantClassRecordStats: vi.fn(),
  getAssistantStudentList: vi.fn(),
  createAssistantClassRecord: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

const { getAssistantClassRecordList, getAssistantClassRecordStats, getAssistantStudentList, createAssistantClassRecord } = apiMocks

import ClassRecordsPage from '@/views/class-records/index.vue'

const classRecordFixture = {
  total: 2,
  rows: [
    {
      recordId: 11,
      recordCode: 'CR-20260323-001',
      studentId: 2001,
      studentName: 'Amy Student',
      mentorId: 91,
      mentorName: 'Jess Mentor',
      coachingType: 'position_coaching',
      courseType: 'case_prep',
      courseContent: 'Case Interview Drill',
      reporterRole: 'assistant',
      classDate: '2026-03-23T10:00:00',
      durationHours: 2,
      courseFee: '300',
      studentRating: '5/5',
      status: 'pending',
      reviewRemark: '学员反馈良好，建议继续跟进下一轮课程。',
      submittedAt: '2026-03-23T12:00:00',
    },
    {
      recordId: 12,
      recordCode: 'CR-20260321-002',
      studentId: 2002,
      studentName: 'Ben Student',
      mentorId: 92,
      mentorName: 'Amy Mentor',
      coachingType: 'mock_application',
      courseType: 'mock_interview',
      courseContent: 'Mock Interview Review',
      reporterRole: 'mentor',
      classDate: '2026-03-21T15:00:00',
      durationHours: 1.5,
      courseFee: '180',
      studentRating: '',
      status: 'approved',
      reviewRemark: '',
      submittedAt: '2026-03-21T16:00:00',
    },
  ],
}

const classRecordStatsFixture = {
  totalCount: 2,
  pendingCount: 1,
  approvedCount: 1,
  rejectedCount: 0,
  pendingSettlementAmount: '480',
  flowSteps: ['课程执行', '记录提交', '审核处理', '反馈回看'],
}

async function flushUi() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('assistant class records page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssistantClassRecordList.mockResolvedValue(classRecordFixture)
    getAssistantClassRecordStats.mockResolvedValue(classRecordStatsFixture)
    getAssistantStudentList.mockResolvedValue({
      total: 2,
      rows: [
        { studentId: 2001, studentName: 'Amy Student', email: 'amy@example.com' },
        { studentId: 2002, studentName: 'Ben Student', email: 'ben@example.com' },
      ],
    })
    createAssistantClassRecord.mockResolvedValue({
      recordId: 91,
      studentId: 2001,
      studentName: 'Amy Student',
      mentorId: 920,
      mentorName: 'assistant.user',
      courseType: 'position_coaching',
      courseSource: 'assistant',
      classStatus: 'case_prep',
      classDate: '2026-03-27T10:00:00',
      durationHours: 1.5,
      status: 'pending',
      feedbackContent: '已完成案例拆解与复盘',
      submittedAt: '2026-03-27T10:30:00',
    })
  })

  it('renders the real class records page, summary cards, and detail panel', async () => {
    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    expect(wrapper.find('#page-myclass').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Class Records')
    expect(wrapper.find('.status-pill').text()).toContain('课程总览')
    expect(wrapper.findAll('.summary-card')).toHaveLength(4)
    expect(wrapper.findAll('[data-class-record-row]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Case Interview Drill')
    expect(wrapper.text()).toContain('课程详情')
    expect(wrapper.text()).toContain('学员反馈良好')
    expect(wrapper.text()).not.toContain('敬请期待')
    expect(wrapper.text()).not.toContain('记录骨架')
  })

  it('filters rows by client-side status and opens the selected record detail', async () => {
    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    await wrapper.get('select').setValue('approved')
    await flushUi()

    expect(wrapper.findAll('[data-class-record-row]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Ben Student')
    expect(wrapper.text()).not.toContain('Amy Student')

    await wrapper.get('.link-button').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Mock Interview Review')
    expect(wrapper.text()).toContain('暂无学员评价')
  })

  it('submits keyword search through the real request path and resets filters', async () => {
    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    await wrapper.get('#assistant-class-records-keyword').setValue('Amy Student')
    await wrapper.get('#assistant-class-records-search').trigger('click')
    await flushUi()

    expect(getAssistantClassRecordList).toHaveBeenLastCalledWith({ keyword: 'Amy Student' })
    expect(getAssistantClassRecordStats).toHaveBeenLastCalledWith({ keyword: 'Amy Student' })

    await wrapper.get('#assistant-class-records-reset').trigger('click')
    await flushUi()

    expect(getAssistantClassRecordList).toHaveBeenLastCalledWith({ keyword: undefined })
    expect(wrapper.text()).toContain('上报课程记录')
  })

  it('opens the report form and submits through the real assistant create API', async () => {
    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    await wrapper.get('#assistant-class-records-create').trigger('click')
    await flushUi()

    await wrapper.get('#assistant-class-record-student').setValue('2001')
    await wrapper.get('#assistant-class-record-course-type').setValue('position_coaching')
    await wrapper.get('#assistant-class-record-class-status').setValue('case_prep')
    await wrapper.get('#assistant-class-record-date').setValue('2026-03-27T10:00')
    await wrapper.get('#assistant-class-record-duration').setValue('1.5')
    await wrapper.get('#assistant-class-record-feedback').setValue('已完成案例拆解与复盘')
    await wrapper.get('#assistant-class-record-submit').trigger('click')
    await flushUi()

    expect(createAssistantClassRecord).toHaveBeenCalledWith({
      studentId: 2001,
      courseType: 'position_coaching',
      classStatus: 'case_prep',
      classDate: '2026-03-27T10:00',
      durationHours: 1.5,
      feedbackContent: '已完成案例拆解与复盘',
      topics: '',
      comments: '',
    })
    expect(getAssistantClassRecordList).toHaveBeenCalledTimes(2)
    expect(getAssistantClassRecordStats).toHaveBeenCalledTimes(2)
  })
  it('treats completed records as approved in filters and labels', async () => {
    getAssistantClassRecordList.mockResolvedValue({
      total: 1,
      rows: [
        {
          ...classRecordFixture.rows[0],
          recordId: 99,
          recordCode: 'CR-20260324-099',
          studentName: 'Completed Student',
          status: 'completed',
        },
      ],
    })
    getAssistantClassRecordStats.mockResolvedValue({
      totalCount: 1,
      pendingCount: 0,
      approvedCount: 1,
      rejectedCount: 0,
      pendingSettlementAmount: '0',
      flowSteps: classRecordStatsFixture.flowSteps,
    })

    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    await wrapper.findAll('select')[0].setValue('approved')
    await flushUi()

    expect(wrapper.findAll('[data-class-record-row]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Completed Student')
    expect(wrapper.text()).toContain('已通过')
  })

  it('keeps the list visible when stats loading fails', async () => {
    getAssistantClassRecordList.mockResolvedValue(classRecordFixture)
    getAssistantClassRecordStats.mockRejectedValue(new Error('stats timeout'))

    const wrapper = mount(ClassRecordsPage)
    await flushUi()

    expect(wrapper.find('.state-card--error').exists()).toBe(false)
    expect(wrapper.findAll('[data-class-record-row]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('Ben Student')
  })
})

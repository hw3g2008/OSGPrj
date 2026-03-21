import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CoursesPage from '@/views/courses/index.vue'
import JobOverviewPage from '@/views/job-overview/index.vue'
import ReportModal from '@/views/courses/components/ReportModal.vue'
import MockPracticePage from '@/views/mock-practice/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}))

import { http } from '@osg/shared/utils/request'

function createCourseRow(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 11,
    classId: 'CR-0011',
    studentId: 843,
    studentName: 'Curl Student',
    courseType: 'job_coaching',
    courseSource: 'resume_update',
    classDate: '2026-03-21T10:00:00.000Z',
    durationHours: 2,
    status: 'pending',
    rate: '600',
    feedbackContent: '课堂反馈内容',
    reviewRemark: '驳回原因说明',
    ...overrides
  }
}

function createMockPracticeRow(overrides: Record<string, unknown> = {}) {
  return {
    practiceId: 42,
    studentId: 843,
    studentName: 'Curl Student',
    practiceType: 'mock_interview',
    requestContent: '请帮我做一次模拟面试',
    mentorNames: 'Jerry Li',
    status: 'new',
    submittedAt: '2026-03-21T09:00:00.000Z',
    scheduledAt: '2026-03-22T08:30:00.000Z',
    completedHours: 1,
    feedbackRating: 4,
    feedbackSummary: '整体表现稳定',
    ...overrides
  }
}

function createJobOverviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    studentId: 843,
    studentName: null,
    company: 'Browser Smoke Capital 3',
    position: 'Consultant',
    location: 'Shanghai',
    interviewStage: 'Round 1',
    interviewTime: '2026-03-22T09:00:00.000Z',
    coachingStatus: 'new',
    result: null,
    ...overrides
  }
}

describe('mentor page interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads mentor students from the list endpoint in the report modal', async () => {
    vi.mocked(http.get).mockResolvedValue({ rows: [] })

    mount(ReportModal)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/api/mentor/students/list')
  })

  it('submits backend-compatible course payload from the report modal', async () => {
    vi.mocked(http.get).mockResolvedValue({
      rows: [{ userId: 843, nickName: 'CurlStu124918' }]
    })
    vi.mocked(http.post).mockResolvedValue({})

    const wrapper = mount(ReportModal)
    await flushPromises()

    await wrapper.get('select').setValue('843')
    await wrapper.get('input[type="date"]').setValue('2026-03-21')
    await wrapper.get('input[type="number"]').setValue('1')
    await wrapper.get('input[type="radio"][value="job_coaching"]').setValue()
    await flushPromises()
    await wrapper.get('textarea').setValue('browser ui smoke feedback')
    await wrapper.get('.btn-primary').trigger('click')

    expect(http.post).toHaveBeenCalledWith('/api/mentor/class-records', {
      studentId: 843,
      studentName: 'CurlStu124918',
      classDate: '2026-03-21',
      durationHours: 1,
      weeklyHours: 1,
      studentStatus: 'normal',
      noShowNote: '',
      coachingType: 'job_coaching',
      contentType: 'job_coaching',
      courseType: 'job_coaching',
      courseSource: 'mentor',
      classStatus: 'normal',
      feedback: 'browser ui smoke feedback',
      feedbackContent: 'browser ui smoke feedback',
      hourlyRate: 600,
      rate: '600',
      totalFee: 600
    })
  })

  it('renders backend-shaped course rows and opens the detail modal', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/class-records/list') {
        return { rows: [createCourseRow()] }
      }
      if (url === '/api/mentor/class-records/11') {
        return createCourseRow()
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).toContain('¥1200')

    const detailButton = wrapper.findAll('button').find((button) => button.text() === '查看详情')
    expect(detailButton).toBeTruthy()

    await detailButton!.trigger('click')
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/api/mentor/class-records/11')
    expect(wrapper.text()).toContain('课程记录详情')
    expect(wrapper.text()).toContain('课堂反馈内容')
  })

  it('shows the reject reason modal for rejected course rows', async () => {
    vi.mocked(http.get).mockResolvedValue({
      rows: [
        createCourseRow({
          status: 'rejected',
          reviewRemark: '需要补充课堂总结'
        })
      ]
    })

    const wrapper = mount(CoursesPage)
    await flushPromises()

    const rejectButton = wrapper.findAll('button').find((button) => button.text() === '查看原因')
    expect(rejectButton).toBeTruthy()

    await rejectButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('驳回原因')
    expect(wrapper.text()).toContain('需要补充课堂总结')
  })

  it('renders a fallback student label and confirms new job overview rows', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/job-overview/list') {
        return { rows: [createJobOverviewRow()] }
      }
      if (url === '/api/mentor/job-overview/calendar') {
        return []
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockResolvedValue({})

    const wrapper = mount(JobOverviewPage)
    await flushPromises()

    expect(wrapper.text()).toContain('学员843')

    const confirmButton = wrapper.findAll('button').find((button) => button.text().includes('确认'))
    expect(confirmButton).toBeTruthy()

    await confirmButton!.trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith('/api/mentor/job-overview/7/confirm')
    expect(wrapper.text()).toContain('辅导中')
  })

  it('confirms mock practice with practiceId and opens the detail modal', async () => {
    vi.mocked(http.get).mockResolvedValue({
      rows: [createMockPracticeRow()]
    })
    vi.mocked(http.put).mockResolvedValue({})

    const wrapper = mount(MockPracticePage)
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text().includes('确认'))
    expect(confirmButton).toBeTruthy()
    await confirmButton!.trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith('/api/mentor/mock-practice/42/confirm')
    expect(wrapper.text()).toContain('待进行')

    const detailButton = wrapper.findAll('button').find((button) => button.text() === '查看详情')
    expect(detailButton).toBeTruthy()
    await detailButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('模拟应聘详情')
    expect(wrapper.text()).toContain('请帮我做一次模拟面试')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import JobOverviewPage from '@/views/job-overview/index.vue'

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: mockGet,
    post: vi.fn(),
    put: mockPut,
    delete: vi.fn(),
  },
}))

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    studentId: 843,
    studentName: '张三',
    company: 'Goldman Sachs',
    position: 'IB Analyst',
    location: 'Hong Kong',
    interviewStage: 'First Round',
    interviewTime: '2026-01-27T10:00:00.000Z',
    coachingStatus: 'coaching',
    result: null,
    mentorName: 'Jess',
    lessonHours: '8h',
    applyTime: '01/08',
    notes: 'HireVue已通过，准备First Round。',
    ...overrides,
  }
}

function createCalendarEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    studentName: '张三',
    company: 'Goldman Sachs',
    stage: 'First Round',
    time: '2026-01-27T10:00:00.000Z',
    position: 'IB Analyst',
    location: 'Hong Kong',
    color: '#F59E0B',
    day: 27,
    weekday: '周二',
    ...overrides,
  }
}

function createClassRecord(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 101,
    classId: 'CR-0101',
    studentId: 843,
    studentName: '张三',
    courseType: 'mock_interview',
    contentType: 'mock_interview',
    courseSource: 'mentor',
    classDate: '2026-01-15T09:00:00.000Z',
    durationHours: 2,
    rate: '600',
    status: 'approved',
    feedbackContent: '表现优秀，建议加强 Valuation 部分',
    feedbackRating: 5,
    ...overrides,
  }
}

function mountJobOverview() {
  return mount(JobOverviewPage)
}

describe('mentor job overview behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/api/mentor/job-overview/list') {
        return { rows: [createRow(), createRow({ id: 8, studentName: '李四', company: 'JP Morgan', coachingStatus: 'new', result: null })] }
      }
      if (url === '/api/mentor/job-overview/calendar') {
        return [createCalendarEvent(), createCalendarEvent({ id: 8, day: 28, weekday: '周三', company: 'JP Morgan', studentName: '李四' })]
      }
      if (url === '/api/mentor/job-overview/export') {
        return new Blob(['job overview export'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      }
      if (url === '/api/mentor/class-records/list') {
        return {
          rows: [
            createClassRecord(),
            createClassRecord({
              recordId: 102,
              classId: 'CR-0102',
              courseType: 'resume_update',
              contentType: 'resume_update',
              classDate: '2026-01-12T09:00:00.000Z',
              durationHours: 1,
              feedbackContent: '完成简历优化，突出实习经历',
              feedbackRating: 4,
            }),
          ],
        }
      }
      return { rows: [] }
    })
  })

  it('exports the current job overview list through the backend export endpoint', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:download'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const exportButton = wrapper.findAll('button').find((button) => button.text().includes('导出'))
    expect(exportButton).toBeTruthy()
    await exportButton!.trigger('click')

    expect(mockGet).toHaveBeenCalledWith('/api/mentor/job-overview/export', expect.objectContaining({
      params: expect.objectContaining({
        keyword: '',
        company: '',
        status: '',
      }),
      responseType: 'blob',
    }))
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(wrapper.text()).toContain('导出')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    click.mockRestore()
  })

  it('switches month label when the calendar arrows are used', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    const monthLabel = wrapper.find('.calendar-month')
    expect(monthLabel.exists()).toBe(true)
    expect(monthLabel.text()).toBe('1月')

    const arrowButtons = wrapper.findAll('button').filter((button) =>
      button.find('i.mdi-chevron-left').exists() || button.find('i.mdi-chevron-right').exists(),
    )
    expect(arrowButtons).toHaveLength(2)

    await arrowButtons[1].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('2月')

    await arrowButtons[0].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1月')
  })

  it('renders a stable anchor for the first new job row', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    expect(wrapper.find('#job-new-1').exists()).toBe(true)
    expect(wrapper.find('#job-new-1').text()).toContain('新申请')
  })

  it('reloads the job overview list after confirming a new row', async () => {
    let listCalls = 0
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/api/mentor/job-overview/list') {
        listCalls += 1
        return {
          rows: [
            createRow({
              id: 11,
              studentName: '确认前学员',
              company: 'Goldman Sachs',
              coachingStatus: listCalls === 1 ? 'new' : 'coaching',
            }),
          ],
        }
      }
      if (url === '/api/mentor/job-overview/calendar') {
        return [createCalendarEvent({ id: 11, studentName: '确认前学员' })]
      }
      if (url === '/api/mentor/class-records/list') {
        return { rows: [createClassRecord()] }
      }
      return { rows: [] }
    })

    const wrapper = mountJobOverview()
    await flushPromises()

    await wrapper.get('#job-new-1 button').trigger('click')
    await flushPromises()

    expect(listCalls).toBe(2)
    expect(wrapper.find('#job-new-1').exists()).toBe(true)
    expect(wrapper.get('#job-new-1').text()).toContain('辅导中')
    expect(wrapper.get('#job-new-1').text()).toContain('查看详情')
  })

  it('anchors the calendar to the earliest interview month when mixed-month events are returned', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === '/api/mentor/job-overview/list') {
        return {
          rows: [
            createRow({
              id: 70,
              studentName: 'Overview Interview 87837-1',
              company: 'Career Overview Co 87837-1',
              position: 'Strategy Analyst 87837-1 Interview',
              interviewStage: 'first_round',
              interviewTime: '2026-04-01T16:50:37.000Z',
              coachingStatus: 'coaching',
            }),
            createRow({
              id: 71,
              studentName: '张三',
              company: 'Goldman Sachs',
              position: 'IB Analyst',
              interviewStage: 'First Round',
              interviewTime: '2026-01-27T10:00:00.000Z',
              coachingStatus: 'coaching',
            }),
            createRow({
              id: 72,
              studentName: '李四',
              company: 'McKinsey',
              position: 'Consultant',
              interviewStage: 'Case Study',
              interviewTime: '2026-01-28T14:00:00.000Z',
              coachingStatus: 'coaching',
            }),
            createRow({
              id: 73,
              studentName: '赵六',
              company: 'Morgan Stanley',
              position: 'IBD Analyst',
              interviewStage: 'R2',
              interviewTime: '2026-01-30T15:00:00.000Z',
              coachingStatus: 'coaching',
            }),
          ],
        }
      }
      if (url === '/api/mentor/job-overview/calendar') {
        return [
          createCalendarEvent({
            id: 70,
            studentName: 'Overview Interview 87837-1',
            company: 'Career Overview Co 87837-1',
            stage: 'first_round',
            time: '2026-04-01T16:50:37.000Z',
            position: 'Strategy Analyst 87837-1 Interview',
            location: 'Boston',
            day: 1,
            weekday: '周三',
          }),
          createCalendarEvent({
            id: 71,
            studentName: '张三',
            company: 'Goldman Sachs',
            stage: 'First Round',
            time: '2026-01-27T10:00:00.000Z',
            position: 'IB Analyst',
            location: 'Hong Kong',
            day: 27,
            weekday: '周二',
          }),
          createCalendarEvent({
            id: 72,
            studentName: '李四',
            company: 'McKinsey',
            stage: 'Case Study',
            time: '2026-01-28T14:00:00.000Z',
            position: 'Consultant',
            location: 'Shanghai',
            day: 28,
            weekday: '周三',
          }),
          createCalendarEvent({
            id: 73,
            studentName: '赵六',
            company: 'Morgan Stanley',
            stage: 'R2',
            time: '2026-01-30T15:00:00.000Z',
            position: 'IBD Analyst',
            location: 'New York',
            day: 30,
            weekday: '周五',
          }),
        ]
      }
      if (url === '/api/mentor/class-records/list') {
        return { rows: [createClassRecord()] }
      }
      return { rows: [] }
    })

    const wrapper = mountJobOverview()
    await flushPromises()

    expect(wrapper.find('.calendar-month').text()).toBe('1月')
    const dayNumbers = wrapper.findAll('.calendar-day-num').map((node) => node.text())
    expect(dayNumbers).toContain('27')
    expect(dayNumbers).toContain('28')
    expect(dayNumbers).toContain('30')
  })

  it('opens the matching job detail when a highlighted calendar day is clicked', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    const highlightedDay = wrapper.findAll('.calendar-day').find((day) => day.classes().includes('warning-bg'))
    expect(highlightedDay).toBeTruthy()

    await highlightedDay!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-surface-id="modal-job-detail"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('学员求职详情')
    expect(wrapper.text()).toContain('张三')
  })

  it('applies the keyword only after clicking search and updates the visible stats', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('1')

    const keyword = wrapper.get('input[placeholder="搜索学员姓名..."]')
    await keyword.setValue('李四')
    const searchButton = wrapper.findAll('button').find((button) => button.text().includes('搜索'))
    expect(searchButton).toBeTruthy()
    await searchButton!.trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('李四')
    expect(rows[0].text()).not.toContain('张三')
    expect(wrapper.find('.stat-value').text()).toBe('1')
  })

  it('filters coaching rows by the visible status option labeled 面试中', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    const selects = wrapper.findAll('select')
    expect(selects).toHaveLength(2)

    await selects[1].setValue('coaching')
    await flushPromises()

    expect((selects[1].element as HTMLSelectElement).value).toBe('coaching')
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('张三')
    expect(rows[0].text()).not.toContain('李四')
  })

  it('opens the job detail modal and loads the current student class records when 查看全部 is clicked', async () => {
    const wrapper = mountJobOverview()
    await flushPromises()

    const detailButton = wrapper.findAll('button').find((button) => button.text().includes('查看详情'))
    expect(detailButton).toBeTruthy()

    await detailButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-surface-id="modal-job-detail"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('学员求职详情')
    expect(wrapper.text()).toContain('学员信息')
    expect(wrapper.text()).toContain('课程记录 (最近3条)')

    const viewAllButton = wrapper.findAll('button').find((button) => button.text().includes('查看全部'))
    expect(viewAllButton).toBeTruthy()

    await viewAllButton!.trigger('click')
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith('/api/mentor/class-records/list', expect.objectContaining({
      params: { studentId: 843 },
    }))
    expect(wrapper.text()).toContain('完整课程记录')
    expect(wrapper.text()).toContain('表现优秀，建议加强 Valuation 部分')
    expect(wrapper.text()).toContain('完成简历优化，突出实习经历')
  })
})

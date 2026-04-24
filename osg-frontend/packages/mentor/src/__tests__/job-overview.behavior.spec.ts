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

  // 旧硬编码日历 DOM 测试（月份切换 / 月份锚点 / 高亮日点击）已随 mentor 接入
  // @osg/shared InterviewCalendar 共享组件而移除；这些行为由 shared 包的
  // useInterviewCalendar.spec.ts + InterviewCalendar.spec.ts 覆盖。

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

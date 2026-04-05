import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MockPracticePage from '@/views/mock-practice/index.vue'

type MockPracticeRow = {
  practiceId: number
  studentId: number
  studentName: string
  practiceType: string
  requestContent?: string
  requestedMentorCount?: number
  preferredMentorNames?: string
  status: string
  mentorIds?: number[]
  mentorNames?: string
  mentorBackgrounds?: string
  scheduledAt?: string
  completedHours?: number
  feedbackRating?: number | null
  feedbackSummary?: string | null
  submittedAt?: string
  note?: string
}

const rows: MockPracticeRow[] = [
  {
    practiceId: 5105,
    studentId: 1012746878370,
    studentName: 'Mock Ack Ready 87837-1',
    practiceType: 'mock_interview',
    requestContent: 'Runtime Mock Ack 87837-1',
    requestedMentorCount: 1,
    preferredMentorNames: 'mentor',
    status: 'scheduled',
    mentorIds: [837],
    mentorNames: 'mentor',
    mentorBackgrounds: 'Lead Mentor Runtime Coach',
    scheduledAt: '2026-03-28T18:50:37.000+08:00',
    completedHours: 0,
    feedbackRating: null,
    feedbackSummary: null,
    submittedAt: '2026-03-28T16:20:37.000+08:00',
    note: 'mock practice ack-ready runtime seed',
  },
  {
    practiceId: 5106,
    studentId: 1010746878372,
    studentName: 'Mock Scheduled 87837-1',
    practiceType: 'relation_test',
    requestContent: 'communication_test',
    requestedMentorCount: 1,
    preferredMentorNames: 'mentor',
    status: 'completed',
    mentorIds: [837],
    mentorNames: 'mentor',
    mentorBackgrounds: 'Lead Mentor Runtime Coach',
    scheduledAt: '2026-03-28T17:50:37.000+08:00',
    completedHours: 2,
    feedbackRating: 5,
    feedbackSummary: 'Runtime feedback summary 87837-1',
    submittedAt: '2026-03-28T11:50:37.000+08:00',
    note: 'completed runtime seed',
  },
]

function cloneRows() {
  return rows.map((row) => ({ ...row }))
}

function normalizeStatus(status: string | undefined) {
  if (status === 'scheduled') {
    return 'pending'
  }
  if (status === 'confirmed') {
    return 'pending'
  }
  return status || ''
}

function matchesKeyword(row: MockPracticeRow, keyword?: string) {
  const normalized = (keyword || '').trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return [
    row.studentName,
    String(row.studentId),
    row.requestContent,
    row.mentorNames,
    row.note,
    row.feedbackSummary,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized))
}

function buildMockList(params: Record<string, string> | undefined) {
  const keyword = params?.keyword
  const practiceType = params?.practiceType
  const status = params?.status

  return cloneRows().filter((row) => {
    if (practiceType && row.practiceType !== practiceType) {
      return false
    }
    if (status && normalizeStatus(row.status) !== normalizeStatus(status)) {
      return false
    }
    return matchesKeyword(row, keyword)
  })
}

function getButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(label))
  expect(button, `expected to find button with label containing ${label}`).toBeTruthy()
  return button!
}

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(async (url: string, config?: { params?: Record<string, string> }) => {
      if (url.includes('/api/mentor/mock-practice/list')) {
        return { rows: buildMockList(config?.params), total: buildMockList(config?.params).length }
      }
      return { rows: [] }
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { http } from '@osg/shared/utils/request'

describe('mentor mock-practice behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes the list when type, status, and keyword change', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string, config?: { params?: Record<string, string> }) => {
      if (url.includes('/api/mentor/mock-practice/list')) {
        return { rows: buildMockList(config?.params), total: buildMockList(config?.params).length }
      }
      return { rows: [] }
    })

    const wrapper = mount(MockPracticePage)
    await flushPromises()

    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')

    const selects = wrapper.findAll('select')
    await selects[0].setValue('relation_test')
    await flushPromises()
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')
    expect(wrapper.text()).not.toContain('Mock Ack Ready 87837-1')

    await selects[1].setValue('completed')
    await flushPromises()
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')

    const keywordInput = wrapper.get('input[placeholder="搜索学员姓名/ID"]')
    await keywordInput.setValue('Mock Scheduled')
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith(
      '/api/mentor/mock-practice/list',
      expect.objectContaining({
        params: expect.objectContaining({
          practiceType: 'relation_test',
          status: 'completed',
          keyword: 'Mock Scheduled',
        }),
      }),
    )
  })

  it('submits keyword filters and shows an empty state when there is no match', async () => {
    const wrapper = mount(MockPracticePage)
    await flushPromises()

    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')

    const keywordInput = wrapper.get('input[placeholder="搜索学员姓名/ID"]')
    await keywordInput.setValue('Mock Ack')
    await getButton(wrapper, '筛选').trigger('click')
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith(
      '/api/mentor/mock-practice/list',
      expect.objectContaining({
        params: expect.objectContaining({
          keyword: 'Mock Ack',
        }),
      }),
    )
    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).not.toContain('Mock Scheduled 87837-1')

    await keywordInput.setValue('No Match')
    await getButton(wrapper, '筛选').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('暂无匹配的模拟应聘记录')
  })

  it('refreshes the task list immediately when the visible filters change', async () => {
    const wrapper = mount(MockPracticePage)
    await flushPromises()

    const [typeSelect, statusSelect] = wrapper.findAll('select')
    const keywordInput = wrapper.get('input[placeholder="搜索学员姓名/ID"]')

    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')

    await typeSelect.setValue('mock_interview')
    await flushPromises()
    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).not.toContain('Mock Scheduled 87837-1')

    await typeSelect.setValue('')
    await statusSelect.setValue('completed')
    await flushPromises()
    expect(wrapper.text()).toContain('Mock Scheduled 87837-1')
    expect(wrapper.text()).not.toContain('Mock Ack Ready 87837-1')

    await statusSelect.setValue('')
    await keywordInput.setValue('Mock Ack')
    await flushPromises()
    expect(wrapper.text()).toContain('Mock Ack Ready 87837-1')
    expect(wrapper.text()).not.toContain('Mock Scheduled 87837-1')
  })

  it('renders a stable anchor for the first new row and keeps it after confirm', async () => {
    vi.mocked(http.get).mockImplementationOnce(async (url: string, config?: { params?: Record<string, string> }) => {
      if (url.includes('/api/mentor/mock-practice/list')) {
        return {
          rows: buildMockList(config?.params).map((row, index) =>
            index === 0 ? { ...row, status: 'new' } : row,
          ),
          total: buildMockList(config?.params).length,
        }
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockResolvedValueOnce({ code: 200 })

    const wrapper = mount(MockPracticePage)
    await flushPromises()

    expect(wrapper.find('#mock-new-1').exists()).toBe(true)
    expect(wrapper.get('#mock-new-1').text()).toContain('新分配')

    await wrapper.get('#mock-new-1 button').trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith('/api/mentor/mock-practice/5105/confirm')
    expect(wrapper.find('#mock-new-1').exists()).toBe(true)
    expect(wrapper.get('#mock-new-1').text()).toContain('待进行')
    expect(wrapper.get('#mock-new-1').text()).toContain('查看详情')
  })

  it('normalizes scheduled rows, opens the full detail modal, and closes via the visible control', async () => {
    const wrapper = mount(MockPracticePage)
    await flushPromises()

    const firstRow = wrapper.find('tbody tr')
    expect(firstRow.text()).toContain('待进行')
    expect(firstRow.text()).not.toContain('scheduled')

    const detailButton = wrapper.findAll('button').find((button) => button.text().includes('查看详情'))
    expect(detailButton).toBeTruthy()
    await detailButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('学员求职详情')
    expect(wrapper.text()).toContain('学员信息')
    expect(wrapper.text()).toContain('申请岗位')
    expect(wrapper.text()).toContain('求职进度')
    expect(wrapper.text()).toContain('辅导信息')
    expect(wrapper.text()).toContain('课程记录 (最近3条)')
    expect(wrapper.text()).toContain('学员备注')
    expect(getButton(wrapper, '关闭').exists()).toBe(true)

    await getButton(wrapper, '关闭').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('学员求职详情')
  })

  it('renders stable anchors for unread rows and preserves the first anchor after confirm', async () => {
    const mockRows = [
      {
        practiceId: 42,
        studentId: 843,
        studentName: 'Mock Student A',
        practiceType: 'mock_interview',
        requestContent: 'Mock interview A',
        status: 'new',
      },
      {
        practiceId: 43,
        studentId: 844,
        studentName: 'Mock Student B',
        practiceType: 'relation_test',
        requestContent: 'Mock interview B',
        status: 'new',
      },
    ]

    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url.includes('/api/mentor/mock-practice/list')) {
        return { rows: mockRows.map((row) => ({ ...row })) }
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/mock-practice/42/confirm') {
        mockRows[0].status = 'confirmed'
      }
      return {}
    })

    const wrapper = mount(MockPracticePage)
    await flushPromises()

    expect(wrapper.find('#mock-new-1').exists()).toBe(true)
    expect(wrapper.find('#mock-new-2').exists()).toBe(true)

    await wrapper.get('#mock-new-1 button').trigger('click')
    await flushPromises()

    expect(wrapper.find('#mock-new-1').exists()).toBe(true)
    expect(wrapper.get('#mock-new-1').text()).toContain('待进行')
    expect(wrapper.get('#mock-new-1').text()).toContain('查看详情')
    expect(wrapper.find('#mock-new-2').exists()).toBe(true)
  })
})

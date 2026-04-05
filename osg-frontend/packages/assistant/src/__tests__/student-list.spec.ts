import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantStudentList: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

const { getAssistantStudentList } = apiMocks

import StudentListPage from '@/views/students/index.vue'

const studentListFixture = {
  total: 2,
  rows: [
    {
      studentId: 101,
      studentName: 'Amy Student',
      email: 'amy@example.com',
      leadMentorName: 'Jess',
      school: 'Runtime Backfill University',
      majorDirection: 'Consulting',
      targetPosition: 'Strategy',
      jobCoachingCount: 2,
      basicCourseCount: 1,
      mockInterviewCount: 1,
      remainingHours: 4,
      reminder: '合同即将到期',
      pendingReview: true,
      contractStatus: 'expiring',
      accountStatus: '0',
      isBlacklisted: false,
    },
    {
      studentId: 102,
      studentName: 'Ben Student',
      email: 'ben@example.com',
      leadMentorName: 'Amy',
      school: 'State College',
      majorDirection: 'Tech',
      targetPosition: 'Data Analyst',
      jobCoachingCount: 1,
      basicCourseCount: 2,
      mockInterviewCount: 0,
      remainingHours: 12,
      reminder: '-',
      pendingReview: false,
      contractStatus: 'normal',
      accountStatus: '1',
      isBlacklisted: false,
    },
  ],
}

async function flushUi() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function createStorageMock() {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('assistant student list page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    })
    window.localStorage.clear()
    getAssistantStudentList.mockResolvedValue(studentListFixture)
  })

  it('renders the lead-mentor-like shell, filters, rows, and footer using assistant data', async () => {
    const wrapper = mount(StudentListPage)
    await flushUi()

    expect(wrapper.find('#page-student-list').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Student List')
    expect(wrapper.find('.filters').exists()).toBe(true)
    expect(wrapper.find('.card').exists()).toBe(true)
    expect(wrapper.find('.page-footer').exists()).toBe(true)
    expect(wrapper.findAll('[data-student-row]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('amy@example.com')
    expect(wrapper.text()).toContain('Jess')
    expect(wrapper.text()).toContain('Runtime Backfill University')
    expect(wrapper.text()).toContain('Consulting')
    expect(wrapper.text()).toContain('Strategy')
    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).toContain('即将到期')
    expect(wrapper.text()).toContain('冻结')
    expect(wrapper.text()).toContain('共 2 条记录')
    expect(wrapper.text()).toContain('查看求职')
    expect(wrapper.text()).not.toContain('敬请期待')
    expect(wrapper.text()).not.toContain('真实接口数据')
    expect(wrapper.text()).not.toContain('不提供独立详情页')
  })

  it('hydrates persisted filters and uses them on the first real request', async () => {
    window.localStorage.setItem(
      'assistant-student-list-state',
      JSON.stringify({
        keyword: 'Amy Student',
        school: 'Runtime Backfill University',
        majorDirection: 'Consulting',
        accountStatus: '0',
        page: 2,
      }),
    )

    const wrapper = mount(StudentListPage)
    await flushUi()

    expect(getAssistantStudentList).toHaveBeenCalledWith({
      pageNum: 2,
      pageSize: 8,
      studentName: 'Amy Student',
      school: 'Runtime Backfill University',
      majorDirection: 'Consulting',
      accountStatus: '0',
    })
    expect((wrapper.get('#assistant-students-keyword').element as HTMLInputElement).value).toBe('Amy Student')
  })

  it('applies filters through the real request path and persists the latest search state', async () => {
    const wrapper = mount(StudentListPage)
    await flushUi()

    await wrapper.get('#assistant-students-keyword').setValue('Ben Student')
    await wrapper.get('#assistant-students-search').trigger('click')
    await flushUi()

    expect(getAssistantStudentList).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 8,
      studentName: 'Ben Student',
      school: undefined,
      majorDirection: undefined,
      accountStatus: undefined,
    })

    expect(JSON.parse(window.localStorage.getItem('assistant-student-list-state') || '{}')).toMatchObject({
      keyword: 'Ben Student',
      page: 1,
    })

    await wrapper.get('#assistant-students-reset').trigger('click')
    await flushUi()

    expect(getAssistantStudentList).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 8,
      studentName: undefined,
      school: undefined,
      majorDirection: undefined,
      accountStatus: undefined,
    })
  })
})

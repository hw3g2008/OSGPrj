import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantStudentList: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

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

function createLocalStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) || null : null
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
      value: createLocalStorageMock(),
      configurable: true,
      writable: true,
    })
    window.localStorage.removeItem('assistant-student-list-state')
    getAssistantStudentList.mockResolvedValue(studentListFixture)
  })

  it('renders lead-mentor style summary, toolbar and table while keeping assistant data', async () => {
    const wrapper = mount(StudentListPage)
    await flushUi()

    expect(wrapper.find('#page-student-list').exists()).toBe(true)
    expect(wrapper.find('.page-header').exists()).toBe(true)
    expect(wrapper.find('.summary-grid').exists()).toBe(true)
    expect(wrapper.find('.toolbar-card').exists()).toBe(true)
    expect(wrapper.find('.toolbar-card__row').exists()).toBe(true)
    expect(wrapper.find('.toolbar-card__meta').exists()).toBe(true)
    expect(wrapper.find('.table-card').exists()).toBe(true)
    expect(wrapper.find('.data-table').exists()).toBe(true)
    expect(wrapper.findAll('.summary-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('学员总览')
    expect(wrapper.text()).toContain('筛选已保存')
    expect(wrapper.text()).toContain('当前页学员')
    expect(wrapper.text()).toContain('待跟进提醒')
    expect(wrapper.text()).toContain('账号正常')
    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).toContain('状态提醒')
    expect(wrapper.text()).toContain('账号状态')
    expect(wrapper.text()).toContain('学习进度')
    expect(wrapper.text()).toContain('班主任 / 学校')
    expect(wrapper.text()).toContain('跟进说明')
    expect(wrapper.text()).toContain('Amy Student')
    expect(wrapper.text()).toContain('Runtime Backfill University')
    expect(wrapper.text()).toContain('Consulting')
    expect(wrapper.text()).toContain('4h')
    expect(wrapper.text()).toContain('助教跟进')
    expect(wrapper.text()).toContain('待审核')
    expect(wrapper.text()).not.toContain('敬请期待')
    expect(wrapper.text()).not.toContain('真实接口数据')
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

import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import MockPracticePage from '../views/career/mock-practice/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorMockPracticeStats: vi.fn(),
  getLeadMentorMockPracticeList: vi.fn(),
  getLeadMentorMockPracticeDetail: vi.fn(),
  assignLeadMentorMockPractice: vi.fn(),
  acknowledgeLeadMentorMockPractice: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

interface ScopeState {
  pending: Array<Record<string, unknown>>
  coaching: Array<Record<string, unknown>>
  managed: Array<Record<string, unknown>>
}

function createScopeState(): ScopeState {
  return {
    pending: [
      {
        practiceId: 9001,
        studentId: 3001,
        studentName: 'Alice',
        practiceType: '模拟面试',
        requestContent: 'Goldman Sachs IB 二面',
        requestedMentorCount: 2,
        preferredMentorNames: 'Jerry Li, Mike Chen',
        status: 'pending',
        statusLabel: '待分配',
        submittedAt: '2026-03-21T10:00:00Z',
      },
    ],
    coaching: [
      {
        practiceId: 9002,
        studentId: 3002,
        studentName: 'Bob',
        practiceType: '人际关系测试',
        requestContent: 'Leadership Test',
        status: 'scheduled',
        statusLabel: '新分配',
        mentorIds: [810, 9201],
        mentorNames: 'Jess, Amy',
        mentorBackgrounds: 'Lead Mentor / Morgan Stanley',
        submittedAt: '2026-03-22T11:00:00Z',
        isNewAssignment: true,
      },
      {
        practiceId: 9003,
        studentId: 3003,
        studentName: 'Cindy',
        practiceType: '期中考试',
        requestContent: 'Midterm Review',
        status: 'completed',
        statusLabel: '已完成',
        mentorNames: 'Jerry Li',
        mentorBackgrounds: 'Goldman Sachs IBD · 5年',
        completedHours: 2,
        completedHoursLabel: '2h',
        feedbackRating: 4,
        feedbackSummary: '表现稳定，框架清晰',
        submittedAt: '2026-03-20T09:00:00Z',
      },
    ],
    managed: [
      {
        practiceId: 9001,
        studentId: 3001,
        studentName: 'Alice',
        practiceType: '模拟面试',
        requestContent: 'Goldman Sachs IB 二面',
        requestedMentorCount: 2,
        preferredMentorNames: 'Jerry Li, Mike Chen',
        status: 'pending',
        statusLabel: '待分配',
        submittedAt: '2026-03-21T10:00:00Z',
      },
      {
        practiceId: 9002,
        studentId: 3002,
        studentName: 'Bob',
        practiceType: '人际关系测试',
        requestContent: 'Leadership Test',
        status: 'scheduled',
        statusLabel: '新分配',
        mentorNames: 'Jess, Amy',
        mentorBackgrounds: 'Lead Mentor / Morgan Stanley',
        submittedAt: '2026-03-22T11:00:00Z',
      },
    ],
  }
}

function computeStats(state: ScopeState) {
  const rows = [...state.pending, ...state.coaching, ...state.managed]
  const countByStatus = (status: string) =>
    rows.filter((row) => String(row.status || '').toLowerCase() === status).length

  return {
    pendingCount: countByStatus('pending'),
    scheduledCount: countByStatus('scheduled'),
    completedCount: countByStatus('completed'),
    cancelledCount: countByStatus('cancelled'),
    totalCount: rows.length,
  }
}

function installStatefulMocks(state: ScopeState) {
  apiMocks.getLeadMentorMockPracticeStats.mockImplementation(async () => computeStats(state))
  apiMocks.getLeadMentorMockPracticeList.mockImplementation(async ({ scope }: { scope: 'pending' | 'coaching' | 'managed' }) => {
    return { rows: state[scope] }
  })
  apiMocks.getLeadMentorMockPracticeDetail.mockImplementation(async (practiceId: number) => {
    if (practiceId === 9001) {
      return {
        ...state.managed.find((row) => row.practiceId === practiceId),
        mentorOptions: [
          {
            mentorId: 9201,
            mentorName: 'Jerry Li',
            mentorBackground: 'Goldman Sachs IBD · 5年',
            availabilityLabel: '周二 AM, 周四 PM',
            selected: true,
          },
          {
            mentorId: 9202,
            mentorName: 'Mike Chen',
            mentorBackground: 'McKinsey · 4年',
            availabilityLabel: '周三 PM',
            selected: false,
          },
        ],
      }
    }

    return {
      ...state.coaching.find((row) => row.practiceId === practiceId),
      note: '结合导师反馈继续补充高频题训练',
    }
  })
  apiMocks.assignLeadMentorMockPractice.mockImplementation(async (practiceId: number) => {
    state.pending = state.pending.filter((row) => row.practiceId !== practiceId)
    state.managed = state.managed.map((row) =>
      row.practiceId === practiceId
        ? {
            ...row,
            status: 'scheduled',
            statusLabel: '新分配',
            mentorNames: 'Jerry Li, Mike Chen',
            mentorBackgrounds: 'Goldman Sachs IBD · 5年 / McKinsey · 4年',
          }
        : row,
    )

    return {
      practiceId,
      status: 'scheduled',
      statusLabel: '新分配',
      mentorNames: 'Jerry Li, Mike Chen',
      mentorBackgrounds: 'Goldman Sachs IBD · 5年 / McKinsey · 4年',
    }
  })
  apiMocks.acknowledgeLeadMentorMockPractice.mockImplementation(async (practiceId: number) => {
    state.coaching = state.coaching.map((row) =>
      row.practiceId === practiceId
        ? {
            ...row,
            status: 'confirmed',
            statusLabel: '已确认',
            isNewAssignment: false,
          }
        : row,
    )

    return {
      practiceId,
      status: 'confirmed',
      statusLabel: '已确认',
    }
  })
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStoryPage(initialPath = '/career/mock-practice') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'career/mock-practice', name: 'CareerMockPractice', component: MockPracticePage },
        ],
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await flushUi()

  return {
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

function findButtonByText(container: ParentNode, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  )
}

describe('S-043 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('covers scope switching, real feedback detail, mentor assignment, and acknowledgement in one story path', async () => {
    const state = createScopeState()
    installStatefulMocks(state)

    const page = await mountStoryPage()

    try {
      const pendingTab = page.container.querySelector<HTMLButtonElement>('#mock-tab-pending')
      const coachingTab = page.container.querySelector<HTMLButtonElement>('#mock-tab-mycoaching')

      pendingTab?.click()
      await flushUi()
      expect(page.container.querySelector<HTMLElement>('#mock-content-pending')?.textContent).toContain('Alice')

      coachingTab?.click()
      await flushUi()

      findButtonByText(page.container, '表现稳定')?.click()
      await flushUi()

      const feedbackModal = page.container.querySelector<HTMLElement>('[data-surface-id="modal-lead-mock-feedback"]')
      expect(apiMocks.getLeadMentorMockPracticeDetail).toHaveBeenCalledWith(9003)
      expect(feedbackModal?.textContent).toContain('Cindy')
      expect(feedbackModal?.textContent).toContain('Jerry Li')
      expect(feedbackModal?.textContent).toContain('2h')
      expect(feedbackModal?.textContent).toContain('表现稳定，框架清晰')

      findButtonByText(feedbackModal || page.container, '关闭')?.click()
      await flushUi()

      pendingTab?.click()
      await flushUi()

      page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-assign-mock"]')?.click()
      await flushUi()

      const assignModal = page.container.querySelector<HTMLElement>('[data-surface-id="modal-assign-mock"]')
      expect(assignModal?.textContent).toContain('处理模拟应聘申请')

      const checkboxes = assignModal?.querySelectorAll<HTMLInputElement>('.mentor-list input[type="checkbox"]')
      const datetimeInput = assignModal?.querySelector<HTMLInputElement>('input[type="datetime-local"]')
      const noteTextarea = assignModal?.querySelector<HTMLTextAreaElement>('textarea')

      if (checkboxes && checkboxes[1]) {
        checkboxes[1].checked = true
        checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (datetimeInput) {
        datetimeInput.value = '2026-03-25T09:30'
        datetimeInput.dispatchEvent(new Event('input', { bubbles: true }))
        datetimeInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (noteTextarea) {
        noteTextarea.value = '优先安排一面复盘'
        noteTextarea.dispatchEvent(new Event('input', { bubbles: true }))
        noteTextarea.dispatchEvent(new Event('change', { bubbles: true }))
      }

      findButtonByText(assignModal || page.container, '确认安排')?.click()
      await flushUi()

      expect(apiMocks.assignLeadMentorMockPractice).toHaveBeenCalledWith(9001, {
        mentorIds: [9201, 9202],
        scheduledAt: '2026-03-25T09:30',
        note: '优先安排一面复盘',
      })
      expect(page.container.querySelector<HTMLElement>('#mock-content-pending')?.textContent).not.toContain('Alice')

      coachingTab?.click()
      await flushUi()

      findButtonByText(page.container.querySelector('#mock-content-mycoaching') || page.container, '确认')?.click()
      await flushUi()

      expect(apiMocks.acknowledgeLeadMentorMockPractice).toHaveBeenCalledWith(9002)
      expect(page.container.querySelector<HTMLElement>('#mock-content-mycoaching')?.textContent).toContain('已确认')
      expect(findButtonByText(page.container.querySelector('#mock-content-mycoaching') || page.container, '确认')).toBeUndefined()
    } finally {
      page.unmount()
    }
  })

  it('covers out-of-scope detail failure without fabricating feedback modal data', async () => {
    const state = createScopeState()
    installStatefulMocks(state)
    apiMocks.getLeadMentorMockPracticeDetail.mockRejectedValueOnce(new Error('403 forbidden'))

    const page = await mountStoryPage()

    try {
      const coachingTab = page.container.querySelector<HTMLButtonElement>('#mock-tab-mycoaching')
      coachingTab?.click()
      await flushUi()

      findButtonByText(page.container, '表现稳定')?.click()
      await flushUi()

      expect(messageMocks.error).toHaveBeenCalled()
      expect(page.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')).toBeNull()
      expect(messageMocks.success).not.toHaveBeenCalled()
    } finally {
      page.unmount()
    }
  })
})

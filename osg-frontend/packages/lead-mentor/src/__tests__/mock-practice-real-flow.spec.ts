import { createApp, defineComponent, h, nextTick } from 'vue'
import Antd from 'ant-design-vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { LeadMentorMockPracticeItem } from '@osg/shared/api'

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
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/composables', () => ({
  useIdleLogout: vi.fn(),
  deriveMockPracticeStatus: (input: { status?: string; completedHours?: number }) => {
    if (input.status === 'completed' || Number(input.completedHours ?? 0) > 0) {
      return { label: '已完成', value: 'completed', tone: 'success' }
    }
    if (input.status === 'scheduled') {
      return { label: '待进行', value: 'assigned', tone: 'info' }
    }
    if (input.status === 'confirmed') {
      return { label: '进行中', value: 'coaching', tone: 'warning' }
    }
    if (input.status === 'cancelled') {
      return { label: '已取消', value: 'cancelled', tone: 'danger' }
    }
    return { label: '待分配', value: 'pending', tone: 'default' }
  },
}))

vi.mock('../views/teaching/class-records/LeadMentorClassReportFlowModal.vue', () => ({
  default: defineComponent({
    name: 'LeadMentorClassReportFlowModalStub',
    props: {
      visible: { type: Boolean, default: false },
      prefilledStudentId: { type: Number, default: undefined },
      prefilledReferenceType: { type: String, default: undefined },
      prefilledReferenceId: { type: Number, default: undefined },
      readonlyFields: { type: Array, default: () => [] },
    },
    emits: ['update:visible', 'submitted'],
    setup(props) {
      return () =>
        h('div', {
          'data-testid': 'lm-class-report-stub',
          'data-visible': String(Boolean(props.visible)),
          'data-prefilled-student-id': props.prefilledStudentId ?? '',
          'data-prefilled-reference-type': props.prefilledReferenceType ?? '',
          'data-prefilled-reference-id': props.prefilledReferenceId ?? '',
        })
    },
  }),
}))

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue')
  return {
    ...actual,
    message: messageMocks,
  }
})

const statsFixture = {
  pendingCount: 1,
  scheduledCount: 2,
  completedCount: 1,
  cancelledCount: 0,
  totalCount: 4,
}

const pendingRows: LeadMentorMockPracticeItem[] = [
  {
    practiceId: 9001,
    studentId: 3001,
    studentName: 'Alice',
    practiceType: '模拟面试',
    requestContent: 'Goldman Sachs IB 二面',
    requestedMentorCount: 2,
    preferredMentorNames: 'Jerry Li, Mike Chen',
    status: 'pending',
    submittedAt: '2026-03-21T10:00:00Z',
  },
]

const coachingRows: LeadMentorMockPracticeItem[] = [
  {
    practiceId: 9002,
    studentId: 3002,
    studentName: 'Bob',
    practiceType: '人际关系测试',
    requestContent: 'Leadership Test',
    status: 'scheduled',
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
    mentorNames: 'Jerry Li',
    completedHours: 2,
    completedHoursLabel: '2h',
    feedbackSummary: '表现稳定，框架清晰',
    submittedAt: '2026-03-20T09:00:00Z',
  },
]

const managedRows: LeadMentorMockPracticeItem[] = [
  {
    practiceId: 9001,
    studentId: 3001,
    studentName: 'Alice',
    practiceType: '模拟面试',
    requestContent: 'Goldman Sachs IB 二面',
    requestedMentorCount: 2,
    preferredMentorNames: 'Jerry Li, Mike Chen',
    status: 'pending',
    submittedAt: '2026-03-21T10:00:00Z',
  },
  {
    practiceId: 9002,
    studentId: 3002,
    studentName: 'Bob',
    practiceType: '人际关系测试',
    requestContent: 'Leadership Test',
    status: 'scheduled',
    mentorNames: 'Jess, Amy',
    mentorBackgrounds: 'Lead Mentor / Morgan Stanley',
    submittedAt: '2026-03-22T11:00:00Z',
  },
]

const assignDetail: LeadMentorMockPracticeItem = {
  practiceId: 9001,
  studentId: 3001,
  studentName: 'Alice',
  practiceType: '模拟面试',
  requestContent: 'Goldman Sachs IB 二面',
  requestedMentorCount: 2,
  preferredMentorNames: 'Jerry Li, Mike Chen',
  status: 'pending',
  submittedAt: '2026-03-21T10:00:00Z',
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

const feedbackDetail: LeadMentorMockPracticeItem = {
  practiceId: 9003,
  studentId: 3003,
  studentName: 'Cindy',
  practiceType: '期中考试',
  requestContent: 'Midterm Review',
  status: 'completed',
  mentorNames: 'Jerry Li',
  mentorBackgrounds: 'Goldman Sachs IBD · 5年',
  completedHours: 2,
  completedHoursLabel: '2h',
  feedbackRating: 4,
  feedbackSummary: '表现稳定，框架清晰',
  reportedLessonCount: 2,
  latestRating: '5',
  referenceType: 'communication_test',
  referenceId: 9003,
  classRecords: [
    {
      recordId: 7002,
      classDate: '2026-03-25T10:00:00Z',
      mentorId: 9202,
      mentorName: 'Jerry Li',
      durationHours: 1.5,
      memberStatus: 'normal',
      rate: '5',
      feedback: '第二次课消反馈：表达更稳定',
      status: 'approved',
    },
    {
      recordId: 7001,
      classDate: '2026-03-24T10:00:00Z',
      mentorId: 9202,
      mentorName: 'Jerry Li',
      durationHours: 1,
      memberStatus: 'normal',
      rate: '4',
      feedback: '第一次课消反馈：需要补充结构化表达',
      status: 'approved',
    },
  ],
  submittedAt: '2026-03-20T09:00:00Z',
  mentorOptions: [],
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountMockPracticePage(initialPath = '/career/mock-practice') {
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
  app.use(Antd)
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

function installListMocks(
  scopedRows: {
    pending: LeadMentorMockPracticeItem[]
    coaching: LeadMentorMockPracticeItem[]
    managed: LeadMentorMockPracticeItem[]
  },
) {
  apiMocks.getLeadMentorMockPracticeList.mockImplementation(async (params: { scope: string }) => {
    if (params.scope === 'pending') {
      return { rows: scopedRows.pending }
    }
    if (params.scope === 'coaching') {
      return { rows: scopedRows.coaching }
    }
    return { rows: scopedRows.managed }
  })
}

describe('lead-mentor mock practice real flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorMockPracticeStats.mockResolvedValue(statsFixture)
    installListMocks({
      pending: pendingRows,
      coaching: coachingRows,
      managed: managedRows,
    })
    apiMocks.getLeadMentorMockPracticeDetail.mockImplementation(async (practiceId: number) => {
      if (practiceId === 9001) {
        return assignDetail
      }
      return feedbackDetail
    })
    apiMocks.assignLeadMentorMockPractice.mockResolvedValue({
      practiceId: 9001,
      status: 'scheduled',
      mentorNames: 'Jerry Li, Mike Chen',
      mentorBackgrounds: 'Goldman Sachs IBD · 5年 / McKinsey · 4年',
    })
    apiMocks.acknowledgeLeadMentorMockPractice.mockResolvedValue({
      practiceId: 9002,
      status: 'confirmed',
    })
  })

  it('loads all three scopes without rendering the removed stats cards', async () => {
    const page = await mountMockPracticePage()

    try {
      expect(apiMocks.getLeadMentorMockPracticeStats).not.toHaveBeenCalled()
      expect(apiMocks.getLeadMentorMockPracticeList).toHaveBeenCalledWith({ scope: 'pending' })
      expect(apiMocks.getLeadMentorMockPracticeList).toHaveBeenCalledWith({ scope: 'coaching' })
      expect(apiMocks.getLeadMentorMockPracticeList).toHaveBeenCalledWith({ scope: 'managed' })

      const tabLabels = Array.from(page.container.querySelectorAll<HTMLElement>('.mock-tab-label')).map((item) =>
        item.textContent?.replace(/\s+/g, ''),
      )
      expect(tabLabels[0]).toContain('我管理的学员')
      expect(tabLabels[1]).toContain('我辅导的学员')
      expect(tabLabels[2]).toContain('待分配导师')

      expect(page.container.textContent).toContain('Alice')
      expect(page.container.textContent).toContain('Bob')
      expect(page.container.textContent).toContain('Cindy')
      expect(page.container.textContent).not.toContain('孙八')
      expect(page.container.textContent).not.toContain('吴十')
      expect(page.container.querySelector('[aria-label="mock practice stats"]')).toBeNull()
      expect(page.container.textContent).not.toContain('待处理')
      expect(page.container.textContent).not.toContain('已安排')
    } finally {
      page.unmount()
    }
  })

  it('opens feedback modal from the real detail endpoint and renders the returned feedback fields', async () => {
    const page = await mountMockPracticePage()

    try {
      const feedbackTrigger = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.feedback-trigger')).find((button) =>
        button.textContent?.includes('表现稳定'),
      )
      expect(feedbackTrigger).toBeTruthy()

      feedbackTrigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorMockPracticeDetail).toHaveBeenCalledWith(9003)

      const modal = page.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')
      expect(modal?.textContent).toContain('Cindy')
      expect(modal?.textContent).toContain('Jerry Li')
      expect(modal?.textContent).toContain('表现稳定，框架清晰')
      expect(modal?.textContent).toContain('第二次课消反馈：表达更稳定')
      expect(modal?.textContent).toContain('第一次课消反馈：需要补充结构化表达')
      expect(modal?.textContent).toContain('5')
    } finally {
      page.unmount()
    }
  })

  it('opens the class report flow from coaching rows with the practice reference prefilled', async () => {
    const page = await mountMockPracticePage()

    try {
      const reportButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('上报课消'),
      )
      expect(reportButton).toBeTruthy()

      reportButton?.click()
      await flushUi()

      const stub = page.container.querySelector<HTMLElement>('[data-testid="lm-class-report-stub"]')
      expect(stub?.dataset.visible).toBe('true')
      expect(stub?.dataset.prefilledStudentId).toBe('3002')
      expect(stub?.dataset.prefilledReferenceType).toBe('relation_test')
      expect(stub?.dataset.prefilledReferenceId).toBe('9002')
    } finally {
      page.unmount()
    }
  })

  it('submits real assignment payload and refreshes scopes after confirm', async () => {
    const scopedRows = {
      pending: [...pendingRows],
      coaching: [...coachingRows],
      managed: [...managedRows],
    }

    installListMocks(scopedRows)
    apiMocks.assignLeadMentorMockPractice.mockImplementation(async () => {
      scopedRows.pending = []
      scopedRows.managed = scopedRows.managed.map((row) =>
        row.practiceId === 9001
          ? {
              ...row,
              status: 'scheduled',
              mentorNames: 'Jerry Li, Mike Chen',
              mentorBackgrounds: 'Goldman Sachs IBD · 5年 / McKinsey · 4年',
            }
          : row,
      )
      return {
        practiceId: 9001,
        status: 'scheduled',
        mentorNames: 'Jerry Li, Mike Chen',
        mentorBackgrounds: 'Goldman Sachs IBD · 5年 / McKinsey · 4年',
      }
    })

    const page = await mountMockPracticePage()

    try {
      page.container.querySelector<HTMLElement>('#mock-tab-pending')?.click()
      await flushUi()

      const assignTrigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-assign-mock"]')
      expect(assignTrigger).toBeTruthy()

      assignTrigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-assign-mock"]')
      const checkboxes = modal?.querySelectorAll<HTMLInputElement>('.mentor-list input[type="checkbox"]')
      const datetimeInput = modal?.querySelector<HTMLInputElement>('input[type="datetime-local"]')
      const noteTextarea = modal?.querySelector<HTMLTextAreaElement>('textarea')
      const confirmButton = modal?.querySelector<HTMLButtonElement>('.btn-primary')

      expect(apiMocks.getLeadMentorMockPracticeDetail).toHaveBeenCalledWith(9001)
      expect(checkboxes?.length).toBe(2)

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

      confirmButton?.click()
      await flushUi()

      expect(apiMocks.assignLeadMentorMockPractice).toHaveBeenCalledWith(9001, {
        mentorIds: [9201, 9202],
        scheduledAt: '2026-03-25T09:30',
        note: '优先安排一面复盘',
      })
      expect(messageMocks.success).toHaveBeenCalled()
      expect(page.container.textContent).not.toContain('待分配导师1')
    } finally {
      page.unmount()
    }
  })

  it('rejects assignment when selected mentor count does not match the requested mentor count', async () => {
    const page = await mountMockPracticePage()

    try {
      page.container.querySelector<HTMLElement>('#mock-tab-pending')?.click()
      await flushUi()

      const assignTrigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-assign-mock"]')
      expect(assignTrigger).toBeTruthy()

      assignTrigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-assign-mock"]')
      const datetimeInput = modal?.querySelector<HTMLInputElement>('input[type="datetime-local"]')
      const confirmButton = modal?.querySelector<HTMLButtonElement>('.btn-primary')

      if (datetimeInput) {
        datetimeInput.value = '2026-03-25T09:30'
        datetimeInput.dispatchEvent(new Event('input', { bubbles: true }))
        datetimeInput.dispatchEvent(new Event('change', { bubbles: true }))
      }

      confirmButton?.click()
      await flushUi()

      expect(apiMocks.assignLeadMentorMockPractice).not.toHaveBeenCalled()
      expect(messageMocks.error).toHaveBeenCalledWith('分配导师数量必须等于申请导师数量')
    } finally {
      page.unmount()
    }
  })

  it('acknowledges newly assigned coaching records through the real API and removes the placeholder action', async () => {
    const scopedRows = {
      pending: [...pendingRows],
      coaching: [...coachingRows],
      managed: [...managedRows],
    }

    installListMocks(scopedRows)
    apiMocks.acknowledgeLeadMentorMockPractice.mockImplementation(async () => {
      scopedRows.coaching = scopedRows.coaching.map((row) =>
        row.practiceId === 9002
          ? { ...row, status: 'confirmed', isNewAssignment: false }
          : row,
      )
      return {
        practiceId: 9002,
        status: 'confirmed',
      }
    })

    const page = await mountMockPracticePage()

    try {
      const confirmButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('确认'),
      )
      expect(confirmButton).toBeTruthy()

      confirmButton?.click()
      await flushUi()

      expect(apiMocks.acknowledgeLeadMentorMockPractice).toHaveBeenCalledWith(9002)
      expect(messageMocks.success).toHaveBeenCalled()
    } finally {
      page.unmount()
    }
  })
})

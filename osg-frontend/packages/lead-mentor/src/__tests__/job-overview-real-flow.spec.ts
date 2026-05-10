import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { LeadMentorJobOverviewListItem } from '@osg/shared/api'

import Antd from 'ant-design-vue'
import MainLayout from '../layouts/MainLayout.vue'
import JobOverviewPage from '../views/career/job-overview/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  getLeadMentorJobOverviewCoachingDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  assignLeadMentorJobOverviewCoachingMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
  getLeadMentorJobOverviewCalendar: vi.fn(),
  getLeadMentorMentorList: vi.fn(async () => ({
    rows: [
      {
        staffId: 9001,
        staffName: 'Jerry Li',
        majorDirection: 'finance',
        subDirection: 'investment_banking',
        region: 'HK',
        city: 'Hong Kong',
        studentCount: 1,
        scheduleStatus: 'available',
      },
      {
        staffId: 9002,
        staffName: 'Mike Wang',
        majorDirection: 'finance',
        subDirection: 'investment_banking',
        region: 'HK',
        city: 'Hong Kong',
        studentCount: 2,
        scheduleStatus: 'available',
      },
    ],
  })),
}))

vi.mock('@osg/shared/composables', () => ({
  useIdleLogout: () => undefined,
  useCoachingStatusMap: () => ({
    items: { value: [] },
    loading: { value: false },
    load: vi.fn(async () => undefined),
    resolveCoachingTone: () => 'blue',
  }),
  useDictFacade: () => ({
    items: { value: [] },
    loading: { value: false },
    load: vi.fn(async () => undefined),
  }),
  deriveApplicationStatus: (status?: string) => status || 'pending',
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

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue')
  return {
    ...actual,
    message: messageMocks,
  }
})

const pendingRows: LeadMentorJobOverviewListItem[] = [
  {
    applicationId: 7001,
    studentId: 3001,
    studentName: 'Alice',
    companyName: 'Goldman Sachs',
    positionName: 'Summer Analyst',
    currentStage: 'First Round',
    interviewTime: '2026-03-26T09:30:00Z',
    requestedMentorCount: 2,
    preferredMentorNames: 'Jerry Li, Mike Wang',
    coachingStatus: '待审批',
    mentorNames: 'Jerry Li, Mike Wang',
    assignedStatus: 'pending',
    stageUpdated: false,
  },
]

const coachingRows: LeadMentorJobOverviewListItem[] = [
  {
    applicationId: 7002,
    studentId: 3002,
    studentName: 'Bob',
    companyName: 'McKinsey',
    positionName: 'Business Analyst',
    currentStage: 'Case Study',
    interviewTime: '2026-03-28T14:00:00Z',
    coachingStatus: '辅导中',
    mentorName: 'Jess',
    mentorNames: 'Jess, Amy',
    hoursUsed: 6,
    feedbackSummary: '拆分 case study 讲解后通过率提升',
    assignedStatus: 'assigned',
    stageUpdated: false,
  },
]

const managedRows: LeadMentorJobOverviewListItem[] = [
  {
    applicationId: 7002,
    studentId: 3002,
    studentName: 'Bob',
    companyName: 'McKinsey',
    positionName: 'Business Analyst',
    currentStage: 'Case Study',
    interviewTime: '2026-03-28T14:00:00Z',
    coachingStatus: '辅导中',
    mentorName: 'Jess',
    mentorNames: 'Jess, Amy',
    hoursUsed: 6,
    feedbackSummary: '拆分 case study 讲解后通过率提升',
    assignedStatus: 'assigned',
    stageUpdated: false,
  },
  {
    applicationId: 7001,
    studentId: 3001,
    studentName: 'Alice',
    companyName: 'Goldman Sachs',
    positionName: 'Summer Analyst',
    currentStage: 'First Round',
    interviewTime: '2026-03-26T09:30:00Z',
    requestedMentorCount: 2,
    preferredMentorNames: 'Jerry Li, Mike Wang',
    coachingStatus: '待审批',
    mentorNames: 'Jerry Li, Mike Wang',
    assignedStatus: 'pending',
    stageUpdated: false,
  },
  {
    applicationId: 7003,
    studentId: 3003,
    studentName: 'Cindy',
    companyName: 'Google',
    positionName: 'Product Strategy',
    currentStage: 'Second Round',
    interviewTime: '2026-03-29T16:00:00Z',
    coachingStatus: '辅导中',
    mentorName: 'Jerry Li',
    mentorNames: 'Jerry Li',
    hoursUsed: 4,
    feedbackSummary: '阶段推进中',
    assignedStatus: 'assigned',
    stageUpdated: true,
  },
]

const detailRow: LeadMentorJobOverviewListItem = {
  applicationId: 7002,
  studentId: 3002,
  studentName: 'Bob',
  companyName: 'McKinsey',
  positionName: 'Business Analyst',
  currentStage: 'Case Study',
  interviewTime: '2026-03-28T14:00:00Z',
  coachingStatus: '辅导中',
  mentorName: 'Jess',
  mentorNames: 'Jess, Amy',
  hoursUsed: 6,
  feedbackSummary: '拆分 case study 讲解后通过率提升',
  leadMentorName: 'Jess',
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function waitFor<T>(resolve: () => T | null | undefined | false, description: string, timeoutMs = 1000): Promise<T> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    await flushUi()
    const result = resolve()
    if (result) {
      return result
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 10))
  }
  throw new Error(`Timeout waiting for ${description}`)
}

function findButtonByText(container: ParentNode, text: string): HTMLButtonElement | null {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  ) || null
}

async function mountJobOverviewPage(initialPath = '/career/job-overview') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'career/job-overview', name: 'CareerJobOverview', component: JobOverviewPage },
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

function installListMocks() {
  apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
    if (params.scope === 'pending') {
      return { rows: pendingRows }
    }
    if (params.scope === 'coaching') {
      return { rows: coachingRows }
    }
    return { rows: managedRows }
  })
}

describe('lead-mentor job overview real flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installListMocks()
    apiMocks.getLeadMentorJobOverviewCalendar.mockResolvedValue([])
    apiMocks.getLeadMentorJobOverviewDetail.mockResolvedValue(detailRow)
    apiMocks.assignLeadMentorJobOverviewMentor.mockResolvedValue({
      applicationId: 7001,
      coachingStatus: '辅导中',
      mentorNames: 'Jerry Li, Mike Wang',
    })
    apiMocks.assignLeadMentorJobOverviewCoachingMentor.mockResolvedValue({
      applicationId: 7001,
      coachingId: 9701,
      coachingStatus: '辅导中',
      mentorNames: 'Jerry Li, Mike Wang',
    })
    apiMocks.acknowledgeLeadMentorJobOverviewStage.mockResolvedValue({
      applicationId: 7003,
      stageUpdated: false,
      currentStage: 'Second Round',
    })
  })

  it('loads all three scopes from the lead-mentor API and does not render the old static browser rows', async () => {
    const page = await mountJobOverviewPage()

    try {
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'pending' })
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'coaching' })
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'managed' })
      expect(page.container.textContent).toContain('Alice')
      expect(page.container.textContent).toContain('Bob')
      expect(page.container.textContent).toContain('Cindy')
      expect(page.container.textContent).not.toContain('孙八')
      expect(page.container.textContent).not.toContain('吴十')

      const counts = Array.from(page.container.querySelectorAll('.tab-count')).map((node) => node.textContent?.trim())
      expect(counts).toContain('1')
      expect(counts).toContain('3')
    } finally {
      page.unmount()
    }
  })

  it('opens job detail from the real detail endpoint and shows stage, mentor, hours, and feedback from the API', async () => {
    const page = await mountJobOverviewPage()

    try {
      const detailTrigger = page.container.querySelector<HTMLButtonElement>(
        '[data-surface-trigger="modal-job-detail"]',
      )
      expect(detailTrigger).toBeTruthy()

      detailTrigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorJobOverviewDetail).toHaveBeenCalledWith(7002)

      const modal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-job-detail"]'),
        'job detail modal',
      )
      expect(modal.textContent).toContain('Case Study')
      expect(modal.textContent).toContain('Jess')
      expect(modal.textContent).toContain('6h')
      expect(modal.textContent).toContain('拆分 case study 讲解后通过率提升')
    } finally {
      page.unmount()
    }
  })

  it('submits real mentor assignment and refreshes the pending scope after confirm', async () => {
    let scopedPendingRows = [...pendingRows]
    let scopedCoachingRows = [...coachingRows]
    let scopedManagedRows = [...managedRows]

    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: scopedPendingRows }
      }
      if (params.scope === 'coaching') {
        return { rows: scopedCoachingRows }
      }
      return { rows: scopedManagedRows }
    })
    apiMocks.assignLeadMentorJobOverviewMentor.mockImplementation(async () => {
      scopedPendingRows = []
      scopedManagedRows = scopedManagedRows.map((row) =>
        row.applicationId === 7001
          ? {
              ...row,
              assignedStatus: 'assigned',
              coachingStatus: '辅导中',
              mentorName: 'Jerry Li',
              mentorNames: 'Jerry Li, Mike Wang',
            }
          : row,
      )
      return {
        applicationId: 7001,
        coachingStatus: '辅导中',
        mentorNames: 'Jerry Li, Mike Wang',
      }
    })

    const page = await mountJobOverviewPage()

    try {
      const pendingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')
      pendingTab?.click()
      await flushUi()

      const pendingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-pending')
      const assignButton = Array.from(pendingPanel?.querySelectorAll<HTMLButtonElement>('button') || []).find((button) =>
        button.textContent?.includes('分配导师'),
      )
      expect(assignButton).toBeTruthy()
      assignButton?.click()
      await flushUi()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )

      // 真实导师列表来自 /lead-mentor/mentor/list mock，需先勾选两位再确认
      const mentorItems = Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item'))
      const jerryItem = mentorItems.find((item) => item.textContent?.includes('Jerry Li'))
      const mikeItem = mentorItems.find((item) => item.textContent?.includes('Mike Wang'))
      jerryItem?.click()
      mikeItem?.click()
      await flushUi()

      const confirmButton = assignModal.querySelector<HTMLButtonElement>('.assign-mentor-action')
      expect(confirmButton).toBeTruthy()
      confirmButton?.click()
      await flushUi()

      expect(apiMocks.assignLeadMentorJobOverviewMentor).toHaveBeenCalledWith(7001, {
        mentorIds: [9001, 9002],
        mentorNames: ['Jerry Li', 'Mike Wang'],
        assignNote: '',
      })
      expect(messageMocks.success).toHaveBeenCalled()
      expect(pendingPanel?.textContent).not.toContain('Alice')
    } finally {
      page.unmount()
    }
  })

  it('submits mentor assignment by coachingId when the pending row has coachingId', async () => {
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: [{ ...pendingRows[0], coachingId: 9701 }] }
      }
      if (params.scope === 'coaching') {
        return { rows: coachingRows }
      }
      return { rows: managedRows }
    })

    const page = await mountJobOverviewPage()

    try {
      page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')?.click()
      const row = await waitFor(
        () => page.container.querySelector<HTMLElement>('#lm-job-content-pending [data-row-key="9701"]'),
        'pending coaching row',
      )
      findButtonByText(row, '分配导师')?.click()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )
      Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item')).find((item) =>
        item.textContent?.includes('Jerry Li'),
      )?.click()
      Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item')).find((item) =>
        item.textContent?.includes('Mike Wang'),
      )?.click()
      await flushUi()

      findButtonByText(assignModal, '确认匹配')?.click()
      await waitFor(
        () => apiMocks.assignLeadMentorJobOverviewCoachingMentor.mock.calls.length > 0,
        'coaching mentor assignment request',
      )

      expect(apiMocks.assignLeadMentorJobOverviewCoachingMentor).toHaveBeenCalledWith(9701, {
        mentorIds: [9001, 9002],
        mentorNames: ['Jerry Li', 'Mike Wang'],
        assignNote: '',
      })
      expect(apiMocks.assignLeadMentorJobOverviewMentor).not.toHaveBeenCalledWith(7001, expect.anything())
    } finally {
      page.unmount()
    }
  })

  it('keeps sibling coaching of the same application untouched after assigning to one coaching', async () => {
    const sharedApplicationId = 7701
    const targetCoachingId = 9701
    const siblingCoachingId = 9702
    const pendingMultiCoachingRows: LeadMentorJobOverviewListItem[] = [
      {
        applicationId: sharedApplicationId,
        coachingId: targetCoachingId,
        studentId: 3701,
        studentName: 'Multi Stage Student',
        companyName: 'Goldman Sachs',
        positionName: 'Summer Analyst',
        currentStage: 'First Round',
        interviewTime: '2026-03-26T09:30:00Z',
        requestedMentorCount: 2,
        preferredMentorNames: 'Jerry Li, Mike Wang',
        coachingStatus: '待审批',
        mentorNames: 'Jerry Li, Mike Wang',
        assignedStatus: 'pending',
        stageUpdated: false,
      },
      {
        applicationId: sharedApplicationId,
        coachingId: siblingCoachingId,
        studentId: 3701,
        studentName: 'Multi Stage Student',
        companyName: 'Goldman Sachs',
        positionName: 'Summer Analyst',
        currentStage: 'Final Round',
        interviewTime: '2026-04-02T09:30:00Z',
        requestedMentorCount: 1,
        preferredMentorNames: 'Amy Chen',
        coachingStatus: '待审批',
        mentorNames: 'Amy Chen',
        assignedStatus: 'pending',
        stageUpdated: false,
      },
    ]
    const managedMultiCoachingRows: LeadMentorJobOverviewListItem[] = pendingMultiCoachingRows.map((row) => ({ ...row }))

    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: pendingMultiCoachingRows }
      }
      if (params.scope === 'coaching') {
        return { rows: [] }
      }
      return { rows: managedMultiCoachingRows }
    })

    const page = await mountJobOverviewPage()

    try {
      page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')?.click()
      const row = await waitFor(
        () => page.container.querySelector<HTMLElement>(
          `#lm-job-content-pending [data-row-key="${targetCoachingId}"]`,
        ),
        'target pending coaching row',
      )
      findButtonByText(row, '分配导师')?.click()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )
      Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item')).find((item) =>
        item.textContent?.includes('Jerry Li'),
      )?.click()
      Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item')).find((item) =>
        item.textContent?.includes('Mike Wang'),
      )?.click()
      await flushUi()

      findButtonByText(assignModal, '确认匹配')?.click()
      await waitFor(
        () => apiMocks.assignLeadMentorJobOverviewCoachingMentor.mock.calls.length > 0,
        'coaching mentor assignment request',
      )

      expect(apiMocks.assignLeadMentorJobOverviewCoachingMentor).toHaveBeenCalledWith(targetCoachingId, {
        mentorIds: [9001, 9002],
        mentorNames: ['Jerry Li', 'Mike Wang'],
        assignNote: '',
      })
      expect(apiMocks.assignLeadMentorJobOverviewCoachingMentor).not.toHaveBeenCalledWith(
        siblingCoachingId,
        expect.anything(),
      )
      expect(apiMocks.assignLeadMentorJobOverviewMentor).not.toHaveBeenCalled()

      const managedTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')
      managedTab?.click()
      await flushUi()

      const siblingRow = page.container.querySelector<HTMLElement>(
        `#lm-job-content-managed [data-row-key="${siblingCoachingId}"]`,
      )
      expect(siblingRow?.textContent).toContain('Final Round')
      expect(siblingRow?.textContent).toContain('Amy Chen')
      expect(siblingRow?.textContent).not.toContain('Jerry Li')
      expect(siblingRow?.textContent).not.toContain('Mike Wang')
    } finally {
      page.unmount()
    }
  })

  it('blocks mentor assignment when selected mentor count does not match requested count', async () => {
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: [{ ...pendingRows[0], coachingId: 9701, requestedMentorCount: 2 }] }
      }
      if (params.scope === 'coaching') {
        return { rows: coachingRows }
      }
      return { rows: managedRows }
    })

    const page = await mountJobOverviewPage()

    try {
      page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')?.click()
      const row = await waitFor(
        () => page.container.querySelector<HTMLElement>('#lm-job-content-pending [data-row-key="9701"]'),
        'pending coaching row',
      )
      findButtonByText(row, '分配导师')?.click()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )
      Array.from(assignModal.querySelectorAll<HTMLButtonElement>('.mentor-item')).find((item) =>
        item.textContent?.includes('Jerry Li'),
      )?.click()
      await flushUi()

      findButtonByText(assignModal, '确认匹配')?.click()
      await flushUi()

      expect(apiMocks.assignLeadMentorJobOverviewCoachingMentor).not.toHaveBeenCalled()
      expect(apiMocks.assignLeadMentorJobOverviewMentor).not.toHaveBeenCalled()
      expect(messageMocks.error).toHaveBeenCalledWith('导师数量必须等于申请导师数量')
    } finally {
      page.unmount()
    }
  })

  it('acknowledges stage updates through the real endpoint and removes the confirm action after refresh', async () => {
    let scopedPendingRows = [...pendingRows]
    let scopedCoachingRows = [...coachingRows]
    let scopedManagedRows = [...managedRows]

    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: scopedPendingRows }
      }
      if (params.scope === 'coaching') {
        return { rows: scopedCoachingRows }
      }
      return { rows: scopedManagedRows }
    })
    apiMocks.acknowledgeLeadMentorJobOverviewStage.mockImplementation(async () => {
      scopedManagedRows = scopedManagedRows.map((row) =>
        row.applicationId === 7003
          ? { ...row, stageUpdated: false }
          : row,
      )
      return {
        applicationId: 7003,
        stageUpdated: false,
        currentStage: 'Second Round',
      }
    })

    const page = await mountJobOverviewPage()

    try {
      const managedTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')
      managedTab?.click()
      await flushUi()

      const confirmButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.trim() === '确认',
      )
      expect(confirmButton).toBeTruthy()
      confirmButton?.click()
      await flushUi()

      expect(apiMocks.acknowledgeLeadMentorJobOverviewStage).toHaveBeenCalledWith(7003)
      expect(messageMocks.success).toHaveBeenCalled()

      const managedPanel = page.container.querySelector<HTMLElement>('#lm-job-content-managed')
      const cindyRow = Array.from(managedPanel?.querySelectorAll('tr') || []).find((row) => row.textContent?.includes('Cindy'))
      expect(cindyRow?.textContent).not.toContain('确认')
      expect(cindyRow?.textContent).toContain('查看详情')
    } finally {
      page.unmount()
    }
  })
})

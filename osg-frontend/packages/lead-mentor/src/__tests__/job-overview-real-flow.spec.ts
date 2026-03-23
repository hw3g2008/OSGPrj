import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { LeadMentorJobOverviewListItem } from '@osg/shared/api'

import MainLayout from '../layouts/MainLayout.vue'
import JobOverviewPage from '../views/career/job-overview/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
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
    apiMocks.getLeadMentorJobOverviewDetail.mockResolvedValue(detailRow)
    apiMocks.assignLeadMentorJobOverviewMentor.mockResolvedValue({
      applicationId: 7001,
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
      const detailTrigger = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('查看详情'),
      )
      expect(detailTrigger).toBeTruthy()

      detailTrigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorJobOverviewDetail).toHaveBeenCalledWith(7002)

      const modal = page.container.querySelector('[data-surface-id="modal-job-detail"]')
      expect(modal?.textContent).toContain('Case Study')
      expect(modal?.textContent).toContain('Jess')
      expect(modal?.textContent).toContain('6h')
      expect(modal?.textContent).toContain('拆分 case study 讲解后通过率提升')
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

      const assignModal = page.container.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]')
      expect(assignModal).toBeTruthy()

      const confirmButton = assignModal?.querySelector<HTMLButtonElement>('.assign-mentor-action')
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

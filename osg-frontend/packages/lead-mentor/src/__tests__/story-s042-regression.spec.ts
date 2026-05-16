import { createApp, nextTick } from 'vue'
import { i18n } from '@osg/shared'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import Antd from 'ant-design-vue'
import MainLayout from '../layouts/MainLayout.vue'
import JobOverviewPage from '../views/career/job-overview/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
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

interface ScopeState {
  pending: Array<Record<string, unknown>>
  coaching: Array<Record<string, unknown>>
  managed: Array<Record<string, unknown>>
}

function createScopeState(): ScopeState {
  return {
    pending: [
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
        submittedAt: '2026-03-21T10:00:00Z',
      },
    ],
    coaching: [
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
        leadMentorName: 'Jess',
        submittedAt: '2026-03-22T11:00:00Z',
      },
    ],
    managed: [
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
        submittedAt: '2026-03-21T10:00:00Z',
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
        leadMentorName: 'Jess',
        submittedAt: '2026-03-20T08:00:00Z',
      },
    ],
  }
}

function installStatefulMocks(state: ScopeState) {
  apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: 'pending' | 'coaching' | 'managed' }) => {
    return { rows: state[params.scope] }
  })
  apiMocks.getLeadMentorJobOverviewDetail.mockImplementation(async (applicationId: number) => {
    const record = [...state.pending, ...state.coaching, ...state.managed].find((row) => row.applicationId === applicationId)
    return {
      ...record,
      feedbackSummary: record?.feedbackSummary || '拆分 case study 讲解后通过率提升',
      leadMentorName: record?.leadMentorName || 'Jess',
    }
  })
  apiMocks.assignLeadMentorJobOverviewMentor.mockImplementation(async (applicationId: number, payload: { mentorNames: string[] }) => {
    state.pending = state.pending.filter((row) => row.applicationId !== applicationId)
    state.managed = state.managed.map((row) =>
      row.applicationId === applicationId
        ? {
            ...row,
            assignedStatus: 'assigned',
            coachingStatus: '辅导中',
            mentorName: payload.mentorNames[0] ?? row.mentorName,
            mentorNames: payload.mentorNames.join(', '),
          }
        : row,
    )
    state.coaching = state.coaching.map((row) =>
      row.applicationId === applicationId
        ? {
            ...row,
            mentorName: payload.mentorNames[0] ?? row.mentorName,
            mentorNames: payload.mentorNames.join(', '),
          }
        : row,
    )
    return {
      applicationId,
      coachingStatus: '辅导中',
      mentorNames: payload.mentorNames.join(', '),
    }
  })
  apiMocks.acknowledgeLeadMentorJobOverviewStage.mockImplementation(async (applicationId: number) => {
    state.managed = state.managed.map((row) =>
      row.applicationId === applicationId
        ? { ...row, stageUpdated: false }
        : row,
    )
    return {
      applicationId,
      stageUpdated: false,
      currentStage: 'Second Round',
    }
  })
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

async function mountStoryPage(initialPath = '/career/job-overview') {
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
  app.use(i18n)

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

describe('S-042 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('covers tab switching, real detail modal, mentor reassignment, and stage acknowledgement in one story path', async () => {
    const state = createScopeState()
    installStatefulMocks(state)

    const page = await mountStoryPage()

    try {
      const pendingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')
      const coachingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-coaching')
      const managedTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')

      pendingTab?.click()
      await flushUi()
      expect(page.container.querySelector<HTMLElement>('#lm-job-content-pending')?.textContent).toContain('Alice')

      coachingTab?.click()
      await flushUi()

      const coachingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-coaching')
      const detailTrigger = findButtonByText(coachingPanel || page.container, '查看详情')
      detailTrigger?.click()
      await flushUi()

      const detailModal = await waitFor(
        () => page.container.querySelector<HTMLElement>('[data-surface-id="modal-job-detail"]'),
        'job detail modal',
      )
      expect(detailModal.textContent).toContain('McKinsey')
      expect(detailModal?.textContent).toContain('Jess')
      expect(detailModal?.textContent).toContain('6h')
      expect(detailModal?.textContent).toContain('拆分 case study 讲解后通过率提升')

      const mentorChangeButton = findButtonByText(detailModal || page.container, '更换导师')
      mentorChangeButton?.click()
      await flushUi()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )
      expect(assignModal.textContent).toContain('为学员匹配辅导导师')

      const mentorItems = await waitFor(
        () => {
          const items = Array.from(
            document.body.querySelectorAll<HTMLButtonElement>('[data-surface-id="modal-assign-mentor"] .mentor-item'),
          )
          return items.length >= 2 ? items : null
        },
        'mentor items',
      )
      mentorItems.find((item) => item.textContent?.includes('Jerry Li'))?.click()
      mentorItems.find((item) => item.textContent?.includes('Mike Wang'))?.click()
      await flushUi()

      findButtonByText(assignModal || document.body, '确认匹配')?.click()
      await waitFor(
        () => apiMocks.assignLeadMentorJobOverviewMentor.mock.calls.length > 0,
        'mentor assignment request',
      )

      expect(apiMocks.assignLeadMentorJobOverviewMentor).toHaveBeenCalledWith(7002, {
        mentorIds: [9001, 9002],
        mentorNames: ['Jerry Li', 'Mike Wang'],
        assignNote: '',
      })

      managedTab?.click()
      await flushUi()

      const confirmButton = Array.from(
        page.container.querySelectorAll<HTMLButtonElement>('#lm-job-content-managed button'),
      ).find((button) => button.textContent?.trim() === '确认')
      confirmButton?.click()
      await flushUi()

      expect(apiMocks.acknowledgeLeadMentorJobOverviewStage).toHaveBeenCalledWith(7003)

      const managedPanelText = page.container.querySelector<HTMLElement>('#lm-job-content-managed')?.textContent ?? ''
      expect(managedPanelText).toContain('Alice')
      expect(managedPanelText).toContain('Cindy')
      expect(managedPanelText).not.toContain('Cindy确认')
      expect(messageMocks.success).toHaveBeenCalledTimes(2)
    } finally {
      page.unmount()
    }
  })

  it('covers relation boundary and error handling without fabricating out-of-scope detail', async () => {
    const state = createScopeState()
    installStatefulMocks(state)
    apiMocks.getLeadMentorJobOverviewDetail.mockRejectedValueOnce(new Error('403 forbidden'))

    const page = await mountStoryPage()

    try {
      const coachingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-coaching')
      const managedTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')

      coachingTab?.click()
      await flushUi()
      expect(page.container.querySelector<HTMLElement>('#lm-job-content-coaching')?.textContent).toContain('Bob')
      expect(page.container.querySelector<HTMLElement>('#lm-job-content-coaching')?.textContent).not.toContain('Alice')

      managedTab?.click()
      await flushUi()
      expect(page.container.querySelector<HTMLElement>('#lm-job-content-managed')?.textContent).toContain('Alice')

      const detailTrigger = findButtonByText(page.container, '查看详情')
      detailTrigger?.click()
      await flushUi()

      expect(messageMocks.error).toHaveBeenCalled()
      expect(page.container.querySelector('[data-surface-id="modal-job-detail"]')).toBeNull()
      expect(page.container.textContent).not.toContain('403 forbidden')
    } finally {
      page.unmount()
    }
  })

  it('covers refresh consistency by remounting with the same mutable backend state', async () => {
    const state = createScopeState()
    installStatefulMocks(state)

    const firstMount = await mountStoryPage()

    try {
      firstMount.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')?.click()
      await flushUi()
      findButtonByText(firstMount.container.querySelector('#lm-job-content-pending') || firstMount.container, '分配导师')?.click()

      const assignModal = await waitFor(
        () => document.body.querySelector<HTMLElement>('[data-surface-id="modal-assign-mentor"]'),
        'assign mentor modal',
      )
      const mentorItems = await waitFor(
        () => {
          const items = Array.from(
            document.body.querySelectorAll<HTMLButtonElement>('[data-surface-id="modal-assign-mentor"] .mentor-item'),
          )
          return items.length >= 2 ? items : null
        },
        'mentor items',
      )
      mentorItems.find((item) => item.textContent?.includes('Jerry Li'))?.click()
      mentorItems.find((item) => item.textContent?.includes('Mike Wang'))?.click()
      await flushUi()

      findButtonByText(assignModal || document.body, '确认匹配')?.click()
      await waitFor(
        () => apiMocks.assignLeadMentorJobOverviewMentor.mock.calls.length > 0,
        'mentor assignment request',
      )

      firstMount.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')?.click()
      await flushUi()
      Array.from(
        firstMount.container.querySelectorAll<HTMLButtonElement>('#lm-job-content-managed button'),
      ).find((button) => button.textContent?.trim() === '确认')?.click()
      await flushUi()
    } finally {
      firstMount.unmount()
    }

    installStatefulMocks(state)

    const secondMount = await mountStoryPage()

    try {
      secondMount.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')?.click()
      await flushUi()
      expect(secondMount.container.querySelector<HTMLElement>('#lm-job-content-pending')?.textContent).not.toContain('Alice')

      secondMount.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')?.click()
      await flushUi()
      const managedPanel = secondMount.container.querySelector<HTMLElement>('#lm-job-content-managed')
      const cindyRow = Array.from(managedPanel?.querySelectorAll('tr') || []).find((row) => row.textContent?.includes('Cindy'))
      expect(cindyRow?.textContent).not.toContain('确认')
      expect(cindyRow?.textContent).toContain('查看详情')
    } finally {
      secondMount.unmount()
    }
  })
})

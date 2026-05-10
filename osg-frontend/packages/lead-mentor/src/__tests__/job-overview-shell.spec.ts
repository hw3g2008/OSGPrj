import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import Antd from 'ant-design-vue'
import MainLayout from '../layouts/MainLayout.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  getLeadMentorJobOverviewCoachingDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  assignLeadMentorJobOverviewCoachingMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
  getLeadMentorJobOverviewCalendar: vi.fn(),
  getLeadMentorMentorList: vi.fn(async () => ({ rows: [] })),
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

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)
const jobOverviewPath = path.resolve(__dirname, '../views/career/job-overview/index.vue')
const jobOverviewExists = fs.existsSync(jobOverviewPath)

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
    message: {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    },
  }
})

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

function findTab(container: ParentNode, text: string): HTMLElement | null {
  return Array.from(container.querySelectorAll<HTMLElement>('.ant-tabs-tab')).find((el) =>
    el.textContent?.includes(text),
  ) || null
}

function findButtonByText(container: ParentNode, text: string): HTMLButtonElement | null {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  ) || null
}

function isTabPaneActive(panel: HTMLElement | null | undefined): boolean {
  const tabpane = panel?.closest<HTMLElement>('.ant-tabs-tabpane')
  return !!tabpane?.classList.contains('ant-tabs-tabpane-active')
}

async function loadJobOverviewPage() {
  expect(jobOverviewExists).toBe(true)
  const moduleUrl = pathToFileURL(jobOverviewPath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountJobOverviewPage(initialPath = '/career/job-overview') {
  const JobOverviewPage = await loadJobOverviewPage()
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
    router,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('lead-mentor job overview shell contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorJobOverviewCalendar.mockResolvedValue([])
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return {
          rows: [
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
              submittedAt: '2026-03-21T10:00:00Z',
            },
          ],
        }
      }
      if (params.scope === 'coaching') {
        return {
          rows: [
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
            },
          ],
        }
      }
      return {
        rows: [
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
            stageUpdated: true,
          },
        ],
      }
    })
  })

  it('registers the /career/job-overview route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'career/job-overview'")
    expect(routerSource).toContain("name: 'CareerJobOverview'")
    expect(jobOverviewExists).toBe(true)
  })

  it('restores the job overview shell with compact calendar, search bar, tabs, and prototype copy', async () => {
    const page = await mountJobOverviewPage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/career/job-overview')
      expect(page.container.querySelector('#page-job-overview')).toBeTruthy()
      expect(page.container.textContent).toContain('学员求职总览')
      expect(page.container.textContent).toContain('Job Overview')
      expect(page.container.textContent).toContain('查看我辅导和管理的学员求职进度')
      expect(page.container.textContent).toContain('导出')
      // InterviewCalendar（共享组件）渲染的 toolbar + 标题
      expect(page.container.querySelector('.osg-ic__toolbar')).toBeTruthy()
      expect(page.container.textContent).toContain('学员面试安排')
      expect(apiMocks.getLeadMentorJobOverviewCalendar).toHaveBeenCalled()
      expect(page.container.textContent).toContain('全部公司')
      expect(page.container.textContent).toContain('全部状态')
      expect(page.container.textContent).toContain('待分配导师')
      expect(page.container.textContent).toContain('我辅导的学员')
      expect(page.container.textContent).toContain('我管理的学员')
      expect(page.container.textContent).toContain('分配导师')
      expect(page.container.textContent).toContain('查看详情')
      expect(page.container.textContent).toContain('已确认')
      expect(page.container.querySelector('#lm-job-tab-pending')).toBeTruthy()
      expect(page.container.querySelector('#lm-job-tab-coaching')).toBeTruthy()
      expect(page.container.querySelector('#lm-job-tab-managed')).toBeTruthy()
      expect(page.container.querySelectorAll('.ant-table').length).toBeGreaterThanOrEqual(3)
    } finally {
      page.unmount()
    }
  })

  it('switches tabs while preserving the job overview nav highlight', async () => {
    const page = await mountJobOverviewPage()

    try {
      const pendingButton = findTab(page.container, '待分配导师')
      const coachingButton = findTab(page.container, '我辅导的学员')
      const managedButton = findTab(page.container, '我管理的学员')
      const pendingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-pending')
      const coachingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-coaching')
      const managedPanel = page.container.querySelector<HTMLElement>('#lm-job-content-managed')
      const overviewNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('学员求职总览 Job Overview'),
      )

      expect(pendingButton).toBeTruthy()
      expect(coachingButton).toBeTruthy()
      expect(managedButton).toBeTruthy()
      expect(isTabPaneActive(pendingPanel)).toBe(false)
      expect(isTabPaneActive(coachingPanel)).toBe(false)
      expect(isTabPaneActive(managedPanel)).toBe(true)
      expect(overviewNav?.classList.contains('active')).toBe(true)

      pendingButton?.click()
      await flushUi()

      expect(isTabPaneActive(pendingPanel)).toBe(true)
      expect(isTabPaneActive(coachingPanel)).toBe(false)
      expect(isTabPaneActive(managedPanel)).toBe(false)

      managedButton?.click()
      await flushUi()

      expect(isTabPaneActive(pendingPanel)).toBe(false)
      expect(isTabPaneActive(coachingPanel)).toBe(false)
      expect(isTabPaneActive(managedPanel)).toBe(true)
      expect(overviewNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })

  it('uses coachingId as the table row key when one application has multiple coachings', async () => {
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope !== 'managed') {
        return { rows: [] }
      }
      return {
        rows: [
          {
            applicationId: 7701,
            coachingId: 9701,
            studentId: 3701,
            studentName: 'Multi Stage Student',
            companyName: 'Goldman Sachs',
            positionName: 'Summer Analyst',
            currentStage: 'First Round',
            interviewTime: '2026-03-26T09:30:00Z',
            coachingStatus: 'pending',
          },
          {
            applicationId: 7701,
            coachingId: 9702,
            studentId: 3701,
            studentName: 'Multi Stage Student',
            companyName: 'Goldman Sachs',
            positionName: 'Summer Analyst',
            currentStage: 'Final Round',
            interviewTime: '2026-04-02T09:30:00Z',
            coachingStatus: 'pending',
          },
        ],
      }
    })

    const page = await mountJobOverviewPage()

    try {
      const managedPanel = page.container.querySelector<HTMLElement>('#lm-job-content-managed')
      expect(managedPanel?.querySelector('[data-row-key="9701"]')?.textContent).toContain('First Round')
      expect(managedPanel?.querySelector('[data-row-key="9702"]')?.textContent).toContain('Final Round')
      expect(managedPanel?.querySelectorAll('[data-row-key="7701"]').length).toBe(0)
    } finally {
      page.unmount()
    }
  })

  it('opens class record detail by coachingId instead of applicationId', async () => {
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope !== 'managed') {
        return { rows: [] }
      }
      return {
        rows: [
          {
            applicationId: 7701,
            coachingId: 9702,
            studentId: 3701,
            studentName: 'Multi Stage Student',
            companyName: 'Goldman Sachs',
            positionName: 'Summer Analyst',
            currentStage: 'Final Round',
            interviewTime: '2026-04-02T09:30:00Z',
            coachingStatus: 'pending',
          },
        ],
      }
    })
    apiMocks.getLeadMentorJobOverviewCoachingDetail.mockResolvedValue({
      applicationId: 7701,
      coachingId: 9702,
      studentId: 3701,
      companyName: 'Goldman Sachs',
      positionName: 'Summer Analyst',
      currentStage: 'Final Round',
      classRecordsByMentor: [],
    })

    const page = await mountJobOverviewPage()

    try {
      const row = await waitFor(
        () => page.container.querySelector<HTMLElement>('#lm-job-content-managed [data-row-key="9702"]'),
        'managed coaching row',
      )
      findButtonByText(row, '查看详情')?.click()
      await waitFor(
        () => apiMocks.getLeadMentorJobOverviewCoachingDetail.mock.calls.length > 0,
        'coaching detail request',
      )

      expect(apiMocks.getLeadMentorJobOverviewCoachingDetail).toHaveBeenCalledWith(9702)
      expect(apiMocks.getLeadMentorJobOverviewDetail).not.toHaveBeenCalledWith(7701)
    } finally {
      page.unmount()
    }
  })

  it('renders the shared InterviewCalendar with events returned from the calendar endpoint', async () => {
    apiMocks.getLeadMentorJobOverviewCalendar.mockResolvedValueOnce([
      {
        id: 9001,
        studentName: 'Alice',
        company: 'Goldman Sachs',
        position: 'Summer Analyst',
        location: 'Hong Kong',
        interviewTime: '2099-12-24 10:00:00',
        interviewStage: 'First Round',
        coachingStatus: 'coaching',
      },
    ])

    const page = await mountJobOverviewPage()

    try {
      expect(apiMocks.getLeadMentorJobOverviewCalendar).toHaveBeenCalled()
      expect(page.container.querySelector('.osg-ic__toolbar')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
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

vi.mock('ant-design-vue', () => ({
  message: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
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
      expect(page.container.textContent).toContain('学员面试安排')
      expect(page.container.textContent).toContain('27日')
      expect(page.container.textContent).toContain('张三 GS')
      expect(page.container.querySelector<HTMLInputElement>('input.form-input')?.placeholder).toBe('搜索学员姓名...')
      expect(page.container.textContent).toContain('全部类型')
      expect(page.container.textContent).toContain('全部公司')
      expect(page.container.textContent).toContain('全部状态')
      expect(page.container.textContent).toContain('待分配导师')
      expect(page.container.textContent).toContain('我辅导的学员')
      expect(page.container.textContent).toContain('我管理的学员')
      expect(page.container.textContent).toContain('分配导师')
      expect(page.container.textContent).toContain('查看详情')
      expect(page.container.textContent).toContain('已确认')
      expect(page.container.querySelector('#lm-toggle-view-btn')).toBeTruthy()
      expect(page.container.querySelector('#lm-job-tab-pending')).toBeTruthy()
      expect(page.container.querySelector('#lm-job-tab-coaching')).toBeTruthy()
      expect(page.container.querySelector('#lm-job-tab-managed')).toBeTruthy()
      expect(page.container.querySelectorAll('.table').length).toBeGreaterThanOrEqual(3)
    } finally {
      page.unmount()
    }
  })

  it('switches the compact calendar and tabs while preserving the job overview nav highlight', async () => {
    const page = await mountJobOverviewPage()

    try {
      const toggleButton = page.container.querySelector<HTMLButtonElement>('#lm-toggle-view-btn')
      const monthView = page.container.querySelector<HTMLElement>('#lm-month-view-expanded')
      const pendingButton = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')
      const coachingButton = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-coaching')
      const managedButton = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-managed')
      const pendingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-pending')
      const coachingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-coaching')
      const managedPanel = page.container.querySelector<HTMLElement>('#lm-job-content-managed')
      const overviewNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('学员求职总览 Job Overview'),
      )

      expect(toggleButton).toBeTruthy()
      expect(monthView).toBeTruthy()
      expect(pendingButton).toBeTruthy()
      expect(coachingButton).toBeTruthy()
      expect(managedButton).toBeTruthy()
      expect(pendingPanel?.style.display).toBe('none')
      expect(coachingPanel?.style.display).not.toBe('none')
      expect(managedPanel?.style.display).toBe('none')
      expect(monthView?.style.display).toBe('none')
      expect(overviewNav?.classList.contains('active')).toBe(true)

      toggleButton?.click()
      await flushUi()

      expect(monthView?.style.display).toBe('block')
      expect(toggleButton?.textContent).toContain('收起')

      pendingButton?.click()
      await flushUi()

      expect(pendingPanel?.style.display).toBe('block')
      expect(coachingPanel?.style.display).toBe('none')
      expect(managedPanel?.style.display).toBe('none')

      managedButton?.click()
      await flushUi()

      expect(pendingPanel?.style.display).toBe('none')
      expect(coachingPanel?.style.display).toBe('none')
      expect(managedPanel?.style.display).toBe('block')
      expect(overviewNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })
})

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

const modalPath = path.resolve(__dirname, '../components/AssignMentorModal.vue')
const modalExists = fs.existsSync(modalPath)
const pagePath = path.resolve(__dirname, '../views/career/job-overview/index.vue')
const pageExists = fs.existsSync(pagePath)

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

async function loadAssignMentorModal() {
  expect(modalExists).toBe(true)
  const moduleUrl = pathToFileURL(modalPath).href
  return (await import(/* @vite-ignore */ moduleUrl))
}

async function loadJobOverviewPage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountModal() {
  const { default: AssignMentorModal } = await loadAssignMentorModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(AssignMentorModal, {
    modelValue: true,
    preview: {
      studentName: '张三',
      studentId: '12766',
      companyName: 'Goldman Sachs',
      positionName: 'IB Analyst · Hong Kong',
      interviewStage: 'First Round',
      interviewTime: '2024-01-15 14:00',
      mentorDemand: '2 位',
      preferredMentor: 'Jerry Li',
      excludedMentor: '-',
    },
  })

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

async function mountJobOverviewPage() {
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

  await router.push('/career/job-overview')
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

describe('lead-mentor assign mentor modal contract', () => {
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
              feedbackSummary: '拆分 case study 讲解后通过率提升',
              leadMentorName: 'Jess',
              submittedAt: '2026-03-22T11:00:00Z',
            },
          ],
        }
      }
      return { rows: [] }
    })
    apiMocks.getLeadMentorJobOverviewDetail.mockResolvedValue({
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
      submittedAt: '2026-03-22T11:00:00Z',
    })
  })

  it('renders the assign mentor modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-assign-mentor"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('为学员匹配辅导导师')
      expect(root?.textContent).toContain('张三')
      expect(root?.textContent).toContain('12766')
      expect(root?.textContent).toContain('Goldman Sachs')
      expect(root?.textContent).toContain('IB Analyst · Hong Kong')
      expect(root?.textContent).toContain('First Round')
      expect(root?.textContent).toContain('2024-01-15 14:00')
      expect(root?.textContent).toContain('2 位')
      expect(root?.textContent).toContain('Jerry Li')
      expect(root?.textContent).toContain('筛选导师')
      expect(root?.textContent).toContain('选择导师')
      expect(root?.textContent).toContain('Mike Wang')
      expect(root?.textContent).toContain('Sarah Chen')
      expect(root?.textContent).toContain('Tom Zhang')
      expect(root?.textContent).toContain('备注')
      expect(root?.textContent).toContain('取消')
      expect(root?.textContent).toContain('确认匹配')
      expect(root?.querySelector('.mdi-account-star')).toBeTruthy()
      expect(root?.querySelector('.mdi-information')).toBeTruthy()
      expect(root?.querySelector('.mdi-check')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the assign mentor modal from both pending actions and the job detail mentor-change action', async () => {
    const page = await mountJobOverviewPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-assign-mentor"]')).toBeNull()

      const pendingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-pending')
      expect(pendingTab).toBeTruthy()

      pendingTab?.click()
      await flushUi()

      const pendingPanel = page.container.querySelector<HTMLElement>('#lm-job-content-pending')
      expect(pendingPanel?.style.display).toBe('block')

      const pendingAssignButton = Array.from(pendingPanel?.querySelectorAll<HTMLButtonElement>('button') || []).find(
        (button) => button.textContent?.includes('分配导师'),
      )
      expect(pendingAssignButton).toBeTruthy()

      pendingAssignButton?.click()
      await flushUi()

      const firstModal = page.container.querySelector('[data-surface-id="modal-assign-mentor"]')
      expect(firstModal).toBeTruthy()
      expect(firstModal?.textContent).toContain('为学员匹配辅导导师')

      firstModal?.querySelector<HTMLButtonElement>('.modal-close')?.click()
      await flushUi()

      const coachingTab = page.container.querySelector<HTMLButtonElement>('#lm-job-tab-coaching')
      coachingTab?.click()
      await flushUi()

      const detailTrigger = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('查看详情'),
      )
      expect(detailTrigger).toBeTruthy()

      detailTrigger?.click()
      await flushUi()

      const detailModal = page.container.querySelector('[data-surface-id="modal-job-detail"]')
      expect(detailModal).toBeTruthy()

      const mentorChangeButton = Array.from(detailModal?.querySelectorAll<HTMLButtonElement>('button') || []).find((button) =>
        button.textContent?.includes('更换导师'),
      )
      expect(mentorChangeButton).toBeTruthy()

      mentorChangeButton?.click()
      await flushUi()

      expect(page.container.querySelector('[data-surface-id="modal-job-detail"]')).toBeNull()

      const secondModal = page.container.querySelector('[data-surface-id="modal-assign-mentor"]')
      expect(secondModal).toBeTruthy()
      expect(secondModal?.textContent).toContain('为学员匹配辅导导师')
    } finally {
      page.unmount()
    }
  })
})

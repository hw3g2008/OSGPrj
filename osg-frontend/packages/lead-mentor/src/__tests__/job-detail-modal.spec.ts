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

const modalPath = path.resolve(__dirname, '../components/JobDetailModal.vue')
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

async function loadJobDetailModal() {
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
  const { default: JobDetailModal } = await loadJobDetailModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(JobDetailModal, {
    modelValue: true,
    preview: {
      studentName: '张三',
      studentId: '12766',
      leadMentorName: 'Jess',
      companyName: 'Goldman Sachs',
      positionName: 'IB Analyst · Hong Kong',
      recruitmentCycle: '2025 Summer',
      interviewTime: '01/18 10:00',
      countdownText: '还剩2天',
      coachingStatus: '辅导中',
      mentorName: 'Jerry Li',
      lessonHours: '8h',
      applyTime: '01/08',
      notes: 'HireVue已通过，准备First Round。学员英语口语较好，行为面试需要加强。',
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

describe('lead-mentor job detail modal contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string }) => {
      if (params.scope === 'pending') {
        return { rows: [] }
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

  it('renders the job detail modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-job-detail"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('学员求职详情')
      expect(root?.textContent).toContain('张三')
      expect(root?.textContent).toContain('12766')
      expect(root?.textContent).toContain('Jess')
      expect(root?.textContent).toContain('Goldman Sachs')
      expect(root?.textContent).toContain('IB Analyst · Hong Kong')
      expect(root?.textContent).toContain('2025 Summer')
      expect(root?.textContent).toContain('求职进度')
      expect(root?.textContent).toContain('First Round')
      expect(root?.textContent).toContain('还剩2天')
      expect(root?.textContent).toContain('辅导中')
      expect(root?.textContent).toContain('Jerry Li')
      expect(root?.textContent).toContain('8h')
      expect(root?.textContent).toContain('查看全部')
      expect(root?.textContent).toContain('关闭')
      expect(root?.textContent).toContain('更换导师')
      expect(root?.textContent).toContain('学员备注')
      expect(root?.querySelector('.mdi-briefcase-search')).toBeTruthy()
      expect(root?.querySelector('.mdi-account')).toBeTruthy()
      expect(root?.querySelector('.mdi-domain')).toBeTruthy()
      expect(root?.querySelector('.mdi-timeline-clock')).toBeTruthy()
      expect(root?.querySelector('.mdi-calendar-clock')).toBeTruthy()
      expect(root?.querySelector('.mdi-school')).toBeTruthy()
      expect(root?.querySelector('.mdi-book-open-variant')).toBeTruthy()
      expect(root?.querySelector('.mdi-arrow-right')).toBeTruthy()
      expect(root?.querySelector('.mdi-note-text')).toBeTruthy()
      expect(root?.querySelector('.mdi-account-switch')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the job detail modal from the job overview page and closes it again', async () => {
    const page = await mountJobOverviewPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-job-detail"]')).toBeNull()

      const detailTrigger = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('查看详情'),
      )
      expect(detailTrigger).toBeTruthy()

      detailTrigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-job-detail"]')
      const closeButton = modal?.querySelector<HTMLButtonElement>('.modal-close')

      expect(modal).toBeTruthy()
      expect(modal?.textContent).toContain('学员求职详情')

      closeButton?.click()
      await flushUi()

      expect(page.container.querySelector('[data-surface-id="modal-job-detail"]')).toBeNull()
    } finally {
      page.unmount()
    }
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)
const pagePath = path.resolve(__dirname, '../views/career/mock-practice/index.vue')
const pageExists = fs.existsSync(pagePath)

const apiMocks = vi.hoisted(() => {
  const stats = {
    pendingCount: 1,
    scheduledCount: 1,
    completedCount: 1,
    cancelledCount: 0,
    totalCount: 3,
  }
  const pendingRows = [
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
  ]
  const coachingRows = [
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
      completedHours: 2,
      completedHoursLabel: '2h',
      feedbackSummary: '表现稳定，框架清晰',
      feedbackRating: 4,
      submittedAt: '2026-03-20T09:00:00Z',
    },
  ]
  const managedRows = [
    ...pendingRows,
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
  ]
  const assignDetail = {
    ...pendingRows[0],
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
  const feedbackDetail = {
    ...coachingRows[1],
    mentorBackgrounds: 'Goldman Sachs IBD · 5年',
    feedbackSummary: '表现稳定，框架清晰',
    feedbackRating: 4,
    completedHours: 2,
    completedHoursLabel: '2h',
  }

  return {
    getLeadMentorMockPracticeStats: vi.fn().mockResolvedValue(stats),
    getLeadMentorMockPracticeList: vi.fn().mockImplementation(async ({ scope }: { scope: string }) => {
      if (scope === 'pending') {
        return { rows: pendingRows }
      }
      if (scope === 'coaching') {
        return { rows: coachingRows }
      }
      return { rows: managedRows }
    }),
    getLeadMentorMockPracticeDetail: vi.fn().mockImplementation(async (practiceId: number) => (
      practiceId === 9001 ? assignDetail : feedbackDetail
    )),
    assignLeadMentorMockPractice: vi.fn(),
    acknowledgeLeadMentorMockPractice: vi.fn(),
  }
})

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
    success: vi.fn(),
  },
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function loadMockPracticePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountMockPracticePage(initialPath = '/career/mock-practice') {
  const MockPracticePage = await loadMockPracticePage()
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
    router,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('lead-mentor mock practice shell contract', () => {
  it('registers the /career/mock-practice route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'career/mock-practice'")
    expect(routerSource).toContain("name: 'CareerMockPractice'")
    expect(pageExists).toBe(true)
  })

  it('restores the mock practice shell with stats cards, filters, and scope tabs', async () => {
    const page = await mountMockPracticePage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/career/mock-practice')
      expect(page.container.querySelector('#page-mock-practice')).toBeTruthy()
      expect(page.container.textContent).toContain('模拟应聘管理')
      expect(page.container.textContent).toContain('Mock Practice')
      expect(page.container.textContent).toContain('处理学员的模拟面试、人际关系测试、期中考试申请')
      expect(page.container.textContent).toContain('待处理')
      expect(page.container.textContent).toContain('已安排')
      expect(page.container.textContent).toContain('已完成')
      expect(page.container.textContent).toContain('已取消')
      expect(page.container.querySelector('#mock-tab-pending')).toBeTruthy()
      expect(page.container.querySelector('#mock-tab-mycoaching')).toBeTruthy()
      expect(page.container.querySelector('#mock-tab-mymanage')).toBeTruthy()
      expect(page.container.textContent).toContain('待分配导师')
      expect(page.container.textContent).toContain('我辅导的学员')
      expect(page.container.textContent).toContain('我管理的学员')
      expect(page.container.textContent).toContain('筛选')
      expect(page.container.textContent).toContain('重置')
      expect(page.container.textContent).toContain('分配导师')
      expect(page.container.textContent).toContain('确认')
      expect(page.container.querySelectorAll('.table').length).toBeGreaterThanOrEqual(3)
      const inputs = page.container.querySelectorAll<HTMLInputElement>('input')
      expect(inputs).toHaveLength(4)
      expect(inputs[0]?.placeholder).toBe('搜索学员姓名/ID')
      expect(inputs[1]?.placeholder).toBe('搜索学员姓名/ID')
      expect(inputs[2]?.placeholder).toBe('搜索学员姓名/ID')
      expect(inputs[3]?.placeholder).toBe('搜索导师姓名')
    } finally {
      page.unmount()
    }
  })

  it('switches mock practice tabs while preserving the navigation highlight', async () => {
    const page = await mountMockPracticePage()

    try {
      const pendingButton = page.container.querySelector<HTMLButtonElement>('#mock-tab-pending')
      const coachingButton = page.container.querySelector<HTMLButtonElement>('#mock-tab-mycoaching')
      const managedButton = page.container.querySelector<HTMLButtonElement>('#mock-tab-mymanage')
      const pendingPanel = page.container.querySelector<HTMLElement>('#mock-content-pending')
      const coachingPanel = page.container.querySelector<HTMLElement>('#mock-content-mycoaching')
      const managedPanel = page.container.querySelector<HTMLElement>('#mock-content-mymanage')
      const mockPracticeNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('模拟应聘管理 Mock Practice'),
      )

      expect(pendingButton).toBeTruthy()
      expect(coachingButton).toBeTruthy()
      expect(managedButton).toBeTruthy()
      expect(pendingPanel?.style.display).toBe('none')
      expect(coachingPanel?.style.display).not.toBe('none')
      expect(managedPanel?.style.display).toBe('none')
      expect(mockPracticeNav?.classList.contains('active')).toBe(true)

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
      expect(mockPracticeNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })
})

import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from 'ant-design-vue'

import MainLayout from '../layouts/MainLayout.vue'

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Amy',
    userName: 'amy_asst',
    roles: ['assistant'],
  })),
  clearAuth: vi.fn(),
}))

import { clearAuth } from '@osg/shared/utils'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: { template: '<div>login</div>' } },
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'home', name: 'Home', component: { template: '<div id="page-home">home</div>' } },
          {
            path: 'career/positions',
            name: 'CareerPositions',
            component: { template: '<div id="page-positions">positions</div>' },
          },
          {
            path: 'career/job-overview',
            name: 'CareerJobOverview',
            component: { template: '<div id="page-job-overview">job overview</div>' },
          },
          {
            path: 'career/mock-practice',
            name: 'CareerMockPractice',
            component: { template: '<div id="page-mock-practice">mock practice</div>' },
          },
          { path: 'students', name: 'Students', component: { template: '<div id="page-student-list">students</div>' } },
          {
            path: 'communication',
            name: 'Communication',
            component: { template: '<div id="page-communication">communication</div>' },
          },
          {
            path: 'class-records',
            name: 'ClassRecords',
            component: { template: '<div id="page-myclass">class records</div>' },
          },
          { path: 'settlement', name: 'Settlement', component: { template: '<div id="page-settlement">settlement</div>' } },
          { path: 'expense', name: 'Expense', component: { template: '<div id="page-expense">expense</div>' } },
          { path: 'files', name: 'Files', component: { template: '<div id="page-files">files</div>' } },
          {
            path: 'online-test-bank',
            name: 'OnlineTestBank',
            component: { template: '<div id="page-online-test-bank">online test bank</div>' },
          },
          {
            path: 'interview-bank',
            name: 'InterviewBank',
            component: { template: '<div id="page-interview-bank">interview bank</div>' },
          },
          { path: 'profile', name: 'Profile', component: { template: '<div id="page-profile">profile</div>' } },
          { path: 'schedule', name: 'Schedule', component: { template: '<div id="page-schedule">schedule</div>' } },
          { path: 'notice', name: 'Notice', component: { template: '<div id="page-notice">notice</div>' } },
          { path: 'faq', name: 'Faq', component: { template: '<div id="page-faq">faq</div>' } },
        ],
      },
    ],
  })
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountShell(initialPath = '/career/positions') {
  const router = createTestRouter()
  await router.push(initialPath)
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await flushUi()

  return {
    router,
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

function findByText(container: Element, selector: string, text: string) {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).find((element) =>
    element.textContent?.includes(text),
  )
}

describe('assistant main layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the complete IA groups, menu entries, and user card', async () => {
    const page = await mountShell()

    try {
      expect(page.container.querySelector('.sidebar-logo')?.textContent).toContain('OSG Assistant')
      // 本期 assistant 端仅 4 个 IA 分组：求职/学员/教学/个人
      // Finance/Resources 两组所有 item 均 hidden，filteredNavigationGroups 过滤后整组消失
      expect(page.container.querySelectorAll('.nav-section')).toHaveLength(4)
      expect(page.container.textContent).toContain('Career')
      expect(page.container.textContent).toContain('Students')
      expect(page.container.textContent).toContain('Teaching')
      expect(page.container.textContent).toContain('Profile')
      // Finance / Resources 本期不在范围，不应出现在 sidebar
      expect(page.container.textContent).not.toContain('Finance')
      expect(page.container.textContent).not.toContain('Resources')
      expect(page.container.textContent).toContain('Positions')
      expect(page.container.textContent).toContain('Job Overview')
      expect(page.container.textContent).toContain('Mock Practice')
      expect(page.container.textContent).toContain('Student List')
      expect(page.container.textContent).toContain('Class Records')
      expect(page.container.textContent).toContain('Schedule')
      expect(page.container.querySelector('.user-card')?.textContent).toContain('Amy')
      expect(page.container.querySelector('.user-card')?.textContent).toContain('Assistant')
    } finally {
      page.unmount()
    }
  })

  it('switches routes from the sidebar and keeps the active state after remount', async () => {
    const firstMount = await mountShell('/career/positions')

    try {
      // 本期范围内的 Teaching 组 Class Records 作为切换目标（Expense 所属 Finance 组已下线）
      const targetNav = findByText(firstMount.container, '.nav-item', 'Class Records')
      expect(targetNav).toBeTruthy()

      targetNav?.click()
      await flushUi()

      expect(firstMount.router.currentRoute.value.fullPath).toBe('/class-records')
      expect(firstMount.container.querySelector('.nav-item.active')?.textContent).toContain('Class Records')
    } finally {
      firstMount.unmount()
    }

    const secondMount = await mountShell('/class-records')

    try {
      expect(secondMount.router.currentRoute.value.fullPath).toBe('/class-records')
      expect(secondMount.container.querySelector('.nav-item.active')?.textContent).toContain('Class Records')
    } finally {
      secondMount.unmount()
    }
  })

  it('opens the user menu and clears auth when logout is confirmed', async () => {
    // Mock antd Modal.confirm: 立即触发 onOk，模拟用户点击“确定”
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => {
      options?.onOk?.()
      return {} as any
    })
    const page = await mountShell('/career/positions')

    try {
      const userCard = page.container.querySelector<HTMLElement>('.user-card')
      expect(userCard).toBeTruthy()

      userCard?.click()
      await flushUi()

      const logoutItem = findByText(page.container, '.user-menu-item', 'Logout')
      expect(logoutItem).toBeTruthy()

      logoutItem?.click()
      await flushUi()

      expect(clearAuth).toHaveBeenCalledTimes(1)
      expect(page.router.currentRoute.value.fullPath).toBe('/login')
    } finally {
      confirmSpy.mockRestore()
      page.unmount()
    }
  })
})

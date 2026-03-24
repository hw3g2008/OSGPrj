import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

async function mountShell(initialPath = '/home') {
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
      expect(page.container.querySelectorAll('.nav-section')).toHaveLength(6)
      expect(page.container.textContent).toContain('Career')
      expect(page.container.textContent).toContain('Students')
      expect(page.container.textContent).toContain('Teaching')
      expect(page.container.textContent).toContain('Finance')
      expect(page.container.textContent).toContain('Resources')
      expect(page.container.textContent).toContain('Profile')
      expect(page.container.textContent).toContain('Positions')
      expect(page.container.textContent).toContain('Job Overview')
      expect(page.container.textContent).toContain('Mock Practice')
      expect(page.container.textContent).toContain('Student List')
      expect(page.container.textContent).toContain('Communication')
      expect(page.container.textContent).toContain('Class Records')
      expect(page.container.textContent).toContain('Settlement')
      expect(page.container.textContent).toContain('Expense')
      expect(page.container.textContent).toContain('Files')
      expect(page.container.textContent).toContain('Online Test')
      expect(page.container.textContent).toContain('Interview Bank')
      expect(page.container.textContent).toContain('Schedule')
      expect(page.container.textContent).toContain('Notice')
      expect(page.container.textContent).toContain('FAQ')
      expect(page.container.querySelector('.user-card')?.textContent).toContain('Amy')
      expect(page.container.querySelector('.user-card')?.textContent).toContain('Assistant')
    } finally {
      page.unmount()
    }
  })

  it('switches routes from the sidebar and keeps the active state after remount', async () => {
    const firstMount = await mountShell('/home')

    try {
      const targetNav = findByText(firstMount.container, '.nav-item', 'Expense')
      expect(targetNav).toBeTruthy()

      targetNav?.click()
      await flushUi()

      expect(firstMount.router.currentRoute.value.fullPath).toBe('/expense')
      expect(firstMount.container.querySelector('.nav-item.active')?.textContent).toContain('Expense')
    } finally {
      firstMount.unmount()
    }

    const secondMount = await mountShell('/expense')

    try {
      expect(secondMount.router.currentRoute.value.fullPath).toBe('/expense')
      expect(secondMount.container.querySelector('.nav-item.active')?.textContent).toContain('Expense')
    } finally {
      secondMount.unmount()
    }
  })

  it('opens the user menu and clears auth when logout is confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const page = await mountShell('/home')

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

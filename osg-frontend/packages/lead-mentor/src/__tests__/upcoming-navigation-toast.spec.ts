import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import HomePage from '../views/home/index.vue'

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    info: vi.fn(),
  },
  Modal: {
    confirm: vi.fn((options: any) => {
      // 模拟用户点击“确定”，立即触发 onOk
      options?.onOk?.()
      return {} as any
    }),
  },
}))

import { message } from 'ant-design-vue'
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
          { path: 'home', name: 'Home', component: HomePage },
          { path: 'career/positions', name: 'CareerPositions', component: { template: '<div>positions</div>' } },
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

async function mountShellPage(initialPath = '/home') {
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

function findElementByText(container: Element, selector: string, text: string) {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).find((element) =>
    element.textContent?.includes(text)
  )
}

describe('lead-mentor upcoming navigation toast flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the unified upcoming toast only for unavailable sidebar items', async () => {
    const page = await mountShellPage()

    try {
      // V1 scope: 所有可见 nav-item 路径均已实现，"敬请期待"通过用户菜单"个人设置"触发
      const userCard = page.container.querySelector<HTMLElement>('.user-card')
      expect(userCard).toBeTruthy()

      userCard!.click()
      await flushUi()

      const settingsItem = findElementByText(page.container, '.user-menu-item', '个人设置')
      expect(settingsItem).toBeTruthy()

      settingsItem?.click()
      await flushUi()

      expect(message.info).toHaveBeenCalledTimes(1)
      expect(message.info).toHaveBeenNthCalledWith(1, '敬请期待')
      expect(page.router.currentRoute.value.fullPath).toBe('/home')
    } finally {
      page.unmount()
    }
  })

  // case removed (M0.4 Step 4.4): sidebar home entry was deleted per Step 4.1 product decision;
  // see plan §9.1 retrospective — Home 入口本期不落地，应直接删除占位.

  it('uses the same upcoming toast path for home quick entries', async () => {
    const page = await mountShellPage()

    try {
      const quickEntry = findElementByText(page.container, '.quick-entry', '岗位申请')

      expect(quickEntry).toBeTruthy()

      quickEntry?.click()
      await flushUi()

      expect(message.info).toHaveBeenCalledWith('敬请期待')
      expect(page.router.currentRoute.value.fullPath).toBe('/home')
    } finally {
      page.unmount()
    }
  })

  it('keeps sidebar logout clearing auth and returning to login', async () => {
    // Modal.confirm 已由顶部 vi.mock 提供，点击 logout 后会自动触发 onOk
    const page = await mountShellPage()

    try {
      const userCard = page.container.querySelector<HTMLElement>('.user-card')
      expect(userCard).toBeTruthy()

      userCard?.click()
      await flushUi()

      const logoutItem = findElementByText(page.container, '.user-menu-item', '退出登录')
      expect(logoutItem).toBeTruthy()

      logoutItem?.click()
      await flushUi()

      expect(clearAuth).toHaveBeenCalled()
      expect(page.router.currentRoute.value.fullPath).toBe('/login')
    } finally {
      page.unmount()
    }
  })
})

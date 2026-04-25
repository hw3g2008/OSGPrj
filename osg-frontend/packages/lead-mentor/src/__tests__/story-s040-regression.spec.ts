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

async function mountStoryPage(initialPath = '/home') {
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

describe('S-040 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the full sidebar visible while upcoming entries toast and stay on the current route', async () => {
    const page = await mountStoryPage()

    try {
      // V1 scope 内可见的 sidebar groups
      expect(page.container.querySelector('.sidebar-nav')?.textContent).toContain('求职中心 Career')
      expect(page.container.querySelector('.sidebar-nav')?.textContent).toContain('教学中心 Teaching')
      expect(page.container.querySelector('.sidebar-nav')?.textContent).toContain('个人中心 Profile')

      // "敬请期待" toast：用户菜单"个人设置" + home quick-entry
      const userCard = page.container.querySelector<HTMLElement>('.user-card')
      userCard!.click()
      await flushUi()

      const settingsItem = findElementByText(page.container, '.user-menu-item', '个人设置')
      settingsItem?.click()
      await flushUi()

      const quickEntry = findElementByText(page.container, '.quick-entry', '岗位申请')
      quickEntry?.click()
      await flushUi()

      expect(message.info).toHaveBeenCalledTimes(2)
      expect(message.info).toHaveBeenNthCalledWith(1, '敬请期待')
      expect(message.info).toHaveBeenNthCalledWith(2, '敬请期待')
      expect(page.router.currentRoute.value.fullPath).toBe('/home')
    } finally {
      page.unmount()
    }
  })

  it('keeps the route-highlight state after remount and still supports logout', async () => {
    // Modal.confirm 已由顶部 vi.mock 提供，点击 logout 后会自动触发 onOk
    const firstMount = await mountStoryPage()

    try {
      expect(firstMount.router.currentRoute.value.fullPath).toBe('/home')
      expect(firstMount.container.querySelector('.nav-item.active')?.textContent).toContain('首页 Home')
    } finally {
      firstMount.unmount()
    }

    const secondMount = await mountStoryPage('/home')

    try {
      expect(secondMount.router.currentRoute.value.fullPath).toBe('/home')
      expect(secondMount.container.querySelector('.nav-item.active')?.textContent).toContain('首页 Home')

      const userCard = secondMount.container.querySelector<HTMLElement>('.user-card')
      userCard?.click()
      await flushUi()

      const logoutItem = findElementByText(secondMount.container, '.user-menu-item', '退出登录')
      logoutItem?.click()
      await flushUi()

      expect(clearAuth).toHaveBeenCalled()
      expect(secondMount.router.currentRoute.value.fullPath).toBe('/login')
    } finally {
      secondMount.unmount()
    }
  })
})

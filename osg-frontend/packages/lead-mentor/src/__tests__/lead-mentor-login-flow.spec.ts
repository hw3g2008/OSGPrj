import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import LoginPage from '../views/login/index.vue'

vi.mock('@osg/shared/api', () => ({
  login: vi.fn(),
  getUserInfo: vi.fn(),
  leadMentorLogin: vi.fn(),
  getLeadMentorInfo: vi.fn(),
}))

vi.mock('@osg/shared/utils', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared/utils')>('@osg/shared/utils')
  return {
    ...actual,
    setToken: vi.fn(),
    setUser: vi.fn(),
    clearAuth: vi.fn(),
  }
})

vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { getLeadMentorInfo, leadMentorLogin } from '@osg/shared/api'
import { clearAuth, setToken, setUser } from '@osg/shared/utils'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/', name: 'Home', component: { template: '<div>home</div>' } },
      { path: '/dashboard', name: 'Dashboard', component: { template: '<div>dashboard</div>' } },
    ],
  })
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountLoginPage(initialPath = '/login') {
  const router = createTestRouter()
  await router.push(initialPath)
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await nextTick()

  return {
    router,
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
    setValue: async (selector: string, value: string) => {
      const element = container.querySelector(selector)
      if (!(element instanceof HTMLInputElement)) {
        throw new Error(`Missing input for selector: ${selector}`)
      }
      element.value = value
      element.dispatchEvent(new Event('input', { bubbles: true }))
      await nextTick()
    },
    click: async (selector: string) => {
      const element = container.querySelector(selector)
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element for selector: ${selector}`)
      }
      element.click()
      await nextTick()
    },
  }
}

describe('lead-mentor login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs in through lead-mentor APIs and redirects to redirect target', async () => {
    vi.mocked(leadMentorLogin).mockResolvedValue({ token: 'lead-token' })
    vi.mocked(getLeadMentorInfo).mockResolvedValue({
      user: {
        userId: 9,
        userName: 'leadmentor',
        nickName: 'Lead Mentor',
        status: 'active',
      },
      roles: ['lead-mentor'],
      permissions: [],
    })

    const page = await mountLoginPage('/login?redirect=/dashboard')

    try {
      await page.setValue('#login-username', ' leadmentor ')
      await page.setValue('#login-password', 'secret')
      await page.click('.login-btn')
      await flushUi()

      expect(leadMentorLogin).toHaveBeenCalledWith({
        username: 'leadmentor',
        password: 'secret',
      })
      expect(setToken).toHaveBeenCalledWith('lead-token')
      expect(getLeadMentorInfo).toHaveBeenCalled()
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({ userName: 'leadmentor' }),
      )
      expect(page.router.currentRoute.value.fullPath).toBe('/dashboard')
    } finally {
      page.unmount()
    }
  })

  it('rejects users without lead-mentor access and clears auth state', async () => {
    vi.mocked(leadMentorLogin).mockResolvedValue({ token: 'bad-token' })
    vi.mocked(getLeadMentorInfo).mockResolvedValue({
      user: {
        userId: 11,
        userName: 'mentor-only',
        nickName: 'Mentor Only',
        status: 'active',
      },
      roles: ['mentor'],
      permissions: [],
    })

    const page = await mountLoginPage()

    try {
      await page.setValue('#login-username', 'mentor-only')
      await page.setValue('#login-password', 'secret')
      await page.click('.login-btn')
      await flushUi()

      expect(clearAuth).toHaveBeenCalled()
      expect(page.container.querySelector('.login-error')?.textContent).toContain('无班主任端访问权限')
      expect(page.router.currentRoute.value.fullPath).toBe('/login')
    } finally {
      page.unmount()
    }
  })

  it('shows backend login failure inline without fake success state', async () => {
    vi.mocked(leadMentorLogin).mockRejectedValue(new Error('用户不存在/密码错误'))

    const page = await mountLoginPage()

    try {
      await page.setValue('#login-username', 'leadmentor')
      await page.setValue('#login-password', 'wrong-secret')
      await page.click('.login-btn')
      await flushUi()

      expect(setToken).not.toHaveBeenCalled()
      expect(page.container.querySelector('.login-error')?.textContent).toContain('用户不存在/密码错误')
    } finally {
      page.unmount()
    }
  })
})

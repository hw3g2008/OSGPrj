import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import LoginPage from '../views/login/index.vue'

vi.mock('@osg/shared/api', () => ({
  login: vi.fn(),
  getUserInfo: vi.fn(),
  leadMentorLogin: vi.fn(),
  getLeadMentorInfo: vi.fn(),
  sendResetCode: vi.fn(),
  verifyResetCode: vi.fn(),
  resetPassword: vi.fn(),
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

import {
  getLeadMentorInfo,
  leadMentorLogin,
  resetPassword,
  sendResetCode,
  verifyResetCode,
} from '@osg/shared/api'
import { clearAuth } from '@osg/shared/utils'

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
  await flushUi()

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
      await flushUi()
    },
    click: async (selector: string) => {
      const element = container.querySelector(selector)
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing element for selector: ${selector}`)
      }
      element.click()
      await flushUi()
    },
  }
}

describe('S-039 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('covers forgot-password success and relogin with the new password', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: '验证码已发送' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token-123' })
    vi.mocked(resetPassword).mockResolvedValue({ code: 200, msg: '密码重置成功' })
    vi.mocked(leadMentorLogin).mockResolvedValue({ token: 'lead-token' })
    vi.mocked(getLeadMentorInfo).mockResolvedValue({
      user: {
        userId: 9,
        userName: 'leadmentor',
        nickName: 'Lead Mentor',
        status: 'active',
        roles: ['lead_mentor'],
      },
      roles: ['lead-mentor'],
      permissions: [],
    })

    const page = await mountLoginPage('/login?redirect=/dashboard')

    try {
      expect(page.container.querySelector('#login-page')?.textContent).toContain('欢迎回来')

      await page.click('[data-surface-trigger="modal-forgot-password"]')
      await page.setValue('#fp-email', 'leadmentor@example.com')
      await page.click('#fp-send-code-btn')
      await page.setValue('#fp-code', '123456')
      await page.click('#fp-verify-code-btn')
      await page.setValue('#fp-new-pwd', 'LeadMentor123')
      await page.setValue('#fp-confirm-pwd', 'LeadMentor123')
      await page.click('#fp-reset-password-btn')

      expect(page.container.querySelector('#fp-step-4')?.textContent).toContain('密码重置成功')

      await page.click('.success-step .modal-action-btn')
      await page.setValue('#login-username', 'leadmentor')
      await page.setValue('#login-password', 'LeadMentor123')
      await page.click('.login-btn')

      expect(leadMentorLogin).toHaveBeenCalledWith({
        username: 'leadmentor',
        password: 'LeadMentor123',
      })
      expect(page.router.currentRoute.value.fullPath).toBe('/dashboard')
    } finally {
      page.unmount()
    }
  })

  it('covers unauthorized role boundary with explicit denial on login page', async () => {
    vi.mocked(leadMentorLogin).mockResolvedValue({ token: 'mentor-token' })
    vi.mocked(getLeadMentorInfo).mockResolvedValue({
      user: {
        userId: 10,
        userName: 'mentor-only',
        nickName: 'Mentor Only',
        status: 'active',
        roles: ['mentor'],
      },
      roles: ['mentor'],
      permissions: [],
    })

    const page = await mountLoginPage()

    try {
      await page.setValue('#login-username', 'mentor-only')
      await page.setValue('#login-password', 'secret123')
      await page.click('.login-btn')

      expect(clearAuth).toHaveBeenCalled()
      expect(page.container.querySelector('.login-error')?.textContent).toContain('无班主任端访问权限')
      expect(page.router.currentRoute.value.fullPath).toBe('/login')
    } finally {
      page.unmount()
    }
  })
})

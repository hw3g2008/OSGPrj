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
  resetPassword,
  sendResetCode,
  verifyResetCode,
} from '@osg/shared/api'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/', name: 'Home', component: { template: '<div>home</div>' } },
    ],
  })
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountLoginPage() {
  const router = createTestRouter()
  await router.push('/login')
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await nextTick()

  return {
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

describe('lead-mentor forgot password flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends reset code and moves from email step to code step', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: '验证码已发送' })

    const page = await mountLoginPage()

    try {
      await page.click('[data-surface-trigger="modal-forgot-password"]')
      await page.setValue('#fp-email', 'leadmentor@example.com')
      await page.click('#fp-send-code-btn')

      expect(sendResetCode).toHaveBeenCalledWith({ email: 'leadmentor@example.com' })
      expect(page.container.querySelector('#fp-step-2')?.textContent).toContain('验证码已发送至')
      expect(page.container.querySelector('#fp-masked-email')?.textContent).toContain('l***@example.com')
    } finally {
      page.unmount()
    }
  })

  it('verifies the code and advances to reset step with a real resetToken', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: '验证码已发送' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token-123' })

    const page = await mountLoginPage()

    try {
      await page.click('[data-surface-trigger="modal-forgot-password"]')
      await page.setValue('#fp-email', 'leadmentor@example.com')
      await page.click('#fp-send-code-btn')
      await page.setValue('#fp-code', '123456')
      await page.click('#fp-verify-code-btn')

      expect(verifyResetCode).toHaveBeenCalledWith({
        email: 'leadmentor@example.com',
        code: '123456',
      })
      expect(page.container.querySelector('#fp-step-3')?.textContent).toContain('请设置您的新密码')
    } finally {
      page.unmount()
    }
  })

  it('submits reset password with resetToken and shows success step', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: '验证码已发送' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token-123' })
    vi.mocked(resetPassword).mockResolvedValue({ code: 200, msg: '密码重置成功' })

    const page = await mountLoginPage()

    try {
      await page.click('[data-surface-trigger="modal-forgot-password"]')
      await page.setValue('#fp-email', 'leadmentor@example.com')
      await page.click('#fp-send-code-btn')
      await page.setValue('#fp-code', '123456')
      await page.click('#fp-verify-code-btn')
      await page.setValue('#fp-new-pwd', 'LeadMentor123')
      await page.setValue('#fp-confirm-pwd', 'LeadMentor123')
      await page.click('#fp-reset-password-btn')

      expect(resetPassword).toHaveBeenCalledWith({
        email: 'leadmentor@example.com',
        password: 'LeadMentor123',
        resetToken: 'reset-token-123',
      })
      expect(page.container.querySelector('#fp-step-4')?.textContent).toContain('密码重置成功')
    } finally {
      page.unmount()
    }
  })
})

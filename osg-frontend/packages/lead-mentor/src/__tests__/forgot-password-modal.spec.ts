import { createApp, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import ForgotPasswordModal from '../components/ForgotPasswordModal.vue'
import LoginPage from '../views/login/index.vue'

vi.mock('@osg/shared/api', () => ({
  login: vi.fn(),
  getUserInfo: vi.fn(),
}))

vi.mock('@osg/shared/utils', () => ({
  setToken: vi.fn(),
  setUser: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/', name: 'Home', component: { template: '<div>home</div>' } },
    ],
  })
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

async function mountModalStep(previewStep: 'step-email' | 'step-code' | 'step-reset' | 'step-success') {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp({
    render: () =>
      h(ForgotPasswordModal, {
        modelValue: true,
        previewStep,
        maskedEmail: 'a***@example.com',
      }),
  })

  app.mount(container)
  await nextTick()

  return {
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('LeadMentor forgot password modal shell', () => {
  it('opens modal surface and renders the email step shell from the login page', async () => {
    const page = await mountLoginPage()

    try {
      await page.click('[data-surface-trigger="modal-forgot-password"]')

      expect(page.container.querySelector('[data-surface-id="modal-forgot-password"]')).toBeTruthy()
      expect(page.container.querySelector('[data-surface-part="shell"]')).toBeTruthy()
      expect(page.container.querySelector('[data-surface-part="header"]')?.textContent).toContain('找回密码')
      expect(page.container.querySelector('#fp-step-1')).toBeTruthy()
      expect((page.container.querySelector('#fp-email') as HTMLInputElement | null)?.placeholder).toBe(
        '请输入注册邮箱',
      )
      expect(page.container.querySelector('#fp-step-2')).toBeTruthy()
      expect(page.container.querySelector('#fp-step-3')).toBeTruthy()
      expect(page.container.querySelector('#fp-step-4')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })

  it('renders all declared preview states with the expected shell copy', async () => {
    const cases = [
      {
        step: 'step-code' as const,
        selector: '#fp-step-2',
        expectedText: '验证码已发送至',
      },
      {
        step: 'step-reset' as const,
        selector: '#fp-step-3',
        expectedText: '请设置您的新密码',
      },
      {
        step: 'step-success' as const,
        selector: '#fp-step-4',
        expectedText: '密码重置成功',
      },
    ]

    for (const testCase of cases) {
      const modal = await mountModalStep(testCase.step)
      try {
        const shell = modal.container.querySelector('[data-surface-part="shell"]')
        const activeStep = modal.container.querySelector(testCase.selector)
        expect(shell).toBeTruthy()
        expect(activeStep).toBeTruthy()
        expect(activeStep?.textContent).toContain(testCase.expectedText)
      } finally {
        modal.unmount()
      }
    }
  })
})

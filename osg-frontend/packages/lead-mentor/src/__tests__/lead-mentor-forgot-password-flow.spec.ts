/**
 * LM login 页 forgot-password 集成契约测试
 *
 * M6 P5 后业务逻辑迁移至 shared <ForgotPasswordModal>（全量 12 case 已覆盖）。
 * 本 spec 仅验证 LM login.vue 正确集成 shared 组件 + endpoints 注入正确。
 */
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import Antd from 'ant-design-vue'

vi.mock('@osg/shared/api', () => ({
  leadMentorLogin: vi.fn(),
  getLeadMentorInfo: vi.fn(),
  sendResetCode: vi.fn().mockResolvedValue({ code: 200, msg: 'ok' }),
  verifyResetCode: vi.fn().mockResolvedValue({ resetToken: 'tok-1' }),
  resetPassword: vi.fn().mockResolvedValue({ code: 200, msg: 'ok' }),
}))

vi.mock('@osg/shared/utils', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared/utils')>(
    '@osg/shared/utils',
  )
  return { ...actual, setToken: vi.fn(), setUser: vi.fn(), clearAuth: vi.fn() }
})

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<any>('ant-design-vue')
  return { ...actual, message: { error: vi.fn(), success: vi.fn() } }
})

import LoginPage from '../views/login/index.vue'

let wrapper: VueWrapper<any> | null = null

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/', name: 'Home', component: { template: '<div>home</div>' } },
    ],
  })
}

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('LM login.vue × ForgotPasswordModal 集成契约', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. login template 渲染时引入 shared ForgotPasswordModal 组件', async () => {
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    wrapper = mount(LoginPage, {
      global: {
        plugins: [router, Antd],
      },
    })
    await flushPromises()

    // 触发链接（[data-surface-trigger="modal-forgot-password"]）必须存在
    expect(
      wrapper.find('[data-surface-trigger="modal-forgot-password"]').exists(),
    ).toBe(true)
  })

  it('2. login.vue 注入了 endpoints 且调用 LM 端 API（sendResetCode/verifyResetCode/resetPassword）', () => {
    // 静态分析：login.vue 源码必须 import LM 端 API + 构造 endpoints 对象
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../views/login/index.vue'),
      'utf-8',
    )
    expect(source).toContain('sendResetCode')
    expect(source).toContain('verifyResetCode')
    expect(source).toContain('resetLeadMentorPassword')
    expect(source).toContain('forgotPasswordEndpoints')
    expect(source).toContain(
      "import { ForgotPasswordModal } from '@osg/shared/components'",
    )
  })

  it('3. login.vue 不再保留本地 forgot-password 状态机（business logic 已迁移）', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../views/login/index.vue'),
      'utf-8',
    )
    // 旧本地实现的关键变量/函数已删
    expect(source).not.toMatch(/const forgotPasswordStep\s*=\s*ref/)
    expect(source).not.toMatch(/const forgotPasswordCountdown\s*=\s*ref/)
    expect(source).not.toMatch(/const forgotPasswordForm\s*=\s*reactive/)
    expect(source).not.toMatch(/handleSendResetCode/)
    expect(source).not.toMatch(/handleVerifyResetCode/)
    expect(source).not.toMatch(/handleResetPassword/)
  })

  it('4. login.vue 不再内嵌 modal HTML（不应有 forgot-password-modal/-shell/-backdrop 类）', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../views/login/index.vue'),
      'utf-8',
    )
    expect(source).not.toContain('class="forgot-password-modal"')
    expect(source).not.toContain('class="forgot-password-shell"')
    expect(source).not.toContain('class="forgot-password-backdrop"')
  })
})

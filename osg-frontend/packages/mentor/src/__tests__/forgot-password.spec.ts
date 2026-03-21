import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ForgotPasswordPage from '@/views/forgot-password/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    post: vi.fn()
  }
}))

import { http } from '@osg/shared/utils/request'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordPage },
      { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }
    ]
  })
}

async function mountForgotPassword() {
  const router = createTestRouter()
  await router.push('/forgot-password')
  return mount(ForgotPasswordPage, {
    global: { plugins: [router] }
  })
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses resetToken returned by verify-code when resetting password', async () => {
    const mockPost = vi.mocked(http.post)
    mockPost
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ resetToken: 'reset-token-123' })
      .mockResolvedValueOnce(undefined)

    const wrapper = await mountForgotPassword()

    await wrapper.get('input[placeholder="请输入注册邮箱"]').setValue('hw3g2008@outlook.com')
    await wrapper.get('.fp-btn').trigger('click')
    await nextTick()

    await wrapper.get('input[placeholder="请输入6位验证码"]').setValue('332020')
    await wrapper.get('.fp-btn').trigger('click')
    await nextTick()

    await wrapper.get('input[placeholder="请输入新密码"]').setValue('admin12345')
    await wrapper.get('input[placeholder="请再次输入新密码"]').setValue('admin12345')
    await wrapper.get('.fp-btn').trigger('click')

    expect(mockPost).toHaveBeenNthCalledWith(1, '/mentor/forgot-password/send-code', {
      email: 'hw3g2008@outlook.com'
    }, {
      skipErrorMessage: true,
      skipAuthRedirect: true
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/mentor/forgot-password/verify-code', {
      email: 'hw3g2008@outlook.com',
      code: '332020'
    }, {
      skipErrorMessage: true,
      skipAuthRedirect: true
    })
    expect(mockPost).toHaveBeenNthCalledWith(3, '/mentor/forgot-password/reset', {
      email: 'hw3g2008@outlook.com',
      resetToken: 'reset-token-123',
      password: 'admin12345'
    }, {
      skipErrorMessage: true,
      skipAuthRedirect: true
    })
  })
})

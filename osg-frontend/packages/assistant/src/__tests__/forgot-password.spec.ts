import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@osg/shared/api', () => ({
  sendResetCode: vi.fn(),
  verifyResetCode: vi.fn(),
  resetPassword: vi.fn(),
}))

import ForgotPasswordPage from '@/views/forgot-password/index.vue'
import {
  getForgotPasswordResendMeta,
  getForgotPasswordStepDescription,
  getPasswordStrengthMeta,
  maskForgotPasswordEmail,
  validateForgotPasswordCode,
  validateForgotPasswordConfirmation,
  validateForgotPasswordPassword,
} from '@/views/forgot-password/forgot-password-workflow'
import { resetPassword, sendResetCode, verifyResetCode } from '@osg/shared/api'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordPage },
      { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
    ],
  })
}

async function mountForgotPassword() {
  const router = createTestRouter()
  await router.push('/forgot-password')
  await router.isReady()

  const wrapper = mount(ForgotPasswordPage, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

async function flushPromises() {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('assistant forgot password workflow helpers', () => {
  it('masks email and exposes step copy', () => {
    expect(maskForgotPasswordEmail('assistant@example.com')).toBe('a***@example.com')
    expect(getForgotPasswordStepDescription(1)).toBe('请输入您注册时使用的邮箱，我们将发送验证码')
    expect(getForgotPasswordStepDescription(2)).toBe('请输入验证码')
    expect(getForgotPasswordStepDescription(3)).toBe('请设置新密码')
    expect(getForgotPasswordStepDescription(4)).toBe('')
  })

  it('keeps resend disabled while countdown is active', () => {
    expect(getForgotPasswordResendMeta(60)).toEqual({
      disabled: true,
      label: '60s',
    })
    expect(getForgotPasswordResendMeta(0)).toEqual({
      disabled: false,
      label: '重新发送',
    })
  })

  it('matches the password rules shared by the reset endpoints', () => {
    expect(getPasswordStrengthMeta('')).toEqual({
      className: '',
      text: '密码强度',
    })
    expect(validateForgotPasswordCode('12345')).toBe('请输入 6 位验证码')
    expect(validateForgotPasswordCode('123456')).toBe('')
    expect(validateForgotPasswordConfirmation('Abcd1234', 'Mismatch123')).toBe('两次输入的密码不一致')
    expect(validateForgotPasswordConfirmation('Abcd1234', 'Abcd1234')).toBe('')
    expect(validateForgotPasswordPassword('')).toBe('请输入新密码')
    expect(validateForgotPasswordPassword('12345678')).toBe('密码需包含字母')
    expect(validateForgotPasswordPassword('Password')).toBe('密码需包含数字')
    expect(validateForgotPasswordPassword('Abcd1234')).toBe('')
  })
})

describe('assistant forgot password page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an invalid email before calling sendResetCode', async () => {
    const { wrapper } = await mountForgotPassword()

    await wrapper.find('#forgot-email').setValue('invalid-email')
    await wrapper.find('#send-btn').trigger('submit')

    expect(wrapper.text()).toContain('请输入有效的邮箱地址')
    expect(sendResetCode).not.toHaveBeenCalled()
  })

  it('sends the code and advances to step 2', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: 'ok' })
    const { wrapper } = await mountForgotPassword()

    await wrapper.find('#forgot-email').setValue('assistant@example.com')
    await wrapper.find('#send-btn').trigger('submit')
    await flushPromises()

    expect(sendResetCode).toHaveBeenCalledWith({ email: 'assistant@example.com' })
    expect(wrapper.text()).toContain('验证码已发送至')
    expect(wrapper.text()).toContain('a***@example.com')
    expect(wrapper.find('#step-2').classes()).toContain('active')
  })

  it('blocks verification on short codes and advances when the backend accepts the code', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: 'ok' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token' })
    const { wrapper } = await mountForgotPassword()

    await wrapper.find('#forgot-email').setValue('assistant@example.com')
    await wrapper.find('#send-btn').trigger('submit')
    await flushPromises()

    await wrapper.find('#fp-code').setValue('12345')
    await wrapper.find('#verify-btn').trigger('submit')

    expect(wrapper.text()).toContain('请输入 6 位验证码')
    expect(verifyResetCode).not.toHaveBeenCalled()

    await wrapper.find('#fp-code').setValue('123456')
    await wrapper.find('#verify-btn').trigger('submit')
    await flushPromises()

    expect(verifyResetCode).toHaveBeenCalledWith({
      email: 'assistant@example.com',
      code: '123456',
    })
    expect(wrapper.find('#step-3').classes()).toContain('active')
  })

  it('rejects mismatched passwords and password-rule violations before reset', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: 'ok' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token' })
    const { wrapper } = await mountForgotPassword()

    await wrapper.find('#forgot-email').setValue('assistant@example.com')
    await wrapper.find('#send-btn').trigger('submit')
    await flushPromises()
    await wrapper.find('#fp-code').setValue('123456')
    await wrapper.find('#verify-btn').trigger('submit')
    await flushPromises()

    await wrapper.find('#new-password').setValue('Abcd1234')
    await wrapper.find('#confirm-password').setValue('Mismatch123')
    await wrapper.find('#reset-btn').trigger('submit')
    expect(wrapper.text()).toContain('两次输入的密码不一致')
    expect(resetPassword).not.toHaveBeenCalled()

    await wrapper.find('#confirm-password').setValue('12345678')
    await wrapper.find('#new-password').setValue('12345678')
    await wrapper.find('#reset-btn').trigger('submit')
    expect(wrapper.text()).toContain('密码需包含字母')
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('resets the password and shows the success state', async () => {
    vi.mocked(sendResetCode).mockResolvedValue({ code: 200, msg: 'ok' })
    vi.mocked(verifyResetCode).mockResolvedValue({ resetToken: 'reset-token' })
    vi.mocked(resetPassword).mockResolvedValue({ code: 200, msg: '密码重置成功' })
    const { wrapper } = await mountForgotPassword()

    await wrapper.find('#forgot-email').setValue('assistant@example.com')
    await wrapper.find('#send-btn').trigger('submit')
    await flushPromises()
    await wrapper.find('#fp-code').setValue('123456')
    await wrapper.find('#verify-btn').trigger('submit')
    await flushPromises()
    await wrapper.find('#new-password').setValue('Abcd1234')
    await wrapper.find('#confirm-password').setValue('Abcd1234')
    await wrapper.find('#reset-btn').trigger('submit')
    await flushPromises()

    expect(resetPassword).toHaveBeenCalledWith({
      email: 'assistant@example.com',
      password: 'Abcd1234',
      resetToken: 'reset-token',
    })
    expect(wrapper.find('#step-4').classes()).toContain('active')
    expect(wrapper.text()).toContain('密码重置成功')
  })
})

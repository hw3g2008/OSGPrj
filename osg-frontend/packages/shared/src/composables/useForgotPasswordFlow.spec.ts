/**
 * useForgotPasswordFlow composable unit tests
 *
 * 测试 4 步状态机 + endpoints 注入 + 倒计时 + 表单校验
 */
import { defineComponent, h } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useForgotPasswordFlow } from './useForgotPasswordFlow'

let wrapper: VueWrapper | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
  vi.clearAllTimers()
  vi.useRealTimers()
})

/**
 * 用 defineComponent + setup 容器挂载 composable，
 * 通过 wrapper.vm 暴露 flow API
 */
function mountFlow(options: Parameters<typeof useForgotPasswordFlow>[0]) {
  let exposedFlow: ReturnType<typeof useForgotPasswordFlow> | null = null
  const Wrapper = defineComponent({
    setup() {
      exposedFlow = useForgotPasswordFlow(options)
      return () => h('div')
    },
  })
  wrapper = mount(Wrapper)
  return exposedFlow as unknown as ReturnType<typeof useForgotPasswordFlow>
}

describe('useForgotPasswordFlow', () => {
  describe('initial state', () => {
    it('1. 默认 currentStep=1', () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      expect(flow.currentStep.value).toBe(1)
    })

    it('2. 默认 countdown=60（默认 countdownSeconds）', () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      expect(flow.countdown.value).toBe(60)
    })

    it('3. countdownSeconds 自定义生效', () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
        countdownSeconds: 30,
      })
      expect(flow.countdown.value).toBe(30)
    })

    it('4. forms 初始为空', () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      expect(flow.step1Form.email).toBe('')
      expect(flow.step2Form.code).toBe('')
      expect(flow.step3Form.newPassword).toBe('')
      expect(flow.step3Form.confirmPassword).toBe('')
    })

    it('5. resendMeta 初始 disabled=true（countdown=60）', () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      expect(flow.resendMeta.value.disabled).toBe(true)
      expect(flow.resendMeta.value.label).toBe('60s')
    })
  })

  describe('handleSendCode', () => {
    it('6. 邮箱无效 → emailError 设置，不调用 endpoint', async () => {
      const sendCode = vi.fn()
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'invalid'
      await flow.handleSendCode()
      expect(flow.emailError.value).toBe('请输入有效的邮箱地址')
      expect(sendCode).not.toHaveBeenCalled()
    })

    it('7. 邮箱有效 → 调 endpoint 并切到 step 2', async () => {
      const sendCode = vi.fn().mockResolvedValue(undefined)
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = '  alice@osg.local  '
      await flow.handleSendCode()
      expect(sendCode).toHaveBeenCalledWith({ email: 'alice@osg.local' })
      expect(flow.currentStep.value).toBe(2)
      expect(flow.successMessage.value).toContain('验证码')
    })

    it('8. endpoint 抛错 → errorMessage 设置，currentStep 保持 1', async () => {
      const sendCode = vi.fn().mockRejectedValue(new Error('network down'))
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      await flow.handleSendCode()
      expect(flow.errorMessage.value).toBe('network down')
      expect(flow.currentStep.value).toBe(1)
    })

    it('9. sendingCode loading 切换', async () => {
      let resolver: (() => void) | null = null
      const sendCode = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolver = resolve
          }),
      )
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      const promise = flow.handleSendCode()
      expect(flow.sendingCode.value).toBe(true)
      resolver!()
      await promise
      expect(flow.sendingCode.value).toBe(false)
    })
  })

  describe('handleVerifyCode', () => {
    it('10. code 不足 6 位 → codeError，不调 endpoint', async () => {
      const verifyCode = vi.fn()
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode,
          resetPassword: vi.fn(),
        },
      })
      flow.step2Form.code = '123'
      await flow.handleVerifyCode()
      expect(flow.codeError.value).toBe('请输入 6 位验证码')
      expect(verifyCode).not.toHaveBeenCalled()
    })

    it('11. 验证成功 → resetToken 保存 + 切到 step 3', async () => {
      const verifyCode = vi
        .fn()
        .mockResolvedValue({ resetToken: 'token-xyz' })
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode,
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      flow.step2Form.code = '654321'
      await flow.handleVerifyCode()
      expect(verifyCode).toHaveBeenCalledWith({
        email: 'alice@osg.local',
        code: '654321',
      })
      expect(flow.resetToken.value).toBe('token-xyz')
      expect(flow.currentStep.value).toBe(3)
    })

    it('12. 验证失败 → errorMessage，step 保持 2', async () => {
      const verifyCode = vi.fn().mockRejectedValue(new Error('bad code'))
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode,
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      flow.step2Form.code = '654321'
      flow.currentStep.value = 2
      await flow.handleVerifyCode()
      expect(flow.errorMessage.value).toBe('bad code')
      expect(flow.currentStep.value).toBe(2)
    })
  })

  describe('handleResetPassword', () => {
    it('13. 密码不一致 → confirmError，不调 endpoint', async () => {
      const resetPassword = vi.fn()
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword,
        },
      })
      flow.step3Form.newPassword = 'abc12345'
      flow.step3Form.confirmPassword = 'xyz98765'
      await flow.handleResetPassword()
      expect(flow.confirmError.value).toBe('两次输入的密码不一致')
      expect(resetPassword).not.toHaveBeenCalled()
    })

    it('14. 密码格式不合法 → errorMessage，不调 endpoint', async () => {
      const resetPassword = vi.fn()
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword,
        },
      })
      flow.step3Form.newPassword = 'abcdefgh' // 无数字
      flow.step3Form.confirmPassword = 'abcdefgh'
      await flow.handleResetPassword()
      expect(flow.errorMessage.value).toBe('密码需包含数字')
      expect(resetPassword).not.toHaveBeenCalled()
    })

    it('15. 重置成功 → 切到 step 4', async () => {
      const resetPassword = vi.fn().mockResolvedValue(undefined)
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword,
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      flow.step3Form.newPassword = 'abc12345'
      flow.step3Form.confirmPassword = 'abc12345'
      flow.resetToken.value = 'tok-1'
      await flow.handleResetPassword()
      expect(resetPassword).toHaveBeenCalledWith({
        email: 'alice@osg.local',
        password: 'abc12345',
        resetToken: 'tok-1',
      })
      expect(flow.currentStep.value).toBe(4)
    })

    it('16. 重置失败 → errorMessage，step 保持 3', async () => {
      const resetPassword = vi
        .fn()
        .mockRejectedValue(new Error('token expired'))
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword,
        },
      })
      flow.step3Form.newPassword = 'abc12345'
      flow.step3Form.confirmPassword = 'abc12345'
      flow.currentStep.value = 3
      await flow.handleResetPassword()
      expect(flow.errorMessage.value).toBe('token expired')
      expect(flow.currentStep.value).toBe(3)
    })
  })

  describe('handleResendCode', () => {
    it('17. countdown>0 时禁用，不调 endpoint', async () => {
      const sendCode = vi.fn()
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      // 默认 countdown=60，处于禁用
      await flow.handleResendCode()
      expect(sendCode).not.toHaveBeenCalled()
    })

    it('18. countdown=0 + 邮箱有值 → 调 endpoint + 重启倒计时', async () => {
      const sendCode = vi.fn().mockResolvedValue(undefined)
      const flow = mountFlow({
        endpoints: {
          sendCode,
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.countdown.value = 0
      flow.step1Form.email = 'alice@osg.local'
      await flow.handleResendCode()
      expect(sendCode).toHaveBeenCalledWith({ email: 'alice@osg.local' })
      expect(flow.successMessage.value).toBe('验证码已重新发送')
      expect(flow.countdown.value).toBe(60)
    })
  })

  describe('countdown', () => {
    it('19. startCountdown 启动倒计时（fake timer 推进 3 秒）', async () => {
      vi.useFakeTimers()
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.countdown.value = 5
      flow.startCountdown()
      expect(flow.countdown.value).toBe(60) // startCountdown 重置为 countdownSeconds
      await vi.advanceTimersByTimeAsync(3000)
      expect(flow.countdown.value).toBe(57)
    })

    it('20. countdown 到 0 自动停止', async () => {
      vi.useFakeTimers()
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
        countdownSeconds: 3,
      })
      flow.startCountdown()
      await vi.advanceTimersByTimeAsync(5000)
      expect(flow.countdown.value).toBe(0)
      expect(flow.resendMeta.value.disabled).toBe(false)
    })
  })

  describe('computed', () => {
    it('21. maskedEmail 反应 step1Form.email', async () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step1Form.email = 'alice@osg.local'
      await flushPromises()
      expect(flow.maskedEmail.value).toBe('a***@osg.local')
    })

    it('22. passwordStrength 反应 step3Form.newPassword', async () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.step3Form.newPassword = 'abc12345'
      await flushPromises()
      expect(flow.passwordStrength.value.text).toBe('强')
    })

    it('23. countdownText 按 countdown 切换文案', async () => {
      const flow = mountFlow({
        endpoints: {
          sendCode: vi.fn(),
          verifyCode: vi.fn().mockResolvedValue({ resetToken: 't' }),
          resetPassword: vi.fn(),
        },
      })
      flow.countdown.value = 30
      await flushPromises()
      expect(flow.countdownText.value).toBe('30秒后可重新发送')
      flow.countdown.value = 0
      await flushPromises()
      expect(flow.countdownText.value).toBe('验证码已过期，可重新发送')
    })
  })
})

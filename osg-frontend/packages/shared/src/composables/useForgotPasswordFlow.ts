/**
 * 忘记密码 / 重置密码 流程 composable
 *
 * SSOT：5 端业务流一致（发送验证码 → 验证 → 重置 → 完成）
 * 视觉骨架由各端自行渲染（modal vs page，logo / 文案 / 色板各异）
 *
 * 用法：
 *   const flow = useForgotPasswordFlow({
 *     endpoints: {
 *       sendCode: ({ email }) => sendResetCode({ email }),
 *       verifyCode: ({ email, code }) => verifyResetCode({ email, code }),
 *       resetPassword: ({ email, password, resetToken }) => resetPassword({ email, password, resetToken }),
 *     },
 *   })
 *
 *   // template:
 *   //   <input v-model="flow.step1Form.email" />
 *   //   <button @click="flow.handleSendCode">发送验证码</button>
 *
 * 设计要点：
 * - API endpoints 通过 props 注入（5 端 endpoint 路径不同）
 * - 错误来自 endpoint 调用 throw，由 composable 捕获并设置 errorMessage
 * - 倒计时 onBeforeUnmount 自动清理（调用方需挂载到组件 lifecycle）
 */
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  getForgotPasswordResendMeta,
  getForgotPasswordStepDescription,
  getPasswordStrengthMeta,
  maskForgotPasswordEmail,
  validateForgotPasswordCode,
  validateForgotPasswordConfirmation,
  validateForgotPasswordEmail,
  validateForgotPasswordPassword,
} from '../utils/forgotPasswordHelpers'

const COUNTDOWN_NUMERIC = /^\d+s$/

/** Translate helper return: if it's an i18n key, run t(); if it's a numeric "30s" literal or '', return as-is. */
function translateHelperLabel(value: string, t: (key: string) => string): string {
  if (!value) return ''
  if (COUNTDOWN_NUMERIC.test(value)) return value
  return t(value)
}

/** 发送验证码 API 入参 */
export interface SendCodePayload {
  email: string
}

/** 验证验证码 API 入参 */
export interface VerifyCodePayload {
  email: string
  code: string
}

/** 验证验证码 API 返回值（必须含 resetToken 用于后续重置） */
export interface VerifyCodeResult {
  resetToken: string
}

/** 重置密码 API 入参 */
export interface ResetPasswordPayload {
  email: string
  password: string
  resetToken: string
}

/** 各端注入的 endpoints 集合（5 端业务路径不同） */
export interface ForgotPasswordEndpoints {
  /** Step 1: 发送验证码到邮箱 */
  sendCode: (payload: SendCodePayload) => Promise<unknown>
  /** Step 2: 验证验证码并获取 resetToken */
  verifyCode: (payload: VerifyCodePayload) => Promise<VerifyCodeResult>
  /** Step 3: 重置密码 */
  resetPassword: (payload: ResetPasswordPayload) => Promise<unknown>
}

/** Composable 配置选项 */
export interface UseForgotPasswordFlowOptions {
  /** API endpoints（必填，由各端注入） */
  endpoints: ForgotPasswordEndpoints
  /** 倒计时秒数（默认 60） */
  countdownSeconds?: number
}

/**
 * 忘记密码流程状态机 + 表单
 */
export function useForgotPasswordFlow(options: UseForgotPasswordFlowOptions) {
  const { endpoints, countdownSeconds = 60 } = options
  const { t } = useI18n()

  // ── State ──
  const currentStep = ref<1 | 2 | 3 | 4>(1)
  const sendingCode = ref(false)
  const verifying = ref(false)
  const resetting = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const countdown = ref(countdownSeconds)
  const emailError = ref('')
  const codeError = ref('')
  const confirmError = ref('')
  const showNewPassword = ref(false)
  const showConfirmPassword = ref(false)
  const resetToken = ref('')

  // ── Forms ──
  const step1Form = reactive({ email: '' })
  const step2Form = reactive({ code: '' })
  const step3Form = reactive({ newPassword: '', confirmPassword: '' })

  // ── Computed ──
  const maskedEmail = computed(() => maskForgotPasswordEmail(step1Form.email))
  const stepDescription = computed(() => {
    const key = getForgotPasswordStepDescription(currentStep.value)
    return key ? t(key) : ''
  })
  const passwordStrength = computed(() => {
    const raw = getPasswordStrengthMeta(step3Form.newPassword)
    return { className: raw.className, text: t(raw.text) }
  })
  const resendMeta = computed(() => {
    const raw = getForgotPasswordResendMeta(countdown.value)
    return { disabled: raw.disabled, label: translateHelperLabel(raw.label, t) }
  })
  const countdownText = computed(() => {
    if (countdown.value > 0) {
      return t('common.shared.forgotPassword.countdown.willResend', { n: countdown.value })
    }
    return t('common.shared.forgotPassword.countdown.expired')
  })

  // ── Internals ──
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  const resetMessages = () => {
    errorMessage.value = ''
    successMessage.value = ''
  }

  const stopCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  const startCountdown = () => {
    countdown.value = countdownSeconds
    stopCountdown()
    countdownTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        countdown.value = 0
        stopCountdown()
      }
    }, 1000)
  }

  /**
   * 完整复位整个流程状态（form + step + 倒计时 + token + 错误）。
   * 主要用于 modal 关闭后再次打开时清空残留状态。
   */
  const reset = () => {
    currentStep.value = 1
    sendingCode.value = false
    verifying.value = false
    resetting.value = false
    errorMessage.value = ''
    successMessage.value = ''
    emailError.value = ''
    codeError.value = ''
    confirmError.value = ''
    showNewPassword.value = false
    showConfirmPassword.value = false
    resetToken.value = ''
    step1Form.email = ''
    step2Form.code = ''
    step3Form.newPassword = ''
    step3Form.confirmPassword = ''
    countdown.value = countdownSeconds
    stopCountdown()
  }

  // ── Actions ──
  const handleSendCode = async () => {
    resetMessages()
    emailError.value = ''

    if (!validateForgotPasswordEmail(step1Form.email)) {
      emailError.value = t('common.shared.forgotPassword.errors.invalidEmail')
      return
    }

    sendingCode.value = true
    try {
      await endpoints.sendCode({ email: step1Form.email.trim() })
      successMessage.value = t('common.shared.forgotPassword.success.codeSent')
      step2Form.code = ''
      currentStep.value = 2
      startCountdown()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : t('common.shared.forgotPassword.errors.sendFailed')
    } finally {
      sendingCode.value = false
    }
  }

  const handleResendCode = async () => {
    if (resendMeta.value.disabled || sendingCode.value) {
      return
    }

    resetMessages()
    sendingCode.value = true
    try {
      await endpoints.sendCode({ email: step1Form.email.trim() })
      successMessage.value = t('common.shared.forgotPassword.success.codeResent')
      startCountdown()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : t('common.shared.forgotPassword.errors.resendFailed')
    } finally {
      sendingCode.value = false
    }
  }

  const handleVerifyCode = async () => {
    resetMessages()
    codeError.value = ''
    const nextCodeErrorKey = validateForgotPasswordCode(step2Form.code)
    if (nextCodeErrorKey) {
      codeError.value = t(nextCodeErrorKey)
      return
    }

    verifying.value = true
    try {
      const result = await endpoints.verifyCode({
        email: step1Form.email.trim(),
        code: step2Form.code.trim(),
      })
      resetToken.value = result.resetToken
      currentStep.value = 3
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : t('common.shared.forgotPassword.errors.verifyFailed')
    } finally {
      verifying.value = false
    }
  }

  const handleResetPassword = async () => {
    resetMessages()
    confirmError.value = ''

    const mismatchErrorKey = validateForgotPasswordConfirmation(
      step3Form.newPassword,
      step3Form.confirmPassword,
    )
    if (mismatchErrorKey) {
      confirmError.value = t(mismatchErrorKey)
      return
    }

    const passwordErrorKey = validateForgotPasswordPassword(step3Form.newPassword)
    if (passwordErrorKey) {
      errorMessage.value = t(passwordErrorKey)
      return
    }

    resetting.value = true
    try {
      await endpoints.resetPassword({
        email: step1Form.email.trim(),
        password: step3Form.newPassword,
        resetToken: resetToken.value,
      })
      currentStep.value = 4
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : t('common.shared.forgotPassword.errors.resetFailed')
    } finally {
      resetting.value = false
    }
  }

  // ── Lifecycle ──
  onBeforeUnmount(() => {
    stopCountdown()
  })

  return {
    // state
    currentStep,
    sendingCode,
    verifying,
    resetting,
    errorMessage,
    successMessage,
    countdown,
    emailError,
    codeError,
    confirmError,
    showNewPassword,
    showConfirmPassword,
    resetToken,
    // forms
    step1Form,
    step2Form,
    step3Form,
    // computed
    maskedEmail,
    stepDescription,
    passwordStrength,
    resendMeta,
    countdownText,
    // actions
    handleSendCode,
    handleResendCode,
    handleVerifyCode,
    handleResetPassword,
    // utility
    startCountdown,
    stopCountdown,
    resetMessages,
    reset,
  }
}

export type ForgotPasswordFlow = ReturnType<typeof useForgotPasswordFlow>

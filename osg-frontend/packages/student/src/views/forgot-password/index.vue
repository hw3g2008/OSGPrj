<template>
  <div class="forgot-page login-page">
    <div class="login-left">
      <h1>OSG</h1>
      <p>One Strategy Group 求职辅导平台，助力您的职业发展</p>
    </div>

    <div class="login-right">
      <div class="login-box">
        <router-link to="/login" class="back-link">
          <i class="mdi mdi-arrow-left" aria-hidden="true"></i>
          返回登录
        </router-link>

        <div class="login-logo">
          <div class="login-logo-icon">
            <i class="mdi mdi-key" aria-hidden="true"></i>
          </div>
          <span>找回密码</span>
        </div>

        <h2 class="login-title">重置密码</h2>
        <p class="login-subtitle">{{ stepDescription }}</p>

        <div class="steps">
          <div id="dot-1" class="step-dot" :class="{ active: currentStep === 1, done: currentStep > 1 }"></div>
          <div id="dot-2" class="step-dot" :class="{ active: currentStep === 2, done: currentStep > 2 }"></div>
          <div id="dot-3" class="step-dot" :class="{ active: currentStep === 3, done: currentStep > 3 }"></div>
        </div>

        <div class="alert error" :class="{ show: Boolean(errorMessage) }">
          <i class="mdi mdi-alert-circle" aria-hidden="true"></i>
          <span>{{ errorMessage }}</span>
        </div>
        <div class="alert success" :class="{ show: Boolean(successMessage) }">
          <i class="mdi mdi-check-circle" aria-hidden="true"></i>
          <span>{{ successMessage }}</span>
        </div>

        <div id="step-1" class="step-content" :class="{ active: currentStep === 1 }">
          <form @submit.prevent="handleSendCode">
            <div class="form-group">
              <label class="form-label" for="forgot-email">邮箱地址</label>
              <input
                id="forgot-email"
                v-model="step1Form.email"
                :class="['form-input', { error: Boolean(emailError) }]"
                type="email"
                placeholder="请输入注册邮箱"
                autocomplete="email"
                @input="emailError = ''"
              >
              <p class="field-error" :class="{ show: Boolean(emailError) }">{{ emailError }}</p>
            </div>
            <button id="send-btn" type="submit" class="login-btn" :disabled="sendingCode">
              {{ sendingCode ? '发送中...' : '发送验证码' }}
            </button>
          </form>
        </div>

        <div id="step-2" class="step-content" :class="{ active: currentStep === 2 }">
          <p class="masked-email">
            验证码已发送至 <strong>{{ maskedEmail }}</strong>
          </p>
          <form @submit.prevent="handleVerifyCode">
            <div class="form-group">
              <label class="form-label" for="fp-code">验证码</label>
              <div class="input-row">
                <input
                  id="fp-code"
                  v-model="step2Form.code"
                  :class="['form-input', { error: Boolean(codeError) }]"
                  type="text"
                  placeholder="请输入6位验证码"
                  maxlength="6"
                  @input="codeError = ''"
                >
                <button
                  id="fp-resend-btn"
                  type="button"
                  class="btn-code"
                  :disabled="resendMeta.disabled || sendingCode"
                  @click="handleResendCode"
                >
                  {{ resendMeta.label }}
                </button>
              </div>
              <p class="field-error" :class="{ show: Boolean(codeError) }">{{ codeError }}</p>
            </div>
            <button id="verify-btn" type="submit" class="login-btn" :disabled="verifying">
              {{ verifying ? '验证中...' : '验证' }}
            </button>
            <p class="countdown-text">{{ countdownText }}</p>
          </form>
        </div>

        <div id="step-3" class="step-content" :class="{ active: currentStep === 3 }">
          <form @submit.prevent="handleResetPassword">
            <div class="form-group">
              <label class="form-label" for="new-password">新密码</label>
              <div class="pwd-wrapper">
                <input
                  id="new-password"
                  v-model="step3Form.newPassword"
                  class="form-input"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="请输入新密码"
                  autocomplete="new-password"
                >
                <button
                  type="button"
                  class="pwd-toggle"
                  @click="showNewPassword = !showNewPassword"
                >
                  <i
                    class="mdi"
                    :class="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <div class="password-strength">
                <div class="strength-bar">
                  <div class="strength-fill" :class="passwordStrength.className"></div>
                </div>
                <p class="strength-text">{{ passwordStrength.text }}</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirm-password">确认密码</label>
              <div class="pwd-wrapper">
                <input
                  id="confirm-password"
                  v-model="step3Form.confirmPassword"
                  :class="['form-input', { error: Boolean(confirmError) }]"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="请再次输入新密码"
                  autocomplete="new-password"
                  @input="confirmError = ''"
                >
                <button
                  type="button"
                  class="pwd-toggle"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <i
                    class="mdi"
                    :class="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <p class="field-error" :class="{ show: Boolean(confirmError) }">{{ confirmError }}</p>
            </div>

            <button id="reset-btn" type="submit" class="login-btn" :disabled="resetting">
              {{ resetting ? '重置中...' : '重置密码' }}
            </button>
          </form>
        </div>

        <div id="step-4" class="step-content success-content" :class="{ active: currentStep === 4 }">
          <div class="success-icon">
            <i class="mdi mdi-check" aria-hidden="true"></i>
          </div>
          <h3 class="success-title">密码重置成功</h3>
          <p class="success-desc">您的密码已成功重置，请使用新密码登录</p>
          <router-link to="/login" class="login-link">返回登录</router-link>
        </div>

        <div class="copyright">
          备案号 <a href="https://beian.miit.gov.cn/" target="_blank">冀ICP备17000879号-4</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { resetPassword, sendResetCode, verifyResetCode } from '@osg/shared/api'
import {
  getForgotPasswordResendMeta,
  getForgotPasswordStepDescription,
  getPasswordStrengthMeta,
  maskForgotPasswordEmail,
  validateForgotPasswordCode,
  validateForgotPasswordConfirmation,
  validateForgotPasswordPassword
} from './forgot-password-workflow'

const currentStep = ref(1)
const sendingCode = ref(false)
const verifying = ref(false)
const resetting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const countdown = ref(60)
const emailError = ref('')
const codeError = ref('')
const confirmError = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const resetToken = ref('')

let countdownTimer: ReturnType<typeof window.setInterval> | null = null

const step1Form = reactive({ email: '' })
const step2Form = reactive({ code: '' })
const step3Form = reactive({ newPassword: '', confirmPassword: '' })

const maskedEmail = computed(() => maskForgotPasswordEmail(step1Form.email))
const stepDescription = computed(() => getForgotPasswordStepDescription(currentStep.value))
const passwordStrength = computed(() => getPasswordStrengthMeta(step3Form.newPassword))
const resendMeta = computed(() => getForgotPasswordResendMeta(countdown.value))

const countdownText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}秒后可重新发送`
  }
  return '验证码已过期，可重新发送'
})

const resetMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

const startCountdown = () => {
  countdown.value = 60
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }

  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 0
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  }, 1000)
}

const handleSendCode = async () => {
  resetMessages()
  emailError.value = ''

  if (!validEmail(step1Form.email)) {
    emailError.value = '请输入有效的邮箱地址'
    return
  }

  sendingCode.value = true
  try {
    await sendResetCode({ email: step1Form.email.trim() })
    successMessage.value = '我们会往您的注册邮箱发送验证码，请查收'
    step2Form.code = ''
    currentStep.value = 2
    startCountdown()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '发送失败，请重试'
  } finally {
    sendingCode.value = false
  }
}

const handleVerifyCode = async () => {
  resetMessages()
  codeError.value = ''
  const nextCodeError = validateForgotPasswordCode(step2Form.code)
  if (nextCodeError) {
    codeError.value = nextCodeError
    return
  }

  verifying.value = true
  try {
    const result = await verifyResetCode({
      email: step1Form.email.trim(),
      code: step2Form.code.trim()
    })
    resetToken.value = result.resetToken
    currentStep.value = 3
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证失败'
  } finally {
    verifying.value = false
  }
}

const handleResendCode = async () => {
  if (resendMeta.value.disabled || sendingCode.value) {
    return
  }

  resetMessages()
  sendingCode.value = true
  try {
    await sendResetCode({ email: step1Form.email.trim() })
    successMessage.value = '验证码已重新发送'
    startCountdown()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '重新发送失败，请重试'
  } finally {
    sendingCode.value = false
  }
}

const handleResetPassword = async () => {
  resetMessages()
  confirmError.value = ''

  const mismatchError = validateForgotPasswordConfirmation(
    step3Form.newPassword,
    step3Form.confirmPassword
  )
  if (mismatchError) {
    confirmError.value = mismatchError
    return
  }

  const passwordError = validateForgotPasswordPassword(step3Form.newPassword)
  if (passwordError) {
    errorMessage.value = passwordError
    return
  }

  resetting.value = true
  try {
    await resetPassword({
      email: step1Form.email.trim(),
      password: step3Form.newPassword,
      resetToken: resetToken.value
    })
    currentStep.value = 4
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '重置失败，请重试'
  } finally {
    resetting.value = false
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    animation: float 20s linear infinite;
    pointer-events: none;
  }
}

@keyframes float {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  color: #fff;
  position: relative;
  z-index: 1;

  h1 {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    opacity: 0.9;
    max-width: 400px;
  }
}

.login-right {
  width: 480px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px 0 0 24px;
  position: relative;
  z-index: 1;
}

.login-box {
  width: 100%;
  max-width: 360px;
  padding: 40px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-size: 13px;
  text-decoration: none;
  margin-bottom: 24px;

  &:hover {
    text-decoration: underline;
  }
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;

  span {
    font-size: 22px;
    font-weight: 700;
  }
}

.login-logo-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-gradient);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-subtitle {
  color: var(--muted);
  margin-bottom: 24px;
  font-size: 14px;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);

  &.active {
    background: var(--primary);
    width: 24px;
    border-radius: 5px;
  }

  &.done {
    background: var(--success);
  }
}

.alert {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  display: none;
  align-items: center;
  gap: 8px;

  &.show {
    display: flex;
  }

  &.error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  &.success {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }
}

.step-content {
  display: none;

  &.active {
    display: block;
  }
}

.form-group {
  margin-bottom: 18px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text2);
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-light);
  }

  &.error {
    border-color: var(--danger);
  }
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row .form-input {
  flex: 1;
}

.btn-code {
  padding: 14px 18px;
  background: var(--bg);
  color: var(--primary);
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: var(--primary);
  }

  &:disabled {
    color: var(--muted);
    cursor: not-allowed;
  }
}

.pwd-wrapper {
  position: relative;
}

.pwd-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
}

.field-error {
  color: var(--danger);
  font-size: 12px;
  margin-top: 4px;
  display: none;

  &.show {
    display: block;
  }
}

.login-btn {
  width: 100%;
  padding: 16px;
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    background: var(--muted);
    cursor: not-allowed;
    transform: none;
  }
}

.masked-email {
  text-align: center;
  font-size: 13px;
  color: var(--text2);
  margin-bottom: 16px;
}

.countdown-text {
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  margin-top: 16px;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  width: 0;
  transition: all 0.3s;

  &.strength-weak {
    width: 33%;
    background: var(--danger);
  }

  &.strength-medium {
    width: 66%;
    background: var(--warning);
  }

  &.strength-strong {
    width: 100%;
    background: var(--success);
  }
}

.strength-text {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.success-content {
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #d1fae5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  .mdi {
    font-size: 40px;
    color: var(--success);
  }
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.success-desc {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 24px;
}

.login-link {
  display: block;
  width: 100%;
  padding: 16px;
  background: var(--primary-gradient);
  color: #fff;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
}

.copyright {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: var(--muted);

  a {
    color: var(--text2);
    text-decoration: none;
  }
}
</style>

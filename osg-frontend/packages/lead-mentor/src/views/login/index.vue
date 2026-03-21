<template>
  <div id="login-page" class="login-page">
    <div class="login-accent login-accent-left"></div>
    <div class="login-accent login-accent-bottom"></div>
    <div class="login-accent login-accent-right"></div>

    <section class="login-left">
      <h1 class="platform-title">OSG Platform</h1>
      <p class="platform-subtitle">职业培训一站式平台，学生与导师共同成长</p>

      <div class="login-features">
        <div v-for="feature in featureTexts" :key="feature" class="login-feature">
          <span class="mdi mdi-check-circle feature-icon" aria-hidden="true"></span>
          <span>{{ feature }}</span>
        </div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <span class="mdi mdi-account-star logo-icon-glyph" aria-hidden="true"></span>
          </div>
          <span class="login-logo-text">OSG Lead Mentor</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用您的账号登录（主导师/班主任）</p>

        <div v-if="errorMessage" class="login-error" role="alert">
          <span class="mdi mdi-alert-circle error-icon" aria-hidden="true"></span>
          <span>{{ errorMessage }}</span>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名 / 邮箱</label>
            <input
              id="login-username"
              v-model.trim="formState.username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <div class="password-field">
              <input
                id="login-password"
                v-model="formState.password"
                :type="passwordVisible ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="visibility-toggle"
                :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                @click="passwordVisible = !passwordVisible"
              >
                <span id="pwd-eye" class="mdi mdi-eye toggle-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <button class="login-btn" type="submit" :disabled="loading">
            <span class="mdi mdi-login button-icon" aria-hidden="true"></span>
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <div class="login-links">
          忘记密码？
          <a
            href="javascript:void(0)"
            class="link-anchor"
            data-surface-trigger="modal-forgot-password"
            @click.prevent="openForgotPassword"
          >
            点击重置
          </a>
        </div>
      </div>
    </section>

    <div
      v-if="forgotPasswordOpen"
      class="forgot-password-modal"
      data-surface-id="modal-forgot-password"
    >
      <div
        class="forgot-password-backdrop"
        data-surface-part="backdrop"
        @click="closeForgotPassword"
      ></div>

      <div
        class="forgot-password-shell"
        data-surface-part="shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <div class="forgot-password-header" data-surface-part="header">
          <span id="forgot-password-title" class="forgot-password-title">
            <span class="mdi mdi-key modal-icon" aria-hidden="true"></span>
            找回密码
          </span>
          <button
            type="button"
            class="modal-close"
            data-surface-part="close-control"
            aria-label="关闭找回密码弹层"
            @click="closeForgotPassword"
          >
            ×
          </button>
        </div>

        <div class="forgot-password-body" data-surface-part="body">
          <div class="forgot-password-dots" aria-hidden="true">
            <div class="step-dot" :class="{ active: forgotPasswordStep !== 'step-success' }"></div>
            <div
              class="step-dot"
              :class="{ active: forgotPasswordStep === 'step-code' || forgotPasswordStep === 'step-reset' }"
            ></div>
            <div class="step-dot" :class="{ active: forgotPasswordStep === 'step-reset' }"></div>
          </div>

          <div v-if="forgotPasswordAlert.message" class="forgot-password-alert" :class="forgotPasswordAlert.type">
            {{ forgotPasswordAlert.message }}
          </div>

          <div id="fp-step-1" v-show="forgotPasswordStep === 'step-email'" class="forgot-password-step">
            <p class="step-text">请输入您的注册邮箱，我们将发送验证码</p>
            <div class="form-group">
              <label class="form-label" for="fp-email">
                邮箱地址 <span class="required-mark">*</span>
              </label>
              <input
                id="fp-email"
                v-model.trim="forgotPasswordForm.email"
                class="form-input"
                type="email"
                placeholder="请输入注册邮箱"
              />
              <p v-if="forgotPasswordErrors.email" class="field-error">{{ forgotPasswordErrors.email }}</p>
            </div>
            <button
              id="fp-send-code-btn"
              type="button"
              class="btn btn-primary modal-action-btn"
              :disabled="forgotPasswordLoading.send"
              @click="handleSendResetCode"
            >
              <span v-if="!forgotPasswordLoading.send" class="mdi mdi-email-fast btn-icon" aria-hidden="true"></span>
              <span>{{ forgotPasswordLoading.send ? '发送中...' : '发送验证码' }}</span>
            </button>
          </div>

          <div id="fp-step-2" v-show="forgotPasswordStep === 'step-code'" class="forgot-password-step">
            <p class="step-text compact">验证码已发送至</p>
            <p id="fp-masked-email" class="masked-email">{{ maskedForgotPasswordEmail }}</p>
            <div class="form-group">
              <label class="form-label" for="fp-code">
                验证码 <span class="required-mark">*</span>
              </label>
              <div class="code-row">
                <input
                  id="fp-code"
                  v-model.trim="forgotPasswordForm.code"
                  class="form-input"
                  type="text"
                  placeholder="请输入6位验证码"
                  maxlength="6"
                />
                <button
                  id="fp-resend-btn"
                  type="button"
                  class="btn btn-outline"
                  :disabled="forgotPasswordCountdown > 0 || forgotPasswordLoading.send"
                  @click="handleSendResetCode"
                >
                  {{ forgotPasswordCountdown > 0 ? `${forgotPasswordCountdown}s` : '重新发送' }}
                </button>
              </div>
              <p v-if="forgotPasswordErrors.code" class="field-error">{{ forgotPasswordErrors.code }}</p>
            </div>
            <button
              id="fp-verify-code-btn"
              type="button"
              class="btn btn-primary modal-action-btn"
              :disabled="forgotPasswordLoading.verify"
              @click="handleVerifyResetCode"
            >
              <span v-if="!forgotPasswordLoading.verify" class="mdi mdi-check btn-icon" aria-hidden="true"></span>
              <span>{{ forgotPasswordLoading.verify ? '验证中...' : '验证' }}</span>
            </button>
          </div>

          <div id="fp-step-3" v-show="forgotPasswordStep === 'step-reset'" class="forgot-password-step">
            <p class="step-text">请设置您的新密码</p>
            <div class="form-group">
              <label class="form-label" for="fp-new-pwd">
                新密码 <span class="required-mark">*</span>
              </label>
              <input
                id="fp-new-pwd"
                v-model="forgotPasswordForm.newPassword"
                class="form-input"
                type="password"
                placeholder="8-20位，包含字母和数字"
              />
              <p v-if="forgotPasswordErrors.newPassword" class="field-error">{{ forgotPasswordErrors.newPassword }}</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="fp-confirm-pwd">
                确认密码 <span class="required-mark">*</span>
              </label>
              <input
                id="fp-confirm-pwd"
                v-model="forgotPasswordForm.confirmPassword"
                class="form-input"
                type="password"
                placeholder="请再次输入新密码"
              />
              <p v-if="forgotPasswordErrors.confirmPassword" class="field-error">
                {{ forgotPasswordErrors.confirmPassword }}
              </p>
            </div>
            <button
              id="fp-reset-password-btn"
              type="button"
              class="btn btn-primary modal-action-btn"
              :disabled="forgotPasswordLoading.reset"
              @click="handleResetPassword"
            >
              <span v-if="!forgotPasswordLoading.reset" class="mdi mdi-lock-reset btn-icon" aria-hidden="true"></span>
              <span>{{ forgotPasswordLoading.reset ? '重置中...' : '重置密码' }}</span>
            </button>
          </div>

          <div
            id="fp-step-4"
            v-show="forgotPasswordStep === 'step-success'"
            class="forgot-password-step success-step"
          >
            <div class="success-icon-wrap">
              <span class="mdi mdi-check-circle success-icon" aria-hidden="true"></span>
            </div>
            <h3 class="success-title">密码重置成功</h3>
            <p class="step-text">您的密码已成功重置，请使用新密码登录</p>
            <button type="button" class="btn btn-primary modal-action-btn" @click="closeForgotPassword">
              返回登录
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  getLeadMentorInfo,
  leadMentorLogin,
  resetPassword as resetLeadMentorPassword,
  sendResetCode,
  verifyResetCode,
} from '@osg/shared/api'
import { clearAuth, setToken, setUser } from '@osg/shared/utils'

type ForgotPasswordStep = 'step-email' | 'step-code' | 'step-reset' | 'step-success'

const featureTexts = [
  '学生端：一对一导师辅导',
  '导师端：高效课程管理',
  '实时岗位信息共享',
  '完善的学习资料库',
]

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const passwordVisible = ref(false)
const forgotPasswordOpen = ref(false)
const forgotPasswordStep = ref<ForgotPasswordStep>('step-email')
const forgotPasswordCountdown = ref(0)
const errorMessage = ref('')
const formState = reactive({ username: '', password: '' })
const forgotPasswordForm = reactive({
  email: '',
  code: '',
  resetToken: '',
  newPassword: '',
  confirmPassword: '',
})
const forgotPasswordErrors = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})
const forgotPasswordLoading = reactive({
  send: false,
  verify: false,
  reset: false,
})
const forgotPasswordAlert = reactive<{
  type: 'error' | 'success'
  message: string
}>({
  type: 'error',
  message: '',
})
let forgotPasswordTimer: ReturnType<typeof setInterval> | null = null

const maskedForgotPasswordEmail = computed(() => {
  const email = forgotPasswordForm.email.trim()
  if (!email.includes('@')) {
    return ''
  }
  const [local, domain] = email.split('@')
  if (!local || !domain) {
    return ''
  }
  return `${local[0]}***@${domain}`
})

const handleLogin = async () => {
  errorMessage.value = ''
  if (!formState.username || !formState.password) {
    message.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const { token } = await leadMentorLogin({
      username: formState.username.trim(),
      password: formState.password,
    })
    setToken(token)
    const userInfo = await getLeadMentorInfo()
    if (!userInfo.roles?.includes('lead-mentor') && !userInfo.roles?.includes('admin')) {
      clearAuth()
      errorMessage.value = '该账号无班主任端访问权限'
      return
    }
    setUser({
      ...userInfo.user,
      roles: userInfo.roles,
      permissions: userInfo.permissions,
    })
    message.success('登录成功')
    router.push((route.query.redirect as string) || '/')
  } catch (error: any) {
    clearAuth()
    errorMessage.value = error?.message || '用户不存在/密码错误'
  } finally {
    loading.value = false
  }
}

const clearForgotPasswordErrors = () => {
  forgotPasswordErrors.email = ''
  forgotPasswordErrors.code = ''
  forgotPasswordErrors.newPassword = ''
  forgotPasswordErrors.confirmPassword = ''
}

const clearForgotPasswordAlert = () => {
  forgotPasswordAlert.type = 'error'
  forgotPasswordAlert.message = ''
}

const stopForgotPasswordCountdown = () => {
  if (forgotPasswordTimer) {
    clearInterval(forgotPasswordTimer)
    forgotPasswordTimer = null
  }
}

const startForgotPasswordCountdown = () => {
  stopForgotPasswordCountdown()
  forgotPasswordCountdown.value = 60
  forgotPasswordTimer = setInterval(() => {
    if (forgotPasswordCountdown.value <= 1) {
      forgotPasswordCountdown.value = 0
      stopForgotPasswordCountdown()
      return
    }
    forgotPasswordCountdown.value -= 1
  }, 1000)
}

const resetForgotPasswordState = () => {
  forgotPasswordStep.value = 'step-email'
  forgotPasswordCountdown.value = 0
  forgotPasswordForm.email = ''
  forgotPasswordForm.code = ''
  forgotPasswordForm.resetToken = ''
  forgotPasswordForm.newPassword = ''
  forgotPasswordForm.confirmPassword = ''
  forgotPasswordLoading.send = false
  forgotPasswordLoading.verify = false
  forgotPasswordLoading.reset = false
  clearForgotPasswordErrors()
  clearForgotPasswordAlert()
  stopForgotPasswordCountdown()
}

const openForgotPassword = () => {
  resetForgotPasswordState()
  forgotPasswordOpen.value = true
}

const closeForgotPassword = () => {
  forgotPasswordOpen.value = false
  resetForgotPasswordState()
}

const handleSendResetCode = async () => {
  clearForgotPasswordErrors()
  clearForgotPasswordAlert()

  const email = forgotPasswordForm.email.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    forgotPasswordErrors.email = '请输入有效的邮箱地址'
    return
  }

  forgotPasswordLoading.send = true
  try {
    forgotPasswordForm.email = email
    forgotPasswordForm.code = ''
    forgotPasswordForm.resetToken = ''
    await sendResetCode({ email })
    forgotPasswordAlert.type = 'success'
    forgotPasswordAlert.message = '验证码已发送'
    forgotPasswordStep.value = 'step-code'
    startForgotPasswordCountdown()
  } catch (error: any) {
    forgotPasswordAlert.type = 'error'
    forgotPasswordAlert.message = error?.message || '发送失败，请重试'
  } finally {
    forgotPasswordLoading.send = false
  }
}

const handleVerifyResetCode = async () => {
  clearForgotPasswordErrors()
  clearForgotPasswordAlert()

  const code = forgotPasswordForm.code.trim()
  if (!/^\d{6}$/.test(code)) {
    forgotPasswordErrors.code = '请输入6位验证码'
    return
  }

  forgotPasswordLoading.verify = true
  try {
    const result = await verifyResetCode({
      email: forgotPasswordForm.email,
      code,
    })
    forgotPasswordForm.code = code
    forgotPasswordForm.resetToken = result.resetToken
    forgotPasswordStep.value = 'step-reset'
  } catch (error: any) {
    forgotPasswordErrors.code = error?.message || '验证码错误'
  } finally {
    forgotPasswordLoading.verify = false
  }
}

const handleResetPassword = async () => {
  clearForgotPasswordErrors()
  clearForgotPasswordAlert()

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(forgotPasswordForm.newPassword)) {
    forgotPasswordErrors.newPassword = '请输入8-20位且包含字母和数字的新密码'
    return
  }
  if (forgotPasswordForm.newPassword !== forgotPasswordForm.confirmPassword) {
    forgotPasswordErrors.confirmPassword = '两次输入的密码不一致'
    return
  }
  if (!forgotPasswordForm.resetToken) {
    forgotPasswordAlert.type = 'error'
    forgotPasswordAlert.message = '重置令牌不能为空'
    return
  }

  forgotPasswordLoading.reset = true
  try {
    await resetLeadMentorPassword({
      email: forgotPasswordForm.email,
      password: forgotPasswordForm.newPassword,
      resetToken: forgotPasswordForm.resetToken,
    })
    forgotPasswordStep.value = 'step-success'
    clearForgotPasswordAlert()
    forgotPasswordForm.code = ''
    forgotPasswordForm.newPassword = ''
    forgotPasswordForm.confirmPassword = ''
    stopForgotPasswordCountdown()
  } catch (error: any) {
    forgotPasswordAlert.type = 'error'
    forgotPasswordAlert.message = error?.message || '重置失败，请重试'
  } finally {
    forgotPasswordLoading.reset = false
  }
}

onBeforeUnmount(() => {
  stopForgotPasswordCountdown()
})
</script>

<style scoped lang="scss">
.login-page {
  --primary: #7399c6;
  --primary-light: #e8f0f8;
  --primary-dark: #5a7ba3;
  --primary-gradient: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  --text: #1e293b;
  --text-secondary: #64748b;
  --muted: #94a3b8;
  --border: #e2e8f0;

  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.login-accent {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.login-accent-left {
  top: -100px;
  left: -100px;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.05);
}

.login-accent-bottom {
  bottom: -80px;
  left: 30%;
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.04);
}

.login-accent-right {
  top: 40%;
  right: -50px;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.03);
}

.login-left,
.login-right {
  position: relative;
  z-index: 1;
}

.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  color: #fff;
}

.platform-title {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
}

.platform-subtitle {
  max-width: 400px;
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  opacity: 0.9;
}

.login-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 40px;
}

.login-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0.9;
}

.feature-icon {
  flex-shrink: 0;
  font-size: 24px;
  line-height: 1;
}

.login-right {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 24px 0 0 24px;
}

.login-box {
  width: 100%;
  max-width: 360px;
  padding: 40px;
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}

.login-logo-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  border-radius: 14px;
  color: #fff;
}

.logo-icon-glyph {
  font-size: 24px;
  line-height: 1;
}

.login-logo-text {
  color: var(--text);
  font-size: 22px;
  font-weight: 700;
}

.login-title {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
}

.login-subtitle {
  margin: 0 0 28px;
  color: var(--muted);
}

.login-error {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.error-icon {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
}

.login-form .form-group {
  margin-bottom: 18px;
}

.login-form label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.login-form input {
  width: 100%;
  padding: 14px 16px;
  color: var(--text);
  font-size: 15px;
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-form input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 48px;
}

.visibility-toggle {
  position: absolute;
  top: 50%;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transform: translateY(-50%);
}

.toggle-icon {
  font-size: 18px;
  line-height: 1;
}

.visibility-toggle:hover {
  color: var(--primary-dark);
}

.login-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background: var(--primary-gradient);
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.button-icon {
  font-size: 18px;
  line-height: 1;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.login-links {
  margin-top: 20px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.link-anchor {
  margin-left: 4px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

.link-anchor:hover {
  color: var(--primary-dark);
}

.forgot-password-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.forgot-password-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.forgot-password-shell {
  position: relative;
  z-index: 1;
  width: 90%;
  max-width: 450px;
  max-height: 90vh;
  margin: 0;
  overflow-y: auto;
  border-radius: 20px;
  font-family: Arial, sans-serif;
  background-color: #fff;
}

.forgot-password-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  color: #fff;
  background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  border-bottom: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
}

.forgot-password-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  line-height: normal;
}

.modal-icon {
  font-size: 18px;
  line-height: 1;
}

.modal-close {
  width: 36px;
  height: 36px;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.forgot-password-body {
  padding: 26px;
}

.forgot-password-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d9e2ec;
}

.step-dot.active {
  background: #7399c6;
}

.forgot-password-alert {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.forgot-password-alert.error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.forgot-password-alert.success {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.forgot-password-step {
  display: block;
}

.forgot-password-step .form-group {
  margin-bottom: 16px;
}

.step-text {
  margin: 0 0 20px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: normal;
  text-align: center;
}

.step-text.compact {
  margin-bottom: 8px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: normal;
}

.required-mark {
  color: #ef4444;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 12px 14px;
  color: var(--text);
  font-size: 14px;
  line-height: normal;
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.code-row {
  display: flex;
  gap: 8px;
}

.code-row .form-input {
  flex: 1;
  min-width: 0;
}

.code-row .btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: normal;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.btn-primary {
  color: #fff;
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(115, 153, 198, 0.3);
}

.btn-outline {
  color: var(--text-secondary);
  background: #fff;
  border: 1px solid var(--border);
}

.modal-action-btn {
  width: 100%;
  justify-content: flex-start;
}

.btn-icon {
  font-size: 16px;
  line-height: 1;
}

.masked-email {
  margin: 0 0 20px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: normal;
  text-align: center;
}

.success-step {
  text-align: center;
}

.success-icon-wrap {
  width: 80px;
  height: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  color: #059669;
  background: #d1fae5;
  border-radius: 50%;
}

.success-icon {
  font-size: 40px;
  line-height: 1;
}

.success-title {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 18px;
  font-weight: 700;
  line-height: normal;
}

@media (max-width: 1120px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    width: 100%;
    padding: 48px 32px 24px;
  }

  .login-right {
    width: calc(100% - 48px);
    margin: 0 24px 24px;
    border-radius: 24px;
  }
}

@media (max-width: 640px) {
  .login-left {
    padding: 40px 24px 16px;
  }

  .platform-title {
    font-size: 36px;
  }

  .platform-subtitle {
    font-size: 16px;
  }

  .login-right {
    width: calc(100% - 24px);
    margin: 0 12px 12px;
  }

  .login-box {
    padding: 32px 24px;
  }

  .login-logo-text {
    font-size: 20px;
  }

  .forgot-password-shell {
    width: 100%;
  }

  .forgot-password-body {
    padding: 22px;
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>

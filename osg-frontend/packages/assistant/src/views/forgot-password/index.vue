<template>
  <div id="forgot-password-page" class="forgot-page login-page">
    <div class="login-left">
      <h1>OSG Assistant</h1>
      <p>助教工作台密码重置入口，使用共享账号体系安全恢复助教端访问。</p>
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
          <p class="success-desc">您的密码已成功重置，请使用新密码重新登录助教端。</p>
          <router-link to="/login" class="login-link">返回登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { resetPassword, sendResetCode, verifyResetCode } from '@osg/shared/api'
import { useForgotPasswordFlow } from '@osg/shared/composables'

// M6: 业务逻辑由 shared composable 接管（5 端共用）。
// asst 端仅注入端特定 API endpoints + 本地视觉骨架。
const {
  currentStep,
  sendingCode,
  verifying,
  resetting,
  errorMessage,
  successMessage,
  emailError,
  codeError,
  confirmError,
  showNewPassword,
  showConfirmPassword,
  step1Form,
  step2Form,
  step3Form,
  maskedEmail,
  stepDescription,
  passwordStrength,
  resendMeta,
  countdownText,
  handleSendCode,
  handleVerifyCode,
  handleResendCode,
  handleResetPassword,
} = useForgotPasswordFlow({
  endpoints: {
    sendCode: (payload) => sendResetCode(payload),
    verifyCode: (payload) => verifyResetCode(payload),
    resetPassword: (payload) => resetPassword(payload),
  },
})
</script>

<style scoped lang="scss">
.login-page {
  --primary: #7399c6;
  --primary-light: #e8f0f8;
  --primary-gradient: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --text: #1e293b;
  --text2: #64748b;
  --muted: #94a3b8;
  --border: #e2e8f0;
  --bg: #f8fafc;
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;

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
    margin: 0;
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
    color: var(--text);
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
  margin: 0 0 8px;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
}

.login-subtitle {
  margin: 0 0 28px;
  color: var(--muted);
  font-size: 16px;
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
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  padding: 14px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
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
  font-family: Arial, sans-serif;
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

.pwd-wrapper .form-input {
  padding-right: 52px;
}

.pwd-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--muted);
  font-family: Arial, sans-serif;
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
  font-family: Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  margin-top: 0;
  transition: transform 0.2s ease;

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
  font-family: Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
}

@media (max-width: 960px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    padding: 32px 24px 12px;

    h1 {
      font-size: 36px;
    }
  }

  .login-right {
    width: 100%;
    border-radius: 24px 24px 0 0;
  }

  .login-box {
    max-width: 100%;
    padding: 32px 24px 40px;
  }
}
</style>

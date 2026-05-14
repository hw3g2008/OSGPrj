<template>
  <div class="forgot-page login-page">
    <div class="login-left">
      <h1>OSG</h1>
      <p>One Strategy Group {{ $t('job_search_coaching_platform_empowering_') }}</p>
    </div>

    <div class="login-right">
      <div class="login-box">
        <router-link to="/login" class="back-link">
          <i class="mdi mdi-arrow-left" aria-hidden="true"></i>
          {{ $t('return_to_login') }}
        </router-link>

        <div class="login-logo">
          <div class="login-logo-icon">
            <i class="mdi mdi-key" aria-hidden="true"></i>
          </div>
          <span>{{ $t('retrieve_password') }}</span>
        </div>

        <h2 class="login-title">{{ $t('reset_password') }}</h2>
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
          <a-form @finish="handleSendCode">
            <div class="form-group">
              <label class="form-label" for="forgot-email">{{ $t('email_address') }}</label>
              <a-input
                v-model:value="step1Form.email"
                :placeholder="$t('please_enter_your_registered_email_addre')"
                autocomplete="email"
              ></a-input>
              <p class="field-error" :class="{ show: Boolean(emailError) }">{{ emailError }}</p>
            </div>
            <a-button id="send-btn" type="primary" class="login-btn" :loading="sendingCode" html-type="submit">
              {{ sendingCode ? '发送中...' : $t('send_verification_code') }}
            </a-button>
          </a-form>
        </div>

        <div id="step-2" class="step-content" :class="{ active: currentStep === 2 }">
          <p class="masked-email">
            验证码已发送至 <strong>{{ maskedEmail }}</strong>
          </p>
          <a-form @finish="handleVerifyCode">
            <div class="form-group">
              <label class="form-label" for="fp-code">{{ $t('verification_code') }}</label>
              <div class="input-row">
                <a-input
                  v-model:value="step2Form.code"
                  :maxlength="6"
                  :placeholder="$t('please_enter_the_6_digit_verification_co')"
                ></a-input>
                <a-button
                  id="fp-resend-btn"
                  type="default"
                  class="btn-code"
                  :disabled="resendMeta.disabled || sendingCode"
                  @click="handleResendCode"
                >
                  {{ resendMeta.label }}
                </a-button>
              </div>
              <p class="field-error" :class="{ show: Boolean(codeError) }">{{ codeError }}</p>
            </div>
            <a-button id="verify-btn" type="primary" class="login-btn" :loading="verifying" html-type="submit">
              {{ verifying ? '验证中...' : $t('verify') }}
            </a-button>
            <p class="countdown-text">{{ countdownText }}</p>
          </a-form>
        </div>

        <div id="step-3" class="step-content" :class="{ active: currentStep === 3 }">
          <a-form @finish="handleResetPassword">
            <div class="form-group">
              <label class="form-label" for="new-password">{{ $t('new_password') }}</label>
              <a-input-password
                  v-model:value="step3Form.newPassword"
                  :placeholder="$t('please_enter_new_password')"
                  autocomplete="new-password"
                ></a-input-password>
              <div class="password-strength">
                <div class="strength-bar">
                  <div class="strength-fill" :class="passwordStrength.className"></div>
                </div>
                <p class="strength-text">{{ passwordStrength.text }}</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirm-password">{{ $t('confirm_password') }}</label>
              <a-input-password
                  v-model:value="step3Form.confirmPassword"
                  :class="{ error: Boolean(confirmError) }"
                  :placeholder="$t('please_enter_new_password_again')"
                  autocomplete="new-password"
                ></a-input-password>
              <p class="field-error" :class="{ show: Boolean(confirmError) }">{{ confirmError }}</p>
            </div>

            <a-button id="reset-btn" type="primary" class="login-btn" :loading="resetting" html-type="submit">
              {{ resetting ? '重置中...' : $t('reset_password') }}
            </a-button>
          </a-form>
        </div>

        <div id="step-4" class="step-content success-content" :class="{ active: currentStep === 4 }">
          <div class="success-icon">
            <i class="mdi mdi-check" aria-hidden="true"></i>
          </div>
          <h3 class="success-title">{{ $t('password_reset_successful') }}</h3>
          <p class="success-desc">{{ $t('your_password_has_been_reset_successfull') }}</p>
          <router-link to="/login" class="login-link">{{ $t('return_to_login') }}</router-link>
        </div>

        <div class="copyright">
          备案号 <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{{ $t('ji_icp_no_17000879') }}-4</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { resetPassword, sendResetCode, verifyResetCode } from '@osg/shared/api'
import { useForgotPasswordFlow } from '@osg/shared/composables'

// M6: 业务逻辑由 shared composable 接管（5 端共用）。
// student 端仅注入端特定 API endpoints + 本地视觉骨架。
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
  box-sizing: border-box;
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

  :deep(.ant-input) {
    flex: 1;
  }

  :deep(.btn-code) {
    flex: 0 0 auto;
    white-space: nowrap;
    border-radius: 8px;
  }
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
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }

  &:disabled {
    background: var(--muted);
    cursor: not-allowed;
    transform: none;
    filter: none;
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

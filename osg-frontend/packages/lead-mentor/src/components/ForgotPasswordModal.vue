<template>
  <div
    v-if="modelValue"
    class="forgot-password-modal"
    data-surface-id="modal-forgot-password"
  >
    <div
      class="forgot-password-backdrop"
      data-surface-part="backdrop"
      @click="closeModal"
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
          <svg class="modal-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="iconPaths.key" />
          </svg>
          找回密码
        </span>
        <button
          type="button"
          class="modal-close"
          data-surface-part="close-control"
          aria-label="关闭找回密码弹层"
          @click="closeModal"
        >
          ×
        </button>
      </div>

      <div class="forgot-password-body" data-surface-part="body">
        <div class="forgot-password-dots" aria-hidden="true">
          <div class="step-dot" :class="{ active: resolvedStep !== 'step-success' }"></div>
          <div class="step-dot" :class="{ active: resolvedStep === 'step-code' || resolvedStep === 'step-reset' }"></div>
          <div class="step-dot" :class="{ active: resolvedStep === 'step-reset' }"></div>
        </div>

        <div id="fp-step-1" v-show="resolvedStep === 'step-email'" class="forgot-password-step">
          <p class="step-text">请输入您的注册邮箱，我们将发送验证码</p>
          <div class="form-group">
            <label class="form-label" for="fp-email">
              邮箱地址 <span class="required-mark">*</span>
            </label>
            <input id="fp-email" class="form-input" type="email" placeholder="请输入注册邮箱" />
          </div>
          <button type="button" class="btn btn-primary modal-action-btn">
            发送验证码
          </button>
        </div>

        <div id="fp-step-2" v-show="resolvedStep === 'step-code'" class="forgot-password-step">
          <p class="step-text compact">验证码已发送至</p>
          <p id="fp-masked-email" class="masked-email">{{ resolvedMaskedEmail }}</p>
          <div class="form-group">
            <label class="form-label" for="fp-code">
              验证码 <span class="required-mark">*</span>
            </label>
            <div class="code-row">
              <input
                id="fp-code"
                class="form-input"
                type="text"
                placeholder="请输入6位验证码"
                maxlength="6"
              />
              <button id="fp-resend-btn" type="button" class="btn btn-outline" disabled>60s</button>
            </div>
          </div>
          <button type="button" class="btn btn-primary modal-action-btn">
            验证
          </button>
        </div>

        <div id="fp-step-3" v-show="resolvedStep === 'step-reset'" class="forgot-password-step">
          <p class="step-text">请设置您的新密码</p>
          <div class="form-group">
            <label class="form-label" for="fp-new-pwd">
              新密码 <span class="required-mark">*</span>
            </label>
            <input
              id="fp-new-pwd"
              class="form-input"
              type="password"
              placeholder="8-20位，包含字母和数字"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="fp-confirm-pwd">
              确认密码 <span class="required-mark">*</span>
            </label>
            <input
              id="fp-confirm-pwd"
              class="form-input"
              type="password"
              placeholder="请再次输入新密码"
            />
          </div>
          <button type="button" class="btn btn-primary modal-action-btn">
            重置密码
          </button>
        </div>

        <div id="fp-step-4" v-show="resolvedStep === 'step-success'" class="forgot-password-step success-step">
          <div class="success-icon-wrap">
            <svg class="success-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="iconPaths.checkCircle" />
            </svg>
          </div>
          <h3 class="success-title">密码重置成功</h3>
          <p class="step-text">您的密码已成功重置，请使用新密码登录</p>
          <button type="button" class="btn btn-primary modal-action-btn" @click="closeModal">
            返回登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ForgotPasswordStep = 'step-email' | 'step-code' | 'step-reset' | 'step-success'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    previewStep?: ForgotPasswordStep
    maskedEmail?: string
  }>(),
  {
    previewStep: 'step-email',
    maskedEmail: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const iconPaths = {
  key: 'M7,14A2,2 0 0,1 9,16A2,2 0 0,1 11,14A2,2 0 0,1 9,12A2,2 0 0,1 7,14M18,1L12,7C11.04,6.83 10.05,6.88 9.14,7.14L7.76,5.76L6.35,7.17L7.38,8.2C6.94,8.5 6.56,8.87 6.26,9.3L5.2,8.24L3.79,9.65L5.17,11.03C4.93,11.94 4.89,12.91 5.05,13.86L1,17.92V23H6.08L10.15,18.93C11.08,19.09 12.05,19.05 12.97,18.8L14.34,20.17L15.75,18.76L14.7,17.71C15.13,17.41 15.5,17.03 15.8,16.6L16.83,17.63L18.24,16.22L16.86,14.84C17.12,13.93 17.17,12.94 17,11.97L23,6M18,4.5A1.5,1.5 0 0,0 16.5,6A1.5,1.5 0 0,0 18,7.5A1.5,1.5 0 0,0 19.5,6A1.5,1.5 0 0,0 18,4.5Z',
  checkCircle:
    'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M10,17L16,11L14.59,9.58L10,14.17L7.41,11.59L6,13L10,17Z',
}

const resolvedStep = computed<ForgotPasswordStep>(() => props.previewStep)
const resolvedMaskedEmail = computed(() => props.maskedEmail || 'a***@example.com')

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.forgot-password-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.forgot-password-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.38);
}

.forgot-password-shell {
  position: relative;
  z-index: 1;
  width: min(450px, calc(100vw - 32px));
  margin: 80px auto;
  overflow: hidden;
  border-radius: 20px;
  background-color: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.forgot-password-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  color: #fff;
  background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
}

.forgot-password-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.modal-icon,
.success-icon {
  fill: currentColor;
}

.modal-icon {
  width: 18px;
  height: 18px;
}

.modal-close {
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 22px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
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

.forgot-password-step {
  display: block;
}

.step-text {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

.step-text.compact {
  margin-bottom: 8px;
}

.masked-email {
  margin: 0 0 20px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.required-mark {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 13px 14px;
  color: #0f172a;
  font-size: 14px;
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  outline: none;
}

.code-row {
  display: flex;
  gap: 8px;
}

.code-row .form-input {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid transparent;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
}

.btn-outline {
  color: #94a3b8;
  background: #fff;
  border-color: #d9e2ec;
}

.modal-action-btn {
  width: 100%;
}

.success-step {
  text-align: center;
}

.success-icon-wrap {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  background: #d1fae5;
  border-radius: 50%;
}

.success-icon {
  width: 40px;
  height: 40px;
}

.success-title {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

@media (max-width: 640px) {
  .forgot-password-shell {
    margin: 24px auto;
    width: calc(100vw - 24px);
  }

  .forgot-password-body {
    padding: 22px 18px;
  }
}
</style>

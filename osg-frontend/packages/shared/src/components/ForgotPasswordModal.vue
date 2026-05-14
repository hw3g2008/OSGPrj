<template>
  <a-modal
    :open="open"
    :width="450"
    :footer="null"
    :mask-closable="false"
    :destroy-on-close="true"
    centered
    wrap-class-name="osg-forgot-password-modal"
    :body-style="{ padding: '4px 26px 26px' }"
    @update:open="onOpenChange"
  >
    <template #title>
      <span class="osg-fp-title" data-surface-part="header">
        <i class="mdi mdi-key" aria-hidden="true"></i>
        <span>{{ $t('retrieve_password') }}</span>
      </span>
    </template>

    <div
      class="osg-fp-body"
      data-surface-id="modal-forgot-password"
      data-surface-part="shell"
    >
      <!-- 3 step dots progress (原型 SSOT 三个圆点) -->
      <div class="osg-fp-dots" aria-hidden="true">
        <div
          id="fp-dot-1"
          class="osg-fp-dot"
          :class="{ active: currentStep >= 1 }"
        ></div>
        <div
          id="fp-dot-2"
          class="osg-fp-dot"
          :class="{ active: currentStep >= 2 }"
        ></div>
        <div
          id="fp-dot-3"
          class="osg-fp-dot"
          :class="{ active: currentStep >= 3 }"
        ></div>
      </div>

      <!-- Alert (error / success) -->
      <a-alert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        show-icon
        class="osg-fp-alert"
      />
      <a-alert
        v-else-if="successMessage"
        type="success"
        :message="successMessage"
        show-icon
        class="osg-fp-alert"
      />

      <!-- Step 1: 邮箱 -->
      <div v-if="currentStep === 1" id="fp-step-1" class="osg-fp-step">
        <p class="osg-fp-step-text">{{ $t('please_enter_your_registered_email_and_w') }}</p>
        <a-form layout="vertical" @submit.prevent="handleSendCode">
          <a-form-item
            :label="$t('email_address')"
            :validate-status="emailError ? 'error' : ''"
            :help="emailError || undefined"
            required
          >
            <a-input
              id="fp-email"
              v-model:value="step1Form.email"
              type="email"
              :placeholder="$t('please_enter_your_registered_email_addre')"
              autocomplete="email"
              size="large"
              :disabled="sendingCode"
            />
          </a-form-item>
          <a-button
            id="fp-send-code-btn"
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="sendingCode"
          >
            <template v-if="!sendingCode" #icon>
              <i class="mdi mdi-email-fast" aria-hidden="true"></i>
            </template>
            {{ $t('send_verification_code') }}
          </a-button>
        </a-form>
      </div>

      <!-- Step 2: 验证码 -->
      <div v-else-if="currentStep === 2" id="fp-step-2" class="osg-fp-step">
        <p class="osg-fp-step-text osg-fp-step-text--compact">{{ $t('verification_code_has_been_sent_to') }}</p>
        <p class="osg-fp-masked-email">{{ maskedEmail }}</p>
        <a-form layout="vertical" @submit.prevent="handleVerifyCode">
          <a-form-item
            :label="$t('verification_code')"
            :validate-status="codeError ? 'error' : ''"
            :help="codeError || undefined"
            required
          >
            <div class="osg-fp-code-row">
              <a-input
                id="fp-code"
                v-model:value="step2Form.code"
                type="text"
                :placeholder="$t('please_enter_the_6_digit_verification_co_2')"
                :maxlength="6"
                size="large"
                :disabled="verifying"
              />
              <a-button
                id="fp-resend-btn"
                type="default"
                size="large"
                :disabled="resendMeta.disabled || sendingCode"
                :loading="sendingCode"
                @click="handleResendCode"
              >
                {{ resendMeta.label }}
              </a-button>
            </div>
          </a-form-item>
          <a-button
            id="fp-verify-code-btn"
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="verifying"
          >
            <template v-if="!verifying" #icon>
              <i class="mdi mdi-check" aria-hidden="true"></i>
            </template>
            {{ $t('verify') }}
          </a-button>
        </a-form>
      </div>

      <!-- Step 3: 新密码 + 确认密码 -->
      <div v-else-if="currentStep === 3" id="fp-step-3" class="osg-fp-step">
        <p class="osg-fp-step-text">{{ $t('please_set_your_new_password') }}</p>
        <a-form layout="vertical" @submit.prevent="handleResetPassword">
          <a-form-item label="新密码" required>
            <a-input-password
              id="fp-new-pwd"
              v-model:value="step3Form.newPassword"
              :placeholder="`8-20 ${$t('bits_including_letters_and_numbers')}`"
              size="large"
              autocomplete="new-password"
              :disabled="resetting"
            />
          </a-form-item>
          <a-form-item
            :label="$t('confirm_password')"
            :validate-status="confirmError ? 'error' : ''"
            :help="confirmError || undefined"
            required
          >
            <a-input-password
              id="fp-confirm-pwd"
              v-model:value="step3Form.confirmPassword"
              :placeholder="$t('please_enter_new_password_again')"
              size="large"
              autocomplete="new-password"
              :disabled="resetting"
            />
          </a-form-item>
          <a-button
            id="fp-reset-password-btn"
            type="primary"
            html-type="submit"
            block
            size="large"
            :loading="resetting"
          >
            <template v-if="!resetting" #icon>
              <i class="mdi mdi-lock-reset" aria-hidden="true"></i>
            </template>
            {{ $t('reset_password') }}
          </a-button>
        </a-form>
      </div>

      <!-- Step 4: 成功 -->
      <div
        v-else-if="currentStep === 4"
        id="fp-step-4"
        class="osg-fp-step osg-fp-step--success"
      >
        <div class="osg-fp-success-icon-wrap">
          <i class="mdi mdi-check-circle" aria-hidden="true"></i>
        </div>
        <h3 class="osg-fp-success-title">{{ $t('password_reset_successful') }}</h3>
        <p class="osg-fp-step-text">{{ $t('your_password_has_been_reset_successfull') }}</p>
        <a-button type="primary" block size="large" @click="closeModal">
          {{ $t('return_to_login') }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import {
  useForgotPasswordFlow,
  type ForgotPasswordEndpoints,
} from '../composables/useForgotPasswordFlow'

interface Props {
  /** 是否打开 modal（v-model:open） */
  open: boolean
  /** 各端注入的 API endpoints */
  endpoints: ForgotPasswordEndpoints
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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
  resendMeta,
  handleSendCode,
  handleVerifyCode,
  handleResendCode,
  handleResetPassword,
  reset,
} = useForgotPasswordFlow({
  endpoints: props.endpoints,
})

const closeModal = () => {
  emit('update:open', false)
}

const onOpenChange = (value: boolean) => {
  emit('update:open', value)
}

// 关闭时复位流程，避免下次打开时残留旧状态
watch(
  () => props.open,
  (next) => {
    if (!next) reset()
  },
)
</script>

<style scoped lang="scss">
.osg-fp-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;

  .mdi {
    font-size: 18px;
  }
}

.osg-fp-body {
  padding: 4px 0;
}

.osg-fp-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.osg-fp-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: background 0.2s ease;

  &.active {
    background: #7399c6;
  }
}

.osg-fp-alert {
  margin-bottom: 16px;
}

.osg-fp-step {
  &--success {
    text-align: center;
  }
}

.osg-fp-step-text {
  text-align: center;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 20px;

  &--compact {
    margin-bottom: 8px;
  }
}

.osg-fp-masked-email {
  text-align: center;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1e293b;
}

.osg-fp-code-row {
  display: flex;
  gap: 8px;

  :deep(.ant-input) {
    flex: 1;
  }
}

.osg-fp-success-icon-wrap {
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
    color: #059669;
  }
}

.osg-fp-success-title {
  font-size: 18px;
  margin-bottom: 8px;
  color: #1e293b;
}
</style>


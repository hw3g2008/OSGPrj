<template>
  <OverlaySurfaceModal
    surface-id="modal-forgot-password"
    :open="visible"
    variant="accent"
    :show-footer="false"
    :closable="currentStep < 4"
    :mask-closable="false"
    width="450px"
    @cancel="handleClose"
  >
    <template #title>
      <span class="forgot-modal__title">
        <span class="mdi mdi-key forgot-modal__title-icon" aria-hidden="true" />
        <span>找回密码</span>
      </span>
    </template>

    <div class="forgot-modal">
      <div v-if="currentStep < 4" class="forgot-modal__dots" data-content-part="progress-indicator">
        <span
          v-for="dot in 3"
          :key="dot"
          class="forgot-modal__dot"
          :class="{
            'forgot-modal__dot--completed': currentStep > dot,
            'forgot-modal__dot--active': currentStep === dot,
          }"
        />
      </div>

      <div v-if="currentStep === 1" class="forgot-modal__step">
        <p class="forgot-modal__hint" data-content-part="supporting-text">请输入您的注册邮箱，我们将发送验证码</p>
        <a-form
          ref="emailFormRef"
          data-content-part="field-group"
          :model="formState"
          :rules="emailRules"
          layout="vertical"
          :required-mark="false"
        >
          <a-form-item name="email">
            <template #label>
              <label class="forgot-modal__label">邮箱地址 <span class="forgot-modal__required">*</span></label>
            </template>
            <a-input v-model:value="formState.email" placeholder="请输入注册邮箱" />
          </a-form-item>
        </a-form>
        <a-button
          data-content-part="action-row"
          type="primary"
          size="large"
          block
          :loading="loading"
          class="forgot-modal__primary-btn"
          @click="handleSendCode"
        >
          <span class="mdi mdi-email-fast" aria-hidden="true" />
          <span>发送验证码</span>
        </a-button>
      </div>

      <div v-else-if="currentStep === 2" class="forgot-modal__step">
        <p class="forgot-modal__hint forgot-modal__hint--compact" data-content-part="supporting-text">验证码已发送至</p>
        <p class="forgot-modal__masked-email" data-content-part="supporting-text">{{ maskedEmail }}</p>
        <a-form
          ref="codeFormRef"
          data-content-part="field-group"
          :model="formState"
          :rules="codeRules"
          layout="vertical"
          :required-mark="false"
        >
          <a-form-item name="code">
            <template #label>
              <label class="forgot-modal__label">验证码 <span class="forgot-modal__required">*</span></label>
            </template>
            <div class="forgot-modal__code-row">
              <a-input
                v-model:value="formState.code"
                placeholder="请输入6位验证码"
                size="large"
                :maxlength="6"
              />
              <a-button
                size="large"
                class="forgot-modal__resend-btn"
                :disabled="countdown > 0"
                @click="handleResendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
              </a-button>
            </div>
          </a-form-item>
        </a-form>
        <a-button
          data-content-part="action-row"
          type="primary"
          size="large"
          block
          :loading="loading"
          class="forgot-modal__primary-btn"
          @click="handleVerifyCode"
        >
          <span class="mdi mdi-check" aria-hidden="true" />
          <span>验证</span>
        </a-button>
      </div>

      <div v-else-if="currentStep === 3" class="forgot-modal__step">
        <p class="forgot-modal__hint" data-content-part="supporting-text">请设置您的新密码</p>
        <a-form
          ref="passwordFormRef"
          data-content-part="field-group"
          :model="formState"
          :rules="passwordRules"
          layout="vertical"
          :required-mark="false"
        >
          <a-form-item name="password">
            <template #label>
              <label class="forgot-modal__label">新密码 <span class="forgot-modal__required">*</span></label>
            </template>
            <a-input-password
              v-model:value="formState.password"
              placeholder="8-20位，包含字母和数字"
              size="large"
              :visibility-toggle="false"
            />
          </a-form-item>
          <a-form-item name="confirmPassword">
            <template #label>
              <label class="forgot-modal__label">确认密码 <span class="forgot-modal__required">*</span></label>
            </template>
            <a-input-password
              v-model:value="formState.confirmPassword"
              placeholder="请再次输入新密码"
              size="large"
              :visibility-toggle="false"
            />
          </a-form-item>
        </a-form>

        <div class="forgot-modal__rules">
          <div class="forgot-modal__rule" :class="{ 'forgot-modal__rule--valid': passwordLength }">
            <CheckCircleFilled />
            <span>8-20位字符</span>
          </div>
          <div class="forgot-modal__rule" :class="{ 'forgot-modal__rule--valid': hasLetter }">
            <CheckCircleFilled />
            <span>包含字母</span>
          </div>
          <div class="forgot-modal__rule" :class="{ 'forgot-modal__rule--valid': hasNumber }">
            <CheckCircleFilled />
            <span>包含数字</span>
          </div>
        </div>

        <a-button
          data-content-part="action-row"
          type="primary"
          size="large"
          block
          :loading="loading"
          class="forgot-modal__primary-btn"
          @click="handleResetPassword"
        >
          <span class="mdi mdi-lock-reset" aria-hidden="true" />
          <span>重置密码</span>
        </a-button>
      </div>

      <div v-else class="forgot-modal__success">
        <div class="forgot-modal__success-badge">
          <CheckCircleFilled />
        </div>
        <h3>密码重置成功</h3>
        <p data-content-part="supporting-text">您的密码已成功重置，请使用新密码登录</p>
        <a-button
          data-content-part="action-row"
          type="primary"
          size="large"
          block
          class="forgot-modal__primary-btn"
          @click="handleBackToLogin"
        >
          返回登录
        </a-button>
      </div>
    </div>
  </OverlaySurfaceModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleFilled } from '@ant-design/icons-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { sendResetCode, verifyResetCode, resetPassword } from '@/api/password'
import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible'])

const emailFormRef = ref<FormInstance>()
const codeFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

const loading = ref(false)
const currentStep = ref(1)
const countdown = ref(0)
const resetToken = ref('')
let countdownTimer: ReturnType<typeof setInterval> | null = null

const formState = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
})

const maskedEmail = computed(() => {
  if (!formState.email) return ''
  const [local, domain] = formState.email.split('@')
  if (!domain) return formState.email
  return `${local.charAt(0)}***@${domain}`
})

const passwordLength = computed(() => {
  const len = formState.password.length
  return len >= 8 && len <= 20
})
const hasLetter = computed(() => /[a-zA-Z]/.test(formState.password))
const hasNumber = computed(() => /[0-9]/.test(formState.password))

const emailRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱地址' },
    { type: 'email', message: '请输入正确的邮箱格式' },
  ],
}

const codeRules: Record<string, Rule[]> = {
  code: [
    { required: true, message: '请输入验证码' },
    { len: 6, message: '验证码为6位' },
  ],
}

const validatePassword = (_rule: Rule, value: string) => {
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20) return Promise.reject('密码长度需为8-20字符')
  if (!/[a-zA-Z]/.test(value)) return Promise.reject('密码需包含字母')
  if (!/[0-9]/.test(value)) return Promise.reject('密码需包含数字')
  return Promise.resolve()
}

const validateConfirmPassword = (_rule: Rule, value: string) => {
  if (!value) return Promise.reject('请再次输入新密码')
  if (value !== formState.password) return Promise.reject('两次输入的密码不一致')
  return Promise.resolve()
}

const passwordRules: Record<string, Rule[]> = {
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const handleSendCode = async () => {
  try {
    await emailFormRef.value?.validate()
    loading.value = true
    await sendResetCode({ email: formState.email })
    message.success('我们会往您的注册邮箱发送验证码，请查收')
    currentStep.value = 2
    startCountdown()
  } catch (error: any) {
    if (!error?.errorFields) message.error(error?.message || '发送失败')
  } finally {
    loading.value = false
  }
}

const handleResendCode = async () => {
  loading.value = true
  try {
    await sendResetCode({ email: formState.email })
    message.success('我们会往您的注册邮箱发送验证码，请查收')
    startCountdown()
  } catch (error: any) {
    message.error(error?.message || '发送失败')
  } finally {
    loading.value = false
  }
}

const handleVerifyCode = async () => {
  try {
    await codeFormRef.value?.validate()
    loading.value = true
    const res = await verifyResetCode({ email: formState.email, code: formState.code })
    resetToken.value = res.resetToken
    currentStep.value = 3
  } catch (error: any) {
    if (!error?.errorFields) message.error(error?.message || '验证失败')
  } finally {
    loading.value = false
  }
}

const handleResetPassword = async () => {
  try {
    await passwordFormRef.value?.validate()
    loading.value = true
    await resetPassword({
      email: formState.email,
      password: formState.password,
      resetToken: resetToken.value,
    })
    currentStep.value = 4
  } catch (error: any) {
    if (!error?.errorFields) message.error(error?.message || '重置失败')
  } finally {
    loading.value = false
  }
}

const handleBackToLogin = () => {
  emit('update:visible', false)
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentStep.value = 1
      formState.email = ''
      formState.code = ''
      formState.password = ''
      formState.confirmPassword = ''
      resetToken.value = ''
      countdown.value = 0
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  },
)
</script>

<style scoped lang="scss">
.forgot-modal {
  &__title {
    display: block;
    line-height: normal;
  }

  &__title-icon {
    margin-right: 8px;
    font-size: inherit;
    line-height: normal;
  }

  &__dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border, #E2E8F0);
    transition: background-color 0.2s ease;

    &--completed {
      background: #22C55E;
    }

    &--active {
      background: var(--primary, #6366F1);
    }
  }

  &__hint {
    margin: 0 0 20px;
    text-align: center;
    color: var(--text2, #64748B);
    font-size: 14px;
    line-height: 20px;

    &--compact {
      margin-bottom: 8px;
    }
  }

  &__label {
    display: inline;
    color: var(--text, #1e293b);
    font-size: 16px;
    font-weight: 400;
    line-height: normal;
  }

  &__required {
    color: #ef4444;
  }

  &__masked-email {
    margin: 0 0 20px;
    text-align: center;
    font-weight: 600;
    color: var(--text, #1E293B);
    line-height: normal;
  }

  &__code-row {
    display: flex;
    gap: 8px;
    align-items: center;

    :deep(.ant-input-affix-wrapper),
    :deep(.ant-input) {
      flex: 1;
    }
  }

  &__resend-btn {
    min-width: 88px;
    white-space: nowrap;
    border-radius: 10px;
    border-color: var(--border, #E2E8F0);
    color: var(--text2, #64748B);
  }

  &__rules {
    padding: 12px;
    margin-bottom: 16px;
    border-radius: 8px;
    background: #E8F0F8;
    color: #1E40AF;
    font-size: 12px;
  }

  &__rule {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    opacity: 0.9;

    &:last-child {
      margin-bottom: 0;
    }

    .anticon {
      font-size: 14px;
    }

    &--valid {
      opacity: 1;
      font-weight: 600;
    }
  }

  &__primary-btn {
    min-height: 40px;
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    background: var(--primary-gradient, linear-gradient(135deg, #4F46E5, #8B5CF6));
    box-shadow: none;

    &:hover,
    &:focus {
      background: var(--primary-gradient, linear-gradient(135deg, #4F46E5, #8B5CF6));
      opacity: 0.96;
    }
  }

  &__success {
    padding: 4px 0 0;
    text-align: center;

    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #1E293B);
    }

    p {
      margin: 0 0 20px;
      color: var(--text2, #64748B);
      font-size: 14px;
    }
  }

  &__success-badge {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #D1FAE5;

    .anticon {
      font-size: 40px;
      color: #059669;
    }
  }
}
</style>

<style lang="scss">
[data-surface-id="modal-forgot-password"] .ant-input,
[data-surface-id="modal-forgot-password"] .ant-input-affix-wrapper {
  height: 44px;
  line-height: normal !important;
}

[data-surface-id="modal-forgot-password"] .ant-btn.forgot-modal__primary-btn {
  justify-content: flex-start !important;
  line-height: normal !important;
}

[data-surface-id="modal-forgot-password"] .ant-btn.forgot-modal__primary-btn > span {
  line-height: normal !important;
}
</style>

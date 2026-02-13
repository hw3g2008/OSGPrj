<template>
  <a-modal
    :open="visible"
    title="找回密码"
    :footer="null"
    :closable="currentStep < 4"
    :mask-closable="false"
    @cancel="handleClose"
    width="420px"
  >
    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <span
        v-for="i in 3"
        :key="i"
        class="step-dot"
        :class="{ active: currentStep >= i, completed: currentStep > i }"
      />
    </div>

    <!-- Step 1: 输入邮箱 -->
    <div v-if="currentStep === 1" class="step-content">
      <p class="step-hint">请输入您的注册邮箱，我们将发送验证码</p>
      <a-form ref="emailFormRef" :model="formState" :rules="emailRules">
        <a-form-item name="email">
          <a-input
            v-model:value="formState.email"
            placeholder="请输入邮箱地址"
            size="large"
          />
        </a-form-item>
      </a-form>
      <a-button type="primary" block size="large" :loading="loading" @click="handleSendCode">
        发送验证码
      </a-button>
    </div>

    <!-- Step 2: 输入验证码 -->
    <div v-if="currentStep === 2" class="step-content">
      <p class="step-hint">验证码已发送至 {{ maskedEmail }}</p>
      <a-form ref="codeFormRef" :model="formState" :rules="codeRules">
        <a-form-item name="code">
          <a-input
            v-model:value="formState.code"
            placeholder="请输入6位验证码"
            size="large"
            :maxlength="6"
          />
        </a-form-item>
      </a-form>
      <div class="resend-row">
        <a-button
          type="link"
          :disabled="countdown > 0"
          @click="handleResendCode"
        >
          {{ countdown > 0 ? `${countdown}秒后重新发送` : '重新发送' }}
        </a-button>
      </div>
      <a-button type="primary" block size="large" :loading="loading" @click="handleVerifyCode">
        验证
      </a-button>
    </div>

    <!-- Step 3: 设置新密码 -->
    <div v-if="currentStep === 3" class="step-content">
      <p class="step-hint">请设置您的新密码</p>
      <a-form ref="passwordFormRef" :model="formState" :rules="passwordRules">
        <a-form-item name="password">
          <a-input-password
            v-model:value="formState.password"
            placeholder="8-20位，包含字母和数字"
            size="large"
          />
        </a-form-item>
        <a-form-item name="confirmPassword">
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="请再次输入新密码"
            size="large"
          />
        </a-form-item>
      </a-form>
      <div class="password-rules">
        <div class="rule-item" :class="{ valid: passwordLength }">8-20位字符</div>
        <div class="rule-item" :class="{ valid: hasLetter }">包含字母</div>
        <div class="rule-item" :class="{ valid: hasNumber }">包含数字</div>
      </div>
      <a-button type="primary" block size="large" :loading="loading" @click="handleResetPassword">
        重置密码
      </a-button>
    </div>

    <!-- Step 4: 完成 -->
    <div v-if="currentStep === 4" class="step-content success-step">
      <div class="success-icon">
        <CheckCircleFilled />
      </div>
      <h3>密码重置成功</h3>
      <p>您的密码已成功重置，请使用新密码登录</p>
      <a-button type="primary" block size="large" @click="handleBackToLogin">
        返回登录
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleFilled } from '@ant-design/icons-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { sendResetCode, verifyResetCode, resetPassword } from '@/api/password'

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
  confirmPassword: ''
})

// 脱敏邮箱
const maskedEmail = computed(() => {
  if (!formState.email) return ''
  const [local, domain] = formState.email.split('@')
  if (!domain) return formState.email
  return `${local.charAt(0)}***@${domain}`
})

// 密码规则验证
const passwordLength = computed(() => {
  const len = formState.password.length
  return len >= 8 && len <= 20
})
const hasLetter = computed(() => /[a-zA-Z]/.test(formState.password))
const hasNumber = computed(() => /[0-9]/.test(formState.password))

// 表单校验规则
const emailRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱地址' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ]
}

const codeRules: Record<string, Rule[]> = {
  code: [
    { required: true, message: '请输入验证码' },
    { len: 6, message: '验证码为6位' }
  ]
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
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

// Step 1: 发送验证码
const handleSendCode = async () => {
  try {
    await emailFormRef.value?.validate()
    loading.value = true
    await sendResetCode({ email: formState.email })
    message.success('验证码已发送')
    currentStep.value = 2
    startCountdown()
  } catch (error: any) {
    if (!error?.errorFields) message.error(error?.message || '发送失败')
  } finally {
    loading.value = false
  }
}

// Step 2: 重新发送
const handleResendCode = async () => {
  loading.value = true
  try {
    await sendResetCode({ email: formState.email })
    message.success('验证码已重新发送')
    startCountdown()
  } catch {
    message.error('发送失败')
  } finally {
    loading.value = false
  }
}

// Step 2: 验证验证码
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

// Step 3: 重置密码
const handleResetPassword = async () => {
  try {
    await passwordFormRef.value?.validate()
    loading.value = true
    await resetPassword({
      email: formState.email,
      password: formState.password,
      resetToken: resetToken.value
    })
    currentStep.value = 4
  } catch (error: any) {
    if (!error?.errorFields) message.error(error?.message || '重置失败')
  } finally {
    loading.value = false
  }
}

// Step 4: 返回登录
const handleBackToLogin = () => {
  emit('update:visible', false)
}

const handleClose = () => {
  emit('update:visible', false)
}

// 重置状态
watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentStep.value = 1
      formState.email = ''
      formState.code = ''
      formState.password = ''
      formState.confirmPassword = ''
      countdown.value = 0
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  }
)
</script>

<style scoped lang="scss">
.step-indicator {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;

  .step-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #e0e0e0;
    transition: all 0.3s;

    &.active {
      background: #1890ff;
    }

    &.completed {
      background: #52c41a;
    }
  }
}

.step-content {
  .step-hint {
    text-align: center;
    color: #666;
    margin-bottom: 20px;
  }

  .resend-row {
    text-align: right;
    margin-bottom: 16px;
  }

  .password-rules {
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 20px;

    .rule-item {
      color: #666;
      font-size: 13px;
      padding: 2px 0;

      &::before {
        content: '○';
        margin-right: 8px;
      }

      &.valid {
        color: #52c41a;

        &::before {
          content: '●';
        }
      }
    }
  }
}

.success-step {
  text-align: center;
  padding: 20px 0;

  .success-icon {
    font-size: 64px;
    color: #52c41a;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    color: #666;
    margin-bottom: 24px;
  }
}
</style>

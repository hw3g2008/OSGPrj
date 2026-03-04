<template>
  <div class="login-page">
    <div class="login-left">
      <h1>OSG Admin</h1>
      <p>后台管理系统</p>
      <div class="features">
        <div class="feature-item">
          <CheckCircleFilled />
          <span>学员与导师管理</span>
        </div>
        <div class="feature-item">
          <CheckCircleFilled />
          <span>课程与财务结算</span>
        </div>
        <div class="feature-item">
          <CheckCircleFilled />
          <span>岗位与资源管理</span>
        </div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              <path d="M12 8L15 13.2L18 10.5L17.3 14H6.7L6 10.5L9 13.2L12 8M12 4L8.5 10L3 5L5 16H19L21 5L15.5 10L12 4M19 18H5V19C5 19.6 5.4 20 6 20H18C18.6 20 19 19.6 19 19V18Z" />
            </svg>
          </div>
          <span>OSG Admin</span>
        </div>
        <h2 class="login-title">管理员登录</h2>
        <p class="login-subtitle">请输入您的账号信息</p>

        <a-form
          ref="formRef"
          :model="formState"
          :rules="rules"
          @finish="handleSubmit"
        >
          <a-form-item name="username">
            <a-input
              v-model:value="formState.username"
              placeholder="请输入用户名"
              size="large"
              :maxlength="50"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item name="password">
            <a-input-password
              v-model:value="formState.password"
              placeholder="请输入密码"
              size="large"
              :maxlength="20"
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="captchaEnabled" name="code">
            <div class="captcha-row">
              <a-input
                class="captcha-input"
                v-model:value="formState.code"
                placeholder="请输入验证码"
                size="large"
                :maxlength="4"
              >
                <template #prefix>
                  <SafetyOutlined />
                </template>
              </a-input>
              <div class="captcha-code" :class="{ 'has-image': !!captchaImg }" @click="refreshCaptcha" title="点击刷新">
                <img v-if="captchaImg" :src="'data:image/jpg;base64,' + captchaImg" alt="验证码" />
                <span v-else>----</span>
              </div>
            </div>
          </a-form-item>

          <a-form-item>
            <div class="login-links">
              <a-checkbox v-model:checked="formState.rememberMe">记住我（7天）</a-checkbox>
              <a class="forgot-link" @click="forgotPasswordVisible = true">忘记密码？</a>
            </div>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              class="login-btn"
              :loading="loading"
              :disabled="loading"
            >
              <span>{{ loading ? '登录中...' : '登录' }}</span>
            </a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>

    <ForgotPasswordModal v-model:visible="forgotPasswordVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  CheckCircleFilled
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import { getCaptchaImage } from '@osg/shared/api/auth'
import ForgotPasswordModal from '@/components/ForgotPasswordModal.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const captchaImg = ref('')
const captchaEnabled = ref(true)
const forgotPasswordVisible = ref(false)

const formState = reactive({
  username: '',
  password: '',
  code: '',
  uuid: '',
  rememberMe: false
})

const rules = computed(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  code: [{ required: captchaEnabled.value, message: '请输入验证码', trigger: 'blur' }]
}))

const handleSubmit = async () => {
  try {
    loading.value = true
    await userStore.login({
      username: formState.username,
      password: formState.password,
      code: formState.code,
      uuid: formState.uuid,
      rememberMe: formState.rememberMe
    })
    message.success('登录成功')
    const redirect = route.query.redirect as string
    router.push(redirect || '/dashboard')
  } catch (error: any) {
    message.error(error.message || '登录失败')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

const refreshCaptcha = async () => {
  try {
    const res = await getCaptchaImage()
    captchaEnabled.value = res.captchaEnabled
    if (res.captchaEnabled) {
      captchaImg.value = res.img || ''
      formState.uuid = res.uuid || ''
    }
  } catch {
    // 验证码获取失败时静默处理
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #8B5CF6 100%);
  color: #fff;

  h1 {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    opacity: 0.9;
  }

  .features {
    margin-top: 40px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      opacity: 0.9;

      :deep(.anticon) {
        font-size: 20px;
      }
    }
  }
}

.login-right {
  width: 480px;
  margin-left: -44px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44px 0 0 44px;
  overflow: hidden;
  position: relative;
  z-index: 1;
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

  .login-logo-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #4F46E5, #8B5CF6);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 24px;
  }

  span {
    font-size: 22px;
    font-weight: 700;
  }
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-subtitle {
  color: #6b7280;
  margin-bottom: 28px;
}

.login-box :deep(.ant-input-affix-wrapper) {
  height: 52px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
}

.login-box :deep(.ant-input-affix-wrapper:hover) {
  border-color: #cbd5e1;
}

.login-box :deep(.ant-input-affix-wrapper-focused),
.login-box :deep(.ant-input-affix-wrapper:focus-within) {
  border-color: #6366f1;
  box-shadow: none;
}

.login-box :deep(.ant-input),
.login-box :deep(.ant-input-password input) {
  background: transparent;
  font-size: 15px;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .captcha-input {
    flex: 1;
    min-width: 0;
  }

  .captcha-input :deep(.ant-input-affix-wrapper) {
    width: 100%;
  }

  .captcha-code {
    position: relative;
    flex: 0 0 120px;
    width: 120px;
    height: 52px;
    padding: 0 20px;
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 4px;
    color: #4F46E5;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }

  .captcha-code.has-image {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  }

  .captcha-code img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
    clip-path: inset(2px 8px 2px 8px round 8px);
    mix-blend-mode: normal;
    opacity: 1;
    background: transparent;
  }

  .captcha-code span {
    display: inline-block;
    width: 100%;
    text-align: center;
  }
}

.login-links {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .forgot-link {
    color: #4F46E5;
    cursor: pointer;
    font-size: 13px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.login-btn {
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #4F46E5, #8B5CF6);
  border: none;
}
</style>

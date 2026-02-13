<template>
  <div class="login-container">
    <div class="login-left">
      <div class="brand">
        <h1>OSG Admin</h1>
        <p class="subtitle">后台管理系统</p>
        <div class="features">
          <div class="feature-item">
            <UserOutlined />
            <span>学员与导师管理</span>
          </div>
          <div class="feature-item">
            <DollarOutlined />
            <span>课程与财务结算</span>
          </div>
          <div class="feature-item">
            <FileOutlined />
            <span>岗位与资源管理</span>
          </div>
        </div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-form-wrapper">
        <h2>欢迎登录</h2>
        <a-form
          ref="formRef"
          :model="formState"
          :rules="rules"
          @finish="handleLogin"
        >
          <a-form-item name="username">
            <a-input
              v-model:value="formState.username"
              placeholder="请输入账号"
              size="large"
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
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item name="code">
            <div class="captcha-row">
              <a-input
                v-model:value="formState.code"
                placeholder="请输入验证码"
                size="large"
                style="flex: 1"
              >
                <template #prefix>
                  <SafetyOutlined />
                </template>
              </a-input>
              <div class="captcha-img" @click="refreshCaptcha">
                <img v-if="captchaImg" :src="captchaImg" alt="验证码" />
                <span v-else class="captcha-text">{{ captchaText }}</span>
              </div>
            </div>
          </a-form-item>

          <a-form-item>
            <div class="form-options">
              <a-checkbox v-model:checked="formState.rememberMe">记住我</a-checkbox>
              <a class="forgot-link" @click="showForgotModal = true">忘记密码？</a>
            </div>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
            >
              {{ loading ? '登录中...' : '登录' }}
            </a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>

    <!-- 忘记密码弹窗 -->
    <ForgotPasswordModal v-model:visible="showForgotModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  DollarOutlined,
  FileOutlined
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import ForgotPasswordModal from '@/components/ForgotPasswordModal.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const showForgotModal = ref(false)
const captchaImg = ref('')
const captchaText = ref('')
const captchaUuid = ref('')

const formState = reactive({
  username: '',
  password: '',
  code: '',
  rememberMe: false
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

// 生成简单验证码（前端模拟）
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaText.value = code
  captchaUuid.value = Date.now().toString()
}

const refreshCaptcha = () => {
  generateCaptcha()
}

const handleLogin = async () => {
  try {
    loading.value = true

    // 验证码校验（前端模拟）
    if (formState.code.toUpperCase() !== captchaText.value) {
      message.error('验证码错误')
      refreshCaptcha()
      return
    }

    await userStore.login({
      username: formState.username,
      password: formState.password,
      code: formState.code,
      uuid: captchaUuid.value
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

onMounted(() => {
  generateCaptcha()
})
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

.login-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;

  .brand {
    text-align: center;

    h1 {
      font-size: 48px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 20px;
      opacity: 0.9;
      margin-bottom: 48px;
    }

    .features {
      .feature-item {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 16px;
        margin-bottom: 16px;
        opacity: 0.9;

        :deep(.anticon) {
          font-size: 20px;
        }
      }
    }
  }
}

.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;

  .login-form-wrapper {
    width: 400px;
    padding: 40px;

    h2 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 32px;
      text-align: center;
      color: #333;
    }
  }
}

.captcha-row {
  display: flex;
  gap: 12px;

  .captcha-img {
    width: 120px;
    height: 40px;
    cursor: pointer;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    user-select: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .captcha-text {
      font-size: 20px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #1890ff;
      font-family: 'Courier New', monospace;
    }
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .forgot-link {
    color: #1890ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>

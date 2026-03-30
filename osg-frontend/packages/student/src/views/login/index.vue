<template>
  <div class="login-page">
    <div class="login-left">
      <h1>OSG</h1>
      <p>One Strategy Group 求职辅导平台，助力您的职业发展</p>
      <div class="login-features">
        <div class="login-feature">
          <i class="mdi mdi-briefcase-check" aria-hidden="true"></i>
          <span>专业求职辅导</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-account-group" aria-hidden="true"></i>
          <span>资深导师团队</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-chart-line" aria-hidden="true"></i>
          <span>全程进度跟踪</span>
        </div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <i class="mdi mdi-school" aria-hidden="true"></i>
          </div>
          <span>学员中心</span>
        </div>
        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">请登录您的学员账号</p>

        <div id="login-error" class="login-error" :class="{ show: Boolean(loginError) }">
          <i class="mdi mdi-alert-circle" aria-hidden="true"></i>
          <span>{{ loginError }}</span>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="formState.username"
              :class="inputClass(fieldErrors.username)"
              type="text"
              placeholder="请输入用户名"
              autocomplete="username"
              @input="clearFieldError('username')"
            >
            <p class="field-error" :class="{ show: Boolean(fieldErrors.username) }">
              {{ fieldErrors.username }}
            </p>
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <div class="pwd-wrapper">
              <input
                id="login-password"
                v-model="formState.password"
                :class="inputClass(fieldErrors.password)"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                @input="clearFieldError('password')"
              >
              <button
                type="button"
                class="pwd-toggle"
                @click="showPassword = !showPassword"
              >
                <i
                  class="mdi"
                  :class="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
            <p class="field-error" :class="{ show: Boolean(fieldErrors.password) }">
              {{ fieldErrors.password }}
            </p>
          </div>

          <div class="login-links">
            <label>
              <input v-model="formState.remember" type="checkbox">
              记住我
            </label>
            <router-link to="/forgot-password">忘记密码？</router-link>
          </div>

          <button id="login-btn" type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </form>

        <div class="copyright">
          备案号 <a href="https://beian.miit.gov.cn/" target="_blank">冀ICP备17000879号-4</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { studentLogin, getInfo } from '@osg/shared/api'
import { setToken, setUser } from '@osg/shared/utils'
import {
  hasLoginErrors,
  submitLogin,
  validateLoginForm
} from './login-workflow'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const loginError = ref('')
const showPassword = ref(false)
const fieldErrors = reactive<Record<string, string>>({
  username: '',
  password: ''
})

const formState = reactive({
  username: '',
  password: '',
  remember: false
})

const inputClass = (error: string) => ['form-input', { error: Boolean(error) }]

const clearFieldError = (field: string) => {
  loginError.value = ''
  fieldErrors[field] = ''
}

const syncFieldErrors = () => {
  const nextFieldErrors = validateLoginForm(formState)
  fieldErrors.username = nextFieldErrors.username
  fieldErrors.password = nextFieldErrors.password
  return nextFieldErrors
}

const handleLogin = async () => {
  loginError.value = ''
  const nextFieldErrors = syncFieldErrors()

  if (hasLoginErrors(nextFieldErrors)) {
    return
  }

  loading.value = true
  const result = await submitLogin(
    {
      username: formState.username,
      password: formState.password
    },
    route.query.redirect as string | undefined,
    {
      login: studentLogin,
      getInfo,
      setToken,
      setUser,
      push: (target: string) => router.push(target),
      notifySuccess: (text: string) => message.success(text)
    }
  )
  loading.value = false

  if (!result.ok) {
    loginError.value = result.loginError
  }
}
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

.login-features {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0.9;

  .mdi {
    font-size: 24px;
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
  margin-bottom: 28px;
  font-size: 14px;
}

.login-error {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #991b1b;
  font-size: 13px;
  margin-bottom: 16px;
  display: none;
  align-items: center;
  gap: 8px;

  &.show {
    display: flex;
  }
}

.form-group {
  margin-bottom: 18px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text2);
  }
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
    border-color: #ef4444;
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
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  display: none;

  &.show {
    display: block;
  }
}

.login-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 13px;

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text2);
    cursor: pointer;
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--primary);
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

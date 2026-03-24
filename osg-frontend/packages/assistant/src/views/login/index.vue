<template>
  <div id="login-page" class="login-page">
    <div class="login-decor login-decor--1" />
    <div class="login-decor login-decor--2" />
    <div class="login-decor login-decor--3" />

    <section class="login-left">
      <h1 class="login-left__title">OSG Platform</h1>
      <p class="login-left__desc">职业培训一站式平台，学生与导师共同成长</p>

      <div class="login-features">
        <div class="login-feature">
          <i class="mdi mdi-check-circle" />
          <span>学生端：一对一导师辅导</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-check-circle" />
          <span>导师端：高效课程管理</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-check-circle" />
          <span>实时岗位信息共享</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-check-circle" />
          <span>完善的学习资料库</span>
        </div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <i class="mdi mdi-account-star" />
          </div>
          <span>OSG Assistant</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用您的账号登录（助教）</p>
        <div class="login-role-tag">助教端</div>

        <div v-if="errorMessage" class="login-error">
          <i class="mdi mdi-alert-circle" />
          <span>{{ errorMessage }}</span>
        </div>

        <div class="login-form">
          <div class="form-group">
            <label for="login-username">用户名 / 邮箱</label>
            <input
              id="login-username"
              v-model="formState.username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
              :class="{ error: errors.username }"
              @input="clearFieldError('username')"
              @keydown.enter.prevent="handleLogin"
            />
            <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <div class="pwd-wrapper">
              <input
                id="login-password"
                v-model="formState.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                :class="{ error: errors.password }"
                @input="clearFieldError('password')"
                @keydown.enter.prevent="handleLogin"
              />
              <button type="button" class="pwd-toggle" @click="showPassword = !showPassword">
                <i id="pwd-eye" class="mdi mdi-eye" />
              </button>
            </div>
            <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
          </div>

          <button
            id="login-btn"
            type="button"
            class="login-btn"
            :disabled="loading"
            @click="handleLogin"
          >
            <i v-if="!loading" class="mdi mdi-login" />
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <div class="login-links">
          忘记密码？<router-link to="/forgot-password">点击重置</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@mdi/font/css/materialdesignicons.css'
import { assistantLogin, getAssistantInfo } from '@osg/shared/api'
import { removeToken, removeUser, setToken, setUser } from '@osg/shared/utils'

type FieldKey = 'username' | 'password'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const formState = reactive({
  username: '',
  password: '',
})
const errors = reactive<Record<FieldKey, string>>({
  username: '',
  password: '',
})

function clearFieldError(field: FieldKey) {
  errors[field] = ''
  errorMessage.value = ''
}

function validateForm() {
  const username = formState.username.trim()
  errors.username = username ? '' : '请输入用户名或邮箱'
  errors.password = formState.password ? '' : '请输入密码'
  return !errors.username && !errors.password
}

function canAccessAssistant(roles: string[] | undefined) {
  return roles?.includes('assistant') || roles?.includes('admin')
}

function resolveRedirectTarget() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/home'
}

async function handleLogin() {
  errorMessage.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const payload = {
      username: formState.username.trim(),
      password: formState.password,
    }
    const { token } = await assistantLogin(payload)
    setToken(token)

    const info = await getAssistantInfo()
    if (!canAccessAssistant(info.roles)) {
      removeToken()
      removeUser()
      errorMessage.value = '该账号无助教端访问权限'
      return
    }

    setUser(info.user)
    await router.push(resolveRedirectTarget())
  } catch (error: any) {
    removeToken()
    removeUser()
    errorMessage.value = error?.message || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  --primary: #7399c6;
  --primary-light: #e8f0f8;
  --primary-dark: #5a7ba3;
  --primary-gradient: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  --text: #1e293b;
  --text-secondary: #64748b;
  --muted: #94a3b8;
  --border: #e2e8f0;
  min-height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  animation: login-float 20s linear infinite;
  pointer-events: none;
}

@keyframes login-float {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.login-decor {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.login-decor--1 {
  top: -100px;
  left: -100px;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.05);
}

.login-decor--2 {
  bottom: -80px;
  left: 30%;
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.04);
}

.login-decor--3 {
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

.login-left__title {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: 800;
}

.login-left__desc {
  max-width: 400px;
  margin: 0;
  font-size: 18px;
  opacity: 0.9;
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
  opacity: 0.92;
}

.login-feature i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 24px;
}

.login-right {
  width: 480px;
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
  border-radius: 14px;
  background: var(--primary-gradient);
  color: #fff;
  font-size: 24px;
}

.login-logo span {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}

.login-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.login-subtitle {
  margin: 0 0 28px;
  color: var(--muted);
  font-size: 16px;
}

.login-role-tag {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  margin-bottom: 18px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(115, 153, 198, 0.12);
  color: var(--primary-dark);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 13px;
}

.form-group {
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
  box-sizing: border-box;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-form input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.login-form input.error {
  border-color: #ef4444;
}

.field-error {
  margin: 4px 0 0;
  color: #ef4444;
  font-size: 12px;
}

.pwd-wrapper {
  position: relative;
}

.pwd-wrapper input {
  padding-right: 52px;
}

.pwd-toggle {
  position: absolute;
  top: 50%;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-family: Arial, sans-serif;
  font-size: 18px;
  cursor: pointer;
  transform: translateY(-50%);
}

.pwd-toggle:hover {
  color: var(--primary-dark);
}

.login-btn {
  width: 100%;
  display: block;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.login-btn .mdi {
  margin-right: 8px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-links {
  margin-top: 20px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.login-links a {
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
}

.login-links a:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    padding: 48px 32px 24px;
  }

  .login-right {
    width: 100%;
    border-radius: 24px 24px 0 0;
  }

  .login-box {
    max-width: 520px;
    padding: 32px;
  }
}

@media (max-width: 640px) {
  .login-left {
    padding: 40px 20px 20px;
  }

  .login-left__title {
    font-size: 36px;
  }

  .login-left__desc {
    font-size: 16px;
  }

  .login-features {
    margin-top: 28px;
    gap: 12px;
  }

  .login-right {
    border-radius: 20px 20px 0 0;
  }

  .login-box {
    padding: 24px 20px 32px;
  }
}
</style>

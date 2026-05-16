<template>
  <div class="login-page">
    <div class="login-left">
      <h1>{{ t('student.brand.title') }}</h1>
      <p>{{ t('student.brand.tagline') }}</p>
      <div class="login-features">
        <div class="login-feature">
          <i class="mdi mdi-briefcase-check" aria-hidden="true"></i>
          <span>{{ t('student.login.feature.coaching') }}</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-account-group" aria-hidden="true"></i>
          <span>{{ t('student.login.feature.mentor') }}</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-chart-line" aria-hidden="true"></i>
          <span>{{ t('student.login.feature.tracking') }}</span>
        </div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <i class="mdi mdi-school" aria-hidden="true"></i>
          </div>
          <span>{{ t('student.login.header.portal') }}</span>
        </div>
        <h2 class="login-title">{{ t('student.login.header.welcome') }}</h2>
        <p class="login-subtitle">{{ t('student.login.header.subtitle') }}</p>

        <div
          v-if="loginError"
          id="login-error"
          class="login-error login-error--show"
          role="alert"
        >
          <i class="mdi mdi-alert-circle-outline" aria-hidden="true"></i>
          <span>{{ loginError }}</span>
        </div>

        <form class="login-form" novalidate @submit.prevent="handleLogin">
          <div class="form-group" :class="{ 'has-error': !!fieldErrors.username }">
            <label class="form-label" for="login-username">{{ t('student.login.field.emailLabel') }}</label>
            <div class="input-wrapper">
              <i class="mdi mdi-email-outline input-icon" aria-hidden="true"></i>
              <input
                id="login-username"
                v-model="formState.username"
                type="email"
                class="form-input form-input--with-icon"
                :placeholder="t('student.login.field.emailPlaceholder')"
                autocomplete="email"
                spellcheck="false"
                @input="clearFieldError('username')"
              />
            </div>
            <p v-if="fieldErrors.username" class="form-error-text">{{ fieldErrors.username }}</p>
          </div>

          <div class="form-group" :class="{ 'has-error': !!fieldErrors.password }">
            <label class="form-label" for="login-password">{{ t('student.login.field.passwordLabel') }}</label>
            <div class="pwd-wrapper">
              <i class="mdi mdi-lock-outline input-icon" aria-hidden="true"></i>
              <input
                id="login-password"
                v-model="formState.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input form-input--with-icon form-input--with-toggle"
                :placeholder="t('student.login.field.passwordPlaceholder')"
                autocomplete="current-password"
                spellcheck="false"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="pwd-toggle"
                tabindex="-1"
                :aria-label="showPassword ? t('student.login.field.hidePassword') : t('student.login.field.showPassword')"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <i
                  class="mdi"
                  :class="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
                  aria-hidden="true"
                ></i>
              </button>
            </div>
            <p v-if="fieldErrors.password" class="form-error-text">{{ fieldErrors.password }}</p>
          </div>

          <div class="login-links">
            <label class="remember-me">
              <input v-model="formState.remember" type="checkbox" />
              <span>{{ t('student.login.action.rememberMe') }}</span>
            </label>
            <router-link to="/forgot-password">{{ t('student.login.action.forgotPassword') }}</router-link>
          </div>

          <button
            id="login-btn"
            type="submit"
            class="login-btn"
            :disabled="loading"
          >
            <span>{{ loading ? t('student.login.action.submitting') : t('student.login.action.submit') }}</span>
          </button>
        </form>

        <div class="copyright">
          {{ t('student.brand.icpPrefix') }} <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{{ t('student.brand.icpNumber') }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { studentLogin, getStudentInfo as getInfo } from '@osg/shared/api'
import { setToken, setUser } from '@osg/shared/utils'
import { useMustChangePassword } from '@osg/shared/composables'
import {
  hasLoginErrors,
  submitLogin,
  validateLoginForm
} from './login-workflow'

const { t } = useI18n()
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
      setMustChangePassword: useMustChangePassword().setMustChangePassword,
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.5;

  .mdi {
    font-size: 18px;
    flex-shrink: 0;
  }
}

/* ============================================================
 * 原生表单样式（form-group / pwd-wrapper / pwd-toggle）
 * 用 padding-left:44px 给左侧图标留位、padding-right:44px 给右侧
 * 切换按钮留位，光标永远不会贴到图标，避免之前 a-input-password
 * 出现的「光标顶到眼睛图标」问题。
 * ============================================================ */
.login-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 18px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
}

.input-wrapper,
.pwd-wrapper {
  position: relative;
  display: block;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 18px;
  line-height: 1;
  pointer-events: none;
  transition: color 0.2s ease;
}

.form-input {
  display: block;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  -webkit-appearance: none;
  appearance: none;

  &::placeholder {
    color: var(--muted);
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: #cbd5e1;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-light);
  }

  &:disabled {
    background: #f8fafc;
    color: var(--muted);
    cursor: not-allowed;
  }
}

.form-input--with-icon {
  padding-left: 44px;
}

.form-input--with-toggle {
  padding-right: 44px;
}

/* 让 input focus 时左侧图标也变主色 */
.input-wrapper:focus-within .input-icon,
.pwd-wrapper:focus-within .input-icon {
  color: var(--primary);
}

.pwd-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 8px;
  padding: 0;
  font: inherit;
  line-height: 1;
  transition: color 0.2s ease, background-color 0.2s ease;

  .mdi {
    font-size: 18px;
    line-height: 1;
  }

  &:hover {
    color: var(--primary);
    background: var(--primary-light);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }
}

/* 字段错误状态 */
.form-group.has-error {
  .form-input {
    border-color: var(--danger);

    &:focus {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
    }
  }

  .input-icon {
    color: var(--danger);
  }
}

.form-error-text {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 12px;
  line-height: 1.4;
}

/* 浏览器自动填充时去掉黄色背景，保持白底 */
.form-input:-webkit-autofill,
.form-input:-webkit-autofill:hover,
.form-input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text);
  box-shadow: 0 0 0 1000px #fff inset;
  transition: background-color 5000s ease-in-out 0s;
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
}

.remember-me {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text2);
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--primary);
    cursor: pointer;
  }
}

.login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  padding: 0 16px;
  background: var(--primary-gradient);
  color: #fff;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(115, 153, 198, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--muted);
    cursor: not-allowed;
    opacity: 0.85;
    transform: none;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
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

    &:hover {
      color: var(--primary);
    }
  }
}

@media (max-width: 768px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    padding: 40px 24px;
    flex: none;
  }

  .login-right {
    width: 100%;
    border-radius: 24px 24px 0 0;
  }
}
</style>

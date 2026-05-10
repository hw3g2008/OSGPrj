<template>
  <div id="login-page" class="login-page">
    <div class="login-accent login-accent-left"></div>
    <div class="login-accent login-accent-bottom"></div>
    <div class="login-accent login-accent-right"></div>

    <section class="login-left">
      <h1 class="platform-title">OSG Platform</h1>
      <p class="platform-subtitle">职业培训一站式平台，学生与导师共同成长</p>

      <div class="login-features">
        <div v-for="feature in featureTexts" :key="feature" class="login-feature">
          <span class="mdi mdi-check-circle feature-icon" aria-hidden="true"></span>
          <span>{{ feature }}</span>
        </div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <span class="mdi mdi-account-star logo-icon-glyph" aria-hidden="true"></span>
          </div>
          <span class="login-logo-text">OSG Lead Mentor</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用邮箱登录（主导师/班主任）</p>

        <div v-if="errorMessage" class="login-error" role="alert">
          <span class="mdi mdi-alert-circle error-icon" aria-hidden="true"></span>
          <span>{{ errorMessage }}</span>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">邮箱</label>
            <input
              id="login-username"
              v-model.trim="formState.username"
              type="email"
              placeholder="请输入邮箱"
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <div class="password-field">
              <input
                id="login-password"
                v-model="formState.password"
                :type="passwordVisible ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="visibility-toggle"
                :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                @click="passwordVisible = !passwordVisible"
              >
                <span id="pwd-eye" class="mdi mdi-eye toggle-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <button class="login-btn" type="submit" :disabled="loading">
            <span class="mdi mdi-login button-icon" aria-hidden="true"></span>
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <div class="login-links">
          忘记密码？
          <a
            href="javascript:void(0)"
            class="link-anchor"
            data-surface-trigger="modal-forgot-password"
            @click.prevent="openForgotPassword"
          >
            点击重置
          </a>
        </div>
      </div>
    </section>

    <ForgotPasswordModal
      v-model:open="forgotPasswordOpen"
      :endpoints="forgotPasswordEndpoints"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  getLeadMentorInfo,
  leadMentorLogin,
  resetPassword as resetLeadMentorPassword,
  sendResetCode,
  verifyResetCode,
} from '@osg/shared/api'
import { clearAuth, setToken, setUser } from '@osg/shared/utils'
import { ForgotPasswordModal } from '@osg/shared/components'
import { useMustChangePassword } from '@osg/shared/composables'

const { setMustChangePassword } = useMustChangePassword()

const featureTexts = [
  '学生端：一对一导师辅导',
  '导师端：高效课程管理',
  '实时岗位信息共享',
  '完善的学习资料库',
]

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const passwordVisible = ref(false)
const forgotPasswordOpen = ref(false)
const errorMessage = ref('')
const formState = reactive({ username: '', password: '' })

// M6 P5: forgot-password 业务逻辑由 shared <ForgotPasswordModal> 接管。
// 本端仅注入 endpoints (sendCode/verifyCode/resetPassword)。
const forgotPasswordEndpoints = {
  sendCode: (payload: { email: string }) => sendResetCode(payload),
  verifyCode: (payload: { email: string; code: string }) => verifyResetCode(payload),
  resetPassword: (payload: { email: string; password: string; resetToken: string }) =>
    resetLeadMentorPassword(payload),
}

const openForgotPassword = () => {
  forgotPasswordOpen.value = true
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!formState.username || !formState.password) {
    message.error('请输入邮箱和密码')
    return
  }

  loading.value = true
  try {
    const { token } = await leadMentorLogin({
      username: formState.username.trim(),
      password: formState.password,
    })
    setToken(token)
    const userInfo = await getLeadMentorInfo()
    if (!userInfo.roles?.includes('lead-mentor') && !userInfo.roles?.includes('admin')) {
      clearAuth()
      errorMessage.value = '该账号无班主任端访问权限'
      return
    }
    setUser({
      ...userInfo.user,
      roles: userInfo.roles,
      permissions: userInfo.permissions,
    })
    setMustChangePassword(Boolean(userInfo.mustChangePassword))
    message.success('登录成功')
    router.push((route.query.redirect as string) || '/')
  } catch (error: any) {
    clearAuth()
    errorMessage.value = error?.message || '邮箱或密码错误'
  } finally {
    loading.value = false
  }
}

</script>

<style scoped lang="scss">
.login-page {
  --primary: #7399c6;
  --primary-light: #e8f0f8;
  --primary-dark: #5a7ba3;
  --primary-gradient: linear-gradient(135deg, #7399c6 0%, #9bb8d9 100%);
  --text: #1e293b;
  --text-secondary: #64748b;
  --muted: #94a3b8;
  --border: #e2e8f0;

  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.login-accent {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.login-accent-left {
  top: -100px;
  left: -100px;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.05);
}

.login-accent-bottom {
  bottom: -80px;
  left: 30%;
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.04);
}

.login-accent-right {
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

.platform-title {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
}

.platform-subtitle {
  max-width: 400px;
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  opacity: 0.9;
}

.login-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 40px;
}

.login-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0.9;
}

.feature-icon {
  flex-shrink: 0;
  font-size: 24px;
  line-height: 1;
}

.login-right {
  width: 480px;
  flex-shrink: 0;
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
  background: var(--primary-gradient);
  border-radius: 14px;
  color: #fff;
}

.logo-icon-glyph {
  font-size: 24px;
  line-height: 1;
}

.login-logo-text {
  color: var(--text);
  font-size: 22px;
  font-weight: 700;
}

.login-title {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
}

.login-subtitle {
  margin: 0 0 28px;
  color: var(--muted);
}

.login-error {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.error-icon {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
}

.login-form .form-group {
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
  color: var(--text);
  font-size: 15px;
  background: #fff;
  border: 2px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-form input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 48px;
}

.visibility-toggle {
  position: absolute;
  top: 50%;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transform: translateY(-50%);
}

.toggle-icon {
  font-size: 18px;
  line-height: 1;
}

.visibility-toggle:hover {
  color: var(--primary-dark);
}

.login-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background: var(--primary-gradient);
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.button-icon {
  font-size: 18px;
  line-height: 1;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.login-links {
  margin-top: 20px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.link-anchor {
  margin-left: 4px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

.link-anchor:hover {
  color: var(--primary-dark);
}

@media (max-width: 1120px) {
  .login-page {
    flex-direction: column;
  }

  .login-left {
    width: 100%;
    padding: 48px 32px 24px;
  }

  .login-right {
    width: calc(100% - 48px);
    margin: 0 24px 24px;
    border-radius: 24px;
  }
}

@media (max-width: 640px) {
  .login-left {
    padding: 40px 24px 16px;
  }

  .platform-title {
    font-size: 36px;
  }

  .platform-subtitle {
    font-size: 16px;
  }

  .login-right {
    width: calc(100% - 24px);
    margin: 0 12px 12px;
  }

  .login-box {
    padding: 32px 24px;
  }

  .login-logo-text {
    font-size: 20px;
  }

  .forgot-password-shell {
    width: 100%;
  }

  .forgot-password-body {
    padding: 22px;
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>

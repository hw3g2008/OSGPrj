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
          <svg class="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="iconPaths.checkCircle" />
          </svg>
          <span>{{ feature }}</span>
        </div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <svg class="logo-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="iconPaths.accountStar" />
            </svg>
          </div>
          <span>OSG Lead Mentor</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用您的账号登录（主导师/班主任）</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名 / 邮箱</label>
            <input
              id="login-username"
              v-model.trim="formState.username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
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
                <svg id="pwd-eye" class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="iconPaths.eye" />
                </svg>
              </button>
            </div>
          </div>

          <button class="login-btn" type="submit" :disabled="loading">
            <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="iconPaths.login" />
            </svg>
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <div class="login-links">
          忘记密码？
          <a
            href="javascript:void(0)"
            class="link-anchor"
            data-surface-trigger="modal-forgot-password"
            @click.prevent="forgotPasswordOpen = true"
          >
            点击重置
          </a>
        </div>
      </div>
    </section>

    <ForgotPasswordModal v-model="forgotPasswordOpen" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getUserInfo, login } from '@osg/shared/api'
import { setToken, setUser } from '@osg/shared/utils'
import ForgotPasswordModal from '@/components/ForgotPasswordModal.vue'

const iconPaths = {
  checkCircle:
    'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M10,17L16,11L14.59,9.58L10,14.17L7.41,11.59L6,13L10,17Z',
  accountStar:
    'M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5.8,11L4,12.3L4.5,10L2.7,8.5L5,8.3L5.8,6L6.6,8.3L9,8.5L7.2,10L7.7,12.3L5.8,11Z',
  eye:
    'M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
  login:
    'M10,17V14H3V10H10V7L15,12L10,17M19,3H12V5H19V19H12V21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z',
}

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
const formState = reactive({ username: '', password: '' })

const handleLogin = async () => {
  if (!formState.username || !formState.password) {
    message.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const { token } = await login(formState)
    setToken(token)
    const userInfo = await getUserInfo()
    setUser(userInfo)
    message.success('登录成功')
    router.push((route.query.redirect as string) || '/')
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

.feature-icon,
.logo-icon-svg,
.toggle-icon,
.button-icon {
  fill: currentColor;
}

.feature-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
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

.logo-icon-svg {
  width: 24px;
  height: 24px;
}

.login-logo span {
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
  width: 18px;
  height: 18px;
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
  width: 18px;
  height: 18px;
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

  .login-logo span {
    font-size: 20px;
  }
}
</style>

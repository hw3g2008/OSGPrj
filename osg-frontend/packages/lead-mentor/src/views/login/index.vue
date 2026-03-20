<template>
  <div id="login-page" class="login-page">
    <div class="login-accent login-accent-left"></div>
    <div class="login-accent login-accent-bottom"></div>
    <div class="login-accent login-accent-right"></div>

    <section class="login-left">
      <h1 class="platform-title">OSG Platform</h1>
      <p class="platform-subtitle">职业培训一站式平台，学生与导师共同成长</p>

      <div class="login-features">
        <div class="login-feature">
          <CheckCircleFilled />
          <span>学生端：一对一导师辅导</span>
        </div>
        <div class="login-feature">
          <CheckCircleFilled />
          <span>导师端：高效课程管理</span>
        </div>
        <div class="login-feature">
          <CheckCircleFilled />
          <span>实时岗位信息共享</span>
        </div>
        <div class="login-feature">
          <CheckCircleFilled />
          <span>完善的学习资料库</span>
        </div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">
            <UserSwitchOutlined />
          </div>
          <span>OSG Lead Mentor</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用您的账号登录（主导师/班主任）</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="lead-mentor-username">用户名 / 邮箱</label>
            <input
              id="lead-mentor-username"
              v-model.trim="formState.username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="lead-mentor-password">密码</label>
            <div class="password-field">
              <input
                id="lead-mentor-password"
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
                <EyeInvisibleOutlined v-if="passwordVisible" />
                <EyeOutlined v-else />
              </button>
            </div>
          </div>

          <button class="login-btn" type="submit" :disabled="loading">
            <LoginOutlined />
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <div class="login-links">
          忘记密码？
          <button type="button" class="link-button" data-surface-trigger="modal-forgot-password">
            点击重置
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CheckCircleFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
  LoginOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons-vue'
import { login, getUserInfo } from '@osg/shared/api'
import { setToken, setUser } from '@osg/shared/utils'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const passwordVisible = ref(false)
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
  min-height: 100vh;
  display: flex;
  overflow: hidden;
  background: linear-gradient(135deg, #5a7ba3 0%, #7399c6 50%, #9bb8d9 100%);
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.login-page::before {
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
  color: #ffffff;
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

.login-feature :deep(svg) {
  font-size: 24px;
}

.login-right {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px 0 0 24px;
  background: #ffffff;
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
  color: #ffffff;
  font-size: 24px;
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
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  color: var(--text);
  background: #ffffff;
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
  border: none;
  background: none;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  transform: translateY(-50%);
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
  border: none;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(115, 153, 198, 0.4);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.login-links {
  margin-top: 20px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.link-button {
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  color: var(--primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.link-button:hover {
  color: var(--primary-dark);
}

@keyframes float {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
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

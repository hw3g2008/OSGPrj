<template>
  <div class="login-page">
    <!-- 装饰圆 -->
    <div class="login-decor login-decor--1" />
    <div class="login-decor login-decor--2" />
    <div class="login-decor login-decor--3" />

    <!-- 左侧品牌区 -->
    <div class="login-left">
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
          <span>学员求职进度追踪</span>
        </div>
        <div class="login-feature">
          <i class="mdi mdi-check-circle" />
          <span>完善的学习资料库</span>
        </div>
      </div>
    </div>

    <!-- 右侧登录面板 -->
    <div class="login-right">
      <div class="login-box">
        <!-- Logo -->
        <div class="login-logo">
          <div class="login-logo__icon">
            <i class="mdi mdi-school" />
          </div>
          <span class="login-logo__text">OSG Mentor Center</span>
        </div>

        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">使用您的账号登录（导师）</p>

        <!-- 错误横幅 -->
        <div v-if="errorMsg" class="login-error">
          <i class="mdi mdi-alert-circle" />
          <span>{{ errorMsg }}</span>
        </div>

        <!-- 登录表单 -->
        <div class="login-form">
          <div class="form-group">
            <label>用户名 / 邮箱</label>
            <input
              v-model="formState.username"
              type="text"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
              :class="{ error: errors.username }"
              @input="errors.username = ''"
              @keydown.enter.prevent="handleLogin"
            />
            <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
          </div>

          <div class="form-group">
            <label>密码</label>
            <div class="pwd-wrapper">
              <input
                v-model="formState.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                :class="{ error: errors.password }"
                @input="errors.password = ''"
                @keydown.enter.prevent="handleLogin"
              />
              <button
                type="button"
                class="pwd-toggle"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'mdi mdi-eye' : 'mdi mdi-eye-off'" />
              </button>
            </div>
            <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
          </div>

          <button type="button" class="login-btn" :disabled="loading" @click="handleLogin">
            <i v-if="!loading" class="mdi mdi-login" />
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </div>

        <div class="login-links">
          忘记密码？<router-link to="/forgot-password">点击重置</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, getInfo } from '@/api/auth'
import { setToken, setUser } from '@osg/shared/utils'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const showPassword = ref(false)
const errorMsg = ref('')
const formState = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })

const handleLogin = async () => {
  errors.username = ''
  errors.password = ''
  errorMsg.value = ''

  if (!formState.username.trim()) {
    errors.username = '请输入用户名或邮箱'
  }
  if (!formState.password) {
    errors.password = '请输入密码'
  }
  if (errors.username || errors.password) return

  loading.value = true
  try {
    const { token } = await login({
      username: formState.username.trim(),
      password: formState.password
    })
    setToken(token)
    const info = await getInfo()
    if (!info.roles?.includes('mentor') && !info.roles?.includes('admin')) {
      errorMsg.value = '该账号无导师端访问权限'
      loading.value = false
      return
    }
    setUser(info.user)
    router.push((route.query.redirect as string) || '/')
  } catch (e: any) {
    errorMsg.value = e?.message || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #5A7BA3 0%, #7399C6 50%, #9BB8D9 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 装饰圆 */
.login-decor {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.login-decor--1 { top: -100px; left: -100px; width: 300px; height: 300px; background: rgba(255,255,255,0.05); }
.login-decor--2 { bottom: -80px; left: 30%; width: 250px; height: 250px; background: rgba(255,255,255,0.04); }
.login-decor--3 { top: 40%; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.03); }

/* 左侧品牌区 */
.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  color: #fff;
  position: relative;
  z-index: 1;
}
.login-left__title { font-size: 48px; font-weight: 800; margin-bottom: 16px; }
.login-left__desc { font-size: 18px; opacity: 0.9; max-width: 400px; }
.login-features { margin-top: 40px; display: flex; flex-direction: column; gap: 16px; }
.login-feature { display: flex; align-items: center; gap: 12px; font-size: 15px; opacity: 0.9; }
.login-feature i { display: inline-flex; align-items: center; justify-content: center; width: 24px; font-size: 24px; }

/* 右侧登录面板 */
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
.login-box { width: 100%; max-width: 360px; padding: 40px; }

/* Logo */
.login-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
.login-logo__icon {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #7399C6 0%, #9BB8D9 100%);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 24px;
}
.login-logo__text { font-size: 22px; font-weight: 700; }

/* 标题 */
.login-title { font-size: 26px; font-weight: 700; margin-bottom: 8px; color: #1E293B; }
.login-subtitle { color: #94A3B8; margin-bottom: 28px; font-size: 14px; }

/* 错误横幅 */
.login-error {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
  color: #991B1B; font-size: 13px; margin-bottom: 16px;
}

/* 表单 */
.login-form .form-group { margin-bottom: 18px; }
.login-form label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #64748B; }
.login-form input {
  width: 100%; padding: 14px 16px;
  border: 2px solid #E2E8F0; border-radius: 12px; font-size: 15px;
  box-sizing: border-box; outline: none;
}
.login-form input:focus { border-color: #7399C6; box-shadow: 0 0 0 4px #E8F0F8; }
.login-form input.error { border-color: #EF4444; }

.field-error { color: #EF4444; font-size: 12px; margin-top: 4px; }

.pwd-wrapper { position: relative; }
.pwd-wrapper input { padding-right: 52px; }
.pwd-toggle {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 18px;
}
.pwd-toggle:hover { color: #5A7BA3; }

/* 登录按钮 */
.login-btn {
  width: 100%; padding: 16px;
  background: linear-gradient(135deg, #7399C6 0%, #9BB8D9 100%);
  color: #fff; border: none; border-radius: 12px;
  font-size: 16px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 15px rgba(115,153,198,0.4);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.login-btn:hover:not(:disabled) { transform: translateY(-2px); }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

/* 底部链接 */
.login-links {
  text-align: center; margin-top: 20px;
  font-size: 13px; color: #94A3B8;
}
.login-links a { color: #7399C6; text-decoration: none; font-weight: 500; }
.login-links a:hover { text-decoration: underline; }

</style>

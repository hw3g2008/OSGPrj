<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">OSG 助教端</h1>
      <a-form :model="formState" @finish="handleLogin" layout="vertical">
        <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="formState.username" placeholder="用户名" size="large"><template #prefix><UserOutlined /></template></a-input>
        </a-form-item>
        <a-form-item name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.password" placeholder="密码" size="large"><template #prefix><LockOutlined /></template></a-input-password>
        </a-form-item>
        <a-form-item><a-button type="primary" html-type="submit" size="large" block :loading="loading">登录</a-button></a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { login, getUserInfo } from '@osg/shared/api'
import { setToken, setUser } from '@osg/shared/utils'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const formState = reactive({ username: '', password: '' })

const handleLogin = async () => {
  loading.value = true
  try {
    const { token } = await login(formState)
    setToken(token)
    const userInfo = await getUserInfo()
    setUser(userInfo)
    message.success('登录成功')
    router.push((route.query.redirect as string) || '/')
  } finally { loading.value = false }
}
</script>

<style scoped lang="scss">
.login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.login-card { width: 400px; padding: 40px; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
.login-title { text-align: center; margin-bottom: 32px; color: #333; font-size: 24px; }
</style>

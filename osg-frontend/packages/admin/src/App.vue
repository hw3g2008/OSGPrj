<template>
  <a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#6366F1' } }">
    <router-view />
  </a-config-provider>
  <AppWatermark />
  <ForceChangePasswordModal
    :open="userStore.mustChangePassword"
    @success="onPasswordChanged"
    @logout="onForceLogout"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { AppWatermark, ForceChangePasswordModal } from '@osg/shared'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()

function onPasswordChanged() {
  userStore.setMustChangePassword(false)
}

async function onForceLogout() {
  await userStore.logout()
  router.replace('/login')
}
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>

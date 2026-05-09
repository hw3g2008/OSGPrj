<template>
  <a-config-provider :locale="zhCN">
    <router-view />
  </a-config-provider>
  <AppWatermark />
  <ForceChangePasswordModal
    :open="mustChangePassword"
    @success="onPasswordChanged"
    @logout="onForceLogout"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { AppWatermark, ForceChangePasswordModal } from '@osg/shared'
import { useMustChangePassword } from '@osg/shared/composables'
import { clearAuth } from '@osg/shared/utils'

const router = useRouter()
const { mustChangePassword, setMustChangePassword } = useMustChangePassword()

function onPasswordChanged() {
  setMustChangePassword(false)
}

function onForceLogout() {
  clearAuth()
  router.replace('/login')
}
</script>

<style>
#app {
  min-height: 100vh;
}
</style>

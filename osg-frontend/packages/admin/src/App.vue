<template>
  <a-config-provider :locale="antdLocale" :theme="{ token: { colorPrimary: '#6366F1' } }">
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
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'
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

const { locale } = useI18n()
const antdLocale = computed(() => (locale.value === 'en' ? enUS : zhCN))
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>

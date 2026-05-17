<template>
  <a-config-provider :locale="antdLocale" :theme="{ token: { colorPrimary: '#7399c6' } }">
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'
import { AppWatermark, ForceChangePasswordModal } from '@osg/shared'
import { useMustChangePassword } from '@osg/shared/composables'
import { clearAuth } from '@osg/shared/utils'

const { locale } = useI18n()
const antdLocale = computed(() => (locale.value === 'en' ? enUS : zhCN))

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

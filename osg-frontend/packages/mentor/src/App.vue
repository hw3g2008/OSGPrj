<template>
  <a-config-provider :locale="antdLocale">
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
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'
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

const { locale } = useI18n()
const antdLocale = computed(() => (locale.value === 'en' ? enUS : zhCN))
</script>

<style>
#app {
  min-height: 100vh;
}
</style>

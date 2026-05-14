<template>
  <a-config-provider :locale="antdLocale" :theme="{ token: { colorPrimary: '#6366F1' } }">
    <router-view />
  </a-config-provider>
  <AppWatermark />
</template>

<script setup lang="ts">
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { AppWatermark } from '@osg/shared'

const { locale } = useI18n()
const antdLocale = computed(() => (locale.value === 'zh' ? zhCN : enUS))
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>

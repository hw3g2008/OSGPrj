<template>
  <a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#7399c6' } }">
    <router-view />
  </a-config-provider>
  <AppWatermark />
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { AppWatermark } from '@osg/shared'
</script>

<style>
#app {
  min-height: 100vh;
}
</style>

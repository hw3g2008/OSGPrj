<template>
  <a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#6366F1' } }">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>

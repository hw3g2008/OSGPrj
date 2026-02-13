<template>
  <div class="dashboard">
    <h1>欢迎回来，{{ userStore.userInfo?.nickName || '管理员' }}</h1>
    <p class="role-info">
      当前角色：
      <a-tag v-for="role in userStore.roles" :key="role" color="blue">{{ role }}</a-tag>
    </p>
    <a-card title="系统概览" style="margin-top: 24px">
      <p>这是 OSG 管理后台首页，更多功能正在开发中...</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<style scoped lang="scss">
.dashboard {
  h1 {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .role-info {
    color: #666;
  }
}
</style>

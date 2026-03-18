<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">{{ title }}</h1>
    </div>
    <div class="placeholder-card">
      <i class="mdi mdi-clock-outline placeholder-icon" />
      <h2 class="placeholder-title">敬请期待</h2>
      <p class="placeholder-en">Coming Soon</p>
      <p class="placeholder-desc">功能正在开发中，请稍后再来</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped>
.page-header { margin-bottom: 24px; }
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; }
.placeholder-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 40px; background: #E8F0F8; border-radius: 16px; text-align: center;
}
.placeholder-icon { font-size: 48px; color: #7399C6; margin-bottom: 16px; }
.placeholder-title { font-size: 20px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.placeholder-en { font-size: 14px; color: #94A3B8; margin-bottom: 12px; }
.placeholder-desc { font-size: 14px; color: #64748B; }
</style>

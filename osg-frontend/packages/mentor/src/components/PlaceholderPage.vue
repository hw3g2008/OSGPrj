<template>
  <div>
    <PageHeader :title-zh="title" />
    <div class="placeholder-card">
      <i class="mdi mdi-clock-outline placeholder-icon" />
      <h2 class="placeholder-title">{{ $t('stay_tuned') }}</h2>
      <p class="placeholder-en">Coming Soon</p>
      <p class="placeholder-desc">{{ $t('feature_under_development_please_check_b') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PageHeader } from '@osg/shared/components/PageHeader'

defineProps<{ title: string }>()
</script>

<style scoped>
.placeholder-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 40px; background: #E8F0F8; border-radius: 16px; text-align: center;
}
.placeholder-icon { font-size: 48px; color: #7399C6; margin-bottom: 16px; }
.placeholder-title { font-size: 20px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.placeholder-en { font-size: 14px; color: #94A3B8; margin-bottom: 12px; }
.placeholder-desc { font-size: 14px; color: #64748B; }
</style>

<template>
  <div>
    <PageHeader :title-zh="title" />
    <div class="placeholder-card">
      <i class="mdi mdi-clock-outline placeholder-icon" />
      <h2 class="placeholder-title">{{ t('mentor.placeholder.title') }}</h2>
      <p class="placeholder-en">{{ t('mentor.placeholder.subtitle') }}</p>
      <p class="placeholder-desc">{{ t('mentor.placeholder.desc') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@osg/shared/components/PageHeader'

defineProps<{ title: string }>()
const { t } = useI18n()
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

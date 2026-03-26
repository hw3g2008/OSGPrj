<template>
  <div class="placeholder-page">
    <OsgPageContainer :title="title">
      <div class="placeholder-card">
        <div class="placeholder-eyebrow">{{ COMING_SOON_TOAST }}</div>
        <p class="placeholder-subtitle">{{ subtitle }}</p>
        <p v-if="requestedPath" class="placeholder-path">已保留路由：{{ requestedPath }}</p>
        <p class="placeholder-note">
          当前页面会在后续需求中逐步开放，本次先保留导航与路由承接，避免误入未交付功能。
        </p>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'
import { COMING_SOON_TOAST } from '@/navigation/access'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    requestedPath?: string
  }>(),
  {
    title: COMING_SOON_TOAST,
    subtitle: '当前页面不在本次学生端交付范围内。',
    requestedPath: ''
  }
)
</script>

<style scoped lang="scss">
.placeholder-page {
  .placeholder-card {
    border-radius: 16px;
    padding: 32px;
    background:
      radial-gradient(circle at top right, rgba(115, 153, 198, 0.18), transparent 35%),
      linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
    border: 1px solid rgba(115, 153, 198, 0.18);
  }

  .placeholder-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 999px;
    margin-bottom: 16px;
    background: rgba(37, 99, 235, 0.1);
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .placeholder-subtitle {
    margin: 0 0 12px;
    color: #334155;
    font-size: 15px;
    line-height: 1.7;
  }

  .placeholder-path {
    margin: 0 0 12px;
    color: #1e3a8a;
    font-size: 14px;
    line-height: 1.6;
  }

  .placeholder-note {
    margin: 0;
    color: #64748b;
    line-height: 1.7;
  }
}
</style>

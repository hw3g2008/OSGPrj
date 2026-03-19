<template>
  <div class="placeholder-page">
    <OsgPageContainer :title="title">
      <div class="placeholder-card">
        <p class="placeholder-subtitle">{{ subtitle }}</p>
        <p class="placeholder-note">
          当前页面先作为 student App Shell 的导航占位，后续 story 会在这里补齐真实业务内容。
        </p>
      </div>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { OsgPageContainer } from '@osg/shared/components'

defineProps<{
  title: string
  subtitle: string
}>()
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

  .placeholder-subtitle {
    margin: 0 0 12px;
    color: #334155;
    font-size: 15px;
    line-height: 1.7;
  }

  .placeholder-note {
    margin: 0;
    color: #64748b;
    line-height: 1.7;
  }
}
</style>

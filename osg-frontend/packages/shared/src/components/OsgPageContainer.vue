<template>
  <div class="osg-page-container">
    <div v-if="$slots.header || title" class="osg-page-container__header">
      <slot name="header">
        <h1 class="osg-page-container__title">{{ title }}</h1>
      </slot>
    </div>
    <div class="osg-page-container__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped lang="scss">
.osg-page-container {
  padding: 24px;

  &__header {
    margin-bottom: 24px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
  }

  &__content {
    background: #fff;
    padding: 24px;
    border-radius: 8px;
  }
}
</style>

<template>
  <header class="osg-header">
    <div class="osg-header__logo">
      <slot name="logo">
        <span class="osg-header__title">{{ title }}</span>
      </slot>
    </div>
    <div class="osg-header__nav">
      <slot name="nav" />
    </div>
    <div class="osg-header__user">
      <slot name="user" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped lang="scss">
.osg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  &__logo {
    display: flex;
    align-items: center;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: #1890ff;
  }

  &__nav {
    flex: 1;
    margin: 0 24px;
  }

  &__user {
    display: flex;
    align-items: center;
  }
}
</style>

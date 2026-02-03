<template>
  <aside class="osg-sidebar" :class="{ 'osg-sidebar--collapsed': collapsed }">
    <slot />
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<style scoped lang="scss">
.osg-sidebar {
  width: 220px;
  min-height: 100vh;
  background: #001529;
  transition: width 0.2s;

  &--collapsed {
    width: 80px;
  }
}
</style>

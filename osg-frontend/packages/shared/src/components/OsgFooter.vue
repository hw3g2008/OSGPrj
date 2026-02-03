<template>
  <footer class="osg-footer">
    <slot>
      <p>© {{ year }} OSG 职业培训平台</p>
    </slot>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped lang="scss">
.osg-footer {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
  background: #fafafa;
}
</style>

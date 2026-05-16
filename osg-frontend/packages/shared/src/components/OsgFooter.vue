<template>
  <footer class="osg-footer">
    <slot>
      <p>{{ t('common.shared.footer.copyright', { year }) }}</p>
    </slot>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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

<template>
  <header class="page-header">
    <div class="page-header__text">
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      <p v-if="description" class="page-header__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  description?: string
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-header__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text, #1E293B);
  line-height: 1.3;
  margin: 0;
}

.page-header__subtitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted, #94A3B8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.page-header__desc {
  font-size: 14px;
  color: var(--text2, #64748B);
  margin: 0;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>

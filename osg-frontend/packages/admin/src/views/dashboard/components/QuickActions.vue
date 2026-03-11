<template>
  <a-card class="quick-actions">
    <template #title>
      <span class="quick-actions__title-wrap">
        <span class="mdi mdi-lightning-bolt quick-actions__title-icon" />
        <span>快捷操作</span>
      </span>
    </template>
    <div class="quick-actions__grid">
      <button
        v-for="action in actions"
        :key="action.label"
        class="quick-actions__btn"
        @click="$emit('action', action.key)"
      >
        <span class="mdi" :class="action.icon" />
        <span>{{ action.label }}</span>
      </button>
    </div>
  </a-card>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'action', key: string): void
}>()

const actions = [
  { key: 'add-student', icon: 'mdi-account-plus', label: '新增学员' },
  { key: 'add-staff', icon: 'mdi-account-tie', label: '新增导师' },
  { key: 'add-contract', icon: 'mdi-file-sign', label: '新增合同' },
  { key: 'send-notice', icon: 'mdi-bell-plus', label: '发送通知' },
]
</script>

<style scoped lang="scss">
.quick-actions {
  :deep(.ant-card) {
    border-radius: 16px;
    box-shadow: var(--card-shadow, 0 4px 24px rgba(99, 102, 241, 0.12));
  }

  :deep(.ant-card-head) {
    min-height: auto;
    padding: 15px 22px;
    border-bottom: 1px solid var(--border, #E2E8F0);
  }

  :deep(.ant-card-head-title) {
    padding: 0;
  }

  :deep(.ant-card-body) {
    padding: 22px;
  }

  &__title-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__title-icon {
    color: var(--text2, #64748B);
    font-size: 18px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 42px;
    gap: 6px;
    padding: 0 20px;
    background: var(--bg, #F8FAFC);
    border: 1px solid var(--border, #E2E8F0);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    color: var(--text, #1E293B);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;

    .mdi {
      font-size: 18px;
      color: var(--primary, #6366F1);
    }

    &:hover {
      background: var(--primary-light, #EEF2FF);
      border-color: var(--primary, #6366F1);
    }
  }
}
</style>

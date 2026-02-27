<template>
  <a-card title="快捷操作" class="quick-actions">
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
  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg, #F8FAFC);
    border: 1px solid var(--border, #E2E8F0);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
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

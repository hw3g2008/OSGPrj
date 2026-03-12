<template>
  <div class="dashboard-card quick-actions">
    <div class="dashboard-card__header">
      <span class="dashboard-card__title quick-actions__title-wrap">
        <span class="mdi mdi-lightning-bolt quick-actions__title-icon" />
        <span>快捷操作</span>
      </span>
    </div>
    <div class="dashboard-card__body quick-actions__body">
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
  </div>
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
  &__title-wrap {
    gap: 0;
  }

  &__title-icon {
    color: var(--text2, #64748B);
    font-size: 18px;
    margin-right: 6px;
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 22px;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 42px;
    gap: 6px;
    padding: 0 20px;
    background: #fff;
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

.dashboard-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--card-shadow, 0 4px 24px rgba(99, 102, 241, 0.12));
  margin-bottom: 20px;

  &__header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--border, #E2E8F0);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    display: inline-flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #1E293B);
  }
}
</style>

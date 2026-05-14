<template>
  <a-dropdown trigger="click" placement="bottomRight">
    <button type="button" class="btn-text-sm action-more-btn">
      <span>{{ $t('more') }} ▾</span>
    </button>

    <template #overlay>
      <a-menu class="students-action-menu" @click="handleMenuClick">
        <a-menu-item v-for="action in actionItems" :key="action.key">
          <span :class="['students-action-menu__item', action.tone ? `students-action-menu__item--${action.tone}` : '']">
            {{ action.label }}
          </span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const actionItems = [
  { key: 'freeze', label: t('frozen') },
  { key: 'restore', label: t('restore'), tone: 'success' },
  { key: 'blacklist', label: t('add_to_blacklist'), tone: 'warning' },
  { key: 'refund', label: t('refund'), tone: 'danger' }
] as const

type StudentActionKey = (typeof actionItems)[number]['key']

const emit = defineEmits<{
  select: [action: StudentActionKey]
}>()

const handleMenuClick = ({ key }: { key: string }) => {
  emit('select', key as StudentActionKey)
}
</script>

<style scoped lang="scss">
.btn-text-sm {
  border: none;
  background: transparent;
  color: var(--primary, #6366f1);
  padding: 4px 0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: var(--primary-dark, #4f46e5);
  }
}

.action-more-btn {
  color: var(--primary, #6366f1);
}

.students-action-menu {
  min-width: 156px;
}

.students-action-menu__item {
  display: inline-flex;
  align-items: center;
  width: 100%;
}

.students-action-menu__item--warning {
  color: #b45309;
}

.students-action-menu__item--success {
  color: #15803d;
}

.students-action-menu__item--danger {
  color: #b91c1c;
}
</style>

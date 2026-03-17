<template>
  <a-dropdown trigger="click" placement="bottomRight">
    <button type="button" class="student-action-link">
      <span>更多</span>
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
const actionItems = [
  { key: 'resetPassword', label: '重置密码' },
  { key: 'freeze', label: '冻结', tone: 'warning' },
  { key: 'restore', label: '恢复', tone: 'success' },
  { key: 'blacklist', label: '加入黑名单', tone: 'danger' },
  { key: 'refund', label: '退费', tone: 'danger' }
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
.student-action-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }
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

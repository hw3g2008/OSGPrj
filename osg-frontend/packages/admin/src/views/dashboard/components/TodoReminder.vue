<template>
  <div class="todo-reminder" v-if="todos && todos.length > 0">
    <div class="todo-reminder__header">
      <span class="mdi mdi-bell-ring todo-reminder__bell" />
    </div>
    <div class="todo-reminder__content">
      <strong class="todo-reminder__title">待处理事项</strong>
      <div class="todo-reminder__list">
        <a
          v-for="item in todos"
          :key="item.route"
          class="todo-reminder__item"
          @click="handleClick(item.route)"
        >
          <span class="mdi" :class="routeIconMap[item.route] || 'mdi-circle-small'" />
          <span>{{ item.count }}条{{ item.label }}</span>
        </a>
      </div>
    </div>
    <button class="todo-reminder__btn" @click="handleViewAll">查看全部</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TodoItem } from '@/api/dashboard'

defineProps<{
  todos: TodoItem[] | null
}>()

const router = useRouter()

const routeIconMap: Record<string, string> = {
  '/reports': 'mdi-clipboard-clock',
  '/expense': 'mdi-receipt-text-clock',
  '/students': 'mdi-account-alert',
}

function handleClick(route: string) {
  router.push(route)
}

function handleViewAll() {
  router.push('/logs')
}
</script>

<style scoped lang="scss">
.todo-reminder {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  &__bell {
    font-size: 28px;
    color: #D97706;
  }

  &__title {
    color: #92400E;
    font-size: 16px;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__list {
    display: flex;
    gap: 24px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  &__item {
    font-size: 13px;
    color: #92400E;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }

  &__btn {
    background: #D97706;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;

    &:hover {
      background: #B45309;
    }
  }
}
</style>

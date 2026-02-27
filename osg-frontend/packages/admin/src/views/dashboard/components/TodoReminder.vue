<template>
  <div class="todo-reminder" v-if="todos && todos.length > 0">
    <div class="todo-reminder__header">
      <span class="mdi mdi-bell-ring todo-reminder__bell" />
      <strong class="todo-reminder__title">待处理事项</strong>
    </div>
    <div class="todo-reminder__list">
      <a
        v-for="item in todos"
        :key="item.route"
        class="todo-reminder__item"
        @click="handleClick(item.route)"
      >
        <span>{{ item.count }}条{{ item.label }}</span>
      </a>
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
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__bell {
    font-size: 28px;
    color: #D97706;
  }

  &__title {
    color: #92400E;
    font-size: 16px;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  &__item {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: #92400E;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.9);
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

    &:hover {
      background: #B45309;
    }
  }
}
</style>

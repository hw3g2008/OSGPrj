<template>
  <div class="osg-page">
    <PageHeader title-zh="欢迎回来，管理员" :description="`今天是 ${todayStr}`">
      <template #actions>
        <a-button @click="fetchAll">
          <template #icon><ReloadOutlined /></template>
          刷新数据
        </a-button>
      </template>
    </PageHeader>

    <!-- 待处理事项提醒 -->
    <TodoReminder :todos="todos" />

    <!-- 统计卡片 -->
    <StatCards :stats="stats" />

    <!-- 两栏布局 -->
    <a-row :gutter="20">
      <a-col :span="16">
        <RecentActivity :activities="activities" />
      </a-col>
      <a-col :span="8">
        <div style="display: flex; flex-direction: column">
          <QuickActions @action="handleAction" />
          <StudentStatus :data="studentStatus" />
          <MonthlyStats :data="monthlyStats" />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { PageHeader } from '@osg/shared/components/PageHeader'
import {
  getDashboardStats,
  getDashboardTodos,
  getDashboardActivities,
  getStudentStatus,
  getMonthlyStats,
} from '@/api/dashboard'
import type {
  DashboardStats,
  TodoItem,
  ActivityItem,
  StudentStatusData,
  MonthlyStatsData,
} from '@/api/dashboard'
import StatCards from './components/StatCards.vue'
import TodoReminder from './components/TodoReminder.vue'
import RecentActivity from './components/RecentActivity.vue'
import QuickActions from './components/QuickActions.vue'
import StudentStatus from './components/StudentStatus.vue'
import MonthlyStats from './components/MonthlyStats.vue'

const stats = ref<DashboardStats | null>(null)
const todos = ref<TodoItem[] | null>(null)
const activities = ref<ActivityItem[] | null>(null)
const studentStatus = ref<StudentStatusData | null>(null)
const monthlyStats = ref<MonthlyStatsData | null>(null)

const todayStr = computed(() => {
  const d = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
})

async function fetchAll() {
  try {
    const [s, t, a, ss, ms] = await Promise.allSettled([
      getDashboardStats(),
      getDashboardTodos(),
      getDashboardActivities(),
      getStudentStatus(),
      getMonthlyStats(),
    ])
    if (s.status === 'fulfilled') stats.value = s.value as any
    if (t.status === 'fulfilled') todos.value = t.value as any
    if (a.status === 'fulfilled') activities.value = a.value as any
    if (ss.status === 'fulfilled') studentStatus.value = ss.value as any
    if (ms.status === 'fulfilled') monthlyStats.value = ms.value as any
  } catch {
    // API 未就绪时静默失败，页面仍可渲染空状态
  }
}

function handleAction(key: string) {
  // 快捷操作：后续模块实现弹窗逻辑，当前占位
  console.log('Quick action:', key)
}

onMounted(() => {
  fetchAll()
})
</script>

<style scoped>
</style>

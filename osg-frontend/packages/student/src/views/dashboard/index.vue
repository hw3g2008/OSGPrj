<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card>
          <a-statistic title="已完成课时" :value="stats.completedHours" suffix="小时" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="剩余课时" :value="stats.remainingHours" suffix="小时" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="本周课程" :value="stats.weekCourses" suffix="节" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="学习天数" :value="stats.learningDays" suffix="天" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="16">
        <a-card title="近期课程">
          <a-list :data-source="recentCourses" :loading="loading">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="item.courseName"
                  :description="`导师：${item.mentorName} | ${item.scheduledTime}`"
                />
                <template #actions>
                  <a-tag :color="getStatusColor(item.status)">
                    {{ getStatusText(item.status) }}
                  </a-tag>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="快捷入口">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="$router.push('/schedule')">
              查看课程排期
            </a-button>
            <a-button block @click="$router.push('/resources')">
              学习资源
            </a-button>
            <a-button block @click="$router.push('/career')">
              求职中心
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { CourseSchedule, ScheduleStatus } from '@osg/shared/types'

const loading = ref(false)

const stats = ref({
  completedHours: 24,
  remainingHours: 36,
  weekCourses: 3,
  learningDays: 45
})

const recentCourses = ref<CourseSchedule[]>([
  {
    scheduleId: 1,
    courseId: 1,
    courseName: 'Java 基础入门',
    studentId: 1,
    mentorId: 1,
    mentorName: '张老师',
    scheduledTime: '2026-02-03 14:00',
    duration: 60,
    status: 'scheduled'
  },
  {
    scheduleId: 2,
    courseId: 2,
    courseName: 'Spring Boot 实战',
    studentId: 1,
    mentorId: 2,
    mentorName: '李老师',
    scheduledTime: '2026-02-05 10:00',
    duration: 90,
    status: 'confirmed'
  }
])

const getStatusColor = (status: ScheduleStatus) => {
  const colors: Record<ScheduleStatus, string> = {
    scheduled: 'blue',
    confirmed: 'green',
    in_progress: 'orange',
    completed: 'default',
    cancelled: 'red'
  }
  return colors[status]
}

const getStatusText = (status: ScheduleStatus) => {
  const texts: Record<ScheduleStatus, string> = {
    scheduled: '已排期',
    confirmed: '已确认',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status]
}

onMounted(() => {
  // TODO: 加载真实数据
})
</script>

<style scoped lang="scss">
.dashboard {
  // 样式
}
</style>

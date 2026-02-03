<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card><a-statistic title="我的学员" :value="stats.students" suffix="人" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="本月课时" :value="stats.monthHours" suffix="小时" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="今日课程" :value="stats.todayCourses" suffix="节" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="待结算" :value="stats.pendingSettlement" prefix="¥" /></a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="16">
        <a-card title="今日课程安排">
          <a-timeline>
            <a-timeline-item v-for="item in todaySchedule" :key="item.id" :color="item.color">
              <p><strong>{{ item.time }}</strong> - {{ item.student }}</p>
              <p>{{ item.course }}</p>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="快捷操作">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="$router.push('/schedule')">管理排期</a-button>
            <a-button block @click="$router.push('/students')">查看学员</a-button>
            <a-button block @click="$router.push('/settlement')">课时结算</a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const stats = ref({ students: 12, monthHours: 48, todayCourses: 3, pendingSettlement: 3600 })

const todaySchedule = ref([
  { id: 1, time: '09:00', student: '张同学', course: 'Java 基础', color: 'green' },
  { id: 2, time: '14:00', student: '李同学', course: 'Spring Boot', color: 'blue' },
  { id: 3, time: '19:00', student: '王同学', course: '项目实战', color: 'gray' }
])
</script>

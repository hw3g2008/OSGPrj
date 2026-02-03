<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6"><a-card><a-statistic title="管理班级" :value="stats.classes" suffix="个" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="学员总数" :value="stats.students" suffix="人" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="在职导师" :value="stats.mentors" suffix="人" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic title="本周课程" :value="stats.weekCourses" suffix="节" /></a-card></a-col>
    </a-row>
    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="班级学习进度">
          <a-list :data-source="classProgress" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <span>{{ item.name }}</span>
                <template #actions><a-progress :percent="item.progress" size="small" style="width: 120px" /></template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="待办事项">
          <a-list :data-source="todos" size="small">
            <template #renderItem="{ item }">
              <a-list-item><a-tag :color="item.color">{{ item.type }}</a-tag> {{ item.content }}</a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const stats = ref({ classes: 3, students: 45, mentors: 8, weekCourses: 32 })
const classProgress = ref([
  { name: 'Java 就业班 01 期', progress: 75 },
  { name: 'Java 就业班 02 期', progress: 45 },
  { name: '前端就业班 01 期', progress: 60 }
])
const todos = ref([
  { type: '排课', content: '张同学本周缺少排课', color: 'orange' },
  { type: '反馈', content: '3 位学员待学情评估', color: 'blue' },
  { type: '结算', content: '2 月导师课时待确认', color: 'green' }
])
</script>

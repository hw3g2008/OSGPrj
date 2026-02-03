<template>
  <div class="courses-page">
    <OsgPageContainer title="授课记录">
      <a-table :columns="columns" :data-source="courses" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'completed' ? 'green' : 'blue'">
              {{ record.status === 'completed' ? '已完成' : '已排期' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'

const loading = ref(false)
const columns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '学员', dataIndex: 'student', key: 'student' },
  { title: '课程', dataIndex: 'course', key: 'course' },
  { title: '时长', dataIndex: 'duration', key: 'duration' },
  { title: '状态', key: 'status' }
]

const courses = ref([
  { id: 1, date: '2026-02-01', student: '张同学', course: 'Java 基础', duration: '1小时', status: 'completed' },
  { id: 2, date: '2026-02-02', student: '李同学', course: 'Spring Boot', duration: '1.5小时', status: 'completed' },
  { id: 3, date: '2026-02-03', student: '王同学', course: '项目实战', duration: '2小时', status: 'scheduled' }
])
</script>

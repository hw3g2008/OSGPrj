<template>
  <div class="courses-page">
    <OsgPageContainer title="我的课程">
      <a-table :columns="columns" :data-source="courses" :loading="loading" row-key="courseId">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'published' ? 'green' : 'default'">
              {{ record.status === 'published' ? '进行中' : '已结束' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" @click="viewDetail(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
import type { Course } from '@osg/shared/types'

const loading = ref(false)

const columns = [
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '课时', dataIndex: 'duration', key: 'duration' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'action' }
]

const courses = ref<Course[]>([
  { courseId: 1, courseName: 'Java 基础入门', category: 'Java', duration: 20, status: 'published' },
  { courseId: 2, courseName: 'Spring Boot 实战', category: 'Java', duration: 30, status: 'published' },
  { courseId: 3, courseName: '前端 Vue3 开发', category: '前端', duration: 25, status: 'published' }
])

const viewDetail = (record: Course) => {
  console.log('查看课程详情:', record)
}
</script>

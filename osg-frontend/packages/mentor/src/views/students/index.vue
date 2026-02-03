<template>
  <div class="students-page">
    <OsgPageContainer title="我的学员">
      <a-table :columns="columns" :data-source="students" :loading="loading" row-key="userId">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'progress'">
            <a-progress :percent="record.progress" size="small" />
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small">查看详情</a-button>
              <a-button type="link" size="small">排课</a-button>
            </a-space>
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
  { title: '学员姓名', dataIndex: 'nickName', key: 'nickName' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '已完成课时', dataIndex: 'completedHours', key: 'completedHours' },
  { title: '学习进度', key: 'progress' },
  { title: '操作', key: 'action' }
]

const students = ref([
  { userId: 1, nickName: '张同学', className: 'Java 就业班 01 期', completedHours: 24, progress: 60 },
  { userId: 2, nickName: '李同学', className: 'Java 就业班 01 期', completedHours: 18, progress: 45 },
  { userId: 3, nickName: '王同学', className: 'Java 就业班 02 期', completedHours: 8, progress: 20 }
])
</script>

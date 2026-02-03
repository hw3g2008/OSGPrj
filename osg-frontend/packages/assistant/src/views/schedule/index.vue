<template>
  <div class="schedule-page">
    <OsgPageContainer title="排课协助">
      <a-table :columns="columns" :data-source="schedules" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'pending' ? 'orange' : 'green'">{{ record.status === 'pending' ? '待处理' : '已安排' }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small">处理</a-button>
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
  { title: '学员', dataIndex: 'student', key: 'student' },
  { title: '导师', dataIndex: 'mentor', key: 'mentor' },
  { title: '期望时间', dataIndex: 'preferredTime', key: 'preferredTime' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'action' }
]
const schedules = ref([
  { id: 1, student: '张同学', mentor: '王老师', preferredTime: '本周三下午', status: 'pending' },
  { id: 2, student: '李同学', mentor: '张老师', preferredTime: '本周四上午', status: 'done' }
])
</script>

<template>
  <div class="classes-page">
    <OsgPageContainer title="班级管理">
      <a-table :columns="columns" :data-source="classes" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space><a-button type="link" size="small">查看</a-button><a-button type="link" size="small">编辑</a-button></a-space>
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
  { title: '班级名称', dataIndex: 'name', key: 'name' },
  { title: '学员数', dataIndex: 'studentCount', key: 'studentCount' },
  { title: '开班日期', dataIndex: 'startDate', key: 'startDate' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action' }
]
const classes = ref([
  { id: 1, name: 'Java 就业班 01 期', studentCount: 18, startDate: '2025-09-01', status: '进行中' },
  { id: 2, name: 'Java 就业班 02 期', studentCount: 15, startDate: '2025-11-01', status: '进行中' },
  { id: 3, name: '前端就业班 01 期', studentCount: 12, startDate: '2025-10-15', status: '进行中' }
])
</script>

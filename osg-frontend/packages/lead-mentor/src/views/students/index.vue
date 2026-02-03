<template>
  <div class="students-page">
    <OsgPageContainer title="学员管理">
      <a-table :columns="columns" :data-source="students" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
const loading = ref(false)
const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '导师', dataIndex: 'mentor', key: 'mentor' },
  { title: '已完成课时', dataIndex: 'hours', key: 'hours' },
  { title: '学习状态', dataIndex: 'status', key: 'status' }
]
const students = ref([
  { id: 1, name: '张同学', className: 'Java 就业班 01 期', mentor: '王老师', hours: 24, status: '正常' },
  { id: 2, name: '李同学', className: 'Java 就业班 01 期', mentor: '张老师', hours: 18, status: '正常' }
])
</script>

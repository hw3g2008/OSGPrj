<template>
  <div class="students-page">
    <OsgPageContainer title="学员服务">
      <a-table :columns="columns" :data-source="students" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
const loading = ref(false)
const columns = [
  { title: '学员', dataIndex: 'name', key: 'name' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '最近咨询', dataIndex: 'lastConsult', key: 'lastConsult' },
  { title: '状态', dataIndex: 'status', key: 'status' }
]
const students = ref([
  { id: 1, name: '张同学', className: 'Java 01 期', lastConsult: '2026-02-01', status: '正常' },
  { id: 2, name: '李同学', className: 'Java 01 期', lastConsult: '2026-01-28', status: '需关注' }
])
</script>

<template>
  <div class="mentors-page">
    <OsgPageContainer title="导师管理">
      <a-table :columns="columns" :data-source="mentors" :loading="loading" row-key="id" />
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OsgPageContainer } from '@osg/shared/components'
const loading = ref(false)
const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '专长', dataIndex: 'specialty', key: 'specialty' },
  { title: '带教学员数', dataIndex: 'studentCount', key: 'studentCount' },
  { title: '本月课时', dataIndex: 'monthHours', key: 'monthHours' },
  { title: '评分', dataIndex: 'rating', key: 'rating' }
]
const mentors = ref([
  { id: 1, name: '王老师', specialty: 'Java/Spring', studentCount: 6, monthHours: 48, rating: 4.8 },
  { id: 2, name: '张老师', specialty: 'Java/微服务', studentCount: 5, monthHours: 42, rating: 4.9 }
])
</script>

<template>
  <div class="feedback-page">
    <OsgPageContainer title="反馈收集">
      <a-table :columns="columns" :data-source="feedbacks" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'pending' ? 'orange' : 'green'">{{ record.status === 'pending' ? '待处理' : '已处理' }}</a-tag>
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
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '内容', dataIndex: 'content', key: 'content' },
  { title: '状态', key: 'status' }
]
const feedbacks = ref([
  { id: 1, student: '张同学', type: '课程反馈', content: '希望增加实战项目', status: 'pending' },
  { id: 2, student: '李同学', type: '导师反馈', content: '王老师讲解很清晰', status: 'done' }
])
</script>

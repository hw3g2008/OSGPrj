<template>
  <div class="schedule-page">
    <OsgPageContainer title="排期管理">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h1 style="margin: 0; font-size: 20px;">排期管理</h1>
          <a-button type="primary" @click="showAddModal = true">新增排期</a-button>
        </div>
      </template>
      <a-calendar v-model:value="selectedDate" />
    </OsgPageContainer>

    <a-modal v-model:open="showAddModal" title="新增排期" @ok="handleAddSchedule">
      <a-form :model="scheduleForm" layout="vertical">
        <a-form-item label="学员">
          <a-select v-model:value="scheduleForm.studentId" placeholder="选择学员">
            <a-select-option :value="1">张同学</a-select-option>
            <a-select-option :value="2">李同学</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="课程">
          <a-select v-model:value="scheduleForm.courseId" placeholder="选择课程">
            <a-select-option :value="1">Java 基础</a-select-option>
            <a-select-option :value="2">Spring Boot</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间">
          <a-date-picker v-model:value="scheduleForm.time" show-time style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { message } from 'ant-design-vue'
import { OsgPageContainer } from '@osg/shared/components'

const selectedDate = ref<Dayjs>(dayjs())
const showAddModal = ref(false)
const scheduleForm = reactive({ studentId: undefined, courseId: undefined, time: undefined })

const handleAddSchedule = () => {
  message.success('排期添加成功')
  showAddModal.value = false
}
</script>

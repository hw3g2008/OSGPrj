<template>
  <div class="schedule-page">
    <OsgPageContainer title="课程排期">
      <a-calendar v-model:value="selectedDate" @select="onSelectDate">
        <template #dateCellRender="{ current }">
          <ul class="events">
            <li v-for="item in getDateEvents(current)" :key="item.scheduleId">
              <a-badge :status="getBadgeStatus(item.status)" :text="item.courseName" />
            </li>
          </ul>
        </template>
      </a-calendar>
    </OsgPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { OsgPageContainer } from '@osg/shared/components'
import type { CourseSchedule, ScheduleStatus } from '@osg/shared/types'

const selectedDate = ref<Dayjs>(dayjs())

const schedules = ref<CourseSchedule[]>([
  {
    scheduleId: 1,
    courseId: 1,
    courseName: 'Java 基础',
    studentId: 1,
    mentorId: 1,
    scheduledTime: dayjs().format('YYYY-MM-DD') + ' 14:00',
    duration: 60,
    status: 'scheduled'
  }
])

const getDateEvents = (date: Dayjs) => {
  const dateStr = date.format('YYYY-MM-DD')
  return schedules.value.filter(s => s.scheduledTime.startsWith(dateStr))
}

const getBadgeStatus = (status: ScheduleStatus) => {
  const map: Record<ScheduleStatus, 'success' | 'processing' | 'default' | 'error' | 'warning'> = {
    scheduled: 'processing',
    confirmed: 'success',
    in_progress: 'warning',
    completed: 'default',
    cancelled: 'error'
  }
  return map[status]
}

const onSelectDate = (date: Dayjs) => {
  console.log('选择日期:', date.format('YYYY-MM-DD'))
}
</script>

<style scoped>
.events {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>

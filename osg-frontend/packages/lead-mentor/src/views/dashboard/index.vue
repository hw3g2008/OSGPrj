<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6"><a-card><a-statistic :title="t('leadMentor.dashboard.stats.classes')" :value="stats.classes" :suffix="t('leadMentor.dashboard.stats.classesUnit')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('leadMentor.dashboard.stats.students')" :value="stats.students" :suffix="t('leadMentor.dashboard.stats.studentsUnit')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('leadMentor.dashboard.stats.mentors')" :value="stats.mentors" :suffix="t('leadMentor.dashboard.stats.mentorsUnit')" /></a-card></a-col>
      <a-col :span="6"><a-card><a-statistic :title="t('leadMentor.dashboard.stats.weekCourses')" :value="stats.weekCourses" :suffix="t('leadMentor.dashboard.stats.weekCoursesUnit')" /></a-card></a-col>
    </a-row>
    <a-row :gutter="16" style="margin-top: 24px">
      <a-col :span="12">
        <a-card :title="t('leadMentor.dashboard.classProgress.title')">
          <a-list :data-source="classProgress" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <span>{{ item.name }}</span>
                <template #actions><a-progress :percent="item.progress" size="small" style="width: 120px" /></template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card :title="t('leadMentor.dashboard.todos.title')">
          <a-list :data-source="todos" size="small">
            <template #renderItem="{ item }">
              <a-list-item><a-tag :color="item.color">{{ item.type }}</a-tag> {{ item.content }}</a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const stats = ref({ classes: 3, students: 45, mentors: 8, weekCourses: 32 })
const classProgress = computed(() => [
  { name: t('leadMentor.dashboard.mock.classJava1'), progress: 75 },
  { name: t('leadMentor.dashboard.mock.classJava2'), progress: 45 },
  { name: t('leadMentor.dashboard.mock.classFrontend1'), progress: 60 }
])
const todos = computed(() => [
  { type: t('leadMentor.dashboard.todos.typeSchedule'), content: t('leadMentor.dashboard.todos.sampleSchedule'), color: 'orange' },
  { type: t('leadMentor.dashboard.todos.typeFeedback'), content: t('leadMentor.dashboard.todos.sampleFeedback'), color: 'blue' },
  { type: t('leadMentor.dashboard.todos.typeSettlement'), content: t('leadMentor.dashboard.todos.sampleSettlement'), color: 'green' }
])
</script>

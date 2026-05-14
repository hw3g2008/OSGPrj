import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'
import { i18n } from '@osg/shared'
const t = (key: string) => i18n.global.t(key)

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue'), meta: { title: t('login'), public: true } },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'Home', component: () => import('@/views/home/index.vue'), meta: { title: t('home_page') } },
      { path: 'career/positions', name: 'CareerPositions', component: () => import('@/views/career/positions/index.vue'), meta: { title: t('position_information') } },
      { path: 'career/job-overview', name: 'CareerJobOverview', component: () => import('@/views/career/job-overview/index.vue'), meta: { title: t('overview_of_student_job_search') } },
      { path: 'career/mock-practice', name: 'CareerMockPractice', component: () => import('@/views/career/mock-practice/index.vue'), meta: { title: t('simulated_application_management') } },
      { path: 'teaching/students', name: 'TeachingStudents', component: () => import('@/views/teaching/students/index.vue'), meta: { title: t('student_list_2') } },
      { path: 'teaching/class-records', name: 'TeachingClassRecords', component: () => import('@/views/teaching/class-records/index.vue'), meta: { title: t('course_records') } },
      { path: 'dashboard', redirect: '/home' },
      { path: 'classes', name: 'Classes', component: () => import('@/views/classes/index.vue'), meta: { title: t('class_management') } },
      { path: 'students', redirect: '/teaching/students' },
      { path: 'mentors', name: 'Mentors', component: () => import('@/views/mentors/index.vue'), meta: { title: t('tutor_management') } },
      { path: 'schedule', redirect: '/profile/schedule' },
      { path: 'reports', name: 'Reports', component: () => import('@/views/reports/index.vue'), meta: { title: t('learning_report') } },
      { path: 'profile', redirect: '/profile/basic' },
      { path: 'profile/basic', name: 'ProfileBasic', component: () => import('@/views/profile/basic/index.vue'), meta: { title: t('basic_info') } },
      { path: 'profile/schedule', name: 'ProfileSchedule', component: () => import('@/views/profile/schedule/index.vue'), meta: { title: t('course_schedule') } }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })
router.beforeEach((to, _from, next) => {
  const token = getToken()
  if (to.meta.public) next()
  else if (!token) next({ name: 'Login', query: { redirect: to.fullPath } })
  else next()
})

export default router

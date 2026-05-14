import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'
import { i18n } from '@osg/shared'
const t = (key: string) => i18n.global.t(key)

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: t('login'), public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: t('home_page') } },
      { path: 'courses', name: 'Courses', component: () => import('@/views/courses/index.vue'), meta: { title: t('course_records') } },
      { path: 'communication', name: 'Communication', component: () => import('@/views/communication/index.vue'), meta: { title: t('interpersonal_communication_records') } },
      { path: 'job-overview', name: 'JobOverview', component: () => import('@/views/job-overview/index.vue'), meta: { title: t('overview_of_student_job_search') } },
      { path: 'mock-practice', name: 'MockPractice', component: () => import('@/views/mock-practice/index.vue'), meta: { title: t('simulated_application_management') } },
      { path: 'settlement', name: 'Settlement', component: () => import('@/views/settlement/index.vue'), meta: { title: t('class_hour_settlement') } },
      { path: 'expense', name: 'Expense', component: () => import('@/views/expense/index.vue'), meta: { title: t('reimbursement_management') } },
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/index.vue'), meta: { title: t('basic_info') } },
      { path: 'schedule', name: 'Schedule', component: () => import('@/views/schedule/index.vue'), meta: { title: t('course_schedule') } },
      { path: 'notice', name: 'Notice', component: () => import('@/views/notice/index.vue'), meta: { title: t('messages') } },
      { path: 'faq', name: 'Faq', component: () => import('@/views/faq/index.vue'), meta: { title: t('faq') } },
      { path: 'students', name: 'Students', component: () => import('@/views/students/index.vue'), meta: { title: t('my_students') } },
      { path: 'job-tracking', name: 'JobTracking', component: () => import('@/views/job-tracking/index.vue'), meta: { title: t('student_position_tracking') } },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = getToken()
  if (to.meta.public) {
    next()
  } else if (!token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router

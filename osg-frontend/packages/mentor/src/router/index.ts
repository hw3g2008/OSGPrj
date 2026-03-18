import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/forgot-password/index.vue'),
    meta: { title: '忘记密码', public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '首页' } },
      { path: 'courses', name: 'Courses', component: () => import('@/views/courses/index.vue'), meta: { title: '课程记录' } },
      { path: 'communication', name: 'Communication', component: () => import('@/views/communication/index.vue'), meta: { title: '人际关系沟通记录' } },
      { path: 'job-overview', name: 'JobOverview', component: () => import('@/views/job-overview/index.vue'), meta: { title: '学员求职总览' } },
      { path: 'sim-practice', name: 'SimPractice', component: () => import('@/views/sim-practice/index.vue'), meta: { title: '模拟应聘管理' } },
      { path: 'settlement', name: 'Settlement', component: () => import('@/views/settlement/index.vue'), meta: { title: '课时结算' } },
      { path: 'expense', name: 'Expense', component: () => import('@/views/expense/index.vue'), meta: { title: '报销管理' } },
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/index.vue'), meta: { title: '基本信息' } },
      { path: 'schedule', name: 'Schedule', component: () => import('@/views/schedule/index.vue'), meta: { title: '课程排期' } },
      { path: 'notice', name: 'Notice', component: () => import('@/views/notice/index.vue'), meta: { title: '消息' } },
      { path: 'faq', name: 'Faq', component: () => import('@/views/faq/index.vue'), meta: { title: '常见问题' } },
      { path: 'students', name: 'Students', component: () => import('@/views/students/index.vue'), meta: { title: '我的学员' } },
      { path: 'job-tracking', name: 'JobTracking', component: () => import('@/views/job-tracking/index.vue'), meta: { title: '学员岗位追踪' } },
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

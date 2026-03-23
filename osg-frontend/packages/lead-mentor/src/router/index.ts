import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue'), meta: { title: '登录', public: true } },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'Home', component: () => import('@/views/home/index.vue'), meta: { title: '首页' } },
      { path: 'career/positions', name: 'CareerPositions', component: () => import('@/views/career/positions/index.vue'), meta: { title: '岗位信息' } },
      { path: 'career/job-overview', name: 'CareerJobOverview', component: () => import('@/views/career/job-overview/index.vue'), meta: { title: '学员求职总览' } },
      { path: 'career/mock-practice', name: 'CareerMockPractice', component: () => import('@/views/career/mock-practice/index.vue'), meta: { title: '模拟应聘管理' } },
      { path: 'teaching/students', name: 'TeachingStudents', component: () => import('@/views/teaching/students/index.vue'), meta: { title: '学员列表' } },
      { path: 'teaching/class-records', name: 'TeachingClassRecords', component: () => import('@/views/teaching/class-records/index.vue'), meta: { title: '课程记录' } },
      { path: 'dashboard', redirect: '/home' },
      { path: 'classes', name: 'Classes', component: () => import('@/views/classes/index.vue'), meta: { title: '班级管理' } },
      { path: 'students', redirect: '/teaching/students' },
      { path: 'mentors', name: 'Mentors', component: () => import('@/views/mentors/index.vue'), meta: { title: '导师管理' } },
      { path: 'schedule', redirect: '/profile/schedule' },
      { path: 'reports', name: 'Reports', component: () => import('@/views/reports/index.vue'), meta: { title: '学情报告' } },
      { path: 'profile', redirect: '/profile/basic' },
      { path: 'profile/basic', name: 'ProfileBasic', component: () => import('@/views/profile/basic/index.vue'), meta: { title: '基本信息' } },
      { path: 'profile/schedule', name: 'ProfileSchedule', component: () => import('@/views/profile/schedule/index.vue'), meta: { title: '课程排期' } }
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

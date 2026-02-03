import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue'), meta: { title: '登录', public: true } },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '工作台' } },
      { path: 'classes', name: 'Classes', component: () => import('@/views/classes/index.vue'), meta: { title: '班级管理' } },
      { path: 'students', name: 'Students', component: () => import('@/views/students/index.vue'), meta: { title: '学员管理' } },
      { path: 'mentors', name: 'Mentors', component: () => import('@/views/mentors/index.vue'), meta: { title: '导师管理' } },
      { path: 'schedule', name: 'Schedule', component: () => import('@/views/schedule/index.vue'), meta: { title: '排课总览' } },
      { path: 'reports', name: 'Reports', component: () => import('@/views/reports/index.vue'), meta: { title: '学情报告' } },
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/index.vue'), meta: { title: '个人中心' } }
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

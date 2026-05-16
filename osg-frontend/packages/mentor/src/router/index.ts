import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'
import { i18n } from '@osg/shared'

// 路由元信息 title 通过 i18n key 表达，避免硬编码中文；
// 真正展示由消费方（document.title 等）使用 i18n.global.t(meta.titleKey) 取值。
// 仍保留 meta.title 以保持向后兼容，但其值在运行时通过 t() 拿。
const t = (key: string) => i18n.global.t(key)

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { titleKey: 'mentor.route.login', get title() { return t('mentor.route.login') }, public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/courses',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { titleKey: 'mentor.route.dashboard', get title() { return t('mentor.route.dashboard') } } },
      { path: 'courses', name: 'Courses', component: () => import('@/views/courses/index.vue'), meta: { titleKey: 'mentor.route.courses', get title() { return t('mentor.route.courses') } } },
      { path: 'communication', name: 'Communication', component: () => import('@/views/communication/index.vue'), meta: { titleKey: 'mentor.route.communication', get title() { return t('mentor.route.communication') } } },
      { path: 'job-overview', name: 'JobOverview', component: () => import('@/views/job-overview/index.vue'), meta: { titleKey: 'mentor.route.jobOverview', get title() { return t('mentor.route.jobOverview') } } },
      { path: 'mock-practice', name: 'MockPractice', component: () => import('@/views/mock-practice/index.vue'), meta: { titleKey: 'mentor.route.mockPractice', get title() { return t('mentor.route.mockPractice') } } },
      { path: 'settlement', name: 'Settlement', component: () => import('@/views/settlement/index.vue'), meta: { titleKey: 'mentor.route.settlement', get title() { return t('mentor.route.settlement') } } },
      { path: 'expense', name: 'Expense', component: () => import('@/views/expense/index.vue'), meta: { titleKey: 'mentor.route.expense', get title() { return t('mentor.route.expense') } } },
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/index.vue'), meta: { titleKey: 'mentor.route.profile', get title() { return t('mentor.route.profile') } } },
      { path: 'schedule', name: 'Schedule', component: () => import('@/views/schedule/index.vue'), meta: { titleKey: 'mentor.route.schedule', get title() { return t('mentor.route.schedule') } } },
      { path: 'notice', name: 'Notice', component: () => import('@/views/notice/index.vue'), meta: { titleKey: 'mentor.route.notice', get title() { return t('mentor.route.notice') } } },
      { path: 'faq', name: 'Faq', component: () => import('@/views/faq/index.vue'), meta: { titleKey: 'mentor.route.faq', get title() { return t('mentor.route.faq') } } },
      { path: 'students', name: 'Students', component: () => import('@/views/students/index.vue'), meta: { titleKey: 'mentor.route.students', get title() { return t('mentor.route.students') } } },
      { path: 'job-tracking', name: 'JobTracking', component: () => import('@/views/job-tracking/index.vue'), meta: { titleKey: 'mentor.route.jobTracking', get title() { return t('mentor.route.jobTracking') } } },
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

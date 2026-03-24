import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'

interface PlaceholderRouteOptions {
  path: string
  name: string
  pageId: string
  title: string
  titleEn: string
  description: string
}

function buildPlaceholderBullets(title: string): string[] {
  return [
    '该功能入口已保留，方便后续快速访问。',
    `当前版本暂未开放${title}。`,
    '完整内容将在后续版本上线，敬请期待。',
  ]
}

function createPlaceholderRoute(options: PlaceholderRouteOptions): RouteRecordRaw {
  return {
    path: options.path,
    name: options.name,
    component: () => import('@/views/placeholder/index.vue'),
    meta: {
      title: options.title,
      placeholderContent: {
        pageId: options.pageId,
        title: options.title,
        titleEn: options.titleEn,
        description: options.description,
        cardTitle: `${options.title}敬请期待`,
        cardDescription: `当前版本暂未开放${options.title}，相关内容将在后续版本上线。`,
        statusText: '敬请期待',
        bullets: buildPlaceholderBullets(options.title),
      },
    },
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/forgot-password/index.vue'),
    meta: { title: '忘记密码', public: true },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'career/positions',
        name: 'CareerPositions',
        component: () => import('@/views/career/positions/index.vue'),
        meta: { title: '岗位信息' },
      },
      {
        path: 'career/job-overview',
        name: 'CareerJobOverview',
        component: () => import('@/views/career/job-overview/index.vue'),
        meta: { title: '学员求职总览' },
      },
      {
        path: 'career/mock-practice',
        name: 'CareerMockPractice',
        component: () => import('@/views/career/mock-practice/index.vue'),
        meta: { title: '模拟应聘管理' },
      },
      {
        path: 'students',
        name: 'Students',
        component: () => import('@/views/students/index.vue'),
        meta: { title: '学员列表' },
      },
      createPlaceholderRoute({
        path: 'communication',
        name: 'Communication',
        pageId: 'page-communication',
        title: '人际关系沟通记录',
        titleEn: 'Communication Records',
        description: '与学员沟通相关的内容将在这里开放。',
      }),
      {
        path: 'class-records',
        name: 'ClassRecords',
        component: () => import('@/views/class-records/index.vue'),
        meta: { title: '课程记录' },
      },
      createPlaceholderRoute({
        path: 'settlement',
        name: 'Settlement',
        pageId: 'page-settlement',
        title: '课时结算',
        titleEn: 'Settlement',
        description: '课时结算相关的内容将在这里开放。',
      }),
      createPlaceholderRoute({
        path: 'expense',
        name: 'Expense',
        pageId: 'page-expense',
        title: '报销管理',
        titleEn: 'Expense',
        description: '报销处理相关的内容将在这里开放。',
      }),
      createPlaceholderRoute({
        path: 'files',
        name: 'Files',
        pageId: 'page-files',
        title: '文件',
        titleEn: 'Files',
        description: '文件资料相关的内容将在这里开放。',
      }),
      createPlaceholderRoute({
        path: 'online-test-bank',
        name: 'OnlineTestBank',
        pageId: 'page-online-test-bank',
        title: '在线测试题库',
        titleEn: 'Online Test Bank',
        description: '在线测试题库相关的内容将在这里开放。',
      }),
      createPlaceholderRoute({
        path: 'interview-bank',
        name: 'InterviewBank',
        pageId: 'page-interview-bank',
        title: '真人面试题库',
        titleEn: 'Interview Bank',
        description: '真人面试题库相关的内容将在这里开放。',
      }),
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '基本信息' },
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: '课程排期' },
      },
      createPlaceholderRoute({
        path: 'notice',
        name: 'Notice',
        pageId: 'page-notice',
        title: '消息',
        titleEn: 'Notice',
        description: '消息通知相关的内容将在这里开放。',
      }),
      createPlaceholderRoute({
        path: 'faq',
        name: 'Faq',
        pageId: 'page-faq',
        title: '常见问题',
        titleEn: 'FAQ',
        description: '常见问题与帮助内容将在这里开放。',
      }),
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = getToken()

  if (to.meta.public) {
    next()
    return
  }

  if (!token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import { getToken } from '@osg/shared/utils'
import { i18n } from '@osg/shared'

const t = (key: string, params?: Record<string, unknown>) =>
  (i18n.global.t as (k: string, p?: Record<string, unknown>) => string)(key, params)

interface PlaceholderRouteOptions {
  path: string
  name: string
  pageId: string
  titleKey: string
  titleEnKey: string
  descKey: string
}

function buildPlaceholderBullets(title: string): string[] {
  return [
    t('assistant.router.placeholder.bulletEntryReserved'),
    t('assistant.router.placeholder.bulletCurrentClosed', { title }),
    t('assistant.router.placeholder.bulletLaterRelease'),
  ]
}

function createPlaceholderRoute(options: PlaceholderRouteOptions): RouteRecordRaw {
  const title = t(options.titleKey)
  const titleEn = t(options.titleEnKey)
  const description = t(options.descKey)
  return {
    path: options.path,
    name: options.name,
    component: () => import('@/views/placeholder/index.vue'),
    meta: {
      title,
      placeholderContent: {
        pageId: options.pageId,
        title,
        titleEn,
        description,
        cardTitle: t('assistant.router.placeholder.cardTitleSuffix', { title }),
        cardDescription: t('assistant.router.placeholder.cardDescription', { title }),
        statusText: t('assistant.router.placeholder.statusComingSoon'),
        bullets: buildPlaceholderBullets(title),
      },
    },
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: t('assistant.router.title.login'), public: true },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/career/positions',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: { title: t('assistant.router.title.home') },
      },
      {
        path: 'career/positions',
        name: 'CareerPositions',
        component: () => import('@/views/career/positions/index.vue'),
        meta: { title: t('assistant.router.title.positions') },
      },
      {
        path: 'career/job-overview',
        name: 'CareerJobOverview',
        component: () => import('@/views/career/job-overview/index.vue'),
        meta: { title: t('assistant.router.title.jobOverview') },
      },
      {
        path: 'career/mock-practice',
        name: 'CareerMockPractice',
        component: () => import('@/views/career/mock-practice/index.vue'),
        meta: { title: t('assistant.router.title.mockPractice') },
      },
      {
        path: 'students',
        name: 'Students',
        component: () => import('@/views/students/index.vue'),
        meta: { title: t('assistant.router.title.students') },
      },
      createPlaceholderRoute({
        path: 'communication',
        name: 'Communication',
        pageId: 'page-communication',
        titleKey: 'assistant.router.placeholder.communicationTitle',
        titleEnKey: 'assistant.router.placeholder.communicationTitleEn',
        descKey: 'assistant.router.placeholder.communicationDesc',
      }),
      {
        path: 'class-records',
        name: 'ClassRecords',
        component: () => import('@/views/class-records/index.vue'),
        meta: { title: t('assistant.router.title.classRecords') },
      },
      createPlaceholderRoute({
        path: 'settlement',
        name: 'Settlement',
        pageId: 'page-settlement',
        titleKey: 'assistant.router.placeholder.settlementTitle',
        titleEnKey: 'assistant.router.placeholder.settlementTitleEn',
        descKey: 'assistant.router.placeholder.settlementDesc',
      }),
      createPlaceholderRoute({
        path: 'expense',
        name: 'Expense',
        pageId: 'page-expense',
        titleKey: 'assistant.router.placeholder.expenseTitle',
        titleEnKey: 'assistant.router.placeholder.expenseTitleEn',
        descKey: 'assistant.router.placeholder.expenseDesc',
      }),
      createPlaceholderRoute({
        path: 'files',
        name: 'Files',
        pageId: 'page-files',
        titleKey: 'assistant.router.placeholder.filesTitle',
        titleEnKey: 'assistant.router.placeholder.filesTitleEn',
        descKey: 'assistant.router.placeholder.filesDesc',
      }),
      createPlaceholderRoute({
        path: 'online-test-bank',
        name: 'OnlineTestBank',
        pageId: 'page-online-test-bank',
        titleKey: 'assistant.router.placeholder.onlineTestTitle',
        titleEnKey: 'assistant.router.placeholder.onlineTestTitleEn',
        descKey: 'assistant.router.placeholder.onlineTestDesc',
      }),
      createPlaceholderRoute({
        path: 'interview-bank',
        name: 'InterviewBank',
        pageId: 'page-interview-bank',
        titleKey: 'assistant.router.placeholder.interviewBankTitle',
        titleEnKey: 'assistant.router.placeholder.interviewBankTitleEn',
        descKey: 'assistant.router.placeholder.interviewBankDesc',
      }),
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: t('assistant.router.title.profile') },
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: t('assistant.router.title.schedule') },
      },
      createPlaceholderRoute({
        path: 'notice',
        name: 'Notice',
        pageId: 'page-notice',
        titleKey: 'assistant.router.placeholder.noticeTitle',
        titleEnKey: 'assistant.router.placeholder.noticeTitleEn',
        descKey: 'assistant.router.placeholder.noticeDesc',
      }),
      createPlaceholderRoute({
        path: 'faq',
        name: 'Faq',
        pageId: 'page-faq',
        titleKey: 'assistant.router.placeholder.faqTitle',
        titleEnKey: 'assistant.router.placeholder.faqTitleEn',
        descKey: 'assistant.router.placeholder.faqDesc',
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

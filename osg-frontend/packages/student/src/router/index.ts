import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { COMING_SOON_TOAST, isStudentPathAvailable, normalizeStudentPath } from '@/navigation/access'
import { PHASE1_DEFAULT_PATH } from '@/navigation/phase1'
import { getToken, getUser } from '@osg/shared/utils'

const STUDENT_COMING_SOON_ROUTE_NAME = 'StudentComingSoon'
const STUDENT_COMING_SOON_SUBTITLE = t('student.router.k1')

function readSingleQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (Array.isArray(value)) {
    const firstString = value.find(item => typeof item === 'string' && item.trim())
    return typeof firstString === 'string' ? firstString : undefined
  }

  return undefined
}

function resolveComingSoonProps(query: Record<string, unknown>) {
  const requestedPath = normalizeStudentPath(readSingleQueryValue(query.from) ?? '')

  return {
    title: readSingleQueryValue(query.title) ?? COMING_SOON_TOAST,
    subtitle: STUDENT_COMING_SOON_SUBTITLE,
    requestedPath: requestedPath === '/' ? '' : requestedPath
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: t('student.router.k2'), public: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/forgot-password/index.vue'),
    meta: { title: t('student.router.k3'), public: true }
  },
  {
    path: '/account-locked',
    name: 'AccountLocked',
    component: () => import('@/views/account-locked/index.vue'),
    // public 让未登录也能直达；rolloutBypass 跳过 isStudentPathAvailable 灰度过滤
    meta: { title: t('student.router.k4'), public: true, rolloutBypass: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: PHASE1_DEFAULT_PATH,
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: t('student.router.k5') }
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: t('student.router.k5') }
      },
      {
        path: 'courses',
        name: 'Courses',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: t('student.router.k6') }
      },
      {
        path: 'myclass',
        name: 'MyClass',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: t('student.router.k6') }
      },
      {
        path: 'communication',
        name: 'Communication',
        component: () => import('@/views/communication/index.vue'),
        meta: { title: t('student.router.k7') }
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('@/views/feedback/index.vue'),
        meta: { title: t('student.router.k8') }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/index.vue'),
        meta: { title: t('student.router.k9') }
      },
      {
        path: 'ai-interview',
        name: 'AiInterview',
        component: () => import('@/views/ai-interview/index.vue'),
        meta: { title: t('student.router.k10') }
      },
      {
        path: 'resume',
        name: 'Resume',
        component: () => import('@/views/resume/index.vue'),
        meta: { title: t('student.router.k11') }
      },
      {
        path: 'ai-resume',
        name: 'AiResume',
        component: () => import('@/views/ai-resume/index.vue'),
        meta: { title: t('student.router.k12') }
      },
      {
        path: 'career',
        name: 'Career',
        component: () => import('@/views/career/index.vue'),
        meta: { title: t('student.router.k13') }
      },
      {
        path: 'positions',
        name: 'Positions',
        component: () => import('@/views/positions/index.vue'),
        meta: { title: t('student.router.k14') }
      },
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: t('student.router.k15') }
      },
      {
        path: 'job-tracking',
        name: 'JobTracking',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: t('student.router.k15') }
      },
      {
        path: 'mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: t('student.router.k16') }
      },
      {
        path: 'request',
        name: 'Request',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: t('student.router.k17') }
      },
      {
        path: 'files',
        name: 'Files',
        component: () => import('@/views/files/index.vue'),
        meta: { title: t('student.router.k18') }
      },
      {
        path: 'online-test-bank',
        name: 'OnlineTestBank',
        component: () => import('@/views/online-test-bank/index.vue'),
        meta: { title: t('student.router.k19') }
      },
      {
        path: 'interview-bank',
        name: 'InterviewBank',
        component: () => import('@/views/interview-bank/index.vue'),
        meta: { title: t('student.router.k20') }
      },
      {
        path: 'questions',
        name: 'Questions',
        component: () => import('@/views/questions/index.vue'),
        meta: { title: t('student.router.k21') }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: t('student.router.k22') }
      },
      {
        path: 'coming-soon',
        name: STUDENT_COMING_SOON_ROUTE_NAME,
        component: () => import('@/views/placeholder/index.vue'),
        props: route => resolveComingSoonProps(route.query),
        meta: { title: COMING_SOON_TOAST, rolloutBypass: true }
      },
      {
        path: 'notice',
        name: 'Notice',
        component: () => import('@/views/notice/index.vue'),
        meta: { title: t('student.router.k23') }
      },
      {
        path: 'faq',
        name: 'Faq',
        component: () => import('@/views/faq/index.vue'),
        meta: { title: t('student.router.k24') }
      },
      {
        path: 'complaint',
        name: 'Complaint',
        component: () => import('@/views/complaint/index.vue'),
        meta: { title: t('student.router.k25') }
      },
      {
        path: 'netlog',
        name: 'Netlog',
        component: () => import('@/views/netlog/index.vue'),
        meta: { title: t('student.router.k26') }
      },
      {
        path: 'restricted',
        name: 'Restricted',
        component: () => import('@/views/restricted/index.vue'),
        meta: { title: t('student.router.k27'), rolloutBypass: true }
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: t('student.router.k28') }
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('@/views/resources/index.vue'),
        meta: { title: t('student.router.k29') }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = getToken()

  if (to.meta.public) {
    next()
  } else if (!token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (isAccountLocked(to)) {
    next({ name: 'AccountLocked', query: { reason: resolveLockReason() } })
  } else if (to.path === '/' || to.meta.rolloutBypass) {
    next()
  } else if (!isStudentPathAvailable(to.path)) {
    next({
      name: STUDENT_COMING_SOON_ROUTE_NAME,
      query: {
        from: normalizeStudentPath(to.path),
        title: typeof to.meta.title === 'string' ? to.meta.title : COMING_SOON_TOAST
      }
    })
  } else {
    next()
  }
})

/**
 * 判断当前学员是否处于锁定态：account_status=2（已结束）或 黑名单。
 *
 * 守卫触发时 user 信息通常已由 login-workflow 写入 localStorage。
 * 极端 case：若 getUser 返回 null（未走完登录、刷新前老 token），不拦截，
 * 让后续接口由后端 ServiceException 兜底。
 */
function isAccountLocked(to: { name?: string | symbol | null }): boolean {
  if (to.name === 'AccountLocked') {
    return false
  }
  const user = getUser<{ accountStatus?: string; blacklisted?: boolean } | null>()
  if (!user) {
    return false
  }
  return user.accountStatus === '2' || user.blacklisted === true
}

function resolveLockReason(): 'contract_ended' | 'blacklisted' {
  const user = getUser<{ accountStatus?: string; blacklisted?: boolean } | null>()
  if (user?.accountStatus === '2') {
    return 'contract_ended'
  }
  return 'blacklisted'
}

export default router

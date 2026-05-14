import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { COMING_SOON_TOAST, isStudentPathAvailable, normalizeStudentPath } from '@/navigation/access'
import { PHASE1_DEFAULT_PATH } from '@/navigation/phase1'
import { getToken } from '@osg/shared/utils'
import { i18n } from '@osg/shared'
const t = (key: string) => i18n.global.t(key)

const STUDENT_COMING_SOON_ROUTE_NAME = 'StudentComingSoon'
const STUDENT_COMING_SOON_SUBTITLE = '当前页面不在本次学生端交付范围内。'

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
    meta: { title: t('login'), public: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/forgot-password/index.vue'),
    meta: { title: t('retrieve_password'), public: true }
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
        meta: { title: t('home_page') }
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: t('home_page') }
      },
      {
        path: 'courses',
        name: 'Courses',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: t('course_records') }
      },
      {
        path: 'myclass',
        name: 'MyClass',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: t('course_records') }
      },
      {
        path: 'communication',
        name: 'Communication',
        component: () => import('@/views/communication/index.vue'),
        meta: { title: t('interpersonal_communication_records') }
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('@/views/feedback/index.vue'),
        meta: { title: t('course_feedback') }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/index.vue'),
        meta: { title: t('class_records') }
      },
      {
        path: 'ai-interview',
        name: 'AiInterview',
        component: () => import('@/views/ai-interview/index.vue'),
        meta: { title: 'AI面试分析' }
      },
      {
        path: 'resume',
        name: 'Resume',
        component: () => import('@/views/resume/index.vue'),
        meta: { title: t('resume_management') }
      },
      {
        path: 'ai-resume',
        name: 'AiResume',
        component: () => import('@/views/ai-resume/index.vue'),
        meta: { title: 'AI简历分析' }
      },
      {
        path: 'career',
        name: 'Career',
        component: () => import('@/views/career/index.vue'),
        meta: { title: t('job_search_center') }
      },
      {
        path: 'positions',
        name: 'Positions',
        component: () => import('@/views/positions/index.vue'),
        meta: { title: t('position_information') }
      },
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: t('my_job_search') }
      },
      {
        path: 'job-tracking',
        name: 'JobTracking',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: t('my_job_search') }
      },
      {
        path: 'mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: t('mock_interview') }
      },
      {
        path: 'request',
        name: 'Request',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: t('course_application') }
      },
      {
        path: 'files',
        name: 'Files',
        component: () => import('@/views/files/index.vue'),
        meta: { title: t('file') }
      },
      {
        path: 'online-test-bank',
        name: 'OnlineTestBank',
        component: () => import('@/views/online-test-bank/index.vue'),
        meta: { title: t('online_test_question_bank') }
      },
      {
        path: 'interview-bank',
        name: 'InterviewBank',
        component: () => import('@/views/interview-bank/index.vue'),
        meta: { title: t('real_person_interview_question_bank') }
      },
      {
        path: 'questions',
        name: 'Questions',
        component: () => import('@/views/questions/index.vue'),
        meta: { title: t('real_interview_questions') }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: t('personal_center') }
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
        meta: { title: t('message_center') }
      },
      {
        path: 'faq',
        name: 'Faq',
        component: () => import('@/views/faq/index.vue'),
        meta: { title: t('faq') }
      },
      {
        path: 'complaint',
        name: 'Complaint',
        component: () => import('@/views/complaint/index.vue'),
        meta: { title: t('complaints_suggestions_2') }
      },
      {
        path: 'netlog',
        name: 'Netlog',
        component: () => import('@/views/netlog/index.vue'),
        meta: { title: t('communication_records_2') }
      },
      {
        path: 'restricted',
        name: 'Restricted',
        component: () => import('@/views/restricted/index.vue'),
        meta: { title: t('restricted_mode'), rolloutBypass: true }
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: t('course_schedule') }
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('@/views/resources/index.vue'),
        meta: { title: t('learning_resources') }
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

export default router

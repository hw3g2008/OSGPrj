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
    meta: { title: '找回密码', public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'courses',
        name: 'Courses',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: '我的课程' }
      },
      {
        path: 'myclass',
        name: 'MyClass',
        component: () => import('@/views/courses/index.vue'),
        meta: { title: '我的课程' }
      },
      {
        path: 'communication',
        name: 'Communication',
        component: () => import('@/views/communication/index.vue'),
        meta: { title: '人际关系沟通记录' }
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('@/views/feedback/index.vue'),
        meta: { title: '课程反馈' }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/index.vue'),
        meta: { title: '上课记录' }
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
        meta: { title: '简历管理' }
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
        meta: { title: '求职中心' }
      },
      {
        path: 'positions',
        name: 'Positions',
        component: () => import('@/views/positions/index.vue'),
        meta: { title: '岗位信息' }
      },
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: '我的求职' }
      },
      {
        path: 'job-tracking',
        name: 'JobTracking',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: '我的求职' }
      },
      {
        path: 'mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: '模拟面试' }
      },
      {
        path: 'request',
        name: 'Request',
        component: () => import('@/views/mock-practice/index.vue'),
        meta: { title: '课程申请' }
      },
      {
        path: 'files',
        name: 'Files',
        component: () => import('@/views/files/index.vue'),
        meta: { title: '文件' }
      },
      {
        path: 'online-test-bank',
        name: 'OnlineTestBank',
        component: () => import('@/views/online-test-bank/index.vue'),
        meta: { title: '在线测试题库' }
      },
      {
        path: 'interview-bank',
        name: 'InterviewBank',
        component: () => import('@/views/interview-bank/index.vue'),
        meta: { title: '真人面试题库' }
      },
      {
        path: 'questions',
        name: 'Questions',
        component: () => import('@/views/questions/index.vue'),
        meta: { title: '面试真题' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心' }
      },
      {
        path: 'notice',
        name: 'Notice',
        component: () => import('@/views/notice/index.vue'),
        meta: { title: '消息中心' }
      },
      {
        path: 'faq',
        name: 'Faq',
        component: () => import('@/views/faq/index.vue'),
        meta: { title: '常见问题' }
      },
      {
        path: 'complaint',
        name: 'Complaint',
        component: () => import('@/views/complaint/index.vue'),
        meta: { title: '投诉与建议' }
      },
      {
        path: 'netlog',
        name: 'Netlog',
        component: () => import('@/views/netlog/index.vue'),
        meta: { title: '沟通记录' }
      },
      {
        path: 'restricted',
        name: 'Restricted',
        component: () => import('@/views/restricted/index.vue'),
        meta: { title: '受限模式' }
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/schedule/index.vue'),
        meta: { title: '课程排期' }
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('@/views/resources/index.vue'),
        meta: { title: '学习资源' }
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
  } else {
    next()
  }
})

export default router

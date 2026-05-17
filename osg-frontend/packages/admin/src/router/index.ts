import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getToken } from '@osg/shared/utils'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: 'Login', public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/permission/roles',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'permission/menu',
        name: 'MenuManagement',
        component: () => import('@/views/permission/menu/index.vue'),
        meta: { title: 'Menu Management', permission: 'system:menu:list' }
      },
      {
        path: 'permission/roles',
        name: 'Roles',
        component: () => import('@/views/permission/roles/index.vue'),
        meta: { title: 'Roles & Permissions', permission: 'system:role:list' }
      },
      {
        path: 'permission/users',
        name: 'Users',
        component: () => import('@/views/permission/users/index.vue'),
        meta: { title: 'Admin Users', permission: 'system:user:list' }
      },
      {
        path: 'permission/dicts',
        name: 'DictManagement',
        component: () => import('@/views/permission/dicts/index.vue'),
        alias: ['/permission/base-data'],
        meta: { title: 'Dictionary Management', permission: 'system:dict:list' }
      },
      {
        path: 'users/students',
        name: 'Students',
        component: () => import('@/views/users/students/index.vue'),
        meta: { title: 'Students', permission: 'admin:students:list' }
      },
      {
        path: 'users/staff',
        name: 'Staff',
        component: () => import('@/views/users/staff/index.vue'),
        meta: { title: 'Staff', permission: 'admin:staff:list' }
      },
      {
        path: 'users/contracts',
        name: 'Contracts',
        component: () => import('@/views/users/contracts/index.vue'),
        meta: { title: 'Contracts', permission: 'admin:contracts:list' }
      },
      {
        path: 'users/mentor-schedule',
        name: 'MentorSchedule',
        component: () => import('@/views/users/mentor-schedule/index.vue'),
        meta: { title: 'Mentor Schedule', permission: 'admin:mentor-schedule:list' }
      },
      {
        path: 'users/mentor-change-review',
        name: 'MentorChangeReview',
        component: () => import('@/views/users/mentor-change-review/index.vue'),
        meta: { title: 'Mentor Profile Change Review', permission: 'admin:mentor-change-review:list' }
      },
      {
        path: 'career/positions',
        name: 'Positions',
        component: () => import('@/views/career/positions/index.vue'),
        meta: { title: 'Positions', permission: 'admin:positions:list' }
      },
      {
        path: 'career/student-positions',
        name: 'StudentPositions',
        component: () => import('@/views/career/student-positions/index.vue'),
        meta: { title: 'Student Positions', permission: 'admin:student-positions:list' }
      },
      {
        path: 'career/job-overview',
        name: 'JobOverview',
        component: () => import('@/views/career/job-overview/index.vue'),
        meta: { title: 'Job Overview', permission: 'admin:job-overview:list' }
      },
      {
        path: 'career/mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/career/mock-practice/index.vue'),
        meta: { title: 'Mock Practice', permission: 'admin:mock-practice:list' }
      },
      {
        path: 'teaching/class-records',
        name: 'ClassRecords',
        component: () => import('@/views/teaching/class-records/index.vue'),
        meta: { title: 'Session Records', permission: 'admin:class-records:list' }
      },
      {
        path: 'profile/logs',
        name: 'Logs',
        component: () => import('@/views/profile/logs/index.vue'),
        meta: { title: 'Audit Logs', permission: 'admin:logs:list' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const token = getToken()
  const userStore = useUserStore()

  document.title = `${to.meta.title || 'OSG Admin'} - OSG Admin`

  if (to.meta.public) {
    if (token && to.name === 'Login') {
      // v1 暂不上首页（MainLayout 已 v-show="false" 隐藏入口），
      // 已登录访问 /login 时跳第一个可见菜单项 /permission/roles
      // （也与根路径 redirect 一致）。
      return { path: '/permission/roles' }
    } else {
      return true
    }
  }

  if (!token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (!userStore.userInfo || userStore.permissions.length === 0) {
    try {
      await userStore.fetchInfo()
    } catch (_error) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }

  const permission = to.meta.permission as string | undefined
  if (permission) {
    const isAdmin = userStore.permissions.includes('*:*:*')
    if (!isAdmin && !userStore.permissions.includes(permission)) {
      message.warning('Access denied')
      return false
    }
  }

  return true
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getToken } from '@osg/shared/utils'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import MainLayout from '@/layouts/MainLayout.vue'
import { i18n } from '@osg/shared'
const t = (key: string) => i18n.global.t(key)

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: t('login'), public: true }
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
        meta: { title: t('home_page') }
      },
      {
        path: 'permission/menu',
        name: 'MenuManagement',
        component: () => import('@/views/permission/menu/index.vue'),
        meta: { title: t('menu_management'), permission: 'system:menu:list' }
      },
      {
        path: 'permission/roles',
        name: 'Roles',
        component: () => import('@/views/permission/roles/index.vue'),
        meta: { title: t('permission_configuration'), permission: 'system:role:list' }
      },
      {
        path: 'permission/users',
        name: 'Users',
        component: () => import('@/views/permission/users/index.vue'),
        meta: { title: t('backend_user_management'), permission: 'system:user:list' }
      },
      {
        path: 'permission/dicts',
        name: 'DictManagement',
        component: () => import('@/views/permission/dicts/index.vue'),
        alias: ['/permission/base-data'],
        meta: { title: t('dictionary_management'), permission: 'system:dict:list' }
      },
      {
        path: 'users/students',
        name: 'Students',
        component: () => import('@/views/users/students/index.vue'),
        meta: { title: t('student_management'), permission: 'admin:students:list' }
      },
      {
        path: 'users/staff',
        name: 'Staff',
        component: () => import('@/views/users/staff/index.vue'),
        meta: { title: t('tutor_management'), permission: 'admin:staff:list' }
      },
      {
        path: 'users/contracts',
        name: 'Contracts',
        component: () => import('@/views/users/contracts/index.vue'),
        meta: { title: t('contract_management'), permission: 'admin:contracts:list' }
      },
      {
        path: 'users/mentor-schedule',
        name: 'MentorSchedule',
        component: () => import('@/views/users/mentor-schedule/index.vue'),
        meta: { title: t('tutor_schedule_management'), permission: 'admin:mentor-schedule:list' }
      },
      {
        path: 'career/positions',
        name: 'Positions',
        component: () => import('@/views/career/positions/index.vue'),
        meta: { title: t('position_information'), permission: 'admin:positions:list' }
      },
      {
        path: 'career/student-positions',
        name: 'StudentPositions',
        component: () => import('@/views/career/student-positions/index.vue'),
        meta: { title: t('posts_created_by_students'), permission: 'admin:student-positions:list' }
      },
      {
        path: 'career/job-overview',
        name: 'JobOverview',
        component: () => import('@/views/career/job-overview/index.vue'),
        meta: { title: t('overview_of_student_job_search'), permission: 'admin:job-overview:list' }
      },
      {
        path: 'career/mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/career/mock-practice/index.vue'),
        meta: { title: t('simulated_application_management'), permission: 'admin:mock-practice:list' }
      },
      {
        path: 'teaching/class-records',
        name: 'ClassRecords',
        component: () => import('@/views/teaching/class-records/index.vue'),
        meta: { title: t('course_records'), permission: 'admin:class-records:list' }
      },
      {
        path: 'profile/logs',
        name: 'Logs',
        component: () => import('@/views/profile/logs/index.vue'),
        meta: { title: t('operation_log'), permission: 'admin:logs:list' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to) => {
  const token = getToken()
  const userStore = useUserStore()

  // 设置页面标题
  document.title = `${to.meta.title || 'OSG Admin'} - ${t('backend_management_system')}`

  if (to.meta.public) {
    // 公开页面，已登录则跳转首页
    if (token && to.name === 'Login') {
      return { path: '/dashboard' }
    } else {
      return true
    }
  }

  if (!token) {
    // 未登录，跳转登录页
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // 页面刷新/直达场景：先恢复用户与权限，再做页面级权限判断
  if (!userStore.userInfo || userStore.permissions.length === 0) {
    try {
      await userStore.fetchInfo()
    } catch (_error) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }

  // 已登录，检查页面级权限
  const permission = to.meta.permission as string | undefined
  if (permission) {
    const isAdmin = userStore.permissions.includes('*:*:*')
    if (!isAdmin && !userStore.permissions.includes(permission)) {
      message.warning(t('you_do_not_have_permission_to_access_thi'))
      return false
    }
  }

  return true
})

export default router

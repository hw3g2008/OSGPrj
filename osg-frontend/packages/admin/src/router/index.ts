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
    meta: { title: '登录', public: true }
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
        meta: { title: '首页' }
      },
      {
        path: 'permission/menu',
        name: 'MenuManagement',
        component: () => import('@/views/permission/menu/index.vue'),
        meta: { title: '菜单管理', permission: 'system:menu:list' }
      },
      {
        path: 'permission/roles',
        name: 'Roles',
        component: () => import('@/views/permission/roles/index.vue'),
        meta: { title: '权限配置', permission: 'system:role:list' }
      },
      {
        path: 'permission/users',
        name: 'Users',
        component: () => import('@/views/permission/users/index.vue'),
        meta: { title: '后台用户管理', permission: 'system:user:list' }
      },
      {
        path: 'permission/base-data',
        name: 'BaseData',
        component: () => import('@/views/permission/base-data/index.vue'),
        meta: { title: '字典管理', permission: 'system:dict:list' }
      },
      {
        path: 'users/students',
        name: 'Students',
        component: () => import('@/views/users/students/index.vue'),
        meta: { title: '学员管理', permission: 'admin:students:list' }
      },
      {
        path: 'users/staff',
        name: 'Staff',
        component: () => import('@/views/users/staff/index.vue'),
        meta: { title: '导师管理', permission: 'admin:staff:list' }
      },
      {
        path: 'users/contracts',
        name: 'Contracts',
        component: () => import('@/views/users/contracts/index.vue'),
        meta: { title: '合同管理', permission: 'admin:contracts:list' }
      },
      {
        path: 'users/mentor-schedule',
        name: 'MentorSchedule',
        component: () => import('@/views/users/mentor-schedule/index.vue'),
        meta: { title: '导师排期管理', permission: 'admin:mentor-schedule:list' }
      },
      {
        path: 'career/positions',
        name: 'Positions',
        component: () => import('@/views/career/positions/index.vue'),
        meta: { title: '岗位信息', permission: 'admin:positions:list' }
      },
      {
        path: 'career/student-positions',
        name: 'StudentPositions',
        component: () => import('@/views/career/student-positions/index.vue'),
        meta: { title: '学生自添岗位', permission: 'admin:student-positions:list' }
      },
      {
        path: 'career/job-overview',
        name: 'JobOverview',
        component: () => import('@/views/career/job-overview/index.vue'),
        meta: { title: '学员求职总览', permission: 'admin:job-overview:list' }
      },
      {
        path: 'career/mock-practice',
        name: 'MockPractice',
        component: () => import('@/views/career/mock-practice/index.vue'),
        meta: { title: '模拟应聘管理', permission: 'admin:mock-practice:list' }
      },
      {
        path: 'teaching/class-records',
        name: 'ClassRecords',
        component: () => import('@/views/teaching/class-records/index.vue'),
        meta: { title: '课程记录', permission: 'admin:class-records:list' }
      },
      {
        path: 'profile/logs',
        name: 'Logs',
        component: () => import('@/views/profile/logs/index.vue'),
        meta: { title: '操作日志', permission: 'admin:logs:list' }
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
  document.title = `${to.meta.title || 'OSG Admin'} - OSG 后台管理系统`

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
      message.warning('您没有权限访问此页面')
      return false
    }
  }

  return true
})

export default router

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
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页' }
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
        meta: { title: '基础数据管理', permission: 'system:baseData:list' }
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

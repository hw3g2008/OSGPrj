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

  // 设置页面标题
  document.title = `${to.meta.title || 'OSG Admin'} - OSG 后台管理系统`

  if (to.meta.public) {
    // 公开页面，已登录则跳转首页
    if (token && to.name === 'Login') {
      next({ path: '/dashboard' })
    } else {
      next()
    }
  } else if (!token) {
    // 未登录，跳转登录页
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    // 已登录，检查页面级权限
    const permission = to.meta.permission as string | undefined
    if (permission) {
      const userStore = useUserStore()
      const isAdmin = userStore.permissions.includes('*:*:*')
      if (!isAdmin && !userStore.permissions.includes(permission)) {
        message.warning('您没有权限访问此页面')
        next(false)
        return
      }
    }
    next()
  }
})

export default router

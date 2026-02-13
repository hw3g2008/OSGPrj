import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getToken } from '@osg/shared/utils'
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
        meta: { title: '权限配置' }
      },
      {
        path: 'permission/users',
        name: 'Users',
        component: () => import('@/views/permission/users/index.vue'),
        meta: { title: '后台用户管理' }
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
    next()
  }
})

export default router

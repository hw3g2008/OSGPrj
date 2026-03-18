import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router } from 'vue-router'

// Mock shared utils
vi.mock('@osg/shared/utils', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  setUser: vi.fn(),
  removeToken: vi.fn()
}))

import { getToken } from '@osg/shared/utils'

function createTestRouter() {
  const Login = { template: '<div>Login</div>' }
  const Dashboard = { template: '<div>Dashboard</div>' }
  const Layout = { template: '<div><router-view /></div>' }
  const Courses = { template: '<div>Courses</div>' }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: Login, meta: { public: true } },
      { path: '/forgot-password', name: 'ForgotPassword', component: Login, meta: { public: true } },
      {
        path: '/',
        component: Layout,
        redirect: '/dashboard',
        children: [
          { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: '首页' } },
          { path: 'courses', name: 'Courses', component: Courses, meta: { title: '课程记录' } }
        ]
      }
    ]
  })

  // Replicate the guard from router/index.ts
  router.beforeEach((to, _from, next) => {
    const token = (getToken as any)()
    if (to.meta.public) {
      next()
    } else if (!token) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  })

  return router
}

describe('Router guard', () => {
  let router: Router

  beforeEach(() => {
    vi.clearAllMocks()
    router = createTestRouter()
  })

  it('allows access to /login without token', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('Login')
  })

  it('allows access to /forgot-password without token', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    await router.push('/forgot-password')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('ForgotPassword')
  })

  it('redirects to login when no token and accessing protected route', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('allows access to protected route with token', async () => {
    vi.mocked(getToken).mockReturnValue('valid-token')
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  it('preserves redirect path in query when redirecting to login', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    await router.push('/courses')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.query.redirect).toBe('/courses')
  })
})

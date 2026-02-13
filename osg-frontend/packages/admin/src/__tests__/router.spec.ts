import { describe, it, expect, vi, beforeEach } from 'vitest'

// 模拟 getToken
const mockGetToken = vi.fn()

// 路由守卫逻辑
function routeGuard(to: { meta?: { public?: boolean }; name?: string }, token: string | null) {
  if (to.meta?.public) {
    if (token && to.name === 'Login') {
      return { redirect: '/dashboard' }
    }
    return { next: true }
  } else if (!token) {
    return { redirect: '/login', query: { redirect: to.name } }
  } else {
    return { next: true }
  }
}

describe('路由守卫测试', () => {
  beforeEach(() => {
    mockGetToken.mockReset()
  })

  it('未登录访问受保护页面应重定向到登录页', () => {
    const result = routeGuard({ name: 'Dashboard' }, null)
    expect(result.redirect).toBe('/login')
  })

  it('已登录访问受保护页面应放行', () => {
    const result = routeGuard({ name: 'Dashboard' }, 'valid-token')
    expect(result.next).toBe(true)
  })

  it('未登录访问公开页面应放行', () => {
    const result = routeGuard({ name: 'Login', meta: { public: true } }, null)
    expect(result.next).toBe(true)
  })

  it('已登录访问登录页应重定向到首页', () => {
    const result = routeGuard({ name: 'Login', meta: { public: true } }, 'valid-token')
    expect(result.redirect).toBe('/dashboard')
  })
})

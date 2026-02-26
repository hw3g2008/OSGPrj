import { describe, it, expect } from 'vitest'

// 路由守卫权限检查逻辑（与 router/index.ts 中的 beforeEach 一致）
interface RouteMeta {
  public?: boolean
  permission?: string
  title?: string
}

interface GuardResult {
  action: 'next' | 'redirect' | 'block'
  target?: string
  message?: string
}

function routeGuard(
  to: { meta?: RouteMeta; name?: string; fullPath?: string },
  token: string | null,
  permissions: string[]
): GuardResult {
  if (to.meta?.public) {
    if (token && to.name === 'Login') {
      return { action: 'redirect', target: '/dashboard' }
    }
    return { action: 'next' }
  }

  if (!token) {
    return { action: 'redirect', target: '/login' }
  }

  // 已登录，检查页面级权限
  const permission = to.meta?.permission
  if (permission) {
    const isAdmin = permissions.includes('*:*:*')
    if (!isAdmin && !permissions.includes(permission)) {
      return { action: 'block', message: '您没有权限访问此页面' }
    }
  }

  return { action: 'next' }
}

describe('路由权限守卫测试', () => {
  it('无权限用户访问受限页面时被拦截', () => {
    const result = routeGuard(
      { name: 'Roles', meta: { title: '权限配置', permission: 'system:role:list' } },
      'valid-token',
      ['users:student:list']
    )
    expect(result.action).toBe('block')
    expect(result.message).toBe('您没有权限访问此页面')
  })

  it('有权限用户访问受限页面时放行', () => {
    const result = routeGuard(
      { name: 'Roles', meta: { title: '权限配置', permission: 'system:role:list' } },
      'valid-token',
      ['system:role:list']
    )
    expect(result.action).toBe('next')
  })

  it('超级管理员可以访问所有受限页面', () => {
    const result = routeGuard(
      { name: 'Roles', meta: { title: '权限配置', permission: 'system:role:list' } },
      'valid-token',
      ['*:*:*']
    )
    expect(result.action).toBe('next')
  })

  it('公开页面不被拦截', () => {
    const result = routeGuard(
      { name: 'Login', meta: { title: '登录', public: true } },
      null,
      []
    )
    expect(result.action).toBe('next')
  })

  it('无权限标识的页面不被拦截', () => {
    const result = routeGuard(
      { name: 'Dashboard', meta: { title: '首页' } },
      'valid-token',
      []
    )
    expect(result.action).toBe('next')
  })

  it('未登录用户跳转登录页的行为不受影响', () => {
    const result = routeGuard(
      { name: 'Roles', meta: { title: '权限配置', permission: 'system:role:list' }, fullPath: '/permission/roles' },
      null,
      []
    )
    expect(result.action).toBe('redirect')
    expect(result.target).toBe('/login')
  })

  it('已登录访问登录页重定向到首页', () => {
    const result = routeGuard(
      { name: 'Login', meta: { title: '登录', public: true } },
      'valid-token',
      []
    )
    expect(result.action).toBe('redirect')
    expect(result.target).toBe('/dashboard')
  })

  it('空权限列表访问受限页面被拦截', () => {
    const result = routeGuard(
      { name: 'Users', meta: { title: '后台用户管理', permission: 'system:user:list' } },
      'valid-token',
      []
    )
    expect(result.action).toBe('block')
    expect(result.message).toBe('您没有权限访问此页面')
  })
})

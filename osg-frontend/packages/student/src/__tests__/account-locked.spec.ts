import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const lockPagePath = path.resolve(__dirname, '../views/account-locked/index.vue')
const routerSource = fs.readFileSync(path.resolve(__dirname, '../router/index.ts'), 'utf-8')

describe('学员账号锁定页 + 路由守卫', () => {
  it('account-locked 页面源文件存在且渲染两套 reason 文案', () => {
    expect(fs.existsSync(lockPagePath)).toBe(true)
    const lockSource = fs.readFileSync(lockPagePath, 'utf-8')
    expect(lockSource).toContain('合同已结束')
    expect(lockSource).toContain('账号已加入黑名单')
    expect(lockSource).toContain("raw === 'blacklisted'")
    expect(lockSource).toContain('clearAuth')
  })

  it('router 注册 AccountLocked 路由（public + rolloutBypass）', () => {
    expect(routerSource).toContain("name: 'AccountLocked'")
    expect(routerSource).toContain("path: '/account-locked'")
    expect(routerSource).toContain('public: true, rolloutBypass: true')
  })

  it('beforeEach 守卫：account_status=2 或 blacklisted=true → 重定向 lock 页', () => {
    expect(routerSource).toContain('isAccountLocked')
    expect(routerSource).toContain("user.accountStatus === '2'")
    expect(routerSource).toContain('user.blacklisted === true')
    expect(routerSource).toContain("name: 'AccountLocked'")
    expect(routerSource).toContain('resolveLockReason')
    // AccountLocked 路由本身不能被守卫再次拦截（防 loop）
    expect(routerSource).toContain("to.name === 'AccountLocked'")
  })
})

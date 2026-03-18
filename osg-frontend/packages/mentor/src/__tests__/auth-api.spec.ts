import { describe, it, expect, vi } from 'vitest'
import { login, getInfo, logout, sendResetCode, verifyResetCode, resetPassword } from '@/api/auth'

// Mock the shared http client
vi.mock('@osg/shared/utils/request', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

import { http } from '@osg/shared/utils/request'

describe('Auth API', () => {
  it('login calls POST /login with credentials', async () => {
    vi.mocked(http.post).mockResolvedValue({ token: 'abc' })
    const result = await login({ username: 'test', password: 'pass' })
    expect(http.post).toHaveBeenCalledWith('/login', { username: 'test', password: 'pass' })
    expect(result).toEqual({ token: 'abc' })
  })

  it('getInfo calls GET /getInfo', async () => {
    vi.mocked(http.get).mockResolvedValue({ user: {}, roles: ['mentor'], permissions: [] })
    const result = await getInfo()
    expect(http.get).toHaveBeenCalledWith('/getInfo')
    expect(result.roles).toContain('mentor')
  })

  it('logout calls POST /logout', async () => {
    vi.mocked(http.post).mockResolvedValue({})
    await logout()
    expect(http.post).toHaveBeenCalledWith('/logout')
  })

  it('sendResetCode calls correct endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({})
    await sendResetCode('test@example.com')
    expect(http.post).toHaveBeenCalledWith('/api/mentor/forgot-password/send-code', { email: 'test@example.com' })
  })

  it('verifyResetCode calls correct endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({})
    await verifyResetCode('test@example.com', '123456')
    expect(http.post).toHaveBeenCalledWith('/api/mentor/forgot-password/verify-code', { email: 'test@example.com', code: '123456' })
  })

  it('resetPassword calls correct endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({})
    await resetPassword('test@example.com', '123456', 'newpass')
    expect(http.post).toHaveBeenCalledWith('/api/mentor/forgot-password/reset', { email: 'test@example.com', code: '123456', password: 'newpass' })
  })
})

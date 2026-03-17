import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  resolveLoginRedirect,
  submitLogin,
  validateLoginForm
} from '../views/login/login-workflow'

const loginViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/login/index.vue'),
  'utf-8'
)

describe('student login workflow', () => {
  describe('validateLoginForm', () => {
    it('returns both field errors when username and password are empty', () => {
      expect(validateLoginForm({ username: '', password: '' })).toEqual({
        username: '请输入用户名',
        password: '请输入密码'
      })
    })

    it('treats whitespace username as empty', () => {
      expect(validateLoginForm({ username: '   ', password: 'secret' })).toEqual({
        username: '请输入用户名',
        password: ''
      })
    })

    it('passes when both fields are present', () => {
      expect(validateLoginForm({ username: 'student', password: 'secret' })).toEqual({
        username: '',
        password: ''
      })
    })
  })

  describe('resolveLoginRedirect', () => {
    it('falls back to dashboard when redirect is missing', () => {
      expect(resolveLoginRedirect()).toBe('/dashboard')
    })

    it('keeps the provided redirect', () => {
      expect(resolveLoginRedirect('/positions')).toBe('/positions')
    })
  })

  describe('submitLogin', () => {
    it('uses trimmed username, stores auth data, and redirects on success', async () => {
      const login = vi.fn().mockResolvedValue({ token: 'token-1' })
      const getInfo = vi.fn().mockResolvedValue({ user: { userName: 'student' } })
      const setToken = vi.fn()
      const setUser = vi.fn()
      const push = vi.fn()
      const notifySuccess = vi.fn()

      const result = await submitLogin(
        { username: ' student ', password: 'secret' },
        '/applications',
        { login, getInfo, setToken, setUser, push, notifySuccess }
      )

      expect(result).toEqual({ ok: true, loginError: '' })
      expect(login).toHaveBeenCalledWith({ username: 'student', password: 'secret' })
      expect(setToken).toHaveBeenCalledWith('token-1')
      expect(setUser).toHaveBeenCalledWith({ userName: 'student' })
      expect(notifySuccess).toHaveBeenCalledWith('登录成功')
      expect(push).toHaveBeenCalledWith('/applications')
    })

    it('returns the backend message when login fails', async () => {
      const login = vi.fn().mockRejectedValue(new Error('用户名或密码错误'))
      const getInfo = vi.fn()
      const setToken = vi.fn()
      const setUser = vi.fn()
      const push = vi.fn()
      const notifySuccess = vi.fn()

      const result = await submitLogin(
        { username: 'student', password: 'wrong' },
        undefined,
        { login, getInfo, setToken, setUser, push, notifySuccess }
      )

      expect(result).toEqual({ ok: false, loginError: '用户名或密码错误' })
      expect(getInfo).not.toHaveBeenCalled()
      expect(setToken).not.toHaveBeenCalled()
      expect(setUser).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
      expect(notifySuccess).not.toHaveBeenCalled()
    })
  })

  describe('login page source contract', () => {
    it('uses the student-specific login entry while keeping shared getInfo', () => {
      expect(loginViewSource).toContain("import { studentLogin, getInfo } from '@osg/shared/api'")
    })

    it('keeps the prototype demo credentials prefilled for visual parity', () => {
      expect(loginViewSource).toContain("username: 'student'")
      expect(loginViewSource).toContain("password: '123456'")
    })

    it('renders the prototype form ids required by the S-001 AC', () => {
      expect(loginViewSource).toContain('id="login-username"')
      expect(loginViewSource).toContain('id="login-password"')
      expect(loginViewSource).toContain('id="login-btn"')
    })

    it('keeps the loading label and forgot-password entry', () => {
      expect(loginViewSource).toContain("loading ? '登录中...' : '登 录'")
      expect(loginViewSource).toContain('to="/forgot-password"')
    })

    it('keeps the prototype native login shell instead of the Ant form shell', () => {
      expect(loginViewSource).toContain('class="login-logo-icon"')
      expect(loginViewSource).toContain('class="form-group"')
      expect(loginViewSource).toContain('class="pwd-wrapper"')
      expect(loginViewSource).toContain('class="pwd-toggle"')
      expect(loginViewSource).not.toContain('<a-form')
    })
  })
})

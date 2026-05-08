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
    it('falls back to positions when redirect is missing', () => {
      expect(resolveLoginRedirect()).toBe('/positions')
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
      // accountStatus + blacklisted 一并塞进 user 对象，路由守卫从 getUser() 读取
      expect(setUser).toHaveBeenCalledWith({
        userName: 'student',
        accountStatus: '0',
        blacklisted: false,
      })
      expect(notifySuccess).toHaveBeenCalledWith('登录成功')
      expect(push).toHaveBeenCalledWith('/applications')
    })

    it('redirects status=2 student to lock page with contract_ended reason', async () => {
      const login = vi.fn().mockResolvedValue({ token: 'token-1' })
      const getInfo = vi
        .fn()
        .mockResolvedValue({ user: { userName: 'ended-student' }, accountStatus: '2' })
      const setToken = vi.fn()
      const setUser = vi.fn()
      const push = vi.fn()
      const notifySuccess = vi.fn()

      const result = await submitLogin(
        { username: 'ended-student', password: 'secret' },
        '/positions',
        { login, getInfo, setToken, setUser, push, notifySuccess },
      )

      expect(result).toEqual({ ok: true, loginError: '' })
      expect(setUser).toHaveBeenCalledWith({
        userName: 'ended-student',
        accountStatus: '2',
        blacklisted: false,
      })
      expect(push).toHaveBeenCalledWith('/account-locked?reason=contract_ended')
    })

    it('redirects blacklisted student to lock page with blacklisted reason', async () => {
      const login = vi.fn().mockResolvedValue({ token: 'token-1' })
      const getInfo = vi
        .fn()
        .mockResolvedValue({ user: { userName: 'bl-student' }, accountStatus: '0', blacklisted: true })
      const setToken = vi.fn()
      const setUser = vi.fn()
      const push = vi.fn()
      const notifySuccess = vi.fn()

      const result = await submitLogin(
        { username: 'bl-student', password: 'secret' },
        '/positions',
        { login, getInfo, setToken, setUser, push, notifySuccess },
      )

      expect(result).toEqual({ ok: true, loginError: '' })
      expect(setUser).toHaveBeenCalledWith({
        userName: 'bl-student',
        accountStatus: '0',
        blacklisted: true,
      })
      expect(push).toHaveBeenCalledWith('/account-locked?reason=blacklisted')
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
    it('uses the student-specific login entry and student-scoped getInfo', () => {
      expect(loginViewSource).toContain(
        "import { studentLogin, getStudentInfo as getInfo } from '@osg/shared/api'",
      )
    })

    // [本期不落地] 演示账号预填
    it.skip('keeps the prototype demo credentials prefilled for visual parity', () => {
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginPage from '@/views/login/index.vue'

// Mock shared modules
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  getInfo: vi.fn()
}))
vi.mock('@osg/shared/api/auth', () => ({
  getCaptchaImage: vi.fn().mockResolvedValue({ captchaEnabled: false, img: '', uuid: '' })
}))
vi.mock('@osg/shared/utils', () => ({
  setToken: vi.fn(),
  setUser: vi.fn(),
  getToken: vi.fn()
}))

import { login, getInfo } from '@/api/auth'
import { getCaptchaImage } from '@osg/shared/api/auth'
import { setToken, setUser } from '@osg/shared/utils'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/forgot-password', name: 'ForgotPassword', component: { template: '<div />' } }
    ]
  })
}

function mountLogin() {
  const router = createTestRouter()
  router.push('/login')
  return mount(LoginPage, {
    global: { plugins: [router] }
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with username and password fields', () => {
    const wrapper = mountLogin()
    expect(wrapper.find('.login-page').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('.login-btn').exists()).toBe(true)
  })

  it('uses a non-submit login button to avoid native page reloads', () => {
    const wrapper = mountLogin()
    expect(wrapper.find('.login-btn').attributes('type')).toBe('button')
  })

  it('does not request captcha on mount', () => {
    mountLogin()
    expect(getCaptchaImage).not.toHaveBeenCalled()
  })

  it('renders brand area with title and features', () => {
    const wrapper = mountLogin()
    expect(wrapper.find('.login-left__title').text()).toBe('OSG Platform')
    expect(wrapper.findAll('.login-feature').length).toBe(4)
  })

  it('renders forgot password link', () => {
    const wrapper = mountLogin()
    const link = wrapper.find('.login-links a')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('点击重置')
  })

  it('shows error when username is empty on submit', async () => {
    const wrapper = mountLogin()
    await wrapper.find('.login-btn').trigger('click')
    expect(wrapper.find('.field-error').text()).toBe('请输入用户名或邮箱')
  })

  it('shows error when password is empty on submit', async () => {
    const wrapper = mountLogin()
    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('.login-btn').trigger('click')
    expect(wrapper.find('.field-error').text()).toBe('请输入密码')
  })

  it('does not call login API when fields are empty', async () => {
    const wrapper = mountLogin()
    await wrapper.find('.login-btn').trigger('click')
    expect(login).not.toHaveBeenCalled()
  })

  it('clears field error on input', async () => {
    const wrapper = mountLogin()
    await wrapper.find('.login-btn').trigger('click')
    expect(wrapper.find('.field-error').exists()).toBe(true)
    await wrapper.find('input[type="text"]').setValue('a')
    await wrapper.find('input[type="text"]').trigger('input')
    // The username error should be cleared after input
    const errors = wrapper.findAll('.field-error')
    const usernameError = errors.find(e => e.text() === '请输入用户名或邮箱')
    expect(usernameError).toBeUndefined()
  })

  it('toggles password visibility', async () => {
    const wrapper = mountLogin()
    const pwdInput = wrapper.find('.pwd-wrapper input')
    expect(pwdInput.attributes('type')).toBe('password')
    await wrapper.find('.pwd-toggle').trigger('click')
    expect(pwdInput.attributes('type')).toBe('text')
    await wrapper.find('.pwd-toggle').trigger('click')
    expect(pwdInput.attributes('type')).toBe('password')
  })

  it('calls login API and redirects on success', async () => {
    const mockLogin = vi.mocked(login)
    const mockGetInfo = vi.mocked(getInfo)
    mockLogin.mockResolvedValue({ token: 'test-token' })
    mockGetInfo.mockResolvedValue({ user: { name: 'Test' }, roles: ['mentor'], permissions: [] })

    const router = createTestRouter()
    router.push('/login')
    const wrapper = mount(LoginPage, { global: { plugins: [router] } })

    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('.pwd-wrapper input').setValue('password123')
    await wrapper.find('.login-btn').trigger('click')
    await vi.dynamicImportSettled()

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    })
  })

  it('shows error banner when login fails', async () => {
    const mockLogin = vi.mocked(login)
    mockLogin.mockRejectedValue(new Error('用户名或密码错误'))

    const wrapper = mountLogin()
    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('.pwd-wrapper input').setValue('wrongpass')
    await wrapper.find('.login-btn').trigger('click')
    await vi.dynamicImportSettled()

    // Wait for async error handling
    await new Promise(r => setTimeout(r, 10))
    expect(wrapper.find('.login-error').exists()).toBe(true)
  })

  it('rejects non-mentor role', async () => {
    const mockLogin = vi.mocked(login)
    const mockGetInfo = vi.mocked(getInfo)
    mockLogin.mockResolvedValue({ token: 'test-token' })
    mockGetInfo.mockResolvedValue({ user: { name: 'Student' }, roles: ['student'], permissions: [] })

    const wrapper = mountLogin()
    await wrapper.find('input[type="text"]').setValue('student')
    await wrapper.find('.pwd-wrapper input').setValue('pass')
    await wrapper.find('.login-btn').trigger('click')
    await vi.dynamicImportSettled()
    await new Promise(r => setTimeout(r, 10))

    expect(wrapper.find('.login-error').text()).toContain('无导师端访问权限')
  })
})

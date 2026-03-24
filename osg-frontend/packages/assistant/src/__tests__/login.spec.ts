import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@osg/shared/api', () => ({
  assistantLogin: vi.fn(),
  getAssistantInfo: vi.fn(),
}))

vi.mock('@osg/shared/utils', () => ({
  setToken: vi.fn(),
  setUser: vi.fn(),
  removeToken: vi.fn(),
  removeUser: vi.fn(),
}))

import LoginPage from '@/views/login/index.vue'
import { assistantLogin, getAssistantInfo } from '@osg/shared/api'
import type { UserInfo } from '@osg/shared/types'
import { removeToken, removeUser, setToken, setUser } from '@osg/shared/utils'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'Login', component: LoginPage },
      { path: '/home', name: 'Home', component: { template: '<div>Home</div>' } },
      { path: '/forgot-password', name: 'ForgotPassword', component: { template: '<div>Forgot</div>' } },
    ],
  })
}

async function mountLogin(initialRoute = '/login') {
  const router = createTestRouter()
  await router.push(initialRoute)
  await router.isReady()

  const wrapper = mount(LoginPage, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

async function flushPromises() {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function createUser(overrides: Partial<UserInfo>): UserInfo {
  return {
    userId: 1,
    userName: 'assistant.user',
    nickName: 'Assistant User',
    status: 'active',
    roles: ['assistant'],
    ...overrides,
  }
}

describe('assistant login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the prototype shell with brand, button, and links', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.find('.login-page').exists()).toBe(true)
    expect(wrapper.find('.login-logo').exists()).toBe(true)
    expect(wrapper.find('.login-title').text()).toBe('欢迎回来')
    expect(wrapper.find('.login-role-tag').text()).toBe('助教端')
    expect(wrapper.find('.login-btn').text()).toContain('登录')
    expect(wrapper.find('.login-links a').text()).toContain('点击重置')
    expect(wrapper.findAll('.login-feature')).toHaveLength(4)
  })

  it('uses a non-submit login button to avoid native page reloads', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.find('.login-btn').attributes('type')).toBe('button')
  })

  it('shows field errors and blocks login when required fields are empty', async () => {
    const { wrapper } = await mountLogin()

    await wrapper.find('.login-btn').trigger('click')

    const errors = wrapper.findAll('.field-error').map((node) => node.text())
    expect(errors).toContain('请输入用户名或邮箱')
    expect(errors).toContain('请输入密码')
    expect(assistantLogin).not.toHaveBeenCalled()
  })

  it('clears the username error once the user starts typing', async () => {
    const { wrapper } = await mountLogin()

    await wrapper.find('.login-btn').trigger('click')
    await wrapper.find('#login-username').setValue('assistant')
    await wrapper.find('#login-username').trigger('input')

    const errors = wrapper.findAll('.field-error').map((node) => node.text())
    expect(errors).not.toContain('请输入用户名或邮箱')
  })

  it('toggles password visibility from the eye button', async () => {
    const { wrapper } = await mountLogin()
    const passwordInput = wrapper.find('#login-password')

    expect(passwordInput.attributes('type')).toBe('password')
    await wrapper.find('.pwd-toggle').trigger('click')
    expect(passwordInput.attributes('type')).toBe('text')
    expect(wrapper.find('#pwd-eye').classes()).toContain('mdi-eye')
    await wrapper.find('.pwd-toggle').trigger('click')
    expect(passwordInput.attributes('type')).toBe('password')
  })

  it('submits trimmed credentials, stores auth data, and redirects on success', async () => {
    const assistantUser = createUser({ userName: 'assistant.user' })
    vi.mocked(assistantLogin).mockResolvedValue({ token: 'assistant-token' })
    vi.mocked(getAssistantInfo).mockResolvedValue({
      user: assistantUser,
      roles: ['assistant'],
      permissions: [],
    })

    const { wrapper, router } = await mountLogin('/login')

    await wrapper.find('#login-username').setValue(' assistant.user ')
    await wrapper.find('#login-password').setValue('secret123')
    await wrapper.find('.login-btn').trigger('click')
    await flushPromises()

    expect(assistantLogin).toHaveBeenCalledWith({
      username: 'assistant.user',
      password: 'secret123',
    })
    expect(setToken).toHaveBeenCalledWith('assistant-token')
    expect(setUser).toHaveBeenCalledWith(assistantUser)
    expect(router.currentRoute.value.fullPath).toBe('/home')
  })

  it('honors a safe redirect query after login succeeds', async () => {
    const assistantUser = createUser({ userName: 'assistant.user' })
    vi.mocked(assistantLogin).mockResolvedValue({ token: 'assistant-token' })
    vi.mocked(getAssistantInfo).mockResolvedValue({
      user: assistantUser,
      roles: ['assistant'],
      permissions: [],
    })

    const { wrapper, router } = await mountLogin('/login?redirect=%2Fhome')

    await wrapper.find('#login-username').setValue('assistant.user')
    await wrapper.find('#login-password').setValue('secret123')
    await wrapper.find('.login-btn').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/home')
  })

  it('shows an auth boundary error and clears auth state for non-assistant roles', async () => {
    vi.mocked(assistantLogin).mockResolvedValue({ token: 'assistant-token' })
    vi.mocked(getAssistantInfo).mockResolvedValue({
      user: createUser({
        userName: 'mentor.user',
        nickName: 'Mentor User',
        roles: ['mentor'],
      }),
      roles: ['mentor'],
      permissions: [],
    })

    const { wrapper, router } = await mountLogin()

    await wrapper.find('#login-username').setValue('mentor.user')
    await wrapper.find('#login-password').setValue('secret123')
    await wrapper.find('.login-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.login-error').text()).toContain('该账号无助教端访问权限')
    expect(removeToken).toHaveBeenCalledTimes(1)
    expect(removeUser).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('shows the backend error when login fails', async () => {
    vi.mocked(assistantLogin).mockRejectedValue(new Error('用户不存在/密码错误'))

    const { wrapper } = await mountLogin()

    await wrapper.find('#login-username').setValue('assistant.user')
    await wrapper.find('#login-password').setValue('wrong-password')
    await wrapper.find('.login-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.login-error').text()).toContain('用户不存在/密码错误')
    expect(getAssistantInfo).not.toHaveBeenCalled()
    expect(setToken).not.toHaveBeenCalled()
    expect(setUser).not.toHaveBeenCalled()
  })
})

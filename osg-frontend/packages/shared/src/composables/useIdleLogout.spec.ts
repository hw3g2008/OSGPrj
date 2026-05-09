import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

// 重要：mock 必须在 import composable 之前定义
vi.mock('../api/auth', () => ({
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('../utils/request', () => ({
  http: {
    get: vi.fn(() => Promise.resolve({})),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
}))

vi.mock('ant-design-vue', () => ({
  message: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

import { useIdleLogout } from './useIdleLogout'
import { logout as logoutApi } from '../api/auth'
import { http } from '../utils/request'

const mockedLogoutApi = logoutApi as unknown as ReturnType<typeof vi.fn>
const mockedHttpGet = http.get as unknown as ReturnType<typeof vi.fn>

function mountWithIdle(options?: Parameters<typeof useIdleLogout>[0]) {
  const Host = defineComponent({
    setup() {
      const api = useIdleLogout(options)
      return { api }
    },
    render() {
      return h('div', 'host')
    },
  })
  return mount(Host)
}

describe('useIdleLogout', () => {
  let originalLocation: Location

  beforeEach(() => {
    vi.useFakeTimers()
    mockedLogoutApi.mockClear()
    mockedHttpGet.mockClear()
    // jsdom 下 window.location.href 写入会 navigate；用 stub 避开
    originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('triggersLogoutAfterIdleTimeout', async () => {
    const wrapper = mountWithIdle()

    // 推进 idle 时间
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

    // logout 应被调用
    expect(mockedLogoutApi).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('resetsTimerOnUserActivity', async () => {
    const wrapper = mountWithIdle()

    // 先推进 30 分钟
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(mockedLogoutApi).not.toHaveBeenCalled()

    // 此时触发用户活动 → 计时器重置
    window.dispatchEvent(new Event('mousedown'))
    await Promise.resolve()

    // 再推进 59 分 59 秒，仍不应触发（因为刚刚重置）
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000 - 1)
    expect(mockedLogoutApi).not.toHaveBeenCalled()

    // 再推 1ms 触发
    await vi.advanceTimersByTimeAsync(1)
    expect(mockedLogoutApi).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('pingsBackendOnActivityWithThrottle', async () => {
    const wrapper = mountWithIdle()

    // 第 1 次活动 → ping 应被调用
    window.dispatchEvent(new Event('mousedown'))
    await Promise.resolve()
    expect(mockedHttpGet).toHaveBeenCalledTimes(1)
    expect(mockedHttpGet).toHaveBeenCalledWith('/getInfo', expect.objectContaining({ skipErrorMessage: true }))

    // 立即再触发 4 次（不到节流时间）→ 仍只有 1 次
    await vi.advanceTimersByTimeAsync(2 * 1000) // 越过 1s 重置节流
    window.dispatchEvent(new Event('keydown'))
    await vi.advanceTimersByTimeAsync(2 * 1000)
    window.dispatchEvent(new Event('click'))
    await vi.advanceTimersByTimeAsync(2 * 1000)
    window.dispatchEvent(new Event('scroll'))
    await vi.advanceTimersByTimeAsync(2 * 1000)
    window.dispatchEvent(new Event('touchstart'))
    await Promise.resolve()
    expect(mockedHttpGet).toHaveBeenCalledTimes(1)

    // 推进 10 分钟（节流到期）→ 下次活动应再 ping
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    window.dispatchEvent(new Event('mousedown'))
    await Promise.resolve()
    expect(mockedHttpGet).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('cleanupOnUnmount', async () => {
    const wrapper = mountWithIdle()
    wrapper.unmount()

    // unmount 后再触发活动，不应再调任何 API
    window.dispatchEvent(new Event('mousedown'))
    await Promise.resolve()
    expect(mockedHttpGet).not.toHaveBeenCalled()

    // 推进 idle 时间，也不应触发 logout
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(mockedLogoutApi).not.toHaveBeenCalled()
  })
})

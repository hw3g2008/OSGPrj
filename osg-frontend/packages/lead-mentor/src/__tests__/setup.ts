// ============================================================
// Vitest setup: LM 端在 jsdom 下运行 antd 组件需要的 polyfill
//
// 原因：
// - jsdom 不实现 window.matchMedia（antd 的 responsiveObserve 要用）
// - jsdom 不实现 ResizeObserver（antd Table/Tabs 要用）
// - jsdom 不实现 IntersectionObserver（部分 antd 组件可能用到）
// - Node v22+ 内置的空壳 localStorage 会压过 jsdom 的实现，
//   导致 `localStorage.getItem is not a function`
// - vue-i18n 需在 mount 前 install plugin，否则 useI18n() 抛
//   "Need to install with `app.use` function"。
//
// 本文件与 shared / mentor 端 __tests__/setup.ts 等价，统一给
// jsdom 下的 antd + vue-i18n 测试提供最小化 polyfill。
// ============================================================

import { afterEach } from 'vitest'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

const localStorageImpl = new MemoryStorage()
const sessionStorageImpl = new MemoryStorage()

function installStorage(target: any, name: 'localStorage' | 'sessionStorage', impl: Storage) {
  try {
    Object.defineProperty(target, name, {
      value: impl,
      writable: true,
      configurable: true,
    })
  } catch {
    // noop: 某些 host 下属性已锁定，忽略即可
  }
}

installStorage(globalThis, 'localStorage', localStorageImpl)
installStorage(globalThis, 'sessionStorage', sessionStorageImpl)
if (typeof window !== 'undefined') {
  installStorage(window, 'localStorage', localStorageImpl)
  installStorage(window, 'sessionStorage', sessionStorageImpl)
}

afterEach(() => {
  localStorageImpl.clear()
  sessionStorageImpl.clear()
})

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as any).ResizeObserver = ResizeObserverStub
    ;(window as any).ResizeObserver = ResizeObserverStub
  }

  if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    ;(globalThis as any).IntersectionObserver = IntersectionObserverStub
    ;(window as any).IntersectionObserver = IntersectionObserverStub
  }
}

// vue-i18n: 全局注入 plugin，让 mount() 自动 pick up；锁定 zh 以匹配
// 现存断言（参见 `i18n-glossary.md` §4「测试用例 expect 描述保中文方便看」）。
// 仅 jsdom 环境（挂载 Vue 组件）才需要；node 环境（vite-proxy-entry）跳过，
// 避免触发 shared barrel 的 Directory import (require) 错误。
if (typeof window !== 'undefined') {
  const [{ config }, sharedMod] = await Promise.all([
    import('@vue/test-utils'),
    import('@osg/shared'),
  ])
  const { i18n } = sharedMod as { i18n: any }
  i18n.global.locale.value = 'zh'
  config.global.plugins = [...((config.global.plugins as unknown[]) || []), i18n]
}

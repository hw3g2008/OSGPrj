// ============================================================
// Vitest setup: LM 端在 jsdom 下运行 antd 组件需要的 polyfill
//
// 原因：
// - jsdom 不实现 window.matchMedia（antd 的 responsiveObserve 要用）
// - jsdom 不实现 ResizeObserver（antd Table/Tabs 要用）
// - jsdom 不实现 IntersectionObserver（部分 antd 组件可能用到）
// - Node v22+ 内置的空壳 localStorage 会压过 jsdom 的实现，
//   导致 `localStorage.getItem is not a function`
//
// 本文件给出最小化 polyfill，让 jsdom 下的测试不会因为找不到
// 这些全局 API 而崩溃。注意：polyfill 只满足"能被调用"，并不
// 保证语义 100% 一致（测试尽量避免依赖这些 API 的副作用）。
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

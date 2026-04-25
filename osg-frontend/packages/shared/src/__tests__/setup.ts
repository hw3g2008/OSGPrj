// ============================================================
// Vitest 测试环境 setup（@osg/shared 包自包含）
//
// 背景：Node.js v22+ 开始在全局内置 experimental localStorage，
//       但需要 --localstorage-file 参数才能工作，未提供时
//       globalThis.localStorage 是"空壳对象"（无 getItem 等方法），
//       会压过 jsdom environment 注入的 window.localStorage，
//       导致 `localStorage.getItem is not a function`。
//
// 本文件用内存 Storage polyfill 覆盖全局，让所有依赖
// localStorage / sessionStorage 的前端代码在测试环境里可用。
//
// 与 assistant/__tests__/setup.ts 同形态，shared 包独立维护一份，
// 避免跨包测试基础设施相互耦合（M0.4 Step 4.1 决策 Q1=P1）。
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

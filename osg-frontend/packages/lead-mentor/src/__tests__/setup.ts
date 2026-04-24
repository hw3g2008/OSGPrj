// ============================================================
// Vitest setup: LM 端在 jsdom 下运行 antd 组件需要的 polyfill
//
// 原因：
// - jsdom 不实现 window.matchMedia（antd 的 responsiveObserve 要用）
// - jsdom 不实现 ResizeObserver（antd Table/Tabs 要用）
// - jsdom 不实现 IntersectionObserver（部分 antd 组件可能用到）
//
// 本文件给出最小化 polyfill，让 jsdom 下的测试不会因为找不到
// 这些全局 API 而崩溃。注意：polyfill 只满足"能被调用"，并不
// 保证语义 100% 一致（测试尽量避免依赖这些 API 的副作用）。
// ============================================================

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

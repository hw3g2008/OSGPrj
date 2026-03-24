import { describe, expect, it, vi } from 'vitest'

async function loadRouterWithToken(token: string | null) {
  vi.resetModules()
  vi.doMock('@osg/shared/utils', () => ({
    getToken: vi.fn(() => token),
  }))

  const routerModule = await import('@/router')
  return routerModule.default
}

describe('assistant router navigation', () => {
  it('registers the full assistant IA including visible placeholder routes for this delivery round', async () => {
    const router = await loadRouterWithToken('assistant-token')
    const routePaths = router
      .getRoutes()
      .map((route) => route.path)
      .sort()

    expect(routePaths).toEqual(
      expect.arrayContaining([
        '/',
        '/login',
        '/forgot-password',
        '/home',
        '/career/positions',
        '/career/job-overview',
        '/career/mock-practice',
        '/students',
        '/communication',
        '/class-records',
        '/settlement',
        '/expense',
        '/files',
        '/online-test-bank',
        '/interview-bank',
        '/profile',
        '/schedule',
        '/notice',
        '/faq',
      ]),
    )
    expect(routePaths).not.toContain('/dashboard')
    expect(routePaths).not.toContain('/materials')
    expect(routePaths).not.toContain('/feedback')
  })

  it('redirects anonymous visitors from protected routes to /login with the original path', async () => {
    const router = await loadRouterWithToken(null)

    await router.push('/expense')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/expense')
  })

  it('allows anonymous visitors to open /forgot-password directly', async () => {
    const router = await loadRouterWithToken(null)

    await router.push('/forgot-password')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('ForgotPassword')
    expect(router.currentRoute.value.fullPath).toBe('/forgot-password')
  })

  it('keeps authenticated users inside protected real and placeholder routes', async () => {
    const router = await loadRouterWithToken('assistant-token')

    await router.push('/faq')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('Faq')
    expect(router.currentRoute.value.fullPath).toBe('/faq')
  })

  it('assigns product-friendly coming-soon content to every visible placeholder route', async () => {
    const router = await loadRouterWithToken('assistant-token')
    const placeholderPaths = [
      '/communication',
      '/settlement',
      '/expense',
      '/files',
      '/online-test-bank',
      '/interview-bank',
      '/notice',
      '/faq',
    ]

    for (const routePath of placeholderPaths) {
      const resolved = router.resolve(routePath)
      const placeholderContent = resolved.meta.placeholderContent as {
        pageId?: string
        title?: string
        statusText?: string
      }
      const serialized = JSON.stringify(placeholderContent)

      expect(placeholderContent.pageId, `${routePath} should define a placeholder page id`).toMatch(
        /^page-/,
      )
      expect(placeholderContent.title, `${routePath} should define a title`).toBeTruthy()
      expect(placeholderContent.statusText).toBe('敬请期待')
      expect(serialized).not.toContain('伪造')
      expect(serialized).not.toContain('App Shell')
      expect(serialized).not.toContain('story')
      expect(serialized).not.toContain('承载位')
    }
  })
})

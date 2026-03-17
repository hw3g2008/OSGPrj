import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'

test.describe('Admin Page Runtime Smoke @ui-smoke', () => {
  const routes = [
    '/users/students',
    '/users/contracts',
    '/career/positions',
    '/career/job-overview',
    '/resources/files',
  ]

  for (const route of routes) {
    test(`${route} should not throw runtime page/api exceptions`, async ({ page }) => {
      const pageErrors: string[] = []
      const apiErrors: string[] = []

      page.on('pageerror', (error) => {
        pageErrors.push(String(error))
      })

      page.on('response', async (response) => {
        const url = response.url()
        const request = response.request()
        const isApi = request.resourceType() === 'xhr' || request.resourceType() === 'fetch'
        if (!isApi || !url.includes('/api/')) {
          return
        }
        if (response.status() >= 500) {
          apiErrors.push(`${response.status()} ${url}`)
          return
        }
        const contentType = response.headers()['content-type'] || ''
        if (!contentType.includes('application/json')) {
          return
        }
        try {
          const body = await response.json()
          if (body && typeof body === 'object' && 'code' in body && body.code !== 200) {
            apiErrors.push(`${body.code} ${url} msg=${String(body.msg || '').slice(0, 120)}`)
          }
        } catch {
          // ignore non-json-like bodies advertised incorrectly
        }
      })

      await loginAsAdmin(page)
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle')

      expect(pageErrors, `page runtime errors on ${route}`).toEqual([])
      expect(apiErrors, `api runtime errors on ${route}`).toEqual([])
    })
  }
})

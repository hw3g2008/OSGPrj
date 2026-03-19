import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('osg_token', 'student-token')
    localStorage.setItem('osg_user', JSON.stringify({ nickName: 'Test Student' }))
  })
})

const protectedRoutes = [
  '/positions',
  '/job-tracking',
  '/mock-practice',
]

test.describe('student layout overflow guard', () => {
  for (const route of protectedRoutes) {
    test(`keeps ${route} within the 1440px viewport without horizontal overflow`, async ({ page }) => {
      await page.goto(route)

      const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }))

      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
      expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth)
    })
  }
})

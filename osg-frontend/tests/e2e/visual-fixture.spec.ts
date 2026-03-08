import { test, expect } from '@playwright/test'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import type { VisualFixtureRoute } from './support/visual-contract'

test.describe('Visual Fixture Routes', () => {
  test('fulfills declared fixture response for matching request', async ({ page }) => {
    const routes: VisualFixtureRoute[] = [
      {
        url: '/api/getInfo',
        method: 'GET',
        response_ref: 'osg-frontend/tests/e2e/fixtures/permission/common/getInfo.json',
      },
    ]

    await registerVisualFixtureRoutes(page, routes)
    await page.goto('data:text/html,<html><body>fixture</body></html>')

    const payload = await page.evaluate(async () => {
      const response = await fetch('http://fixture.test/api/getInfo')
      return response.json()
    })

    expect(payload).toMatchObject({
      code: 200,
    })
  })
})

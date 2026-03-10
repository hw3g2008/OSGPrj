import { test } from '@playwright/test'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract()
const stability = resolveStabilityConfigFromEnv()

for (const pageId of ['roles', 'admins']) {
  test(`${pageId} network-debug`, async ({ page }) => {
    const pageContract = contract.pages.find((item) => item.page_id === pageId)
    if (!pageContract) throw new Error(`missing page ${pageId}`)
    const requests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        requests.push(`${req.method()} ${req.url()}`)
      }
    })
    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        requests.push(`RESP ${res.status()} ${res.url()}`)
      }
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await applyStabilityToPage(page, stability)
    await registerVisualFixtureRoutes(page, pageContract.fixture_routes || [])
    if (pageContract.auth_mode === 'protected') await loginAsAdmin(page)
    await page.goto(pageContract.route)
    await waitForVisualSettle(page, pageContract.stable_wait_ms || 300)
    const roleRows = await page.locator('[data-role-key]').count().catch(() => 0)
    const userRows = await page.locator('[data-user-username]').count().catch(() => 0)
    console.log(`[network-debug] page=${pageId} roleRows=${roleRows} userRows=${userRows}`)
    for (const line of requests) console.log(`[network-debug] ${line}`)
  })
}

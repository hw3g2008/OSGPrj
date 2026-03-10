import { test, expect } from '@playwright/test'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle, performSurfaceTrigger } from './support/surface-trigger'

const contract = loadVisualContract()
const stability = resolveStabilityConfigFromEnv()

for (const surfaceId of ['modal-new-role', 'modal-add-admin', 'modal-edit-admin', 'modal-reset-password']) {
  test(`${surfaceId} formal-debug`, async ({ page }) => {
    const surface = contract.surfaces.find((item) => item.surface_id === surfaceId)
    if (!surface) throw new Error(`missing surface ${surfaceId}`)
    const host = contract.pages.find((item) => item.page_id === surface.host_page_id)
    if (!host) throw new Error(`missing host ${surface.host_page_id}`)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await applyStabilityToPage(page, stability)
    await page.setViewportSize({ width: 1440, height: 900 })

    const merged = [...(surface.fixture_routes || []), ...(host.fixture_routes || [])]
    await registerVisualFixtureRoutes(page, merged)
    if (host.auth_mode === 'protected') {
      await loginAsAdmin(page)
    }
    await page.goto(host.route)
    await waitForVisualSettle(page, host.stable_wait_ms || 300)

    const triggerSelector = surface.trigger_action?.selector || ''
    const triggerCount = triggerSelector ? await page.locator(triggerSelector).count() : -1
    const triggerVisible = triggerSelector && triggerCount > 0 ? await page.locator(triggerSelector).first().isVisible() : false
    const roleRows = await page.locator('[data-role-key]').count().catch(() => 0)
    const userRows = await page.locator('[data-user-username]').count().catch(() => 0)
    console.log(`[debug2] ${surfaceId} route=${host.route} roleRows=${roleRows} userRows=${userRows} trigger=${triggerSelector} triggerCount=${triggerCount} triggerVisible=${triggerVisible}`)

    await performSurfaceTrigger(page, host, surface)
    const root = page.locator(surface.surface_root_selector || surface.app_selector || '').first()
    const rootCount = await root.count().catch(() => 0)
    const rootVisible = rootCount > 0 ? await root.isVisible() : false
    console.log(`[debug2] ${surfaceId} root=${surface.surface_root_selector} rootCount=${rootCount} rootVisible=${rootVisible}`)
    await expect(root).toBeVisible()
  })
}

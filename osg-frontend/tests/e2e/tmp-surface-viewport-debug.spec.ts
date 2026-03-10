import { test, expect } from '@playwright/test'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle, performSurfaceTrigger } from './support/surface-trigger'

const contract = loadVisualContract(process.env.UI_VISUAL_CONTRACT_JSON)
const stability = resolveStabilityConfigFromEnv()

for (const surfaceId of ['modal-new-role', 'modal-add-admin', 'modal-edit-admin', 'modal-reset-password']) {
  test(`${surfaceId} viewport debug`, async ({ page }) => {
    const surface = contract.surfaces!.find((s) => s.surface_id === surfaceId)!
    const host = contract.pages.find((p) => p.page_id === surface.host_page_id)!
    const merged = [...(surface.fixture_routes || []), ...(host.fixture_routes || [])]
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await applyStabilityToPage(page, stability)

    for (const viewport of surface.viewport_variants || []) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await registerVisualFixtureRoutes(page, merged)
      await loginAsAdmin(page)
      await page.goto(host.route)
      await waitForVisualSettle(page, host.stable_wait_ms || 300)
      const triggerSel = surface.trigger_action?.selector!
      const trigger = page.locator(triggerSel).first()
      const triggerCount = await trigger.count()
      const triggerVisible = triggerCount > 0 ? await trigger.isVisible() : false
      await performSurfaceTrigger(page, host, surface, 'app')
      const root = page.locator(surface.surface_root_selector!).first()
      const rootCount = await root.count().catch(() => 0)
      const rootVisible = rootCount > 0 ? await root.isVisible() : false
      console.log(JSON.stringify({ surfaceId, viewportId: viewport.viewport_id, width: viewport.width, height: viewport.height, triggerSel, triggerCount, triggerVisible, rootCount, rootVisible }))
      await expect(root).toBeVisible()
    }
  })
}

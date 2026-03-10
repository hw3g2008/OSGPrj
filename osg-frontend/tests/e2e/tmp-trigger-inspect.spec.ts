import { test } from '@playwright/test'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract()
const stability = resolveStabilityConfigFromEnv()

for (const surfaceId of ['modal-new-role','modal-add-admin']) {
  test(`${surfaceId} trigger inspect`, async ({ page }) => {
    const surface = contract.surfaces.find((item) => item.surface_id === surfaceId)!
    const host = contract.pages.find((item) => item.page_id === surface.host_page_id)!
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await applyStabilityToPage(page, stability)
    await registerVisualFixtureRoutes(page, [...(surface.fixture_routes || []), ...(host.fixture_routes || [])])
    await loginAsAdmin(page)
    await page.goto(host.route)
    await waitForVisualSettle(page, host.stable_wait_ms || 300)
    const selector = surface.trigger_action!.selector!
    const htmlBefore = await page.locator(selector).first().evaluate(el => (el as HTMLElement).outerHTML)
    console.log(`[inspect] ${surfaceId} trigger html before: ${htmlBefore}`)
    await page.locator(selector).first().click({ force: true })
    await page.waitForTimeout(500)
    const countAfter = await page.locator(surface.surface_root_selector!).count()
    console.log(`[inspect] ${surfaceId} root count after force click: ${countAfter}`)
    const body = await page.locator('body').innerHTML()
    console.log(`[inspect] ${surfaceId} body has data-surface-id? ${body.includes(surface.surface_root_selector!.split(' ')[0].replace(/[\[\]"]+/g,''))}`)
  })
}

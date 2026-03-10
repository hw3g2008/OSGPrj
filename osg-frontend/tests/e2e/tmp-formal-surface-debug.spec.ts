import { test, expect } from '@playwright/test'
import { loadVisualContract, type VisualPageContract, type VisualSurfaceContract } from './support/visual-contract'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loginAsAdmin } from './support/auth'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract()
const stabilityConfig = resolveStabilityConfigFromEnv()

function pageById(id: string): VisualPageContract {
  const page = contract.pages.find((p) => p.page_id === id)
  if (!page) throw new Error(`missing page ${id}`)
  return page
}
function surfaceById(id: string): VisualSurfaceContract {
  const surface = contract.surfaces?.find((s) => s.surface_id === id)
  if (!surface) throw new Error(`missing surface ${id}`)
  return surface
}

test('formal debug modal-add-admin', async ({ page }) => {
  const hostPage = pageById('admins')
  const surface = surfaceById('modal-add-admin')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await applyStabilityToPage(page, stabilityConfig)
  await registerVisualFixtureRoutes(page, hostPage.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(hostPage.route)
  await waitForVisualSettle(page, hostPage.stable_wait_ms || 300)

  const tableRows = await page.locator('.ant-table-tbody tr').count()
  const triggerCount = await page.locator('[data-surface-trigger="modal-add-admin"]').count()
  const triggerVisible = triggerCount > 0 ? await page.locator('[data-surface-trigger="modal-add-admin"]').first().isVisible() : false
  console.log('tableRows=', tableRows, 'triggerCount=', triggerCount, 'triggerVisible=', triggerVisible)

  await performSurfaceTrigger(page, hostPage, surface, 'app')

  const root = page.locator('[data-surface-id="modal-add-admin"]')
  const shell = page.locator('[data-surface-id="modal-add-admin"] [data-surface-part="shell"]')
  console.log('rootCount=', await root.count(), 'shellCount=', await shell.count())

  await expect(shell).toBeVisible()
})

test('formal debug modal-edit-admin', async ({ page }) => {
  const hostPage = pageById('admins')
  const surface = surfaceById('modal-edit-admin')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await applyStabilityToPage(page, stabilityConfig)
  await registerVisualFixtureRoutes(page, hostPage.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(hostPage.route)
  await waitForVisualSettle(page, hostPage.stable_wait_ms || 300)

  const sample = page.locator('[data-surface-trigger="modal-edit-admin"][data-surface-sample-key="clerk001"]')
  console.log('sampleCount=', await sample.count(), 'sampleVisible=', (await sample.count())>0 ? await sample.first().isVisible() : false)

  await performSurfaceTrigger(page, hostPage, surface, 'app')

  const shell = page.locator('[data-surface-id="modal-edit-admin"] [data-surface-part="shell"]')
  console.log('shellCount=', await shell.count())
  await expect(shell).toBeVisible()
})

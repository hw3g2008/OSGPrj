import { test } from '@playwright/test'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { loadVisualContract } from './support/visual-contract'
import { loginAsAdmin } from './support/auth'
import { waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract(process.env.UI_VISUAL_CONTRACT_JSON)
const stability = resolveStabilityConfigFromEnv()
const rolesPage = contract.pages.find((p) => p.page_id === 'roles')!
const addRole = contract.surfaces!.find((s) => s.surface_id === 'modal-new-role')!

test('compare click modes under fixed time', async ({ page }) => {
  await applyStabilityToPage(page, stability)
  await registerVisualFixtureRoutes(page, rolesPage.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(rolesPage.route)
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)
  const rootSel = addRole.trigger_action!.selector!
  const buttonSel = `${rootSel} button`

  const results: Record<string, any> = {}

  await page.locator(rootSel).first().click().catch((e) => { results.rootClickError = String(e) })
  await page.waitForTimeout(300)
  results.rootClickCount = await page.locator(addRole.app_selector).count()
  await page.reload()
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)

  await page.locator(buttonSel).first().click().catch((e) => { results.buttonClickError = String(e) })
  await page.waitForTimeout(300)
  results.buttonClickCount = await page.locator(addRole.app_selector).count()
  await page.reload()
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)

  await page.locator(rootSel).first().click({ force: true }).catch((e) => { results.rootForceError = String(e) })
  await page.waitForTimeout(300)
  results.rootForceCount = await page.locator(addRole.app_selector).count()
  await page.reload()
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)

  await page.locator(buttonSel).first().click({ force: true }).catch((e) => { results.buttonForceError = String(e) })
  await page.waitForTimeout(300)
  results.buttonForceCount = await page.locator(addRole.app_selector).count()

  console.log(JSON.stringify(results))
})

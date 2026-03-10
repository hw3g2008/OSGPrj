import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { loadVisualContract } from './support/visual-contract'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { applyStabilityToPage, resolveStabilityConfigFromEnv } from './support/test-stability'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract(process.env.UI_VISUAL_CONTRACT_JSON)
const rolesPage = contract.pages.find((p) => p.page_id === 'roles')!
const adminsPage = contract.pages.find((p) => p.page_id === 'admins')!
const addRole = contract.surfaces!.find((s) => s.surface_id === 'modal-new-role')!
const addAdmin = contract.surfaces!.find((s) => s.surface_id === 'modal-add-admin')!

async function navigate(page, pageContract) {
  if (pageContract.data_mode === 'mock' && (pageContract.fixture_routes || []).length) {
    await registerVisualFixtureRoutes(page, pageContract.fixture_routes || [])
  }
  if (pageContract.auth_mode === 'protected') {
    await loginAsAdmin(page)
  }
  await page.goto(pageContract.route)
  await waitForVisualSettle(page, pageContract.stable_wait_ms || 300)
}

async function openSurface(page, hostPage, surface, fixed) {
  if (fixed) {
    await applyStabilityToPage(page, resolveStabilityConfigFromEnv())
  }
  await navigate(page, hostPage)
  await performSurfaceTrigger(page, hostPage, surface, 'app')
  await waitForVisualSettle(page, 300)
  const rootCount = await page.locator(surface.app_selector).count()
  const rootVisible = rootCount > 0 ? await page.locator(surface.app_selector).first().isVisible() : false
  return { rootCount, rootVisible }
}

test('compare add-role with and without fixed time', async ({ browser }) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const withoutFixed = await openSurface(page1, rolesPage, addRole, false)
  await context1.close()

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  const withFixed = await openSurface(page2, rolesPage, addRole, true)
  await context2.close()

  console.log(JSON.stringify({ surface: 'modal-new-role', withoutFixed, withFixed }))
  expect(true).toBeTruthy()
})

test('compare add-admin with and without fixed time', async ({ browser }) => {
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  const withoutFixed = await openSurface(page1, adminsPage, addAdmin, false)
  await context1.close()

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  const withFixed = await openSurface(page2, adminsPage, addAdmin, true)
  await context2.close()

  console.log(JSON.stringify({ surface: 'modal-add-admin', withoutFixed, withFixed }))
  expect(true).toBeTruthy()
})

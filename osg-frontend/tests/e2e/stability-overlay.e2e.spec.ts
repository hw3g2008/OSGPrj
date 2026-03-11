import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { loadVisualContract, type VisualPageContract, type VisualSurfaceContract } from './support/visual-contract'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { applyStabilityToPage, type StabilityConfig } from './support/test-stability'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'

const contractJson = process.env.UI_VISUAL_CONTRACT_JSON
const contract = contractJson ? loadVisualContract() : null
const rolesPage = contract?.pages.find((page) => page.page_id === 'roles') as VisualPageContract | undefined
const newRoleSurface = contract?.surfaces?.find((surface) => surface.surface_id === 'modal-new-role') as
  | VisualSurfaceContract
  | undefined

const fixedTimeStability: StabilityConfig = {
  timezoneId: 'Asia/Shanghai',
  locale: 'zh-CN',
  fixedTimeMs: Date.parse('2026-03-08T10:00:00.000Z'),
  deviceScaleFactor: 1,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  disableAnimation: true,
}

async function openProtectedMockPage(page) {
  if (!rolesPage) {
    throw new Error('roles page contract is required')
  }
  await registerVisualFixtureRoutes(page, rolesPage.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(rolesPage.route)
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)
}

test('fixed-time stability must not break overlay trigger interactions', async ({ page }) => {
  test.skip(!contract || !rolesPage || !newRoleSurface, 'UI_VISUAL_CONTRACT_JSON is required for stability overlay tests')
  if (!rolesPage || !newRoleSurface) {
    return
  }

  await applyStabilityToPage(page, fixedTimeStability)
  await openProtectedMockPage(page)
  await performSurfaceTrigger(page, rolesPage, newRoleSurface, 'app')
  await waitForVisualSettle(page, 300)
  await expect(page.locator(newRoleSurface.app_selector).first()).toBeVisible()
})

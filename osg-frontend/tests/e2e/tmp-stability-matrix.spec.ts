import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { loadVisualContract, type VisualPageContract, type VisualSurfaceContract } from './support/visual-contract'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { applyStabilityToPage, type StabilityConfig } from './support/test-stability'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'

const contract = loadVisualContract(process.env.UI_VISUAL_CONTRACT_JSON)
const rolesPage = contract.pages.find((page) => page.page_id === 'roles') as VisualPageContract
const newRoleSurface = contract.surfaces?.find((surface) => surface.surface_id === 'modal-new-role') as VisualSurfaceContract

const baseStability: StabilityConfig = {
  timezoneId: 'Asia/Shanghai',
  locale: 'zh-CN',
  deviceScaleFactor: 1,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  disableAnimation: true,
}

async function openSurface(page, stability?: StabilityConfig) {
  if (stability) {
    await applyStabilityToPage(page, stability)
  }
  await registerVisualFixtureRoutes(page, rolesPage.fixture_routes || [])
  await loginAsAdmin(page)
  await page.goto(rolesPage.route)
  await waitForVisualSettle(page, rolesPage.stable_wait_ms || 300)
  await performSurfaceTrigger(page, rolesPage, newRoleSurface, 'app')
  await waitForVisualSettle(page, 300)
  const rootCount = await page.locator(newRoleSurface.app_selector).count()
  const rootVisible = rootCount > 0 ? await page.locator(newRoleSurface.app_selector).first().isVisible() : false
  return { rootCount, rootVisible }
}

test('stability matrix for add-role overlay', async ({ browser }) => {
  const labels: Array<[string, StabilityConfig | undefined]> = [
    ['none', undefined],
    ['style-only', baseStability],
    ['fixed-time', { ...baseStability, fixedTimeMs: Date.parse('2026-03-08T10:00:00.000Z') }],
  ]
  const results: Record<string, { rootCount: number; rootVisible: boolean }> = {}
  for (const [label, cfg] of labels) {
    const context = await browser.newContext()
    const page = await context.newPage()
    results[label] = await openSurface(page, cfg)
    await context.close()
  }
  console.log(JSON.stringify(results))
  expect(true).toBeTruthy()
})

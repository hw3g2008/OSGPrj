import { test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'
import { registerVisualFixtureRoutes } from './support/visual-fixture'
import { performSurfaceTrigger, waitForVisualSettle } from './support/surface-trigger'
import { loadVisualContract } from './support/visual-contract'

const contract = loadVisualContract()
const surface = contract.surfaces.find((s) => s.surface_id === 'modal-new-role')!
const hostPage = contract.pages.find((p) => p.page_id === surface.host_page_id)!
const fixedTimeMs = Date.parse('2025-12-19T09:00:00+08:00')

async function applyFixedTimeOnly(page) {
  await page.addInitScript(({ fixedTimeMs }) => {
    const OriginalDate = Date
    class FixedDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTimeMs)
          return
        }
        super(...args)
      }
      static now() {
        return fixedTimeMs
      }
    }
    window.Date = FixedDate
  }, { fixedTimeMs })
}

async function navigateLikeVisual(page) {
  if (hostPage.data_mode === 'mock' && (hostPage.fixture_routes || []).length) {
    await registerVisualFixtureRoutes(page, hostPage.fixture_routes || [])
  }
  if (hostPage.auth_mode === 'protected') {
    await loginAsAdmin(page)
  }
  await page.goto(hostPage.route)
  await waitForVisualSettle(page, hostPage.stable_wait_ms || 300)
}

test('modal-new-role vue state probe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await applyFixedTimeOnly(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await navigateLikeVisual(page)

  const before = await page.evaluate((selector) => {
    const el = document.querySelector(selector)
    const instance = el && (el).__vueParentComponent
    return {
      hasEl: !!el,
      hasInstance: !!instance,
      modalVisible:
        instance?.ctx?.modalVisible?.value ??
        instance?.setupState?.modalVisible?.value ??
        instance?.proxy?.modalVisible?.value ??
        instance?.proxy?.modalVisible ??
        null,
    }
  }, surface.trigger_action!.selector!)
  console.log('before', JSON.stringify(before))

  await performSurfaceTrigger(page, hostPage, surface, 'app')

  const after = await page.evaluate((selector) => {
    const el = document.querySelector(selector)
    const instance = el && (el).__vueParentComponent
    return {
      hasEl: !!el,
      hasInstance: !!instance,
      modalVisible:
        instance?.ctx?.modalVisible?.value ??
        instance?.setupState?.modalVisible?.value ??
        instance?.proxy?.modalVisible?.value ??
        instance?.proxy?.modalVisible ??
        null,
    }
  }, surface.trigger_action!.selector!)
  console.log('after', JSON.stringify(after))
  console.log('dialog count', await page.locator(surface.surface_root_selector).count())
})

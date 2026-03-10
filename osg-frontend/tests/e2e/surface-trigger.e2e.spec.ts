import { test, expect } from '@playwright/test'
import { performSurfaceTrigger } from './support/surface-trigger'
import type { VisualPageContract, VisualSurfaceContract } from './support/visual-contract'

const hostPage = {
  page_id: 'host-page',
  route: '/host',
  prototype_file: 'host.html',
  prototype_selector: '#host-page',
  viewport: { width: 1280, height: 800 },
  auth_mode: 'public',
  snapshot_name: 'host-page.png',
  baseline_ref: 'osg-frontend/tests/e2e/visual-baseline/host-page.png',
  diff_threshold: 0.03,
  stable_wait_ms: 0,
  required_anchors: [],
} satisfies VisualPageContract

test('wrapper trigger clicks visible interactive descendant for modal surfaces', async ({ page }) => {
  await page.setContent(`
    <span data-surface-trigger="modal-wrapper" style="display:inline-block;padding:8px;">
      <button id="open-modal" type="button">Open modal</button>
    </span>
    <div data-surface-id="modal-wrapper" style="display:block;">
      <div data-surface-part="shell" style="display:none;">modal shell</div>
    </div>
    <script>
      document.getElementById('open-modal').addEventListener('click', () => {
        document.querySelector('[data-surface-id="modal-wrapper"] [data-surface-part="shell"]').style.display = 'block'
      })
    </script>
  `)

  const surface = {
    surface_id: 'modal-wrapper',
    surface_type: 'modal',
    host_page_id: hostPage.page_id,
    prototype_selector: '#modal-wrapper',
    app_selector: '[data-surface-id="modal-wrapper"] [data-surface-part="shell"]',
    surface_root_selector: '[data-surface-id="modal-wrapper"] [data-surface-part="shell"]',
    trigger_action: {
      type: 'click',
      selector: '[data-surface-trigger="modal-wrapper"]',
    },
    required_anchors: [],
    viewport_variants: [],
    surface_parts: [],
  } satisfies VisualSurfaceContract

  await performSurfaceTrigger(page, hostPage, surface, 'app')

  await expect(page.locator('[data-surface-id="modal-wrapper"] [data-surface-part="shell"]')).toBeVisible()
})

test('wrapper trigger prefers trigger root when outer surface wrapper owns click handler', async ({ page }) => {
  await page.setContent(`
    <span
      data-surface-trigger="modal-wrapper-root"
      role="button"
      tabindex="0"
      style="display:inline-block;padding:8px;"
    >
      <button id="inner-button" type="button">Open modal</button>
    </span>
    <div data-surface-id="modal-wrapper-root" style="display:block;">
      <div data-surface-part="shell" style="display:none;">modal shell</div>
    </div>
    <script>
      document.querySelector('[data-surface-trigger="modal-wrapper-root"]').addEventListener('click', () => {
        document.querySelector('[data-surface-id="modal-wrapper-root"] [data-surface-part="shell"]').style.display = 'block'
      })
    </script>
  `)

  const surface = {
    surface_id: 'modal-wrapper-root',
    surface_type: 'modal',
    host_page_id: hostPage.page_id,
    prototype_selector: '#modal-wrapper-root',
    app_selector: '[data-surface-id="modal-wrapper-root"] [data-surface-part="shell"]',
    surface_root_selector: '[data-surface-id="modal-wrapper-root"] [data-surface-part="shell"]',
    trigger_action: {
      type: 'click',
      selector: '[data-surface-trigger="modal-wrapper-root"]',
    },
    required_anchors: [],
    viewport_variants: [],
    surface_parts: [],
  } satisfies VisualSurfaceContract

  await performSurfaceTrigger(page, hostPage, surface, 'app')

  await expect(
    page.locator('[data-surface-id="modal-wrapper-root"] [data-surface-part="shell"]'),
  ).toBeVisible()
})

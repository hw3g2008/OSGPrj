import { expect, type Locator, type Page } from '@playwright/test'
import type { VisualPageContract, VisualSurfaceContract } from './visual-contract'

const INTERACTIVE_DESCENDANT_SELECTOR = [
  'button',
  '[role="button"]',
  'a',
  '.ant-btn',
  'input',
  'textarea',
  'select',
].join(', ')

async function isDirectlyInteractive(locator: Locator): Promise<boolean> {
  return await locator.evaluate((element) => {
    const tagName = element.tagName.toLowerCase()
    if (['button', 'a', 'input', 'textarea', 'select'].includes(tagName)) {
      return true
    }
    return element.getAttribute('role') === 'button'
  })
}

async function resolveTriggerTarget(triggerRoot: Locator): Promise<Locator> {
  if (await isDirectlyInteractive(triggerRoot)) {
    return triggerRoot
  }

  const descendants = triggerRoot.locator(INTERACTIVE_DESCENDANT_SELECTOR)
  const count = await descendants.count()
  for (let index = 0; index < count; index += 1) {
    const candidate = descendants.nth(index)
    if (await candidate.isVisible()) {
      return candidate
    }
  }

  return triggerRoot
}

async function clickTriggerTarget(triggerRoot: Locator): Promise<void> {
  await triggerRoot.scrollIntoViewIfNeeded()
  await expect(triggerRoot, 'surface trigger root should be visible').toBeVisible()

  try {
    await triggerRoot.click()
    return
  } catch {
    const target = await resolveTriggerTarget(triggerRoot)
    await target.scrollIntoViewIfNeeded()
    await expect(target, 'surface trigger fallback target should be visible').toBeVisible()
    await target.click()
  }
}

async function waitForRequiredAnchors(page: Page, anchors: string[], contextId: string): Promise<void> {
  for (const anchor of anchors) {
    await expect(page.locator(anchor).first(), `host anchor should exist: ${contextId} -> ${anchor}`).toBeVisible()
  }
}

async function waitForAnyOfAnchorGroups(page: Page, groups: string[][], contextId: string): Promise<void> {
  if (!Array.isArray(groups) || groups.length === 0) {
    return
  }

  const failures: string[] = []
  for (const group of groups) {
    try {
      await waitForRequiredAnchors(page, group, contextId)
      return
    } catch {
      failures.push(group.join(' && '))
    }
  }

  throw new Error(`host required_anchors_any_of not satisfied: ${contextId} -> ${failures.join(' || ')}`)
}

async function waitForHostPageReady(page: Page, hostPage: VisualPageContract): Promise<void> {
  await waitForRequiredAnchors(page, hostPage.required_anchors || [], hostPage.page_id)
  await waitForAnyOfAnchorGroups(page, hostPage.required_anchors_any_of || [], hostPage.page_id)
}

export async function waitForVisualSettle(page: Page, stableWaitMs: number): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 })
  } catch {
    // Some app pages keep background requests open; anchors + stable wait are the real readiness signal.
  }
  await page.waitForTimeout(stableWaitMs)
}

export async function performSurfaceTrigger(
  page: Page,
  hostPage: VisualPageContract,
  surface: VisualSurfaceContract,
  visualSource: 'app' | 'prototype',
): Promise<void> {
  await waitForHostPageReady(page, hostPage)

  const trigger = surface.trigger_action || { type: 'auto-open' as const }
  const selector =
    visualSource === 'prototype'
      ? trigger.prototype_selector?.trim() || trigger.selector?.trim()
      : trigger.selector?.trim()
  const script =
    visualSource === 'prototype'
      ? trigger.prototype_script?.trim()
      : trigger.script?.trim()

  switch (trigger.type) {
    case 'click': {
      if (script) {
        await page.evaluate((scriptText) => {
          // eslint-disable-next-line no-new-func
          const fn = new Function(scriptText)
          return fn()
        }, script)
        if (visualSource === 'prototype' || !selector) {
          break
        }
      }
      if (!selector) {
        throw new Error(`surface '${surface.surface_id}' click trigger missing selector`)
      }
      const triggerRoot = page.locator(selector).first()
      await expect(triggerRoot, `surface trigger should exist: ${selector}`).toBeVisible()
      await clickTriggerTarget(triggerRoot)
      break
    }
    case 'keyboard': {
      const key = trigger.key?.trim()
      if (!key) {
        throw new Error(`surface '${surface.surface_id}' keyboard trigger missing key`)
      }
      if (selector) {
        const triggerRoot = page.locator(selector).first()
        await expect(triggerRoot, `surface keyboard trigger target should exist: ${selector}`).toBeVisible()
        const target = await resolveTriggerTarget(triggerRoot)
        await target.scrollIntoViewIfNeeded()
        await target.focus()
      }
      await page.keyboard.press(key)
      break
    }
    case 'route-param': {
      if (visualSource === 'prototype') {
        if (!script) {
          throw new Error(`surface '${surface.surface_id}' route-param trigger requires prototype_script for prototype source`)
        }
        await page.evaluate((scriptText) => {
          // eslint-disable-next-line no-new-func
          const fn = new Function(scriptText)
          return fn()
        }, script)
        break
      }
      const param = trigger.param?.trim()
      const value = trigger.value?.trim()
      if (!param || !value) {
        throw new Error(`surface '${surface.surface_id}' route-param trigger requires param and value`)
      }
      const url = new URL(hostPage.route, 'http://127.0.0.1')
      url.searchParams.set(param, value)
      await page.goto(`${url.pathname}${url.search}`)
      break
    }
    case 'auto-open':
      if (script) {
        await page.evaluate((scriptText) => {
          // eslint-disable-next-line no-new-func
          const fn = new Function(scriptText)
          return fn()
        }, script)
      }
      break
    default:
      throw new Error(`unsupported trigger type for surface '${surface.surface_id}': ${trigger.type}`)
  }

  await waitForVisualSettle(page, hostPage.stable_wait_ms || 300)
}

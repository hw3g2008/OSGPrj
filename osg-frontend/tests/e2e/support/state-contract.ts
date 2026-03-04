import { expect, type Page } from '@playwright/test'
import type { VisualStateCase } from './visual-contract'

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export async function executeStateCase(
  page: Page,
  pageId: string,
  stateCase: VisualStateCase,
): Promise<void> {
  const locator = page.locator(stateCase.target).first()
  if ((await locator.count()) === 0) {
    throw new Error(`state case target not found: page=${pageId} state=${stateCase.state} target=${stateCase.target}`)
  }

  if (stateCase.state === 'focus') {
    await locator.focus()
  } else if (stateCase.state === 'hover') {
    await locator.hover()
  }

  if (stateCase.assertion.type === 'visible') {
    await expect(locator).toBeVisible()
    return
  }

  if (stateCase.assertion.type === 'text') {
    invariant(
      typeof stateCase.assertion.value === 'string' && stateCase.assertion.value.trim().length > 0,
      `state case assertion.value is required for text assertion: page=${pageId} state=${stateCase.state} target=${stateCase.target}`,
    )
    await expect(locator).toContainText(stateCase.assertion.value)
    return
  }

  if (stateCase.assertion.type === 'css') {
    invariant(
      typeof stateCase.assertion.property === 'string' && stateCase.assertion.property.trim().length > 0,
      `state case assertion.property is required for css assertion: page=${pageId} state=${stateCase.state} target=${stateCase.target}`,
    )
    invariant(
      typeof stateCase.assertion.value === 'string' && stateCase.assertion.value.trim().length > 0,
      `state case assertion.value is required for css assertion: page=${pageId} state=${stateCase.state} target=${stateCase.target}`,
    )
    const property = stateCase.assertion.property.trim()
    const expected = stateCase.assertion.value.trim()
    const actual = await locator.evaluate(
      (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
      property,
    )
    if (actual !== expected) {
      throw new Error(
        `state css assertion failed: page=${pageId} state=${stateCase.state} target=${stateCase.target} property=${property} expected=${expected} actual=${actual}`,
      )
    }
    return
  }

  throw new Error(
    `unsupported state assertion type: page=${pageId} state=${stateCase.state} type=${stateCase.assertion.type}`,
  )
}

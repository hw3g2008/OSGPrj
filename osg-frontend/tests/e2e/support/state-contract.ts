import { expect, type Page } from '@playwright/test'
import { type VisualStateCase } from './visual-contract'

export interface StateCaseResult {
  executed: number
  failed: number
  errors: string[]
}

async function applyStateAction(page: Page, stateCase: VisualStateCase): Promise<void> {
  const target = page.locator(stateCase.target).first()
  switch (stateCase.state) {
    case 'focus':
      await target.focus()
      break
    case 'hover':
      await target.hover({ force: true })
      break
    case 'loading':
    case 'empty':
    case 'error':
      // These states are asserted by contract selectors/values only.
      break
    default:
      throw new Error(`unsupported state case: ${stateCase.state}`)
  }
}

async function assertStateCase(page: Page, stateCase: VisualStateCase): Promise<void> {
  const assertion = stateCase.assertion
  if (assertion.type === 'visible') {
    const selector = assertion.value || stateCase.target
    await expect(page.locator(selector).first(), `visible assertion selector=${selector}`).toBeVisible()
    return
  }

  if (assertion.type === 'text') {
    const value = assertion.value || ''
    await expect(
      page.locator(stateCase.target).first(),
      `text assertion target=${stateCase.target} expected=${value}`,
    ).toContainText(value)
    return
  }

  const property = assertion.property || ''
  const expected = assertion.value || ''
  const actual = await page.locator(stateCase.target).first().evaluate((el, p) => {
    return getComputedStyle(el).getPropertyValue(p).trim()
  }, property)
  expect(
    actual,
    `css assertion target=${stateCase.target} property=${property} expected=${expected}`,
  ).toBe(expected)
}

export async function runStateCases(
  page: Page,
  pageId: string,
  stateCases: VisualStateCase[] | undefined,
): Promise<StateCaseResult> {
  const cases = stateCases || []
  const result: StateCaseResult = {
    executed: 0,
    failed: 0,
    errors: [],
  }

  for (const stateCase of cases) {
    result.executed += 1
    try {
      await applyStateAction(page, stateCase)
      await assertStateCase(page, stateCase)
    } catch (error) {
      result.failed += 1
      const reason = error instanceof Error ? error.message : String(error)
      result.errors.push(
        `page=${pageId} state=${stateCase.state} target=${stateCase.target} assertion=${stateCase.assertion.type} reason=${reason}`,
      )
    }
  }

  return result
}

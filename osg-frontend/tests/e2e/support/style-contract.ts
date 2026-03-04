import { type Page } from '@playwright/test'
import { type VisualStyleContract } from './visual-contract'

export interface StyleContractResult {
  passed: number
  failed: number
  errors: string[]
}

function parseNumericCssValue(value: string): number | null {
  const match = value.trim().match(/^-?\d+(?:\.\d+)?/)
  if (!match) {
    return null
  }
  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function stringifyTolerance(tolerance: number | undefined): string {
  if (typeof tolerance !== 'number') {
    return 'none'
  }
  return String(tolerance)
}

export async function runStyleContracts(
  page: Page,
  pageId: string,
  contracts: VisualStyleContract[] | undefined,
): Promise<StyleContractResult> {
  const rules = contracts || []
  const result: StyleContractResult = {
    passed: 0,
    failed: 0,
    errors: [],
  }

  for (const rule of rules) {
    const locator = page.locator(rule.selector).first()
    const count = await locator.count()
    if (count === 0) {
      result.failed += 1
      result.errors.push(
        `page=${pageId} selector=${rule.selector} property=${rule.property} expected=${rule.expected} actual=<missing-node> tolerance=${stringifyTolerance(rule.tolerance)}`,
      )
      continue
    }

    const actual = await locator.evaluate((el, property) => {
      return getComputedStyle(el).getPropertyValue(property).trim()
    }, rule.property)

    if (typeof rule.tolerance === 'number') {
      const expectedNum = parseNumericCssValue(rule.expected)
      const actualNum = parseNumericCssValue(actual)
      if (expectedNum === null || actualNum === null) {
        result.failed += 1
        result.errors.push(
          `page=${pageId} selector=${rule.selector} property=${rule.property} expected=${rule.expected} actual=${actual} tolerance=${rule.tolerance} reason=non-numeric-value`,
        )
        continue
      }
      if (Math.abs(expectedNum - actualNum) <= rule.tolerance) {
        result.passed += 1
      } else {
        result.failed += 1
        result.errors.push(
          `page=${pageId} selector=${rule.selector} property=${rule.property} expected=${rule.expected} actual=${actual} tolerance=${rule.tolerance}`,
        )
      }
      continue
    }

    if (actual === rule.expected) {
      result.passed += 1
    } else {
      result.failed += 1
      result.errors.push(
        `page=${pageId} selector=${rule.selector} property=${rule.property} expected=${rule.expected} actual=${actual} tolerance=none`,
      )
    }
  }

  return result
}

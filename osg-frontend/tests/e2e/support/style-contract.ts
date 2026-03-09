import type { Page } from '@playwright/test'
import { isCssSemanticallyEqual } from './css-value'
import type { VisualStyleContractRule } from './visual-contract'

function tryParseNumericCss(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) {
    return null
  }
  return { num: Number(match[1]), unit: (match[2] || '').toLowerCase() }
}

export async function assertStyleContracts(
  page: Page,
  rules: VisualStyleContractRule[],
  pageId: string,
): Promise<{ passed: number; failed: number }> {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { passed: 0, failed: 0 }
  }

  let passed = 0
  for (const rule of rules) {
    const selector = rule.selector.trim()
    const property = rule.property.trim()
    const expected = rule.expected.trim()

    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) {
      throw new Error(`style contract failed: page=${pageId} selector=${selector} property=${property} reason=not_found`)
    }

    const actual = await locator.evaluate(
      (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop).trim(),
      property,
    )

    if (typeof rule.tolerance === 'number') {
      const expectedParsed = tryParseNumericCss(expected)
      const actualParsed = tryParseNumericCss(actual)
      if (!expectedParsed || !actualParsed || expectedParsed.unit !== actualParsed.unit) {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} reason=unparsable_or_unit_mismatch`,
        )
      }
      const diff = Math.abs(actualParsed.num - expectedParsed.num)
      if (diff > rule.tolerance) {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} tolerance=${rule.tolerance}`,
        )
      }
    } else if (!isCssSemanticallyEqual(property, expected, actual)) {
      throw new Error(
        `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual}`,
      )
    }

    passed += 1
  }

  return { passed, failed: 0 }
}

import type { Page } from '@playwright/test'
import { isCssSemanticallyEqual } from './css-value'
import type { VisualStyleContractRule } from './visual-contract'

const DEFAULT_NUMERIC_TOLERANCE_BY_PROPERTY: Record<string, number> = {
  width: 2,
  'max-width': 2,
  height: 2,
  'max-height': 2,
  'min-height': 2,
  padding: 2,
  'padding-left': 2,
  'padding-right': 2,
  'padding-top': 2,
  'padding-bottom': 2,
  margin: 2,
  'margin-left': 2,
  'margin-right': 2,
  'margin-top': 2,
  'margin-bottom': 2,
  gap: 2,
  'border-radius': 2,
}

export function tryParseNumericCss(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
  if (!match) {
    return null
  }
  return { num: Number(match[1]), unit: (match[2] || '').toLowerCase() }
}

function tryParseNumericCssList(value: string): { values: number[]; unit: string } | null {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return null
  }

  const parsed = parts.map((part) => tryParseNumericCss(part))
  if (parsed.some((item) => !item)) {
    return null
  }

  const unit = parsed[0]!.unit
  if (parsed.some((item) => item!.unit !== unit)) {
    return null
  }

  return {
    values: parsed.map((item) => item!.num),
    unit,
  }
}

export function resolveStyleTolerance(
  rule: Pick<VisualStyleContractRule, 'property' | 'expected' | 'tolerance'>,
): number | undefined {
  if (typeof rule.tolerance === 'number') {
    return rule.tolerance
  }

  const property = rule.property.trim().toLowerCase()
  if (!(property in DEFAULT_NUMERIC_TOLERANCE_BY_PROPERTY)) {
    return undefined
  }

  return tryParseNumericCssList(rule.expected) ? DEFAULT_NUMERIC_TOLERANCE_BY_PROPERTY[property] : undefined
}

export function styleRuleMatches(
  rule: Pick<VisualStyleContractRule, 'property' | 'expected' | 'tolerance'>,
  actual: string,
): { pass: boolean; tolerance?: number; reason?: 'unparsable_or_unit_mismatch' } {
  const expected = rule.expected.trim()
  const tolerance = resolveStyleTolerance(rule)
  if (typeof tolerance === 'number') {
    const expectedParsed = tryParseNumericCssList(expected)
    const actualParsed = tryParseNumericCssList(actual)
    if (
      !expectedParsed ||
      !actualParsed ||
      expectedParsed.unit !== actualParsed.unit ||
      expectedParsed.values.length !== actualParsed.values.length
    ) {
      return { pass: false, tolerance, reason: 'unparsable_or_unit_mismatch' }
    }

    const passes = expectedParsed.values.every((expectedValue, index) => {
      const actualValue = actualParsed.values[index]
      return Math.abs(actualValue - expectedValue) <= tolerance
    })

    return passes ? { pass: true, tolerance } : { pass: false, tolerance }
  }

  return { pass: isCssSemanticallyEqual(rule.property, expected, actual) }
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

    const match = styleRuleMatches(rule, actual)
    if (!match.pass) {
      if (match.reason === 'unparsable_or_unit_mismatch') {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} reason=unparsable_or_unit_mismatch`,
        )
      }
      if (typeof match.tolerance === 'number') {
        throw new Error(
          `style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual} tolerance=${match.tolerance}`,
        )
      }
      throw new Error(`style contract failed: page=${pageId} selector=${selector} property=${property} expected=${expected} actual=${actual}`)
    }

    passed += 1
  }

  return { passed, failed: 0 }
}

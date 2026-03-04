import { test, expect } from '@playwright/test'
import type { VisualStyleContractRule } from './support/visual-contract'
import { assertStyleContracts } from './visual-contract.e2e.spec'

test.describe('Visual Style Contracts', () => {
  test('passes when computed style matches', async ({ page }) => {
    await page.setContent(
      '<div class="title" style="font-size: 40px; border-radius: 12px; color: rgb(29, 41, 57)">OSG</div>',
    )

    const rules: VisualStyleContractRule[] = [
      { selector: '.title', property: 'font-size', expected: '40px' },
      { selector: '.title', property: 'border-radius', expected: '12px' },
    ]

    await expect(assertStyleContracts(page, rules, 'style-pass')).resolves.toEqual({ passed: 2, failed: 0 })
  })

  test('fails with clear selector/property context on mismatch', async ({ page }) => {
    await page.setContent(
      '<div class="title" style="font-size: 40px; border-radius: 12px; color: rgb(29, 41, 57)">OSG</div>',
    )

    const rules: VisualStyleContractRule[] = [
      { selector: '.title', property: 'font-size', expected: '41px' },
    ]

    await expect(assertStyleContracts(page, rules, 'style-fail')).rejects.toThrow(/style-fail|font-size|selector=\.title/)
  })
})

import { test, expect } from '@playwright/test'
import { runStyleContracts } from './support/style-contract'

test.describe('visual style contract helper', () => {
  test('passes when style rule matches', async ({ page }) => {
    await page.setContent('<div class="target" style="height: 52px; border-radius: 12px;"></div>')

    const result = await runStyleContracts(page, 'dummy-page', [
      { selector: '.target', property: 'height', expected: '52px' },
      { selector: '.target', property: 'border-radius', expected: '12px', tolerance: 0.1 },
    ])

    expect(result.failed).toBe(0)
    expect(result.passed).toBe(2)
  })

  test('fails with readable context on mismatch', async ({ page }) => {
    await page.setContent('<button class="btn" style="height: 40px;">OK</button>')

    const result = await runStyleContracts(page, 'dummy-page', [
      { selector: '.btn', property: 'height', expected: '52px' },
    ])

    expect(result.passed).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toContain('page=dummy-page')
    expect(result.errors[0]).toContain('selector=.btn')
    expect(result.errors[0]).toContain('property=height')
  })
})

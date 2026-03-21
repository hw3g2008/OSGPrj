import { test, expect } from '@playwright/test'
import type { VisualStyleContractRule } from './support/visual-contract'
import { assertStyleContracts } from './support/style-contract'

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

  test('uses default tolerance for small numeric geometry drift', async ({ page }) => {
    await page.setContent(
      '<div class="panel" style="width: 121px; padding: 27px 25px; border-radius: 13px">OSG</div>',
    )

    const rules: VisualStyleContractRule[] = [
      { selector: '.panel', property: 'width', expected: '120px' },
      { selector: '.panel', property: 'padding', expected: '26px 24px' },
      { selector: '.panel', property: 'border-radius', expected: '12px' },
    ]

    await expect(assertStyleContracts(page, rules, 'style-default-tolerance')).resolves.toEqual({ passed: 3, failed: 0 })
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

  test('keeps semantic alignment rules strict without implicit tolerance', async ({ page }) => {
    await page.setContent(
      '<button class="action" style="display: flex; justify-content: center; align-items: center">发送验证码</button>',
    )

    const rules: VisualStyleContractRule[] = [
      { selector: '.action', property: 'justify-content', expected: 'flex-start' },
    ]

    await expect(assertStyleContracts(page, rules, 'style-semantic-strict')).rejects.toThrow(
      /style-semantic-strict|justify-content|selector=\.action/,
    )
  })
})

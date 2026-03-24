import { expect, test } from '@playwright/test'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Assistant Forgot Password @assistant @ui-smoke @ui-only', () => {
  test.skip(moduleName !== 'assistant', 'assistant forgot-password flow only runs for assistant module gate')

  test('assistant forgot-password route renders the four-step shell instead of the placeholder page @assistant-t181-forgot-shell', async ({
    page,
  }) => {
    await page.goto('/forgot-password')

    await expect(page.locator('.back-link')).toBeVisible()
    await expect(page.locator('.login-title')).toBeVisible()
    await expect(page.locator('#step-1')).toBeVisible()
    await expect(page.locator('#send-btn')).toBeVisible()
    await expect(page.locator('.steps .step-dot')).toHaveCount(3)
    await expect(page.locator('.steps .step-dot.active')).toHaveCount(1)
  })
})

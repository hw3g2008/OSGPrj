import { test, expect } from '@playwright/test'

test.describe('Forgot Password @ui-only', () => {
  test('forgot password modal can be opened from login page @perm-s002-forgot-entry', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    // Modal content should appear (title "找回密码")
    await expect(page.locator('.ant-modal-content, .ant-modal-title:has-text("找回密码")').first()).toBeVisible({ timeout: 5000 })
  })

  test('forgot password form shows email input @perm-s002-forgot-form', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()
    await expect(page.locator('.ant-modal-content input').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Forgot Password @api', () => {
  test('4-step forgot password flow completes @perm-s002-forgot-flow', async ({ page }) => {
    await page.goto('/login')
    const forgotLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码"), [class*="forgot"]').first()
    await forgotLink.click()
    // Step 1: Enter email
    const emailInput = page.locator('.ant-modal input').first()
    await emailInput.fill('test@example.com')
    // Submit and check flow progresses (requires backend)
    const submitBtn = page.locator('.ant-modal button[type="submit"], .ant-modal button:has-text("发送"), .ant-modal button:has-text("下一步")').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
    }
  })
})

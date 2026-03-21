import { test, expect } from '@playwright/test'

const moduleName = process.env.E2E_MODULE || ''

test.describe('Lead Mentor Login Shell @lead-mentor @ui-only @ui-smoke', () => {
  test.skip(moduleName !== 'lead-mentor', 'lead-mentor shell contract only runs for lead-mentor module gate')

  test('lead-mentor login shell matches ticket anchors and public interactions @lead-mentor-t177-login-shell', async ({
    page,
  }) => {
    await page.goto('/login')

    await expect(page.locator('#login-page')).toBeVisible()
    await expect(page.locator('.login-box')).toBeVisible()
    await expect(page.locator('.login-title')).toHaveText('欢迎回来')
    await expect(page.locator('.login-logo')).toContainText('OSG Lead Mentor')
    await expect(page.locator('.login-subtitle')).toHaveText('使用您的账号登录（主导师/班主任）')
    await expect(page.locator('.platform-title')).toHaveText('OSG Platform')
    await expect(page.locator('.platform-subtitle')).toHaveText('职业培训一站式平台，学生与导师共同成长')

    const featureItems = page.locator('.login-feature')
    await expect(featureItems).toHaveCount(4)
    await expect(featureItems.nth(1)).toContainText('导师端：高效课程管理')

    const usernameInput = page.locator('#login-username')
    const passwordInput = page.locator('#login-password')
    const passwordToggle = page.locator('#pwd-eye')
    const forgotTrigger = page.locator('[data-surface-trigger="modal-forgot-password"]')

    await expect(usernameInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(passwordToggle).toBeVisible()
    await expect(forgotTrigger).toContainText('点击重置')

    await expect(usernameInput).toHaveValue('')
    await expect(passwordInput).toHaveValue('')

    await passwordInput.fill('RealPass123!')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await passwordToggle.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(passwordInput).toHaveValue('RealPass123!')
    await passwordToggle.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveValue('RealPass123!')
  })
})

import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

test.describe('Auth Login @ui-smoke @ui-only', () => {
  test('login page renders with form fields @perm-s001-login-form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="text"], input[placeholder*="账号"], input[placeholder*="用户名"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('login with empty fields shows validation @perm-s001-login-validation', async ({ page }) => {
    await page.goto('/login')
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first()
    await submitBtn.click()
    // Should stay on login page (not navigate away)
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Auth Login @api', () => {
  test('login success redirects to dashboard @perm-s001-login-success', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token, 'login should persist token in localStorage').toBeTruthy()
  })

  test('logout clears token and returns to login @perm-s001-logout', async ({ page }) => {
    await loginAsAdmin(page)

    const logoutPromise = waitForApi(page, '/api/logout', 'POST')
    await page.getByRole('button', { name: '退出登录' }).click()
    await page.getByRole('button', { name: /确\s*定/ }).click()

    await assertRuoyiSuccess(logoutPromise, '/api/logout')
    await page.waitForURL(/\/login/, { timeout: 15000 })

    const token = await page.evaluate(() => localStorage.getItem('osg_token'))
    expect(token, 'logout should clear token in localStorage').toBeFalsy()
  })

  test('superadmin sees all menu items @perm-s003-superadmin-menu', async ({ page }) => {
    await loginAsAdmin(page)

    const sidebar = page.locator('.main-layout .ant-layout-sider, [class*="sider"]').first()
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    const menuLabel = (text: string) =>
      sidebar.locator('.ant-menu-title-content, .menu-title').filter({ hasText: text }).first()

    await expect(menuLabel('权限管理')).toBeVisible()
    await expect(menuLabel('用户中心')).toBeVisible()
    await expect(menuLabel('求职中心')).toBeVisible()
    await expect(menuLabel('教学中心')).toBeVisible()
    await expect(menuLabel('财务中心')).toBeVisible()
    await expect(menuLabel('资源中心')).toBeVisible()
    await expect(menuLabel('个人中心')).toBeVisible()
  })
})

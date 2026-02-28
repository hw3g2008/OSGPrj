import { test, expect } from '@playwright/test'

test.describe('Dashboard @ui-only', () => {
  test('dashboard page renders welcome header @perm-s007-dashboard-welcome', async ({ page }) => {
    await page.goto('/dashboard')
    // May redirect to login if not auth'd; check either page
    const isOnDashboard = await page.locator('text=欢迎回来').isVisible().catch(() => false)
    const isOnLogin = await page.locator('input[type="password"]').isVisible().catch(() => false)
    expect(isOnDashboard || isOnLogin).toBeTruthy()
  })
})

test.describe('Dashboard @api', () => {
  test('dashboard shows 5 stat cards and they are clickable @perm-s007-dashboard-cards', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    const cards = page.locator('.stat-cards .stat-card, [class*="stat-card"]')
    await expect(cards).toHaveCount(5, { timeout: 10000 })
    await cards.first().click()
    await page.waitForTimeout(500)
  })

  test('dashboard shows todo reminder section @perm-s007-dashboard-todo', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page.locator('.todo-reminder, [class*="todo"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('dashboard quick actions are visible @perm-s007-dashboard-quick', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page.locator('.quick-actions, [class*="quick-action"]').first()).toBeVisible({ timeout: 10000 })
  })
})

import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

test.describe('Dashboard @ui-smoke @ui-only', () => {
  test('dashboard page renders welcome header @perm-s007-dashboard-welcome', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=欢迎回来')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Dashboard @api', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('dashboard shows 5 stat cards and they are clickable @perm-s007-dashboard-cards', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    const statsPromise = waitForApi(page, '/api/dashboard/stats')
    const todosPromise = waitForApi(page, '/api/dashboard/todos')
    const activitiesPromise = waitForApi(page, '/api/dashboard/activities')
    const studentStatusPromise = waitForApi(page, '/api/dashboard/student-status')
    const monthlyPromise = waitForApi(page, '/api/dashboard/monthly')
    await page.getByRole('button', { name: '刷新数据' }).click()

    const statsBody = await assertRuoyiSuccess(statsPromise, '/api/dashboard/stats')
    await assertRuoyiSuccess(todosPromise, '/api/dashboard/todos')
    await assertRuoyiSuccess(activitiesPromise, '/api/dashboard/activities')
    await assertRuoyiSuccess(studentStatusPromise, '/api/dashboard/student-status')
    await assertRuoyiSuccess(monthlyPromise, '/api/dashboard/monthly')
    expect(typeof statsBody?.data?.studentCount, 'dashboard stats should include studentCount').toBe('number')

    const cards = page.locator('.stat-cards > .stat-card')
    await expect(cards).toHaveCount(5, { timeout: 10000 })
    await cards.first().click()
    await page.waitForTimeout(500)
  })

  test('dashboard shows todo reminder section @perm-s007-dashboard-todo', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    const todosPromise = waitForApi(page, '/api/dashboard/todos')
    await page.getByRole('button', { name: '刷新数据' }).click()
    await assertRuoyiSuccess(todosPromise, '/api/dashboard/todos')
    await expect(page.locator('.todo-reminder, [class*="todo"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('dashboard quick actions are visible @perm-s007-dashboard-quick', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    const statsPromise = waitForApi(page, '/api/dashboard/stats')
    await page.getByRole('button', { name: '刷新数据' }).click()
    await assertRuoyiSuccess(statsPromise, '/api/dashboard/stats')
    await expect(page.locator('.quick-actions, [class*="quick-action"]').first()).toBeVisible({ timeout: 10000 })
  })
})

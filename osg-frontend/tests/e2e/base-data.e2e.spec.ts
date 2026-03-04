import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

test.describe('Base Data Management @ui-smoke @ui-only', () => {
  test('base data page accessible via sidebar navigation @perm-s006-base-data-nav', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/permission/base-data')
    await expect(page).toHaveURL(/\/permission\/base-data/)
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Base Data Management @api', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('base data list to detail flow @perm-s006-base-data-flow', async ({ page }) => {
    const baseDataPromise = waitForApi(page, '/api/system/basedata/list')
    await page.goto('/permission/base-data')
    await expect(page).toHaveURL(/\/permission\/base-data/)
    const baseDataBody = await assertRuoyiSuccess(baseDataPromise, '/api/system/basedata/list')
    const rows = baseDataBody?.rows ?? baseDataBody?.data?.rows
    const total = baseDataBody?.total ?? baseDataBody?.data?.total
    expect(Array.isArray(rows), 'base data response should contain rows[]').toBeTruthy()
    expect(typeof total, 'base data response should contain total').toBe('number')
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })

  test('base data search and filter @perm-s006-base-data-search', async ({ page }) => {
    const baseDataPromise = waitForApi(page, '/api/system/basedata/list')
    await page.goto('/permission/base-data')
    await expect(page).toHaveURL(/\/permission\/base-data/)
    await assertRuoyiSuccess(baseDataPromise, '/api/system/basedata/list')
    await expect(page.locator('input[placeholder*="搜索"], input[placeholder*="查询"]').first()).toBeVisible({ timeout: 5000 })
  })
})

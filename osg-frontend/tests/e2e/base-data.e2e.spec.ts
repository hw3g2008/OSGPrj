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
    const registryPromise = waitForApi(page, '/api/system/admin-dict/registry')
    const dictListPromise = waitForApi(page, '/api/system/dict/data/list')
    await page.goto('/permission/base-data')
    await expect(page).toHaveURL(/\/permission\/base-data/)
    const registryBody = await assertRuoyiSuccess(registryPromise, '/api/system/admin-dict/registry')
    expect(Array.isArray(registryBody), 'registry response should contain groups[]').toBeTruthy()
    const dictListBody = await assertRuoyiSuccess(dictListPromise, '/api/system/dict/data/list')
    const rows = dictListBody?.rows ?? dictListBody?.data?.rows
    const total = dictListBody?.total ?? dictListBody?.data?.total
    expect(Array.isArray(rows), 'dict data response should contain rows[]').toBeTruthy()
    expect(typeof total, 'dict data response should contain total').toBe('number')
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })

  test('base data search and filter @perm-s006-base-data-search', async ({ page }) => {
    const dictListPromise = waitForApi(page, '/api/system/dict/data/list')
    await page.goto('/permission/base-data')
    await expect(page).toHaveURL(/\/permission\/base-data/)
    await assertRuoyiSuccess(dictListPromise, '/api/system/dict/data/list')
    await expect(page.locator('input[placeholder*="搜索"], input[placeholder*="查询"]').first()).toBeVisible({ timeout: 5000 })
  })
})

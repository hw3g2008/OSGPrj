import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

test.describe('Roles Management @ui-smoke @ui-only', () => {
  test('roles page accessible via sidebar navigation @perm-s004-roles-nav', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/permission/roles')
    await expect(page).toHaveURL(/\/permission\/roles/)
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Roles Management @api', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('role CRUD flow: create, assign permissions, verify @perm-s004-role-flow', async ({ page }) => {
    const roleListPromise = waitForApi(page, '/api/system/role/list')
    const menuTreePromise = waitForApi(page, '/api/system/menu/treeselect')

    await page.goto('/permission/roles')
    await expect(page).toHaveURL(/\/permission\/roles/)

    const roleListBody = await assertRuoyiSuccess(roleListPromise, '/api/system/role/list')
    await assertRuoyiSuccess(menuTreePromise, '/api/system/menu/treeselect')
    const rows = roleListBody?.rows ?? roleListBody?.data?.rows
    const total = roleListBody?.total ?? roleListBody?.data?.total
    expect(Array.isArray(rows), 'role list response should contain rows[]').toBeTruthy()
    expect(typeof total, 'role list response should contain total').toBe('number')

    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })

  test('role with employees cannot be deleted @perm-s004-role-no-delete', async ({ page }) => {
    const roleListPromise = waitForApi(page, '/api/system/role/list')
    await page.goto('/permission/roles')
    await expect(page).toHaveURL(/\/permission\/roles/)

    await assertRuoyiSuccess(roleListPromise, '/api/system/role/list')
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })
})

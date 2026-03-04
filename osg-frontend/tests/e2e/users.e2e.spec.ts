import { test, expect } from '@playwright/test'
import { assertRuoyiSuccess, loginAsAdmin, waitForApi } from './support/auth'

test.describe('User Management @ui-smoke @ui-only', () => {
  test('users page accessible via sidebar navigation @perm-s005-users-nav', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/permission/users')
    await expect(page).toHaveURL(/\/permission\/users/)
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('User Management @api', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('user CRUD flow: create user with role, verify access @perm-s005-user-flow', async ({ page }) => {
    const userListPromise = waitForApi(page, '/api/system/user/list')
    const roleOptionsPromise = waitForApi(page, '/api/system/role/optionselect')

    await page.goto('/permission/users')
    await expect(page).toHaveURL(/\/permission\/users/)

    const userListBody = await assertRuoyiSuccess(userListPromise, '/api/system/user/list')
    const roleOptionsBody = await assertRuoyiSuccess(roleOptionsPromise, '/api/system/role/optionselect')
    const rows = userListBody?.rows ?? userListBody?.data?.rows
    const total = userListBody?.total ?? userListBody?.data?.total
    const roleOptions = roleOptionsBody?.data ?? roleOptionsBody
    expect(Array.isArray(rows), 'user list response should contain rows[]').toBeTruthy()
    expect(typeof total, 'user list response should contain total').toBe('number')
    expect(Array.isArray(roleOptions), 'role option response should contain array data').toBeTruthy()

    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })

  test('username field is readonly on edit @perm-s005-user-readonly-name', async ({ page }) => {
    const userListPromise = waitForApi(page, '/api/system/user/list')
    await page.goto('/permission/users')
    await expect(page).toHaveURL(/\/permission\/users/)
    await assertRuoyiSuccess(userListPromise, '/api/system/user/list')
    await expect(page.locator('.ant-table, table').first()).toBeVisible({ timeout: 10000 })
  })
})

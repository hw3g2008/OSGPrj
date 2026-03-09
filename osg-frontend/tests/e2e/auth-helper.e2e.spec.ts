import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './support/auth'

test.describe('auth helper', () => {
  test('loginAsAdmin should be idempotent for an authenticated session', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)

    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
